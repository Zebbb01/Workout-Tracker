export const KG_TO_LBS = 2.20462;
export const LBS_TO_KG = 0.453592;

/**
 * Normalizes weight to the target unit for comparison or aggregation.
 */
export function normalizeWeight(weight: number, fromUnit: 'metric' | 'imperial', toUnit: 'metric' | 'imperial'): number {
    if (fromUnit === toUnit) return weight;
    if (fromUnit === 'metric' && toUnit === 'imperial') return weight * KG_TO_LBS;
    if (fromUnit === 'imperial' && toUnit === 'metric') return weight * LBS_TO_KG;
    return weight;
}

/**
 * Formats a weight value with the appropriate unit label.
 */
export function formatWeight(weight: number, unit: 'metric' | 'imperial', decimals: number = 1): string {
    const label = unit === 'metric' ? 'kg' : 'lbs';
    return `${weight.toFixed(decimals)}${label}`;
}
