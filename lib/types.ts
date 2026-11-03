// Rows mirror supabase/migrations column for column, plus `dirty`, which only
// exists on the phone: 1 means "changed here, not yet synced".

export type Units = 'metric' | 'imperial';
export type Goal = 'lose' | 'maintain' | 'gain';
export type Sex = 'male' | 'female';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealSource = 'manual' | 'photo' | 'text';

interface Synced {
  user_id: string;
  updated_at: string;
  deleted_at: string | null;
  dirty: 0 | 1;
}

export interface Profile extends Synced {
  units: Units;
  goal: Goal;
  sex: Sex | null;
  age: number | null;
  height_cm: number | null;
  activity: Activity;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  onboarded_at: string | null;
}

export interface CustomExercise extends Synced {
  id: string;
  name: string;
  category: string;
}

export interface WorkoutSet extends Synced {
  id: string;
  exercise_id: string;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  performed_at: string;
}

export interface Meal extends Synced {
  id: string;
  name: string;
  meal_type: MealType;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: MealSource;
  eaten_at: string;
}

export interface WeightEntry extends Synced {
  id: string;
  weight_kg: number;
  /** The person's local calendar day, YYYY-MM-DD. */
  measured_on: string;
}

export interface Fast extends Synced {
  id: string;
  started_at: string;
  ended_at: string | null;
  target_hours: number;
}

export interface Targets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}
