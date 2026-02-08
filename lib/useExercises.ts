import { useState, useEffect } from 'react';
import { Exercise } from './types';
import { getExercisesAction, addCustomExerciseAction } from './actions';

export function useExercises() {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getExercisesAction();
                setExercises(data);
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, []);

    const addCustomExercise = async (name: string, category: string) => {
        // Optimistic update
        const tempId = `temp-${crypto.randomUUID()}`;
        const newEx: Exercise = { id: tempId, name, category, isCustom: true };
        setExercises(prev => [...prev, newEx]);

        try {
            const saved = await addCustomExerciseAction(name, category);
            // Replace temp with real
            setExercises(prev => prev.map(e => e.id === tempId ? saved : e));
            return saved;
        } catch (e) {
            console.error("Failed to add custom exercise", e);
            // Revert on failure
            setExercises(prev => prev.filter(e => e.id !== tempId));
            throw e;
        }
    };

    return { exercises, isLoading, addCustomExercise };
}
