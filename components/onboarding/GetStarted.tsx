'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { signIn } from 'next-auth/react';
import { Rocket, ArrowLeft, ShieldCheck } from 'lucide-react';

interface GetStartedProps {
    onBack: () => void;
}

export default function GetStarted({ onBack }: GetStartedProps) {
    const handleSignIn = async () => {
        await signIn('google', { callbackUrl: '/' });
    };

    return (
        <motion.div
            className="min-h-screen flex flex-col items-center justify-center p-6 bg-black relative overflow-hidden"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* Background Effects */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/20 rounded-full blur-[100px] -z-10" />
            <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-red-600/15 rounded-full blur-[100px] -z-10" />

            <div className="max-w-md w-full text-center">
                {/* Rocket Icon */}
                <motion.div
                    initial={{ scale: 0, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    className="inline-flex p-6 rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 shadow-2xl shadow-orange-500/30 mb-8"
                >
                    <Rocket size={48} className="text-white" />
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-4xl font-bold text-white mb-4"
                >
                    Ready to Start?
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-zinc-400 text-lg mb-10"
                >
                    Sign in to sync your data across devices and never lose your progress.
                </motion.p>

                {/* Sign In Button */}
                <motion.button
                    onClick={handleSignIn}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full glass-button group relative overflow-hidden rounded-xl p-[1px] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-black mb-4"
                >
                    <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2E8F0_0%,#501c0c_50%,#E2E8F0_100%)] opacity-0 group-hover:opacity-20 transition-opacity" />
                    <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-xl bg-zinc-900 px-8 py-4 text-base font-medium text-white backdrop-blur-3xl transition-colors group-hover:bg-zinc-800 gap-3">
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Continue with Google
                    </span>
                </motion.button>

                {/* Security Note */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-center justify-center gap-2 text-zinc-600 text-sm"
                >
                    <ShieldCheck className="w-4 h-4" />
                    <p>Your data is encrypted and secure</p>
                </motion.div>

                {/* Back Button */}
                <motion.button
                    onClick={onBack}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="mt-8 text-zinc-500 hover:text-white transition-colors flex items-center gap-2 mx-auto"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to features
                </motion.button>
            </div>
        </motion.div>
    );
}
