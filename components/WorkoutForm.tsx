'use client';

import React, { useState, useEffect } from 'react';
import { useExercises } from '@/lib/useExercises';
import { saveWorkoutAction, getUserProfileAction, updateUnitPreferenceAction, getRoutinesAction } from '@/lib/actions';
import { WorkoutSet, Routine } from '@/lib/types';
import { Plus, Save, Clock, FileText, Dumbbell, ListChecks, CheckCircle2 } from 'lucide-react';
import CreateExercise from './CreateExercise';
import Select from './ui/Select';
import { getExerciseImage, getCategoryColor } from '@/lib/exerciseImages';

interface WorkoutFormProps {
    selectedDate: Date | null;
    routineId?: string;
    onSuccess: () => void;
}

import { db } from '@/lib/db';
import { syncWorkouts } from '@/lib/sync';

export default function WorkoutForm({ selectedDate, routineId, onSuccess }: WorkoutFormProps) {
    const { exercises, isLoading: isLoadingExercises, addCustomExercise } = useExercises();
    const [isCreatingExercise, setIsCreatingExercise] = useState(false);
    const [routine, setRoutine] = useState<Routine | null>(null);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [exerciseId, setExerciseId] = useState('');
    const [weightPerSide, setWeightPerSide] = useState<string>('');
    const [totalWeight, setTotalWeight] = useState<string>('');
    const [reps, setReps] = useState('');
    const [sets, setSets] = useState('');
    const [notes, setNotes] = useState('');
    const [setType, setSetType] = useState<WorkoutSet['type']>('normal');

    // Unit Preference & Logging Unit
    const [profileUnit, setProfileUnit] = useState<string>('metric'); // User's general preference
    const [logUnit, setLogUnit] = useState<string>('metric'); // Specific unit for this log (togglable)

    // Session History (for batch logging)
    const [sessionWorkouts, setSessionWorkouts] = useState<any[]>([]);

    // Per-Exercise Draft State (to prevent reset when switching tabs)
    const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, {
        weightPerSide: string;
        reps: string;
        sets: string;
        notes: string;
        setType: WorkoutSet['type'];
        logUnit: string;
    }>>({});

    // Helper to save current form state to drafts
    const saveDraft = (exId: string) => {
        if (!exId) return;
        setExerciseDrafts(prev => ({
            ...prev,
            [exId]: { weightPerSide, reps, sets, notes, setType, logUnit }
        }));
    };

    // Helper to load draft or pre-fill from history
    const loadDraftOrPrefill = async (exId: string) => {
        if (!exId) return;

        // Check if we have a draft for this exercise
        if (exerciseDrafts[exId]) {
            const draft = exerciseDrafts[exId];
            setWeightPerSide(draft.weightPerSide);
            setReps(draft.reps);
            setSets(draft.sets);
            setNotes(draft.notes);
            setSetType(draft.setType);
            setLogUnit(draft.logUnit);
            return;
        }

        // No draft, try to pre-fill from last log
        const lastLog = await db.workouts
            .where('exerciseId').equals(exId)
            .reverse()
            .sortBy('date');

        if (lastLog && lastLog.length > 0) {
            const prev = lastLog[0];
            setReps(String(prev.reps));
            setSets(String(prev.sets));
            setNotes('');
            setSetType('normal');

            const prevUnit = prev.unit || 'metric';
            if (prevUnit === logUnit) {
                setWeightPerSide(String(prev.weightPerSide));
            } else {
                const weight = prev.weightPerSide;
                if (prevUnit === 'imperial' && logUnit === 'metric') {
                    setWeightPerSide((weight * 0.453592).toFixed(1));
                } else if (prevUnit === 'metric' && logUnit === 'imperial') {
                    setWeightPerSide((weight * 2.20462).toFixed(1));
                }
            }
        } else {
            // Clear inputs if no history
            setWeightPerSide('');
            setReps('');
            setSets('');
            setNotes('');
            setSetType('normal');
        }
    };

    // Track previous exerciseId to save draft on change
    const prevExerciseIdRef = React.useRef<string>('');

    // 1. Load Initial Data (Profile & Routine)
    useEffect(() => {
        const load = async () => {
            setIsLoadingInitial(true);
            try {
                const profile = await getUserProfileAction();
                const pref = profile?.useImperial ? 'imperial' : 'metric';
                setProfileUnit(pref);
                setLogUnit(pref); // Default log unit to profile preference

                if (routineId) {
                    const found = await db.routines.get(routineId);
                    if (found) {
                        setRoutine(found as any);
                        if (found.exerciseIds.length > 0) {
                            setExerciseId(found.exerciseIds[0]);
                        }
                    }
                } else if (exercises.length > 0 && !exerciseId) {
                    // Default to first exercise if not in routine mode
                    setExerciseId(exercises[0].id);
                }
            } finally {
                setIsLoadingInitial(false);
            }
        };
        load();
    }, [routineId, exercises.length]); // Dependencies need care to avoid loops

    // 2. Handle Exercise Change: Save old draft, load new draft/prefill
    useEffect(() => {
        if (prevExerciseIdRef.current && prevExerciseIdRef.current !== exerciseId) {
            // Save draft for the exercise we're leaving
            saveDraft(prevExerciseIdRef.current);
        }

        // Load draft or prefill for the new exercise
        loadDraftOrPrefill(exerciseId);

        prevExerciseIdRef.current = exerciseId;
    }, [exerciseId]);

    // 3. Calculator Effect - supports ranges like "35-40" by using max value for display
    useEffect(() => {
        const parseWeight = (val: string): number => {
            if (val.includes('-')) {
                const parts = val.split('-').map(p => parseFloat(p.trim())).filter(p => !isNaN(p));
                return parts.length > 0 ? Math.max(...parts) : 0;
            }
            return parseFloat(val) || 0;
        };
        const w = parseWeight(weightPerSide);
        setTotalWeight((w * 2).toFixed(1));
    }, [weightPerSide]);


    const handleUnitToggle = (newUnit: string) => {
        if (newUnit === logUnit) return;

        // Optional: Convert current input value? 
        // Yes, UX is better if we convert existing input so they see the equivalent
        if (weightPerSide) {
            const currentVal = parseFloat(weightPerSide);
            if (!isNaN(currentVal)) {
                if (newUnit === 'metric') {
                    // was lbs, now kg
                    setWeightPerSide((currentVal * 0.453592).toFixed(1));
                } else {
                    // was kg, now lbs
                    setWeightPerSide((currentVal * 2.20462).toFixed(1));
                }
            }
        }
        setLogUnit(newUnit);
    };

    const adjustWeight = (amount: number) => {
        const current = parseFloat(weightPerSide) || 0;
        setWeightPerSide((current + amount).toFixed(2).replace(/\.00$/, ''));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!exerciseId || !weightPerSide || !reps || !sets || isSaving) return;

        setIsSaving(true);
        try {
            const exercise = exercises.find(ex => ex.id === exerciseId);
            if (!exercise) return;

            // Parse range values (e.g., "35-40") by taking max value
            const parseNumericValue = (val: string): number => {
                if (val.includes('-')) {
                    const parts = val.split('-').map(p => parseFloat(p.trim())).filter(p => !isNaN(p));
                    return parts.length > 0 ? Math.max(...parts) : 0;
                }
                return parseFloat(val) || 0;
            };

            const workoutId = crypto.randomUUID();
            const date = (selectedDate || new Date()).toISOString();

            const newWorkout = {
                id: workoutId,
                exerciseId,
                exerciseName: exercise.name,
                weightPerSide: parseNumericValue(weightPerSide),
                totalWeight: parseNumericValue(weightPerSide) * 2,
                reps: parseNumericValue(reps),
                sets: parseNumericValue(sets),
                date,
                notes: `${weightPerSide} ${logUnit === 'metric' ? 'kg' : 'lbs'}, ${reps} reps, ${sets} sets${notes ? ' - ' + notes : ''}`,
                type: setType || 'normal',
                unit: logUnit as 'metric' | 'imperial',
                userId: 'current-user',
                syncStatus: 'pending_create' as const
            };

            await db.workouts.add(newWorkout);
            syncWorkouts();

            // Handle Batch Mode vs Single Mode
            if (routineId) {
                // Batch Mode: Add to session list, don't redirect
                setSessionWorkouts(prev => [newWorkout, ...prev]);

                // Determine next exercise in routine
                if (routine) {
                    const currentIndex = routine.exerciseIds.indexOf(exerciseId);
                    if (currentIndex !== -1 && currentIndex < routine.exerciseIds.length - 1) {
                        // Auto-advance to next exercise
                        setExerciseId(routine.exerciseIds[currentIndex + 1]);
                    }
                }

                // Reset specific fields but keep others potentially (like sets/reps if useful? No, usually different)
                // setWeightPerSide(''); // actually, changing exerciseId triggers pre-fill, which handles this
            } else {
                // Single Mode: Redirect
                onSuccess();
            }

        } catch (error: any) {
            alert(error.message || "Failed to log workout");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateExercise = async (name: string, category: string) => {
        const newEx = await addCustomExercise(name, category);
        setExerciseId(newEx.id);
        setIsCreatingExercise(false);
    };

    if (isCreatingExercise) {
        return <CreateExercise onCreate={handleCreateExercise} onCancel={() => setIsCreatingExercise(false)} />;
    }

    if (isLoadingInitial) {
        return (
            <div className="glass-card p-6 rounded-xl space-y-5 animate-pulse">
                <div className="h-40 bg-zinc-900 rounded-lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {routine && (
                <div className="glass-card p-4 rounded-xl border-orange-500/20">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 text-orange-500">
                            <ListChecks size={20} />
                            <h3 className="font-bold text-sm tracking-wide uppercase">{routine.name}</h3>
                        </div>
                        <button
                            onClick={onSuccess} // Finish Workout
                            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg border border-zinc-700 transition-colors"
                        >
                            Finish Workout
                        </button>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        {routine.exerciseIds.map((id, index) => {
                            const ex = exercises.find(e => e.id === id);
                            const isActive = id === exerciseId;
                            // Check if logged in this session
                            const isDone = sessionWorkouts.some(w => w.exerciseId === id);

                            return (
                                <button
                                    key={id}
                                    onClick={() => setExerciseId(id)}
                                    className={`flex-shrink-0 px-4 py-3 rounded-xl border transition-all text-left group relative
                                        ${isActive
                                            ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/20'
                                            : isDone
                                                ? 'bg-green-900/20 border-green-500/30 text-green-500'
                                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}
                                    `}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] opacity-60 font-mono">0{index + 1}</span>
                                        <span className="text-xs font-bold whitespace-nowrap">{ex?.name || 'Loading...'}</span>
                                        {isDone && !isActive && <CheckCircle2 size={12} className="text-green-500" />}
                                        {isActive && <div className="h-2 w-2 rounded-full bg-white animate-pulse" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="glass-card p-6 rounded-xl space-y-5 animate-in">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Dumbbell size={20} className="text-orange-500" />
                        Log Set
                    </h3>
                    <div className="flex bg-zinc-900/50 rounded-lg p-0.5 border border-zinc-800">
                        <button
                            type="button"
                            onClick={() => handleUnitToggle('metric')}
                            className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${logUnit === 'metric' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >kg</button>
                        <button
                            type="button"
                            onClick={() => handleUnitToggle('imperial')}
                            className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${logUnit === 'imperial' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >lbs</button>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Exercise Selection */}
                    <div>
                        <Select
                            label="Exercise"
                            options={exercises.map(ex => ({ id: ex.id, label: ex.name, subLabel: ex.isCustom ? '(Custom)' : undefined }))}
                            value={exerciseId}
                            onChange={setExerciseId}
                            placeholder={isLoadingExercises ? "Loading..." : "Select Exercise"}
                            action={{
                                label: "New Exercise",
                                onClick: () => setIsCreatingExercise(true),
                                icon: <Plus size={20} />
                            }}
                        />
                    </div>

                    {/* Set Type */}
                    <div>
                        <div className="flex rounded-lg overflow-hidden border border-zinc-700">
                            {(['normal', 'warmup', 'drop', 'failure'] as const).map((type) => (
                                <button
                                    type="button"
                                    key={type}
                                    onClick={() => setSetType(type)}
                                    className={`flex-1 py-2 text-[10px] font-bold uppercase transition-colors
                                        ${setType === type ? 'bg-orange-600 text-white' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}`}
                                >
                                    {type === 'normal' ? 'Set' : type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Exercise Image Banner */}
                    {exerciseId && (() => {
                        const selectedEx = exercises.find(e => e.id === exerciseId);
                        if (!selectedEx) return null;
                        const imgUrl = getExerciseImage(selectedEx.category);
                        const color = getCategoryColor(selectedEx.category);
                        return (
                            <div className="relative w-full h-24 rounded-xl overflow-hidden mb-1" style={{ border: `1px solid ${color}30` }}>
                                <img src={imgUrl} alt={selectedEx.category} className="absolute inset-0 w-full h-full object-cover opacity-30" />
                                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${color}30, transparent 70%)` }} />
                                <div className="absolute bottom-2 left-3">
                                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{selectedEx.category}</span>
                                    <p className="text-sm font-semibold text-white">{selectedEx.name}</p>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Weights */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-zinc-400 mb-1 flex justify-between">
                                <span>Weight / Side</span>
                                <span className="text-[10px] text-zinc-600 uppercase">{logUnit}</span>
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={weightPerSide}
                                onChange={(e) => setWeightPerSide(e.target.value)}
                                disabled={isSaving}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500 transition-colors text-lg font-mono"
                                placeholder="0 or 35-40"
                                required
                            />
                            {/* Quick Adds */}
                            <div className="flex gap-1 mt-2 overflow-x-auto pb-1 scrollbar-none">
                                {[1.25, 2.5, 5, 10].map(val => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => adjustWeight(val)}
                                        className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded text-[10px] hover:bg-zinc-700 hover:text-white border border-zinc-700 whitespace-nowrap"
                                    >+{val}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-400 mb-1">Total</label>
                            <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-zinc-500 font-mono text-lg flex justify-between items-center">
                                <span>{totalWeight || '0'}</span>
                                <span className="text-xs">{logUnit}</span>
                            </div>
                        </div>
                    </div>

                    {/* Sets & Reps */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-zinc-400 mb-1">Reps</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={reps}
                                onChange={(e) => setReps(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500 transition-colors text-lg font-mono"
                                placeholder="0 or 8-12"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-400 mb-1">Sets</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={sets}
                                onChange={(e) => setSets(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500 transition-colors text-lg font-mono"
                                placeholder="0 or 3-4"
                                required
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs text-zinc-400 mb-1">Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500 transition-colors text-sm"
                            placeholder="RPE, feelings..."
                            rows={1}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={20} />}
                        {isSaving ? 'Logging...' : 'Log Set'}
                    </button>
                </div>
            </form>

            {/* Session History */}
            {routine && sessionWorkouts.length > 0 && (
                <div className="glass-card rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-zinc-900/50 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Session Log</h4>
                        <span className="text-[10px] text-zinc-500">{sessionWorkouts.length} sets</span>
                    </div>
                    <div className="divide-y divide-white/5 max-h-60 overflow-y-auto">
                        {sessionWorkouts.map((w) => (
                            <div key={w.id} className="p-3 flex justify-between items-center text-sm">
                                <div>
                                    <span className="text-white font-medium block">{w.exerciseName}</span>
                                    <span className="text-xs text-zinc-500">{w.sets} x {w.reps} @ {w.totalWeight} {w.unit}</span>
                                </div>
                                <span className="text-xs text-zinc-600">{new Date(w.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
