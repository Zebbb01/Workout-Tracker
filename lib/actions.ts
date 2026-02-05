'use server';

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

import { redirect } from "next/navigation";

// --- Helpers ---
async function getUser() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect('/login');
    }
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

// --- User Settings ---
export async function getUserProfileAction() {
    const userId = await getUser();
    return prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, image: true }
    });
}

export async function updateUserProfileAction(name: string) {
    const userId = await getUser();
    await prisma.user.update({
        where: { id: userId },
        data: { name }
    });
    revalidatePath('/settings');
}

export async function deleteAccountAction() {
    const userId = await getUser();
    await prisma.user.delete({
        where: { id: userId }
    });
}

import { signOut } from "@/auth";

export async function signOutAction() {
    await signOut({ redirectTo: "/login" });
}

// --- TDEE Profile ---
export interface TDEEProfileData {
    heightCm: number;
    weightKg: number;
    age: number;
    gender: string;
    activityLevel: string;
    bodyFatPct?: number;
    bmr: number;
    tdee: number;
    goal: string;
    targetCalories: number;
    proteinTarget: number;
    carbsTarget: number;
    fatTarget: number;
    useImperial: boolean;
}

export async function getUserTDEEProfileAction() {
    const userId = await getUser();
    const profile = await prisma.userProfile.findUnique({
        where: { userId }
    });
    return profile;
}

export async function saveUserTDEEProfileAction(data: TDEEProfileData) {
    const userId = await getUser();

    const result = await prisma.userProfile.upsert({
        where: { userId },
        create: {
            userId,
            heightCm: data.heightCm,
            weightKg: data.weightKg,
            age: data.age,
            gender: data.gender,
            activityLevel: data.activityLevel,
            bodyFatPct: data.bodyFatPct,
            bmr: data.bmr,
            tdee: data.tdee,
            goal: data.goal,
            targetCalories: data.targetCalories,
            proteinTarget: data.proteinTarget,
            carbsTarget: data.carbsTarget,
            fatTarget: data.fatTarget,
            useImperial: data.useImperial,
        },
        update: {
            heightCm: data.heightCm,
            weightKg: data.weightKg,
            age: data.age,
            gender: data.gender,
            activityLevel: data.activityLevel,
            bodyFatPct: data.bodyFatPct,
            bmr: data.bmr,
            tdee: data.tdee,
            goal: data.goal,
            targetCalories: data.targetCalories,
            proteinTarget: data.proteinTarget,
            carbsTarget: data.carbsTarget,
            fatTarget: data.fatTarget,
            useImperial: data.useImperial,
        }
    });

    revalidatePath('/tdee');
    revalidatePath('/');
    return result;
}

// --- Weight Tracking ---
export async function getWeightEntriesAction(limit: number = 30) {
    const userId = await getUser();
    const entries = await prisma.weightEntry.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: limit
    });

    return entries.map(e => ({
        ...e,
        date: e.date.toISOString(),
        createdAt: e.createdAt.toISOString()
    }));
}

export async function saveWeightEntryAction(weightKg: number, bodyFatPct?: number, notes?: string) {
    const userId = await getUser();

    const entry = await prisma.weightEntry.create({
        data: {
            userId,
            weightKg,
            bodyFatPct,
            notes
        }
    });

    // Also update the user profile with the latest weight
    await prisma.userProfile.updateMany({
        where: { userId },
        data: { weightKg }
    });

    revalidatePath('/tdee');
    return entry;
}

