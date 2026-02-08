import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { syncExercises } from "./sync";
import { useEffect, useState } from "react";
import { Exercise } from "./types";

export function useExercises() {
    const exercises = useLiveQuery(() => db.exercises.toArray()) || [];
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Initial sync on mount
        syncExercises().finally(() => setIsLoading(false));

        // Listen for online status
        const handleOnline = () => syncExercises();
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    const addCustomExercise = async (name: string, category: string) => {
        const id = crypto.randomUUID();
        const newEx = {
            id,
            name,
            category,
            isCustom: true,
            userId: 'current-user', // In a real app, get from session or store
            syncStatus: 'pending_create' as const
        };

        await db.exercises.add(newEx);

        // Trigger background sync
        syncExercises();

        return newEx;
    };

    return { exercises: exercises as Exercise[], isLoading, addCustomExercise };
}
