import Dexie, { Table } from 'dexie';

export interface LocalExercise {
    id: string; // UUID
    name: string;
    category: string;
    isCustom: boolean;
    userId: string;
    syncStatus: 'synced' | 'pending_create' | 'pending_delete';
}

export interface LocalRoutine {
    id: string; // UUID
    name: string;
    exerciseIds: string[]; // Stored as array, not JSON string
    userId: string;
    syncStatus: 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';
}

export interface LocalWorkoutSet {
    id: string; // UUID
    exerciseId: string;
    exerciseName: string;
    weightPerSide: number;
    totalWeight: number;
    reps: number;
    sets: number;
    date: string; // ISO String
    notes?: string;
    type: 'normal' | 'warmup' | 'drop' | 'failure';
    unit: 'metric' | 'imperial';
    userId: string;
    syncStatus: 'synced' | 'pending_create' | 'pending_delete';
}

export interface LocalMealPlan {
    id: string; // UUID or cuid
    userId: string;
    name: string;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | string;
    date: string; // ISO String
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    notes?: string;
    syncStatus: 'synced' | 'pending_create' | 'pending_delete';
}

export class MyDatabase extends Dexie {
    exercises!: Table<LocalExercise>;
    routines!: Table<LocalRoutine>;
    workouts!: Table<LocalWorkoutSet>;
    meals!: Table<LocalMealPlan>;

    constructor() {
        super('BodyTrackerDB');
        this.version(2).stores({
            exercises: 'id, name, userId, syncStatus',
            routines: 'id, name, userId, syncStatus',
            workouts: 'id, exerciseId, date, userId, syncStatus',
            meals: 'id, date, userId, syncStatus'
        });
    }
}

export const db = new MyDatabase();
