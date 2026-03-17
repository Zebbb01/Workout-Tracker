'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Square, Play, Zap, Moon, Droplet, ChevronDown, ChevronUp } from 'lucide-react';
import {
    startFastingAction,
    stopFastingAction,
    getActiveFastingAction,
} from '@/lib/actions';

interface FastingSession {
    id: string;
    startedAt: string;
    targetHours: number;
}

const FASTING_STAGES = [
    { hours: 0,  label: 'Fed State',       desc: 'Body using glucose', color: '#f97316', icon: '🍽️' },
    { hours: 4,  label: 'Early Fast',      desc: 'Glucose declining',   color: '#eab308', icon: '⏱️' },
    { hours: 8,  label: 'Fasting',         desc: 'Fat burning begins',  color: '#22c55e', icon: '🔥' },
    { hours: 12, label: 'Ketosis Start',   desc: 'Ketones rising',      color: '#06b6d4', icon: '⚡' },
    { hours: 16, label: 'Deep Ketosis',    desc: 'Peak fat burning',    color: '#8b5cf6', icon: '💫' },
    { hours: 18, label: 'Autophagy',       desc: 'Cell cleanup active', color: '#ec4899', icon: '🧬' },
    { hours: 24, label: 'Deep Autophagy',  desc: 'Maximum benefits',    color: '#ef4444', icon: '🌟' },
];

function getStage(elapsedHours: number) {
    let stage = FASTING_STAGES[0];
    for (const s of FASTING_STAGES) {
        if (elapsedHours >= s.hours) stage = s;
        else break;
    }
    return stage;
}

function formatDuration(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const TARGET_OPTIONS = [12, 14, 16, 18, 20, 24];

export default function FastingWidget() {
    const [session, setSession] = useState<FastingSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [elapsed, setElapsed] = useState(0); // ms
    const [targetHours, setTargetHours] = useState(16);
    const [expanded, setExpanded] = useState(false);
    const [acting, setActing] = useState(false);

    useEffect(() => {
        loadSession();
    }, []);

    useEffect(() => {
        if (!session) return;
        const interval = setInterval(() => {
            setElapsed(Date.now() - new Date(session.startedAt).getTime());
        }, 1000);
        setElapsed(Date.now() - new Date(session.startedAt).getTime());
        return () => clearInterval(interval);
    }, [session]);

    const loadSession = async () => {
        setLoading(true);
        try {
            const active = await getActiveFastingAction();
            if (active) {
                setSession(active);
                setTargetHours(active.targetHours);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStart = async () => {
        setActing(true);
        try {
            const s = await startFastingAction(targetHours);
            setSession({ id: s.id, startedAt: s.startedAt.toString(), targetHours: s.targetHours });
            setElapsed(0);
        } finally {
            setActing(false);
        }
    };

    const handleStop = async () => {
        if (!session) return;
        setActing(true);
        try {
            await stopFastingAction(session.id);
            setSession(null);
            setElapsed(0);
        } finally {
            setActing(false);
        }
    };

    if (loading) return null;

    const elapsedHours = elapsed / 3600000;
    const progress = Math.min(elapsedHours / (session?.targetHours ?? targetHours), 1);
    const stage = getStage(elapsedHours);

    // Half-pie arc calculation
    const SIZE = 160;
    const STROKE = 10;
    const R = (SIZE - STROKE) / 2;
    const FULL_ARC = Math.PI * R; // half circumference
    const arcDash = FULL_ARC;
    const arcOffset = FULL_ARC * (1 - progress);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 mb-6"
        >
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center justify-between"
            >
                <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-semibold text-white">Fasting Tracker</span>
                    {session && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Active
                        </span>
                    )}
                </div>
                {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-4 flex flex-col items-center">
                            {/* Arc Progress */}
                            <div className="relative" style={{ width: SIZE, height: SIZE / 2 + 16 }}>
                                <svg
                                    width={SIZE}
                                    height={SIZE / 2 + 16}
                                    viewBox={`0 0 ${SIZE} ${SIZE / 2 + 16}`}
                                >
                                    {/* Track */}
                                    <path
                                        d={`M ${STROKE / 2} ${SIZE / 2} A ${R} ${R} 0 0 1 ${SIZE - STROKE / 2} ${SIZE / 2}`}
                                        fill="none"
                                        stroke="rgba(255,255,255,0.06)"
                                        strokeWidth={STROKE}
                                        strokeLinecap="round"
                                    />
                                    {/* Progress */}
                                    <path
                                        d={`M ${STROKE / 2} ${SIZE / 2} A ${R} ${R} 0 0 1 ${SIZE - STROKE / 2} ${SIZE / 2}`}
                                        fill="none"
                                        stroke={stage.color}
                                        strokeWidth={STROKE}
                                        strokeLinecap="round"
                                        strokeDasharray={arcDash}
                                        strokeDashoffset={arcOffset}
                                        style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 1s ease' }}
                                    />
                                </svg>

                                {/* Center text */}
                                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
                                    <span className="text-2xl font-bold font-mono text-white" style={{ color: session ? stage.color : undefined }}>
                                        {session ? formatDuration(elapsed) : '00:00:00'}
                                    </span>
                                    <span className="text-xs text-zinc-500 mt-0.5">
                                        {session ? `of ${session.targetHours}h target` : 'Not fasting'}
                                    </span>
                                </div>
                            </div>

                            {/* Stage badge */}
                            <div className="flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full border"
                                style={{ borderColor: stage.color + '40', background: stage.color + '15' }}>
                                <span className="text-sm">{stage.icon}</span>
                                <div>
                                    <span className="text-xs font-semibold" style={{ color: stage.color }}>{stage.label}</span>
                                    <span className="text-xs text-zinc-500 ml-1.5">— {stage.desc}</span>
                                </div>
                            </div>

                            {/* Target selector (only when not active) */}
                            {!session && (
                                <div className="mt-4 w-full">
                                    <p className="text-xs text-zinc-500 mb-2 text-center">Fasting Goal</p>
                                    <div className="grid grid-cols-6 gap-1">
                                        {TARGET_OPTIONS.map(h => (
                                            <button
                                                key={h}
                                                onClick={() => setTargetHours(h)}
                                                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${targetHours === h
                                                    ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300'
                                                    : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-500 hover:text-white'
                                                    }`}
                                            >
                                                {h}h
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action button */}
                            <button
                                onClick={session ? handleStop : handleStart}
                                disabled={acting}
                                className={`mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 ${session
                                    ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
                                    : 'bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30'
                                    }`}
                            >
                                {session ? <><Square className="w-4 h-4" /> Stop Fast</> : <><Play className="w-4 h-4" /> Start Fast</>}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
