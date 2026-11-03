// Pure calculations behind every screen. No storage, no React, no clock
// reads except through the `now` arguments, so each one is easy to test.
import type { Activity, Fast, Goal, Meal, MealType, Sex, Targets, Units, WeightEntry, WorkoutSet } from './types';

// --- Units -------------------------------------------------------------------

export const KG_PER_LB = 0.45359237; // exact, by definition of the pound

export const toKg = (value: number, units: Units) => (units === 'imperial' ? value * KG_PER_LB : value);
export const fromKg = (kg: number, units: Units) => (units === 'imperial' ? kg / KG_PER_LB : kg);
export const unitLabel = (units: Units) => (units === 'imperial' ? 'lb' : 'kg');

/** "72.5 kg" or "160 lb". Whole numbers drop the decimal. */
export function formatWeight(kg: number, units: Units): string {
  const value = Math.round(fromKg(kg, units) * 10) / 10;
  return `${Number.isInteger(value) ? value : value.toFixed(1)} ${unitLabel(units)}`;
}

export const cmToFeetInches = (cm: number) => {
  const inches = Math.round(cm / 2.54);
  return { feet: Math.floor(inches / 12), inches: inches % 12 };
};
export const feetInchesToCm = (feet: number, inches: number) => (feet * 12 + inches) * 2.54;

// --- Days ----------------------------------------------------------------------

/** The local calendar day of a moment, as YYYY-MM-DD. */
export function localDay(at: Date | string): string {
  const d = typeof at === 'string' ? new Date(at) : at;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d + n));
}

/** Breakfast before 10:30, lunch until 15:00, a snack until 17:00, dinner until 21:00, then a snack. */
export function mealTypeAt(at: Date): MealType {
  const minutes = at.getHours() * 60 + at.getMinutes();
  if (minutes < 10 * 60 + 30) return 'breakfast';
  if (minutes < 15 * 60) return 'lunch';
  if (minutes < 17 * 60) return 'snack';
  if (minutes < 21 * 60) return 'dinner';
  return 'snack';
}

// --- Targets -------------------------------------------------------------------

const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_ADJUSTMENT: Record<Goal, number> = { lose: -500, maintain: 0, gain: 300 };

/**
 * Daily calories from Mifflin-St Jeor and the activity level, then moved for
 * the goal. Protein 1.8 g per kg of body weight, fat a quarter of calories,
 * carbs the rest. Never below 1,200 kcal.
 */
export function computeTargets(p: { sex: Sex | null; age: number; heightCm: number; weightKg: number; activity: Activity; goal: Goal }): Targets {
  // Without a sex given, the midpoint of the two formulas.
  const offset = p.sex === 'male' ? 5 : p.sex === 'female' ? -161 : -78;
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + offset;
  const calories = Math.max(1200, Math.round((bmr * ACTIVITY_FACTOR[p.activity] + GOAL_ADJUSTMENT[p.goal]) / 10) * 10);
  const protein_g = Math.round(1.8 * p.weightKg);
  const fat_g = Math.round((calories * 0.25) / 9);
  const carbs_g = Math.max(0, Math.round((calories - protein_g * 4 - fat_g * 9) / 4));
  return { calories, protein_g, carbs_g, fat_g };
}

// --- Meals ---------------------------------------------------------------------

export function totals(meals: Pick<Meal, 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'>[]): Targets {
  return meals.reduce(
    (t, m) => ({
      calories: t.calories + m.calories,
      protein_g: t.protein_g + m.protein_g,
      carbs_g: t.carbs_g + m.carbs_g,
      fat_g: t.fat_g + m.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

// --- Workouts ------------------------------------------------------------------

/** Sets grouped by exercise in the order first logged. */
export function byExercise(sets: WorkoutSet[]) {
  const groups = new Map<string, { exercise_id: string; exercise_name: string; sets: WorkoutSet[] }>();
  for (const s of [...sets].sort((a, b) => a.performed_at.localeCompare(b.performed_at))) {
    const group = groups.get(s.exercise_id) ?? { exercise_id: s.exercise_id, exercise_name: s.exercise_name, sets: [] };
    group.sets.push(s);
    groups.set(s.exercise_id, group);
  }
  return [...groups.values()];
}

/** The most recent day before `today` with any sets, and its sets in order. */
export function lastWorkout(sets: WorkoutSet[], today: string): { day: string; sets: WorkoutSet[] } | null {
  let day: string | null = null;
  for (const s of sets) {
    const d = localDay(s.performed_at);
    if (d < today && (!day || d > day)) day = d;
  }
  if (!day) return null;
  return {
    day,
    sets: sets.filter((s) => localDay(s.performed_at) === day).sort((a, b) => a.performed_at.localeCompare(b.performed_at)),
  };
}

/** Exercises by most recent use, for the quick picker. */
export function recentExercises(sets: WorkoutSet[], limit = 6): { id: string; name: string }[] {
  const latest = new Map<string, { id: string; name: string; at: string }>();
  for (const s of sets) {
    const seen = latest.get(s.exercise_id);
    if (!seen || s.performed_at > seen.at) latest.set(s.exercise_id, { id: s.exercise_id, name: s.exercise_name, at: s.performed_at });
  }
  return [...latest.values()].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit).map(({ id, name }) => ({ id, name }));
}

/** The last set of an exercise, to prefill the next one. */
export function lastSetOf(sets: WorkoutSet[], exerciseId: string): WorkoutSet | null {
  let last: WorkoutSet | null = null;
  for (const s of sets) if (s.exercise_id === exerciseId && (!last || s.performed_at > last.performed_at)) last = s;
  return last;
}

/** Epley's estimated one-rep max; above 12 reps the estimate stops meaning much, so it is the weight. */
export const estimatedMax = (weightKg: number, reps: number) => (reps <= 12 ? weightKg * (1 + reps / 30) : weightKg);

/** Best estimated max per day for one exercise, oldest first. */
export function exerciseProgress(sets: WorkoutSet[], exerciseId: string): { day: string; value: number }[] {
  const best = new Map<string, number>();
  for (const s of sets) {
    if (s.exercise_id !== exerciseId) continue;
    const day = localDay(s.performed_at);
    best.set(day, Math.max(best.get(day) ?? 0, estimatedMax(s.weight_kg, s.reps)));
  }
  return [...best.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, value]) => ({ day, value }));
}

/** Monday of the week a day falls in. */
export function weekOf(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return addDays(day, -((date.getDay() + 6) % 7));
}

/** Volume (weight × reps, in kg) and set count for each of the last `weeks` weeks, oldest first. */
export function weeklyVolume(sets: WorkoutSet[], today: string, weeks = 8): { week: string; volume: number; sets: number }[] {
  const thisWeek = weekOf(today);
  const rows = Array.from({ length: weeks }, (_, i) => ({ week: addDays(thisWeek, -7 * (weeks - 1 - i)), volume: 0, sets: 0 }));
  const index = new Map(rows.map((r, i) => [r.week, i]));
  for (const s of sets) {
    const i = index.get(weekOf(localDay(s.performed_at)));
    if (i === undefined) continue;
    rows[i].volume += s.weight_kg * s.reps;
    rows[i].sets += 1;
  }
  return rows;
}

// --- Weight --------------------------------------------------------------------

/** The last entry of each day, oldest first, from `since` on. */
export function weightSeries(entries: WeightEntry[], since = '0000-00-00'): { day: string; kg: number }[] {
  const byDay = new Map<string, WeightEntry>();
  for (const e of entries) {
    if (e.measured_on < since) continue;
    const seen = byDay.get(e.measured_on);
    if (!seen || e.updated_at > seen.updated_at) byDay.set(e.measured_on, e);
  }
  return [...byDay.values()].sort((a, b) => a.measured_on.localeCompare(b.measured_on)).map((e) => ({ day: e.measured_on, kg: e.weight_kg }));
}

/** Latest weight and its change since the last weigh-in at least a week earlier (or the first one). */
export function weightTrend(series: { day: string; kg: number }[]): { latest: { day: string; kg: number }; change: number | null; since: string | null } | null {
  if (!series.length) return null;
  const latest = series[series.length - 1];
  const weekBefore = addDays(latest.day, -7);
  const earlier = [...series].reverse().find((p) => p.day <= weekBefore) ?? (series.length > 1 ? series[0] : null);
  return { latest, change: earlier ? Math.round((latest.kg - earlier.kg) * 100) / 100 : null, since: earlier?.day ?? null };
}

// --- Fasting -------------------------------------------------------------------

export function fastProgress(fast: Pick<Fast, 'started_at' | 'target_hours'>, now: Date) {
  const hours = Math.max(0, (now.getTime() - Date.parse(fast.started_at)) / 3_600_000);
  return { hours, fraction: Math.min(1, hours / fast.target_hours), done: hours >= fast.target_hours };
}

export function formatDuration(hours: number): string {
  const total = Math.floor(hours * 60);
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}m`;
}

// --- Streaks and milestones ----------------------------------------------------

/** Consecutive days with something logged, ending today or yesterday. */
export function streak(days: Set<string>, today: string): number {
  let day = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(day)) {
    count += 1;
    day = addDays(day, -1);
  }
  return count;
}

/** The longest run of consecutive days, ever. */
export function longestStreak(days: Set<string>): number {
  let best = 0;
  for (const day of days) {
    if (days.has(addDays(day, -1))) continue; // not the start of a run
    let length = 1;
    while (days.has(addDays(day, length))) length += 1;
    best = Math.max(best, length);
  }
  return best;
}

export function milestones(input: { sets: WorkoutSet[]; meals: Meal[]; weights: WeightEntry[] }) {
  const workoutDays = new Set(input.sets.map((s) => localDay(s.performed_at)));
  const loggedDays = new Set([...workoutDays, ...input.meals.map((m) => localDay(m.eaten_at)), ...input.weights.map((w) => w.measured_on)]);
  return [
    { id: 'first-set', label: 'First set logged', done: input.sets.length > 0 },
    { id: 'first-meal', label: 'First meal logged', done: input.meals.length > 0 },
    { id: 'first-weigh-in', label: 'First weigh-in', done: input.weights.length > 0 },
    { id: 'ten-workouts', label: '10 workout days', done: workoutDays.size >= 10 },
    { id: 'hundred-sets', label: '100 sets', done: input.sets.length >= 100 },
    { id: 'week-streak', label: 'Logged 7 days in a row', done: longestStreak(loggedDays) >= 7 },
  ];
}
