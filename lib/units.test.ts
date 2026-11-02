import { describe, expect, it } from 'vitest';
import { formatWeight, kgToLbs, lbsToKg, normalizeWeight } from './units';
import { calculateBMR, calculateComplete, cmToFeetInches, feetInchesToCm } from './tdee';

describe('units', () => {
  it('converts kg and lb with the exact international pound', () => {
    expect(kgToLbs(100)).toBeCloseTo(220.462, 3);
    expect(lbsToKg(225)).toBeCloseTo(102.058, 3);
    expect(lbsToKg(kgToLbs(80))).toBeCloseTo(80, 10);
  });

  it('normalizes only when the units differ', () => {
    expect(normalizeWeight(60, 'metric', 'metric')).toBe(60);
    expect(normalizeWeight(60, 'metric', 'imperial')).toBeCloseTo(132.277, 3);
  });

  it('formats with the unit label', () => {
    expect(formatWeight(72.46, 'metric')).toBe('72.5kg');
    expect(formatWeight(160, 'imperial', 0)).toBe('160lbs');
  });

  it('converts height both ways', () => {
    expect(feetInchesToCm(5, 10)).toBeCloseTo(177.8, 5);
    expect(cmToFeetInches(177.8)).toEqual({ feet: 5, inches: 10 });
  });
});

describe('tdee', () => {
  it('uses Mifflin-St Jeor', () => {
    expect(calculateBMR(70, 175, 30, 'male')).toBeCloseTo(1648.75, 5);
    expect(calculateBMR(70, 175, 30, 'female')).toBeCloseTo(1482.75, 5);
  });

  it('derives goals and macros from TDEE', () => {
    const r = calculateComplete({ age: 30, gender: 'male', weight: 70, height: 175, activityLevel: 'moderate' });
    expect(r.tdee).toBe(2556);
    expect([r.cutting, r.maintenance, r.bulking]).toEqual([2056, 2556, 3056]);
    expect(r.macros).toEqual({ protein: 192, carbs: 256, fat: 85 });
  });
});
