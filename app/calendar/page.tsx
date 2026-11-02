'use client';

import React, { useState, useEffect } from 'react';
import Calendar from '@/components/Calendar';
import WorkoutCard from '@/components/WorkoutCard';
import { deleteWorkoutAction } from '@/lib/actions';
import { useWorkouts } from '@/lib/cache';
import { WorkoutSet } from '@/lib/types';
import { isSameDay, format } from 'date-fns';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function CalendarPage() {
    const { workouts, refresh, isLoading } = useWorkouts();
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [selectedDayWorkouts, setSelectedDayWorkouts] = useState<WorkoutSet[]>([]);

    useEffect(() => {
        if (selectedDate) {
            const filtered = workouts.filter(w => isSameDay(new Date(w.date), selectedDate));
            setSelectedDayWorkouts(filtered);
        }
    }, [selectedDate, workouts]);

    return (
        <div className="space-y-6 pb-24 animate-in">
            <header className="flex justify-between items-center border-b border-white/5 pb-4">
                <h1 className="text-2xl font-bold text-white tracking-tight">Calendar</h1>
            </header>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card overflow-hidden rounded-xl"
            >
                <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            </motion.div>

            <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
                        {selectedDate ? format(selectedDate, 'MMM do, yyyy') : 'Select a date'}
                    </h2>
                    {selectedDate && (
                        <Link
                            href={`/log?date=${selectedDate.toISOString()}`}
                            className="text-xs font-bold text-orange-500 hover:text-orange-400 px-3 py-1.5 rounded-lg bg-orange-600/10 border border-orange-600/20 flex items-center gap-1.5 transition-all"
                        >
                            <Plus size={14} /> Add Log
                        </Link>
                    )}
                </div>

                {selectedDayWorkouts.length > 0 ? (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-3"
                    >
                        {selectedDayWorkouts.map(workout => (
                            <WorkoutCard
                                key={workout.id}
                                workout={workout}
                                onDelete={async () => {
                                    await deleteWorkoutAction(workout.id);
                                    refresh(true);
                                }}
                            />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12 px-6 glass-card rounded-xl border-dashed border-zinc-800 text-center"
                    >
                        <div className="bg-zinc-900/50 w-12 h-12 rounded-full flex items-center justify-center mb-3 text-zinc-700">
                             <Plus size={20} className="rotate-45" />
                        </div>
                        <p className="text-zinc-500 text-sm font-medium">No activity for this day.</p>
                        <Link
                            href={`/log?date=${selectedDate?.toISOString()}`}
                            className="text-orange-500 text-[10px] font-bold uppercase mt-2 hover:underline"
                        >
                            Log a workout
                        </Link>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
