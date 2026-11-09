import { existsSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { AREAS, GEAR, GUIDE, searchGuide } from './guide';
import { EXERCISES } from './exercises';

const names = (query: string) => searchGuide(GUIDE, { query }).map((e) => e.name);

describe('searchGuide', () => {
  it('finds an exercise by name', () => {
    expect(names('bench')[0]).toBe('Bench press');
  });

  it('does not care how a name is spelled', () => {
    for (const query of ['pullup', 'pull up', 'Pull-ups', 'PULL UPS']) {
      expect(names(query), query).toContain('Pull-ups');
    }
  });

  it('understands everyday words for body parts', () => {
    expect(searchGuide(GUIDE, { query: 'arms' }).every((e) => e.area === 'Biceps' || e.area === 'Triceps')).toBe(true);
    expect(searchGuide(GUIDE, { query: 'abs' }).every((e) => e.muscles.includes('Abs') || e.area === 'Core')).toBe(true);
    const upper = searchGuide(GUIDE, { query: 'upper body' });
    expect(upper.length).toBeGreaterThan(50);
    expect(upper.some((e) => e.area === 'Legs')).toBe(false);
  });

  it('finds moves that need no equipment', () => {
    for (const query of ['no equipment', 'calisthenics', 'bodyweight']) {
      const found = searchGuide(GUIDE, { query });
      expect(found.map((e) => e.name), query).toContain('Push-ups');
      expect(found.every((e) => e.gear.includes('Bodyweight')), query).toBe(true);
    }
  });

  it('needs every word to match', () => {
    const found = searchGuide(GUIDE, { query: 'dumbbell biceps' });
    expect(found.length).toBeGreaterThan(5);
    expect(found.every((e) => e.gear.includes('Dumbbell'))).toBe(true);
  });

  it('lists exercises that train a muscle first, then ones that only help it', () => {
    const found = searchGuide(GUIDE, { query: 'triceps' });
    expect(found[0].area).toBe('Triceps');
    const firstHelper = found.findIndex((e) => e.area !== 'Triceps');
    expect(firstHelper).toBeGreaterThan(0);
    expect(found.slice(firstHelper).every((e) => e.area !== 'Triceps')).toBe(true);
  });

  it('narrows by body part and equipment', () => {
    const found = searchGuide(GUIDE, { area: 'Chest', gear: 'Dumbbell' });
    expect(found.length).toBeGreaterThan(3);
    expect(found.every((e) => e.area === 'Chest' && e.gear.includes('Dumbbell'))).toBe(true);
  });

  it('shows the everyday exercises before the rare variations', () => {
    const chest = searchGuide(GUIDE, { area: 'Chest' });
    const firstRare = chest.findIndex((e) => !e.common);
    expect(firstRare).toBeGreaterThan(2);
    expect(chest.slice(firstRare).some((e) => e.common)).toBe(false);
  });

  it('files a custom Arms exercise under both biceps and triceps', () => {
    const mine = { ...GUIDE[0], id: 'mine', name: 'My arm thing', area: 'Arms' };
    for (const area of ['Biceps', 'Triceps'] as const) {
      expect(searchGuide([mine], { area }).map((e) => e.id), area).toEqual(['mine']);
    }
  });

  it('returns nothing for a word it cannot match', () => {
    expect(names('zzzz')).toEqual([]);
  });
});

describe('the guide data', () => {
  it('keeps every exercise the app already had, under the same id', () => {
    const ids = new Set(GUIDE.map((e) => e.id));
    for (const e of EXERCISES) expect(ids.has(e.id), e.id).toBe(true);
  });

  it('has ids and names that fit the database and never repeat', () => {
    expect(new Set(GUIDE.map((e) => e.id)).size).toBe(GUIDE.length);
    expect(new Set(GUIDE.map((e) => e.name)).size).toBe(GUIDE.length);
    for (const e of GUIDE) {
      expect(e.id.length, e.id).toBeLessThanOrEqual(60);
      expect(e.name.length, e.id).toBeLessThanOrEqual(60);
    }
  });

  it('describes every exercise completely', () => {
    for (const e of GUIDE) {
      expect(AREAS, e.id).toContain(e.area);
      expect(e.steps.length, e.id).toBeGreaterThan(0);
      expect(e.muscles.length, e.id).toBeGreaterThan(0);
      for (const g of e.gear) expect([...GEAR, 'Other'], e.id).toContain(g);
      for (const step of e.steps) expect(step, e.id).not.toMatch(/<\w+>/);
    }
  });

  it('has both drawings and a thumbnail on disk for every drawn exercise', () => {
    for (const e of GUIDE.filter((x) => x.drawn)) {
      for (const part of ['1', '2', 't']) expect(existsSync(`public/exercises/${e.id}-${part}.webp`), `${e.id}-${part}`).toBe(true);
    }
  });

  it('draws the whole body, not a copy cropped at the legs', async () => {
    // The data repo's PNGs cut the low squat off at the knees, about half as tall as it is wide.
    const { data, info } = await sharp('public/exercises/squat-1.webp').ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
    const rows: number[] = [];
    const columns: number[] = [];
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[y * info.width + x] > 128) {
          rows.push(y);
          columns.push(x);
        }
      }
    }
    const height = rows[rows.length - 1] - rows[0];
    const width = columns.reduce((max, v) => Math.max(max, v), 0) - columns.reduce((min, v) => Math.min(min, v), info.width);
    expect(height / width).toBeGreaterThan(0.75);
  });

  it('covers no-equipment training', () => {
    expect(GUIDE.filter((e) => e.gear.includes('Bodyweight')).length).toBeGreaterThanOrEqual(25);
  });
});
