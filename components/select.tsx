'use client';

import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cx, inputClass } from './ui';

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
