import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { db, LocalWorkoutSet, LocalRoutine, LocalExercise, LocalMealPlan } from './db';
import { syncWorkouts, syncRoutines, syncExercises, syncMeals } from './sync';
import { getUserProfileAction, getMealPlansAction, getAllAchievementsAction, getUserAchievementsAction, getUserTDEEProfileAction, getWeightEntriesAction, addCustomExerciseAction } from './actions';
import { useLiveQuery } from 'dexie-react-hooks';

interface UserProfile {
    useImperial: boolean;
    name?: string | null;
    email?: string | null;
    image?: string | null;
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
    weightEntries: any[];

    // Statuses
    isLoading: boolean;
    isInitialized: boolean;
    syncingStatus: Record<string, boolean>;

    // Actions
    refreshWorkouts: (force?: boolean) => Promise<void>;
    refreshRoutines: (force?: boolean) => Promise<void>;
    refreshExercises: (force?: boolean) => Promise<void>;
    refreshUserProfile: (force?: boolean) => Promise<void>;
    refreshWeightEntries: (force?: boolean, limit?: number) => Promise<void>;
    refreshMeals: (force?: boolean, date?: Date) => Promise<void>;
    refreshAchievements: (force?: boolean) => Promise<void>;
    refreshTDEE: (force?: boolean) => Promise<void>;
    refreshAll: (force?: boolean) => Promise<void>;
    refreshForPage: (path: string, force?: boolean) => Promise<void>;
    addCustomExercise: (name: string, category: string) => Promise<any>;

    // Derived data
    userUnit: 'metric' | 'imperial';
}

const CacheContext = createContext<CacheContextType | null>(null);

// Throttle configurations
const THROTTLE_CONFIG: Record<string, number> = {
    workouts: 5 * 60 * 1000,
    routines: 10 * 60 * 1000,
    exercises: 60 * 60 * 1000, // Rarely changes
    profile: 15 * 60 * 1000,
    meals: 5 * 60 * 1000,
    achievements: 20 * 60 * 1000,
    tdee: 15 * 60 * 1000,
    weight: 10 * 60 * 1000,
};

export function CacheProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [achievements, setAchievements] = useState<any[]>([]);
    const [userAchievements, setUserAchievements] = useState<any[]>([]);
    const [tdeeProfile, setTdeeProfile] = useState<any | null>(null);
    const [weightEntries, setWeightEntries] = useState<any[]>([]);
    const [syncingStatus, setSyncingStatus] = useState<Record<string, boolean>>({});

    const lastRefreshTimes = useRef<Record<string, number>>({});

    const workouts = useLiveQuery(() => db.workouts.toArray(), [], []) as LocalWorkoutSet[];
    const routines = useLiveQuery(() => db.routines.toArray(), [], []) as LocalRoutine[];
    const exercises = useLiveQuery(() => db.exercises.toArray(), [], []) as LocalExercise[];
    const meals = useLiveQuery(() => db.meals.toArray(), [], []) as LocalMealPlan[];

    const userUnit = userProfile?.useImperial ? 'imperial' : 'metric';

    // Internal helper to check throttle
    const isStale = (category: string, overrideThrottle?: number) => {
        const last = lastRefreshTimes.current[category] || 0;
        const throttle = overrideThrottle ?? THROTTLE_CONFIG[category] ?? 300000;
        return Date.now() - last > throttle;
    };

    const updateStatus = (category: string, syncing: boolean) => {
        setSyncingStatus(prev => ({ ...prev, [category]: syncing }));
        if (!syncing) lastRefreshTimes.current[category] = Date.now();
    };

    const refreshWorkouts = useCallback(async (force = false) => {
        if (!force && !isStale('workouts')) return;
        updateStatus('workouts', true);
        try {
            await syncWorkouts();
        } catch (err) {
            console.warn('Sync failed:', err);
        } finally {
            updateStatus('workouts', false);
        }
    }, []);

    const refreshRoutines = useCallback(async (force = false) => {
        if (!force && !isStale('routines')) return;
        updateStatus('routines', true);
        try {
            await syncRoutines();
        } catch (err) {
            console.warn('Sync failed:', err);
        } finally {
            updateStatus('routines', false);
        }
    }, []);

    const refreshExercises = useCallback(async (force = false) => {
        if (!force && !isStale('exercises')) return;
        updateStatus('exercises', true);
        try {
            await syncExercises();
        } catch (err) {
            console.warn('Sync failed:', err);
        } finally {
            updateStatus('exercises', false);
        }
    }, []);

    const refreshUserProfile = useCallback(async (force = false) => {
        if (!force && !isStale('profile')) return;
        updateStatus('profile', true);
        try {
            const profileData = await getUserProfileAction();
            if (profileData) {
                setUserProfile({ 
                    useImperial: profileData.useImperial,
                    name: profileData.name, 
                    email: profileData.email, 
                    image: profileData.image 
                });
            }
        } finally {
            updateStatus('profile', false);
        }
    }, []);

    const refreshWeightEntries = useCallback(async (force = false, limit = 10) => {
        if (!force && !isStale('weight')) return;
        updateStatus('weight', true);
        try {
            const entries = await getWeightEntriesAction(limit);
            setWeightEntries(entries);
        } finally {
            updateStatus('weight', false);
        }
    }, []);

    const refreshMeals = useCallback(async (force = false) => {
        if (!force && !isStale('meals')) return;
        updateStatus('meals', true);
        try {
            await syncMeals();
        } catch (err) {
            console.warn('Sync failed:', err);
        } finally {
            updateStatus('meals', false);
        }
    }, []);

    const refreshAchievements = useCallback(async (force = false) => {
        if (!force && !isStale('achievements')) return;
        updateStatus('achievements', true);
        try {
            const [all, user] = await Promise.all([
                getAllAchievementsAction(),
                getUserAchievementsAction()
            ]);
            setAchievements(all);
            setUserAchievements(user);
        } finally {
            updateStatus('achievements', false);
        }
    }, []);

    const refreshTDEE = useCallback(async (force = false) => {
        if (!force && !isStale('tdee')) return;
        updateStatus('tdee', true);
        try {
            const profile = await getUserTDEEProfileAction();
            setTdeeProfile(profile);
        } finally {
            updateStatus('tdee', false);
        }
    }, []);

    const refreshForPage = useCallback(async (path: string, force = false) => {
        const promises = [];
        // Determine what is critical for the current page
        if (path === '/' || path === '/history' || path === '/calendar') {
            promises.push(refreshWorkouts(force), refreshMeals(force), refreshTDEE(force), refreshWeightEntries(force), refreshUserProfile(force));
        } else if (path === '/routines') {
            promises.push(refreshExercises(force), refreshRoutines(force));
        } else if (path === '/progress') {
            promises.push(refreshWorkouts(force), refreshExercises(force), refreshUserProfile(force));
        } else if (path === '/achievements') {
            promises.push(refreshAchievements(force));
        } else if (path === '/tdee' || path === '/profile') {
            promises.push(refreshTDEE(force), refreshWeightEntries(force), refreshUserProfile(force));
        } else if (path === '/log') {
            promises.push(refreshExercises(force), refreshWorkouts(force), refreshUserProfile(force), refreshRoutines(force));
        } else if (path === '/meals') {
            promises.push(refreshMeals(force), refreshTDEE(force));
        } else if (path === '/settings') {
            promises.push(refreshUserProfile(force));
        } else {
            // General fallback
            promises.push(refreshWorkouts(force), refreshRoutines(force), refreshMeals(force));
        }
        await Promise.all(promises);
    }, [refreshWorkouts, refreshMeals, refreshTDEE, refreshWeightEntries, refreshUserProfile, refreshExercises, refreshRoutines, refreshAchievements]);

    const addCustomExercise = useCallback(async (name: string, category: string) => {
        const res = await addCustomExerciseAction(name, category);
        await refreshExercises(true);
        return res;
    }, [refreshExercises]);

    const refreshAll = useCallback(async (force = false) => {
        await Promise.all([
            refreshExercises(force),
            refreshRoutines(force),
            refreshWorkouts(force),
            refreshUserProfile(force),
            refreshMeals(force),
            refreshAchievements(force),
            refreshTDEE(force),
            refreshWeightEntries(force),
        ]);
    }, [refreshExercises, refreshRoutines, refreshWorkouts, refreshUserProfile, refreshMeals, refreshAchievements, refreshTDEE, refreshWeightEntries]);

    // Initial load - targeted for landing page
    useEffect(() => {
        if (!isInitialized) {
            // Check current path for public route status once
            const isPublic = typeof window !== 'undefined' && (window.location.pathname.startsWith('/onboarding') || window.location.pathname.startsWith('/login'));
            if (isPublic) {
                setIsLoading(false);
                setIsInitialized(true);
            } else {
                // Do a broad first sync but only mark isLoading once first relevant data hits
                refreshAll(true).then(() => {
                    setIsInitialized(true);
                    setIsLoading(false);
                });
            }
        }
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
        weightEntries,
        isLoading,
        isInitialized,
        syncingStatus,
        refreshWorkouts,
        refreshRoutines,
        refreshExercises,
        refreshUserProfile,
        refreshWeightEntries,
        refreshMeals,
        refreshAchievements,
        refreshTDEE,
        refreshAll,
        refreshForPage,
        addCustomExercise,
        userUnit,
    };

    return (
        <CacheContext.Provider value={value}>
            {children}
            <SyncManager />
        </CacheContext.Provider>
    );
}

/**
 * Minimal child component to handle background sync triggers without 
 * causing the main CacheProvider (and all its children) to rerender 
 * on every pathname change.
 */
function SyncManager() {
    const pathname = usePathname();
    const { refreshForPage, isInitialized } = useCache();
    const isPublicRoute = pathname?.startsWith('/onboarding') || pathname?.startsWith('/login');

    // Background sync on visibility change (targeted)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isInitialized && !isPublicRoute) {
                refreshForPage(pathname);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isInitialized, pathname, isPublicRoute, refreshForPage]);

    // Online/offline sync (targeted)
    useEffect(() => {
        const handleOnline = () => {
            if (isInitialized && !isPublicRoute) {
                refreshForPage(pathname, true);
            }
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [isInitialized, pathname, isPublicRoute, refreshForPage]);

    return null;
}

export function useCache() {
    const context = useContext(CacheContext);
    if (!context) throw new Error('useCache must be used within a CacheProvider');
    return context;
}

// Convenience hooks - use global isLoading only for initial mount, category syncing status otherwise
export function useWorkouts() {
    const { workouts, refreshWorkouts, isLoading, syncingStatus } = useCache();
    return { workouts, refresh: refreshWorkouts, isLoading: isLoading && workouts.length === 0, isSyncing: syncingStatus['workouts'] };
}

export function useRoutines() {
    const { routines, refreshRoutines, isLoading, syncingStatus } = useCache();
    return { routines, refresh: refreshRoutines, isLoading: isLoading && routines.length === 0, isSyncing: syncingStatus['routines'] };
}

export function useCachedExercises() {
    const { exercises, refreshExercises, isLoading, syncingStatus, addCustomExercise } = useCache();
    return { exercises, refresh: refreshExercises, isLoading: isLoading && exercises.length === 0, isSyncing: syncingStatus['exercises'], addCustomExercise };
}

export function useUserProfile() {
    const { userProfile, userUnit, refreshUserProfile, isLoading, syncingStatus } = useCache();
    return { profile: userProfile, userUnit, refresh: refreshUserProfile, isLoading: isLoading && !userProfile, isSyncing: syncingStatus['profile'] };
}

export function useMeals() {
    const { meals, refreshMeals, isLoading, syncingStatus } = useCache();
    return { meals, refresh: refreshMeals, isLoading: isLoading && meals.length === 0, isSyncing: syncingStatus['meals'] };
}

export function useAchievements() {
    const { achievements, userAchievements, refreshAchievements, isLoading, syncingStatus } = useCache();
    return { achievements, userAchievements, refresh: refreshAchievements, isLoading: isLoading && achievements.length === 0, isSyncing: syncingStatus['achievements'] };
}

export function useTDEE() {
    const { tdeeProfile, refreshTDEE, isLoading, syncingStatus } = useCache();
    return { tdeeProfile, refresh: refreshTDEE, isLoading: isLoading && !tdeeProfile, isSyncing: syncingStatus['tdee'] };
}

export function useWeightEntries() {
    const { weightEntries, refreshWeightEntries, isLoading, syncingStatus } = useCache();
    return { weightEntries, refresh: refreshWeightEntries, isLoading: isLoading && weightEntries.length === 0, isSyncing: syncingStatus['weight'] };
}
