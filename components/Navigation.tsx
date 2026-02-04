'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar as CalIcon, PlusCircle, History, TrendingUp, ClipboardList } from 'lucide-react';

export default function Navigation() {
    const pathname = usePathname();

    const navItems = [
        { name: 'Home', href: '/', icon: Home },
        { name: 'Calendar', href: '/calendar', icon: CalIcon },
        { name: 'Log', href: '/log', icon: PlusCircle },
        { name: 'Routines', href: '/routines', icon: ClipboardList },
        { name: 'History', href: '/history', icon: History },
        { name: 'Progress', href: '/progress', icon: TrendingUp },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/5 pb-5 pt-3 z-50">
            <div className="flex justify-around items-center max-w-md mx-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 transition-colors duration-200
                                ${isActive ? 'text-orange-500' : 'text-zinc-600 hover:text-zinc-400'}
                            `}
                        >
                            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            {/* Minimal Dot Indicator */}
                            <div className={`h-1 w-1 rounded-full transition-all duration-300 ${isActive ? 'bg-orange-500 opacity-100' : 'bg-transparent opacity-0'}`} />
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
