'use server';

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

// --- Helpers ---
async function getUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    return session.user.id;
}

// --- Exercises ---
export async function getExercisesAction() {
    const userId = await getUser();
    const exercises = await prisma.exercise.findMany({
        where: {
            OR: [
                { userId: null },
                { userId: userId }
            ]
        }
    });
    return exercises;
}

export async function addCustomExerciseAction(name: string, category: string) {
    const userId = await getUser();
    const newExercise = await prisma.exercise.create({
        data: {
            name,
            category,
            isCustom: true,
            userId
        }
    });
    revalidatePath('/log');
    return newExercise;
}

// --- Workouts ---
export async function getWorkoutsAction() {
    const userId = await getUser();
    const data = await prisma.workoutSet.findMany({
        where: { userId },
        orderBy: { date: 'desc' }
    });

    // Convert Dates to strings to match WorkoutSet interface and avoid serialization warnings/errors
    return data.map(d => ({
        ...d,
        date: d.date.toISOString(),
        restTime: d.restTime ?? undefined,
        notes: d.notes ?? undefined,
        type: (d.type as any) ?? 'normal'
    }));
}

export async function saveWorkoutAction(data: any) {
    const userId = await getUser();

    await prisma.workoutSet.create({
        data: {
            userId,
            exerciseId: data.exerciseId,
            exerciseName: data.exerciseName,
            weightPerSide: data.weightPerSide,
            totalWeight: data.totalWeight,
            reps: data.reps,
            sets: data.sets,
            date: new Date(data.date),
            type: data.type || 'normal',
            notes: data.notes,
            restTime: data.restTime
        }
    });

    revalidatePath('/history');
    revalidatePath('/log');
    revalidatePath('/calendar');
    revalidatePath('/');
}

export async function deleteWorkoutAction(id: string) {
    const userId = await getUser();
    // Ensure ownership
    await prisma.workoutSet.delete({
        where: { id, userId }
    });

    revalidatePath('/history');
    revalidatePath('/calendar');
    revalidatePath('/');
}

// --- Routines ---
export async function getRoutinesAction() {
    const userId = await getUser();
    const routines = await prisma.routine.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });

    return routines.map(r => ({
        ...r,
        exerciseIds: JSON.parse(r.exerciseIds) // Parse string back to string[]
    }));
}

export async function saveRoutineAction(name: string, exerciseIds: string[]) {
    const userId = await getUser();

    await prisma.routine.create({
        data: {
            userId,
            name,
            exerciseIds: JSON.stringify(exerciseIds)
        }
    });
    revalidatePath('/routines');
}

export async function deleteRoutineAction(id: string) {
    const userId = await getUser();
    await prisma.routine.delete({
        where: { id, userId }
    });
    revalidatePath('/routines');
}
