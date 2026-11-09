// The exercise guide: what each exercise works and how it is done. The data comes from
// scripts/import-exercises.mjs. Ids are stored with every set, so never change one.
import data from './guide-data.json';

export const AREAS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core'] as const;
export type Area = (typeof AREAS)[number];

export const GEAR = ['Bodyweight', 'Dumbbell', 'Barbell', 'Cable', 'Machine', 'Band'] as const;
export type Gear = (typeof GEAR)[number];

export type GuideEntry = {
  id: string;
  name: string;
  /** One of AREAS; a person's own exercise keeps the body part they picked. */
  area: string;
  gear: string[];
  /** Plain names, the main muscle first. */
  muscles: string[];
  steps: string[];
  note?: string | null;
  /** Has drawings in public/exercises. */
  drawn: boolean;
  common: boolean;
};

export const GUIDE = data as GuideEntry[];

// What people type instead of the names on the filters.
const AREA_WORDS: Record<string, string> = {
  Chest: 'upper body pecs',
  Back: 'upper body',
  Shoulders: 'upper body delts',
  Biceps: 'arms upper body',
  Triceps: 'arms upper body',
  Arms: 'arms upper body biceps triceps',
  Legs: 'lower body thighs',
  Core: 'abs stomach midsection',
};

const GEAR_WORDS: Record<string, string> = {
  Bodyweight: 'no equipment calisthenics home body weight',
};

const plain = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** The words that say what an exercise is. Muscles it only helps are searched, but rank lower. */
function mainText(e: GuideEntry) {
  const name = plain(e.name);
  return [name, name.replaceAll(' ', ''), plain(e.area), AREA_WORDS[e.area], plain(e.muscles[0] ?? ''), ...e.gear.flatMap((g) => [plain(g), GEAR_WORDS[g]])].join(' ');
}

// Matches from the start of a word: "bicep" finds biceps, but "arms" does not find forearms.
const hasWord = (text: string, word: string) => ` ${text}`.includes(` ${word}`);

const inArea = (e: GuideEntry, area: string) => e.area === area || (e.area === 'Arms' && (area === 'Biceps' || area === 'Triceps'));

/** Exercises matching every typed word, those mainly about it first, in the data's everyday-first order. */
export function searchGuide(entries: GuideEntry[], { query = '', area, gear }: { query?: string; area?: string | null; gear?: string | null }) {
  const words = plain(query).split(' ').filter(Boolean);
  const main: GuideEntry[] = [];
  const also: GuideEntry[] = [];
  for (const e of entries) {
    if ((area && !inArea(e, area)) || (gear && !e.gear.includes(gear))) continue;
    const text = mainText(e);
    const all = `${text} ${plain(e.muscles.slice(1).join(' '))}`;
    if (!words.every((w) => hasWord(all, w))) continue;
    (words.every((w) => hasWord(text, w)) ? main : also).push(e);
  }
  return [...main, ...also];
}

export const videoUrl = (name: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`How to do ${name} proper form`)}`;
