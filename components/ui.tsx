'use client';

import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronRight, Loader2, Minus, Plus, X } from 'lucide-react';

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

// --- Buttons -------------------------------------------------------------------

const variants = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground',
  secondary: 'bg-muted text-foreground hover:bg-muted/70 disabled:text-muted-foreground',
  outline: 'border border-input/70 text-foreground hover:bg-muted disabled:text-muted-foreground',
  ghost: 'text-foreground hover:bg-muted disabled:text-muted-foreground',
  danger: 'bg-negative/10 text-negative hover:bg-negative/15',
};
// 44px tall on touch screens; desktops get a tighter 40px.
const sizes = {
  sm: 'h-9 gap-1.5 px-3 text-sm',
  md: 'h-11 gap-2 px-4 text-base lg:h-10 lg:text-sm',
  lg: 'h-12 gap-2 px-5 text-base',
};

type ButtonStyle = { variant?: keyof typeof variants; size?: keyof typeof sizes; block?: boolean };
const buttonClass = ({ variant = 'primary', size = 'md', block }: ButtonStyle, extra?: string) =>
  cx(
    'inline-flex shrink-0 select-none items-center justify-center rounded-lg font-semibold transition active:scale-[0.98] disabled:pointer-events-none',
    variants[variant],
    sizes[size],
    block && 'w-full',
    extra,
  );

export function Button({ variant, size, block, busy, className, children, ...props }: ComponentProps<'button'> & ButtonStyle & { busy?: boolean }) {
  return (
    <button type="button" className={buttonClass({ variant, size, block }, className)} disabled={busy || props.disabled} aria-busy={busy || undefined} {...props}>
      {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, block, className, ...props }: ComponentProps<typeof Link> & ButtonStyle) {
  return <Link className={buttonClass({ variant, size, block }, className)} {...props} />;
}

/** An icon-only button: 40px to see, 44px to hit on a phone. The label is for screen readers. */
export function IconButton({ label, className, children, ...props }: ComponentProps<'button'> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-30 lg:size-9',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// --- Layout --------------------------------------------------------------------

export function Panel({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cx('rounded-xl border border-border bg-card', className)} {...props} />;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-5 flex items-center justify-between gap-3 lg:mb-6">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold lg:text-3xl">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

/** A labelled group: a small heading with an optional action on the right. */
export function Section({ title, action, className, children }: { title: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={className} aria-label={title}>
      <div className="mb-2 flex min-h-8 items-center justify-between gap-3">
        <h2 className="eyebrow">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-muted/60 px-4 py-6 text-center">
      <p className="font-semibold">{title}</p>
      {children && <p className="max-w-xs text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('animate-pulse rounded-lg bg-muted', className)} />;
}

/** The shape of a screen while its data loads, so nothing jumps when it arrives. */
export function ScreenSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}

const tones = {
  brand: 'bg-primary',
  protein: 'bg-protein',
  carbs: 'bg-carbs',
  fat: 'bg-fat',
  negative: 'bg-negative',
};

export function Meter({ value, max, label, tone = 'brand' }: { value: number; max: number; label: string; tone?: keyof typeof tones }) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} className="h-1.5 overflow-hidden rounded-full bg-muted">
      <div className={cx('h-full rounded-full transition-[width] duration-500', tones[tone])} style={{ width: `${percent}%` }} />
    </div>
  );
}

/** A progress ring with whatever belongs in its middle. */
export function Ring({ value, max, size = 132, stroke = 10, tone = 'brand', label, children }: {
  value: number; max: number; size?: number; stroke?: number; tone?: 'brand' | 'negative'; label: string; children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const fraction = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - fraction)}
          className={cx('transition-[stroke-dashoffset] duration-700', tone === 'negative' ? 'stroke-negative' : 'stroke-primary')}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

// --- Grouped list (settings style) ----------------------------------------------

export function List({ className, ...props }: ComponentProps<'ul'>) {
  return <ul className={cx('divide-y divide-border overflow-hidden rounded-xl border border-border bg-card', className)} {...props} />;
}

/** One row of a grouped list: a label on the left, a value or control on the right. */
export function Row({ label, detail, children, onClick, href, tone, icon }: {
  label: ReactNode; detail?: ReactNode; children?: ReactNode; onClick?: () => void; href?: string; tone?: 'danger' | 'accent'; icon?: ReactNode;
}) {
  const body = (
    <>
      {icon && <span className="text-muted-foreground" aria-hidden>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className={cx('block font-medium', tone === 'danger' && 'text-negative', tone === 'accent' && 'text-accent')}>{label}</span>
        {detail && <span className="block truncate text-sm text-muted-foreground">{detail}</span>}
      </span>
      {children}
      {(onClick || href) && !children && <ChevronRight size={18} className="text-muted-foreground" aria-hidden />}
    </>
  );
  const rowClass = 'flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left';
  return (
    <li>
      {href?.startsWith('/') ? (
        <Link href={href} className={cx(rowClass, 'hover:bg-muted/60')}>
          {body}
        </Link>
      ) : href ? (
        <a href={href} className={cx(rowClass, 'hover:bg-muted/60')} target="_blank" rel="noreferrer">
          {body}
        </a>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={cx(rowClass, 'transition hover:bg-muted/60')}>
          {body}
        </button>
      ) : (
        <div className={rowClass}>{body}</div>
      )}
    </li>
  );
}

// --- Inputs --------------------------------------------------------------------

// 16px text on every input: iOS zooms the page into anything smaller.
export const inputClass =
  'block h-11 w-full rounded-lg border border-input/70 bg-card px-3 text-[16px] text-foreground placeholder:text-muted-foreground/80 transition focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 lg:h-10';

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-sm text-muted-foreground">{hint}</span>}
    </label>
  );
}

/** Text that may be a decimal; the phone shows its number pad. */
export function NumberInput({ value, onChange, className, ...props }: Omit<ComponentProps<'input'>, 'value' | 'onChange'> & { value: string; onChange: (v: string) => void }) {
  return (
    <input
      inputMode="decimal"
      autoComplete="off"
      className={cx(inputClass, 'tabular', className)}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(',', '.'))}
      {...props}
    />
  );
}

/** − value + with big targets, for weight and reps at the gym. */
export function Stepper({ label, value, onChange, step, min = 0, max, unit }: {
  label: string; value: number; onChange: (v: number) => void; step: number; min?: number; max: number; unit?: string;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  const id = `stepper-${label.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium" id={id}>
        {label}
        {unit && <span className="font-normal text-muted-foreground"> ({unit})</span>}
      </span>
      <div className="flex h-12 items-stretch overflow-hidden rounded-lg border border-input/70 bg-card">
        <button type="button" aria-label={`Less ${label.toLowerCase()}`} onClick={() => set(value - step)} className="w-12 shrink-0 text-muted-foreground transition hover:bg-muted active:bg-muted">
          <Minus size={18} className="mx-auto" aria-hidden />
        </button>
        <div className="flex-1 border-x border-border">
          <input
            aria-labelledby={id}
            inputMode="decimal"
            className="font-display tabular h-full w-full bg-transparent text-center text-xl font-bold focus:outline-none"
            value={Number.isFinite(value) ? String(value) : ''}
            onChange={(e) => {
              const v = Number(e.target.value.replace(',', '.'));
              if (e.target.value === '') onChange(0);
              else if (Number.isFinite(v)) set(v);
            }}
          />
        </div>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} onClick={() => set(value + step)} className="w-12 shrink-0 text-muted-foreground transition hover:bg-muted active:bg-muted">
          <Plus size={18} className="mx-auto" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** A row of choices where exactly one is picked. `fit` keeps it as wide as its labels. */
export function Segmented<T extends string>({ label, options, value, onChange, fit, hideLabel }: {
  label: string; options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; fit?: boolean; hideLabel?: boolean;
}) {
  return (
    <fieldset className={fit ? 'inline-block' : undefined}>
      <legend className={hideLabel ? 'sr-only' : 'mb-1.5 text-sm font-medium'}>{label}</legend>
      <div className={cx('grid auto-cols-fr grid-flow-col gap-0.5 rounded-lg bg-muted p-0.5', fit && 'inline-grid')}>
        {options.map((o) => (
          <label
            key={o.value}
            className={cx(
              'flex h-10 min-w-12 cursor-pointer items-center justify-center rounded-md px-3 text-sm font-medium transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring lg:h-8',
              value === o.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <input type="radio" className="sr-only" checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A styled dropdown with full keyboard support (Radix Select). */
export function Select<T extends string>({ label, value, onChange, options, hideLabel, placeholder }: {
  label: string; value: T | undefined; onChange: (v: T) => void; options: { value: T; label: string; hint?: string }[]; hideLabel?: boolean; placeholder?: string;
}) {
  const id = `select-${label.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <div>
      <span id={id} className={hideLabel ? 'sr-only' : 'mb-1.5 block text-sm font-medium'}>{label}</span>
      <RadixSelect.Root value={value} onValueChange={(v) => onChange(v as T)}>
        <RadixSelect.Trigger aria-labelledby={id} className={cx(inputClass, 'flex items-center justify-between gap-2 text-left data-[placeholder]:text-muted-foreground')}>
          <span className="truncate">
            <RadixSelect.Value placeholder={placeholder} />
          </span>
          <RadixSelect.Icon>
            <ChevronDown size={18} className="text-muted-foreground" aria-hidden />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            className="z-[60] max-h-[min(22rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] min-w-48 overflow-hidden rounded-xl border border-border bg-card shadow-xl animate-fade-in"
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((o) => (
                <RadixSelect.Item
                  key={o.value}
                  value={o.value}
                  className="relative flex min-h-11 cursor-pointer select-none items-center rounded-lg py-2 pl-3 pr-9 text-[15px] outline-none data-[highlighted]:bg-muted lg:min-h-9 lg:text-sm"
                >
                  <span>
                    <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
                    {o.hint && <span className="block text-xs text-muted-foreground">{o.hint}</span>}
                  </span>
                  <RadixSelect.ItemIndicator className="absolute right-3">
                    <Check size={16} className="text-accent" aria-hidden />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}

// --- Dialogs -------------------------------------------------------------------

function useModal(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return ref;
}

/**
 * A modal sheet on the native <dialog>: focus is trapped, Escape closes it,
 * and the page behind is inert. Rises from the bottom on phones.
 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useModal(open);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="sheet-title"
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-2xl bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-[2px] open:animate-rise-in sm:m-auto sm:max-w-md sm:rounded-2xl"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between bg-card px-4 pb-1 pt-3">
        <h2 id="sheet-title" className="font-display text-xl font-bold">{title}</h2>
        <IconButton label="Close" onClick={onClose}>
          <X size={20} />
        </IconButton>
      </div>
      <div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2">{open && children}</div>
    </dialog>
  );
}

/** Asks before something that cannot be taken back. */
export function ConfirmDialog({ open, title, children, confirmLabel, tone = 'danger', busy, onConfirm, onCancel }: {
  open: boolean; title: string; children: ReactNode; confirmLabel: string; tone?: 'danger' | 'primary'; busy?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const ref = useModal(open);
  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      onClick={(e) => e.target === ref.current && onCancel()}
      role="alertdialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-body"
      className="w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-card p-5 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-[2px] open:animate-rise-in"
    >
      <h2 id="confirm-title" className="text-lg font-semibold">{title}</h2>
      <div id="confirm-body" className="mt-1 text-sm text-muted-foreground">{children}</div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={busy} autoFocus>
          Cancel
        </Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} busy={busy}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}

// --- Toast ---------------------------------------------------------------------

type Toast = { message: string; undo?: () => void };
const ToastContext = createContext<(toast: Toast) => void>(() => {});
export const useToast = () => useContext(ToastContext);

/** One message at a time above the tab bar, with an optional Undo. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(Toast & { key: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback((t: Toast) => {
    clearTimeout(timer.current);
    setToast({ ...t, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), 4500);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:bottom-6 lg:pl-56">
        {toast && (
          <div key={toast.key} className="pointer-events-auto flex min-h-11 w-full max-w-sm animate-rise-in items-center justify-between gap-3 rounded-xl bg-foreground pl-4 pr-1 text-sm text-background shadow-lg">
            <span className="py-2.5">{toast.message}</span>
            {toast.undo && (
              <button
                type="button"
                className="h-9 shrink-0 rounded-lg px-3 font-semibold text-background underline-offset-4 hover:underline"
                onClick={() => {
                  toast.undo?.();
                  setToast(null);
                }}
              >
                Undo
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
