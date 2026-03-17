'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MacroHalfPieProps {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    targetCalories: number;
    proteinTarget: number;
    carbsTarget: number;
    fatTarget: number;
}

// Convert a value range [0,1] to an SVG arc path on the bottom half of a circle
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

export default function MacroHalfPie({ calories, protein, carbs, fat, targetCalories, proteinTarget, carbsTarget, fatTarget }: MacroHalfPieProps) {
    const W = 280;
    const H = 160;
    const cx = W / 2;
    const cy = H - 10;
    const R_OUTER = 120;
    const R_INNER = 78;

    // Total macros in kcal for proportional display
    const proteinKcal = protein * 4;
    const carbsKcal = carbs * 4;
    const fatKcal = fat * 9;
    const totalKcal = proteinKcal + carbsKcal + fatKcal || 1;

    // 180 degrees total arc (left to right = 180° to 0°)
    const START = 180;
    const END = 360;
    const TOTAL_DEG = END - START; // 180

    const proteinDeg = (proteinKcal / totalKcal) * TOTAL_DEG;
    const carbsDeg = (carbsKcal / totalKcal) * TOTAL_DEG;
    const fatDeg = (fatKcal / totalKcal) * TOTAL_DEG;

    const proteinStart = START;
    const proteinEnd = proteinStart + proteinDeg;
    const carbsStart = proteinEnd;
    const carbsEnd = carbsStart + carbsDeg;
    const fatStart = carbsEnd;
    const fatEnd = fatStart + fatDeg;

    // Track arc (full 180)
    const trackPath = describeArc(cx, cy, (R_OUTER + R_INNER) / 2, START, END);

    // Calorie progress for overlay ring
    const calPct = Math.min(calories / (targetCalories || 1), 1);
    const calEndAngle = START + calPct * TOTAL_DEG;

    const macros = [
        { label: 'Protein', value: protein, target: proteinTarget, color: '#f87171', unit: 'g' },
        { label: 'Carbs',   value: carbs,   target: carbsTarget,   color: '#fbbf24', unit: 'g' },
        { label: 'Fat',     value: fat,     target: fatTarget,     color: '#60a5fa', unit: 'g' },
    ];

    return (
        <div className="flex flex-col items-center">
            <div className="relative" style={{ width: W, height: H + 10 }}>
                <svg width={W} height={H + 10} viewBox={`0 0 ${W} ${H + 10}`}>
                    {/* Track */}
                    <path
                        d={describeArc(cx, cy, (R_OUTER + R_INNER) / 2, START, END)}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth={R_OUTER - R_INNER}
                        strokeLinecap="butt"
                    />

                    {/* Macro segments */}
                    {totalKcal > 1 && (
                        <>
                            {/* Protein — red */}
                            <path
                                d={describeArc(cx, cy, (R_OUTER + R_INNER) / 2, proteinStart, proteinEnd - 0.5)}
                                fill="none" stroke="#f87171" strokeWidth={R_OUTER - R_INNER} strokeLinecap="butt"
                                opacity={0.85}
                            />
                            {/* Carbs — amber */}
                            <path
                                d={describeArc(cx, cy, (R_OUTER + R_INNER) / 2, carbsStart + 0.5, carbsEnd - 0.5)}
                                fill="none" stroke="#fbbf24" strokeWidth={R_OUTER - R_INNER} strokeLinecap="butt"
                                opacity={0.85}
                            />
                            {/* Fat — blue */}
                            <path
                                d={describeArc(cx, cy, (R_OUTER + R_INNER) / 2, fatStart + 0.5, fatEnd)}
                                fill="none" stroke="#60a5fa" strokeWidth={R_OUTER - R_INNER} strokeLinecap="butt"
                                opacity={0.85}
                            />
                        </>
                    )}

                    {/* Calorie progress outer ring */}
                    <path
                        d={describeArc(cx, cy, R_OUTER + 6, START, END)}
                        fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={4} strokeLinecap="round"
                    />
                    {calories > 0 && (
                        <path
                            d={describeArc(cx, cy, R_OUTER + 6, START, calEndAngle)}
                            fill="none"
                            stroke={calories > targetCalories ? '#ef4444' : '#f97316'}
                            strokeWidth={4} strokeLinecap="round"
                        />
                    )}
                </svg>

                {/* Center callout */}
                <div
                    className="absolute flex flex-col items-center justify-end"
                    style={{ bottom: 14, left: '50%', transform: 'translateX(-50%)' }}
                >
                    <span className="text-3xl font-bold text-white leading-none">{calories}</span>
                    <span className="text-xs text-zinc-500 mt-0.5">/ {targetCalories} kcal</span>
                </div>
            </div>

            {/* Macro legend */}
            <div className="grid grid-cols-3 gap-3 w-full mt-2">
                {macros.map(m => {
                    const pct = Math.min((m.value / (m.target || 1)) * 100, 100);
                    return (
                        <div key={m.label} className="text-center">
                            <div className="text-sm font-bold text-white">{m.value.toFixed(0)}{m.unit}</div>
                            <div className="text-[10px] text-zinc-500 mb-1">/ {m.target}{m.unit}</div>
                            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className="h-full rounded-full"
                                    style={{ background: m.color }}
                                />
                            </div>
                            <div className="text-[10px] mt-1" style={{ color: m.color }}>{m.label}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
