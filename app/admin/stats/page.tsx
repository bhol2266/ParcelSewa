"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { ADMIN_COOKIE, ADMIN_PASSWORD } from "@/lib/admin-access";
import {
    applyFilters, emptyFilters, normalizeOrder, ordersToCsv, previousRange, rangeFor, summarize, timeSeries,
    type Filters, type Granularity, type OrderStatus, type PaymentFilter, type RangePreset, type StatOrder, type Summary,
} from "@/lib/order-stats";
import { Card, Chips, DAY, number, shortDate, STATUS_LABEL, type StatsContext } from "./ui";
import OverviewTab from "./OverviewTab";
import SalesTab from "./SalesTab";
import PerformanceTab from "./PerformanceTab";
import AnalyticsTab from "./AnalyticsTab";
import OrdersTab from "./OrdersTab";

const PRESETS: { value: RangePreset; label: string }[] = [
    { value: "this-month", label: "This month" }, { value: "last-month", label: "Last month" }, { value: "30d", label: "30 days" },
    { value: "90d", label: "90 days" }, { value: "this-year", label: "This year" }, { value: "all", label: "All time" }, { value: "custom", label: "Custom" },
];

const TABS = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "sales", label: "Sales", icon: "💰" },
    { id: "performance", label: "Performance", icon: "🎯" },
    { id: "analytics", label: "Analytics", icon: "🔬" },
    { id: "orders", label: "Orders & customers", icon: "🧾" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function StatsPage() {
    const [accessGranted, setAccessGranted] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const passwordRef = useRef<HTMLInputElement>(null);

    const [orders, setOrders] = useState<StatOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [loadedAt, setLoadedAt] = useState<Date | null>(null);

    const [tab, setTab] = useState<TabId>("overview");

    // Filters
    const [preset, setPreset] = useState<RangePreset>("this-month");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [dateBasis, setDateBasis] = useState<Filters["dateBasis"]>("created");
    const [stores, setStores] = useState<string[]>([]);
    const [statuses, setStatuses] = useState<OrderStatus[]>([]);
    const [commissions, setCommissions] = useState<string[]>([]);
    const [deliveredBy, setDeliveredBy] = useState<string[]>([]);
    const [payment, setPayment] = useState<PaymentFilter>("all");
    const [flaggedOnly, setFlaggedOnly] = useState(false);
    const [search, setSearch] = useState("");
    const [granularity, setGranularity] = useState<"auto" | Granularity>("auto");

    // The selected tab lives in the address (#sales), so a tab can be bookmarked or shared.
    useEffect(() => {
        const fromHash = window.location.hash.replace("#", "") as TabId;
        if (TABS.some(item => item.id === fromHash)) setTab(fromHash);
    }, []);
    const selectTab = (next: TabId) => {
        setTab(next);
        window.history.replaceState(null, "", `#${next}`);
    };

    useEffect(() => {
        if (Cookies.get(ADMIN_COOKIE) === ADMIN_PASSWORD) setAccessGranted(true);
        else setTimeout(() => passwordRef.current?.focus(), 300);
    }, []);
    useEffect(() => {
        if (passwordInput === ADMIN_PASSWORD) {
            setAccessGranted(true);
            setPasswordInput("");
            Cookies.set(ADMIN_COOKIE, ADMIN_PASSWORD, { expires: 5, path: "/" });
        }
    }, [passwordInput]);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError("");
        try {
            const snap = await getDocs(collection(db, "Confirm Orders"));
            setOrders(snap.docs.map(d => normalizeOrder(d.id, d.data())));
            setLoadedAt(new Date());
        } catch (error) {
            console.error("Failed to load orders:", error);
            setLoadError("Could not load the orders. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { if (accessGranted) load(); }, [accessGranted, load]);

    // ── Derived data ─────────────────────────────────────────────────────────
    const range = useMemo(() => {
        if (preset !== "custom") return rangeFor(preset);
        const from = customFrom ? new Date(`${customFrom}T00:00:00`) : null;
        const to = customTo ? new Date(new Date(`${customTo}T00:00:00`).getTime() + DAY) : null;
        return { from, to };
    }, [preset, customFrom, customTo]);

    const filters = useMemo<Filters>(() => ({
        ...emptyFilters(), ...range, dateBasis, stores, statuses, commissions, deliveredBy, payment, flaggedOnly, search,
    }), [range, dateBasis, stores, statuses, commissions, deliveredBy, payment, flaggedOnly, search]);

    const filtered = useMemo(() => applyFilters(orders, filters), [orders, filters]);
    const summary = useMemo(() => summarize(filtered), [filtered]);
    const prevRange = useMemo(() => previousRange(range.from, range.to), [range]);
    const previous = useMemo(() => (prevRange ? applyFilters(orders, { ...filters, from: prevRange.from, to: prevRange.to }) : []), [orders, filters, prevRange]);
    const prevSummary = useMemo<Summary | null>(() => (prevRange ? summarize(previous) : null), [prevRange, previous]);

    const effectiveGranularity: Granularity = useMemo(() => {
        if (granularity !== "auto") return granularity;
        const dates = filtered.map(o => (dateBasis === "delivered" ? o.deliveryDate : o.createdAt)).filter((d): d is Date => d !== null);
        const start = range.from ?? (dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : null);
        const end = range.to ?? (dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : null);
        const days = start && end ? (end.getTime() - start.getTime()) / DAY : 0;
        return days <= 45 ? "day" : days <= 200 ? "week" : "month";
    }, [granularity, filtered, dateBasis, range]);
    const series = useMemo(() => timeSeries(filtered, effectiveGranularity, dateBasis), [filtered, effectiveGranularity, dateBasis]);

    const rangeLabel = preset === "all" ? "All time" : range.from && range.to ? `${shortDate(range.from)} – ${shortDate(new Date(range.to.getTime() - 1))}` : "Pick a date range";
    const ctx: StatsContext = useMemo(() => ({
        orders, filtered, previous, summary, prevSummary, series, granularity: effectiveGranularity, dateBasis, range, rangeLabel,
        vsLabel: prevSummary ? "vs previous period" : undefined,
    }), [orders, filtered, previous, summary, prevSummary, series, effectiveGranularity, dateBasis, range, rangeLabel]);

    // Filter options come from all orders, so a chip never disappears while you are using it.
    const storeOptions = useMemo(() => Object.entries(orders.reduce<Record<string, number>>((acc, o) => ({ ...acc, [o.store]: (acc[o.store] || 0) + 1 }), {}))
        .sort((a, b) => b[1] - a[1]).slice(0, 14).map(([value, count]) => ({ value, count })), [orders]);
    const commissionOptions = useMemo(() => Object.entries(orders.reduce<Record<string, number>>((acc, o) => (o.commission ? { ...acc, [o.commission]: (acc[o.commission] || 0) + 1 } : acc), {}))
        .sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count })), [orders]);
    const delivererOptions = useMemo(() => [...new Set(orders.map(o => o.deliveredBy || "—"))].sort().map(value => ({ value })), [orders]);

    const toggle = <T,>(list: T[], set: (next: T[]) => void) => (value: T) => set(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
    const activeFilterCount = stores.length + statuses.length + commissions.length + deliveredBy.length + (payment !== "all" ? 1 : 0) + (flaggedOnly ? 1 : 0) + (search ? 1 : 0);
    const resetAll = () => {
        setPreset("this-month"); setCustomFrom(""); setCustomTo(""); setDateBasis("created"); setStores([]); setStatuses([]); setCommissions([]);
        setDeliveredBy([]); setPayment("all"); setFlaggedOnly(false); setSearch(""); setGranularity("auto");
    };

    const exportCsv = () => {
        const newestFirst = [...filtered].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
        const blob = new Blob([ordersToCsv(newestFirst)], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `parcelsewa-orders-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-gray-50/60 text-gray-700 dark:bg-gray-950 dark:text-gray-300">
            <div className={`mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 ${!accessGranted ? "pointer-events-none select-none blur-md" : ""}`}>
                {/* ── Header ── */}
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <Link href="/admin" className="text-xs font-medium text-gray-400 hover:text-gray-600">← Back to orders</Link>
                        <h1 className="mt-1 bg-gradient-to-r from-blue-600 via-violet-600 to-emerald-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">Stats</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {rangeLabel} · {number(filtered.length)} of {number(orders.length)} orders
                            {loadedAt && <span className="text-gray-400"> · updated {loadedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={load} disabled={loading} className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:opacity-60 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700">
                            {loading ? "Refreshing…" : "↻ Refresh"}
                        </button>
                        <button type="button" onClick={exportCsv} disabled={!filtered.length} className="rounded-xl bg-gray-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900">
                            ⬇ Export CSV
                        </button>
                    </div>
                </div>

                {loadError && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">{loadError}</p>}

                {/* ── Filters ── */}
                <Card>
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            {PRESETS.map(option => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setPreset(option.value)}
                                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${preset === option.value ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                            {preset === "custom" && (
                                <span className="flex flex-wrap items-center gap-2">
                                    <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900" aria-label="From date" />
                                    <span className="text-gray-400">to</span>
                                    <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900" aria-label="To date" />
                                </span>
                            )}
                            <span className="flex flex-wrap items-center gap-2 lg:ml-auto">
                                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                                    Date by
                                    <select value={dateBasis} onChange={e => setDateBasis(e.target.value as Filters["dateBasis"])} className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900">
                                        <option value="created">Order placed</option>
                                        <option value="delivered">Delivered on</option>
                                    </select>
                                </label>
                                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                                    Payment
                                    <select value={payment} onChange={e => setPayment(e.target.value as PaymentFilter)} className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900">
                                        <option value="all">All</option>
                                        <option value="paid">Fully paid</option>
                                        <option value="partial">Partly paid</option>
                                        <option value="unpaid">Unpaid</option>
                                    </select>
                                </label>
                                <button type="button" onClick={() => setFlaggedOnly(!flaggedOnly)} className={`rounded-lg px-2.5 py-1.5 text-sm font-medium ring-1 transition ${flaggedOnly ? "bg-orange-500 text-white ring-orange-500" : "bg-white text-gray-600 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700"}`}>
                                    ⚠️ Errors only
                                </button>
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search name or mobile…"
                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 sm:w-52"
                                />
                            </span>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <Chips label="Status" options={(["pending", "delivered", "cancelled"] as OrderStatus[]).map(value => ({ value, label: STATUS_LABEL[value] }))} selected={statuses} onToggle={toggle(statuses, setStatuses)} />
                            <Chips label="Store" options={storeOptions} selected={stores} onToggle={toggle(stores, setStores)} />
                            <Chips label="Commission" options={commissionOptions} selected={commissions} onToggle={toggle(commissions, setCommissions)} />
                            <Chips label="Delivered by" options={delivererOptions} selected={deliveredBy} onToggle={toggle(deliveredBy, setDeliveredBy)} />
                        </div>
                        {activeFilterCount > 0 && (
                            <button type="button" onClick={resetAll} className="text-xs font-semibold text-blue-600 hover:underline">Reset all filters ({activeFilterCount} active)</button>
                        )}
                    </div>
                </Card>

                {/* ── Tabs ── */}
                <div role="tablist" aria-label="Stats sections" className="flex gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10">
                    {TABS.map(item => (
                        <button
                            key={item.id}
                            role="tab"
                            aria-selected={tab === item.id}
                            type="button"
                            onClick={() => selectTab(item.id)}
                            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === item.id ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                        >
                            <span aria-hidden>{item.icon}</span>{item.label}
                        </button>
                    ))}
                </div>

                {loading && !orders.length ? (
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-200/70 dark:bg-gray-800" />)}
                    </div>
                ) : (
                    <>
                        {tab === "overview" && <OverviewTab ctx={ctx} granularity={granularity} onGranularity={setGranularity} />}
                        {tab === "sales" && <SalesTab ctx={ctx} />}
                        {tab === "performance" && <PerformanceTab ctx={ctx} />}
                        {tab === "analytics" && <AnalyticsTab ctx={ctx} />}
                        {tab === "orders" && <OrdersTab ctx={ctx} />}
                        <p className="pb-6 text-center text-xs text-gray-400">
                            Revenue and profit exclude cancelled orders. Profit = commission earned − 7% border cost on the product price. Courier charges are not included.
                        </p>
                    </>
                )}
            </div>

            {!accessGranted && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="w-80 rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-900">
                        <h2 className="mb-4 text-2xl font-bold">Admin Access</h2>
                        <input
                            type="password"
                            placeholder="Enter Password"
                            value={passwordInput}
                            onChange={e => setPasswordInput(e.target.value)}
                            className="w-full rounded-md border px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-blue-500"
                            ref={passwordRef}
                            autoFocus
                            inputMode="numeric"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
