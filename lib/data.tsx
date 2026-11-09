'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import type { User } from '@supabase/supabase-js';
import { LocalDB } from './db';
import { pendingCount, syncAll } from './sync';
import { supabase } from './supabase/client';
import { localDay } from './calc';
import type { Fast, Meal, Profile, WeightEntry, WorkoutSet } from './types';

interface Store {
  /** null when signed out. */
  user: User | null;
  /** The saved session has been read; until then nothing is known. */
  ready: boolean;
  db: LocalDB | null;
  online: boolean;
  syncing: boolean;
  syncError: string | null;
  /** The first sync since opening has finished (or there was no connection to try). */
  firstSyncDone: boolean;
  pending: number;
  requestSync: () => void;
}

const DataContext = createContext<Store | null>(null);

const subscribeOnline = (notify: () => void) => {
  addEventListener('online', notify);
  addEventListener('offline', notify);
  return () => {
    removeEventListener('online', notify);
    removeEventListener('offline', notify);
  };
};

export function DataProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [firstSyncedDb, setFirstSyncedDb] = useState<LocalDB | null>(null);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

  useEffect(() => {
    // The March 2026 app's database, from before accounts were per person.
    Dexie.delete('BodyTrackerDB').catch(() => {});
    const { data } = supabase().auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = user?.id;
  const db = useMemo(() => (userId ? new LocalDB(userId) : null), [userId]);
  useEffect(() => () => db?.close(), [db]);

  const running = useRef(false);
  const again = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const runSync = useCallback(async () => {
    if (!db) return;
    if (!navigator.onLine) {
      setFirstSyncedDb(db);
      return;
    }
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    setSyncing(true);
    try {
      do {
        again.current = false;
        await syncAll(db, supabase());
      } while (again.current);
      setSyncError(null);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      running.current = false;
      setSyncing(false);
      setFirstSyncedDb(db);
    }
  }, [db]);

  const requestSync = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(runSync, 800);
  }, [runSync]);

  useEffect(() => {
    if (!db) return;
    const first = setTimeout(runSync, 0);
    const onVisible = () => document.visibilityState === 'visible' && runSync();
    const every = setInterval(() => document.visibilityState === 'visible' && runSync(), 60_000);
    addEventListener('online', runSync);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(every);
      removeEventListener('online', runSync);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [db, runSync]);

  const pending = useLiveQuery(() => (db ? pendingCount(db) : 0), [db], 0);
  const firstSyncDone = db !== null && firstSyncedDb === db;

  const value = useMemo(
    () => ({ user, ready, db, online, syncing, syncError, firstSyncDone, pending, requestSync }),
    [user, ready, db, online, syncing, syncError, firstSyncDone, pending, requestSync],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): Store {
  const store = useContext(DataContext);
  if (!store) throw new Error('useData needs <DataProvider>');
  return store;
}

// --- Reading -------------------------------------------------------------------
// Each returns undefined while loading, so screens can tell "loading" from "none".

const live = (row: { deleted_at: string | null }) => !row.deleted_at;

export function useProfile(): Profile | null | undefined {
  const { db, user } = useData();
  return useLiveQuery(async () => (db && user ? ((await db.profile.get(user.id)) ?? null) : undefined), [db, user?.id]);
}

export function useSets(): WorkoutSet[] | undefined {
  const { db } = useData();
  // ponytail: loads every set; fine for years of logging, page by date if it ever is not.
  return useLiveQuery(async () => db?.sets.orderBy('performed_at').filter(live).toArray(), [db]);
}

export function useMeals(): Meal[] | undefined {
  const { db } = useData();
  return useLiveQuery(async () => db?.meals.orderBy('eaten_at').filter(live).toArray(), [db]);
}

export function useWeights(): WeightEntry[] | undefined {
  const { db } = useData();
  return useLiveQuery(async () => db?.weights.orderBy('measured_on').filter(live).toArray(), [db]);
}

export function useFasts(): Fast[] | undefined {
  const { db } = useData();
  return useLiveQuery(async () => db?.fasts.orderBy('started_at').filter(live).toArray(), [db]);
}

export function useCustomExercises() {
  const { db } = useData();
  return useLiveQuery(async () => db?.exercises.filter(live).toArray(), [db]);
}

// --- Writing -------------------------------------------------------------------
// Every write lands on the phone first and is marked dirty; sync sends it on.

type Table = 'sets' | 'meals' | 'weights' | 'fasts' | 'exercises';
type New<T> = Omit<T, 'id' | 'user_id' | 'updated_at' | 'deleted_at' | 'dirty'>;

export function useActions() {
  const { db, user, requestSync } = useData();

  return useMemo(() => {
    const need = () => {
      if (!db || !user) throw new Error('Not signed in');
      return { db, userId: user.id };
    };
    const now = () => new Date().toISOString();
    const stamp = <T extends object>(row: T) => ({ ...row, user_id: need().userId, updated_at: now(), deleted_at: null, dirty: 1 as const });
    const done = <T,>(result: T) => {
      requestSync();
      return result;
    };

    return {
      /** Sets without a time are stamped now, a millisecond apart, so their order survives. */
      async addSets(sets: (Omit<New<WorkoutSet>, 'performed_at'> & { performed_at?: string })[]) {
        const start = Date.now();
        const rows = sets.map((s, i) => stamp({ id: crypto.randomUUID(), ...s, performed_at: s.performed_at ?? new Date(start + i).toISOString() }));
        await need().db.sets.bulkAdd(rows);
        return done(rows);
      },
      async addMeal(meal: New<Meal>) {
        const row = stamp({ id: crypto.randomUUID(), ...meal });
        await need().db.meals.add(row);
        return done(row);
      },
      /** One weight per day from this phone: saving again replaces today's. */
      async saveWeight(weightKg: number, day = localDay(new Date())) {
        const { db: d } = need();
        const existing = await d.weights.where('measured_on').equals(day).filter(live).first();
        const row = stamp({ id: existing?.id ?? crypto.randomUUID(), weight_kg: Math.round(weightKg * 100) / 100, measured_on: day });
        await d.weights.put(row);
        return done(row);
      },
      async saveProfile(patch: Partial<New<Profile>>) {
        const { db: d, userId } = need();
        const current = await d.profile.get(userId);
        const row: Profile = {
          units: 'metric', goal: 'maintain', sex: null, age: null, height_cm: null, activity: 'moderate',
          calories: null, protein_g: null, carbs_g: null, fat_g: null, onboarded_at: null,
          ...current,
          ...patch,
          ...stamp({}),
        };
        await d.profile.put(row);
        return done(row);
      },
      async startFast(targetHours: number) {
        const row = stamp({ id: crypto.randomUUID(), started_at: now(), ended_at: null, target_hours: targetHours });
        await need().db.fasts.add(row);
        return done(row);
      },
      async endFast(id: string) {
        await need().db.fasts.update(id, { ended_at: now(), updated_at: now(), dirty: 1 });
        done(null);
      },
      async addExercise(name: string, category: string) {
        const row = stamp({ id: crypto.randomUUID(), name: name.trim().slice(0, 60), category });
        await need().db.exercises.add(row);
        return done(row);
      },
      /** Deletes stay as tombstones until synced, so other devices hear about them. */
      async remove(table: Table, id: string) {
        await need().db.table(table).update(id, { deleted_at: now(), updated_at: now(), dirty: 1 });
        done(null);
      },
      async restore(table: Table, id: string) {
        await need().db.table(table).update(id, { deleted_at: null, updated_at: now(), dirty: 1 });
        done(null);
      },
    };
  }, [db, user, requestSync]);
}

// --- Account -------------------------------------------------------------------
