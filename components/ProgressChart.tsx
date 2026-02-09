'use client';

import React from 'react';
import { WorkoutSet } from '@/lib/types';
import { format } from 'date-fns';

interface ProgressChartProps {
    data: WorkoutSet[];
    userUnit: 'metric' | 'imperial';
}

export default function ProgressChart({ data, userUnit }: ProgressChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="glass-card p-8 rounded-xl text-center text-slate-500">
                No data available for this exercise yet.
            </div>
        );
    }

    // Sort by date
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Normalize weights to userUnit
    const normalizedData = sortedData.map(d => {
        let weight = d.totalWeight;
        const recordUnit = d.unit || 'metric';

        if (userUnit === 'metric' && recordUnit === 'imperial') {
            weight = weight * 0.453592;
        } else if (userUnit === 'imperial' && recordUnit === 'metric') {
            weight = weight * 2.20462;
        }

        return {
            ...d,
            normalizedWeight: weight,
            displayWeight: Math.round(weight * 10) / 10
        };
    });

    // Get max weight for scaling
    const maxWeight = Math.max(...normalizedData.map(d => d.normalizedWeight));
    const unitLabel = userUnit === 'metric' ? 'kg' : 'lbs';

    return (
        <div className="glass-card p-6 rounded-xl w-full overflow-x-auto">
            <div className="flex items-end justify-between h-48 gap-4 min-w-[300px]">
                {normalizedData.map((d, i) => {
                    const heightPercentage = maxWeight > 0 ? (d.normalizedWeight / maxWeight) * 100 : 0;
                    return (
                        <div key={d.id} className="flex flex-col items-center gap-2 group relative">
                            {/* Tooltip */}
                            <div className="absolute -top-10 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-slate-700 pointer-events-none">
                                {d.displayWeight}{unitLabel} ({d.reps}x{d.sets})
                            </div>

                            <div
                                className="w-8 md:w-12 bg-gradient-to-t from-orange-600 to-red-500 rounded-t-lg transition-all hover:brightness-110 relative"
                                style={{ height: `${Math.max(heightPercentage, 5)}%` }} // Min height for visibility
                            >
                            </div>

                            <div className="text-[10px] text-slate-400 rotate-0">
                                {format(new Date(d.date), 'MMM d')}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
