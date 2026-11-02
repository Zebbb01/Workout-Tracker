'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain, TrendingUp, TrendingDown, Utensils, Zap,
    AlertCircle, CheckCircle, Flame, Dumbbell, Target,
    Scale, Heart, BarChart3, Minus, Calendar, Trophy
} from 'lucide-react';
import { LocalWorkoutSet, LocalMealPlan } from '@/lib/db';
import { normalizeWeight, formatWeight } from '@/lib/units';
import { EXERCISES } from '@/lib/exercises';
import { startOfDay, subDays, format, isToday, differenceInCalendarDays } from 'date-fns';

interface TDEEProfile {
    tdee: number | null;
    bmr: number | null;
    targetCalories: number | null;
    goal: string | null;
    proteinTarget: number | null;
    weightKg: number | null;
    activityLevel: string | null;
    useImperial?: boolean;
}

interface SmartInsightsProps {
    workouts: LocalWorkoutSet[];
    meals: LocalMealPlan[];
    tdeeProfile: TDEEProfile | null;
    weightEntries: any[];
}

interface Insight {
    id: string;
    icon: React.ElementType;
    message: string;
    type: 'positive' | 'neutral' | 'warning' | 'info';
    priority: number; // lower = higher priority
}

// Static category lookup from built-in exercises
const EXERCISE_CATEGORY_MAP: Record<string, string> = {};
for (const ex of EXERCISES) {
    EXERCISE_CATEGORY_MAP[ex.id] = ex.category;
}

// Normalize compound categories for grouping (e.g., "Back/Legs" -> "Back")
function getPrimaryCategory(exerciseId: string): string | null {
    const cat = EXERCISE_CATEGORY_MAP[exerciseId];
    if (!cat) return null;
    // Take first category for compound entries like "Back/Legs"
    const primary = cat.split('/')[0].trim();
    // Group small arm categories into "Arms" for balance analysis
    if (primary === 'Biceps' || primary === 'Triceps') return 'Arms';
    return primary;
}

function generateWorkoutInsights(
    workouts: LocalWorkoutSet[],
    useImperial: boolean
): Insight[] {
    const insights: Insight[] = [];
    if (workouts.length === 0) return insights;

    const unit = useImperial ? 'imperial' : 'metric';

    // Sort workouts by date descending
    const sorted = [...workouts].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // --- Volume comparison: last 7 days vs previous 7 days ---
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    const fourteenDaysAgo = subDays(now, 14);

    const recentWorkouts = sorted.filter(w => new Date(w.date) >= sevenDaysAgo);
    const previousWorkouts = sorted.filter(
        w => new Date(w.date) >= fourteenDaysAgo && new Date(w.date) < sevenDaysAgo
    );

    if (recentWorkouts.length > 0 && previousWorkouts.length > 0) {
        const recentVolume = recentWorkouts.reduce(
            (sum, w) => sum + normalizeWeight(w.totalWeight * w.sets, w.unit || 'metric', unit),
            0
        );
        const previousVolume = previousWorkouts.reduce(
            (sum, w) => sum + normalizeWeight(w.totalWeight * w.sets, w.unit || 'metric', unit),
            0
        );

        if (previousVolume > 0) {
            const changePct = ((recentVolume - previousVolume) / previousVolume) * 100;

            if (changePct > 5) {
                insights.push({
                    id: 'volume-up',
                    icon: TrendingUp,
                    message: `Volume up ${Math.round(changePct)}% this week vs last week. Keep pushing.`,
                    type: 'positive',
                    priority: 3,
                });
            } else if (changePct < -10) {
                insights.push({
                    id: 'volume-down',
                    icon: TrendingDown,
                    message: `Volume down ${Math.abs(Math.round(changePct))}% this week. Consider increasing intensity.`,
                    type: 'warning',
                    priority: 2,
                });
            } else {
                insights.push({
                    id: 'volume-stable',
                    icon: Dumbbell,
                    message: 'Training volume is consistent week over week. Solid work.',
                    type: 'neutral',
                    priority: 5,
                });
            }
        }
    }

    // --- Strongest recent exercise ---
    if (recentWorkouts.length > 0) {
        const exerciseMaxes: Record<string, { name: string; maxWeight: number }> = {};
        for (const w of recentWorkouts) {
            const normalizedWeight = normalizeWeight(w.totalWeight, w.unit || 'metric', unit);
            if (!exerciseMaxes[w.exerciseId] || normalizedWeight > exerciseMaxes[w.exerciseId].maxWeight) {
                exerciseMaxes[w.exerciseId] = { name: w.exerciseName, maxWeight: normalizedWeight };
            }
        }

        const strongest = Object.values(exerciseMaxes).sort((a, b) => b.maxWeight - a.maxWeight)[0];
        if (strongest) {
            insights.push({
                id: 'strongest-exercise',
                icon: Zap,
                message: `Strongest lift this week: ${strongest.name} at ${formatWeight(strongest.maxWeight, unit)}.`,
                type: 'info',
                priority: 4,
            });
        }
    }

    // --- Estimated 1RM improvement (Epley formula) ---
    // Only if we have enough data to compare the same exercise across weeks
    if (sorted.length >= 4) {
        const exerciseHistory: Record<string, { recent: number; previous: number }> = {};

        for (const w of recentWorkouts) {
            if (w.reps > 0 && w.reps <= 12 && w.totalWeight > 0) {
                const weight = normalizeWeight(w.totalWeight, w.unit || 'metric', unit);
                const e1rm = weight * (1 + w.reps / 30); // Epley formula
                if (!exerciseHistory[w.exerciseId] || e1rm > (exerciseHistory[w.exerciseId]?.recent || 0)) {
                    if (!exerciseHistory[w.exerciseId]) {
                        exerciseHistory[w.exerciseId] = { recent: 0, previous: 0 };
                    }
                    exerciseHistory[w.exerciseId].recent = e1rm;
                }
            }
        }

        for (const w of previousWorkouts) {
            if (w.reps > 0 && w.reps <= 12 && w.totalWeight > 0 && exerciseHistory[w.exerciseId]) {
                const weight = normalizeWeight(w.totalWeight, w.unit || 'metric', unit);
                const e1rm = weight * (1 + w.reps / 30);
                if (e1rm > (exerciseHistory[w.exerciseId]?.previous || 0)) {
                    exerciseHistory[w.exerciseId].previous = e1rm;
                }
            }
        }

        // Find the exercise with the best e1RM improvement
        let bestImprovement = { exerciseName: '', pct: 0 };
        for (const [exerciseId, data] of Object.entries(exerciseHistory)) {
            if (data.recent > 0 && data.previous > 0) {
                const pct = ((data.recent - data.previous) / data.previous) * 100;
                if (pct > bestImprovement.pct && pct > 2) {
                    const exerciseEntry = recentWorkouts.find(w => w.exerciseId === exerciseId);
                    bestImprovement = {
                        exerciseName: exerciseEntry?.exerciseName || '',
                        pct,
                    };
                }
            }
        }

        if (bestImprovement.pct > 0 && bestImprovement.exerciseName) {
            insights.push({
                id: 'e1rm-improvement',
                icon: TrendingUp,
                message: `Estimated 1RM for ${bestImprovement.exerciseName} improved ~${Math.round(bestImprovement.pct)}% from last week.`,
                type: 'positive',
                priority: 2,
            });
        }
    }

    // --- Consistency / Recovery signal ---
    const workoutDates = new Set(
        sorted.map(w => startOfDay(new Date(w.date)).toISOString())
    );
    const last7Days = Array.from({ length: 7 }, (_, i) =>
        startOfDay(subDays(now, i)).toISOString()
    );
    const activeDays = last7Days.filter(d => workoutDates.has(d)).length;

    if (activeDays >= 5) {
        // High frequency — recovery warning (takes priority over generic consistency)
        insights.push({
            id: 'recovery-warning',
            icon: Heart,
            message: `${activeDays} training days in the last 7. High frequency — ensure adequate rest and recovery.`,
            type: 'warning',
            priority: 1,
        });
    } else if (activeDays >= 3) {
        // Balanced frequency
        insights.push({
            id: 'balanced-frequency',
            icon: CheckCircle,
            message: `${activeDays} training days this week. Balanced frequency for progress and recovery.`,
            type: 'positive',
            priority: 4,
        });
    } else if (activeDays === 0 && workouts.length > 0) {
        insights.push({
            id: 'no-recent',
            icon: AlertCircle,
            message: 'No workouts logged this week. Time to get back at it.',
            type: 'warning',
            priority: 1,
        });
    }

    return insights;
}

function generateNutritionInsights(
    meals: LocalMealPlan[],
    tdeeProfile: TDEEProfile | null
): Insight[] {
    const insights: Insight[] = [];
    if (!tdeeProfile?.targetCalories) return insights;

    // Filter to today's meals
    const todayMeals = meals.filter(m => {
        try {
            return isToday(new Date(m.date));
        } catch {
            return false;
        }
    });

    if (todayMeals.length === 0) {
        insights.push({
            id: 'no-meals-today',
            icon: Utensils,
            message: 'No meals logged today. Track your intake to stay on target.',
            type: 'info',
            priority: 3,
        });
        return insights;
    }

    const totalCalories = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const totalProtein = todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
    const target = tdeeProfile.targetCalories;

    // Calorie status
    if (totalCalories > 0 && target) {
        const calPct = (totalCalories / target) * 100;

        if (calPct > 110) {
            insights.push({
                id: 'calories-over',
                icon: Flame,
                message: `${totalCalories.toLocaleString()} kcal consumed today. Over your ${target.toLocaleString()} target by ${(totalCalories - target).toLocaleString()} kcal.`,
                type: 'warning',
                priority: 2,
            });
        } else if (calPct >= 90) {
            insights.push({
                id: 'calories-on-track',
                icon: CheckCircle,
                message: `${totalCalories.toLocaleString()} of ${target.toLocaleString()} kcal consumed. You're on track.`,
                type: 'positive',
                priority: 3,
            });
        } else {
            const remaining = target - totalCalories;
            insights.push({
                id: 'calories-remaining',
                icon: Target,
                message: `${remaining.toLocaleString()} kcal remaining to hit your daily target.`,
                type: 'neutral',
                priority: 4,
            });
        }
    }

    // Protein status
    if (tdeeProfile.proteinTarget && totalProtein > 0) {
        const proteinPct = (totalProtein / tdeeProfile.proteinTarget) * 100;
        if (proteinPct >= 90) {
            insights.push({
                id: 'protein-hit',
                icon: CheckCircle,
                message: `Protein on point: ${totalProtein}g of ${tdeeProfile.proteinTarget}g target hit.`,
                type: 'positive',
                priority: 4,
            });
        } else if (proteinPct < 50) {
            insights.push({
                id: 'protein-low',
                icon: AlertCircle,
                message: `Only ${totalProtein}g protein logged. Aim for ${tdeeProfile.proteinTarget}g today.`,
                type: 'warning',
                priority: 3,
            });
        }
    }

    return insights;
}

function generateNutritionTrendInsights(
    meals: LocalMealPlan[],
    tdeeProfile: TDEEProfile | null
): Insight[] {
    const insights: Insight[] = [];
    if (!tdeeProfile?.targetCalories || meals.length === 0) return insights;

    // Group meals by date (excluding today)
    const dailyStats: Record<string, { calories: number; protein: number }> = {};
    const now = new Date();
    const todayStr = startOfDay(now).toISOString();

    for (const m of meals) {
        try {
            const dateStr = startOfDay(new Date(m.date)).toISOString();
            if (dateStr === todayStr) continue;

            if (!dailyStats[dateStr]) {
                dailyStats[dateStr] = { calories: 0, protein: 0 };
            }
            dailyStats[dateStr].calories += m.calories || 0;
            dailyStats[dateStr].protein += m.protein || 0;
        } catch {
            continue;
        }
    }

    const dayEntries = Object.entries(dailyStats)
        .sort((a, b) => b[0].localeCompare(a[0])) // Newest first
        .slice(0, 7); // Last 7 logged days

    if (dayEntries.length < 3) return insights; // Need enough history for a trend

    const targetCals = tdeeProfile.targetCalories;
    const targetProtein = tdeeProfile.proteinTarget || 0;

    let calComplianceCount = 0;
    let proteinComplianceCount = 0;
    let overCount = 0;
    let underCount = 0;

    for (const [, stats] of dayEntries) {
        const calPct = (stats.calories / targetCals);
        if (calPct >= 0.85 && calPct <= 1.15) {
            calComplianceCount++;
        } else if (calPct > 1.15) {
            overCount++;
        } else if (calPct < 0.85) {
            underCount++;
        }

        if (targetProtein > 0 && stats.protein >= targetProtein * 0.85) {
            proteinComplianceCount++;
        }
    }

    // Calorie Trend Insights
    if (calComplianceCount >= 5) {
        insights.push({
            id: 'nutrition-consistency',
            icon: Target,
            message: `Great consistency! You've hit your calorie target in ${calComplianceCount} of your last ${dayEntries.length} logged days.`,
            type: 'positive',
            priority: 3,
        });
    } else if (overCount >= 4) {
        insights.push({
            id: 'nutrition-over-trend',
            icon: Flame,
            message: `Taking in more than planned. You've been over your target in ${overCount} of your last ${dayEntries.length} logged days.`,
            type: 'warning',
            priority: 3,
        });
    } else if (underCount >= 4) {
        insights.push({
            id: 'nutrition-under-trend',
            icon: TrendingDown,
            message: `Running a bit low. You've been under your calorie target in ${underCount} of your last ${dayEntries.length} logged days.`,
            type: 'neutral',
            priority: 4,
        });
    }

    // Protein Trend/Macro Balance Insight
    if (targetProtein > 0 && proteinComplianceCount >= 5) {
        insights.push({
            id: 'protein-consistency',
            icon: Zap,
            message: `Solid protein intake! Hit your target in ${proteinComplianceCount} of your last ${dayEntries.length} logged days.`,
            type: 'positive',
            priority: 4,
        });
    } else if (targetProtein > 0 && proteinComplianceCount <= 1 && dayEntries.length >= 5) {
        insights.push({
            id: 'protein-gap',
            icon: AlertCircle,
            message: `Protein has been inconsistent recently. Try prioritizing high-protein sources in your upcoming meals.`,
            type: 'warning',
            priority: 3,
        });
    }

    return insights;
}

function generateBodyweightInsights(
    weightEntries: any[],
    tdeeProfile: TDEEProfile | null,
    useImperial: boolean
): Insight[] {
    const insights: Insight[] = [];

    // Need at least 2 entries to detect a trend
    if (weightEntries.length < 2) return insights;

    const unit = useImperial ? 'imperial' : 'metric';

    // weightEntries are ordered desc by date from the server action
    // Take entries within last 14 days for trend analysis
    const now = new Date();
    const fourteenDaysAgo = subDays(now, 14);
    const recentEntries = weightEntries.filter(e => {
        try {
            return new Date(e.date) >= fourteenDaysAgo;
        } catch {
            return false;
        }
    });

    if (recentEntries.length < 2) return insights;

    // Entries are desc — last element is oldest, first is newest
    const latestKg = recentEntries[0].weightKg;
    const oldestKg = recentEntries[recentEntries.length - 1].weightKg;
    const changeKg = latestKg - oldestKg;

    // Determine trend direction with a small dead zone (0.3kg)
    const STABLE_THRESHOLD = 0.3;
    let trend: 'up' | 'down' | 'stable';
    if (changeKg > STABLE_THRESHOLD) {
        trend = 'up';
    } else if (changeKg < -STABLE_THRESHOLD) {
        trend = 'down';
    } else {
        trend = 'stable';
    }

    const absChange = normalizeWeight(Math.abs(changeKg), 'metric', unit);
    const changeLabel = formatWeight(absChange, unit);
    const goal = tdeeProfile?.goal;

    // --- Goal alignment logic ---
    if (goal === 'cutting') {
        if (trend === 'down') {
            insights.push({
                id: 'weight-goal-aligned',
                icon: Scale,
                message: `Weight trending down ${changeLabel} recently. Aligned with your cutting goal.`,
                type: 'positive',
                priority: 1,
            });
        } else if (trend === 'up') {
            insights.push({
                id: 'weight-goal-misaligned',
                icon: Scale,
                message: `Weight up ${changeLabel} recently while cutting. Review calorie intake.`,
                type: 'warning',
                priority: 1,
            });
        } else {
            insights.push({
                id: 'weight-stable-cutting',
                icon: Scale,
                message: 'Weight stable recently. Consider adjusting deficit if cutting progress has stalled.',
                type: 'neutral',
                priority: 3,
            });
        }
    } else if (goal === 'bulking') {
        if (trend === 'up') {
            insights.push({
                id: 'weight-goal-aligned',
                icon: Scale,
                message: `Weight trending up ${changeLabel} recently. Aligned with your bulking goal.`,
                type: 'positive',
                priority: 1,
            });
        } else if (trend === 'down') {
            insights.push({
                id: 'weight-goal-misaligned',
                icon: Scale,
                message: `Weight down ${changeLabel} recently while bulking. Increase calorie intake.`,
                type: 'warning',
                priority: 1,
            });
        } else {
            insights.push({
                id: 'weight-stable-bulking',
                icon: Scale,
                message: 'Weight stable recently. Consider increasing surplus for bulking progress.',
                type: 'neutral',
                priority: 3,
            });
        }
    } else if (goal === 'maintenance') {
        if (trend === 'stable') {
            insights.push({
                id: 'weight-goal-aligned',
                icon: Scale,
                message: 'Weight stable. Right on track for maintenance.',
                type: 'positive',
                priority: 2,
            });
        } else {
            const direction = trend === 'up' ? 'up' : 'down';
            insights.push({
                id: 'weight-goal-drift',
                icon: Scale,
                message: `Weight trending ${direction} ${changeLabel} recently. Adjust intake to maintain.`,
                type: 'warning',
                priority: 2,
            });
        }
    } else {
        // No goal set — just report the trend without alignment judgment
        if (trend !== 'stable') {
            const direction = trend === 'up' ? 'up' : 'down';
            const icon = trend === 'up' ? TrendingUp : TrendingDown;
            insights.push({
                id: 'weight-trend',
                icon,
                message: `Weight trending ${direction} ${changeLabel} over the last 2 weeks.`,
                type: 'info',
                priority: 3,
            });
        }
    }

    return insights;
}

function generateProgressInsights(
    workouts: LocalWorkoutSet[],
    useImperial: boolean
): Insight[] {
    const insights: Insight[] = [];
    if (workouts.length < 6) return insights; // Need meaningful history

    const unit = useImperial ? 'imperial' : 'metric';
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    const fourteenDaysAgo = subDays(now, 14);
    const twentyOneDaysAgo = subDays(now, 21);

    const sorted = [...workouts].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const recentWorkouts = sorted.filter(w => new Date(w.date) >= sevenDaysAgo);
    const previousWorkouts = sorted.filter(
        w => new Date(w.date) >= fourteenDaysAgo && new Date(w.date) < sevenDaysAgo
    );
    const olderWorkouts = sorted.filter(
        w => new Date(w.date) >= twentyOneDaysAgo && new Date(w.date) < fourteenDaysAgo
    );

    // --- Progressive Overload Detection ---
    // Compare best e1RM per exercise: recent week vs previous 2 weeks combined
    // This detects a stalled lift: same exercise, same e1RM for 2+ weeks
    if (previousWorkouts.length > 0 && olderWorkouts.length > 0) {
        const baseline = [...previousWorkouts, ...olderWorkouts];

        const recentE1RM: Record<string, { name: string; e1rm: number }> = {};
        const baselineE1RM: Record<string, { name: string; e1rm: number }> = {};

        for (const w of recentWorkouts) {
            if (w.reps > 0 && w.reps <= 12 && w.totalWeight > 0) {
                const weight = normalizeWeight(w.totalWeight, w.unit || 'metric', unit);
                const e1rm = weight * (1 + w.reps / 30);
                if (!recentE1RM[w.exerciseId] || e1rm > recentE1RM[w.exerciseId].e1rm) {
                    recentE1RM[w.exerciseId] = { name: w.exerciseName, e1rm };
                }
            }
        }

        for (const w of baseline) {
            if (w.reps > 0 && w.reps <= 12 && w.totalWeight > 0) {
                const weight = normalizeWeight(w.totalWeight, w.unit || 'metric', unit);
                const e1rm = weight * (1 + w.reps / 30);
                if (!baselineE1RM[w.exerciseId] || e1rm > baselineE1RM[w.exerciseId].e1rm) {
                    baselineE1RM[w.exerciseId] = { name: w.exerciseName, e1rm };
                }
            }
        }

        // Find stalled lift: exercise present in both, e1RM change within +/- 2%
        let stalledLift: { name: string; weight: string } | null = null;
        for (const [exId, recent] of Object.entries(recentE1RM)) {
            const base = baselineE1RM[exId];
            if (!base) continue;
            const changePct = Math.abs((recent.e1rm - base.e1rm) / base.e1rm) * 100;
            if (changePct <= 2) {
                const displayWeight = formatWeight(recent.e1rm, unit);
                stalledLift = { name: recent.name, weight: displayWeight };
                break;
            }
        }

        if (stalledLift) {
            insights.push({
                id: 'overload-stall',
                icon: Minus,
                message: `${stalledLift.name} has plateaued around ${stalledLift.weight} e1RM. Try varying reps or adding weight.`,
                type: 'info',
                priority: 3,
            });
        }
    }

    // --- Weekly Summary ---
    if (recentWorkouts.length > 0) {
        const workoutDatesSet = new Set(
            recentWorkouts.map(w => startOfDay(new Date(w.date)).toISOString())
        );
        const activeDays = workoutDatesSet.size;

        const exerciseCounts: Record<string, number> = {};
        for (const w of recentWorkouts) {
            exerciseCounts[w.exerciseName] = (exerciseCounts[w.exerciseName] || 0) + w.sets;
        }
        const topExercise = Object.entries(exerciseCounts)
            .sort(([, a], [, b]) => b - a)[0];

        const totalSets = recentWorkouts.reduce((sum, w) => sum + w.sets, 0);

        if (activeDays >= 2 && topExercise) {
            insights.push({
                id: 'weekly-summary',
                icon: BarChart3,
                message: `This week: ${activeDays} days, ${totalSets} sets. Top focus: ${topExercise[0]} (${topExercise[1]} sets).`,
                type: 'info',
                priority: 5,
            });
        }
    }

    return insights;
}

function generateBalanceInsights(
    workouts: LocalWorkoutSet[]
): Insight[] {
    const insights: Insight[] = [];

    const now = new Date();
    const fourteenDaysAgo = subDays(now, 14);
    const recentWorkouts = workouts.filter(w => {
        try {
            return new Date(w.date) >= fourteenDaysAgo;
        } catch {
            return false;
        }
    });

    // Need at least 8 sets across multiple exercises to analyze balance meaningfully
    if (recentWorkouts.length < 4) return insights;

    // --- Muscle Group Balance ---
    // Count sets per category using the static EXERCISES lookup
    const categorySets: Record<string, number> = {};
    let categorizedCount = 0;

    for (const w of recentWorkouts) {
        const category = getPrimaryCategory(w.exerciseId);
        if (category) {
            categorySets[category] = (categorySets[category] || 0) + w.sets;
            categorizedCount++;
        }
    }

    // Only analyze if we could categorize enough workouts (at least 60%)
    const categoryEntries = Object.entries(categorySets);
    if (categorizedCount < recentWorkouts.length * 0.6 || categoryEntries.length < 2) {
        return insights;
    }

    const totalSets = categoryEntries.reduce((sum, [, sets]) => sum + sets, 0);
    if (totalSets < 8) return insights;

    // Sort categories by set count descending
    categoryEntries.sort(([, a], [, b]) => b - a);
    const [topCategory, topSets] = categoryEntries[0];
    const topPct = (topSets / totalSets) * 100;

    // Heavy concentration: one group has >60% of total sets with 3+ categories trained
    if (topPct > 60 && categoryEntries.length >= 3) {
        insights.push({
            id: 'balance-heavy',
            icon: Dumbbell,
            message: `${Math.round(topPct)}% of recent sets are ${topCategory}. Consider adding variety for balanced development.`,
            type: 'info',
            priority: 4,
        });
    } else if (categoryEntries.length >= 3 && topPct <= 45) {
        // Well-balanced: top category is <= 45% with 3+ categories
        insights.push({
            id: 'balance-good',
            icon: CheckCircle,
            message: `Training is well balanced across ${categoryEntries.length} muscle groups recently.`,
            type: 'positive',
            priority: 5,
        });
    }

    return insights;
}

function generateRestDayInsights(
    workouts: LocalWorkoutSet[]
): Insight[] {
    const insights: Insight[] = [];
    if (workouts.length === 0) return insights;

    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);

    // Get unique workout dates in last 7 days, sorted ascending
    const recentDates = [...new Set(
        workouts
            .filter(w => {
                try {
                    return new Date(w.date) >= sevenDaysAgo;
                } catch {
                    return false;
                }
            })
            .map(w => startOfDay(new Date(w.date)).getTime())
    )].sort((a, b) => a - b);

    if (recentDates.length < 3) return insights;

    // Detect consecutive training streak (3+ days in a row ending today or yesterday)
    let maxConsecutive = 1;
    let currentStreak = 1;

    for (let i = 1; i < recentDates.length; i++) {
        const gap = differenceInCalendarDays(new Date(recentDates[i]), new Date(recentDates[i - 1]));
        if (gap === 1) {
            currentStreak++;
            maxConsecutive = Math.max(maxConsecutive, currentStreak);
        } else {
            currentStreak = 1;
        }
    }

    // Check if the streak is current (includes today or yesterday)
    const lastTrainingDate = new Date(recentDates[recentDates.length - 1]);
    const daysSinceLast = differenceInCalendarDays(startOfDay(now), startOfDay(lastTrainingDate));
    const isStreakCurrent = daysSinceLast <= 1;

    // Only report consecutive-day streaks of 3+ that are current
    // This complements the Phase 2D recovery warning (which counts total active days)
    // by specifically targeting back-to-back training without rest
    if (maxConsecutive >= 3 && isStreakCurrent) {
        insights.push({
            id: 'rest-day-needed',
            icon: Calendar,
            message: `${maxConsecutive} consecutive training days. Schedule a rest day to support recovery and performance.`,
            type: 'warning',
            priority: 2,
        });
    }

    return insights;
}

function generateMomentumInsights(
    workouts: LocalWorkoutSet[]
): Insight[] {
    const insights: Insight[] = [];
    if (workouts.length === 0) return insights;

    const now = new Date();
    const today = startOfDay(now).getTime();

    // Get unique sorted workout dates (ascending)
    const uniqueDates = [...new Set(
        workouts.map(w => startOfDay(new Date(w.date)).getTime())
    )].sort((a, b) => a - b);

    if (uniqueDates.length === 0) return insights;

    const lastWorkoutDate = uniqueDates[uniqueDates.length - 1];
    const daysSinceLast = differenceInCalendarDays(today, new Date(lastWorkoutDate));

    // --- Streak Detection (Consecutive Days) ---
    // Only count as active streak if last workout was today or yesterday
    if (daysSinceLast <= 1) {
        let currentStreak = 1;
        for (let i = uniqueDates.length - 2; i >= 0; i--) {
            const gap = differenceInCalendarDays(new Date(uniqueDates[i + 1]), new Date(uniqueDates[i]));
            if (gap === 1) {
                currentStreak++;
            } else {
                break;
            }
        }

        if (currentStreak >= 3) {
            insights.push({
                id: 'momentum-streak',
                icon: Flame,
                message: `${currentStreak} day training streak! You're on fire.`,
                type: 'positive',
                priority: 2,
            });
        }
    }

    // --- Returning After Inactivity ---
    // If last workout is today/yesterday AND previous workout was 7+ days ago
    if (daysSinceLast <= 1 && uniqueDates.length >= 2) {
        const secondToLastDate = uniqueDates[uniqueDates.length - 2];
        const gapBetweenLastTwo = differenceInCalendarDays(new Date(lastWorkoutDate), new Date(secondToLastDate));

        if (gapBetweenLastTwo >= 7) {
            insights.push({
                id: 'momentum-returning',
                icon: Zap,
                message: 'Welcome back! Great job getting a session in after a break.',
                type: 'positive',
                priority: 2,
            });
        }
    }

    // --- Session Milestones ---
    // Total unique days trained
    const totalSessions = uniqueDates.length;
    if (totalSessions >= 10) {
        // Milestone every 10 sessions up to 50, then every 25
        const isMilestone = totalSessions <= 50 ? totalSessions % 10 === 0 : totalSessions % 25 === 0;
        
        // Only show if the milestone was hit today or yesterday
        if (isMilestone && daysSinceLast <= 1) {
            insights.push({
                id: 'milestone-sessions',
                icon: Trophy,
                message: `Milestone hit: ${totalSessions} total sessions logged. Consistent progress!`,
                type: 'positive',
                priority: 4,
            });
        }
    }

    return insights;
}

function generatePRInsights(
    workouts: LocalWorkoutSet[],
    useImperial: boolean
): Insight[] {
    const insights: Insight[] = [];
    if (workouts.length < 5) return insights;

    const unit = useImperial ? 'imperial' : 'metric';
    const now = new Date();
    const today = startOfDay(now).getTime();

    // Group workouts by exercise
    const exerciseGroups: Record<string, LocalWorkoutSet[]> = {};
    for (const w of workouts) {
        if (!exerciseGroups[w.exerciseId]) exerciseGroups[w.exerciseId] = [];
        exerciseGroups[w.exerciseId].push(w);
    }

    let topPR: { name: string, oldBest: number, newBest: number, pct: number } | null = null;

    for (const [id, sets] of Object.entries(exerciseGroups)) {
        if (sets.length < 2) continue;

        // Sort by date ascending to find history
        const sortedSets = [...sets].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const latestSet = sortedSets[sortedSets.length - 1];
        const daysSinceLatest = differenceInCalendarDays(today, startOfDay(new Date(latestSet.date)));
        
        // Only celebrate PRs from today or yesterday
        if (daysSinceLatest > 1) continue;

        // Calculate latest e1RM
        if (!(latestSet.reps > 0 && latestSet.reps <= 12 && latestSet.totalWeight > 0)) continue;
        const latestWeight = normalizeWeight(latestSet.totalWeight, latestSet.unit || 'metric', unit);
        const latestE1RM = latestWeight * (1 + latestSet.reps / 30);

        // Find all-time best BEFORE this latest set
        let allTimeBestBefore = 0;
        for (let i = 0; i < sortedSets.length - 1; i++) {
            const s = sortedSets[i];
            if (s.reps > 0 && s.reps <= 12 && s.totalWeight > 0) {
                const w = normalizeWeight(s.totalWeight, s.unit || 'metric', unit);
                const e = w * (1 + s.reps / 30);
                if (e > allTimeBestBefore) allTimeBestBefore = e;
            }
        }

        if (allTimeBestBefore > 0) {
            const diffPct = ((latestE1RM - allTimeBestBefore) / allTimeBestBefore) * 100;
            // Beats all-time best by > 2%
            if (diffPct > 2) {
                if (!topPR || diffPct > topPR.pct) {
                    topPR = {
                        name: latestSet.exerciseName,
                        oldBest: allTimeBestBefore,
                        newBest: latestE1RM,
                        pct: diffPct
                    };
                }
            }
        }
    }

    if (topPR) {
        insights.push({
            id: 'all-time-pr',
            icon: Trophy,
            message: `New all-time PR! Your e1RM for ${topPR.name} just hit ${formatWeight(topPR.newBest, unit)} (up ${Math.round(topPR.pct)}%).`,
            type: 'positive',
            priority: 2,
        });
    }

    return insights;
}

const typeStyles: Record<Insight['type'], { dot: string; text: string }> = {
    positive: { dot: 'bg-emerald-500', text: 'text-emerald-400' },
    neutral: { dot: 'bg-blue-500', text: 'text-blue-400' },
    warning: { dot: 'bg-amber-500', text: 'text-amber-400' },
    info: { dot: 'bg-zinc-500', text: 'text-zinc-400' },
};

export default function SmartInsights({ workouts, meals, tdeeProfile, weightEntries }: SmartInsightsProps) {
    const insights = useMemo(() => {
        const useImperial = !!tdeeProfile?.useImperial;
        const workoutInsights = generateWorkoutInsights(workouts, useImperial);
        const nutritionInsights = generateNutritionInsights(meals, tdeeProfile);
        const nutritionTrendInsights = generateNutritionTrendInsights(meals, tdeeProfile);
        const bodyweightInsights = generateBodyweightInsights(weightEntries, tdeeProfile, useImperial);
        const progressInsights = generateProgressInsights(workouts, useImperial);
        const balanceInsights = generateBalanceInsights(workouts);
        const restDayInsights = generateRestDayInsights(workouts);
        const momentumInsights = generateMomentumInsights(workouts);
        const prInsights = generatePRInsights(workouts, useImperial);

        // Combine, deduplicate by id, sort by priority, limit to 4
        const all = [
            ...workoutInsights,
            ...nutritionInsights,
            ...nutritionTrendInsights,
            ...bodyweightInsights,
            ...progressInsights,
            ...balanceInsights,
            ...restDayInsights,
            ...momentumInsights,
            ...prInsights,
        ];
        const seen = new Set<string>();
        const deduped = all.filter(i => {
            if (seen.has(i.id)) return false;
            seen.add(i.id);
            return true;
        });

        deduped.sort((a, b) => a.priority - b.priority);
        return deduped.slice(0, 4);
    }, [workouts, meals, tdeeProfile, weightEntries]);

    if (insights.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-xl p-4"
        >
            <div className="flex items-center gap-2 mb-3">
                <div className="bg-violet-600/20 p-1.5 rounded-lg">
                    <Brain size={14} className="text-violet-400" />
                </div>
                <h3 className="text-sm font-bold text-white">Smart Insights</h3>
            </div>

            <div className="space-y-2.5">
                <AnimatePresence mode="popLayout">
                    {insights.map((insight: Insight, idx) => {
                        const style = typeStyles[insight.type];
                        return (
                            <motion.div
                                key={insight.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 8 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-start gap-2.5"
                            >
                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    {insight.message}
                                </p>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
