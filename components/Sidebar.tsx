'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Home,
    Calendar as CalIcon,
    PlusCircle,
    Utensils,
    Flame,
    Trophy,
    BarChart3,
    ClipboardList,
    History,
    Settings,
    Menu,
    X,
    Dumbbell,
} from 'lucide-react';

const navItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Log Workout', href: '/log', icon: PlusCircle },
    { name: 'Routines', href: '/routines', icon: ClipboardList },
    { name: 'Calendar', href: '/calendar', icon: CalIcon },
    { name: 'Meals', href: '/meals', icon: Utensils },
    { name: 'TDEE Calculator', href: '/tdee', icon: Flame },
    { name: 'Progress', href: '/progress', icon: BarChart3 },
    { name: 'History', href: '/history', icon: History },
    { name: 'Achievements', href: '/achievements', icon: Trophy },
];

const bottomItems = [
    { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    // Close sidebar on route change
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Close on Escape key
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    // Don't render anything if not authenticated
    if (status !== 'authenticated') return null;

    // Don't render on login/onboarding pages
    if (pathname?.startsWith('/login') || pathname?.startsWith('/onboarding')) return null;

    return (
        <>
            {/* Hamburger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed top-4 left-4 z-50 bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all duration-200 shadow-lg shadow-black/20"
                aria-label="Open menu"
            >
                <Menu size={22} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                        />

                        {/* Sidebar Panel */}
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            className="fixed top-0 left-0 bottom-0 w-72 bg-zinc-950/95 backdrop-blur-2xl border-r border-white/5 z-[70] flex flex-col"
                        >
                            {/* Sidebar Header */}
                            <div className="flex items-center justify-between p-5 border-b border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2 rounded-xl shadow-lg shadow-orange-500/20">
                                        <Dumbbell size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-white font-bold text-sm tracking-tight">Body Tracker</h2>
                                        <p className="text-[10px] text-zinc-500 truncate max-w-[140px]">
                                            {session?.user?.name || session?.user?.email || 'User'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                                    aria-label="Close menu"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Nav Items */}
                            <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
                                {navItems.map((item, index) => {
                                    const isActive = pathname === item.href;
                                    const Icon = item.icon;

                                    return (
                                        <motion.div
                                            key={item.href}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                        >
                                            <Link
                                                href={item.href}
                                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                                                    ${isActive
                                                        ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                                                        : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                                                    }`}
                                            >
                                                <Icon
                                                    size={20}
                                                    strokeWidth={isActive ? 2.5 : 1.8}
                                                    className={`transition-colors ${isActive ? 'text-orange-500' : 'text-zinc-500 group-hover:text-zinc-300'}`}
                                                />
                                                <span>{item.name}</span>
                                                {isActive && (
                                                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-orange-500" />
                                                )}
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                            </nav>

                            {/* Bottom Section (Settings) */}
                            <div className="border-t border-white/5 p-3 space-y-0.5">
                                {bottomItems.map((item) => {
                                    const isActive = pathname === item.href;
                                    const Icon = item.icon;

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                                                ${isActive
                                                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                                                    : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                                                }`}
                                        >
                                            <Icon
                                                size={20}
                                                strokeWidth={isActive ? 2.5 : 1.8}
                                                className={`transition-colors ${isActive ? 'text-orange-500' : 'text-zinc-500 group-hover:text-zinc-300'}`}
                                            />
                                            <span>{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
