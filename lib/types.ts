export interface Exercise {
  id: string;
  name: string;
  category: string;
  isCustom?: boolean;
}

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  exerciseName: string;
  weightPerSide: number;
  totalWeight: number;
  reps: number;
  sets: number;
  date: string;
  // New Fields
  type?: 'normal' | 'warmup' | 'drop' | 'failure';
  notes?: string;
  restTime?: number; // in seconds
}

export interface Routine {
  id: string;
  name: string;
  exerciseIds: string[]; // List of exercise IDs in order
  color?: string;
}
