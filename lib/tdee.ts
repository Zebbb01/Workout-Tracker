// TDEE Calculator Utilities
// Using Mifflin-St Jeor Formula (most accurate for modern populations)

export type Gender = 'male' | 'female';

export type ActivityLevel =
    | 'sedentary'      // Little or no exercise
    | 'light'          // Light exercise 1-3 days/week
    | 'moderate'       // Moderate exercise 3-5 days/week
    | 'active'         // Hard exercise 6-7 days/week
    | 'veryActive';    // Very hard exercise, physical job

export interface TDEEInput {
    age: number;           // years
    gender: Gender;
    weight: number;        // kg
    height: number;        // cm
    activityLevel: ActivityLevel;
}

export interface TDEEResult {
    bmr: number;           // Basal Metabolic Rate
    tdee: number;          // Total Daily Energy Expenditure
    sedentary: number;
    lightlyActive: number;
    moderatelyActive: number;
    veryActive: number;
    extraActive: number;
    // Goal-based calories
    cutting: number;       // 500 cal deficit
    maintenance: number;
    bulking: number;       // 500 cal surplus
    // Macros for maintenance (grams)
    macros: {
        protein: number;     // 30% of calories
        carbs: number;       // 40% of calories
        fat: number;         // 30% of calories
    };
}

// Activity multipliers for TDEE calculation
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, { title: string; description: string }> = {
    sedentary: {
        title: 'Sedentary',
        description: 'Little or no exercise, desk job',
    },
    light: {
        title: 'Lightly Active',
        description: 'Light exercise 1-3 days/week',
    },
    moderate: {
        title: 'Moderately Active',
        description: 'Moderate exercise 3-5 days/week',
    },
    active: {
        title: 'Very Active',
        description: 'Hard exercise 6-7 days/week',
    },
    veryActive: {
        title: 'Extra Active',
        description: 'Very hard exercise, physical job',
    },
};

/**
 * Calculate BMR using Mifflin-St Jeor formula
 * Most accurate formula for modern populations
 */
export function calculateBMR(weight: number, height: number, age: number, gender: Gender): number {
    // Base formula: (10 × weight in kg) + (6.25 × height in cm) − (5 × age in years)
    const base = (10 * weight) + (6.25 * height) - (5 * age);

    // Men: +5, Women: -161
    return gender === 'male' ? base + 5 : base - 161;
}

/**
 * Calculate TDEE based on BMR and activity level
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
    return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

/**
 * Calculate all TDEE values for different activity levels
 */
export function calculateAllTDEE(bmr: number): Record<ActivityLevel, number> {
    return {
        sedentary: Math.round(bmr * ACTIVITY_MULTIPLIERS.sedentary),
        light: Math.round(bmr * ACTIVITY_MULTIPLIERS.light),
        moderate: Math.round(bmr * ACTIVITY_MULTIPLIERS.moderate),
        active: Math.round(bmr * ACTIVITY_MULTIPLIERS.active),
        veryActive: Math.round(bmr * ACTIVITY_MULTIPLIERS.veryActive),
    };
}

/**
 * Calculate macro breakdown based on calories
 * Default ratio: 30% protein, 40% carbs, 30% fat
 */
export function calculateMacros(calories: number): { protein: number; carbs: number; fat: number } {
    return {
        protein: Math.round((calories * 0.30) / 4), // 4 cal per gram protein
        carbs: Math.round((calories * 0.40) / 4),   // 4 cal per gram carbs
        fat: Math.round((calories * 0.30) / 9),     // 9 cal per gram fat
    };
}

/**
 * Complete TDEE calculation with all results
 */
export function calculateComplete(input: TDEEInput): TDEEResult {
    const bmr = calculateBMR(input.weight, input.height, input.age, input.gender);
    const tdee = calculateTDEE(bmr, input.activityLevel);
    const allTDEE = calculateAllTDEE(bmr);

    return {
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        sedentary: allTDEE.sedentary,
        lightlyActive: allTDEE.light,
        moderatelyActive: allTDEE.moderate,
        veryActive: allTDEE.active,
        extraActive: allTDEE.veryActive,
        cutting: Math.round(tdee - 500),
        maintenance: Math.round(tdee),
        bulking: Math.round(tdee + 500),
        macros: calculateMacros(tdee),
    };
}

// Unit conversion helpers
export function lbsToKg(lbs: number): number {
    return lbs * 0.453592;
}

export function kgToLbs(kg: number): number {
    return kg / 0.453592;
}

export function feetInchesToCm(feet: number, inches: number): number {
    return (feet * 30.48) + (inches * 2.54);
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
}
