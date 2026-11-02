'use client';

import React from 'react';
import WorkoutCard from '@/components/WorkoutCard';
import { deleteWorkoutAction } from '@/lib/actions';
import { useWorkouts } from '@/lib/cache';
import { WorkoutSet } from '@/lib/types';
import { format, isToday, isYesterday } from 'date-fns';
import { motion } from 'framer-motion';
import { Dumbbell, Plus } from 'lucide-react';
import Link from 'next/link';

export default function HistoryPage() {
    const { workouts, refresh } = useWorkouts();

    // Group by date - sort by date descending
    const sortedWorkouts = [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const groupedWorkouts: { [key: string]: WorkoutSet[] } = {};
    sortedWorkouts.forEach(w => {
        const dateKey = format(new Date(w.date), 'yyyy-MM-dd');
        if (!groupedWorkouts[dateKey]) groupedWorkouts[dateKey] = [];
        groupedWorkouts[dateKey].push(w);
    });

    // Calculate PRs per exercise
    const prMap: { [key: string]: number } = {};
    workouts.forEach(w => {
        if (!prMap[w.exerciseId] || w.totalWeight > prMap[w.exerciseId]) {
            prMap[w.exerciseId] = w.totalWeight;
        }
    });

    const formatDateHeader = (dateStr: string) => {
        const date = new Date(dateStr);
        if (isToday(date)) return 'Today';
        if (isYesterday(date)) return 'Yesterday';
        return format(date, 'EEEE, MMMM do');
    };

    return (
        <div className="space-y-6 pb-24 animate-in">
            <header className="flex justify-between items-center border-b border-white/5 pb-4">
                <h1 className="text-2xl font-bold text-white tracking-tight">History</h1>
            </header>

            {Object.keys(groupedWorkouts).length > 0 ? (
                <div className="space-y-8">
                    {Object.keys(groupedWorkouts).map((dateKey, idx) => (
                        <motion.div 
                            key={dateKey}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                        >
                            <div className="flex items-center gap-2 mb-3 px-1 sticky top-0 bg-black/95 backdrop-blur py-2 z-10">
                                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
                                    {formatDateHeader(dateKey)}
                                </h3>
                                <div className="h-px bg-zinc-800 flex-1 ml-2" />
                            </div>
                            <div className="space-y-3">
                                {groupedWorkouts[dateKey].map(workout => (
                                    <WorkoutCard
                                        key={workout.id}
                                        workout={workout}
                                        isPR={workout.totalWeight === prMap[workout.exerciseId]}
                                        onDelete={async () => {
                                            await deleteWorkoutAction(workout.id);
                                            refresh(true);
                                        }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 px-6 glass-card rounded-xl border-dashed border-zinc-800 text-center">
                    <div className="bg-zinc-900/50 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-zinc-700">
                        <Dumbbell size={32} />
                    </div>
                    <h3 className="text-white font-bold mb-2">No workout history</h3>
                    <p className="text-zinc-500 text-sm max-w-xs mb-6">
                        You haven't logged any workouts yet. Your full training history will appear here.
                    </p>
                    <Link 
                        href="/log" 
                        className="bg-orange-600/10 hover:bg-orange-600 text-orange-500 hover:text-white font-bold py-2.5 px-6 rounded-lg border border-orange-600/30 transition-all flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Log Your First Set
                    </Link>
                </div>
            )}
        </div>
    );
}
