import { useState, useEffect } from 'react';
import { Exercise } from './types';
import { EXERCISES as DEFAULT_EXERCISES } from './exercises';

export function useExercises() {
    const [exercises, setExercises] = useState<Exercise[]>(DEFAULT_EXERCISES);

    useEffect(() => {
        // Load custom exercises from local storage
        const stored = localStorage.getItem('custom-exercises');
        if (stored) {
            try {
                const custom: Exercise[] = JSON.parse(stored);
                setExercises([...DEFAULT_EXERCISES, ...custom]);
            } catch (e) {
                console.error('Failed to parse custom exercises', e);
            }
        }
    }, []);

    const addCustomExercise = (name: string, category: string) => {
        const newExercise: Exercise = {
            id: `custom-${crypto.randomUUID()}`,
            name,
            category,
            isCustom: true
        };

        // Update state
        const updatedExercises = [...exercises, newExercise];
        setExercises(updatedExercises);

        // Persist custom only
        const currentCustom = updatedExercises.filter(e => e.isCustom);
        localStorage.setItem('custom-exercises', JSON.stringify(currentCustom));

        return newExercise;
    };

    return { exercises, addCustomExercise };
}
