'use client';

import React, { useState, useEffect } from 'react';
import Calendar from '@/components/Calendar';
import WorkoutCard from '@/components/WorkoutCard';
import { getWorkoutsAction, deleteWorkoutAction } from '@/lib/actions';
import { WorkoutSet } from '@/lib/types';
import { isSameDay, format } from 'date-fns';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function CalendarPage() {
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [workouts, setWorkouts] = useState<WorkoutSet[]>([]);
    const [selectedDayWorkouts, setSelectedDayWorkouts] = useState<WorkoutSet[]>([]);

    const loadWorkouts = async () => {
        const data = await getWorkoutsAction();
        setWorkouts(data);
    };

    useEffect(() => {
        loadWorkouts();
    }, []);

    useEffect(() => {
        if (selectedDate) {
            const filtered = workouts.filter(w => isSameDay(new Date(w.date), selectedDate));
            setSelectedDayWorkouts(filtered);
        }
    }, [selectedDate, workouts]);

    return (
        <div className="space-y-6 pb-20 animate-in">
            <header>
                <h1 className="text-2xl font-bold text-white">Calendar</h1>
            </header>

            <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-slate-200">
                        {selectedDate ? format(selectedDate, 'MMM do') : 'Select a date'}
                    </h2>
                    {selectedDate && (
                        <Link
                            href={`/log?date=${selectedDate.toISOString()}`}
                            className="text-sm bg-orange-600/20 text-orange-400 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-orange-600/30 transition-colors"
                        >
                            <Plus size={14} /> Add Log
                        </Link>
                    )}
                </div>

                {selectedDayWorkouts.length > 0 ? (
                    <div className="space-y-3">
                        {selectedDayWorkouts.map(workout => (
                            <WorkoutCard
                                key={workout.id}
                                workout={workout}
                                onDelete={async () => {
                                    await deleteWorkoutAction(workout.id);
                                    loadWorkouts();
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500 glass-card rounded-xl border border-dashed border-slate-700">
                        <p>No workouts logged for this day.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
