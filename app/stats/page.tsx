"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import Link from "next/link";
import KpiCards from "./KpiCards";
import RevenueChart from "./RevenueChart";
import OrdersVolumeChart from "./OrdersVolumeChart";
import CommissionChart from "./CommissionChart";
import DeliveryPersonChart from "./DeliveryPersonChart";
import PendingAging from "./PendingAging";
import TopCustomers from "./TopCustomers";
import AvgOrderValueChart from "./AvgOrderValueChart";

interface Order {
    id: string;
    [key: string]: any;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const monthLabel = (ts: any) => {
    const d = ts?.seconds ? new Date(ts.seconds * 1000) : ts?.toDate?.();
    if (!d) return "Unknown";
    return d.toLocaleString("en-US", { month: "short", year: "2-digit" });
};

const commissionRate = (o: Order) =>
    parseFloat(o.commission?.replace("%", "") || "0") / 100;

const calcProfit = (o: Order) => {
    const rate = commissionRate(o);
    if (rate === 0) return 0;
    const principal = (o.totalAmount || 0) / (1 + rate);
    return principal * (rate - 0.05) - 100;
};

const daysDiff = (ts: any) => {
    const d = ts?.seconds ? new Date(ts.seconds * 1000) : ts?.toDate?.();
    if (!d) return 0;
    return Math.floor((Date.now() - d.getTime()) / 86_400_000);
};

// ─── page ────────────────────────────────────────────────────────────────────

export default function StatsPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    const fetchOrders = async () => {
        setLoading(true);
        const q = query(
            collection(db, "Confirm Orders"),
            orderBy("orderedDate", "desc"),
            limit(500)
        );
        const snap = await getDocs(q);
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[]);
        setLastRefreshed(new Date());
        setLoading(false);
    };

    useEffect(() => { fetchOrders(); }, []);

    // ── derived stats ──────────────────────────────────────────────────────

    const stats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        // ── KPIs ──
        const delivered = orders.filter((o) => o.deliveryStatus === true);
        const pending = orders.filter((o) => o.deliveryStatus !== true);

        const deliveredRevenue = delivered.reduce((s, o) => s + (o.totalAmount || 0), 0);
        const advanceFromPending = pending.reduce((s, o) => s + (o.advancePayment || 0), 0);
        const totalRevenue = deliveredRevenue + advanceFromPending;
        const remainingPayment = pending.reduce(
            (s, o) => s + ((o.totalAmount || 0) - (o.advancePayment || 0)),
            0
        );
        const realizedProfit = delivered.reduce((s, o) => s + calcProfit(o), 0);
        const estimatedProfit = orders.reduce((s, o) => s + calcProfit(o), 0);

        const ankushThisMonth = orders.filter((o) => {
            if (!o.deliveryStatus || o.deliveredBy !== "Ankush" || !o.deliveryDate?.seconds) return false;
            const d = new Date(o.deliveryDate.seconds * 1000);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        const ankushLastMonth = orders.filter((o) => {
            if (!o.deliveryStatus || o.deliveredBy !== "Ankush" || !o.deliveryDate?.seconds) return false;
            const d = new Date(o.deliveryDate.seconds * 1000);
            return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
        });

        const borderCommission5pct = (arr: Order[]) =>
            arr.reduce((s, o) => {
                const rate = commissionRate(o);
                if (rate === 0) return s;
                return s + ((o.totalAmount || 0) / (1 + rate)) * 0.05;
            }, 0);

        const borderCommissionThisMonth = borderCommission5pct(ankushThisMonth);
        const borderCommissionLastMonth = borderCommission5pct(ankushLastMonth);

        // ── monthly buckets ──
        const monthMap: Record<string, {
            revenue: number; profit: number; placed: number; delivered: number; pending: number;
            totalAmount: number; orderCount: number;
        }> = {};

        orders.forEach((o) => {
            const label = monthLabel(o.orderedDate);
            if (!monthMap[label]) monthMap[label] = { revenue: 0, profit: 0, placed: 0, delivered: 0, pending: 0, totalAmount: 0, orderCount: 0 };
            monthMap[label].placed++;
            monthMap[label].totalAmount += o.totalAmount || 0;
            monthMap[label].orderCount++;
            if (o.deliveryStatus) {
                monthMap[label].revenue += o.totalAmount || 0;
                monthMap[label].profit += calcProfit(o);
                monthMap[label].delivered++;
            } else {
                monthMap[label].pending++;
                monthMap[label].revenue += o.advancePayment || 0;
            }
        });

        // Sort months chronologically
        const monthlyKeys = Object.keys(monthMap).sort((a, b) => {
            const parse = (s: string) => {
                const [mon, yr] = s.split(" ");
                return new Date(`${mon} 20${yr}`).getTime();
            };
            return parse(a) - parse(b);
        });

        const monthlyRevenue = monthlyKeys.map((m) => ({
            month: m,
            revenue: Math.round(monthMap[m].revenue),
            profit: Math.round(monthMap[m].profit),
            orders: monthMap[m].placed,
        }));

        const monthlyOrders = monthlyKeys.map((m) => ({
            month: m,
            placed: monthMap[m].placed,
            delivered: monthMap[m].delivered,
            pending: monthMap[m].pending,
        }));

        const monthlyAvg = monthlyKeys.map((m) => ({
            month: m,
            avgOrderValue: monthMap[m].orderCount > 0
                ? Math.round(monthMap[m].totalAmount / monthMap[m].orderCount)
                : 0,
            avgProfit: monthMap[m].delivered > 0
                ? Math.round(monthMap[m].profit / monthMap[m].delivered)
                : 0,
        }));

        // ── commission tiers ──
        const tierMap: Record<string, { count: number; revenue: number }> = {};
        orders.forEach((o) => {
            const tier = o.commission || "0%";
            if (!tierMap[tier]) tierMap[tier] = { count: 0, revenue: 0 };
            tierMap[tier].count++;
            tierMap[tier].revenue += o.totalAmount || 0;
        });
        const commissionData = Object.entries(tierMap)
            .map(([tier, v]) => ({ tier, ...v }))
            .sort((a, b) => parseInt(a.tier) - parseInt(b.tier));

        // ── delivery person ──
        const dpMonthMap: Record<string, { Ankush: number; Bhola: number }> = {};
        const dpSummary: Record<string, { total: number; commission: number }> = {
            Ankush: { total: 0, commission: 0 },
            Bhola: { total: 0, commission: 0 },
        };

        delivered.forEach((o) => {
            const person = o.deliveredBy;
            if (person !== "Ankush" && person !== "Bhola") return;
            const label = monthLabel(o.deliveryDate);
            if (!dpMonthMap[label]) dpMonthMap[label] = { Ankush: 0, Bhola: 0 };
            dpMonthMap[label][person as "Ankush" | "Bhola"]++;
            dpSummary[person].total++;
            const rate = commissionRate(o);
            if (rate > 0) dpSummary[person].commission += ((o.totalAmount || 0) / (1 + rate)) * 0.05;
        });

        const dpKeys = Object.keys(dpMonthMap).sort((a, b) => {
            const parse = (s: string) => new Date(`${s.split(" ")[0]} 20${s.split(" ")[1]}`).getTime();
            return parse(a) - parse(b);
        });
        const deliveryPersonMonthly = dpKeys.map((m) => ({ month: m, ...dpMonthMap[m] }));
        const deliveryPersonSummary = Object.entries(dpSummary).map(([name, v]) => ({ name, ...v }));

        // ── pending aging ──
        const buckets = [
            { label: "0–7 days", min: 0, max: 7, color: "rgba(16,185,129,0.1)", accent: "#10b981" },
            { label: "8–30 days", min: 8, max: 30, color: "rgba(245,158,11,0.1)", accent: "#f59e0b" },
            { label: "31–60 days", min: 31, max: 60, color: "rgba(249,115,22,0.1)", accent: "#f97316" },
            { label: "60+ days", min: 61, max: Infinity, color: "rgba(239,68,68,0.1)", accent: "#ef4444" },
        ].map((b) => ({
            ...b,
            count: pending.filter((o) => {
                const d = daysDiff(o.orderedDate);
                return d >= b.min && d <= b.max;
            }).length,
        }));

        const oldestPending = pending
            .map((o) => ({ ...o, daysWaiting: daysDiff(o.orderedDate) }))
            .sort((a, b) => b.daysWaiting - a.daysWaiting)
            .slice(0, 5);

        // ── top customers ──
        const custMap: Record<string, {
            name: string; mobile: string; orderCount: number;
            totalRevenue: number; totalProfit: number; lastOrderDate: number;
        }> = {};

        orders.forEach((o) => {
            const key = o.mobile || o.name;
            if (!key) return;
            const ts = o.orderedDate?.seconds ? o.orderedDate.seconds * 1000 : 0;
            if (!custMap[key]) custMap[key] = { name: o.name, mobile: o.mobile || "", orderCount: 0, totalRevenue: 0, totalProfit: 0, lastOrderDate: 0 };
            custMap[key].orderCount++;
            custMap[key].totalRevenue += o.totalAmount || 0;
            custMap[key].totalProfit += calcProfit(o);
            if (ts > custMap[key].lastOrderDate) custMap[key].lastOrderDate = ts;
        });

        const topCustomers = Object.values(custMap)
            .map((c) => ({
                ...c,
                lastOrderDate: c.lastOrderDate > 0
                    ? new Date(c.lastOrderDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                    : "—",
            }))
            .sort((a, b) => b.orderCount - a.orderCount);

        return {
            kpi: { totalOrders: orders.length, delivered: delivered.length, pending: pending.length, totalRevenue, remainingPayment, realizedProfit, estimatedProfit, borderCommissionThisMonth, borderCommissionLastMonth },
            monthlyRevenue,
            monthlyOrders,
            monthlyAvg,
            commissionData,
            deliveryPersonMonthly,
            deliveryPersonSummary,
            agingBuckets: buckets,
            oldestPending,
            topCustomers,
        };
    }, [orders]);

    // ── render ──────────────────────────────────────────────────────────────

    return (
        <div
            className="min-h-screen"
            style={{
                background: "linear-gradient(160deg, #f8faff 0%, #eef2ff 50%, #f0fdf4 100%)",
                fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
        >
            {/* Subtle ambient blobs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/3 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: "#c7d2fe" }} />
                <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full blur-3xl opacity-15" style={{ background: "#a7f3d0" }} />
            </div>

            <div className="relative max-w-screen-xl mx-auto px-4 sm:px-6 py-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link
                                href="/admin"
                                className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                            >
                                ← Back to Admin
                            </Link>
                            <span className="text-slate-300">·</span>
                            <span
                                className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
                                style={{ background: "#eef2ff", color: "#6366f1" }}
                            >
                                Analytics
                            </span>
                        </div>
                        <h1
                            className="text-4xl font-black"
                            style={{ letterSpacing: "-0.03em", color: "#0f172a" }}
                        >
                            Business Stats
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Last refreshed: {lastRefreshed.toLocaleTimeString()}
                        </p>
                    </div>
                    <button
                        onClick={fetchOrders}
                        disabled={loading}
                        className="self-start sm:self-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all duration-150 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff" }}
                    >
                        <span className={loading ? "animate-spin inline-block" : "inline-block"}>↻</span>
                        {loading ? "Loading…" : "Refresh Data"}
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40 gap-4">
                        <div className="w-12 h-12 rounded-full border-4 border-indigo-400 border-t-transparent animate-spin" />
                        <p className="text-slate-400 text-sm font-medium">Crunching your numbers…</p>
                    </div>
                ) : (
                    <div className="space-y-8">

                        {/* KPI Cards */}
                        <KpiCards {...stats.kpi} />

                        {/* Revenue + Orders Volume */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <RevenueChart data={stats.monthlyRevenue} />
                            <OrdersVolumeChart data={stats.monthlyOrders} />
                        </div>

                        {/* Avg Order Value + Commission */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <AvgOrderValueChart data={stats.monthlyAvg} />
                            <CommissionChart data={stats.commissionData} />
                        </div>

                        {/* Top Customers + Delivery Person */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <TopCustomers customers={stats.topCustomers} />
                            <DeliveryPersonChart
                                monthlyData={stats.deliveryPersonMonthly}
                                summary={stats.deliveryPersonSummary}
                            />
                        </div>

                        {/* Pending Aging full width */}
                        <PendingAging
                            buckets={stats.agingBuckets}
                            oldestOrders={stats.oldestPending}
                        />

                        {/* Footer */}
                        <p className="text-center text-slate-400 text-xs pb-4">
                            Showing last 500 orders · Data from Firebase
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
