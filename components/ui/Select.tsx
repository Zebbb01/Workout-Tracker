'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming cn exists or I will create it/use local merge

// Need a simple utility if not exists
const classNames = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

interface Option {
    id: string;
    label: string;
    subLabel?: string;
}

interface SelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    action?: {
        label: string;
        onClick: () => void;
        icon?: React.ReactNode;
    };
    required?: boolean;
}

export default function Select({ options, value, onChange, placeholder = "Select...", label, action }: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.id === value);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (id: string) => {
        onChange(id);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="relative w-full">
            {label && <label className="block text-xs text-zinc-400 mb-1">{label}</label>}

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={classNames(
                        "relative w-full text-left bg-slate-800/50 border rounded-lg p-3 pr-10 transition-colors flex items-center justify-between",
                        isOpen ? "border-orange-500 ring-1 ring-orange-500/50" : "border-slate-700 hover:border-slate-600",
                        !selectedOption ? "text-slate-400" : "text-white"
                    )}
                >
                    <span className="truncate block">
                        {selectedOption ? selectedOption.label : placeholder}
                        {selectedOption?.subLabel && <span className="text-zinc-500 text-xs ml-2">{selectedOption.subLabel}</span>}
                    </span>
                    <div className={classNames(
                        "absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-transform duration-200",
                        isOpen ? "rotate-180 text-orange-500" : ""
                    )}>
                        <ChevronDown size={16} />
                    </div>
                </button>

                {action && (
                    <button
                        type="button"
                        onClick={action.onClick}
                        className="bg-zinc-800 hover:bg-zinc-700 text-orange-500 p-3 rounded-lg border border-zinc-700 transition-colors flex-shrink-0"
                        title={action.label}
                    >
                        {action.icon}
                    </button>
                )}
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden p-1 scrollbar-thin scrollbar-thumb-zinc-700"
                    >
                        {options.map(option => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => handleSelect(option.id)}
                                className={classNames(
                                    "w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition-colors",
                                    option.id === value
                                        ? "bg-orange-600/10 text-orange-500 font-medium"
                                        : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                )}
                            >
                                <div>
                                    <span>{option.label}</span>
                                    {option.subLabel && <span className="text-zinc-500 text-xs ml-2 opacity-70">{option.subLabel}</span>}
                                </div>
                                {option.id === value && <Check size={14} />}
                            </button>
                        ))}
                        {options.length === 0 && (
                            <div className="p-3 text-center text-zinc-500 text-xs">No options found</div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
