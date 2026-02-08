'use client';

import React, { useState, useEffect } from 'react';
import { useExercises } from '@/lib/useExercises';
import { saveWorkoutAction, getUserProfileAction, updateUnitPreferenceAction, getRoutinesAction } from '@/lib/actions';
import { WorkoutSet, Routine } from '@/lib/types';
import { Plus, Save, Clock, FileText, Dumbbell, ListChecks, CheckCircle2 } from 'lucide-react';
import CreateExercise from './CreateExercise';
import Select from './ui/Select';

interface WorkoutFormProps {
    selectedDate: Date | null;
    routineId?: string;
    onSuccess: () => void;
}

export default function WorkoutForm({ selectedDate, routineId, onSuccess }: WorkoutFormProps) {
    const { exercises, addCustomExercise } = useExercises();
    const [isCreatingExercise, setIsCreatingExercise] = useState(false);
    const [routine, setRoutine] = useState<Routine | null>(null);

    const [exerciseId, setExerciseId] = useState('');
    const [weightPerSide, setWeightPerSide] = useState<string>('');
    const [totalWeight, setTotalWeight] = useState<string>('');
    const [reps, setReps] = useState('');
    const [sets, setSets] = useState('');
    const [notes, setNotes] = useState('');
    const [setType, setSetType] = useState<WorkoutSet['type']>('normal');

    // Unit Preference
    const [unitSystem, setUnitSystem] = useState<string>('metric');

    // Load initial unit preference and routine
    useEffect(() => {
        const load = async () => {
            const profile = await getUserProfileAction();
            if (profile?.useImperial) {
                setUnitSystem('imperial');
            }

            if (routineId) {
                const allRoutines = await getRoutinesAction();
                const found = allRoutines.find(r => r.id === routineId);
                if (found) {
                    setRoutine(found);
                    // Automatically select first exercise in routine
                    if (found.exerciseIds.length > 0) {
                        setExerciseId(found.exerciseIds[0]);
                    }
                }
            }
        };
        load();
    }, [routineId]);

    const handleUnitChange = async (unit: string) => {
        setUnitSystem(unit);
        await updateUnitPreferenceAction(unit === 'imperial');
    };

    // Auto-calculate total or per-side
    useEffect(() => {
        if (weightPerSide && !isNaN(Number(weightPerSide))) {
            const perSide = Number(weightPerSide);
            setTotalWeight((perSide * 2).toString());
        }
    }, [weightPerSide]);

    const handleSubmit = async (e: React.FormEvent) => {
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

        await saveWorkoutAction(newWorkout);

        // Reset form partially for rapid entry
        setReps('');
        setNotes('');
        setSetType('normal');

        onSuccess();
    };

    const handleCreateExercise = async (name: string, category: string) => {
        const newEx = await addCustomExercise(name, category);
        setExerciseId(newEx.id);
        setIsCreatingExercise(false);
    };

    if (isCreatingExercise) {
        return <CreateExercise onCreate={handleCreateExercise} onCancel={() => setIsCreatingExercise(false)} />;
    }

    return (
        <div className="space-y-6">
            {routine && (
                <div className="glass-card p-5 rounded-xl border-orange-500/20">
                    <div className="flex items-center gap-2 mb-4 text-orange-500">
                        <ListChecks size={20} />
                        <h3 className="font-bold text-sm tracking-wide uppercase">Active Routine: {routine.name}</h3>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        {routine.exerciseIds.map((id, index) => {
                            const ex = exercises.find(e => e.id === id);
                            const isActive = id === exerciseId;
                            return (
                                <button
                                    key={id}
                                    onClick={() => setExerciseId(id)}
                                    className={`flex-shrink-0 px-4 py-3 rounded-xl border transition-all text-left group
                                        ${isActive
                                            ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/20'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}
                                    `}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] opacity-60 font-mono">0{index + 1}</span>
                                        <span className="text-xs font-bold whitespace-nowrap">{ex?.name || 'Loading...'}</span>
                                        {isActive && <CheckCircle2 size={12} className="text-white fill-orange-500" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="glass-card p-6 rounded-xl space-y-5 animate-in">
                <h3 className="text-lg font-semibold text-white mb-2 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Dumbbell size={20} className="text-orange-500" />
                        Log {routine ? 'Progress' : 'Workout'}
                    </div>
                    {routine && (
                        <span className="text-[10px] bg-orange-600/20 text-orange-400 px-2 py-1 rounded-full border border-orange-600/30">
                            Guided Mode
                        </span>
                    )}
                </h3>

                <div className="space-y-4">
                    {/* Exercise Selection */}
                    <div>
                        <Select
                            label="Exercise"
                            options={exercises.map(ex => ({ id: ex.id, label: ex.name, subLabel: ex.isCustom ? '(Custom)' : undefined }))}
                            value={exerciseId}
                            onChange={setExerciseId}
                            placeholder="Select Exercise"
                            action={{
                                label: "Create New Exercise",
                                onClick: () => setIsCreatingExercise(true),
                                icon: <Plus size={20} />
                            }}
                        />
                    </div>

                    {/* Set Type Toggles */}
                    <div>
                        <label className="block text-xs text-zinc-400 mb-2">Set Type</label>
                        <div className="flex rounded-lg overflow-hidden border border-zinc-700">
                            {(['normal', 'warmup', 'drop', 'failure'] as const).map((type) => (
                                <button
                                    type="button"
                                    key={type}
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

                    {/* Unit and Weights */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-zinc-600 uppercase tracking-widest">Weights</label>
                            <div className="flex bg-zinc-900/50 rounded-lg p-0.5 border border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => handleUnitChange('metric')}
                                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${unitSystem === 'metric'
                                        ? 'bg-zinc-800 text-white shadow-sm'
                                        : 'text-zinc-600 hover:text-zinc-400'
                                        }`}
                                >
                                    kg
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleUnitChange('imperial')}
                                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${unitSystem === 'imperial'
                                        ? 'bg-zinc-800 text-white shadow-sm'
                                        : 'text-zinc-600 hover:text-zinc-400'
                                        }`}
                                >
                                    lbs
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-zinc-400 mb-1">Weight / Side ({unitSystem === 'metric' ? 'kg' : 'lbs'})</label>
                                <input
                                    type="number"
                                    value={weightPerSide}
                                    onChange={(e) => setWeightPerSide(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                                    placeholder={unitSystem === 'metric' ? "50" : "110"}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-400 mb-1">Total ({unitSystem === 'metric' ? 'kg' : 'lbs'})</label>
                                <input
                                    type="number"
                                    value={totalWeight}
                                    readOnly
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-zinc-500 cursor-not-allowed"
                                    placeholder={unitSystem === 'metric' ? "100" : "220"}
                                />
                            </div>
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
        </div>
    );
}
