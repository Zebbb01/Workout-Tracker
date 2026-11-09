/**
 * The README and portfolio screenshots, captured from the real app.
 *
 * Signs up a demo account on the Supabase the app points at (CI's local one:
 * see .github/workflows/screenshots.yml), fills it with six weeks of
 * fictional but realistic training, meals and weigh-ins through the same
 * Row-Level-Security-protected API the app uses, then photographs Today, a
 * meal being logged from a photo, the workout log and Progress, on a phone
 * (390×844 at 3x) and a desktop (1440×900), in the dark theme, as WebP.
 *
 * The meal photo is a real photo of a real meal, screenshots/meal.jpg. The AI
 * reply is fixed here so the images do not change from run to run; the
 * confirm step it fills is the app's own.
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { test, expect, type Browser, type Page } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { addDays, computeTargets, localDay } from '../lib/calc';

const OUT = 'docs/screenshots';
const MEAL_PHOTO = 'screenshots/meal.jpg';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};

// --- A fictional person's six weeks --------------------------------------------

let seed = 7;
const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const jitter = (n: number, spread: number) => Math.round((n + (random() - 0.5) * spread) * 10) / 10;
const at = (day: string, hour: number, minute = 0) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute).toISOString();
};

const WORKOUTS = [
  [['bench-press', 'Bench press', 60, 8], ['overhead-press', 'Overhead press', 37.5, 8], ['triceps-pushdown', 'Triceps pushdown', 25, 12]],
  [['deadlift', 'Deadlift', 100, 5], ['barbell-row', 'Barbell row', 55, 8], ['lat-pulldown', 'Lat pulldown', 50, 10]],
  [['squat', 'Barbell squat', 80, 5], ['romanian-deadlift', 'Romanian deadlift', 70, 8], ['calf-raise', 'Calf raise', 60, 15]],
] as const;

const MEALS = {
  breakfast: [['Oats with banana and peanut butter', 520, 18, 72, 17], ['Scrambled eggs on toast', 430, 26, 34, 20], ['Greek yogurt with berries and granola', 380, 24, 48, 9]],
  lunch: [['Chicken rice bowl with greens', 640, 45, 72, 15], ['Tuna sandwich and an apple', 520, 34, 62, 13], ['Beef burrito bowl', 710, 42, 78, 22]],
  dinner: [['Salmon, potatoes and broccoli', 620, 40, 52, 24], ['Chicken stir-fry with noodles', 680, 44, 80, 16], ['Lentil curry with rice', 590, 24, 96, 11]],
  snack: [['Protein shake', 180, 30, 8, 3], ['Apple and almonds', 250, 7, 25, 14], ['Cottage cheese and pineapple', 210, 22, 20, 4]],
} as const;

function sixWeeks(userId: string, today: string) {
  const sets: Record<string, unknown>[] = [];
  const meals: Record<string, unknown>[] = [];
  const weights: Record<string, unknown>[] = [];
  let session = 0;
  const working = new Map<string, number>();

  for (let back = 42; back >= 0; back--) {
    const day = addDays(today, -back);
    const weekday = new Date(`${day}T12:00:00`).getDay();

    if (back > 0 && random() > 0.15) weights.push({ id: randomUUID(), user_id: userId, weight_kg: jitter(84.6 - (42 - back) * 0.064, 0.5), measured_on: day });

    // Monday, Wednesday and Friday, rotating push, pull and legs. A lift goes up
    // when the last session went well, so progress comes in steps, not a ramp.
    if ([1, 3, 5].includes(weekday) || back === 0) {
      const plan = WORKOUTS[session++ % 3];
      let minute = 0;
      plan.forEach(([id, name, start, reps], i) => {
        const weight = (working.get(id) ?? start) + (working.has(id) && random() > 0.45 ? (i < 2 ? 2.5 : 1.25) : 0);
        working.set(id, weight);
        const count = back === 0 ? [3, 2, 0][i] : 3;
        for (let s = 0; s < count; s++) {
          sets.push({
            id: randomUUID(), user_id: userId, exercise_id: id, exercise_name: name,
            weight_kg: weight, reps: s === 2 && random() > 0.5 ? reps - 1 - Math.floor(random() * 2) : reps,
            performed_at: at(day, 18, (minute += 3)),
          });
        }
      });
    }

    const pick = (list: readonly (readonly [string, number, number, number, number])[]) => list[Math.floor(random() * list.length)];
    const plan: [keyof typeof MEALS, number][] = back === 0 ? [['breakfast', 7], ['lunch', 12]] : [['breakfast', 7], ['lunch', 12], ['snack', 16], ['dinner', 19]];
    for (const [type, hour] of plan) {
      const [name, calories, protein, carbs, fat] = pick(MEALS[type]);
      meals.push({
        id: randomUUID(), user_id: userId, name, meal_type: type, calories, protein_g: protein, carbs_g: carbs, fat_g: fat,
        source: random() > 0.5 ? 'photo' : 'manual', eaten_at: at(day, hour, Math.floor(random() * 50)),
      });
    }
  }
  return { sets, meals, weights };
}

/** Signs up the demo person and stores their history; returns the session cookies the app reads. */
async function seedDemoAccount() {
  let jar: { name: string; value: string }[] = [];
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => jar,
      setAll(list) {
        jar = list.map(({ name, value }) => ({ name, value }));
      },
    },
  });
  // CI's Supabase is new on every run, so one fixed, fictional address is enough.
  const { data, error } = await supabase.auth.signUp({ email: 'demo@example.com', password: randomUUID() });
  if (error || !data.user) throw error ?? new Error('No user');
  const userId = data.user.id;

  const today = localDay(new Date());
  const { sets, meals, weights } = sixWeeks(userId, today);
  const targets = computeTargets({ sex: 'male', age: 31, heightCm: 178, weightKg: 84, activity: 'moderate', goal: 'lose' });
  const writes = [
    supabase.from('profiles').insert({ user_id: userId, units: 'metric', goal: 'lose', sex: 'male', age: 31, height_cm: 178, activity: 'moderate', ...targets, onboarded_at: at(addDays(today, -42), 8) }),
    supabase.from('workout_sets').insert(sets),
    supabase.from('meals').insert(meals),
    supabase.from('weight_entries').insert(weights),
  ];
  for (const { error: writeError } of await Promise.all(writes)) if (writeError) throw writeError;
  return jar;
}

// --- Capturing -----------------------------------------------------------------

/** Playwright writes PNG; the browser's own encoder turns it into WebP. */
async function saveWebp(page: Page, name: string) {
  const png = await page.screenshot();
  const webp = await page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d')!.drawImage(image, 0, 0);
    return canvas.toDataURL('image/webp', 0.9).split(',')[1];
  }, png.toString('base64'));
  await writeFile(`${OUT}/${name}.webp`, Buffer.from(webp, 'base64'));
}

async function open(browser: Browser, size: keyof typeof SIZES, cookies: { name: string; value: string }[], baseURL: string) {
  const context = await browser.newContext({ ...SIZES[size], colorScheme: 'dark', baseURL });
  await context.addCookies(cookies.map((c) => ({ ...c, url: baseURL })));
  const page = await context.newPage();
  await page.route('**/api/nutrition', (route) =>
    route.fulfill({ json: { name: 'Chicken rice bowl with greens', calories: 640, protein_g: 45, carbs_g: 72, fat_g: 15 } }),
  );
  return page;
}

async function settle(page: Page, path: string, heading: string) {
  await page.goto(path);
  await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
  // Phones show the sync badge only in some page headers; the sidebar's copy is always in the page.
  await expect(page.getByRole('status', { includeHidden: true }).filter({ hasText: 'Synced' }).first()).toBeAttached({ timeout: 20_000 });
  await page.mouse.move(0, 0);
  // Rings and bars animate to their values once the data arrives.
  await page.waitForTimeout(1200);
}

test('capture the README and portfolio screenshots', async ({ browser, baseURL }) => {
  test.setTimeout(240_000);
  await mkdir(OUT, { recursive: true });
  const cookies = await seedDemoAccount();

  for (const size of ['phone', 'desktop'] as const) {
    const page = await open(browser, size, cookies, baseURL!);

    await settle(page, '/', 'Today');
    await saveWebp(page, `today-${size}`);

    await settle(page, '/log', 'Log');
    await saveWebp(page, `log-${size}`);

    await settle(page, '/progress', 'Progress');
    await saveWebp(page, `progress-${size}`);

    await settle(page, '/meals', 'Meals');
    await saveWebp(page, `meals-${size}`);

    await settle(page, '/more', 'More');
    await saveWebp(page, `more-${size}`);

    await settle(page, '/log/guide', 'Exercises');
    await saveWebp(page, `guide-${size}`);

    await page.getByRole('button', { name: /^Bench press/ }).click();
    // Paused, both positions show at once, which suits a still picture.
    await page.getByRole('dialog').getByRole('button', { name: 'Pause and show both positions' }).click();
    await page.waitForTimeout(600);
    await saveWebp(page, `guide-exercise-${size}`);

    if (existsSync(MEAL_PHOTO)) {
      await settle(page, '/meals', 'Meals');
      await page.getByRole('button', { name: 'Add meal' }).click();
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Take a photo' }).click();
      await (await chooser).setFiles(MEAL_PHOTO);
      await expect(page.getByLabel('Meal name')).toHaveValue('Chicken rice bowl with greens');
      await saveWebp(page, `meal-photo-${size}`);
    } else {
      console.warn(`No ${MEAL_PHOTO}: skipped the meal-photo screenshots. Add a photo of a real meal to capture them.`);
    }
    await page.context().close();
  }
});
