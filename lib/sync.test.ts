import 'fake-indexeddb/auto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalDB } from './db';
import { pendingCount, syncAll } from './sync';
import type { Meal } from './types';

/** An in-memory stand-in for the few PostgREST calls sync makes. The server stamps updated_at. */
function fakeServer() {
  const tables: Record<string, Map<string, Record<string, unknown>>> = {};
  let clock = Date.parse('2026-11-02T08:00:00Z');
  const hooks: { beforeUpsert?: () => Promise<void> } = {};
  const table = (name: string) => (tables[name] ??= new Map());

  const client = {
    from(name: string) {
      const query = { from: '', offset: 0, limit: Infinity };
      const builder = {
        async upsert(rows: Record<string, unknown>[], { onConflict }: { onConflict: string }) {
          await hooks.beforeUpsert?.();
          for (const row of rows) {
            clock += 1000;
            const id = row[onConflict] as string;
            table(name).set(id, { deleted_at: null, ...table(name).get(id), ...row, updated_at: new Date(clock).toISOString() });
          }
          return { error: null };
        },
        select: () => builder,
        gte: (_: string, from: string) => ((query.from = from), builder),
        order: () => builder,
        range(start: number, end: number) {
          query.offset = start;
          query.limit = end - start + 1;
          const data = [...table(name).values()]
            .filter((r) => (r.updated_at as string) >= query.from)
            .sort((a, b) => (a.updated_at as string).localeCompare(b.updated_at as string))
            .slice(query.offset, query.offset + query.limit);
          return Promise.resolve({ data, error: null });
        },
      };
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, table, hooks, tick: () => new Date((clock += 1000)).toISOString() };
}

const meal = (id: string, over: Partial<Meal> = {}): Meal => ({
  id, user_id: 'u1', name: 'Oats', meal_type: 'breakfast', calories: 350, protein_g: 12, carbs_g: 60, fat_g: 6,
  source: 'manual', eaten_at: '2026-11-02T07:30:00Z', updated_at: '2026-11-02T07:31:00.000Z', deleted_at: null, dirty: 1, ...over,
});

describe('syncAll', () => {
  let db: LocalDB;
  beforeEach(() => {
    db = new LocalDB(`test-${Math.random()}`);
  });
  afterEach(async () => {
    await db.delete();
  });

  it('pushes what changed on the phone and marks it synced', async () => {
    const server = fakeServer();
    await db.meals.bulkAdd([meal('m1'), meal('m2', { dirty: 0 })]);
    expect(await pendingCount(db)).toBe(1);

    await syncAll(db, server.client);

    const sent = server.table('meals').get('m1')!;
    expect(sent).toMatchObject({ name: 'Oats', user_id: 'u1' });
    expect(sent).not.toHaveProperty('dirty');
    expect(server.table('meals').has('m2')).toBe(false);
    expect(await pendingCount(db)).toBe(0);
  });

  it('keeps a row marked when it was edited again during the push', async () => {
    const server = fakeServer();
    await db.meals.add(meal('m1'));
    server.hooks.beforeUpsert = async () => {
      server.hooks.beforeUpsert = undefined;
      await db.meals.update('m1', { calories: 500, updated_at: '2026-11-02T07:40:00.000Z' });
    };
    await syncAll(db, server.client);
    expect((await db.meals.get('m1'))?.dirty).toBe(1);

    await syncAll(db, server.client);
    expect(server.table('meals').get('m1')).toMatchObject({ calories: 500 });
    expect(await pendingCount(db)).toBe(0);
  });

  it('removes a pushed delete from the phone but leaves the tombstone on the server', async () => {
    const server = fakeServer();
    await db.meals.add(meal('m1', { deleted_at: '2026-11-02T07:45:00.000Z' }));
    await syncAll(db, server.client);
    expect(await db.meals.get('m1')).toBeUndefined();
    expect(server.table('meals').get('m1')?.deleted_at).toBe('2026-11-02T07:45:00.000Z');
  });

  it('pulls changes from other devices, including deletes, without overwriting unsynced edits', async () => {
    const server = fakeServer();
    const remote = (id: string, over: Partial<Meal> = {}) => {
      const { dirty: _dirty, ...row } = meal(id, over);
      server.table('meals').set(id, { ...row, updated_at: server.tick() });
    };
    remote('from-laptop', { name: 'Rice bowl' });
    remote('gone', { deleted_at: '2026-11-02T08:00:00.000Z' });
    remote('edited-here', { name: 'Server name' });
    await db.meals.bulkAdd([meal('gone', { dirty: 0 }), meal('edited-here', { name: 'Phone name', dirty: 1 })]);
    server.hooks.beforeUpsert = async () => {
      server.hooks.beforeUpsert = undefined;
    };

    await syncAll(db, server.client);

    expect((await db.meals.get('from-laptop'))?.name).toBe('Rice bowl');
    expect(await db.meals.get('gone')).toBeUndefined();
    // The phone's edit was pushed first, so both sides now hold it.
    expect((await db.meals.get('edited-here'))?.name).toBe('Phone name');
    expect(server.table('meals').get('edited-here')?.name).toBe('Phone name');
  });

  it('remembers how far it has pulled', async () => {
    const server = fakeServer();
    const { dirty: _dirty, ...row } = meal('m1');
    server.table('meals').set('m1', { ...row, updated_at: server.tick() });
    await syncAll(db, server.client);
    const mark = (await db.meta.get('pulled:meals'))?.value;
    expect(mark).toBe(server.table('meals').get('m1')?.updated_at);

    await db.meals.clear();
    await syncAll(db, server.client);
    // Inside the two-minute overlap, so the row comes back; nothing older does.
    expect(await db.meals.count()).toBe(1);
  });
});
