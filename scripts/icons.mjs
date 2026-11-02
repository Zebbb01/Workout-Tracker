// Draws every app icon from one SVG. Run `node scripts/icons.mjs` after changing it.
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const BG = '#0C0A09';
const FG = '#F97316';

// A dumbbell on the diagonal, drawn around the centre of a 512 square.
const glyph = (scale) => `<g fill="${FG}" transform="translate(256 256) scale(${scale}) rotate(-45) translate(-256 -256)">
  <rect x="166" y="238" width="180" height="36" rx="10"/>
  <rect x="126" y="166" width="48" height="180" rx="16"/>
  <rect x="70" y="196" width="44" height="120" rx="16"/>
  <rect x="338" y="166" width="48" height="180" rx="16"/>
  <rect x="398" y="196" width="44" height="120" rx="16"/>
</g>`;

const svg = ({ radius, scale }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${radius}" fill="${BG}"/>${glyph(scale)}</svg>`;

// Maskable and Apple icons fill the square: the platform cuts its own shape,
// and the glyph has to stay inside the central 80% safe zone.
const icons = [
  { file: 'public/icon-192.png', size: 192, radius: 112, scale: 1 },
  { file: 'public/icon-512.png', size: 512, radius: 112, scale: 1 },
  { file: 'public/icon-maskable-512.png', size: 512, radius: 0, scale: 0.8 },
  { file: 'app/apple-icon.png', size: 180, radius: 0, scale: 0.85 },
];

await writeFile('app/icon.svg', svg({ radius: 112, scale: 1 }) + '\n');

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, ...look } of icons) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg(look)}`);
  await page.locator('svg').screenshot({ path: file, omitBackground: true });
}
await browser.close();
