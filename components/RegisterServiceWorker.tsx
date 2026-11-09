'use client';

import { useEffect } from 'react';

/**
 * Registers public/sw.js. Never on localhost: every project on this machine
 * shares localhost:3000, and a worker registered there answers for all of them.
 * The browser tests register it themselves.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (['localhost', '127.0.0.1'].includes(location.hostname)) return;
    // The site works the same without it, so a failure needs no message.
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}
