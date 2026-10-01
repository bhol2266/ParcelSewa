"use client";

import React, { useMemo, useState } from "react";
import { groupBy, topCustomers, topHosts } from "@/lib/order-stats";
import { Card, Empty, money, number, rowCls, shortDate, STATUS_COLORS, STATUS_LABEL, tableCls, tdCls, Th, useSort, type StatsContext } from "./ui";

const PAGE_SIZE = 15;

export default function OrdersTab({ ctx }: { ctx: StatsContext }) {
    const { filtered } = ctx;
    const [page, setPage] = useState(0);
    // Go back to the first page whenever the filters change what is listed.
    const [listed, setListed] = useState(filtered);
    if (listed !== filtered) {
        setListed(filtered);
        setPage(0);
    }

    const customers = useMemo(() => topCustomers(filtered), [filtered]);
    const hosts = useMemo(() => topHosts(filtered), [filtered]);
    const stores = useMemo(() => groupBy(filtered, order => order.store), [filtered]);

    const customerSort = useSort(customers, "revenue");
    const storeSort = useSort(stores, "revenue");
    const hostSort = useSort(hosts, "orders");
    const orderSort = useSort(filtered, "createdAt");

    const pageCount = Math.max(1, Math.ceil(orderSort.sorted.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount - 1);
    const pageRows = orderSort.sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
    const maxHostOrders = hostSort.sorted.reduce((max, row) => Math.max(max, row.orders), 1);

    return (
        <div className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-2">
                <Card title="Stores" subtitle="Click a column to sort">
                    {storeSort.sorted.length ? (
                        <div className="overflow-x-auto">
                            <table className={tableCls}>
                                <thead><tr>
                                    <Th label="Store" field="key" sort={storeSort} /><Th label="Orders" field="orders" sort={storeSort} align="right" />
                                    <Th label="Revenue" field="revenue" sort={storeSort} align="right" /><Th label="Profit" field="profit" sort={storeSort} align="right" /><Th label="Avg order" field="avg" sort={storeSort} align="right" />
                                </tr></thead>
                                <tbody>
                                    {storeSort.sorted.map(group => (
                                        <tr key={group.key} className={rowCls}>
                                            <td className={`${tdCls} font-medium`}>{group.key}</td>
                                            <td className={`${tdCls} text-right`}>{group.orders}</td>
                                            <td className={`${tdCls} text-right`}>{money(group.revenue)}</td>
                                            <td className={`${tdCls} text-right text-emerald-600`}>{money(group.profit)}</td>
                                            <td className={`${tdCls} text-right text-gray-500`}>{money(group.avg)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <Empty />}
                </Card>
                <Card title="Websites ordered from" subtitle="From the product links in the orders">
                    {hostSort.sorted.length ? (
                        <div className="max-h-80 overflow-auto">
                            <table className={tableCls}>
                                <thead><tr><Th label="Website" field="host" sort={hostSort} /><Th label="Orders" field="orders" sort={hostSort} align="right" /><Th label="Value" field="revenue" sort={hostSort} align="right" /><th className="w-1/4 px-3 py-2" /></tr></thead>
                                <tbody>
                                    {hostSort.sorted.slice(0, 40).map(row => (
                                        <tr key={row.host} className={rowCls}>
                                            <td className={`${tdCls} font-medium`}>{row.host}</td>
                                            <td className={`${tdCls} text-right`}>{row.orders}</td>
                                            <td className={`${tdCls} text-right text-gray-500`}>{money(row.revenue)}</td>
                                            <td className={tdCls}><div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${(row.orders / maxHostOrders) * 100}%` }} /></div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <Empty />}
                </Card>
            </div>

            <Card title="Top customers" subtitle={`${number(customers.length)} customers · click a column to sort`}>
                {customerSort.sorted.length ? (
                    <div className="max-h-96 overflow-auto">
                        <table className={tableCls}>
                            <thead className="sticky top-0 bg-white dark:bg-gray-900"><tr>
                                <Th label="Customer" field="name" sort={customerSort} /><Th label="Mobile" field="mobile" sort={customerSort} />
                                <Th label="Orders" field="orders" sort={customerSort} align="right" /><Th label="Revenue" field="revenue" sort={customerSort} align="right" />
                                <Th label="Profit" field="profit" sort={customerSort} align="right" /><Th label="Last order" field="last" sort={customerSort} align="right" />
                            </tr></thead>
                            <tbody>
                                {customerSort.sorted.slice(0, 50).map(customer => (
                                    <tr key={customer.key} className={rowCls}>
                                        <td className={`${tdCls} font-medium`}>{customer.name}{customer.orders > 1 && <span className="ml-2 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600 dark:bg-violet-950">repeat</span>}</td>
                                        <td className={`${tdCls} text-gray-500`}>{customer.mobile || "—"}</td>
                                        <td className={`${tdCls} text-right`}>{customer.orders}</td>
                                        <td className={`${tdCls} text-right`}>{money(customer.revenue)}</td>
                                        <td className={`${tdCls} text-right text-emerald-600`}>{money(customer.profit)}</td>
                                        <td className={`${tdCls} text-right text-gray-500`}>{shortDate(customer.last)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <Empty />}
            </Card>

            <Card title="All matching orders" subtitle={`${number(filtered.length)} orders · click a column to sort`} action={<span className="text-xs text-gray-400">Page {safePage + 1} of {pageCount}</span>}>
                {pageRows.length ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className={tableCls}>
                                <thead><tr>
                                    <Th label="Placed" field="createdAt" sort={orderSort} /><Th label="Customer" field="name" sort={orderSort} /><Th label="Store" field="store" sort={orderSort} />
                                    <Th label="Comm." field="commission" sort={orderSort} /><Th label="Total" field="total" sort={orderSort} align="right" /><Th label="Paid" field="advance" sort={orderSort} align="right" />
                                    <Th label="Remaining" field="remaining" sort={orderSort} align="right" /><Th label="Profit" field="profit" sort={orderSort} align="right" /><Th label="Status" field="status" sort={orderSort} />
                                </tr></thead>
                                <tbody>
                                    {pageRows.map(order => (
                                        <tr key={order.id} className={rowCls}>
                                            <td className={`${tdCls} whitespace-nowrap text-gray-500`}>{shortDate(order.createdAt)}</td>
                                            <td className={`${tdCls} font-medium`}>{order.name}{order.flagged && <span title="Flagged with an error" className="ml-1.5">⚠️</span>}</td>
                                            <td className={tdCls}>{order.store}</td>
                                            <td className={`${tdCls} whitespace-nowrap text-gray-500`}>{order.commission || "—"}</td>
                                            <td className={`${tdCls} text-right`}>{number(order.total)}</td>
                                            <td className={`${tdCls} text-right text-gray-500`}>{number(order.advance)}</td>
                                            <td className={`${tdCls} text-right ${order.remaining > 0 && order.status === "pending" ? "font-semibold text-rose-600" : "text-gray-400"}`}>{number(order.remaining)}</td>
                                            <td className={`${tdCls} text-right ${order.profit < 0 ? "text-rose-600" : "text-emerald-600"}`}>{number(order.profit)}</td>
                                            <td className={tdCls}><span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: `${STATUS_COLORS[order.status]}22`, color: STATUS_COLORS[order.status] }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLORS[order.status] }} />{STATUS_LABEL[order.status]}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                            <button type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} className="rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-gray-200 disabled:opacity-40 dark:ring-gray-700">← Previous</button>
                            <span className="text-xs text-gray-400">{safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {number(filtered.length)}</span>
                            <button type="button" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)} className="rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-gray-200 disabled:opacity-40 dark:ring-gray-700">Next →</button>
                        </div>
                    </>
                ) : <Empty />}
            </Card>
        </div>
    );
}
