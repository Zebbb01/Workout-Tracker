'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Dumbbell } from 'lucide-react';

interface SplashScreenProps {
    onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
    React.useEffect(() => {
        const timer = setTimeout(() => {
            onComplete();
        }, 2500);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            className="min-h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            {/* Background Glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-orange-600/20 rounded-full blur-[100px] -z-10" />

            {/* Logo Animation */}
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 0.2
                }}
                className="relative"
            >
                <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-3xl shadow-2xl shadow-orange-500/30">
                    <Dumbbell size={64} className="text-white" />
                </div>

                {/* Pulse Ring */}
                <motion.div
                    className="absolute inset-0 border-2 border-orange-500 rounded-3xl"
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        repeatDelay: 0.5
                    }}
                />
            </motion.div>

            {/* App Name */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="mt-8 text-center"
            >
                <h1 className="text-4xl font-bold text-white tracking-tight">
                    Body Tracker <span className="text-orange-500">Pro</span>
                </h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 0.5 }}
                    className="text-zinc-500 mt-2"
                >
                    Your fitness journey starts here
                </motion.p>
            </motion.div>

            {/* Loading Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="mt-12 flex gap-1"
            >
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-orange-500"
                        animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            delay: i * 0.2,
                        }}
                    />
                ))}
            </motion.div>
        </motion.div>
    );
}
