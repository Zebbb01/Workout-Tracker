'use client';

import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { Check, Compass, Download, Ellipsis, Link, Share, SquarePlus } from 'lucide-react';
import { iosBrowser, type IosBrowser } from '@/lib/install';
import { Button, Sheet } from './ui';

/**
 * Installing Body Tracker as an app.
 *
 * Chrome and Edge fire `beforeinstallprompt` once per page load when the site
 * qualifies, and only a click may answer it. It is caught when this module
 * loads, because it can fire before React hydrates. Safari never fires it, so
 * iPhones and iPads get a sheet with the steps instead.
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

/** iPhone or iPad in a browser tab, where only Safari's Share menu can install. */
function needsIosSteps() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
  return Boolean(ios && !installed);
}

/** 'prompt' where the browser offers Install, 'ios' for the Share steps, null when there is nothing to offer. */
export function useInstall(): 'prompt' | 'ios' | null {
  return useSyncExternalStore(
    subscribe,
    () => (held ? 'prompt' : needsIosSteps() ? 'ios' : null),
    () => null,
  );
}

export async function installApp(): Promise<void> {
  const prompt = held;
  if (!prompt) return;
  // A prompt answers one click; the browser offers a fresh one on a later visit.
  hold(null);
  await prompt.prompt().catch(() => {});
}

function Step({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 self-center">{children}</span>
    </li>
  );
}

/** Apple lets only the browser add to the Home Screen, so the app shows the way, for the browser it is really in. */
function IosSteps({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Add to Home Screen">
      {open && <IosStepsFor browser={iosBrowser(navigator.userAgent)} />}
    </Sheet>
  );
}

function IosStepsFor({ browser }: { browser: IosBrowser }) {
  const [copy, setCopy] = useState<'idle' | 'done' | 'failed'>('idle');

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.origin);
      setCopy('done');
    } catch (error) {
      console.error('Copy failed:', error);
      setCopy('failed');
    }
  }

  if (browser === 'in-app') {
    return (
      <>
        <p className="mb-4 text-muted-foreground">This app&apos;s built-in browser can&apos;t add to the Home Screen. Open Body Tracker in Safari first.</p>
        <ol className="space-y-3">
          <Step icon={<Link size={18} />}>
            Copy this address: <strong className="break-all">{location.host}</strong>
          </Step>
          <Step icon={<Compass size={18} />}>
            Open <strong>Safari</strong> and paste it in the address bar.
          </Step>
          <Step icon={<SquarePlus size={18} />}>
            Tap <strong>Add to Home Screen</strong> on that page and follow the steps.
          </Step>
        </ol>
        <Button variant="secondary" size="lg" block className="mt-4" onClick={copyLink}>
          {{ idle: 'Copy link', done: 'Link copied', failed: "Couldn't copy. Type the address above." }[copy]}
        </Button>
      </>
    );
  }

  return (
    <>
      {browser === 'safari' ? (
        <ol className="space-y-3">
          <Step icon={<Ellipsis size={18} />}>
            Tap <strong>•••</strong> next to the address bar.
            <span className="mt-0.5 block text-sm text-muted-foreground">No ••• button? Go to the next step: Share is in the toolbar.</span>
          </Step>
          <Step icon={<Share size={18} />}>
            Tap <strong>Share</strong>.
          </Step>
          <Step icon={<SquarePlus size={18} />}>
            Scroll down and tap <strong>Add to Home Screen</strong>.
          </Step>
          <Step icon={<Check size={18} />}>
            Tap <strong>Add</strong>. If you see <strong>Open as Web App</strong>, leave it on.
          </Step>
        </ol>
      ) : (
        <ol className="space-y-3">
          <Step icon={<Share size={18} />}>
            Tap <strong>Share</strong> in your browser&apos;s toolbar or menu.
          </Step>
          <Step icon={<SquarePlus size={18} />}>
            Tap <strong>Add to Home Screen</strong>. If it isn&apos;t there, open this page in Safari.
          </Step>
          <Step icon={<Check size={18} />}>
            Tap <strong>Add</strong>.
          </Step>
        </ol>
      )}
      <p className="mt-4 text-sm text-muted-foreground">Body Tracker then opens from its own icon and works with no signal.</p>
    </>
  );
}

/** The install row for Today and More. The steps go outside the list, because a dialog can't sit in a <ul>. */
export function useInstallRow() {
  const install = useInstall();
  const [open, setOpen] = useState(false);
  const row =
    install === 'prompt'
      ? { label: 'Install app', detail: 'Its own window, works offline', onClick: installApp }
      : install === 'ios'
        ? { label: 'Add to Home Screen', detail: 'A few quick steps', onClick: () => setOpen(true) }
        : null;
  return { row, steps: install === 'ios' ? <IosSteps open={open} onClose={() => setOpen(false)} /> : null };
}

const quietButton = 'inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground lg:h-10';

/** The Install button where the browser allows it, the steps on an iPhone, nothing elsewhere. */
export default function InstallApp() {
  const install = useInstall();
  const [open, setOpen] = useState(false);
  if (!install) return null;
  return (
    <>
      <button type="button" onClick={install === 'prompt' ? installApp : () => setOpen(true)} className={quietButton}>
        <Download size={18} aria-hidden />
        {install === 'prompt' ? 'Install app' : 'Add to Home Screen'}
      </button>
      {install === 'ios' && <IosSteps open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
