/**
 * Body Tracker's service worker, written by hand.
 *
 * Pages: network first, so a release reaches people the moment it ships. A
 * page that loaded once is kept, so it opens again at the gym with no signal;
 * a page never visited falls back to /offline.html.
 * Static files (/_next/static, icons): cache first. Their names change with
 * every build, so a cached copy is never stale.
 * Exercise drawings: cache first too, in their own cache, so scrolling the guide
 * can never push the app itself out.
 *
 * Never cached: anything that is not a GET, other origins (Supabase, the AI
 * provider), /api, /auth and Vercel's own /_vercel scripts. Entries live in
 * IndexedDB, not here.
 *
 * Change this file or offline.html? Bump VERSION so installed copies refresh.
 * Never delete it: a browser whose update check gets a 404 keeps the old
 * worker. proxy.ts must keep letting /sw.js through for the same reason.
 */
const VERSION = 'v3';
const CACHE = `shell-${VERSION}`;
const OFFLINE = '/offline.html';
const PRECACHE = [OFFLINE, '/icon-192.png', '/icon-512.png'];
const MAX_ENTRIES = 200;
const DRAWINGS = 'drawings-v1';
const MAX_DRAWINGS = 800; // every exercise's two frames and thumbnail

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.registration.navigationPreload?.enable(),
      caches
        .keys()
        .then((keys) => Promise.all(keys.filter((k) => k.startsWith('shell-') && k !== CACHE).map((k) => caches.delete(k)))),
    ]).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (/^\/(api|auth|_vercel)(\/|$)/.test(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(page(event));
  } else if (url.pathname.startsWith('/_next/static/') || /^\/[\w-]+\.(png|svg|webmanifest)$/.test(url.pathname)) {
    event.respondWith(staticFile(event));
  } else if (url.pathname.startsWith('/exercises/')) {
    event.respondWith(staticFile(event, DRAWINGS, MAX_DRAWINGS));
  }
});

async function page(event) {
  try {
    const response = (await event.preloadResponse) || (await fetch(event.request));
    // A redirect is a decision about who is signed in right now; never replay it.
    if (response.ok && !response.redirected) keep(event, event.request, response.clone());
    return response;
  } catch {
    return (
      (await caches.match(event.request, { ignoreSearch: true })) || (await caches.match(OFFLINE)) || Response.error()
    );
  }
}

async function staticFile(event, cacheName = CACHE, max = MAX_ENTRIES) {
  const cached = await caches.match(event.request);
  if (cached) return cached;
  const response = await fetch(event.request);
  if (response.ok) keep(event, event.request, response.clone(), cacheName, max);
  return response;
}

function keep(event, request, response, cacheName = CACHE, max = MAX_ENTRIES) {
  event.waitUntil(
    caches.open(cacheName).then(async (cache) => {
      await cache.put(request, response);
      // ponytail: drops the oldest entries past MAX_ENTRIES; old builds' chunks go first.
      const keys = (await cache.keys()).filter((k) => !PRECACHE.includes(new URL(k.url).pathname));
      await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
    })
  );
}
