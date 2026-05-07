"use client";

import React from "react";

interface Order {
    id: string;
    [key: string]: any;
}

interface StatsProps {
    selectedMonth: string;
    availableMonths: { month: number; year: number; label: string }[];
    onMonthChange: (value: string) => void;
    monthOrdersLoading: boolean;

    // Orders created in the selected month (by createdAt)
    monthStatOrders: Order[];
    // Orders delivered in the selected month (by deliveryDate) — for commission
    monthDeliveredOrders: Order[];

    // All-time pending orders (shown when no month is selected)
    allPendingOrders: Order[];
    allPendingLoading: boolean;

    // Current month delivered orders — for commission shown in all-time view
    currentMonthDeliveredOrders: Order[];
}

const formatNumber = (num: number) => Math.round(num).toLocaleString("en-IN");

// Commission is calculated from orders whose deliveryDate falls in the given month
function calcBorderCommission(list: Order[]): number {
    const active = list.filter(
        (o) => o.deliveryStatus !== "cancelled"
    );
    return active.reduce((sum, o) => {
        const commission = o.commission || "";
        const total = o.totalAmount || 0;
        if (commission === "Flat NPR 600") return sum + (total - 600) * 0.07;
        if (commission === "Flat NPR 700") return sum + (total - 700) * 0.07;
        const pct = parseFloat(commission.replace("%", "") || "0") / 100;
        if (pct === 0) return sum;
        return sum + (total / (1 + pct)) * 0.07;
    }, 0);
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

const OrdersStatsAnkush: React.FC<StatsProps> = ({
    selectedMonth,
    availableMonths,
    onMonthChange,
    monthOrdersLoading,
    monthStatOrders,
    monthDeliveredOrders,
    allPendingOrders,
    allPendingLoading,
    currentMonthDeliveredOrders,
}) => {
    const selectedLabel =
        availableMonths.find((x) => `${x.month}-${x.year}` === selectedMonth)?.label ?? "";

    // ── Monthly stats ─────────────────────────────────────────────────────────
    // Commission: only orders whose deliveryDate is in the selected month
    const commission = calcBorderCommission(monthDeliveredOrders);

    const monthDelivered = monthStatOrders.filter(
        (o) => o.deliveryStatus === true && o.deliveryStatus !== "cancelled"
    ).length;
    const monthPending = monthStatOrders.filter(
        (o) => o.deliveryStatus !== true && o.deliveryStatus !== "cancelled"
    ).length;
    const monthTotal = monthStatOrders.filter((o) => o.deliveryStatus !== "cancelled").length;

    // ── All-pending stats ─────────────────────────────────────────────────────
    const totalPendingCount = allPendingOrders.length;
    // Current month commission (always shows this month regardless of view)
    const currentMonthCommission = calcBorderCommission(currentMonthDeliveredOrders);
    const currentMonthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

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

                {/* ── All Pending (All Time) stats ── */}
                {!selectedMonth && (
                    <>
                        {allPendingLoading ? (
                            <div className="grid grid-cols-2 gap-3">
                                {[...Array(2)].map((_, i) => (
                                    <div key={i} className="p-4 bg-gray-100 rounded-xl shadow animate-pulse">
                                        <div className="h-3 bg-gray-300 rounded w-2/3 mb-3" />
                                        <div className="h-6 bg-gray-300 rounded w-1/2" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <>
                                <p className="text-xs text-gray-400 mb-2">Undelivered orders across all time</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <StatCard
                                        label="Pending Orders"
                                        value={`${totalPendingCount}`}
                                        bg="bg-yellow-100"
                                        textColor="text-yellow-900"
                                        subLabel="total undelivered"
                                    />
                                    <StatCard
                                        label="Commission (7%)"
                                        value={`Rs. ${formatNumber(currentMonthCommission)}`}
                                        bg="bg-orange-100"
                                        textColor="text-orange-900"
                                        subLabel={currentMonthLabel}
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
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="p-4 bg-gray-100 rounded-xl shadow animate-pulse">
                                        <div className="h-3 bg-gray-300 rounded w-2/3 mb-3" />
                                        <div className="h-6 bg-gray-300 rounded w-1/2" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <>
                                <p className="text-xs text-gray-400 mb-2">{selectedLabel}</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-4 bg-indigo-100 rounded-xl shadow">
                                        <p className="text-sm text-indigo-800">Orders</p>
                                        <p className="text-xl font-bold text-indigo-950">{formatNumber(monthTotal)}</p>
                                    </div>
                                    <div className="p-4 bg-green-100 rounded-xl shadow">
                                        <p className="text-sm text-green-800">Delivered</p>
                                        <p className="text-xl font-bold text-green-950">{formatNumber(monthDelivered)}</p>
                                    </div>
                                    <div className="p-4 bg-yellow-100 rounded-xl shadow">
                                        <p className="text-sm text-yellow-800">Pending</p>
                                        <p className="text-xl font-bold text-yellow-950">{formatNumber(monthPending)}</p>
                                    </div>
                                    <div className="p-4 bg-orange-100 rounded-xl shadow">
                                        <p className="text-sm font-medium text-orange-900 opacity-80">
                                            Commission <span className="text-xs">(7%)</span>
                                        </p>
                                        <p className="text-xl font-bold text-orange-900 mt-1">
                                            Rs. {formatNumber(commission)}
                                        </p>
                                        <p className="text-xs text-orange-700 opacity-60 mt-0.5">by delivery date</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default OrdersStatsAnkush;