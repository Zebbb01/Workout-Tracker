import { Exercise } from './types';

export const EXERCISES: Exercise[] = [
    // Legs
    { id: 'squat', name: 'Barbell Squat', category: 'Legs' },
    { id: 'leg-press', name: 'Leg Press', category: 'Legs' },
    { id: 'lunge', name: 'Lunges', category: 'Legs' },
    { id: 'deadlift', name: 'Deadlift', category: 'Back/Legs' },

    // Chest
    { id: 'bench-press', name: 'Bench Press', category: 'Chest' },
    { id: 'incline-bench', name: 'Incline Bench Press', category: 'Chest' },
    { id: 'push-up', name: 'Push Ups', category: 'Chest' },
    { id: 'dumbbell-fly', name: 'Dumbbell Flys', category: 'Chest' },

    // Back
    { id: 'pull-up', name: 'Pull Ups', category: 'Back' },
    { id: 'barbell-row', name: 'Barbell Row', category: 'Back' },
    { id: 'lat-pulldown', name: 'Lat Pulldown', category: 'Back' },

    // Shoulders
    { id: 'overhead-press', name: 'Overhead Press', category: 'Shoulders' },
    { id: 'lateral-raise', name: 'Lateral Raise', category: 'Shoulders' },

    // Arms
    { id: 'bicep-curl', name: 'Barbell Curl', category: 'Biceps' },
    { id: 'tricep-extension', name: 'Tricep Extension', category: 'Triceps' },
];
