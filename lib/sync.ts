import type { SupabaseClient } from '@supabase/supabase-js';
import type { LocalDB } from './db';

/**
 * Two-way sync between the phone (Dexie) and Supabase, one table at a time.
 *
 * Push: every row marked dirty is upserted. A row edited again while the push
 * was in flight keeps its mark for the next round. A pushed delete (a row with
 * deleted_at) is then removed from the phone; the server keeps the tombstone
 * so the person's other devices learn about it.
 *
 * Pull: rows the server changed since the last pull. A row still dirty on the
 * phone wins until it has been pushed: last write wins, per row.
 */
export const TABLES = [
  { local: 'profile', remote: 'profiles', key: 'user_id' },
  { local: 'exercises', remote: 'exercises', key: 'id' },
  { local: 'sets', remote: 'workout_sets', key: 'id' },
  { local: 'meals', remote: 'meals', key: 'id' },
  { local: 'weights', remote: 'weight_entries', key: 'id' },
  { local: 'fasts', remote: 'fasts', key: 'id' },
] as const;

type Spec = (typeof TABLES)[number];
type Row = Record<string, unknown> & { updated_at: string; deleted_at: string | null; dirty?: 0 | 1 };

const PAGE = 1000;
// ponytail: transactions that commit out of order can carry slightly older
// updated_at stamps; re-reading two minutes behind the mark catches them.
const OVERLAP_MS = 2 * 60_000;

export async function syncAll(db: LocalDB, supabase: SupabaseClient) {
  await Promise.all(TABLES.map(async (spec) => {
    await push(db, supabase, spec);
    await pull(db, supabase, spec);
  }));
}

/** Postgres writes "+00:00"; the phone writes "Z". One format keeps string order equal to time order. */
function normalize(row: Row): Row {
  const out: Row = { ...row };
  for (const [k, v] of Object.entries(out)) if (k.endsWith('_at') && typeof v === 'string') out[k] = new Date(v).toISOString();
  return out;
}

export async function pendingCount(db: LocalDB) {
  const counts = await Promise.all(TABLES.map((t) => db.table(t.local).where('dirty').equals(1).count()));
  return counts.reduce((a, b) => a + b, 0);
}

async function push(db: LocalDB, supabase: SupabaseClient, { local, remote, key }: Spec) {
  const table = db.table<Row, string>(local);
  const dirty = await table.where('dirty').equals(1).toArray();
  if (!dirty.length) return;

  // The server stamps updated_at itself, and `dirty` only exists here.
  const rows = dirty.map(({ dirty: _dirty, updated_at: _stamp, ...row }) => row);
  const { error } = await supabase.from(remote).upsert(rows, { onConflict: key });
  if (error) throw error;

  await db.transaction('rw', table, async () => {
    for (const row of dirty) {
      const id = row[key] as string;
      const current = await table.get(id);
      if (!current || current.updated_at !== row.updated_at) continue;
      if (row.deleted_at) await table.delete(id);
      else await table.update(id, { dirty: 0 });
    }
  });
}

async function pull(db: LocalDB, supabase: SupabaseClient, { local, remote, key }: Spec) {
  const table = db.table<Row, string>(local);
  const mark = `pulled:${remote}`;
  const since = (await db.meta.get(mark))?.value;
  const from = since ? new Date(Date.parse(since) - OVERLAP_MS).toISOString() : '1970-01-01T00:00:00Z';

  let latest = since;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from(remote)
      .select('*')
      .gte('updated_at', from)
      .order('updated_at')
      .order(key)
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    const rows = (data as Row[]).map(normalize);

    await db.transaction('rw', table, async () => {
      for (const row of rows) {
        const id = row[key] as string;
        if ((await table.get(id))?.dirty) continue;
        if (row.deleted_at) await table.delete(id);
        else await table.put({ ...row, dirty: 0 });
      }
    });
    if (rows.length) latest = rows[rows.length - 1].updated_at;
    if (rows.length < PAGE) break;
  }
  if (latest && latest !== since) await db.meta.put({ key: mark, value: latest });
}
