'use client';

import React, { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { format, subDays, isSameDay } from 'date-fns';
import { WorkoutSet } from '@/lib/types';

interface ActivityChartProps {
    workouts: WorkoutSet[];
}

export default function ActivityChart({ workouts }: ActivityChartProps) {
    const data = useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = subDays(new Date(), 6 - i);
            return {
                date: d,
                dayStr: format(d, 'EEE'), // Mon, Tue
                fullDate: format(d, 'MMM d'), // Jan 1
                volume: 0
            };
        });

        // Aggregate volume
        workouts.forEach(w => {
            const workoutDate = new Date(w.date);
            const dayStat = last7Days.find(d => isSameDay(d.date, workoutDate));
            if (dayStat) {
                dayStat.volume += w.totalWeight;
            }
        });

        return last7Days;
    }, [workouts]);

    if (workouts.length === 0) {
        return (
            <div className="glass-card p-8 rounded-xl flex items-center justify-center h-64 text-slate-500">
                <p>No activity recorded yet</p>
            </div>
        );
    }

    return (
        <div className="glass-card p-6 rounded-xl w-full h-72">
            <h3 className="text-lg font-bold text-white mb-6">Weekly Volume</h3>
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <XAxis
                            dataKey="dayStr"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                                            <p className="text-slate-400 text-xs mb-1">{payload[0].payload.fullDate}</p>
                                            <p className="text-white font-bold">{payload[0].value} kg</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.volume > 0 ? '#f97316' : '#27272a'}
                                    className="transition-all duration-300 hover:opacity-80"
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
