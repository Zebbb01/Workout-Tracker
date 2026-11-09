'use client';

import { useEffect } from 'react';

/** The root layout itself crashed. Next renders this as its own document, so it brings its own styles. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <html lang="en" style={{ colorScheme: 'light dark' }}>
      <body style={{ margin: 0, minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 20, boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif', background: 'light-dark(#F8F7F5, #0E0C0B)', color: 'light-dark(#1C1917, #F7F5F2)' }}>
        <main style={{ maxWidth: 340 }}>
          <h1 style={{ fontSize: 28, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ margin: '0 0 20px', lineHeight: 1.45 }}>The app didn&apos;t start. What you&apos;ve logged is safe on this phone.</p>
          <button type="button" onClick={retry} style={{ font: 'inherit', fontWeight: 600, minHeight: 44, padding: '0 18px', border: 0, borderRadius: 8, color: '#fff', background: 'hsl(17 88% 40%)', cursor: 'pointer' }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
