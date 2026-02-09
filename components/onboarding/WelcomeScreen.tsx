'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
    onContinue: () => void;
}

export default function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
    return (
        <motion.div
            className="min-h-screen flex flex-col items-center justify-center p-6 bg-black relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.4 }}
        >
            {/* Background Effects */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/15 rounded-full blur-[80px] -z-10" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[80px] -z-10" />

            {/* Content */}
            <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-center max-w-md"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                    className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-2 mb-6"
                >
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-sm text-orange-400 font-medium">Welcome aboard!</span>
                </motion.div>

                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                    Transform Your
                    <span className="block gradient-text">Fitness Journey</span>
                </h1>

                <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
                    Track workouts, monitor your progress, plan meals, and unlock achievements.
                    Everything you need to reach your goals.
                </p>

                {/* Stats Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="grid grid-cols-3 gap-4 mb-10"
                >
                    {[
                        { value: '∞', label: 'Exercises' },
                        { value: '24/7', label: 'Tracking' },
                        { value: '100%', label: 'Free' },
                    ].map((stat, i) => (
                        <div key={i} className="glass-card p-4 text-center">
                            <div className="text-2xl font-bold text-orange-500">{stat.value}</div>
                            <div className="text-xs text-zinc-500 mt-1">{stat.label}</div>
                        </div>
                    ))}
                </motion.div>

                {/* Continue Button */}
                <motion.button
                    onClick={onContinue}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold py-4 px-8 rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 group"
                >
                    Continue
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>

                {/* Skip to Sign In */}
                <motion.a
                    href="/login"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="mt-4 text-zinc-500 hover:text-orange-400 text-sm transition-colors text-center block"
                >
                    Already know the app? Skip to sign in →
                </motion.a>
            </motion.div>
        </motion.div>
    );
}
