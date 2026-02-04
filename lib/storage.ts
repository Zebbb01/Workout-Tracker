import { WorkoutSet, Routine } from './types';

const STORAGE_KEY = 'body-tracker-workouts';

export const getWorkouts = (): WorkoutSet[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
        return JSON.parse(stored);
    } catch (e) {
        console.error('Failed to parse workouts from local storage', e);
        return [];
    }
};

export const saveWorkout = (workout: WorkoutSet): void => {
    const workouts = getWorkouts();
    const updated = [...workouts, workout];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const deleteWorkout = (id: string): void => {
    const workouts = getWorkouts();
    const updated = workouts.filter(w => w.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const getWorkoutsByDate = (date: string): WorkoutSet[] => {
    const workouts = getWorkouts();
    // Match YYYY-MM-DD
    return workouts.filter(w => w.date.startsWith(date));
};

const ROUTINES_KEY = 'body-tracker-routines';

export const getRoutines = (): Routine[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(ROUTINES_KEY);
    return data ? JSON.parse(data) : [];
};

export const saveRoutine = (routine: Routine): void => {
    const routines = getRoutines();
    const updated = [...routines, routine];
    localStorage.setItem(ROUTINES_KEY, JSON.stringify(updated));
};

export const deleteRoutine = (id: string): void => {
    const routines = getRoutines();
    const updated = routines.filter(r => r.id !== id);
    localStorage.setItem(ROUTINES_KEY, JSON.stringify(updated));
};
