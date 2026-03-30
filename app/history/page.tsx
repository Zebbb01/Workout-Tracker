'use client';

import React, { useState, useEffect } from 'react';
import WorkoutCard from '@/components/WorkoutCard';
import { deleteWorkoutAction } from '@/lib/actions';
import { useWorkouts } from '@/lib/cache';
import { WorkoutSet } from '@/lib/types';
import { format } from 'date-fns';
import { Settings } from 'lucide-react';
import Link from 'next/link';

export default function HistoryPage() {
    const { workouts, refresh, isLoading } = useWorkouts();

    // Group by date
    const groupedWorkouts: { [key: string]: WorkoutSet[] } = {};
    workouts.forEach(w => {
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

    return (
        <div className="space-y-6 pb-20 animate-in">
            <header className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">History</h1>
            </header>

            {Object.keys(groupedWorkouts).length > 0 ? (
                <div className="space-y-6">
                    {Object.keys(groupedWorkouts).map(dateKey => (
                        <div key={dateKey}>
                            <h3 className="text-sm font-semibold text-zinc-400 mb-3 ml-1 sticky top-0 bg-black/95 backdrop-blur py-2 z-10 border-b border-zinc-900">
                                {format(new Date(dateKey), 'EEEE, MMMM do, yyyy')}
                            </h3>
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
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20">
                    <p className="text-slate-500">No workout history yet.</p>
                </div>
            )}
        </div>
    );
}
