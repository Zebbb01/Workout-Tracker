'use client';

import React, { useState, useEffect } from 'react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react'; // Dumbbell icon for workout indicator
import { getWorkouts } from '@/lib/storage';
import { WorkoutSet } from '@/lib/types';

interface CalendarProps {
    selectedDate: Date | null;
    onSelectDate: (date: Date) => void;
}

export default function Calendar({ selectedDate, onSelectDate }: CalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [workoutDates, setWorkoutDates] = useState<string[]>([]);

    useEffect(() => {
        // Load workout dates to show indicators
        const workouts = getWorkouts();
        const dates = Array.from(new Set(workouts.map(w => w.date.split('T')[0])));
        setWorkoutDates(dates);
    }, [currentMonth]); // Refresh when month changes (or could be improved to refresh on focus)

    const days = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
    });

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const hasWorkout = (date: Date) => {
        return workoutDates.includes(format(date, 'yyyy-MM-dd'));
    };

    return (
        <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">
                    {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="glass-button p-2 rounded-lg text-white hover:text-orange-400">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={nextMonth} className="glass-button p-2 rounded-lg text-white hover:text-orange-400">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="text-xs text-zinc-500 font-medium">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
                {days.map((date, idx) => {
                    const isSelected = selectedDate && isSameDay(date, selectedDate);
                    const isCurrentMonth = isSameMonth(date, currentMonth);
                    const dayHasWorkout = hasWorkout(date);

                    return (
                        <button
                            key={idx}
                            onClick={() => onSelectDate(date)}
                            className={`
                relative h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
                ${!isCurrentMonth ? 'text-zinc-700 opacity-50' : 'text-zinc-300'}
                ${isSelected ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/30 scale-105' : 'hover:bg-white/5'}
                ${isToday(date) && !isSelected ? 'border border-orange-500/50 text-orange-400' : ''}
              `}
                        >
                            {format(date, 'd')}

                            {/* Workout Indicator Dot */}
                            {dayHasWorkout && (
                                <div className={`
                  absolute bottom-1 h-1 w-1 rounded-full 
                  ${isSelected ? 'bg-white' : 'bg-orange-500 box-shadow-glow'}
                `} />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
