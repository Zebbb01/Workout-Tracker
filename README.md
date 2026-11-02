# Body Tracker

Log workouts, meals and body weight from your phone, and see your progress.
Live at **https://body-tracker-iota.vercel.app**.

> **Status (0.2.0):** installable app shell, tests and CI. The relaunch on a new
> Supabase project (sign in without an account, sync, a simpler phone-first UI)
> is in progress and lands in 0.3.0.

## Install it

- **Android, Chrome or Edge on desktop:** open the site and tap **Install app**
  (or the install icon in the address bar).
- **iPhone and iPad:** open the site in Safari, tap **Share**, then **Add to Home Screen**.

Installed, it opens in its own window. Pages you have opened once still open
without a connection.

## Run it locally

Requires Node 22.

```bash
npm install
cp .env.example .env   # then fill in the values
npm run dev            # http://localhost:3000
```

## Tests

```bash
npm test               # Vitest unit tests
npm run test:e2e       # Playwright, against a production build on port 3100
npm run lint && npm run typecheck
```

GitHub Actions runs all of them on every push.

## How it is built

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Dexie (IndexedDB),
a hand-written service worker (`public/sw.js`) and web app manifest
(`app/manifest.ts`). Branches follow Gitflow: features merge into `develop`,
releases into `main`, which Vercel deploys.
