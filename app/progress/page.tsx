'use client';

import React, { useState, useEffect } from 'react';
import ProgressChart from '@/components/ProgressChart';
import { getWorkoutsAction, getUserProfileAction } from '@/lib/actions';
import { useExercises } from '@/lib/useExercises';
import { WorkoutSet } from '@/lib/types';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import Select from '@/components/ui/Select';

export default function ProgressPage() {
    const { exercises } = useExercises();
    const [selectedExerciseId, setSelectedExerciseId] = useState('');
    const [workouts, setWorkouts] = useState<WorkoutSet[]>([]);
    const [userUnit, setUserUnit] = useState<'metric' | 'imperial'>('metric');

    useEffect(() => {
        if (exercises.length > 0 && !selectedExerciseId) {
            setSelectedExerciseId(exercises[0].id);
        }
    }, [exercises]);

    useEffect(() => {
        const load = async () => {
            const [allWorkouts, profile] = await Promise.all([
                getWorkoutsAction(),
                getUserProfileAction()
            ]);
            setWorkouts(allWorkouts);
            setUserUnit(profile?.useImperial ? 'imperial' : 'metric');
        }
        load();
    }, []);

    const filteredWorkouts = workouts.filter(w => w.exerciseId === selectedExerciseId);

    // Normalization Helper
    const normalize = (val: number, unit: string | undefined): number => {
        const currentUnit = unit || 'metric';
        if (userUnit === 'metric' && currentUnit === 'imperial') return val * 0.453592;
        if (userUnit === 'imperial' && currentUnit === 'metric') return val * 2.20462;
        return val;
    };

    // Calculate stats
    const unitLabel = userUnit === 'metric' ? 'kg' : 'lbs';

    const normalizedWeights = filteredWorkouts.map(w => normalize(w.totalWeight, w.unit));
    const maxWeight = normalizedWeights.length > 0 ? Math.max(...normalizedWeights) : 0;

    const totalVolume = filteredWorkouts.reduce((acc, curr) => {
        return acc + (normalize(curr.totalWeight, curr.unit) * curr.reps * curr.sets);
    }, 0);

    return (
        <div className="space-y-6 pb-20 animate-in">
            <header className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Progress</h1>
            </header>

            {/* Exercise Selector */}
            <div className="glass-card p-4 rounded-xl">
                <Select
                    label="Select Exercise"
                    options={exercises.map(ex => ({ id: ex.id, label: ex.name }))}
                    value={selectedExerciseId}
                    onChange={setSelectedExerciseId}
                    placeholder="Select Exercise"
                />
            </div>

            {/* Chart */}
            <div>
                <div className="flex justify-between items-end mb-2">
                    <h2 className="text-lg font-semibold text-slate-200">Weight Progression</h2>
                    <span className="text-xs text-slate-400">Past Activity</span>
                </div>
                <ProgressChart data={filteredWorkouts} userUnit={userUnit} />
            </div>

            {/* Stats for this exercise */}
            <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-4 rounded-xl">
                    <p className="text-xs text-slate-400">Personal Best</p>
                    <p className="text-xl font-bold text-white">{maxWeight > 0 ? `${maxWeight.toFixed(1)}${unitLabel}` : '-'}</p>
                </div>
                <div className="glass-card p-4 rounded-xl">
                    <p className="text-xs text-slate-400">Total Volume</p>
                    <p className="text-xl font-bold text-white">{(totalVolume / 1000).toFixed(1)}k {unitLabel}</p>
                </div>
            </div>

            {/* Recent History Table */}
            <div className="glass-card rounded-xl overflow-hidden">
                <div className="bg-slate-800/50 px-4 py-3 border-b border-white/5">
                    <h3 className="text-sm font-semibold text-white">History Log</h3>
                </div>
                <div className="divide-y divide-white/5">
                    {filteredWorkouts.slice(-5).reverse().map(w => {
                        const displayWeight = normalize(w.totalWeight, w.unit).toFixed(1);
                        return (
                            <div key={w.id} className="p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                                <div>
                                    <p className="text-sm font-medium text-slate-200">{new Date(w.date).toLocaleDateString()}</p>
                                    <p className="text-xs text-slate-500">{w.sets} sets × {w.reps} reps</p>
                                </div>
                                <span className="text-orange-400 font-bold">{displayWeight}{unitLabel}</span>
                            </div>
                        );
                    })}
                    {filteredWorkouts.length === 0 && (
                        <div className="p-6 text-center text-slate-500 text-sm">No data available</div>
                    )}
                </div>
            </div>
        </div>
    );
}
