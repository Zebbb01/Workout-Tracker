// Builds the exercise guide from Everkinetic's open data (CC BY-SA 4.0): keeps the exercises
// worth listing, lines up each pair of drawings so only the body moves, and writes
// public/exercises/*.webp and lib/guide-data.json. Run `node scripts/import-exercises.mjs`.
//
// Exercise ids are stored with every logged set, so never change one here.
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp'; // comes with Next

const SOURCE = 'https://raw.githubusercontent.com/everkinetic/data/master/dist';
const CACHE = path.join(tmpdir(), 'everkinetic');
const OUT = 'public/exercises';
const FRAME = 640;
const THUMB = 128;

// Exercises the app already had. Their ids stay, so history and "last time" carry over.
const BUILT_IN = {
  'Barbell Squat': ['squat', 'Barbell squat'],
  'Leg Press': ['leg-press', 'Leg press'],
  'Lunges: Dumbbell': ['lunge', 'Lunges'],
  'Romanian Dead Lift': ['romanian-deadlift', 'Romanian deadlift'],
  'Lying Leg Curl Machine': ['leg-curl', 'Leg curl'],
  'Standing Calf Raises using Machine': ['calf-raise', 'Calf raise'],
  'Dead Lifts: Barbell': ['deadlift', 'Deadlift'],
  'Pull Ups': ['pull-up', 'Pull-ups'],
  'Pull Down: Underhand': ['lat-pulldown', 'Lat pulldown'],
  'Seated Cable Rows': ['seated-row', 'Seated row'],
  'Bench Press: Barbell': ['bench-press', 'Bench press'],
  'Bench Press: Barbell (Incline)': ['incline-bench', 'Incline bench press'],
  'Bench Press: Dumbbell': ['dumbbell-bench-press', 'Dumbbell bench press'],
  'Push Up: Body Weight': ['push-up', 'Push-ups'],
  'Dumbbell Flys': ['dumbbell-fly', 'Dumbbell fly'],
  'Seated Military Press': ['overhead-press', 'Overhead press'],
  'Lateral Dumbbell Raises': ['lateral-raise', 'Lateral raise'],
  'Biceps Curl: Barbell': ['bicep-curl', 'Barbell curl'],
  'Biceps Curl: Dumbbell': ['dumbbell-curl', 'Dumbbell curl'],
  'Triceps Extension: Dumbbell (Standing)': ['tricep-extension', 'Triceps extension'],
  'Triceps Pushdown: Cable': ['triceps-pushdown', 'Triceps pushdown'],
};

// Everyday moves for a beginner; these list first within a body part.
const COMMON = new Set([
  ...Object.keys(BUILT_IN), 'Bench Dips', 'Body Row', 'Bridging', 'Chest Dips', 'Close Triceps Pushup', 'Crunches', 'Flat Bench Leg Raises', 'Flutter Kicks',
  'Air Bike', 'Side Plank', 'Supermans', 'Triceps Dips: Body Weight', 'Narrow Parallel Grip Chin-ups', 'Squats: Dumbbells', 'Step Ups: Dumbbell', 'Barbell Shrugs', 'Biceps Curl: Dumbbell (Hammer)', 'Concentration Curls with Dumbbell',
  'Front Dumbbell Raise', 'Triceps Kickback with Dumbbell', 'Incline Dumbbell Press', 'Cable Crossover', 'Leg Extensions', 'Seated Leg Curl', 'Hyperextensions', 'T-Bar Rows', 'Dead Lifts: Dumbbell',
]);

// Balance-toy and rehab variations that would only crowd the list.
const LEAVE_OUT = /bosu|dome|stability ball|exercise ball|medicine ball|swiss ball|ball wall|weighted ball|ankle circles|knee circles|static neck|neck press|draw in|stork stance|balance/i;

// Standing lifts whose drawings stop at the legs.
const GROUNDED = /squat|dead ?lift|lunge|good morning/i;

const RENAME = {
  'Bridging': 'Glute bridge',
  'Body Row': 'Inverted row',
  'Air Bike': 'Bicycle crunch',
  'Supermans': 'Superman',
  'Crunches': 'Crunch',
  'Flutter Kicks': 'Flutter kicks',
  'Close Triceps Pushup': 'Close-grip push-up',
  'Narrow Parallel Grip Chin-ups': 'Chin-up',
  'Wide Grip Chin Up': 'Wide-grip pull-up',
  'Triceps Dips: Body Weight': 'Triceps dips',
  'Push Up: Bench (Feet Elevated)': 'Decline push-up',
  'One Armed Biased Push Up': 'One-arm biased push-up',
  'Biceps Curl: Dumbbell (Hammer)': 'Hammer curl',
  'Dead Lifts: Dumbbell': 'Dumbbell deadlift',
  'Dead Lifts: Smith Machine': 'Smith machine deadlift',
  'Dead Lift: Barbell (Biceps Curl)': 'Deadlift to biceps curl',
  'Dead Lift: Barbell (One Arm Side)': 'One-arm side deadlift',
  'Dumbbell Flys': 'Dumbbell fly',
  'Barbell Shrugs': 'Barbell shrug',
  'T-Bar Rows': 'T-bar row',
  'Flat Bench Leg Raises': 'Leg raise',
  'Body Leg Lifts': 'Lying leg lift',
  'Squats: Dumbbells': 'Dumbbell squat',
  'Step Ups: Dumbbell': 'Dumbbell step-up',
  'Step Ups: Barbell': 'Barbell step-up',
  'Pull Down: V Bar ': 'V-bar pulldown',
  'JM Press': 'JM press',
  'Hyperextensions': 'Back extension',
  'Good Mornings: Barbell': 'Barbell good morning',
  'Good Mornings: Smith Machine': 'Smith machine good morning',
};

const MUSCLE = {
  'pectoralis major': 'Chest', 'triceps brachii': 'Triceps', 'biceps brachii': 'Biceps', bicpes: 'Biceps', deltoid: 'Shoulders', 'deltoideus (clavicula)': 'Shoulders', should: 'Shoulders',
  quadriceps: 'Quads', 'ischiocrural muscles': 'Hamstrings', gastrocnemius: 'Calves', soleus: 'Calves', 'glutaeus maximus': 'Glutes', 'hip abductors': 'Hips', 'latissimus dorsi': 'Lats',
  trapezius: 'Traps', 'erector spinae': 'Lower back', abdominals: 'Abs', obliques: 'Obliques', forearm: 'Forearms', forerm: 'Forearms', core: 'Core', 'upper back': 'Upper back', back: 'Upper back',
};

const AREA = {
  Chest: 'Chest', Triceps: 'Triceps', Biceps: 'Biceps', Shoulders: 'Shoulders', Quads: 'Legs', Hamstrings: 'Legs', Calves: 'Legs', Glutes: 'Legs', Hips: 'Legs',
  Lats: 'Back', Traps: 'Back', 'Lower back': 'Back', 'Upper back': 'Back', Abs: 'Core', Obliques: 'Core', Core: 'Core', Forearms: 'Biceps',
};

function gearOf(equipment) {
  const gear = new Set();
  for (const raw of equipment) {
    const e = raw.toLowerCase();
    if (e === 'body' || e === 'bar' || e === 'pull-up bar' || e === 'parallel bars') gear.add('Bodyweight');
    else if (e.startsWith('dumbbell')) gear.add('Dumbbell');
    else if (e === 'barbell') gear.add('Barbell');
    else if (e === 'cable') gear.add('Cable');
    else if (e.includes('machine')) gear.add('Machine');
    else if (e === 'exercise band') gear.add('Band');
  }
  return gear.size ? [...gear] : ['Other'];
}

const KEEP_CASE = new Set(['EZ', 'JM', 'V', 'Zottman', 'Romanian', 'Jefferson', 'Smith', 'Zecher', 'Tate']);

function sentenceCase(text) {
  return text
    .split(' ')
    .map((word, i) => {
      const bare = word.replace(/[^\w]/g, '');
      if (KEEP_CASE.has(bare)) return word;
      return i === 0 ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word.toLowerCase();
    })
    .join(' ');
}

/** "Bench Press: Barbell (Incline)" reads as "Incline barbell bench press". */
function cleanName(title) {
  if (RENAME[title]) return RENAME[title];
  const typed = title.trim().replace(/Balll/g, 'Ball').replace(/’/g, "'").replace(/Fly's/g, 'Flys').replace(/Pushup/g, 'Push-up');
  const m = typed.match(/^([^:]+):\s*([^(]+?)\s*(?:\(([^)]*)\))?$/);
  const name = m ? [m[3], m[2], m[1]].filter(Boolean).join(' ').replace(/,/g, '') : typed;
  return sentenceCase(name.replace(/\bBicep\b/g, 'Biceps').replace(/\bDead Lifts?\b/g, 'Deadlift'));
}

const TYPOS = [
  [/Place you hands/g, 'Place your hands'], [/on the either side/g, 'on either side'], [/’/g, "'"], [/\s+/g, ' '], [/\bones\b/g, "one's"],
];

const fix = (text) => TYPOS.reduce((t, [from, to]) => t.replace(from, to), text).trim();

/** The source opens many step lists with an advert for the exercise and ends with "Repeat." */
function cleanSteps(steps) {
  const lines = [];
  let note;
  for (const raw of steps) {
    const text = fix(raw);
    const noted = text.match(/^(?:note|tip)s?:\s*(.+)$/i);
    if (noted) {
      note = noted[1][0].toUpperCase() + noted[1].slice(1);
      continue;
    }
    if (!lines.length && /^(this is|this exercise|this movement|these are|an exercise|a great|one of the|here is how|the .{0,40}exercise (is|for))/i.test(text)) continue;
    if (/^repeat[.!]?$/i.test(text) || /<\w+>/.test(text)) continue;
    if (text) lines.push(text);
  }
  return { steps: lines, note };
}

async function fetchCached(file) {
  const local = path.join(CACHE, file.replace(/\//g, '_'));
  if (existsSync(local)) return readFile(local);
  const response = await fetch(`${SOURCE}/${file}`);
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(local, bytes);
  return bytes;
}

/** Greyscale pixels, cropped to the ink, ink = high. */
async function ink(bytes) {
  const trimmed = await sharp(bytes).flatten({ background: '#fff' }).greyscale().trim({ background: '#fff', threshold: 40 }).toBuffer();
  const { data, info } = await sharp(trimmed).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data: Uint8Array.from(data, (v) => 255 - v), width: info.width, height: info.height, png: trimmed };
}

function shrink({ data, width, height }, factor) {
  const w = Math.floor(width / factor);
  const h = Math.floor(height / factor);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let j = 0; j < factor; j++) for (let i = 0; i < factor; i++) sum += data[(y * factor + j) * width + x * factor + i];
      out[y * w + x] = sum / (factor * factor);
    }
  }
  return { data: out, width: w, height: h };
}

function overlap(a, b, dx, dy) {
  let score = 0;
  for (let y = Math.max(0, dy); y < Math.min(a.height, b.height + dy); y++) {
    for (let x = Math.max(0, dx); x < Math.min(a.width, b.width + dx); x++) {
      const av = a.data[y * a.width + x];
      if (av) score += Math.min(av, b.data[(y - dy) * b.width + (x - dx)]);
    }
  }
  return score;
}

/**
 * Where b sits on a so the parts that do not move (bench, bar, feet) land on each other, coarse
 * to fine. `ground` is for standing lifts drawn cut off at the legs: their bottom edges line up,
 * so the head visibly rises and falls instead of the legs growing out of a still torso.
 */
function align(a, b, ground) {
  let dx = 0;
  let dy = 0;
  for (const [factor, reach] of [[16, 0], [8, 2], [4, 2], [2, 2]]) {
    const small = [shrink(a, factor), shrink(b, factor)];
    const range = reach === 0 ? null : reach;
    let best = -1;
    let bestAt = [0, 0];
    const xs = range === null ? [-small[1].width + 1, small[0].width - 1] : [dx * 2 - range, dx * 2 + range];
    const floor = small[0].height - small[1].height;
    const ys = ground ? [floor, floor] : range === null ? [-small[1].height + 1, small[0].height - 1] : [dy * 2 - range, dy * 2 + range];
    for (let y = ys[0]; y <= ys[1]; y++) {
      for (let x = xs[0]; x <= xs[1]; x++) {
        const score = overlap(small[0], small[1], x, y);
        if (score > best) {
          best = score;
          bestAt = [x, y];
        }
      }
    }
    [dx, dy] = bestAt;
  }
  return { dx: dx * 2, dy: dy * 2 };
}

const toWebp = (raw, side, size, quality) =>
  sharp(raw, { raw: { width: side, height: side, channels: 4 } })
    .resize(size, size, { kernel: 'lanczos3' })
    .webp({ quality, alphaQuality: quality, effort: 6 })
    .toBuffer();

/** Both frames on one square canvas, as black ink on transparent, so CSS can flip it for the dark theme. */
async function frames(id, first, second, ground) {
  const a = await ink(first);
  const b = await ink(second);
  const { dx, dy } = align(a, b, ground);
  const left = Math.min(0, dx);
  const top = Math.min(0, dy);
  const width = Math.max(a.width, b.width + dx) - left;
  const height = Math.max(a.height, b.height + dy) - top;
  const side = Math.round(Math.max(width, height) * 1.06);
  const offsetX = Math.round((side - width) / 2) - left;
  const offsetY = Math.round((side - height) / 2) - top;

  const paint = (f, x, y) => {
    const rgba = Buffer.alloc(side * side * 4);
    for (let row = 0; row < f.height; row++) {
      for (let col = 0; col < f.width; col++) {
        rgba[((row + y) * side + col + x) * 4 + 3] = f.data[row * f.width + col];
      }
    }
    return rgba;
  };
  const one = paint(a, offsetX, offsetY);
  const two = paint(b, offsetX + dx, offsetY + dy);
  await writeFile(`${OUT}/${id}-1.webp`, await toWebp(one, side, FRAME, 72));
  await writeFile(`${OUT}/${id}-2.webp`, await toWebp(two, side, FRAME, 72));
  await writeFile(`${OUT}/${id}-t.webp`, await toWebp(two, side, THUMB, 60));
}

// The everyday exercises in fewer, plainer words than the source (adapted, so still CC BY-SA).
const SHORT = JSON.parse(await readFile('scripts/guide-steps.json', 'utf8'));

// No drawing exists for these, so they teach in words and link to a video.
const WORDS_ONLY = [
  {
    id: 'plank', name: 'Plank', area: 'Core', gear: ['Bodyweight'], muscles: ['Abs', 'Shoulders', 'Glutes'],
    steps: ['Rest on your forearms and toes, elbows under your shoulders.', 'Squeeze your stomach and glutes so your body makes one straight line.', 'Hold, breathing steadily. Stop when your hips start to sag.'],
    note: 'Start with 20 seconds. Drop to your knees if your back aches.',
  },
  {
    id: 'bodyweight-squat', name: 'Bodyweight squat', area: 'Legs', gear: ['Bodyweight'], muscles: ['Quads', 'Glutes', 'Hamstrings'],
    steps: ['Stand with your feet shoulder width apart, toes turned out a little.', 'Push your hips back and bend your knees, keeping your chest up and heels down.', 'Go down until your thighs are about level with the floor.', 'Push through your heels to stand back up.'],
  },
  {
    id: 'bodyweight-lunge', name: 'Bodyweight lunge', area: 'Legs', gear: ['Bodyweight'], muscles: ['Quads', 'Glutes', 'Hamstrings'],
    steps: ['Stand tall with your hands on your hips.', 'Take a long step forward and lower your back knee toward the floor.', 'Keep your front knee over your ankle and your body upright.', 'Push off your front foot to come back, then switch legs.'],
  },
  {
    id: 'burpee', name: 'Burpee', area: 'Legs', gear: ['Bodyweight'], muscles: ['Quads', 'Chest', 'Abs'],
    steps: ['Stand, then squat and put your hands on the floor.', 'Jump your feet back into a push-up position.', 'Jump your feet back to your hands.', 'Stand and jump up with your arms overhead.'],
    note: 'Step instead of jumping until it feels easy.',
  },
  {
    id: 'mountain-climber', name: 'Mountain climber', area: 'Core', gear: ['Bodyweight'], muscles: ['Abs', 'Shoulders', 'Quads'],
    steps: ['Start at the top of a push-up with your hands under your shoulders.', 'Drive one knee toward your chest, then switch legs quickly.', 'Keep your hips low and your back flat.'],
  },
  {
    id: 'jumping-jack', name: 'Jumping jack', area: 'Legs', gear: ['Bodyweight'], muscles: ['Calves', 'Shoulders'],
    steps: ['Stand with your feet together and arms by your sides.', 'Jump your feet apart and raise your arms overhead.', 'Jump back to the start and keep a steady rhythm.'],
  },
  {
    id: 'pike-push-up', name: 'Pike push-up', area: 'Shoulders', gear: ['Bodyweight'], muscles: ['Shoulders', 'Triceps'],
    steps: ['Start at the top of a push-up, then walk your feet in and lift your hips high.', 'Bend your elbows and lower the top of your head toward the floor.', 'Press back up until your arms are straight.'],
  },
  {
    id: 'wall-sit', name: 'Wall sit', area: 'Legs', gear: ['Bodyweight'], muscles: ['Quads', 'Glutes'],
    steps: ['Lean your back against a wall and slide down until your knees are bent at a right angle.', 'Keep your feet flat and your knees over your ankles.', 'Hold, then press into the wall to stand up.'],
  },
  {
    id: 'face-pull', name: 'Face pull', area: 'Back', gear: ['Cable'], muscles: ['Shoulders', 'Traps'], common: true,
    steps: ['Set a rope on a cable at face height and hold one end in each hand.', 'Step back until your arms are straight and the weight is off the stack.', 'Pull the rope toward your face, elbows high and wide.', 'Pause, then let your arms straighten slowly.'],
  },
].map((entry) => ({ ...entry, drawn: false, common: entry.common ?? true }));

const data = JSON.parse(await fetchCachedFirst());

async function fetchCachedFirst() {
  await mkdir(CACHE, { recursive: true });
  return (await fetchCached('exercises.json')).toString('utf8');
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const seen = new Set();
const entries = [];
const pending = data.filter((x) => x.png?.length === 2 && !LEAVE_OUT.test(x.title));
for (const x of pending) {
  const [builtId, builtName] = BUILT_IN[x.title] ?? [];
  const name = builtName ?? cleanName(x.title);
  if (seen.has(name)) continue;
  seen.add(name);
  const id = builtId ?? x.name.slice(0, 60); // the database allows 60
  const muscles = [...new Set([...x.primary, ...x.secondary].map((m) => MUSCLE[m]).filter(Boolean))];
  const cleaned = cleanSteps(x.steps);
  const { steps, note } = { ...cleaned, ...SHORT[id] };
  entries.push({
    id, name, area: AREA[MUSCLE[x.primary[0]]], gear: gearOf(x.equipment), muscles, steps, ...(note && { note }),
    drawn: true, common: COMMON.has(x.title),
  });
  await frames(id, await fetchCached(x.png[0]), await fetchCached(x.png[1]), GROUNDED.test(x.title));
  if (entries.length % 40 === 0) console.log(entries.length, 'done');
}
// Everkinetic's drawing of this one survives on wger, not in the data repo.
const fromWger = async (file) => {
  const local = path.join(CACHE, `wger_${file}`);
  if (!existsSync(local)) await writeFile(local, Buffer.from(await (await fetch(`https://wger.de/media/exercise-images/109/${file}`)).arrayBuffer()));
  return readFile(local);
};
await frames('barbell-row', await fromWger('Barbell-rear-delt-row-1.png'), await fromWger('Barbell-rear-delt-row-2.png'));
entries.push({
  id: 'barbell-row', name: 'Barbell row', area: 'Back', gear: ['Barbell'], muscles: ['Lats', 'Upper back', 'Biceps'], drawn: true, common: true,
  steps: ['Hold a barbell with your hands just wider than your shoulders.', 'Bend at the hips with a flat back until your body is close to level with the floor.', 'Pull the bar to your lower chest, leading with your elbows.', 'Lower it under control until your arms are straight.'],
});

entries.push(...WORDS_ONLY);

// The lifts the app always had, then other everyday moves, then the rare variations.
const builtIn = new Set(Object.values(BUILT_IN).map(([id]) => id));
const order = (e) => (builtIn.has(e.id) || e.id === 'barbell-row' ? 0 : e.common ? 1 : 2);
entries.sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name));
await writeFile('lib/guide-data.json', `${JSON.stringify(entries, null, 1)}\n`);
await writeFile(
  `${OUT}/CREDITS.txt`,
  'Exercise drawings: Everkinetic (https://github.com/everkinetic/data), created by Greg Priday.\n' +
    'Licensed CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).\n' +
    'The barbell row drawing is also Everkinetic, CC BY-SA 3.0, from wger.de.\n' +
    'Adapted for Body Tracker: frames cropped and aligned, converted to WebP with a transparent background.\n',
);
console.log(entries.length, 'exercises,', entries.filter((e) => e.drawn).length, 'drawn');
