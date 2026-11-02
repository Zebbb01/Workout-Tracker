// Calls the real Gemini model once, with your key from .env, and prints what
// the meal form would be filled with. Tests never call it; this is for you.
//
//   npm run check:ai -- "2 eggs and 2 slices of toast with butter"
//   npm run check:ai -- path/to/meal-photo.jpg
import { readFile } from 'node:fs/promises';
import { ENDPOINT, MODEL, geminiRequest, readEstimate, type EstimateInput } from '../lib/nutrition.ts';

const arg = process.argv[2] ?? '2 eggs and 2 slices of toast with butter';
const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error('Set GEMINI_API_KEY in .env first (aistudio.google.com/apikey).');
  process.exit(1);
}

const photo = /\.(jpe?g|png|webp)$/i.exec(arg);
const input: EstimateInput = photo
  ? { image: { mimeType: `image/${photo[1].toLowerCase().replace('jpg', 'jpeg')}`, base64: (await readFile(arg)).toString('base64') } }
  : { text: arg };

const started = Date.now();
const response = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
  body: JSON.stringify(geminiRequest(input)),
});
const body = await response.json();
console.log(`${MODEL}: HTTP ${response.status} in ${Date.now() - started} ms`);
if (!response.ok) {
  console.error(JSON.stringify(body.error ?? body, null, 2));
  process.exit(1);
}
console.log(readEstimate(body) ?? `No usable estimate. Raw reply: ${JSON.stringify(body).slice(0, 600)}`);
