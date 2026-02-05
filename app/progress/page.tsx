'use client';

import React, { useState, useEffect } from 'react';
import ProgressChart from '@/components/ProgressChart';
import { getWorkoutsAction } from '@/lib/actions';
import { useExercises } from '@/lib/useExercises';
import { WorkoutSet } from '@/lib/types';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import Select from '@/components/ui/Select';

export default function ProgressPage() {
    const { exercises } = useExercises();
    const [selectedExerciseId, setSelectedExerciseId] = useState('');
    const [workouts, setWorkouts] = useState<WorkoutSet[]>([]);

    useEffect(() => {
        if (exercises.length > 0 && !selectedExerciseId) {
            setSelectedExerciseId(exercises[0].id);
        }
    }, [exercises]);

    useEffect(() => {
        const load = async () => {
            const allWorkouts = await getWorkoutsAction();
            setWorkouts(allWorkouts);
        }
        load();
    }, []);

    const filteredWorkouts = workouts.filter(w => w.exerciseId === selectedExerciseId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const currentExercise = exercises.find(e => e.id === selectedExerciseId);

    // Calculate stats
    const maxWeight = filteredWorkouts.length > 0
        ? Math.max(...filteredWorkouts.map(w => w.totalWeight))
        : 0;

    const totalVolume = filteredWorkouts.reduce((acc, curr) => acc + (curr.totalWeight * curr.reps * curr.sets), 0);

    return (
        <div className="space-y-6 pb-20 animate-in">
            <header className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Progress</h1>
                <Link href="/settings" className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full border border-zinc-700 transition-colors text-zinc-400 hover:text-white">
                    <Settings size={20} />
                </Link>
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
                <ProgressChart data={filteredWorkouts} />
            </div>

            {/* Stats for this exercise */}
            <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-4 rounded-xl">
                    <p className="text-xs text-slate-400">Personal Best</p>
                    <p className="text-xl font-bold text-white">{maxWeight > 0 ? `${maxWeight}kg` : '-'}</p>
                </div>
                <div className="glass-card p-4 rounded-xl">
                    <p className="text-xs text-slate-400">Total Volume</p>
                    <p className="text-xl font-bold text-white">{(totalVolume / 1000).toFixed(1)}k kg</p>
                </div>
            </div>

            {/* Recent History Table */}
            <div className="glass-card rounded-xl overflow-hidden">
                <div className="bg-slate-800/50 px-4 py-3 border-b border-white/5">
                    <h3 className="text-sm font-semibold text-white">History Log</h3>
                </div>
                <div className="divide-y divide-white/5">
                    {filteredWorkouts.slice(-5).reverse().map(w => (
                        <div key={w.id} className="p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                            <div>
                                <p className="text-sm font-medium text-slate-200">{new Date(w.date).toLocaleDateString()}</p>
                                <p className="text-xs text-slate-500">{w.sets} sets × {w.reps} reps</p>
                            </div>
                            <span className="text-orange-400 font-bold">{w.totalWeight}kg</span>
                        </div>
                    ))}
                    {filteredWorkouts.length === 0 && (
                        <div className="p-6 text-center text-slate-500 text-sm">No data available</div>
                    )}
                </div>
            </div>
        </div>
    );
}
