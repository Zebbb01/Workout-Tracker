import { describe, expect, it } from 'vitest';
import {
  addDays, byExercise, cmToFeetInches, computeTargets, estimatedMax, exerciseProgress, fastProgress, feetInchesToCm,
  formatDuration, formatWeight, fromKg, lastSetOf, lastWorkout, localDay, longestStreak, mealTypeAt, milestones,
  recentExercises, streak, toKg, totals, weekOf, weeklyVolume, weightSeries, weightTrend,
} from './calc';
import type { Meal, WeightEntry, WorkoutSet } from './types';

const base = { user_id: 'u', updated_at: '2026-11-01T00:00:00Z', deleted_at: null, dirty: 0 as const };
const set = (exercise_id: string, at: string, weight_kg: number, reps: number): WorkoutSet => ({
  ...base, id: `${exercise_id}-${at}`, exercise_id, exercise_name: exercise_id, weight_kg, reps, performed_at: new Date(at).toISOString(),
});
const weight = (measured_on: string, weight_kg: number, updated_at = `${measured_on}T07:00:00Z`): WeightEntry => ({
  ...base, id: measured_on + updated_at, weight_kg, measured_on, updated_at,
});

describe('units', () => {
  it('converts with the exact pound and shows tidy numbers', () => {
    expect(toKg(225, 'imperial')).toBeCloseTo(102.058, 3);
    expect(fromKg(toKg(135, 'imperial'), 'imperial')).toBeCloseTo(135, 10);
    expect(formatWeight(72.46, 'metric')).toBe('72.5 kg');
    expect(formatWeight(toKg(160, 'imperial'), 'imperial')).toBe('160 lb');
  });

  it('converts height both ways', () => {
    expect(cmToFeetInches(177.8)).toEqual({ feet: 5, inches: 10 });
    expect(feetInchesToCm(5, 10)).toBeCloseTo(177.8, 5);
  });
});

describe('days', () => {
  it('uses the local calendar', () => {
    expect(localDay(new Date(2026, 10, 2, 23, 59))).toBe('2026-11-02');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(weekOf('2026-11-08')).toBe('2026-11-02'); // Sunday belongs to the week starting Monday
  });

  it('guesses the meal from the time of day', () => {
    const at = (h: number, m = 0) => mealTypeAt(new Date(2026, 10, 2, h, m));
    expect([at(7), at(10, 29), at(10, 30), at(16), at(19), at(22)]).toEqual(['breakfast', 'breakfast', 'lunch', 'snack', 'dinner', 'snack']);
  });
});

describe('computeTargets', () => {
  it('uses Mifflin-St Jeor, the activity level and the goal', () => {
    const maintain = computeTargets({ sex: 'male', age: 30, heightCm: 175, weightKg: 70, activity: 'moderate', goal: 'maintain' });
    // BMR 1648.75 x 1.55 = 2555.6, rounded to 10
    expect(maintain).toEqual({ calories: 2560, protein_g: 126, fat_g: 71, carbs_g: 354 });
    expect(computeTargets({ sex: 'male', age: 30, heightCm: 175, weightKg: 70, activity: 'moderate', goal: 'lose' }).calories).toBe(2060);
    expect(computeTargets({ sex: 'female', age: 30, heightCm: 175, weightKg: 70, activity: 'moderate', goal: 'gain' }).calories).toBe(2600);
    // No sex given: the midpoint, (1648.75 - 83) x 1.55 = 2426.8
    expect(computeTargets({ sex: null, age: 30, heightCm: 175, weightKg: 70, activity: 'moderate', goal: 'maintain' }).calories).toBe(2430);
  });

  it('never goes below 1,200 kcal and keeps the macros consistent', () => {
    const t = computeTargets({ sex: 'female', age: 80, heightCm: 140, weightKg: 40, activity: 'sedentary', goal: 'lose' });
    expect(t.calories).toBe(1200);
    expect(t.protein_g * 4 + t.carbs_g * 4 + t.fat_g * 9).toBeLessThanOrEqual(1210);
  });
});

it('totals meals', () => {
  const meal = (calories: number, protein_g: number) => ({ calories, protein_g, carbs_g: 10, fat_g: 1.5 }) as Meal;
  expect(totals([meal(300, 20), meal(450, 32.5)])).toEqual({ calories: 750, protein_g: 52.5, carbs_g: 20, fat_g: 3 });
});

describe('workouts', () => {
  const sets = [
    set('squat', '2026-10-28T08:00', 100, 5),
    set('bench-press', '2026-10-30T18:10', 60, 8),
    set('bench-press', '2026-10-30T18:00', 60, 10),
    set('row', '2026-10-30T18:20', 50, 10),
    set('squat', '2026-11-02T07:00', 105, 5),
  ];

  it('finds the last workout before today, in order', () => {
    const last = lastWorkout(sets, '2026-11-02')!;
    expect(last.day).toBe('2026-10-30');
    expect(last.sets.map((s) => s.reps)).toEqual([10, 8, 10]);
    expect(lastWorkout(sets.slice(-1), '2026-11-02')).toBeNull();
  });

  it('groups sets by exercise in the order first done', () => {
    expect(byExercise(sets.slice(1, 4)).map((g) => [g.exercise_id, g.sets.length])).toEqual([['bench-press', 2], ['row', 1]]);
  });

  it('lists recent exercises and the set to repeat', () => {
    expect(recentExercises(sets).map((e) => e.id)).toEqual(['squat', 'row', 'bench-press']);
    expect(lastSetOf(sets, 'bench-press')!.reps).toBe(8);
    expect(lastSetOf(sets, 'deadlift')).toBeNull();
  });

  it('tracks the best estimated max per day', () => {
    expect(estimatedMax(100, 5)).toBeCloseTo(116.667, 3);
    expect(estimatedMax(20, 30)).toBe(20);
    expect(exerciseProgress(sets, 'bench-press')).toEqual([{ day: '2026-10-30', value: 80 }]);
    expect(exerciseProgress(sets, 'squat').map((p) => p.day)).toEqual(['2026-10-28', '2026-11-02']);
  });

  it('adds up weekly volume, oldest week first', () => {
    const weeks = weeklyVolume(sets, '2026-11-02', 2);
    expect(weeks).toEqual([
      { week: '2026-10-26', volume: 500 + 600 + 480 + 500, sets: 4 },
      { week: '2026-11-02', volume: 525, sets: 1 },
    ]);
  });
});

describe('weight', () => {
  const entries = [
    weight('2026-10-20', 80),
    weight('2026-10-26', 79.4),
    weight('2026-11-02', 79.0, '2026-11-02T07:00:00Z'),
    weight('2026-11-02', 78.6, '2026-11-02T08:00:00Z'),
  ];

  it('keeps the last weigh-in of each day', () => {
    expect(weightSeries(entries)).toEqual([
      { day: '2026-10-20', kg: 80 },
      { day: '2026-10-26', kg: 79.4 },
      { day: '2026-11-02', kg: 78.6 },
    ]);
    expect(weightSeries(entries, '2026-10-26')).toHaveLength(2);
  });

  it('compares with the weigh-in a week or more before', () => {
    expect(weightTrend(weightSeries(entries))).toEqual({ latest: { day: '2026-11-02', kg: 78.6 }, change: -0.8 });
    expect(weightTrend(weightSeries(entries.slice(1)))!.change).toBeCloseTo(-0.8, 5);
    expect(weightTrend(weightSeries(entries.slice(3)))).toEqual({ latest: { day: '2026-11-02', kg: 78.6 }, change: null });
    expect(weightTrend([])).toBeNull();
  });
});

it('measures a fast', () => {
  const fast = { started_at: '2026-11-01T20:00:00Z', target_hours: 16 };
  expect(fastProgress(fast, new Date('2026-11-02T04:00:00Z'))).toEqual({ hours: 8, fraction: 0.5, done: false });
  expect(fastProgress(fast, new Date('2026-11-02T13:00:00Z')).done).toBe(true);
  expect(formatDuration(14.5)).toBe('14h 30m');
});

describe('streaks and milestones', () => {
  it('counts the current and the longest run of days', () => {
    const days = new Set(['2026-10-01', '2026-10-02', '2026-10-03', '2026-11-01', '2026-11-02']);
    expect(streak(days, '2026-11-02')).toBe(2);
    expect(streak(days, '2026-11-03')).toBe(2);
    expect(streak(days, '2026-11-04')).toBe(0);
    expect(longestStreak(days)).toBe(3);
  });

  it('marks milestones reached', () => {
    const done = milestones({ sets: [set('squat', '2026-11-02T07:00', 100, 5)], meals: [], weights: [] })
      .filter((m) => m.done)
      .map((m) => m.id);
    expect(done).toEqual(['first-set']);
  });
});
