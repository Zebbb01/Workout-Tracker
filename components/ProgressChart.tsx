'use client';

import React from 'react';
import { WorkoutSet } from '@/lib/types';
import { format } from 'date-fns';

interface ProgressChartProps {
    data: WorkoutSet[];
}

export default function ProgressChart({ data }: ProgressChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="glass-card p-8 rounded-xl text-center text-slate-500">
                No data available for this exercise yet.
            </div>
        );
    }

    // Sort by date
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Get max weight for scaling
    const maxWeight = Math.max(...sortedData.map(d => d.totalWeight));

    return (
        <div className="glass-card p-6 rounded-xl w-full overflow-x-auto">
            <div className="flex items-end justify-between h-48 gap-4 min-w-[300px]">
                {sortedData.map((d, i) => {
                    const heightPercentage = (d.totalWeight / maxWeight) * 100;
                    return (
                        <div key={d.id} className="flex flex-col items-center gap-2 group relative">
                            {/* Tooltip */}
                            <div className="absolute -top-10 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                {d.totalWeight}kg ({d.reps}x{d.sets})
                            </div>

                            <div
                                className="w-8 md:w-12 bg-gradient-to-t from-orange-600 to-red-500 rounded-t-lg transition-all hover:brightness-110"
                                style={{ height: `${heightPercentage}%` }}
                            ></div>

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
