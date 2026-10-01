"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { bestDays, cumulativeSales, groupBy, itemsDistribution, percentile, weekdayCounts } from "@/lib/order-stats";
import {
    axisProps, Card, ChartTip, COLORS, compact, DAY, Delta, Empty, Kpi, MiniBars, money, number, PALETTE, percent, rowCls,
    shortDate, tableCls, tdCls, theadCls, type StatsContext,
} from "./ui";

const TARGET_KEY = "parcelsewa_sales_target";

export default function SalesTab({ ctx }: { ctx: StatsContext }) {
    const { filtered, previous, summary, prevSummary, range, dateBasis, series, vsLabel } = ctx;

    // The sales target is remembered in this browser only.
    const [target, setTarget] = useState("");
    useEffect(() => {
        // Read after the first render so the server and browser render the same thing.
        const timer = setTimeout(() => {
            try { setTarget(localStorage.getItem(TARGET_KEY) || ""); } catch { /* storage can be blocked */ }
        }, 0);
        return () => clearTimeout(timer);
    }, []);
    const changeTarget = (value: string) => {
        setTarget(value);
        try { localStorage.setItem(TARGET_KEY, value); } catch { /* storage can be blocked */ }
    };

    const active = useMemo(() => filtered.filter(order => order.status !== "cancelled"), [filtered]);
    const units = active.reduce((total, order) => total + order.units, 0);
    const orderValues = useMemo(() => active.map(order => order.total), [active]);

    // How far through the period we are, for the run-rate projection.
    const now = useMemo(() => new Date(), []);
    const period = useMemo(() => {
        const dated = active.map(order => order.createdAt).filter((date): date is Date => date !== null);
        const from = range.from ?? (dated.length ? new Date(Math.min(...dated.map(date => date.getTime()))) : null);
        const to = range.to ?? new Date(now.getTime() + DAY);
        if (!from) return null;
        const totalDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY));
        const inProgress = now >= from && now < to;
        const elapsed = Math.max(1, Math.min(totalDays, Math.ceil((now.getTime() - from.getTime()) / DAY)));
        return { totalDays, elapsed, inProgress, daysLeft: inProgress ? totalDays - elapsed : 0 };
    }, [active, range, now]);

    const targetValue = Number(target.replace(/[^\d.]/g, "")) || 0;
    const progress = targetValue ? Math.min(100, (summary.revenue / targetValue) * 100) : 0;
    const projected = period && period.inProgress ? (summary.revenue / period.elapsed) * period.totalDays : summary.revenue;
    const perDayNeeded = period && period.daysLeft > 0 && targetValue > summary.revenue ? (targetValue - summary.revenue) / period.daysLeft : null;

    const cumulative = useMemo(
        () => (range.from && range.to ? cumulativeSales(filtered, previous, range.from, range.to, dateBasis, now) : []),
        [filtered, previous, range, dateBasis, now],
    );
    const days = useMemo(() => bestDays(filtered, 5, dateBasis), [filtered, dateBasis]);
    const weekdays = useMemo(() => weekdayCounts(filtered), [filtered]);
    const items = useMemo(() => itemsDistribution(filtered), [filtered]);
    const stores = useMemo(() => groupBy(filtered, order => order.store), [filtered]);
    const commissions = useMemo(() => groupBy(filtered, order => order.commission || "Unknown"), [filtered]);
    const collectedPct = summary.revenue ? Math.min(100, (summary.collected / summary.revenue) * 100) : 0;
    const sparkOf = (pick: (point: (typeof series)[number]) => number) => series.slice(-30).map(point => ({ v: pick(point) }));
    const p = (pick: (s: typeof summary) => number) => (prevSummary ? pick(prevSummary) : null);

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                <Kpi label="Total sales" icon="💰" accent={COLORS.blue} value={money(summary.revenue)} hint={vsLabel ?? `${number(summary.active)} orders`} delta={<Delta current={summary.revenue} previous={p(s => s.revenue)} />} spark={sparkOf(point => point.revenue)} />
                <Kpi label="Orders per day" icon="📅" accent={COLORS.violet} value={period ? (summary.active / period.elapsed).toFixed(1) : "—"} hint={period ? `over ${period.elapsed} day${period.elapsed > 1 ? "s" : ""}` : undefined} />
                <Kpi label="Units sold" icon="🛍️" accent={COLORS.teal} value={number(units)} hint={summary.active ? `${(units / summary.active).toFixed(1)} per order` : undefined} />
                <Kpi label="Median order" icon="🎯" accent={COLORS.amber} value={money(percentile(orderValues, 50) ?? 0)} hint={`top 10% above ${money(percentile(orderValues, 90) ?? 0)}`} />
                <Kpi label="Best day" icon="🏆" accent={COLORS.emerald} value={days[0] ? money(days[0].revenue) : "—"} hint={days[0] ? `${shortDate(days[0].day)} · ${days[0].orders} orders` : undefined} />
                <Kpi label="Collected" icon="✅" accent={COLORS.emerald} value={money(summary.collected)} hint={`${percent(collectedPct)} of sales`} />
                <Kpi label="Still to collect" icon="⏳" accent={COLORS.rose} value={money(summary.outstanding)} hint={`${summary.pending} pending orders`} delta={<Delta current={summary.outstanding} previous={p(s => s.outstanding)} lowerIsBetter />} />
                <Kpi label="Avg order value" icon="🧾" accent={COLORS.orange} value={money(summary.avgOrder)} delta={<Delta current={summary.avgOrder} previous={p(s => s.avgOrder)} />} />
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                <Card title="Sales target" subtitle="Set a goal for the selected period (saved in this browser)" className="lg:col-span-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Target (Rs.)</label>
                    <input
                        inputMode="numeric"
                        value={target}
                        onChange={event => changeTarget(event.target.value.replace(/[^\d]/g, ""))}
                        placeholder="e.g. 600000"
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900"
                    />
                    {targetValue > 0 ? (
                        <div className="mt-4 space-y-3">
                            <div>
                                <div className="mb-1 flex items-end justify-between">
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{percent(progress)}</span>
                                    <span className="text-xs text-gray-400">{money(summary.revenue)} of {money(targetValue)}</span>
                                </div>
                                <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                    <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                            {period?.inProgress && (
                                <ul className="space-y-1 text-sm">
                                    <li className="flex justify-between"><span className="text-gray-500">On pace for</span><span className={`font-semibold ${projected >= targetValue ? "text-emerald-600" : "text-amber-600"}`}>{money(projected)}</span></li>
                                    <li className="flex justify-between"><span className="text-gray-500">Days left</span><span className="font-semibold">{period.daysLeft}</span></li>
                                    {perDayNeeded !== null && <li className="flex justify-between"><span className="text-gray-500">Needed per day</span><span className="font-semibold">{money(perDayNeeded)}</span></li>}
                                </ul>
                            )}
                            {summary.revenue >= targetValue && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">🎉 Target reached</p>}
                        </div>
                    ) : <p className="mt-4 text-sm text-gray-400">Enter an amount to see progress and a pace projection.</p>}
                </Card>

                <Card title="Cumulative sales" subtitle={range.from && range.to ? "Running total by day, against the previous period of the same length" : "Pick a date range (not All time) to compare periods"} className="lg:col-span-2">
                    {cumulative.length ? (
                        <div className="h-72 text-gray-400">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={cumulative} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="cumCurrent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={COLORS.blue} stopOpacity={0.4} />
                                            <stop offset="100%" stopColor={COLORS.blue} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.15} />
                                    <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
                                    <YAxis {...axisProps} width={46} tickFormatter={compact} />
                                    <Tooltip content={<ChartTip format={money} />} />
                                    <Area type="monotone" dataKey="previous" name="Previous period" stroke={COLORS.slate} strokeWidth={2} strokeDasharray="5 4" fill="none" connectNulls={false} />
                                    <Area type="monotone" dataKey="current" name="This period" stroke={COLORS.blue} strokeWidth={2.5} fill="url(#cumCurrent)" connectNulls={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <Empty text="Choose This month, Last month, 30 days… to compare with the previous period" />}
                </Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                <Card title="Collection" subtitle="Money received against sales">
                    {summary.revenue ? (
                        <div className="space-y-3">
                            <div className="flex h-4 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                <div className="h-4 bg-emerald-500" style={{ width: `${collectedPct}%` }} />
                                <div className="h-4 bg-rose-400" style={{ width: `${100 - collectedPct}%` }} />
                            </div>
                            <ul className="space-y-1.5 text-sm">
                                <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Collected<span className="ml-auto font-semibold">{money(summary.collected)}</span></li>
                                <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" />Not yet collected<span className="ml-auto font-semibold">{money(Math.max(0, summary.revenue - summary.collected))}</span></li>
                            </ul>
                            <p className="text-xs text-gray-400">Collection rate {percent(collectedPct, 1)}</p>
                        </div>
                    ) : <Empty />}
                </Card>
                <MiniBars title="Sales by weekday" subtitle="Order value by day placed" data={weekdays} dataKey="revenue" name="Sales" color={COLORS.blue} format={money} />
                <MiniBars title="Average order value by size of order" subtitle="Items per order" data={items} dataKey="avg" name="Avg value" color={COLORS.violet} format={money} />
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
                <Card title="Sales by store" subtitle="Value, share of sales and profit">
                    {stores.length ? (
                        <div className="overflow-x-auto">
                            <table className={tableCls}>
                                <thead><tr className={theadCls}><th className="px-3 py-2">Store</th><th className="px-3 py-2 text-right">Sales</th><th className="px-3 py-2 text-right">Share</th><th className="px-3 py-2 text-right">Profit</th><th className="w-1/4 px-3 py-2" /></tr></thead>
                                <tbody>
                                    {stores.slice(0, 12).map((group, index) => (
                                        <tr key={group.key} className={rowCls}>
                                            <td className={`${tdCls} font-medium`}>{group.key}</td>
                                            <td className={`${tdCls} text-right`}>{money(group.revenue)}</td>
                                            <td className={`${tdCls} text-right text-gray-500`}>{summary.revenue ? percent((group.revenue / summary.revenue) * 100) : "—"}</td>
                                            <td className={`${tdCls} text-right text-emerald-600`}>{money(group.profit)}</td>
                                            <td className={tdCls}><div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-1.5 rounded-full" style={{ width: `${summary.revenue ? (group.revenue / summary.revenue) * 100 : 0}%`, background: PALETTE[index % PALETTE.length] }} /></div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <Empty />}
                </Card>

                <Card title="Sales by commission" subtitle="Which pricing brings the most sales">
                    {commissions.length ? (
                        <div className="h-64 text-gray-400">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={commissions} margin={{ top: 8, right: 8, left: 0 }}>
                                    <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.12} />
                                    <XAxis dataKey="key" {...axisProps} interval={0} />
                                    <YAxis {...axisProps} width={46} tickFormatter={compact} />
                                    <Tooltip content={<ChartTip format={money} />} cursor={{ fill: "currentColor", fillOpacity: 0.06 }} />
                                    <Bar dataKey="revenue" name="Sales" radius={[6, 6, 0, 0]} maxBarSize={44}>
                                        {commissions.map((_, index) => <Cell key={index} fill={PALETTE[index % PALETTE.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <Empty />}
                </Card>
            </div>

            <Card title="Best sales days" subtitle="The five biggest days in this selection">
                {days.length ? (
                    <div className="overflow-x-auto">
                        <table className={tableCls}>
                            <thead><tr className={theadCls}><th className="px-3 py-2">#</th><th className="px-3 py-2">Day</th><th className="px-3 py-2 text-right">Orders</th><th className="px-3 py-2 text-right">Sales</th></tr></thead>
                            <tbody>
                                {days.map((day, index) => (
                                    <tr key={day.day.getTime()} className={rowCls}>
                                        <td className={`${tdCls} text-gray-400`}>{index + 1}</td>
                                        <td className={`${tdCls} font-medium`}>{day.day.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</td>
                                        <td className={`${tdCls} text-right`}>{day.orders}</td>
                                        <td className={`${tdCls} text-right font-semibold`}>{money(day.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <Empty />}
            </Card>
        </div>
    );
}
