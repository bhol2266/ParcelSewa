"use client";

import React, { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
    buildInsights, groupBy, hourCounts, leadTimeDistribution, paymentState, pendingAging, valueDistribution, weekdayCounts,
    type Granularity, type OrderStatus,
} from "@/lib/order-stats";
import {
    axisProps, Card, ChartTip, COLORS, compact, Delta, Donut, Empty, Kpi, MiniBars, money, number, PALETTE, rowCls, Segmented,
    STATUS_COLORS, STATUS_LABEL, tableCls, tdCls, theadCls, type StatsContext,
} from "./ui";

export default function OverviewTab({ ctx, granularity, onGranularity }: { ctx: StatsContext; granularity: "auto" | Granularity; onGranularity: (value: "auto" | Granularity) => void }) {
    const { filtered, summary, prevSummary, series, vsLabel } = ctx;
    const [metric, setMetric] = useState<"revenue" | "profit" | "orders">("revenue");

    const insights = useMemo(() => buildInsights(filtered, summary, series, ctx.granularity), [filtered, summary, series, ctx.granularity]);
    const storeGroups = useMemo(() => groupBy(filtered, o => o.store), [filtered]);
    const commissionGroups = useMemo(() => groupBy(filtered, o => o.commission || "Unknown"), [filtered]);
    const delivererGroups = useMemo(() => groupBy(filtered.filter(o => o.status === "delivered"), o => o.deliveredBy || "Unassigned"), [filtered]);
    const weekdays = useMemo(() => weekdayCounts(filtered), [filtered]);
    const hours = useMemo(() => hourCounts(filtered), [filtered]);
    const values = useMemo(() => valueDistribution(filtered), [filtered]);
    const aging = useMemo(() => pendingAging(filtered), [filtered]);
    const leadTimes = useMemo(() => leadTimeDistribution(filtered), [filtered]);

    const statusData = (["pending", "delivered", "cancelled"] as OrderStatus[])
        .map(status => ({ name: STATUS_LABEL[status], value: filtered.filter(o => o.status === status).length, color: STATUS_COLORS[status] }))
        .filter(row => row.value > 0);
    const paymentData = useMemo(() => {
        const rows = [{ name: "Fully paid", color: COLORS.emerald, value: 0 }, { name: "Partly paid", color: COLORS.amber, value: 0 }, { name: "Unpaid", color: COLORS.rose, value: 0 }];
        for (const order of filtered) if (order.status !== "cancelled") rows[{ paid: 0, partial: 1, unpaid: 2 }[paymentState(order)]].value += 1;
        return rows.filter(row => row.value > 0);
    }, [filtered]);

    const sparkOf = (pick: (point: (typeof series)[number]) => number) => series.slice(-30).map(point => ({ v: pick(point) }));
    const p = (pick: (s: typeof summary) => number) => (prevSummary ? pick(prevSummary) : null);
    const mainColor = metric === "revenue" ? COLORS.blue : metric === "profit" ? COLORS.emerald : COLORS.violet;

    return (
        <div className="space-y-5">
            {insights.length > 0 && (
                <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 p-px">
                    <div className="rounded-[15px] bg-white p-4 dark:bg-gray-900">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-violet-600">✨ Highlights</p>
                        <ul className="grid gap-x-6 gap-y-1.5 text-sm md:grid-cols-2">
                            {insights.map(text => <li key={text} className="flex gap-2"><span className="text-violet-500">•</span>{text}</li>)}
                        </ul>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                <Kpi label="Orders" icon="📦" accent={COLORS.violet} value={number(summary.active)} hint={vsLabel ?? `${summary.cancelled} cancelled`} delta={<Delta current={summary.active} previous={p(s => s.active)} />} spark={sparkOf(point => point.orders)} />
                <Kpi label="Revenue" icon="💰" accent={COLORS.blue} value={money(summary.revenue)} hint={vsLabel ?? `avg ${money(summary.avgOrder)}`} delta={<Delta current={summary.revenue} previous={p(s => s.revenue)} />} spark={sparkOf(point => point.revenue)} />
                <Kpi label="Profit (est.)" icon="📈" accent={COLORS.emerald} value={money(summary.profit)} hint={`${summary.margin.toFixed(1)}% margin`} delta={<Delta current={summary.profit} previous={p(s => s.profit)} />} spark={sparkOf(point => point.profit)} />
                <Kpi label="Avg order value" icon="🧾" accent={COLORS.teal} value={money(summary.avgOrder)} hint={vsLabel} delta={<Delta current={summary.avgOrder} previous={p(s => s.avgOrder)} />} />
                <Kpi label="Commission earned" icon="🏷️" accent={COLORS.amber} value={money(summary.commission)} hint={`border cost ${money(summary.border)}`} delta={<Delta current={summary.commission} previous={p(s => s.commission)} />} />
                <Kpi label="Outstanding" icon="⏳" accent={COLORS.rose} value={money(summary.outstanding)} hint={`${summary.pending} pending · ${money(summary.collected)} collected`} delta={<Delta current={summary.outstanding} previous={p(s => s.outstanding)} lowerIsBetter />} />
                <Kpi label="Delivery rate" icon="🚚" accent={COLORS.orange} value={`${summary.deliveryRate.toFixed(0)}%`} hint={summary.avgLeadDays !== null ? `avg ${summary.avgLeadDays.toFixed(1)} days to deliver` : `${summary.delivered} delivered`} delta={<Delta current={summary.deliveryRate} previous={p(s => s.deliveryRate)} />} />
                <Kpi label="Customers" icon="👥" accent={COLORS.blue} value={number(summary.customers)} hint={`${Math.round(summary.repeatRate)}% repeat · ${summary.flagged} flagged`} delta={<Delta current={summary.customers} previous={p(s => s.customers)} />} />
            </div>

            <Card
                title="Trend over time"
                subtitle={`${ctx.granularity === "day" ? "Daily" : ctx.granularity === "week" ? "Weekly (Mon–Sun)" : "Monthly"} · cancelled orders excluded`}
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <Segmented options={["revenue", "profit", "orders"] as const} value={metric} onChange={setMetric} />
                        <Segmented options={["auto", "day", "week", "month"] as const} value={granularity} onChange={onGranularity} />
                    </div>
                }
            >
                {series.length ? (
                    <div className="h-80 text-gray-400">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                                <defs>
                                    <linearGradient id="mainBar" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={mainColor} stopOpacity={0.95} />
                                        <stop offset="100%" stopColor={mainColor} stopOpacity={0.45} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.15} />
                                <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={18} />
                                <YAxis {...axisProps} width={46} tickFormatter={compact} />
                                <Tooltip content={<ChartTip format={metric === "orders" ? number : money} />} cursor={{ fill: "currentColor", fillOpacity: 0.06 }} />
                                <Bar dataKey={metric} name={metric[0].toUpperCase() + metric.slice(1)} fill="url(#mainBar)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                                {metric === "revenue" && <Line type="monotone" dataKey="profit" name="Profit" stroke={COLORS.emerald} strokeWidth={2.5} dot={false} />}
                                {metric === "orders" && <Line type="monotone" dataKey="delivered" name="Delivered" stroke={COLORS.rose} strokeWidth={2.5} dot={false} />}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                ) : <Empty />}
            </Card>

            <div className="grid gap-5 lg:grid-cols-3">
                <Card title="Order status" subtitle="Share of all matching orders">
                    {statusData.length ? <Donut data={statusData} total={filtered.length} centerLabel="orders" /> : <Empty />}
                </Card>
                <Card title="Revenue by store" subtitle="Top stores by order value">
                    {storeGroups.length ? (
                        <div className="h-64 text-gray-400">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={storeGroups.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 12 }}>
                                    <CartesianGrid horizontal={false} stroke="currentColor" strokeOpacity={0.12} />
                                    <XAxis type="number" {...axisProps} tickFormatter={compact} />
                                    <YAxis type="category" dataKey="key" {...axisProps} width={78} />
                                    <Tooltip content={<ChartTip format={money} />} cursor={{ fill: "currentColor", fillOpacity: 0.06 }} />
                                    <Bar dataKey="revenue" name="Revenue" radius={[0, 6, 6, 0]} maxBarSize={22}>
                                        {storeGroups.slice(0, 8).map((_, index) => <Cell key={index} fill={PALETTE[index % PALETTE.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <Empty />}
                </Card>
                <Card title="Commission mix" subtitle="Orders by commission type">
                    {commissionGroups.length ? <Donut data={commissionGroups.map((g, i) => ({ name: g.key, value: g.orders, color: PALETTE[i % PALETTE.length] }))} total={summary.active} centerLabel="orders" /> : <Empty />}
                </Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                <Card title="Payment status" subtitle="Active orders by how much was paid">
                    {paymentData.length ? <Donut data={paymentData} total={summary.active} centerLabel="orders" /> : <Empty />}
                </Card>
                <Card title="Pending orders waiting" subtitle="How long undelivered orders have been open">
                    {aging.some(bucket => bucket.orders) ? (
                        <div className="h-64 text-gray-400">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={aging} margin={{ top: 8, right: 8, left: 0 }}>
                                    <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.12} />
                                    <XAxis dataKey="label" {...axisProps} />
                                    <YAxis {...axisProps} width={30} allowDecimals={false} />
                                    <Tooltip content={<ChartTip />} cursor={{ fill: "currentColor", fillOpacity: 0.06 }} />
                                    <Bar dataKey="orders" name="Orders" radius={[6, 6, 0, 0]} maxBarSize={44}>
                                        {aging.map((_, index) => <Cell key={index} fill={[COLORS.emerald, COLORS.amber, COLORS.orange, COLORS.rose][index]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <Empty text="No pending orders" />}
                </Card>
                <Card title="Deliveries by person" subtitle="Delivered orders, value and profit">
                    {delivererGroups.length ? (
                        <div className="overflow-x-auto">
                            <table className={tableCls}>
                                <thead><tr className={theadCls}><th className="px-3 py-2">Person</th><th className="px-3 py-2 text-right">Orders</th><th className="px-3 py-2 text-right">Value</th><th className="px-3 py-2 text-right">Profit</th></tr></thead>
                                <tbody>
                                    {delivererGroups.map(group => (
                                        <tr key={group.key} className={rowCls}>
                                            <td className={`${tdCls} font-medium`}>{group.key}</td>
                                            <td className={`${tdCls} text-right`}>{group.orders}</td>
                                            <td className={`${tdCls} text-right`}>{money(group.revenue)}</td>
                                            <td className={`${tdCls} text-right text-emerald-600`}>{money(group.profit)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <Empty text="No deliveries in this selection" />}
                </Card>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <MiniBars title="Orders by weekday" data={weekdays} color={COLORS.blue} />
                <MiniBars title="Orders by hour placed" data={hours} color={COLORS.violet} tickEvery={3} />
                <MiniBars title="Order value" data={values} color={COLORS.teal} />
                <MiniBars title="Days to deliver" data={leadTimes} color={COLORS.orange} />
            </div>
        </div>
    );
}
