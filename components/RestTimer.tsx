'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Timer, X, Minimize2, Maximize2, Play, Pause, RefreshCw } from 'lucide-react';

export default function RestTimer() {
    const [timeLeft, setTimeLeft] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    // Timer interval reference
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            if (isActive) {
                // Timer finished
                setIsActive(false);
                // Simple notification or sound could go here
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                    new Notification('Rest Time Finished!');
                }
            }
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive, timeLeft]);

    const startTimer = (seconds: number) => {
        setTimeLeft(seconds);
        setIsActive(true);
        setIsMinimized(false);
    };

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(0);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (timeLeft === 0 && !isActive) {
        // Initial / Idle state - compact button
        return (
            <div className="glass-card p-4 rounded-xl">
                <h4 className="text-xs text-zinc-400 mb-2 font-medium uppercase tracking-wider">Rest Timer</h4>
                <div className="grid grid-cols-4 gap-2">
                    {[30, 60, 90, 120].map(s => (
                        <button
                            key={s}
                            onClick={() => startTimer(s)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-orange-400 text-xs font-bold py-2 rounded-lg transition-colors border border-zinc-700 hover:border-orange-500/50"
                        >
                            {s}s
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Active Timer State
    return (
        <div className={`fixed bottom-20 right-4 z-50 transition-all duration-300 ease-in-out ${isMinimized ? 'w-auto' : 'w-64'}`}>
            <div className="bg-black/90 border border-orange-500/30 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden relative">
                {/* Progress Bar Background */}
                {!isMinimized && (
                    <div
                        className="absolute bottom-0 left-0 h-1 bg-orange-500 transition-all duration-1000 linear"
                        style={{ width: `${(timeLeft / 120) * 100}%` }} // Simplified percentage logic
                    ></div>
                )}

                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isActive ? 'bg-orange-500/20 text-orange-500 animate-pulse' : 'bg-zinc-800 text-zinc-500'}`}>
                            <Timer size={20} />
                        </div>
                        <div>
                            <span className="text-2xl font-mono font-bold text-white tabular-nums">
                                {formatTime(timeLeft)}
                            </span>
                            {!isMinimized && <p className="text-[10px] text-zinc-500 uppercase font-bold">Resting</p>}
                        </div>
                    </div>

                    <div className="flex gap-1">
                        {!isMinimized && (
                            <>
                                <button onClick={toggleTimer} className="p-2 hover:bg-white/10 rounded-lg text-white">
                                    {isActive ? <Pause size={16} /> : <Play size={16} />}
                                </button>
                                <button onClick={resetTimer} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-red-400">
                                    <X size={16} />
                                </button>
                            </>
                        )}
                        <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-white/10 rounded-lg text-zinc-500">
                            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
