"use client";

import React from "react";

interface Order {
    id: string;
    [key: string]: any;
}

interface StatsProps {
    // Month selector (controlled from page.tsx)
    selectedMonth: string;                                          // "month-year" e.g. "3-2025"
    availableMonths: { month: number; year: number; label: string }[];
    onMonthChange: (value: string) => void;
    monthOrdersLoading: boolean;

    // Orders created in the selected month (by createdAt) — for revenue / profit / estimated profit
    monthStatOrders: Order[];
    // Orders delivered in the selected month (by deliveryDate) — for border commission
    monthDeliveredOrders: Order[];
}

const formatNumber = (num: number) => Math.round(num).toLocaleString("en-IN");

const parseCommission = (commission: any): number => {
    if (commission === null || commission === undefined) return 0;
    if (typeof commission === "number") return isNaN(commission) ? 0 : commission / 100;
    const parsed = parseFloat(String(commission).replace("%", "").trim());
    return isNaN(parsed) ? 0 : parsed / 100;
};

// Profit: based on orders placed this month (orderedDate) — delivered subset for cost deduction
function calcProfit(list: Order[]): number {
    return (
        list.reduce((sum, o) => {
            const commissionPercent = parseCommission(o.commission);
            if (commissionPercent === 0) return sum;
            const x = (o.totalAmount || 0) / (1 + commissionPercent);
            return sum + x * (commissionPercent - 0.05);
        }, 0) - list.filter((o) => parseCommission(o.commission) !== 0).length * 100
    );
}

// Estimated Profit: all ordered this month vs delivered this month for cost
function calcEstimatedProfit(allList: Order[], delvList: Order[]): number {
    return (
        allList.reduce((sum, o) => {
            const pct = parseCommission(o.commission);
            if (pct === 0) return sum;
            const x = (o.totalAmount || 0) / (1 + pct);
            return sum + x * (pct - 0.05);
        }, 0) - delvList.filter((o) => parseCommission(o.commission) !== 0).length * 100
    );
}

// Border Commission: based on orders whose deliveryDate falls in the selected month
function calcBorderCommission(list: Order[]): number {
    return list.reduce((sum, o) => {
        const commission = o.commission || "";
        if (commission === "Flat NPR 600") return sum + ((o.totalAmount || 0) - 600) * 0.07;
        if (commission === "Flat NPR 700") return sum + ((o.totalAmount || 0) - 700) * 0.07;
        const pct = parseCommission(commission);
        if (pct === 0) return sum;
        return sum + ((o.totalAmount || 0) / (1 + pct)) * 0.07;
    }, 0);
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
    selectedMonth,
    availableMonths,
    onMonthChange,
    monthOrdersLoading,
    monthStatOrders,
    monthDeliveredOrders,
}) => {
    const selectedLabel =
        availableMonths.find((x) => `${x.month}-${x.year}` === selectedMonth)?.label ?? "";

    // All stats derived from the two order sets passed in from parent
    const totalRevenue = monthStatOrders
        .filter((o) => o.deliveryStatus === true)
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const deliveredStatOrders = monthStatOrders.filter((o) => o.deliveryStatus === true);

    const profit = calcProfit(deliveredStatOrders);
    const estimatedProfit = calcEstimatedProfit(monthStatOrders, deliveredStatOrders);
    const borderCommission = calcBorderCommission(monthDeliveredOrders);

    return (
        <div className="mb-8 space-y-5">

            {/* ── Month picker + stats ── */}
            <div>
                {/* Dropdown */}
                <div className="flex items-center gap-3 mb-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 whitespace-nowrap">
                        Monthly Stats
                    </p>
                    <select
                        value={selectedMonth}
                        onChange={(e) => onMonthChange(e.target.value)}
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

                {/* Stats */}
                {monthOrdersLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="p-4 bg-gray-100 rounded-xl shadow animate-pulse">
                                <div className="h-3 bg-gray-300 rounded w-2/3 mb-3" />
                                <div className="h-6 bg-gray-300 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : selectedMonth ? (
                    <>
                        <p className="text-xs text-gray-400 mb-2">{selectedLabel}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                        </div>
                    </>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {["Total Revenue", "Profit", "Estimated Profit", "Border Commission"].map((label) => (
                            <div
                                key={label}
                                className="p-4 bg-gray-100 rounded-xl shadow border border-dashed border-gray-300"
                            >
                                <p className="text-sm text-gray-400">{label}</p>
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