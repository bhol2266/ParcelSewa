"use client";

import React, { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { deliveryByPerson, funnel, leadDays, marginByCommission, percentile, pricingAccuracy } from "@/lib/order-stats";
import { axisProps, Card, ChartTip, COLORS, DAY, Donut, Empty, money, number, percent, rowCls, Score, tableCls, tdCls, theadCls, type StatsContext } from "./ui";

const TARGET_DAY_OPTIONS = [7, 10, 14, 21];

export default function PerformanceTab({ ctx }: { ctx: StatsContext }) {
    const { filtered, summary, series } = ctx;
    const [targetDays, setTargetDays] = useState(10);
    const now = useMemo(() => new Date().getTime(), []);

    const active = useMemo(() => filtered.filter(order => order.status !== "cancelled"), [filtered]);
    const delivered = useMemo(() => active.filter(order => order.status === "delivered"), [active]);
    const leads = useMemo(() => delivered.map(leadDays).filter((days): days is number => days !== null), [delivered]);
    const onTime = leads.length ? (leads.filter(days => days <= targetDays).length / leads.length) * 100 : null;
    // A delivered order counts as settled (the balance is collected on delivery), so only pending orders can owe money.
    const withAdvance = active.length ? (active.filter(order => order.advance > 0).length / active.length) * 100 : null;
    const pendingBalances = useMemo(
        () => active.filter(order => order.status === "pending" && order.total - order.advance > 0).sort((a, b) => (b.total - b.advance) - (a.total - a.advance)),
        [active],
    );
    const accuracy = useMemo(() => pricingAccuracy(filtered), [filtered]);
    const accuracyPct = accuracy.verified ? (accuracy.ok / accuracy.verified) * 100 : null;
    const errorFree = summary.orders ? (1 - summary.flagged / summary.orders) * 100 : null;

    const stages = useMemo(() => funnel(filtered), [filtered]);
    const people = useMemo(() => deliveryByPerson(filtered, targetDays), [filtered, targetDays]);
    const margins = useMemo(() => marginByCommission(filtered), [filtered]);
    const marginTrend = useMemo(() => series.map(point => ({ label: point.label, margin: point.revenue ? (point.profit / point.revenue) * 100 : null })), [series]);
    const maxStage = Math.max(1, ...stages.map(stage => stage.value));

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">How well orders are being fulfilled, collected and priced, scored against simple targets.</p>
                <label className="flex items-center gap-2 text-xs text-gray-500">
                    Delivery target
                    <select value={targetDays} onChange={event => setTargetDays(Number(event.target.value))} className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900">
                        {TARGET_DAY_OPTIONS.map(days => <option key={days} value={days}>within {days} days</option>)}
                    </select>
                </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Score label="Delivery rate" value={summary.active ? summary.deliveryRate : null} display={percent(summary.deliveryRate)} target="85%+" goodAt={85} okAt={70} hint="newer orders may still be on the way" />
                <Score label="Avg delivery time" value={summary.avgLeadDays} display={summary.avgLeadDays !== null ? `${summary.avgLeadDays.toFixed(1)} days` : "—"} target={`≤ ${targetDays} days`} higherIsBetter={false} goodAt={targetDays} okAt={targetDays * 1.5} />
                <Score label="On-time deliveries" value={onTime} display={onTime !== null ? percent(onTime) : "—"} target="85%+" goodAt={85} okAt={65} hint={`within ${targetDays} days`} />
                <Score label="Cancellations" value={summary.orders ? summary.cancelRate : null} display={percent(summary.cancelRate, 1)} target="≤ 5%" higherIsBetter={false} goodAt={5} okAt={10} />
                <Score label="Profit margin" value={summary.revenue ? summary.margin : null} display={percent(summary.margin, 1)} target="15%+" goodAt={15} okAt={10} />
                <Score label="Orders with an advance" value={withAdvance} display={withAdvance !== null ? percent(withAdvance) : "—"} target="95%+" goodAt={95} okAt={85} hint={`${active.filter(order => order.advance <= 0).length} without`} />
                <Score label="Pricing accuracy" value={accuracyPct} display={accuracyPct !== null ? percent(accuracyPct) : "—"} target="90%+" goodAt={90} okAt={75} hint={accuracy.verified ? `${accuracy.verified} verified orders` : "use ✓ Verify on orders"} />
                <Score label="Orders without errors" value={errorFree} display={errorFree !== null ? percent(errorFree, 1) : "—"} target="95%+" goodAt={95} okAt={90} hint={`${summary.flagged} flagged`} />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
                <Card title="Order funnel" subtitle="How many orders reach each step (cancelled orders excluded)">
                    {stages[0].value ? (
                        <ul className="space-y-3">
                            {stages.map((stage, index) => {
                                const drop = index > 0 ? stages[index - 1].value - stage.value : 0;
                                return (
                                    <li key={stage.stage}>
                                        <div className="mb-1 flex items-baseline justify-between text-sm">
                                            <span className="font-medium">{stage.stage}</span>
                                            <span><span className="font-bold text-gray-900 dark:text-white">{number(stage.value)}</span> <span className="text-xs text-gray-400">{percent(stage.pct)}{drop > 0 && ` · ${drop} fewer`}</span></span>
                                        </div>
                                        <div className="h-6 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                                            <div className="h-6 rounded-lg" style={{ width: `${(stage.value / maxStage) * 100}%`, background: [COLORS.blue, COLORS.violet, COLORS.teal, COLORS.emerald][index] }} />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : <Empty />}
                </Card>

                <Card title="Delivery speed" subtitle="Days from order to delivery">
                    {leads.length ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {[
                                ["Fastest", Math.min(...leads)],
                                ["Median", percentile(leads, 50) ?? 0],
                                ["Slowest 10%", percentile(leads, 90) ?? 0],
                                ["Slowest", Math.max(...leads)],
                            ].map(([label, value]) => (
                                <div key={label as string} className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800/60">
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">{(value as number).toFixed(1)}</p>
                                    <p className="text-[11px] uppercase tracking-wider text-gray-400">{label as string} · days</p>
                                </div>
                            ))}
                        </div>
                    ) : <Empty text="No delivered orders in this selection" />}
                    {people.length > 0 && (
                        <div className="mt-4 overflow-x-auto">
                            <table className={tableCls}>
                                <thead><tr className={theadCls}><th className="px-3 py-2">Person</th><th className="px-3 py-2 text-right">Delivered</th><th className="px-3 py-2 text-right">Avg days</th><th className="px-3 py-2 text-right">On time</th><th className="px-3 py-2 text-right">Profit</th></tr></thead>
                                <tbody>
                                    {people.map(person => (
                                        <tr key={person.key} className={rowCls}>
                                            <td className={`${tdCls} font-medium`}>{person.key}</td>
                                            <td className={`${tdCls} text-right`}>{person.orders}</td>
                                            <td className={`${tdCls} text-right`}>{person.avgLead !== null ? person.avgLead.toFixed(1) : "—"}</td>
                                            <td className={`${tdCls} text-right ${person.onTime !== null && person.onTime >= 85 ? "text-emerald-600" : "text-amber-600"}`}>{person.onTime !== null ? percent(person.onTime) : "—"}</td>
                                            <td className={`${tdCls} text-right text-emerald-600`}>{money(person.profit)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
                <Card title="Profit margin by commission" subtitle="Profit as a share of sales for each commission type">
                    {margins.length ? (
                        <div className="overflow-x-auto">
                            <table className={tableCls}>
                                <thead><tr className={theadCls}><th className="px-3 py-2">Commission</th><th className="px-3 py-2 text-right">Orders</th><th className="px-3 py-2 text-right">Sales</th><th className="px-3 py-2 text-right">Profit</th><th className="px-3 py-2 text-right">Margin</th></tr></thead>
                                <tbody>
                                    {margins.map(row => (
                                        <tr key={row.key} className={rowCls}>
                                            <td className={`${tdCls} font-medium`}>{row.key}</td>
                                            <td className={`${tdCls} text-right`}>{row.orders}</td>
                                            <td className={`${tdCls} text-right`}>{money(row.revenue)}</td>
                                            <td className={`${tdCls} text-right text-emerald-600`}>{money(row.profit)}</td>
                                            <td className={`${tdCls} text-right font-semibold`}>{percent(row.margin, 1)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <Empty />}
                </Card>

                <Card title="Margin trend" subtitle="Profit ÷ sales for each period">
                    {marginTrend.some(point => point.margin !== null) ? (
                        <div className="h-60 text-gray-400">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={marginTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.15} />
                                    <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={18} />
                                    <YAxis {...axisProps} width={38} tickFormatter={value => `${Math.round(value)}%`} />
                                    <Tooltip content={<ChartTip format={value => percent(value, 1)} />} />
                                    <Line type="monotone" dataKey="margin" name="Margin" stroke={COLORS.emerald} strokeWidth={2.5} dot={false} connectNulls />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <Empty />}
                </Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
                <Card title="Pricing accuracy" subtitle="From the ✓ Verify button on each order (±NPR 200 counts as accurate)">
                    {accuracy.verified ? (
                        <Donut
                            data={[
                                { name: "Accurate", value: accuracy.ok, color: COLORS.emerald },
                                { name: "Priced too low", value: accuracy.under, color: COLORS.rose },
                                { name: "Priced higher", value: accuracy.over, color: COLORS.blue },
                            ].filter(row => row.value > 0)}
                            total={accuracy.verified}
                            centerLabel="verified"
                        />
                    ) : <Empty text="No orders verified yet. Press ✓ Verify on an order card." />}
                </Card>

                <Card title="Biggest pending balances" subtitle="Pending orders with the most money still to collect">
                    {pendingBalances.length ? (
                        <div className="max-h-72 overflow-auto">
                            <table className={tableCls}>
                                <thead className="sticky top-0 bg-white dark:bg-gray-900"><tr className={theadCls}><th className="px-3 py-2">Customer</th><th className="px-3 py-2 text-right">Waiting</th><th className="px-3 py-2 text-right">Balance</th></tr></thead>
                                <tbody>
                                    {pendingBalances.slice(0, 20).map(order => (
                                        <tr key={order.id} className={rowCls}>
                                            <td className={`${tdCls} font-medium`}>{order.name}<span className="block text-xs font-normal text-gray-400">{order.store} · {order.mobile}</span></td>
                                            <td className={`${tdCls} text-right text-gray-500`}>{order.createdAt ? `${Math.max(0, Math.floor((now - order.createdAt.getTime()) / DAY))} days` : "—"}</td>
                                            <td className={`${tdCls} text-right font-semibold text-rose-600`}>{money(order.total - order.advance)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="px-3 pt-2 text-xs text-gray-400">{pendingBalances.length} pending orders · {money(pendingBalances.reduce((total, order) => total + (order.total - order.advance), 0))} to collect</p>
                        </div>
                    ) : <Empty text="No pending balances 🎉" />}
                </Card>
            </div>
        </div>
    );
}
