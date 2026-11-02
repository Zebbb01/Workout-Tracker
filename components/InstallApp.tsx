'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { Download, Share } from 'lucide-react';

/**
 * Installing Body Tracker as an app.
 *
 * Chrome and Edge fire `beforeinstallprompt` once per page load when the site
 * qualifies, and only a click may answer it. It is caught when this module
 * loads, because it can fire before React hydrates. Safari never fires it, so
 * iPhones and iPads get the Share → Add to Home Screen steps instead.
 */
type InstallPrompt = Event & { prompt: () => Promise<void> };

let held: InstallPrompt | null = null;
const listeners = new Set<() => void>();

function hold(prompt: InstallPrompt | null) {
  held = prompt;
  listeners.forEach((notify) => notify());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    hold(event as InstallPrompt);
  });
  window.addEventListener('appinstalled', () => hold(null));
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

const noop = () => () => {};

/** iPhone or iPad in a browser tab, where only Safari's Share menu can install. */
function needsIosSteps() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
  return ios && !installed;
}

export function useCanInstallApp(): boolean {
  return useSyncExternalStore(subscribe, () => held !== null, () => false);
}

export async function installApp(): Promise<void> {
  const prompt = held;
  if (!prompt) return;
  // A prompt answers one click; the browser offers a fresh one on a later visit.
  hold(null);
  await prompt.prompt().catch(() => {});
}

/** The Install button where the browser allows it, iPhone steps on iOS, nothing elsewhere. */
export default function InstallApp() {
  const canInstall = useCanInstallApp();
  const iosSteps = useSyncExternalStore(noop, needsIosSteps, () => false);

  if (canInstall) {
    return (
      <button
        type="button"
        onClick={installApp}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-white hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
      >
        <Download size={18} aria-hidden />
        Install app
      </button>
    );
  }
  if (iosSteps) {
    return (
      <p className="text-sm text-zinc-300">
        Install on iPhone: tap <Share size={16} aria-label="Share" className="inline -mt-1" /> Share, then{' '}
        <strong>Add to Home Screen</strong>.
      </p>
    );
  }
  return null;
}

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
