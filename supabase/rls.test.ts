/**
 * Row Level Security, proven against a real Supabase: two people sign in
 * with "Try it without an account", and neither can read or change the
 * other's rows in any table.
 *
 * CI points RLS_TEST_SUPABASE_URL and RLS_TEST_SUPABASE_KEY at the local stack
 * that `supabase start` builds from supabase/migrations. Without them (no
 * Docker on this machine, say) the suite is skipped, never pointed at production.
 */
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

const url = process.env.RLS_TEST_SUPABASE_URL;
const key = process.env.RLS_TEST_SUPABASE_KEY;

const client = () => createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });

async function person() {
  const supabase = client();
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return { supabase, id: data.user!.id };
}

const now = new Date().toISOString();
const rows: Record<string, () => Record<string, unknown>> = {
  exercises: () => ({ id: randomUUID(), name: 'Sled push', category: 'Legs' }),
  workout_sets: () => ({ id: randomUUID(), exercise_id: 'bench-press', exercise_name: 'Bench Press', weight_kg: 60, reps: 8, performed_at: now }),
  meals: () => ({ id: randomUUID(), name: 'Oats with banana', meal_type: 'breakfast', calories: 350, protein_g: 12 }),
  weight_entries: () => ({ id: randomUUID(), weight_kg: 72.4, measured_on: now.slice(0, 10) }),
  fasts: () => ({ id: randomUUID(), started_at: now, target_hours: 16 }),
};

describe.skipIf(!url || !key)('Row Level Security', () => {
  let a: SupabaseClient, b: SupabaseClient, aId: string;

  beforeAll(async () => {
    const [first, second] = await Promise.all([person(), person()]);
    ({ supabase: a, id: aId } = first);
    b = second.supabase;
  });

  for (const [table, make] of Object.entries(rows)) {
    it(`${table}: nobody else can read, change, delete or forge your rows`, async () => {
      const row = make();
      const created = await a.from(table).insert(row).select().single();
      expect(created.error).toBeNull();
      expect(created.data.user_id).toBe(aId);

      expect((await b.from(table).select('id').eq('id', row.id)).data).toEqual([]);
      expect((await b.from(table).update({ deleted_at: now }).eq('id', row.id).select()).data).toEqual([]);
      expect((await b.from(table).delete().eq('id', row.id).select()).data).toEqual([]);
      // An upsert on the same id hits the owner's row and is refused.
      expect((await b.from(table).upsert({ ...row, deleted_at: now })).error).not.toBeNull();
      // A row written in someone else's name is refused.
      expect((await b.from(table).insert({ ...make(), user_id: aId })).error?.code).toBe('42501');

      expect((await a.from(table).select('deleted_at').eq('id', row.id).single()).data).toEqual({ deleted_at: null });
    });
  }

  it('profiles: each person reads and writes only their own', async () => {
    expect((await a.from('profiles').upsert({ user_id: aId, goal: 'lose', calories: 1900 })).error).toBeNull();
    expect((await b.from('profiles').select('user_id')).data).toEqual([]);
    expect((await b.from('profiles').update({ calories: 4000 }).eq('user_id', aId).select()).data).toEqual([]);
    expect((await b.from('profiles').upsert({ user_id: aId, calories: 4000 })).error).not.toBeNull();
    expect((await a.from('profiles').select('calories').single()).data).toEqual({ calories: 1900 });
  });

  it('a signed-out visitor with the public key reads nothing', async () => {
    for (const table of ['profiles', ...Object.keys(rows)]) {
      expect((await client().from(table).select('*')).error, table).not.toBeNull();
    }
  });

  it('the AI allowance is counted per person and is not readable', async () => {
    const { supabase } = await person();
    const answers = [];
    for (let i = 0; i < 26; i++) answers.push((await supabase.rpc('use_ai_estimate')).data);
    expect(answers.slice(0, 25).every(Boolean)).toBe(true);
    expect(answers[25]).toBe(false);
    expect((await a.rpc('use_ai_estimate')).data).toBe(true);
    expect((await supabase.from('ai_usage').select('*')).error).not.toBeNull();
  });

  it('deleting your account deletes your data', async () => {
    const { supabase } = await person();
    const meal = rows.meals();
    expect((await supabase.from('meals').insert(meal)).error).toBeNull();
    expect((await supabase.rpc('delete_my_account')).error).toBeNull();
    expect((await supabase.from('meals').select('id').eq('id', meal.id)).data ?? []).toEqual([]);
  });
});
