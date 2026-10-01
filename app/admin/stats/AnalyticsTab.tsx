"use client";

import React, { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cohortTable, concentration, growthSeries, linearForecast, movingAverage, newVsReturning, nextBuckets, percentile } from "@/lib/order-stats";
import { axisProps, Card, ChartTip, COLORS, compact, DAY, Empty, Kpi, money, number, percent, rowCls, tableCls, tdCls, theadCls, type StatsContext } from "./ui";

const BUCKET_DAYS = { day: 1, week: 7, month: 31 } as const;

export default function AnalyticsTab({ ctx }: { ctx: StatsContext }) {
    const { orders, filtered, series, summary, granularity } = ctx;
    const unit = granularity;

    // Forecast from completed periods only, so a half-finished current period does not drag the line down.
    const now = useMemo(() => new Date().getTime(), []);
    const trend = useMemo(() => {
        const completed = series.filter(point => point.start + BUCKET_DAYS[granularity] * DAY <= now);
        const forecast = linearForecast(completed.map(point => point.revenue), 3);
        const average = movingAverage(series.map(point => point.revenue), 3);
        const rows: { start: number; label: string; revenue: number | null; average: number | null; projected: number | null }[] = series.map((point, index) => ({
            start: point.start, label: point.label, revenue: point.revenue, average: point.start + BUCKET_DAYS[granularity] * DAY > now ? null : average[index], projected: null,
        }));
        if (forecast.length) {
            const last = completed[completed.length - 1];
            const lastRow = rows.find(row => row.start === last.start);
            if (lastRow) lastRow.projected = lastRow.revenue; // join the dashed line to the real data
            // Name the estimated periods after real dates; a period already on the chart (the one in progress) gets the estimate too.
            nextBuckets(last.start, granularity, forecast.length).forEach((bucket, step) => {
                const existing = rows.find(row => row.start === bucket.start);
                if (existing) existing.projected = forecast[step];
                else rows.push({ start: bucket.start, label: bucket.label, revenue: null, average: null, projected: forecast[step] });
            });
        }
        return { rows, forecast, hasForecast: forecast.length > 0 };
    }, [series, granularity, now]);

    // The period still in progress is not finished, so comparing it with the last full one would look like a crash.
    const growth = useMemo(() => growthSeries(series).map((point, index) => (series[index].start + BUCKET_DAYS[granularity] * DAY > now ? { ...point, growth: null } : point)), [series, granularity, now]);
    const customers = useMemo(() => newVsReturning(orders, filtered, series, granularity), [orders, filtered, series, granularity]);
    const cohorts = useMemo(() => cohortTable(orders, 6), [orders]);
    const spread = useMemo(() => concentration(filtered), [filtered]);
    const values = useMemo(() => filtered.filter(order => order.status !== "cancelled" && order.total > 0).map(order => order.total), [filtered]);

    const perCustomer = summary.customers ? summary.active / summary.customers : 0;
    const valuePerCustomer = summary.customers ? summary.revenue / summary.customers : 0;
    const newTotal = customers.reduce((total, point) => total + point.newCustomers, 0);

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi label="Orders per customer" icon="🔁" accent={COLORS.violet} value={perCustomer.toFixed(2)} hint={`${number(summary.customers)} customers`} />
                <Kpi label="Value per customer" icon="💎" accent={COLORS.blue} value={money(valuePerCustomer)} hint="average spend" />
                <Kpi label="Repeat customers" icon="🤝" accent={COLORS.emerald} value={percent(summary.repeatRate)} hint={`${summary.repeatCustomers} ordered more than once`} />
                <Kpi label="New customers" icon="🌱" accent={COLORS.teal} value={number(newTotal)} hint="first order in this selection" />
            </div>

            <Card
                title="Sales trend with forecast"
                subtitle={`${unit[0].toUpperCase() + unit.slice(1)}ly sales, a 3-period moving average, and a straight-line estimate of the next 3 periods`}
            >
                {series.length > 2 ? (
                    <div className="h-80 text-gray-400">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={trend.rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.15} />
                                <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={18} />
                                <YAxis {...axisProps} width={46} tickFormatter={compact} />
                                <Tooltip content={<ChartTip format={money} />} cursor={{ fill: "currentColor", fillOpacity: 0.06 }} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="revenue" name="Sales" fill={COLORS.blue} fillOpacity={0.55} radius={[5, 5, 0, 0]} maxBarSize={30} />
                                <Line type="monotone" dataKey="average" name="3-period average" stroke={COLORS.violet} strokeWidth={2.5} dot={false} connectNulls />
                                {trend.hasForecast && <Line type="monotone" dataKey="projected" name="Estimate" stroke={COLORS.orange} strokeWidth={2.5} strokeDasharray="6 5" dot={{ r: 3 }} connectNulls />}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                ) : <Empty text="Choose a longer range (90 days, This year or All time) to see a trend" />}
                {trend.hasForecast && <p className="mt-2 text-xs text-gray-400">The estimate continues the recent trend in a straight line. It is a guide, not a promise.</p>}
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
                <Card title="Growth" subtitle={`Change in sales from one ${unit} to the next`}>
                    {growth.some(point => point.growth !== null) ? (
                        <div className="h-64 text-gray-400">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={growth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.12} />
                                    <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={18} />
                                    <YAxis {...axisProps} width={42} tickFormatter={value => `${Math.round(value)}%`} />
                                    <Tooltip content={<ChartTip format={value => `${value > 0 ? "+" : ""}${value.toFixed(1)}%`} />} cursor={{ fill: "currentColor", fillOpacity: 0.06 }} />
                                    <Bar dataKey="growth" name="Growth" radius={[4, 4, 0, 0]} maxBarSize={26}>
                                        {growth.map((point, index) => <Cell key={index} fill={(point.growth ?? 0) >= 0 ? COLORS.emerald : COLORS.rose} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <Empty text="Needs at least two periods with sales" />}
                </Card>

                <Card title="New and returning customers" subtitle={`Customers per ${unit}, split by first-time buyers and people who came back`}>
                    {customers.some(point => point.newCustomers + point.returning > 0) ? (
                        <div className="h-64 text-gray-400">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={customers} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.12} />
                                    <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={18} />
                                    <YAxis {...axisProps} width={30} allowDecimals={false} />
                                    <Tooltip content={<ChartTip />} cursor={{ fill: "currentColor", fillOpacity: 0.06 }} />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <Bar dataKey="newCustomers" name="New" stackId="c" fill={COLORS.teal} maxBarSize={30} />
                                    <Bar dataKey="returning" name="Returning" stackId="c" fill={COLORS.violet} radius={[4, 4, 0, 0]} maxBarSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <Empty />}
                </Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
                <Card title="Customer retention" subtitle="Of the customers who first ordered in a month, how many ordered again later (all orders, ignores filters)">
                    <div className="overflow-x-auto">
                        <table className={tableCls}>
                            <thead>
                                <tr className={theadCls}>
                                    <th className="px-3 py-2">First order</th><th className="px-3 py-2 text-right">Customers</th>
                                    {cohorts[0]?.retention.map((_, offset) => <th key={offset} className="px-2 py-2 text-center">{offset === 0 ? "Month 0" : `+${offset}`}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {cohorts.map(row => (
                                    <tr key={row.cohort} className={rowCls}>
                                        <td className={`${tdCls} font-medium`}>{row.cohort}</td>
                                        <td className={`${tdCls} text-right`}>{row.size}</td>
                                        {row.retention.map((value, offset) => (
                                            <td key={offset} className="px-1 py-1.5 text-center">
                                                {value === null ? <span className="text-gray-300">·</span> : (
                                                    <span className="inline-block min-w-[3rem] rounded-md px-1.5 py-1 text-xs font-semibold" style={{ background: `rgba(16,185,129,${0.08 + (value / 100) * 0.75})`, color: value > 55 ? "#fff" : "inherit" }}>
                                                        {Math.round(value)}%
                                                    </span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card title="Where sales come from" subtitle="How much of your sales depends on a few customers">
                    {spread.customers ? (
                        <div className="space-y-4">
                            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/60">
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{percent(spread.top10Share)}</p>
                                <p className="text-xs text-gray-500">of sales come from the top 10% of customers ({Math.max(1, Math.ceil(spread.customers * 0.1))} of {number(spread.customers)})</p>
                            </div>
                            <ul className="space-y-2.5">
                                {spread.top.map(customer => (
                                    <li key={customer.name}>
                                        <div className="mb-1 flex justify-between text-sm"><span className="truncate font-medium">{customer.name}</span><span className="text-gray-500">{percent(customer.share, 1)}</span></div>
                                        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${Math.min(100, customer.share * 4)}%` }} /></div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : <Empty />}
                </Card>
            </div>

            <Card title="Order value spread" subtitle="What a typical order looks like">
                {values.length ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                        {[["Smallest", Math.min(...values)], ["Typical (median)", percentile(values, 50) ?? 0], ["Upper quarter", percentile(values, 75) ?? 0], ["Top 10%", percentile(values, 90) ?? 0], ["Largest", Math.max(...values)]].map(([label, value]) => (
                            <div key={label as string} className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800/60">
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{money(value as number)}</p>
                                <p className="text-[11px] uppercase tracking-wider text-gray-400">{label as string}</p>
                            </div>
                        ))}
                    </div>
                ) : <Empty />}
            </Card>

            <p className="rounded-xl bg-gray-100 px-4 py-3 text-xs text-gray-500 dark:bg-gray-800/60">
                These analytics come from your orders. Website visitor numbers (Google Analytics) are not included, because reading them needs a separate Google connection.
            </p>
        </div>
    );
}
