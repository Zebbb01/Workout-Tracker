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

    // Normalize weights to userUnit and calculate 1RM
    const normalizedData = sortedData.map(d => {
        let weight = d.totalWeight;
        const recordUnit = d.unit || 'metric';

        if (userUnit === 'metric' && recordUnit === 'imperial') {
            weight = weight * 0.453592;
        } else if (userUnit === 'imperial' && recordUnit === 'metric') {
            weight = weight * 2.20462;
        }

        // Epley formula: 1RM = weight * (1 + reps/30)
        const est1RM = d.reps > 1 ? weight * (1 + d.reps / 30) : weight;

        return {
            ...d,
            normalizedWeight: weight,
            displayWeight: Math.round(weight * 10) / 10,
            est1RM: est1RM,
            display1RM: Math.round(est1RM * 10) / 10
        };
    });

    // Get max 1RM for scaling to ensure everything fits
    const max1RM = Math.max(...normalizedData.map(d => d.est1RM));
    const unitLabel = userUnit === 'metric' ? 'kg' : 'lbs';

    return (
        <div className="glass-card p-6 rounded-xl w-full overflow-x-auto">
            <div className="flex items-end justify-between h-48 gap-4 min-w-[300px]">
                {normalizedData.map((d, i) => {
                    const weightHeight = max1RM > 0 ? (d.normalizedWeight / max1RM) * 100 : 0;
                    const oneRmHeight = max1RM > 0 ? (d.est1RM / max1RM) * 100 : 0;
                    
                    return (
                        <div key={d.id} className="flex flex-col items-center gap-2 group relative">
                            {/* Tooltip */}
                            <div className="absolute -top-12 bg-slate-900 border border-slate-700 text-white text-[10px] px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30 pointer-events-none shadow-xl">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-zinc-500 font-bold uppercase tracking-widest text-[8px]">Session</span>
                                    <span className="font-bold">{d.displayWeight}{unitLabel} ({d.reps}x{d.sets})</span>
                                    <div className="h-px bg-zinc-800 my-0.5" />
                                    <span className="text-orange-500 font-bold uppercase tracking-widest text-[8px]">Est. 1RM</span>
                                    <span className="font-bold text-orange-400">{d.display1RM}{unitLabel}</span>
                                </div>
                            </div>

                            <div className="relative w-8 md:w-12 h-full flex flex-col justify-end items-center">
                                {/* 1RM Cap Indicator */}
                                <div 
                                    className="absolute w-full border-t-2 border-orange-500/50 border-dashed z-10"
                                    style={{ bottom: `${oneRmHeight}%` }}
                                />
                                
                                <div
                                    className="w-full bg-gradient-to-t from-orange-600 to-red-500 rounded-t-lg transition-all hover:brightness-110 relative"
                                    style={{ height: `${Math.max(weightHeight, 5)}%` }} // Min height for visibility
                                >
                                </div>
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
