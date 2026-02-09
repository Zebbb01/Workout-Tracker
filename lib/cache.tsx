import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { db, LocalWorkoutSet, LocalRoutine, LocalExercise } from './db';
import { syncWorkouts, syncRoutines, syncExercises } from './sync';
import { getUserProfileAction, getMealPlansAction, getAllAchievementsAction, getUserAchievementsAction, getUserTDEEProfileAction } from './actions';
import { useLiveQuery } from 'dexie-react-hooks';

interface UserProfile {
    useImperial: boolean;
    height?: number;
    weight?: number;
    age?: number;
    gender?: string;
    activityLevel?: string;
}

interface CacheContextType {
    // Data
    workouts: LocalWorkoutSet[];
    routines: LocalRoutine[];
    exercises: LocalExercise[];
    userProfile: UserProfile | null;
    meals: any[];
    achievements: any[];
    userAchievements: any[];
    tdeeProfile: any | null;

    // Loading states
    isLoading: boolean;
    isInitialized: boolean;

    // Actions
    refreshWorkouts: () => Promise<void>;
    refreshRoutines: () => Promise<void>;
    refreshExercises: () => Promise<void>;
    refreshUserProfile: () => Promise<void>;
    refreshMeals: (date?: Date) => Promise<void>;
    refreshAchievements: () => Promise<void>;
    refreshTDEE: () => Promise<void>;
    refreshAll: () => Promise<void>;

    // Derived data
    userUnit: 'metric' | 'imperial';
}

const CacheContext = createContext<CacheContextType | null>(null);

export function CacheProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [meals, setMeals] = useState<any[]>([]);
    const [achievements, setAchievements] = useState<any[]>([]);
    const [userAchievements, setUserAchievements] = useState<any[]>([]);
    const [tdeeProfile, setTdeeProfile] = useState<any | null>(null);

    // Use Dexie's live queries for reactive local data
    const workouts = useLiveQuery(() => db.workouts.toArray(), [], []) as LocalWorkoutSet[];
    const routines = useLiveQuery(() => db.routines.toArray(), [], []) as LocalRoutine[];
    const exercises = useLiveQuery(() => db.exercises.toArray(), [], []) as LocalExercise[];

    // Derived values
    const userUnit = userProfile?.useImperial ? 'imperial' : 'metric';

    // Refresh functions that sync with server and update local cache
    const refreshWorkouts = useCallback(async () => {
        try {
            await syncWorkouts();
        } catch (err) {
            console.warn('Failed to sync workouts, using local cache:', err);
        }
    }, []);

    const refreshRoutines = useCallback(async () => {
        try {
            await syncRoutines();
        } catch (err) {
            console.warn('Failed to sync routines, using local cache:', err);
        }
    }, []);

    const refreshExercises = useCallback(async () => {
        try {
            await syncExercises();
        } catch (err) {
            console.warn('Failed to sync exercises, using local cache:', err);
        }
    }, []);

    const refreshUserProfile = useCallback(async () => {
        try {
            const profile = await getUserProfileAction();
            if (profile) {
                setUserProfile({
                    useImperial: profile.useImperial,
                });
            }
        } catch (err) {
            console.warn('Failed to fetch user profile, using cached:', err);
        }
    }, []);

    const refreshMeals = useCallback(async (date?: Date) => {
        try {
            const data = await getMealPlansAction(date || new Date());
            setMeals(data);
        } catch (err) {
            console.warn('Failed to fetch meals:', err);
        }
    }, []);

    const refreshAchievements = useCallback(async () => {
        try {
            const [all, user] = await Promise.all([
                getAllAchievementsAction(),
                getUserAchievementsAction()
            ]);
            setAchievements(all);
            setUserAchievements(user);
        } catch (err) {
            console.warn('Failed to fetch achievements:', err);
        }
    }, []);

    const refreshTDEE = useCallback(async () => {
        try {
            const profile = await getUserTDEEProfileAction();
            setTdeeProfile(profile);
        } catch (err) {
            console.warn('Failed to fetch TDEE profile:', err);
        }
    }, []);

    const refreshAll = useCallback(async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                refreshExercises(),
                refreshRoutines(),
                refreshWorkouts(),
                refreshUserProfile(),
                refreshMeals(),
                refreshAchievements(),
                refreshTDEE(),
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [refreshExercises, refreshRoutines, refreshWorkouts, refreshUserProfile, refreshMeals, refreshAchievements, refreshTDEE]);

    // Initial load - happens once on mount
    useEffect(() => {
        if (!isInitialized) {
            refreshAll().then(() => setIsInitialized(true));
        }
    }, [isInitialized, refreshAll]);

    // Background sync on visibility change (when user returns to tab)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isInitialized) {
                // Silent background refresh
                refreshAll();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isInitialized, refreshAll]);

    // Online/offline sync
    useEffect(() => {
        const handleOnline = () => {
            if (isInitialized) {
                console.log('Back online, syncing...');
                refreshAll();
            }
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [isInitialized, refreshAll]);

    const value: CacheContextType = {
        workouts,
        routines,
        exercises,
        userProfile,
        meals,
        achievements,
        userAchievements,
        tdeeProfile,
        isLoading,
        isInitialized,
        refreshWorkouts,
        refreshRoutines,
        refreshExercises,
        refreshUserProfile,
        refreshMeals,
        refreshAchievements,
        refreshTDEE,
        refreshAll,
        userUnit,
    };

    return <CacheContext.Provider value={value}>{children}</CacheContext.Provider>;
}

export function useCache() {
    const context = useContext(CacheContext);
    if (!context) {
        throw new Error('useCache must be used within a CacheProvider');
    }
    return context;
}

// Convenience hooks
export function useWorkouts() {
    const { workouts, refreshWorkouts, isLoading } = useCache();
    return { workouts, refresh: refreshWorkouts, isLoading };
}

export function useRoutines() {
    const { routines, refreshRoutines, isLoading } = useCache();
    return { routines, refresh: refreshRoutines, isLoading };
}

export function useCachedExercises() {
    const { exercises, refreshExercises, isLoading } = useCache();
    return { exercises, refresh: refreshExercises, isLoading };
}

export function useUserProfile() {
    const { userProfile, userUnit, refreshUserProfile, isLoading } = useCache();
    return { profile: userProfile, userUnit, refresh: refreshUserProfile, isLoading };
}

export function useMeals() {
    const { meals, refreshMeals, isLoading } = useCache();
    return { meals, refresh: refreshMeals, isLoading };
}

export function useAchievements() {
    const { achievements, userAchievements, refreshAchievements, isLoading } = useCache();
    return { achievements, userAchievements, refresh: refreshAchievements, isLoading };
}

export function useTDEE() {
    const { tdeeProfile, refreshTDEE, isLoading } = useCache();
    return { tdeeProfile, refresh: refreshTDEE, isLoading };
}
