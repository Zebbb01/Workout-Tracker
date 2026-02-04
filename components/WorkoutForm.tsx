'use client';

import React, { useState, useEffect } from 'react';
import { useExercises } from '@/lib/useExercises';
import { saveWorkout } from '@/lib/storage';
import { WorkoutSet } from '@/lib/types';
import { Plus, Save, Clock, FileText, Dumbbell } from 'lucide-react';
import CreateExercise from './CreateExercise';

interface WorkoutFormProps {
    selectedDate: Date | null;
    onSuccess: () => void;
}

export default function WorkoutForm({ selectedDate, onSuccess }: WorkoutFormProps) {
    const { exercises, addCustomExercise } = useExercises();
    const [isCreatingExercise, setIsCreatingExercise] = useState(false);

    const [exerciseId, setExerciseId] = useState('');
    const [weightPerSide, setWeightPerSide] = useState<string>('');
    const [totalWeight, setTotalWeight] = useState<string>('');
    const [reps, setReps] = useState('');
    const [sets, setSets] = useState('');
    const [notes, setNotes] = useState('');
    const [setType, setSetType] = useState<WorkoutSet['type']>('normal');

    // Auto-calculate total or per-side
    useEffect(() => {
        if (weightPerSide && !isNaN(Number(weightPerSide))) {
            const perSide = Number(weightPerSide);
            setTotalWeight((perSide * 2).toString());
        }
    }, [weightPerSide]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!exerciseId || !weightPerSide || !reps || !sets) return;

        const exercise = exercises.find(ex => ex.id === exerciseId);
        if (!exercise) return;

        const newWorkout: WorkoutSet = {
            id: crypto.randomUUID(),
            exerciseId,
            exerciseName: exercise.name,
            weightPerSide: Number(weightPerSide),
            totalWeight: Number(totalWeight),
            reps: Number(reps),
            sets: Number(sets),
            date: (selectedDate || new Date()).toISOString(),
            notes,
            type: setType,
        };

        saveWorkout(newWorkout);

        // Reset form partially for rapid entry
        setReps('');
        setNotes('');
        setSetType('normal');

        onSuccess();
    };

    const handleCreateExercise = (name: string, category: string) => {
        const newEx = addCustomExercise(name, category);
        setExerciseId(newEx.id);
        setIsCreatingExercise(false);
    };

    if (isCreatingExercise) {
        return <CreateExercise onCreate={handleCreateExercise} onCancel={() => setIsCreatingExercise(false)} />;
    }

    return (
        <form onSubmit={handleSubmit} className="glass-card p-6 rounded-xl space-y-5 animate-in">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <Dumbbell size={20} className="text-orange-500" />
                Log Workout
            </h3>

            <div className="space-y-4">
                {/* Exercise Selection */}
                <div>
                    <label className="block text-xs text-zinc-400 mb-1">Exercise</label>
                    <div className="flex gap-2">
                        <select
                            value={exerciseId}
                            onChange={(e) => setExerciseId(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500 transition-colors appearance-none"
                            required
                        >
                            <option value="">Select Exercise</option>
                            {exercises.map(ex => (
                                <option key={ex.id} value={ex.id}>{ex.name} {ex.isCustom ? '(Custom)' : ''}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => setIsCreatingExercise(true)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-orange-500 p-3 rounded-lg border border-zinc-700 transition-colors"
                            title="Create New Exercise"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>

                {/* Set Type Toggles */}
                <div>
                    <label className="block text-xs text-zinc-400 mb-2">Set Type</label>
                    <div className="flex rounded-lg overflow-hidden border border-zinc-700">
                        {(['normal', 'warmup', 'drop', 'failure'] as const).map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setSetType(type)}
                                className={`flex-1 py-2 text-xs font-bold uppercase transition-colors
                                    ${setType === type
                                        ? 'bg-orange-600 text-white'
                                        : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                                    }
                                `}
                            >
                                {type === 'normal' ? 'Set' : type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Weights */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-zinc-400 mb-1">Weight / Side (kg)</label>
                        <input
                            type="number"
                            value={weightPerSide}
                            onChange={(e) => setWeightPerSide(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                            placeholder="50"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-zinc-400 mb-1">Total (kg)</label>
                        <input
                            type="number"
                            value={totalWeight}
                            readOnly
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-zinc-500 cursor-not-allowed"
                            placeholder="100"
                        />
                    </div>
                </div>

                {/* Sets & Reps */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-zinc-400 mb-1">Reps</label>
                        <input
                            type="number"
                            value={reps}
                            onChange={(e) => setReps(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                            placeholder="Repetitions"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-zinc-400 mb-1">Sets</label>
                        <input
                            type="number"
                            value={sets}
                            onChange={(e) => setSets(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                            placeholder="Total Sets"
                            required
                        />
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-xs text-zinc-400 mb-1 flex items-center gap-1">
                        <FileText size={12} /> Notes (Optional)
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500 transition-colors text-sm"
                        placeholder="RPE, feelings, etc..."
                        rows={2}
                    />
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={20} />
                    Log {setType !== 'normal' ? setType : 'Set'}
                </button>
            </div>
        </form>
    );
}
