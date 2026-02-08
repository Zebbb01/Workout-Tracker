'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';
import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import WorkoutForm from '@/components/WorkoutForm';
import RestTimer from '@/components/RestTimer';

function LogContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dateParam = searchParams.get('date');
    const routineId = searchParams.get('routine');

    const selectedDate = dateParam ? new Date(dateParam) : new Date();

    return (
        <div className="space-y-6 animate-in">
            <header className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-white">Log Workout</h1>
                    <p className="text-slate-400 text-sm">Track your sets and reps</p>
                </div>
                <Link href="/settings" className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full border border-zinc-700 transition-colors text-zinc-400 hover:text-white">
                    <Settings size={20} />
                </Link>
            </header>

            <WorkoutForm
                selectedDate={selectedDate}
                routineId={routineId || undefined}
                onSuccess={() => router.push('/calendar')}
            />

            <div className="pt-2">
                <RestTimer />
            </div>
        </div>
    );
}

export default function LogPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LogContent />
        </Suspense>
    );
}
