'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CloudCheck, CloudOff, CloudUpload, Dumbbell, House, Loader2, Menu, TrendingUp, Utensils, WifiOff } from 'lucide-react';
import { useData } from '@/lib/data';
import { cx } from './ui';

const TABS = [
  { href: '/', label: 'Today', icon: House },
  { href: '/log', label: 'Log', icon: Dumbbell },
  { href: '/meals', label: 'Meals', icon: Utensils },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/more', label: 'More', icon: Menu },
];

/** Bottom tabs on phones and tablets; a sidebar once the screen is wide enough to keep one open. */
export function Nav() {
  const path = usePathname();
  const links = TABS.map(({ href, label, icon: Icon }) => {
    const current = href === '/' ? path === '/' : path.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={current ? 'page' : undefined}
        className={cx(
          'flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-medium lg:flex-none lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-sm',
          current ? 'text-accent lg:bg-muted' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Icon size={22} strokeWidth={current ? 2.4 : 1.8} aria-hidden />
        {label}
      </Link>
    );
  });

  return (
    <>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-safe backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg px-2 py-1">{links}</div>
      </nav>
      <nav aria-label="Main" className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col gap-1 border-r border-border bg-card p-4 lg:flex">
        <Link href="/" className="mb-4 flex items-center gap-2 px-3 py-2 text-lg font-bold">
          <img src="/icon-192.png" alt="" width={28} height={28} className="rounded-lg" />
          Body Tracker
        </Link>
        {links}
      </nav>
    </>
  );
}

/** Says plainly where the person's entries are when the connection drops. */
export function OfflineBanner() {
  const { online, pending, syncError, firstSyncDone } = useData();
  if (!online) {
    return (
      <div role="status" className="mb-4 flex items-start gap-3 rounded-2xl bg-muted p-3 text-sm">
        <WifiOff size={18} className="mt-0.5 shrink-0" aria-hidden />
        <p>
          <strong>You&apos;re offline.</strong> Everything you log is saved on this phone and will sync when you&apos;re back online.
        </p>
      </div>
    );
  }
  if (syncError && pending > 0 && firstSyncDone) {
    return (
      <div role="status" className="mb-4 flex items-start gap-3 rounded-2xl bg-muted p-3 text-sm">
        <CloudOff size={18} className="mt-0.5 shrink-0" aria-hidden />
        <p>
          <strong>Not synced yet.</strong> {pending} {pending === 1 ? 'entry is' : 'entries are'} saved on this phone and will sync on the next try.
        </p>
      </div>
    );
  }
  return null;
}

/** The small sync state next to a page title. */
export function SyncBadge() {
  const { online, pending, syncing } = useData();
  const [Icon, text] = !online
    ? [CloudOff, 'Offline']
    : syncing
      ? [Loader2, 'Syncing']
      : pending > 0
        ? [CloudUpload, 'Saved on this phone']
        : [CloudCheck, 'Synced'];
  return (
    <span role="status" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground">
      <Icon size={16} className={cx(syncing && online && 'animate-spin')} aria-hidden />
      {text}
    </span>
  );
}
