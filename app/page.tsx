'use client';

import React, { useEffect, useState } from 'react';
import { getWorkoutsAction } from '@/lib/actions';
import { WorkoutSet } from '@/lib/types';
import { EXERCISES } from '@/lib/exercises';
import { format } from 'date-fns';
import { TrendingUp, Dumbbell, Zap, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import ActivityChart from '@/components/ActivityChart';

export default function Home() {
    const [workouts, setWorkouts] = useState<WorkoutSet[]>([]);
    const [stats, setStats] = useState({
        totalWorkouts: 0,
        totalWeight: 0,
        recentCount: 0
    });

    useEffect(() => {
        const load = async () => {
            const data = await getWorkoutsAction();
            setWorkouts(data);

            setStats({
                totalWorkouts: data.length,
                totalWeight: data.reduce((acc, curr) => acc + curr.totalWeight, 0),
                recentCount: data.filter(w => {
                    const d = new Date(w.date);
                    const now = new Date();
                    const diff = now.getTime() - d.getTime();
                    return diff < 7 * 24 * 60 * 60 * 1000;
                }).length
            });
        }
        load();
    }, []);

    const todayStr = format(new Date(), 'MMM do, yyyy');

    return (
        <div className="space-y-5 animate-in">
            {/* Header */}
            <header className="flex justify-between items-end pb-2 border-b border-white/5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">
                        Dashboard
                    </h1>
                    <p className="text-zinc-500 text-xs font-medium">{todayStr}</p>
                </div>
                <div className="bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                    <span className="text-xs font-bold text-orange-400">PRO MODE</span>
                </div>
            </header>

            {/* Stats Overview - Compact Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-4 rounded-xl flex flex-col justify-between h-24 relative overflow-hidden group border-l-2 border-l-orange-500">
                    <div className="absolute right-2 top-2 text-zinc-800 group-hover:text-orange-900/40 transition-colors">
                        <Dumbbell size={40} />
                    </div>
                    <div>
                        <p className="text-xs text-zinc-400 font-medium">Workouts</p>
                        <span className="text-3xl font-black text-white">{stats.totalWorkouts}</span>
                    </div>
                </div>
                <div className="glass-card p-4 rounded-xl flex flex-col justify-between h-24 relative overflow-hidden group border-l-2 border-l-orange-500">
                    <div className="absolute right-2 top-2 text-zinc-800 group-hover:text-orange-900/40 transition-colors">
                        <TrendingUp size={40} />
                    </div>
                    <div>
                        <p className="text-xs text-zinc-400 font-medium">Volume (Ton)</p>
                        <span className="text-3xl font-black text-white">{(stats.totalWeight / 1000).toFixed(1)}k</span>
                    </div>
                </div>
            </div>

            {/* Quick Action - Compact Bar */}
            <Link href="/log" className="block relative rounded-xl overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 transition-all group-hover:brightness-110"></div>
                <div className="relative z-10 p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-black/20 p-2 rounded-lg text-white">
                            <Zap size={20} fill="currentColor" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white leading-tight">Start Workout</h3>
                            <p className="text-orange-100 text-[10px] opacity-80">Log your sets now</p>
                        </div>
                    </div>
                    <ChevronRight size={20} className="text-white/80" />
                </div>
            </Link>

            {/* Activity Chart - Compact */}
            <div className="glass-card p-4 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-white">Weekly Volume</h3>
                    <span className="text-[10px] text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded">Last 7 Days</span>
                </div>
                <div className="-ml-2">
                    <ActivityChart workouts={workouts} />
                </div>
            </div>

            {/* Recent Activity List - Compact */}
            <div>
                <div className="flex justify-between items-center mb-3 px-1">
                    <h3 className="text-sm font-bold text-zinc-300">Recent Logs</h3>
                    <Link href="/history" className="text-[10px] font-bold text-orange-500 hover:text-orange-400 uppercase tracking-wider">Show All</Link>
                </div>

                <div className="space-y-2">
                    {workouts.slice(-3).reverse().map(workout => (
                        <div key={workout.id} className="glass-card p-3 rounded-lg flex justify-between items-center group hover:bg-zinc-800/80 transition-colors border-l-2 border-l-transparent hover:border-l-orange-500">
                            <div className="flex items-center gap-3">
                                <div className="bg-zinc-800 p-2 rounded-md text-zinc-400 group-hover:text-orange-400 transition-colors">
                                    <Dumbbell size={16} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-zinc-200">{workout.exerciseName}</span>
                                    <span className="text-[10px] text-zinc-500">{format(new Date(workout.date), 'MMM d')}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block text-sm font-bold text-white">{workout.totalWeight}kg</span>
                                <span className="text-[10px] text-zinc-500">{workout.sets} x {workout.reps}</span>
                            </div>
                        </div>
                    ))}
                    {workouts.length === 0 && (
                        <div className="p-4 text-center text-zinc-600 text-xs border border-dashed border-zinc-800 rounded-xl">
                            No recent activity
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
