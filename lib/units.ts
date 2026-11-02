export const LBS_TO_KG = 0.45359237; // exact, by definition of the pound
export const KG_TO_LBS = 1 / LBS_TO_KG;

/**
 * Converts pounds to kilograms.
 */
export function lbsToKg(lbs: number): number {
    return lbs * LBS_TO_KG;
}

/**
 * Converts kilograms to pounds.
 */
export function kgToLbs(kg: number): number {
    return kg * KG_TO_LBS;
}

/**
 * Normalizes weight to the target unit for comparison or aggregation.
 */
export function normalizeWeight(weight: number, fromUnit: 'metric' | 'imperial', toUnit: 'metric' | 'imperial'): number {
    if (fromUnit === toUnit) return weight;
    if (fromUnit === 'metric' && toUnit === 'imperial') return kgToLbs(weight);
    if (fromUnit === 'imperial' && toUnit === 'metric') return lbsToKg(weight);
    return weight;
}

/**
 * Formats a weight value with the appropriate unit label.
 */
export function formatWeight(weight: number, unit: 'metric' | 'imperial', decimals: number = 1): string {
    const label = unit === 'metric' ? 'kg' : 'lbs';
    return `${weight.toFixed(decimals)}${label}`;
}
