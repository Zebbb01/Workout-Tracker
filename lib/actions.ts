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
    // Check for duplicate
    const existing = await prisma.exercise.findFirst({
        where: { name, userId }
    });
    if (existing) {
        throw new Error("An exercise with this name already exists.");
    }

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
        type: (d.type as any) ?? 'normal',
        unit: (d.unit as any) ?? 'metric'
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
            unit: data.unit || 'metric',
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

    // Check for duplicate
    const existing = await prisma.routine.findFirst({
        where: { name, userId }
    });
    if (existing) {
        throw new Error("A routine with this name already exists.");
    }

    await prisma.routine.create({
        data: {
            userId,
            name,
            exerciseIds: JSON.stringify(exerciseIds)
        }
    });
    revalidatePath('/routines');
}

export async function updateRoutineAction(id: string, name: string, exerciseIds: string[]) {
    const userId = await getUser();

    await prisma.routine.update({
        where: { id, userId },
        data: {
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
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            name: true,
            email: true,
            image: true,
            profile: {
                select: {
                    useImperial: true
                }
            }
        }
    });

    return {
        ...user,
        useImperial: user?.profile?.useImperial ?? false
    };
}

export async function updateUserProfileAction(name: string) {
    const userId = await getUser();
    await prisma.user.update({
        where: { id: userId },
        data: { name }
    });
    revalidatePath('/settings');
}

export async function updateUnitPreferenceAction(useImperial: boolean) {
    const userId = await getUser();

    // We need to ensure a profile exists, or create one if not
    await prisma.userProfile.upsert({
        where: { userId },
        create: {
            userId,
            useImperial
        },
        update: {
            useImperial
        }
    });

    revalidatePath('/settings');
    revalidatePath('/'); // Might affect other pages displaying units
}

export async function deleteAccountAction() {
    const userId = await getUser();
    await prisma.user.delete({
        where: { id: userId }
    });
}

import { signOut } from "@/auth";

export async function signOutAction() {
    // This will redirect to /login after signout
    await signOut({ redirect: true, redirectTo: "/login" });
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

// --- Meal Plans ---
export async function getMealPlansAction(date: Date) {
    const userId = await getUser();

    // Get meals for the specific date (start of day to end of day)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const meals = await prisma.mealPlan.findMany({
        where: {
            userId,
            date: {
                gte: startOfDay,
                lte: endOfDay
            }
        },
        orderBy: { createdAt: 'asc' }
    });

    return meals.map(m => ({
        ...m,
        date: m.date,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt
    }));
}

export async function addMealPlanAction(data: {
    name: string;
    mealType: string;
    date: Date;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    notes?: string;
}) {
    const userId = await getUser();

    const meal = await prisma.mealPlan.create({
        data: {
            userId,
            name: data.name,
            mealType: data.mealType,
            date: new Date(data.date),
            calories: data.calories,
            protein: data.protein,
            carbs: data.carbs,
            fat: data.fat,
            notes: data.notes
        }
    });

    revalidatePath('/meals');
    return meal;
}

export async function updateMealPlanAction(id: string, data: {
    name?: string;
    mealType?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    notes?: string;
}) {
    const userId = await getUser();

    const meal = await prisma.mealPlan.update({
        where: { id, userId },
        data
    });

    revalidatePath('/meals');
    return meal;
}

export async function deleteMealPlanAction(id: string) {
    const userId = await getUser();

    await prisma.mealPlan.delete({
        where: { id, userId }
    });

    revalidatePath('/meals');
}

// --- Achievements ---
export async function getAllAchievementsAction() {
    const achievements = await prisma.achievement.findMany({
        orderBy: { category: 'asc' }
    });
    return achievements;
}

export async function getUserAchievementsAction() {
    const userId = await getUser();

    const userAchievements = await prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true }
    });

    return userAchievements.map(ua => ({
        ...ua.achievement,
        unlockedAt: ua.unlockedAt
    }));
}

export async function checkAndUnlockAchievementsAction() {
    const userId = await getUser();

    // Get user stats
    const [workoutCount, mealCount, weightEntries] = await Promise.all([
        prisma.workoutSet.count({ where: { userId } }),
        prisma.mealPlan.count({ where: { userId } }),
        prisma.weightEntry.count({ where: { userId } })
    ]);

    // Get all achievements
    const allAchievements = await prisma.achievement.findMany();
    const userAchievements = await prisma.userAchievement.findMany({
        where: { userId }
    });
    const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));

    // Check which achievements should be unlocked
    const newlyUnlocked = [];
    for (const achievement of allAchievements) {
        if (unlockedIds.has(achievement.id)) continue;

        let shouldUnlock = false;
        switch (achievement.category) {
            case 'workout':
                shouldUnlock = workoutCount >= achievement.requirement;
                break;
            case 'meals':
                shouldUnlock = mealCount >= achievement.requirement;
                break;
            case 'weight':
                shouldUnlock = weightEntries >= achievement.requirement;
                break;
        }

        if (shouldUnlock) {
            await prisma.userAchievement.create({
                data: { userId, achievementId: achievement.id }
            });
            newlyUnlocked.push(achievement);
        }
    }

    revalidatePath('/achievements');
    revalidatePath('/');
    return newlyUnlocked;
}
