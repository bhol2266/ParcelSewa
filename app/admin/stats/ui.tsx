"use client";

// Shared formatting and building blocks for the stats page and its tabs.
import React, { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, Cell, PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DateBasis, Granularity, OrderStatus, SeriesPoint, StatOrder, Summary } from "@/lib/order-stats";

export const DAY = 86400000;

// ── Formatting ───────────────────────────────────────────────────────────────

export const money = (value: number) => `Rs. ${Math.round(value).toLocaleString("en-IN")}`;
export const number = (value: number) => Math.round(value).toLocaleString("en-IN");
export const percent = (value: number, digits = 0) => `${value.toFixed(digits)}%`;
export const compact = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 1e7) return `${(value / 1e7).toFixed(1)}Cr`;
    if (abs >= 1e5) return `${(value / 1e5).toFixed(1)}L`;
    if (abs >= 1e3) return `${(value / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}k`;
    return `${Math.round(value)}`;
};
export const shortDate = (date: Date | null) => (date ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—");

export const COLORS = { emerald: "#10b981", blue: "#3b82f6", violet: "#8b5cf6", amber: "#f59e0b", rose: "#f43f5e", teal: "#14b8a6", slate: "#94a3b8", orange: "#f97316" };
export const PALETTE = [COLORS.blue, COLORS.emerald, COLORS.violet, COLORS.amber, COLORS.rose, COLORS.teal, COLORS.orange, COLORS.slate];
export const STATUS_COLORS: Record<OrderStatus, string> = { delivered: COLORS.rose, pending: COLORS.emerald, cancelled: COLORS.slate };
export const STATUS_LABEL: Record<OrderStatus, string> = { delivered: "Delivered", pending: "Pending", cancelled: "Cancelled" };

/** Everything the tabs need, worked out once by the page. */
export interface StatsContext {
    orders: StatOrder[];
    filtered: StatOrder[];
    previous: StatOrder[];
    summary: Summary;
    prevSummary: Summary | null;
    series: SeriesPoint[];
    granularity: Granularity;
    dateBasis: DateBasis;
    range: { from: Date | null; to: Date | null };
    rangeLabel: string;
    vsLabel?: string;
}

// ── Layout pieces ────────────────────────────────────────────────────────────

export const Card = ({ title, subtitle, action, children, className = "" }: { title?: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) => (
    <section className={`min-w-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10 ${className}`}>
        {(title || action) && (
            <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    {title && <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>}
                    {subtitle && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
                </div>
                {action}
            </header>
        )}
        {children}
    </section>
);

export const Empty = ({ text = "No data for these filters" }: { text?: string }) => (
    <div className="grid h-40 place-items-center text-center text-sm text-gray-400">{text}</div>
);

export const Segmented = <T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (value: T) => void }) => (
    <div className="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
        {options.map(option => (
            <button key={option} type="button" onClick={() => onChange(option)} className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition ${value === option ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white" : "text-gray-500"}`}>{option}</button>
        ))}
    </div>
);

// ── Charts ───────────────────────────────────────────────────────────────────

interface TipEntry { name?: string | number; value?: number | string; color?: string; dataKey?: string | number }
export const ChartTip = ({ active, payload, label, format = number }: { active?: boolean; payload?: TipEntry[]; label?: string | number; format?: (value: number) => string }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl bg-gray-900/95 px-3 py-2 text-xs text-white shadow-xl ring-1 ring-white/10">
            {label !== undefined && <p className="mb-1 font-semibold">{label}</p>}
            {payload.filter(entry => entry.value !== null && entry.value !== undefined).map((entry, index) => (
                <p key={index} className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
                    <span className="opacity-80">{entry.name}</span>
                    <span className="ml-auto pl-3 font-semibold">{format(Number(entry.value) || 0)}</span>
                </p>
            ))}
        </div>
    );
};

export const axisProps = { tick: { fill: "currentColor", fontSize: 11 }, tickLine: false, axisLine: false } as const;

export function Donut({ data, total, centerLabel }: { data: { name: string; value: number; color: string }[]; total: number; centerLabel: string }) {
    return (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative h-48 w-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Tooltip content={<ChartTip />} />
                        <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
                            {data.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                    <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{number(total)}</p>
                        <p className="text-[11px] uppercase tracking-wider text-gray-400">{centerLabel}</p>
                    </div>
                </div>
            </div>
            <ul className="w-full min-w-0 flex-1 space-y-1.5 text-sm">
                {data.map(entry => (
                    <li key={entry.name} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: entry.color }} />
                        <span className="truncate">{entry.name}</span>
                        <span className="ml-auto font-semibold text-gray-900 dark:text-white">{number(entry.value)}</span>
                        <span className="w-10 text-right text-xs text-gray-400">{total ? Math.round((entry.value / total) * 100) : 0}%</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function MiniBars({ title, subtitle, data, dataKey = "orders", name = "Orders", color, tickEvery = 1, format = number }: { title: string; subtitle?: string; data: object[]; dataKey?: string; name?: string; color: string; tickEvery?: number; format?: (value: number) => string }) {
    const empty = !(data as Record<string, unknown>[]).some(row => Number(row[dataKey]) > 0);
    return (
        <Card title={title} subtitle={subtitle}>
            {empty ? <Empty text="No data" /> : (
                <div className="h-44 text-gray-400">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                            <XAxis dataKey="label" {...axisProps} interval={tickEvery - 1} />
                            <YAxis hide allowDecimals={false} />
                            <Tooltip content={<ChartTip format={format} />} cursor={{ fill: "currentColor", fillOpacity: 0.06 }} />
                            <Bar dataKey={dataKey} name={name} fill={color} radius={[5, 5, 0, 0]} maxBarSize={28} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Card>
    );
}

// ── KPI cards ────────────────────────────────────────────────────────────────

export const Delta = ({ current, previous, lowerIsBetter = false }: { current: number; previous: number | null; lowerIsBetter?: boolean }) => {
    if (previous === null || previous === 0) return null;
    const change = ((current - previous) / Math.abs(previous)) * 100;
    if (!Number.isFinite(change) || Math.abs(change) < 0.5) return <span className="text-[11px] text-gray-400">no change</span>;
    const good = lowerIsBetter ? change < 0 : change > 0;
    return (
        <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${good ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"}`}>
            {change > 0 ? "▲" : "▼"} {Math.abs(change).toFixed(change > 99 ? 0 : 1)}%
        </span>
    );
};

export interface KpiProps { label: string; value: string; hint?: string; accent: string; icon: string; delta?: React.ReactNode; spark?: { v: number }[] }
export const Kpi = ({ label, value, hint, accent, icon, delta, spark }: KpiProps) => (
    <div className="relative min-w-0 overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10">
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
        <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-base" style={{ background: `${accent}1f` }}>{icon}</span>
        </div>
        <p className="mt-1 truncate text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</p>
        <div className="mt-1 flex items-center gap-2">
            {delta}
            {hint && <span className="truncate text-xs text-gray-400">{hint}</span>}
        </div>
        {spark && spark.length > 1 && (
            <div className="-mx-1 mt-2 h-10">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={spark} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                        <defs>
                            <linearGradient id={`spark-${label.replace(/\W/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                                <stop offset="100%" stopColor={accent} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke={accent} strokeWidth={1.8} fill={`url(#spark-${label.replace(/\W/g, "")})`} isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        )}
    </div>
);

/** A target-based score: a value, its target, and a coloured verdict. */
export function Score({ label, value, display, target, higherIsBetter = true, goodAt, okAt, hint }: { label: string; value: number | null; display: string; target: string; higherIsBetter?: boolean; goodAt: number; okAt: number; hint?: string }) {
    let tone: "good" | "ok" | "bad" | "none" = "none";
    if (value !== null) {
        const good = higherIsBetter ? value >= goodAt : value <= goodAt;
        const ok = higherIsBetter ? value >= okAt : value <= okAt;
        tone = good ? "good" : ok ? "ok" : "bad";
    }
    const styles = {
        good: { bar: COLORS.emerald, badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300", text: "On target" },
        ok: { bar: COLORS.amber, badge: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300", text: "Close" },
        bad: { bar: COLORS.rose, badge: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300", text: "Needs attention" },
        none: { bar: COLORS.slate, badge: "bg-gray-100 text-gray-500 dark:bg-gray-800", text: "No data" },
    }[tone];
    const fill = value === null ? 0 : higherIsBetter ? Math.min(100, (value / goodAt) * 100) : Math.min(100, (goodAt / Math.max(value, 0.0001)) * 100);
    return (
        <div className="min-w-0 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10">
            <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${styles.badge}`}>{styles.text}</span>
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{display}</p>
            <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-1.5 rounded-full transition-all" style={{ width: `${fill}%`, background: styles.bar }} /></div>
            <p className="mt-1.5 text-xs text-gray-400">Target {target}{hint ? ` · ${hint}` : ""}</p>
        </div>
    );
}

// ── Filter chips ─────────────────────────────────────────────────────────────

export function Chips<T extends string>({ label, options, selected, onToggle }: { label: string; options: { value: T; label?: string; count?: number }[]; selected: T[]; onToggle: (value: T) => void }) {
    if (!options.length) return null;
    return (
        <div className="min-w-0">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
            <div className="flex flex-wrap gap-1.5">
                {options.map(option => {
                    const on = selected.includes(option.value);
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onToggle(option.value)}
                            className={`max-w-full truncate rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition ${on ? "bg-gray-900 text-white ring-gray-900 dark:bg-white dark:text-gray-900 dark:ring-white" : "bg-white text-gray-600 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800"}`}
                        >
                            {option.label ?? option.value}
                            {option.count !== undefined && <span className={`ml-1 ${on ? "opacity-70" : "text-gray-400"}`}>{option.count}</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ── Sortable tables ──────────────────────────────────────────────────────────

export function useSort<T>(rows: T[], initialKey: keyof T & string, initialDir: "asc" | "desc" = "desc") {
    const [key, setKey] = useState<keyof T & string>(initialKey);
    const [dir, setDir] = useState<"asc" | "desc">(initialDir);
    const sorted = useMemo(() => {
        const factor = dir === "asc" ? 1 : -1;
        return [...rows].sort((a, b) => {
            const x = a[key] as unknown, y = b[key] as unknown;
            const nx = x instanceof Date ? x.getTime() : x, ny = y instanceof Date ? y.getTime() : y;
            if (nx === ny) return 0;
            if (nx === null || nx === undefined) return 1;
            if (ny === null || ny === undefined) return -1;
            if (typeof nx === "number" && typeof ny === "number") return (nx - ny) * factor;
            return String(nx).localeCompare(String(ny)) * factor;
        });
    }, [rows, key, dir]);
    const toggle = (next: keyof T & string) => {
        if (next === key) setDir(dir === "asc" ? "desc" : "asc");
        else { setKey(next); setDir("desc"); }
    };
    return { sorted, key, dir, toggle };
}

export function Th<T>({ label, field, sort, align = "left" }: { label: string; field: keyof T & string; sort: { key: keyof T & string; dir: "asc" | "desc"; toggle: (key: keyof T & string) => void }; align?: "left" | "right" }) {
    const active = sort.key === field;
    return (
        <th className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wider ${align === "right" ? "text-right" : "text-left"}`}>
            <button type="button" onClick={() => sort.toggle(field)} className={`inline-flex items-center gap-1 ${active ? "text-gray-900 dark:text-white" : "text-gray-400 hover:text-gray-600"}`}>
                {label}
                <span className="text-[9px]">{active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}</span>
            </button>
        </th>
    );
}

export const tableCls = "w-full text-sm";
export const rowCls = "border-t border-gray-100 dark:border-gray-800";
export const tdCls = "px-3 py-2";
export const theadCls = "text-left text-[11px] uppercase tracking-wider text-gray-400";
