"use client";

import React, { useState, useMemo } from "react";

interface Order {
    id: string;
    [key: string]: any;
}

interface StatsProps {
    // Summary counts (all-time, passed from parent)
    totalOrders: number;
    delivered: number;
    pending: number;
    remainingPayment: number;

    // All orders — used to compute historical month stats
    orders: Order[];
}

const formatNumber = (num: number) => Math.round(num).toLocaleString("en-IN");

const parseCommission = (commission: any): number => {
    if (commission === null || commission === undefined) return 0;
    if (typeof commission === "number") return isNaN(commission) ? 0 : commission / 100;
    const parsed = parseFloat(String(commission).replace("%", "").trim());
    return isNaN(parsed) ? 0 : parsed / 100;
};

const calcProfit = (list: Order[]) =>
    list.reduce((sum, o) => {
        const commissionPercent = parseCommission(o.commission);
        if (commissionPercent === 0) return sum;
        const x = (o.totalAmount || 0) / (1 + commissionPercent);
        return sum + x * (commissionPercent - 0.05);
    }, 0) - list.filter((o) => parseCommission(o.commission) !== 0).length * 100;

const calcBorderCommission = (list: Order[]) =>
    list.reduce((sum, o) => {
        const commission = o.commission || "";
        if (commission === "Flat NPR 600") return sum + ((o.totalAmount || 0) - 600) * 0.07;
        if (commission === "Flat NPR 700") return sum + ((o.totalAmount || 0) - 700) * 0.07;
        const pct = parseCommission(commission);
        if (pct === 0) return sum;
        return sum + ((o.totalAmount || 0) / (1 + pct)) * 0.07;
    }, 0);

const calcEstimatedProfit = (allList: Order[], delvList: Order[]) =>
    allList.reduce((sum, o) => {
        const pct = parseCommission(o.commission);
        if (pct === 0) return sum;
        const x = (o.totalAmount || 0) / (1 + pct);
        return sum + x * (pct - 0.05);
    }, 0) - delvList.filter((o) => parseCommission(o.commission) !== 0).length * 100;

function getMonthStats(orders: Order[], month: number, year: number) {
    const activeOrders = orders.filter((o) => o.deliveryStatus !== "cancelled");

    const deliveredInMonth = activeOrders.filter((o) => {
        if (o.deliveryStatus !== true || !o.deliveryDate?.seconds) return false;
        const d = new Date(o.deliveryDate.seconds * 1000);
        return d.getMonth() === month && d.getFullYear() === year;
    });

    const orderedInMonth = activeOrders.filter((o) => {
        if (!o.orderedDate?.seconds) return false;
        const d = new Date(o.orderedDate.seconds * 1000);
        return d.getMonth() === month && d.getFullYear() === year;
    });

    const ankushInMonth = activeOrders.filter((o) => {
        if (!o.deliveryStatus || o.deliveredBy !== "Ankush" || !o.deliveryDate?.seconds) return false;
        const d = new Date(o.deliveryDate.seconds * 1000);
        return d.getMonth() === month && d.getFullYear() === year;
    });

    const totalRevenue = deliveredInMonth.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const profit = calcProfit(deliveredInMonth);
    const estimatedProfit = calcEstimatedProfit(orderedInMonth, deliveredInMonth);
    const borderCommission = calcBorderCommission(ankushInMonth);

    return { totalRevenue, profit, estimatedProfit, borderCommission, deliveredCount: deliveredInMonth.length };
}

// Build list of months that have any order activity, going back up to 24 months
function getAvailableMonths(orders: Order[]): { month: number; year: number; label: string }[] {
    const now = new Date();
    const months: { month: number; year: number; label: string }[] = [];

    for (let i = 1; i <= 24; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth();
        const y = d.getFullYear();
        const hasData = orders.some((o) => {
            const ts = o.orderedDate?.seconds || o.deliveryDate?.seconds;
            if (!ts) return false;
            const od = new Date(ts * 1000);
            return od.getMonth() === m && od.getFullYear() === y;
        });
        if (hasData) {
            months.push({
                month: m,
                year: y,
                label: d.toLocaleString("en-US", { month: "long", year: "numeric" }),
            });
        }
    }

    return months;
}

interface StatCardProps {
    label: string;
    value: string;
    bg: string;
    textColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, bg, textColor }) => (
    <div className={`p-4 ${bg} rounded-xl shadow`}>
        <p className={`text-sm font-medium ${textColor} opacity-80`}>{label}</p>
        <p className={`text-xl font-bold ${textColor} mt-1`}>{value}</p>
    </div>
);

const OrdersStats: React.FC<StatsProps> = ({
    totalOrders,
    delivered,
    pending,
    remainingPayment,
    orders,
}) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentMonthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

    const [selectedHistorical, setSelectedHistorical] = useState<string>("");

    const availableMonths = useMemo(() => getAvailableMonths(orders), [orders]);

    const currentStats = useMemo(
        () => getMonthStats(orders, currentMonth, currentYear),
        [orders, currentMonth, currentYear]
    );

    const historicalStats = useMemo(() => {
        if (!selectedHistorical) return null;
        const [m, y] = selectedHistorical.split("-").map(Number);
        return getMonthStats(orders, m, y);
    }, [orders, selectedHistorical]);

    const historicalLabel = availableMonths.find(
        (x) => `${x.month}-${x.year}` === selectedHistorical
    )?.label ?? "";

    const renderMonthStats = (
        stats: ReturnType<typeof getMonthStats>,
        label: string,
        isNegativeProfitBg = false
    ) => (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
                label="Total Revenue"
                value={`Rs. ${formatNumber(stats.totalRevenue)}`}
                bg="bg-blue-100"
                textColor="text-blue-900"
            />
            <StatCard
                label="Profit"
                value={`Rs. ${formatNumber(stats.profit)}`}
                bg={stats.profit < 0 ? "bg-red-200" : "bg-purple-100"}
                textColor={stats.profit < 0 ? "text-red-900" : "text-purple-900"}
            />
            <StatCard
                label="Estimated Profit"
                value={`Rs. ${formatNumber(stats.estimatedProfit)}`}
                bg={stats.estimatedProfit < 0 ? "bg-red-200" : "bg-teal-100"}
                textColor={stats.estimatedProfit < 0 ? "text-red-900" : "text-teal-900"}
            />
            <StatCard
                label="Border Commission"
                value={`Rs. ${formatNumber(stats.borderCommission)}`}
                bg="bg-orange-100"
                textColor="text-orange-900"
            />
        </div>
    );

    return (
        <div className="mb-8 space-y-5">

            {/* ── Row 1: All-time summary tiles ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Orders" value={formatNumber(totalOrders)} bg="bg-indigo-200" textColor="text-indigo-950" />
                <StatCard label="Delivered" value={formatNumber(delivered)} bg="bg-green-200" textColor="text-green-950" />
                <StatCard label="Pending" value={formatNumber(pending)} bg="bg-yellow-200" textColor="text-yellow-950" />
                <StatCard label="Remaining Payment" value={`Rs. ${formatNumber(remainingPayment)}`} bg="bg-red-200" textColor="text-red-950" />
            </div>

            {/* ── Row 2: Current month ── */}
            <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
                    {currentMonthLabel}
                </p>
                {renderMonthStats(currentStats, currentMonthLabel)}
            </div>

            {/* ── Row 3: Historical month dropdown ── */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                        Previous Month
                    </p>
                    <select
                        value={selectedHistorical}
                        onChange={(e) => setSelectedHistorical(e.target.value)}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white shadow-sm
                                   focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none cursor-pointer"
                    >
                        <option value="">— Select a month —</option>
                        {availableMonths.map((m) => (
                            <option key={`${m.month}-${m.year}`} value={`${m.month}-${m.year}`}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                </div>

                {historicalStats ? (
                    renderMonthStats(historicalStats, historicalLabel)
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {["Total Revenue", "Profit", "Estimated Profit", "Border Commission"].map((l) => (
                            <div key={l} className="p-4 bg-gray-100 rounded-xl shadow border border-dashed border-gray-300">
                                <p className="text-sm text-gray-400">{l}</p>
                                <p className="text-xl font-bold text-gray-300 mt-1">—</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrdersStats;