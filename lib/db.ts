import Dexie, { type Table } from 'dexie';
import type { CustomExercise, Fast, Meal, Profile, WeightEntry, WorkoutSet } from './types';

/**
 * Everything a person logs, on their phone first. One database per user, so
 * a shared phone never shows one person's entries to the next.
 */
export class LocalDB extends Dexie {
  profile!: Table<Profile, string>;
  exercises!: Table<CustomExercise, string>;
  sets!: Table<WorkoutSet, string>;
  meals!: Table<Meal, string>;
  weights!: Table<WeightEntry, string>;
  fasts!: Table<Fast, string>;
  meta!: Table<{ key: string; value: string }, string>;

  constructor(userId: string) {
    super(`body-tracker-${userId}`);
    this.version(1).stores({
      profile: 'user_id, dirty',
      exercises: 'id, dirty',
      sets: 'id, performed_at, exercise_id, dirty',
      meals: 'id, eaten_at, dirty',
      weights: 'id, measured_on, dirty',
      fasts: 'id, started_at, dirty',
      meta: 'key',
    });
  }
}
