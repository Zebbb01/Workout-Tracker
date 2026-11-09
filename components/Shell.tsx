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
  const { user } = useData();
  const isCurrent = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));

  return (
    <>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 pb-safe backdrop-blur-lg lg:hidden">
        <div className="mx-auto flex max-w-lg">
          {TABS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isCurrent(href) ? 'page' : undefined}
              className={cx(
                'flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                isCurrent(href) ? 'text-accent' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon size={21} strokeWidth={isCurrent(href) ? 2.3 : 1.8} aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <nav aria-label="Main" className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-border bg-card px-3 py-4 lg:flex">
        <Link href="/" className="mb-6 flex items-center gap-2.5 px-2">
          <img src="/icon-192.png" alt="" width={28} height={28} className="rounded-md" />
          <span className="font-display text-lg font-bold">Body Tracker</span>
        </Link>
        <div className="flex flex-col gap-0.5">
          {TABS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isCurrent(href) ? 'page' : undefined}
              className={cx(
                'flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors',
                isCurrent(href) ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <Icon size={18} strokeWidth={isCurrent(href) ? 2.2 : 1.8} className={isCurrent(href) ? 'text-accent' : undefined} aria-hidden />
              {label}
            </Link>
          ))}
        </div>
        <div className="mt-auto space-y-3 px-2">
          <SyncBadge />
          {user && <p className="truncate text-xs text-muted-foreground">{user.is_anonymous ? 'Guest' : user.email}</p>}
        </div>
      </nav>
    </>
  );
}

/** Says plainly where the person's entries are when the connection drops. */
export function OfflineBanner() {
  const { online, pending, syncError, firstSyncDone } = useData();
  const message = !online
    ? "Offline. What you log stays on this phone and syncs later."
    : syncError && pending > 0 && firstSyncDone
      ? `${pending} ${pending === 1 ? 'entry' : 'entries'} saved on this phone, not synced yet. It keeps trying on its own.`
      : null;
  if (!message) return null;
  return (
    <div role="status" className="mb-4 flex items-center gap-2.5 rounded-lg bg-muted px-3 py-2 text-sm animate-fade-in">
      {online ? <CloudOff size={16} className="shrink-0" aria-hidden /> : <WifiOff size={16} className="shrink-0" aria-hidden />}
      <p>{message}</p>
    </div>
  );
}

/** The sync state, small, next to a page title on phones and in the sidebar on desktops. */
export function SyncBadge({ className }: { className?: string }) {
  const { online, pending, syncing } = useData();
  const [Icon, text] = !online
    ? [CloudOff, 'Offline']
    : syncing
      ? [Loader2, 'Syncing']
      : pending > 0
        ? [CloudUpload, 'Saved on this phone']
        : [CloudCheck, 'Synced'];
  return (
    <span role="status" className={cx('inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground', className)}>
      <Icon size={14} className={cx(syncing && online && 'animate-spin')} aria-hidden />
      {text}
    </span>
  );
}
