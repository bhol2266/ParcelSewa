"use client";

import React from "react";

interface Order {
    id: string;
    [key: string]: any;
}

interface StatsProps {
    // Month selector (controlled from page.tsx)
    selectedMonth: string;                                          // "month-year" e.g. "3-2025", or "" for all-pending
    availableMonths: { month: number; year: number; label: string }[];
    onMonthChange: (value: string) => void;
    monthOrdersLoading: boolean;

    // Orders created in the selected month (by createdAt) — for revenue / profit / estimated profit
    monthStatOrders: Order[];
    // Orders delivered in the selected month (by deliveryDate) — for border commission
    monthDeliveredOrders: Order[];

    // All-time pending orders (shown when no month is selected)
    allPendingOrders: Order[];
    allPendingLoading: boolean;
}

const formatNumber = (num: number) => Math.round(num).toLocaleString("en-IN");

const parseCommission = (commission: any): number => {
    if (commission === null || commission === undefined) return 0;
    if (typeof commission === "number") return isNaN(commission) ? 0 : commission / 100;
    const parsed = parseFloat(String(commission).replace("%", "").trim());
    return isNaN(parsed) ? 0 : parsed / 100;
};

function calcOrderProfit(o: Order): number {
    const total = o.totalAmount || 0;
    const commission = o.commission || "";

    if (commission === "Flat NPR 600") {
        const basePrice = total - 600;
        return 600 - basePrice * 0.07;
    }
    if (commission === "Flat NPR 700") {
        const basePrice = total - 700;
        return 700 - basePrice * 0.07;
    }

    const pct = parseCommission(commission);
    if (pct === 0) return 0;

    const basePrice = total / (1 + pct);
    const commissionEarned = total - basePrice;
    return commissionEarned - basePrice * 0.07;
}

function calcProfit(list: Order[]): number {
    return list.reduce((sum, o) => sum + calcOrderProfit(o), 0);
}

function calcEstimatedProfit(list: Order[]): number {
    return list.reduce((sum, o) => sum + calcOrderProfit(o), 0);
}

function calcBorderCommission(list: Order[]): number {
    return list.reduce((sum, o) => {
        const commission = o.commission || "";
        const total = o.totalAmount || 0;
        if (commission === "Flat NPR 600") return sum + (total - 600) * 0.07;
        if (commission === "Flat NPR 700") return sum + (total - 700) * 0.07;
        const pct = parseCommission(commission);
        if (pct === 0) return sum;
        return sum + (total / (1 + pct)) * 0.07;
    }, 0);
}

function calcRemainingPayment(list: Order[]): number {
    return list
        .filter((o) => o.deliveryStatus !== true && o.deliveryStatus !== "cancelled")
        .reduce((sum, o) => sum + ((o.totalAmount || 0) - (o.advancePayment || 0)), 0);
}

interface StatCardProps {
    label: string;
    value: string;
    bg: string;
    textColor: string;
    subLabel?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, bg, textColor, subLabel }) => (
    <div className={`p-4 ${bg} rounded-xl shadow`}>
        <p className={`text-sm font-medium ${textColor} opacity-80`}>{label}</p>
        <p className={`text-xl font-bold ${textColor} mt-1`}>{value}</p>
        {subLabel && <p className={`text-xs ${textColor} opacity-60 mt-0.5`}>{subLabel}</p>}
    </div>
);

const SkeletonCards = ({ count }: { count: number }) => (
    <div className={`grid grid-cols-2 sm:grid-cols-${Math.min(count, 3)} lg:grid-cols-${count} gap-3`}>
        {[...Array(count)].map((_, i) => (
            <div key={i} className="p-4 bg-gray-100 rounded-xl shadow animate-pulse">
                <div className="h-3 bg-gray-300 rounded w-2/3 mb-3" />
                <div className="h-6 bg-gray-300 rounded w-1/2" />
            </div>
        ))}
    </div>
);

const OrdersStats: React.FC<StatsProps> = ({
    selectedMonth,
    availableMonths,
    onMonthChange,
    monthOrdersLoading,
    monthStatOrders,
    monthDeliveredOrders,
    allPendingOrders,
    allPendingLoading,
}) => {
    const selectedLabel =
        availableMonths.find((x) => `${x.month}-${x.year}` === selectedMonth)?.label ?? "";

    // ── Monthly stats ─────────────────────────────────────────────────────────
    const activeStatOrders = monthStatOrders.filter((o) => o.deliveryStatus !== "cancelled");
    const deliveredStatOrders = activeStatOrders.filter((o) => o.deliveryStatus === true);

    const totalRevenue = deliveredStatOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const profit = calcProfit(deliveredStatOrders);
    const estimatedProfit = calcEstimatedProfit(activeStatOrders);
    const borderCommission = calcBorderCommission(monthDeliveredOrders);
    const remainingPayment = calcRemainingPayment(monthStatOrders);

    // ── All-pending stats (default view) ─────────────────────────────────────
    const totalPendingCount = allPendingOrders.length;
    const totalPendingAmount = allPendingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalPendingRemaining = calcRemainingPayment(allPendingOrders);
    const totalPendingEstimatedProfit = calcEstimatedProfit(allPendingOrders);

    return (
        <div className="mb-8 space-y-5">
            <div>
                {/* Dropdown */}
                <div className="flex items-center gap-3 mb-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 whitespace-nowrap">
                        {selectedMonth ? "Monthly Stats" : "All Pending Orders"}
                    </p>
                    <select
                        value={selectedMonth}
                        onChange={(e) => onMonthChange(e.target.value)}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white shadow-sm
                                   focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none cursor-pointer"
                    >
                        <option value="">— All Pending (All Time) —</option>
                        {availableMonths.map((m) => (
                            <option key={`${m.month}-${m.year}`} value={`${m.month}-${m.year}`}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* ── Default: All Pending Stats ── */}
                {!selectedMonth && (
                    <>
                        {allPendingLoading ? (
                            <SkeletonCards count={4} />
                        ) : (
                            <>
                                <p className="text-xs text-gray-400 mb-2">Undelivered orders across all time</p>
                                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    <StatCard
                                        label="Pending Orders"
                                        value={`${totalPendingCount}`}
                                        bg="bg-yellow-100"
                                        textColor="text-yellow-900"
                                        subLabel="total undelivered"
                                    />
                                    <StatCard
                                        label="Total Order Value"
                                        value={`Rs. ${formatNumber(totalPendingAmount)}`}
                                        bg="bg-blue-100"
                                        textColor="text-blue-900"
                                    />
                                    <StatCard
                                        label="Remaining Payment"
                                        value={`Rs. ${formatNumber(totalPendingRemaining)}`}
                                        bg="bg-red-100"
                                        textColor="text-red-900"
                                        subLabel="yet to collect"
                                    />
                                    <StatCard
                                        label="Estimated Profit"
                                        value={`Rs. ${formatNumber(totalPendingEstimatedProfit)}`}
                                        bg={totalPendingEstimatedProfit < 0 ? "bg-red-200" : "bg-teal-100"}
                                        textColor={totalPendingEstimatedProfit < 0 ? "text-red-900" : "text-teal-900"}
                                        subLabel="if all delivered"
                                    />
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* ── Monthly Stats ── */}
                {selectedMonth && (
                    <>
                        {monthOrdersLoading ? (
                            <SkeletonCards count={5} />
                        ) : (
                            <>
                                <p className="text-xs text-gray-400 mb-2">{selectedLabel}</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                    <StatCard
                                        label="Total Revenue"
                                        value={`Rs. ${formatNumber(totalRevenue)}`}
                                        bg="bg-blue-100"
                                        textColor="text-blue-900"
                                    />
                                    <StatCard
                                        label="Profit"
                                        value={`Rs. ${formatNumber(profit)}`}
                                        bg={profit < 0 ? "bg-red-200" : "bg-purple-100"}
                                        textColor={profit < 0 ? "text-red-900" : "text-purple-900"}
                                    />
                                    <StatCard
                                        label="Estimated Profit"
                                        value={`Rs. ${formatNumber(estimatedProfit)}`}
                                        bg={estimatedProfit < 0 ? "bg-red-200" : "bg-teal-100"}
                                        textColor={estimatedProfit < 0 ? "text-red-900" : "text-teal-900"}
                                    />
                                    <StatCard
                                        label="Border Commission"
                                        value={`Rs. ${formatNumber(borderCommission)}`}
                                        bg="bg-orange-100"
                                        textColor="text-orange-900"
                                    />
                                    <StatCard
                                        label="Remaining Payment"
                                        value={`Rs. ${formatNumber(remainingPayment)}`}
                                        bg="bg-red-100"
                                        textColor="text-red-900"
                                    />
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default OrdersStats;