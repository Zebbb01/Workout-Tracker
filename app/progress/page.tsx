'use client';

import React, { useState, useEffect } from 'react';
import ProgressChart from '@/components/ProgressChart';
import { useCachedExercises, useWorkouts, useUserProfile } from '@/lib/cache';
import Select from '@/components/ui/Select';
import { normalizeWeight } from '@/lib/units';
import { motion } from 'framer-motion';
import { Dumbbell, Plus, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function ProgressPage() {
    const { exercises } = useCachedExercises();
    const { workouts } = useWorkouts();
    const { profile } = useUserProfile();
    
    const [selectedExerciseId, setSelectedExerciseId] = useState('');
    const userUnit = profile?.useImperial ? 'imperial' : 'metric';

    useEffect(() => {
        if (exercises.length > 0 && !selectedExerciseId) {
            setSelectedExerciseId(exercises[0].id);
        }
    }, [exercises, selectedExerciseId]);

    const filteredWorkouts = workouts.filter(w => w.exerciseId === selectedExerciseId);

    // Calculate stats
    const unitLabel = userUnit === 'metric' ? 'kg' : 'lbs';

    const normalizedWeights = filteredWorkouts.map(w => normalizeWeight(w.totalWeight, w.unit || 'metric', userUnit));
    const maxWeight = normalizedWeights.length > 0 ? Math.max(...normalizedWeights) : 0;

    const projected1RMs = filteredWorkouts.map(w => {
        const weight = normalizeWeight(w.totalWeight, w.unit || 'metric', userUnit);
        return w.reps > 1 ? weight * (1 + w.reps / 30) : weight;
    });
    const max1RM = projected1RMs.length > 0 ? Math.max(...projected1RMs) : 0;

    const totalVolume = filteredWorkouts.reduce((acc, curr) => {
        return acc + (normalizeWeight(curr.totalWeight, curr.unit || 'metric', userUnit) * curr.reps * curr.sets);
    }, 0);

    if (exercises.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-in">
                <div className="bg-zinc-900/50 w-20 h-20 rounded-full flex items-center justify-center mb-6 text-zinc-700">
                    <TrendingUp size={40} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">No progress data yet</h2>
                <p className="text-zinc-500 text-sm max-w-xs mb-8">
                    Your strength progression and volume charts will appear here once you've logged some workouts.
                </p>
                <Link 
                    href="/log" 
                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-orange-600/20"
                >
                    <Plus size={20} />
                    Log First Workout
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 animate-in">
            <header className="flex justify-between items-center border-b border-white/5 pb-4">
                <h1 className="text-2xl font-bold text-white tracking-tight">Progress</h1>
            </header>

            {/* Exercise Selector */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 rounded-xl"
            >
                <Select
                    label="Exercise Category"
                    options={exercises.map(ex => ({ id: ex.id, label: ex.name }))}
                    value={selectedExerciseId}
                    onChange={setSelectedExerciseId}
                    placeholder="Select Exercise"
                />
            </motion.div>

            {/* Chart Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="flex justify-between items-end mb-3 px-1">
                    <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Weight Progression</h2>
                    {filteredWorkouts.length > 0 && (
                        <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest animate-pulse flex items-center gap-1">
                            <TrendingUp size={10} /> 1RM Tracking Active
                        </span>
                    )}
                </div>
                <ProgressChart data={filteredWorkouts} userUnit={userUnit} />
            </motion.div>

            {/* Stats for this exercise */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-3 gap-3"
            >
                <div className="glass-card p-3 rounded-xl border-l-2 border-l-zinc-700">
                    <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">Max Weight</p>
                    <p className="text-lg font-black text-white">{maxWeight > 0 ? `${maxWeight.toFixed(1)}${unitLabel}` : '-'}</p>
                </div>
                <div className="glass-card p-3 rounded-xl border-l-2 border-l-orange-500">
                    <p className="text-[10px] text-orange-500 uppercase font-black mb-1">Proj. 1RM</p>
                    <p className="text-lg font-black text-white">{max1RM > 0 ? `${max1RM.toFixed(1)}${unitLabel}` : '-'}</p>
                </div>
                <div className="glass-card p-3 rounded-xl border-l-2 border-l-zinc-700">
                    <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">Total Vol</p>
                    <div className="flex items-baseline gap-1">
                        <p className="text-lg font-black text-white">{totalVolume > 0 ? (totalVolume / 1000).toFixed(1) : '-'}</p>
                        <span className="text-[8px] text-zinc-600 font-black uppercase">{unitLabel}</span>
                    </div>
                </div>
            </motion.div>

            {/* Strength Tip */}
            {filteredWorkouts.length > 0 && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-zinc-900/50 border border-zinc-700/30 p-3 rounded-lg"
                >
                    <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                        <span className="text-orange-500 font-bold uppercase mr-1">Pro Tip:</span> 
                        1RM is estimated using the Epley formula. For highest accuracy, project from sets of 10 reps or less.
                    </p>
                </motion.div>
            )}

            {/* Recent History Table */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card rounded-xl overflow-hidden"
            >
                <div className="bg-zinc-800/20 px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Recent Logs</h3>
                    <Link href="/history" className="text-[10px] text-orange-500 font-bold uppercase hover:underline underline-offset-4">View All</Link>
                </div>
                <div className="divide-y divide-white/5 bg-zinc-900/10">
                    {filteredWorkouts.slice(-5).reverse().map(w => {
                        const displayWeight = normalizeWeight(w.totalWeight, w.unit || 'metric', userUnit).toFixed(1);
                        return (
                            <div key={w.id} className="p-4 flex justify-between items-center hover:bg-white/5 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="bg-zinc-800 p-2 rounded-lg text-zinc-500 group-hover:text-orange-500 transition-colors">
                                        <Dumbbell size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-zinc-300">{new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                        <p className="text-xs text-zinc-500 font-medium">{w.sets} sets × {w.reps} reps</p>
                                    </div>
                                </div>
                                <span className="text-white font-black">{displayWeight}<span className="text-xs font-medium text-zinc-500 ml-0.5">{unitLabel}</span></span>
                            </div>
                        );
                    })}
                    {filteredWorkouts.length === 0 && (
                        <div className="p-12 text-center">
                            <div className="text-zinc-700 mb-2">
                                <Dumbbell size={24} className="mx-auto opacity-20" />
                            </div>
                            <p className="text-zinc-600 text-xs font-medium">No history for this exercise.</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
