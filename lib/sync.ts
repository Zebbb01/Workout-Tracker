import { db, LocalExercise, LocalRoutine, LocalWorkoutSet } from './db';
import {
    getExercisesAction, addCustomExerciseAction,
    getRoutinesAction, saveRoutineAction, updateRoutineAction, deleteRoutineAction,
    getWorkoutsAction, saveWorkoutAction, deleteWorkoutAction,
    getMealPlansAction, addMealPlanAction, deleteMealPlanAction, getRecentMealPlansAction
} from './actions';

export async function syncExercises() {
    // 1. Push Local Changes
    const pending = await db.exercises.where('syncStatus').notEqual('synced').toArray();

    for (const ex of pending) {
        if (ex.syncStatus === 'pending_create') {
            try {
                // We use the action but we might need to handle ID mapping if the server assigns a different ID
                // For now, let's assume the server respects the ID or we handle duplication by name
                // Pass the local ID to the server action to ensure consistency
                const result = await addCustomExerciseAction(ex.name, ex.category, ex.id);

                // If server returns a different ID, we'd need to update local. 
                // But simplified: Mark as synced.
                await db.exercises.update(ex.id, { syncStatus: 'synced' });
            } catch (e) {
                console.error("Failed to sync exercise", ex, e);
            }
        }
        // pending_delete logic if needed
    }

    // 2. Pull Server Data
    try {
        const serverData = await getExercisesAction();
        // Upsert into local
        await db.transaction('rw', db.exercises, async () => {
            for (const sEx of serverData) {
                const existing = await db.exercises.get(sEx.id);
                if (!existing) {
                    await db.exercises.add({
                        id: sEx.id,
                        name: sEx.name,
                        category: sEx.category,
                        isCustom: sEx.isCustom,
                        userId: sEx.userId || '',
                        syncStatus: 'synced'
                    });
                }
            }
        });
    } catch (e) {
        console.error("Failed to pull exercises", e);
    }
}

export async function syncRoutines() {
    // 1. Push
    const pending = await db.routines.where('syncStatus').notEqual('synced').toArray();
    for (const r of pending) {
        try {
            if (r.syncStatus === 'pending_create') {
                await saveRoutineAction(r.name, r.exerciseIds, r.id);
            } else if (r.syncStatus === 'pending_update') {
                await updateRoutineAction(r.id, r.name, r.exerciseIds);
            } else if (r.syncStatus === 'pending_delete') {
                await deleteRoutineAction(r.id);
                // Remove from local DB entirely after sync
                await db.routines.delete(r.id);
                continue;
            }
            await db.routines.update(r.id, { syncStatus: 'synced' });
        } catch (e) {
            console.error(e);
        }
    }

    // 2. Pull
    try {
        const serverRoutines = await getRoutinesAction();
        await db.transaction('rw', db.routines, async () => {
            // Simple strategy: Clear synced ones and re-add to avoid zombie data? 
            // Or careful diff. Let's do upsert.
            for (const r of serverRoutines) {
                const existing = await db.routines.get(r.id);
                // Only overwrite if local is 'synced' (meaning no local pending changes)
                if (!existing || existing.syncStatus === 'synced') {
                    await db.routines.put({
                        id: r.id,
                        name: r.name,
                        exerciseIds: r.exerciseIds,
                        userId: r.userId,
                        syncStatus: 'synced'
                    });
                }
            }
        });
    } catch (e) { console.error(e); }
}

export async function syncWorkouts() {
    const pending = await db.workouts.where('syncStatus').notEqual('synced').toArray();
    for (const w of pending) {
        try {
            if (w.syncStatus === 'pending_create') {
                await saveWorkoutAction({
                    ...w,
                    date: w.date,
                    unit: w.unit || 'metric'
                }, w.id);
                await db.workouts.update(w.id, { syncStatus: 'synced' });
            } else if (w.syncStatus === 'pending_delete') {
                await deleteWorkoutAction(w.id);
                await db.workouts.delete(w.id);
            }
        } catch (e) {
            console.error("Failed to sync workout", e);
        }
    }

    // 2. Pull
    try {
        const serverData = await getWorkoutsAction();
        await db.transaction('rw', db.workouts, async () => {
            for (const sw of serverData) {
                const existing = await db.workouts.get(sw.id);
                if (!existing || existing.syncStatus === 'synced') {
                    await db.workouts.put({
                        ...sw,
                        syncStatus: 'synced'
                    } as any);
                }
            }
        });
    } catch (e) {
        console.error("Failed to pull workouts", e);
    }
}

export async function syncMeals() {
    // 1. Push
    const pending = await db.meals.where('syncStatus').notEqual('synced').toArray();
    for (const m of pending) {
        try {
            if (m.syncStatus === 'pending_create') {
                await addMealPlanAction({
                    name: m.name,
                    mealType: m.mealType,
                    date: new Date(m.date),
                    calories: m.calories,
                    protein: m.protein,
                    carbs: m.carbs,
                    fat: m.fat,
                    notes: m.notes
                });
                await db.meals.update(m.id, { syncStatus: 'synced' });
            } else if (m.syncStatus === 'pending_delete') {
                await deleteMealPlanAction(m.id);
                await db.meals.delete(m.id);
            }
        } catch (e) {
            console.error("Failed to sync meal", e);
        }
    }

    // 2. Pull
    try {
        const serverMeals = await getRecentMealPlansAction();
        await db.transaction('rw', db.meals, async () => {
            for (const sm of serverMeals) {
                const existing = await db.meals.get(sm.id);
                if (!existing || existing.syncStatus === 'synced') {
                    await db.meals.put({
                        ...sm,
                        syncStatus: 'synced'
                    } as any);
                }
            }
        });
    } catch (e) {
        console.error("Failed to pull meals", e);
    }
}

export async function syncAll() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    await Promise.all([
        syncExercises(),
        syncRoutines(),
        syncWorkouts(),
        syncMeals()
    ]);
}
