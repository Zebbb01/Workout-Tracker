import type { MetadataRoute } from 'next';

/**
 * Makes Body Tracker installable: Chrome and Edge offer Install, and phones add
 * it to the home screen, where it opens in its own window. Served at
 * /manifest.webmanifest, which proxy.ts must leave alone (proxy.test.ts checks).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // Fixed, so changing start_url later never turns installs into a second app.
    id: '/',
    name: 'Body Tracker',
    short_name: 'Body Tracker',
    description: 'Log workouts, meals and weight in a few taps, even offline.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0C0A09',
    theme_color: '#0C0A09',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
