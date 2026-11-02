'use client';

import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Loader2, Minus, Plus, X } from 'lucide-react';

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

// --- Buttons -------------------------------------------------------------------

const variants = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'border border-input bg-card text-foreground hover:bg-muted',
  ghost: 'text-foreground hover:bg-muted',
  danger: 'border border-negative text-negative hover:bg-negative/10',
};
const sizes = { md: 'min-h-11 px-4 text-sm', lg: 'min-h-12 px-5 text-base' };

type ButtonStyle = { variant?: keyof typeof variants; size?: keyof typeof sizes; block?: boolean };
const buttonClass = ({ variant = 'primary', size = 'md', block }: ButtonStyle, extra?: string) =>
  cx(
    'inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition-colors active:opacity-80 disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    block && 'w-full',
    extra,
  );

export function Button({ variant, size, block, busy, className, children, ...props }: ComponentProps<'button'> & ButtonStyle & { busy?: boolean }) {
  return (
    <button type="button" className={buttonClass({ variant, size, block }, className)} disabled={busy || props.disabled} {...props}>
      {busy && <Loader2 size={18} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, block, className, ...props }: ComponentProps<typeof Link> & ButtonStyle) {
  return <Link className={buttonClass({ variant, size, block }, className)} {...props} />;
}

/** A 44px square button for an icon; the label is for screen readers. */
export function IconButton({ label, className, children, ...props }: ComponentProps<'button'> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx('inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground', className)}
      {...props}
    >
      {children}
    </button>
  );
}

// --- Layout --------------------------------------------------------------------

export function Card({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cx('rounded-2xl border border-border bg-card p-4', className)} {...props} />;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-input/60 px-4 py-6 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 size={18} className="animate-spin" aria-hidden />
      {label}…
    </div>
  );
}

export function Meter({ value, max, label, tone = 'primary' }: { value: number; max: number; label: string; tone?: 'primary' | 'negative' }) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} className="h-2 overflow-hidden rounded-full bg-muted">
      <div className={cx('h-full rounded-full transition-[width]', tone === 'negative' ? 'bg-negative' : 'bg-primary')} style={{ width: `${percent}%` }} />
    </div>
  );
}

// --- Inputs --------------------------------------------------------------------

export const inputClass =
  'block w-full min-h-11 rounded-xl border border-input bg-card px-3 text-base text-foreground placeholder:text-muted-foreground';

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-sm text-muted-foreground">{hint}</span>}
    </label>
  );
}

/** Text that may be a decimal; the phone shows its number pad. */
export function NumberInput({ value, onChange, ...props }: Omit<ComponentProps<'input'>, 'value' | 'onChange'> & { value: string; onChange: (v: string) => void }) {
  return (
    <input
      inputMode="decimal"
      autoComplete="off"
      className={cx(inputClass, 'tabular')}
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
  return (
    <div>
      <span className="mb-1 block text-sm font-medium" id={`${label}-label`}>{label}</span>
      <div className="flex items-center gap-2">
        <IconButton label={`Less ${label.toLowerCase()}`} className="border border-input" onClick={() => set(value - step)}>
          <Minus size={20} />
        </IconButton>
        <div className="relative flex-1">
          <input
            aria-labelledby={`${label}-label`}
            inputMode="decimal"
            className={cx(inputClass, 'tabular text-center text-xl font-semibold')}
            value={Number.isFinite(value) ? String(value) : ''}
            onChange={(e) => {
              const v = Number(e.target.value.replace(',', '.'));
              if (e.target.value === '') onChange(0);
              else if (Number.isFinite(v)) set(v);
            }}
          />
          {unit && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{unit}</span>}
        </div>
        <IconButton label={`More ${label.toLowerCase()}`} className="border border-input" onClick={() => set(value + step)}>
          <Plus size={20} />
        </IconButton>
      </div>
    </div>
  );
}

/** A row of choices where exactly one is picked. */
export function Segmented<T extends string>({ label, options, value, onChange }: {
  label: string; options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-muted p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={cx(
              'flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-2 text-center text-sm font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
              value === o.value ? 'bg-card shadow-sm' : 'text-muted-foreground',
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

// --- Sheet ---------------------------------------------------------------------

/**
 * A modal sheet on the native <dialog>: focus is trapped, Escape closes it,
 * and the page behind is inert. Rises from the bottom on phones.
 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="sheet-title"
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-3xl bg-card p-0 text-foreground backdrop:bg-black/50 sm:m-auto sm:max-w-lg sm:rounded-3xl"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <h2 id="sheet-title" className="text-lg font-semibold">{title}</h2>
        <IconButton label="Close" onClick={onClose}>
          <X size={20} />
        </IconButton>
      </div>
      <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{open && children}</div>
    </dialog>
  );
}

// --- Toast ---------------------------------------------------------------------

type Toast = { message: string; undo?: () => void };
const ToastContext = createContext<(toast: Toast) => void>(() => {});
export const useToast = () => useContext(ToastContext);

/** One message at a time above the tab bar, with an optional Undo. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback((t: Toast) => {
    clearTimeout(timer.current);
    setToast(t);
    timer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:bottom-6">
        {toast && (
          <div className="pointer-events-auto flex min-h-12 w-full max-w-md items-center justify-between gap-3 rounded-2xl bg-foreground px-4 text-sm text-background shadow-lg">
            <span className="py-3">{toast.message}</span>
            {toast.undo && (
              <button
                type="button"
                className="min-h-11 shrink-0 rounded-lg px-3 font-semibold underline underline-offset-4"
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
