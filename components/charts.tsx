'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

/**
 * Two small single-series charts drawn as SVG: a trend line and weekly
 * columns. One series each, so the card title names it and there is no
 * legend. Hover or arrow keys show a value; the table under each chart
 * holds every value without hovering.
 */
export interface Point {
  /** Short label for the axis and the table, e.g. "2 Nov". */
  label: string;
  value: number;
}

const HEIGHT = 168;
const PAD = { top: 16, right: 64, bottom: 24, left: 40 };

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** About three round-number ticks that cover the data. */
export function niceTicks(min: number, max: number, count = 3, minStep = 1): number[] {
  if (min === max) [min, max] = [min - 1, max + 1];
  const raw = Math.max(minStep, (max - min) / count);
  const power = 10 ** Math.floor(Math.log10(raw));
  // Whole steps of 1, 2, 5 or 10 times a power of ten, never finer than minStep.
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= raw)!;
  const ticks = [];
  for (let t = Math.floor(min / step) * step; t <= max + step / 2; t += step) ticks.push(Math.round(t * 1000) / 1000);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

function useActive(count: number) {
  const [active, setActive] = useState<number | null>(null);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? count) - 1));
    else if (e.key === 'ArrowRight') setActive((a) => Math.min(count - 1, (a ?? -1) + 1));
    else if (e.key === 'Escape') setActive(null);
    else return;
    e.preventDefault();
  };
  return { active, setActive, onKeyDown };
}

function Tooltip({ x, width, point, format }: { x: number; width: number; point: Point; format: (v: number) => string }) {
  const left = Math.min(Math.max(x - 64, 0), width - 128);
  return (
    <div className="pointer-events-none absolute top-0 w-32 rounded-lg border border-border bg-card px-2 py-1 text-center shadow-md" style={{ left }}>
      <div className="tabular text-sm font-semibold">{format(point.value)}</div>
      <div className="text-xs text-muted-foreground">{point.label}</div>
    </div>
  );
}

function Table({ caption, points, format }: { caption: string; points: Point[]; format: (v: number) => string }) {
  return (
    <details className="mt-2 text-sm">
      <summary className="inline-flex min-h-11 cursor-pointer items-center text-muted-foreground">Show as a table</summary>
      <table className="w-full">
        <caption className="sr-only">{caption}</caption>
        <tbody>
          {[...points].reverse().map((p, i) => (
            <tr key={i} className="border-t border-border">
              <th scope="row" className="py-1.5 text-left font-normal text-muted-foreground">{p.label}</th>
              <td className="tabular py-1.5 text-right">{format(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function TrendChart({ title, points, format, axisFormat = format }: {
  title: string; points: Point[]; format: (v: number) => string; axisFormat?: (v: number) => string;
}) {
  const [ref, width] = useWidth();
  const { active, setActive, onKeyDown } = useActive(points.length);
  const values = points.map((p) => p.value);
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const [lo, hi] = [ticks[0], ticks[ticks.length - 1]];
  const plotW = Math.max(1, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * plotH;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
  const area = `${line}L${x(points.length - 1).toFixed(1)},${y(lo)}L${x(0).toFixed(1)},${y(lo)}Z`;
  const last = points.length - 1;

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const i = points.length === 1 ? 0 : Math.round(((e.clientX - box.left - PAD.left) / plotW) * (points.length - 1));
    setActive(Math.min(last, Math.max(0, i)));
  };

  return (
    <div>
      <div
        ref={ref}
        tabIndex={0}
        role="group"
        aria-label={`${title}. Use the arrow keys to read each value.`}
        onKeyDown={onKeyDown}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        className="relative touch-pan-y rounded-lg"
        style={{ height: HEIGHT }}
      >
        {width > 0 && (
          <svg width={width} height={HEIGHT} aria-hidden className="block overflow-visible">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
                <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular">{axisFormat(t)}</text>
              </g>
            ))}
            <text x={x(0)} y={HEIGHT - 6} textAnchor="start" className="fill-muted-foreground text-[11px]">{points[0].label}</text>
            {last > 0 && <text x={x(last)} y={HEIGHT - 6} textAnchor="end" className="fill-muted-foreground text-[11px]">{points[last].label}</text>}
            <path d={area} className="fill-chart/10" />
            <path d={line} fill="none" className="stroke-chart" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {active !== null && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} className="stroke-muted-foreground" strokeWidth={1} />}
            <circle cx={x(active ?? last)} cy={y(points[active ?? last].value)} r={5} className="fill-chart stroke-card" strokeWidth={2} />
            <text x={x(last) + 9} y={y(points[last].value)} dy="0.32em" className="fill-foreground text-xs font-semibold tabular">{format(points[last].value)}</text>
          </svg>
        )}
        {active !== null && width > 0 && <Tooltip x={x(active)} width={width} point={points[active]} format={format} />}
      </div>
      <Table caption={title} points={points} format={format} />
    </div>
  );
}

export function ColumnChart({ title, points, format, axisFormat = format }: {
  title: string; points: Point[]; format: (v: number) => string; axisFormat?: (v: number) => string;
}) {
  const [ref, width] = useWidth();
  const { active, setActive, onKeyDown } = useActive(points.length);
  const ticks = niceTicks(0, Math.max(1, ...points.map((p) => p.value)));
  const hi = ticks[ticks.length - 1];
  const plotW = Math.max(1, width - PAD.left - 8);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const band = plotW / points.length;
  const barW = Math.min(24, band - 2);
  const y = (v: number) => PAD.top + (1 - v / hi) * plotH;
  const last = points.length - 1;

  return (
    <div>
      <div
        ref={ref}
        tabIndex={0}
        role="group"
        aria-label={`${title}. Use the arrow keys to read each value.`}
        onKeyDown={onKeyDown}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        className="relative rounded-lg"
        style={{ height: HEIGHT }}
      >
        {width > 0 && (
          <svg width={width} height={HEIGHT} aria-hidden className="block overflow-visible">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - 8} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
                <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular">{axisFormat(t)}</text>
              </g>
            ))}
            {points.map((p, i) => {
              const cx = PAD.left + band * i + band / 2;
              const top = y(p.value);
              const h = PAD.top + plotH - top;
              const r = Math.min(4, h, barW / 2);
              // Rounded at the data end, square at the baseline.
              const d = `M${cx - barW / 2},${PAD.top + plotH}V${top + r}Q${cx - barW / 2},${top} ${cx - barW / 2 + r},${top}H${cx + barW / 2 - r}Q${cx + barW / 2},${top} ${cx + barW / 2},${top + r}V${PAD.top + plotH}Z`;
              return (
                <g key={i} onPointerEnter={() => setActive(i)}>
                  <rect x={cx - band / 2} y={PAD.top} width={band} height={plotH} fill="transparent" />
                  {p.value > 0 && <path d={d} className={active === i ? 'fill-chart/70' : 'fill-chart'} />}
                </g>
              );
            })}
            <text x={PAD.left} y={HEIGHT - 6} className="fill-muted-foreground text-[11px]">{points[0].label}</text>
            <text x={width - 8} y={HEIGHT - 6} textAnchor="end" className="fill-muted-foreground text-[11px]">{points[last].label}</text>
          </svg>
        )}
        {active !== null && width > 0 && <Tooltip x={PAD.left + band * active + band / 2} width={width} point={points[active]} format={format} />}
      </div>
      <Table caption={title} points={points} format={format} />
    </div>
  );
}

/**
 * A small trend beside a headline number: no axes, the latest point marked.
 * Decorative; the full chart and its table are on Progress.
 */
export function Sparkline({ values, width = 120, height = 36 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const x = (i: number) => 4 + (i / (values.length - 1)) * (width - 8);
  const y = (v: number) => 4 + (hi === lo ? 0.5 : 1 - (v - lo) / (hi - lo)) * (height - 8);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const last = values.length - 1;
  return (
    <svg width={width} height={height} aria-hidden className="block shrink-0 overflow-visible">
      <path d={d} fill="none" className="stroke-muted-foreground" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last)} cy={y(values[last])} r={4} className="fill-chart stroke-card" strokeWidth={2} />
    </svg>
  );
}
