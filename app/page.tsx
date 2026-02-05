'use client';

import React, { useEffect, useState } from 'react';
import { getWorkoutsAction, getUserTDEEProfileAction, getWeightEntriesAction } from '@/lib/actions';
import { WorkoutSet } from '@/lib/types';
import { format, differenceInDays, startOfDay, subDays } from 'date-fns';
import {
    TrendingUp, Dumbbell, Zap, ChevronRight, Settings as SettingsIcon,
    Flame, Target, Utensils, Scale, Activity, TrendingDown, Award, CalendarDays
} from 'lucide-react';
import Link from 'next/link';
import ActivityChart from '@/components/ActivityChart';
import { motion } from 'framer-motion';

interface TDEEProfile {
    tdee: number | null;
    bmr: number | null;
    targetCalories: number | null;
    goal: string | null;
    proteinTarget: number | null;
    weightKg: number | null;
    activityLevel: string | null;
}

interface WeightEntry {
    weightKg: number;
    date: string;
}

export default function Home() {
    const [workouts, setWorkouts] = useState<WorkoutSet[]>([]);
    const [tdeeProfile, setTdeeProfile] = useState<TDEEProfile | null>(null);
    const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
    const [stats, setStats] = useState({
        totalWorkouts: 0,
        totalWeight: 0,
        thisWeekCount: 0,
        streak: 0
    });

    useEffect(() => {
        const load = async () => {
            try {
                // Load workouts
                const data = await getWorkoutsAction();
                setWorkouts(data);

                // Calculate streak
                const sortedWorkouts = [...data].sort((a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                let streak = 0;
                let currentDate = startOfDay(new Date());
                const workoutDates = new Set(
                    sortedWorkouts.map(w => startOfDay(new Date(w.date)).toISOString())
                );

                // Check if worked out today or yesterday to start streak
                const today = startOfDay(new Date()).toISOString();
                const yesterday = startOfDay(subDays(new Date(), 1)).toISOString();

                if (workoutDates.has(today) || workoutDates.has(yesterday)) {
                    for (let i = 0; i < 365; i++) {
                        const checkDate = startOfDay(subDays(new Date(), i)).toISOString();
                        if (workoutDates.has(checkDate)) {
                            streak++;
                        } else if (i > 0) {
                            break;
                        }
                    }
                }

                setStats({
                    totalWorkouts: data.length,
                    totalWeight: data.reduce((acc, curr) => acc + curr.totalWeight, 0),
                    thisWeekCount: data.filter(w => {
                        const d = new Date(w.date);
                        const now = new Date();
                        const diff = now.getTime() - d.getTime();
                        return diff < 7 * 24 * 60 * 60 * 1000;
                    }).length,
                    streak
                });

                // Load TDEE profile
                const profile = await getUserTDEEProfileAction();
                if (profile) {
                    setTdeeProfile(profile);
                }

                // Load weight entries
                const weights = await getWeightEntriesAction(7);
                setWeightEntries(weights as WeightEntry[]);
            } catch (e) {
                console.error('Failed to load dashboard data', e);
            }
        };
        load();
    }, []);

    const todayStr = format(new Date(), 'MMM do, yyyy');

    // Calculate weight change
    const weightChange = weightEntries.length >= 2
        ? weightEntries[0].weightKg - weightEntries[weightEntries.length - 1].weightKg
        : null;

    const goalLabel = tdeeProfile?.goal === 'cutting' ? 'Cutting'
        : tdeeProfile?.goal === 'bulking' ? 'Bulking'
            : 'Maintaining';

    const goalColor = tdeeProfile?.goal === 'cutting' ? 'emerald'
        : tdeeProfile?.goal === 'bulking' ? 'amber'
            : 'blue';

    return (
        <div className="space-y-5 animate-in pb-24">
            {/* Header */}
            <header className="flex justify-between items-end pb-2 border-b border-white/5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">
                        Dashboard
                    </h1>
                    <p className="text-zinc-500 text-xs font-medium">{todayStr}</p>
                </div>
                <Link href="/settings" className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full border border-zinc-700 transition-colors text-zinc-400 hover:text-white">
                    <SettingsIcon size={20} />
                </Link>
            </header>

            {/* TDEE/Calories Card - Only show if profile exists */}
            {tdeeProfile?.tdee && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-4 rounded-xl border-l-2 border-l-orange-500"
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                            <div className="bg-orange-600/20 p-2 rounded-lg">
                                <Flame size={18} className="text-orange-500" />
                            </div>
                            <div>
                                <h3 className="text-xs text-zinc-500 font-medium">Daily Target</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${goalColor === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                                        goalColor === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                                            'bg-blue-500/20 text-blue-400'
                                    }`}>
                                    {goalLabel}
                                </span>
                            </div>
                        </div>
                        <Link href="/tdee" className="text-[10px] text-orange-500 hover:text-orange-400 uppercase font-bold">
                            Edit
                        </Link>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                            <p className="text-2xl font-black text-white">{tdeeProfile.targetCalories?.toLocaleString()}</p>
                            <p className="text-[10px] text-zinc-500">Calories</p>
                        </div>
                        <div className="text-center border-x border-zinc-800">
                            <p className="text-2xl font-black text-red-400">{tdeeProfile.proteinTarget}g</p>
                            <p className="text-[10px] text-zinc-500">Protein</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-black text-orange-400">{tdeeProfile.tdee?.toLocaleString()}</p>
                            <p className="text-[10px] text-zinc-500">TDEE</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Stats Overview - Enhanced Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-4 rounded-xl flex flex-col justify-between h-24 relative overflow-hidden group border-l-2 border-l-orange-500">
                    <div className="absolute right-2 top-2 text-zinc-800 group-hover:text-orange-900/40 transition-colors">
                        <Dumbbell size={40} />
                    </div>
                    <div>
                        <p className="text-xs text-zinc-400 font-medium">Total Sets</p>
                        <span className="text-3xl font-black text-white">{stats.totalWorkouts}</span>
                    </div>
                </div>
                <div className="glass-card p-4 rounded-xl flex flex-col justify-between h-24 relative overflow-hidden group border-l-2 border-l-orange-500">
                    <div className="absolute right-2 top-2 text-zinc-800 group-hover:text-orange-900/40 transition-colors">
                        <TrendingUp size={40} />
                    </div>
                    <div>
                        <p className="text-xs text-zinc-400 font-medium">Volume (kg)</p>
                        <span className="text-3xl font-black text-white">{(stats.totalWeight / 1000).toFixed(1)}k</span>
                    </div>
                </div>
            </div>

            {/* Streak & Weekly Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-4 rounded-xl flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${stats.streak > 0 ? 'bg-amber-500/20' : 'bg-zinc-800'}`}>
                        <Award size={24} className={stats.streak > 0 ? 'text-amber-400' : 'text-zinc-600'} />
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500">Current Streak</p>
                        <p className="text-2xl font-black text-white">{stats.streak} <span className="text-sm font-normal text-zinc-500">days</span></p>
                    </div>
                </div>
                <div className="glass-card p-4 rounded-xl flex items-center gap-3">
                    <div className="bg-blue-500/20 p-3 rounded-lg">
                        <CalendarDays size={24} className="text-blue-400" />
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500">This Week</p>
                        <p className="text-2xl font-black text-white">{stats.thisWeekCount} <span className="text-sm font-normal text-zinc-500">sets</span></p>
                    </div>
                </div>
            </div>

            {/* Weight Progress - Only show if entries exist */}
            {weightEntries.length > 0 && (
                <div className="glass-card p-4 rounded-xl">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                            <Scale size={16} className="text-zinc-500" />
                            <h3 className="text-sm font-bold text-white">Weight Tracking</h3>
                        </div>
                        <Link href="/tdee" className="text-[10px] text-orange-500 hover:text-orange-400 uppercase font-bold">
                            Log Weight
                        </Link>
                    </div>
                    <div className="flex items-end gap-4">
                        <div>
                            <p className="text-3xl font-black text-white">{weightEntries[0].weightKg.toFixed(1)} <span className="text-sm font-normal text-zinc-500">kg</span></p>
                            <p className="text-[10px] text-zinc-500">{format(new Date(weightEntries[0].date), 'MMM d')}</p>
                        </div>
                        {weightChange !== null && (
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${weightChange < 0
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : weightChange > 0
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : 'bg-zinc-800 text-zinc-400'
                                }`}>
                                {weightChange < 0 ? <TrendingDown size={12} /> : weightChange > 0 ? <TrendingUp size={12} /> : null}
                                {weightChange !== 0 ? `${Math.abs(weightChange).toFixed(1)} kg` : 'No change'}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Quick Action - Start Workout */}
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

            {/* CTA for TDEE if not set up */}
            {!tdeeProfile?.tdee && (
                <Link href="/tdee" className="block glass-card p-4 rounded-xl border border-dashed border-orange-500/30 hover:border-orange-500/50 transition-colors group">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-600/20 p-2 rounded-lg text-orange-500 group-hover:bg-orange-600/30 transition-colors">
                            <Flame size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-white">Calculate Your TDEE</h3>
                            <p className="text-zinc-500 text-[10px]">Find out how many calories you burn daily</p>
                        </div>
                        <ChevronRight size={18} className="text-zinc-600 group-hover:text-orange-500 transition-colors" />
                    </div>
                </Link>
            )}

            {/* Activity Chart */}
            <div className="glass-card p-4 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-white">Weekly Volume</h3>
                    <span className="text-[10px] text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded">Last 7 Days</span>
                </div>
                <div className="-ml-2">
                    <ActivityChart workouts={workouts} />
                </div>
            </div>

            {/* Quick Tips based on Goal */}
            {tdeeProfile?.goal && (
                <div className="glass-card p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                        <Target size={14} className="text-zinc-500" />
                        <h3 className="text-sm font-bold text-white">Today's Focus</h3>
                    </div>
                    <div className="space-y-2">
                        {tdeeProfile.goal === 'cutting' && (
                            <>
                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    <span>Prioritize protein to preserve muscle</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    <span>Keep training intensity high, reduce volume slightly</span>
                                </div>
                            </>
                        )}
                        {tdeeProfile.goal === 'bulking' && (
                            <>
                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                    <span>Hit your {tdeeProfile.targetCalories?.toLocaleString()} cal target today</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                    <span>Focus on progressive overload in compound lifts</span>
                                </div>
                            </>
                        )}
                        {tdeeProfile.goal === 'maintenance' && (
                            <>
                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                    <span>Aim for {tdeeProfile.proteinTarget}g protein for recovery</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                    <span>Track strength progress, not just weight</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Recent Activity List */}
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
