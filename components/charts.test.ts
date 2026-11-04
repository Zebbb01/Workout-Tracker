import { describe, expect, it } from 'vitest';
import { niceTicks } from './charts';

describe('niceTicks', () => {
  it('covers the data with round steps', () => {
    expect(niceTicks(81.9, 84.7)).toEqual([81, 82, 83, 84, 85]);
    expect(niceTicks(0, 12_400)).toEqual([0, 5000, 10000, 15000]);
  });

  it('never makes steps finer than one, so labels never repeat', () => {
    const ticks = niceTicks(0, 1);
    expect(new Set(ticks.map(Math.round)).size).toBe(ticks.length);
    expect(niceTicks(68, 68)).toEqual([67, 68, 69]);
  });
});
