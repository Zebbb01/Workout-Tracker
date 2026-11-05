import { describe, expect, it } from 'vitest';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { config } from './proxy';

const runs = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe('proxy matcher', () => {
  it('never touches the files that make the app installable', () => {
    for (const path of ['/manifest.webmanifest', '/sw.js', '/offline.html', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-icon.png', '/icon.svg']) {
      expect(runs(path), path).toBe(false);
    }
  });

  it('leaves API routes, the sign-in callback, the privacy page and Next assets alone', () => {
    expect(runs('/api/nutrition')).toBe(false);
    expect(runs('/auth/callback')).toBe(false);
    expect(runs('/privacy')).toBe(false);
    expect(runs('/_next/static/chunks/app.js')).toBe(false);
  });

  it('guards app pages and the welcome screen', () => {
    for (const path of ['/', '/log', '/meals', '/progress', '/more', '/onboarding', '/welcome']) {
      expect(runs(path), path).toBe(true);
    }
  });
});
