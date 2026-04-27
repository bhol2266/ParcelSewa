"use client";

import React, { useState, useMemo } from "react";

interface Order {
    id: string;
    [key: string]: any;
}

interface StatsProps {
    totalOrders: number;
    delivered: number;
    pending: number;
    orders: Order[];
}

const formatNumber = (num: number) => Math.round(num).toLocaleString("en-IN");

const calcBorderCommission = (list: Order[], rate: number) =>
    list.reduce((sum, o) => {
        const commission = o.commission || "";
        if (commission === "Flat NPR 600") return sum + ((o.totalAmount || 0) - 600) * rate;
        if (commission === "Flat NPR 700") return sum + ((o.totalAmount || 0) - 700) * rate;
        const pct = parseFloat(commission.replace("%", "") || "0") / 100;
        if (pct === 0) return sum;
        return sum + ((o.totalAmount || 0) / (1 + pct)) * rate;
    }, 0);

function getMonthBorderCommission(orders: Order[], month: number, year: number) {
    const activeOrders = orders.filter((o) => o.deliveryStatus !== "cancelled");

    const ankushInMonth = activeOrders.filter((o) => {
        if (!o.deliveryStatus || o.deliveredBy !== "Ankush" || !o.deliveryDate?.seconds) return false;
        const d = new Date(o.deliveryDate.seconds * 1000);
        return d.getMonth() === month && d.getFullYear() === year;
    });

    return calcBorderCommission(ankushInMonth, 0.07);
}

function getAvailableMonths(orders: Order[]): { month: number; year: number; label: string }[] {
    const now = new Date();
    const months: { month: number; year: number; label: string }[] = [];

    for (let i = 1; i <= 24; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth();
        const y = d.getFullYear();
        const hasData = orders.some((o) => {
            const ts = o.deliveryDate?.seconds || o.orderedDate?.seconds;
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

const OrdersStatsAnkush: React.FC<StatsProps> = ({
    totalOrders,
    delivered,
    pending,
    orders,
}) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentMonthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

    const [selectedHistorical, setSelectedHistorical] = useState<string>("");

    const availableMonths = useMemo(() => getAvailableMonths(orders), [orders]);

    const currentCommission = useMemo(
        () => getMonthBorderCommission(orders, currentMonth, currentYear),
        [orders, currentMonth, currentYear]
    );

    const historicalCommission = useMemo(() => {
        if (!selectedHistorical) return null;
        const [m, y] = selectedHistorical.split("-").map(Number);
        return getMonthBorderCommission(orders, m, y);
    }, [orders, selectedHistorical]);

    const historicalLabel = availableMonths.find(
        (x) => `${x.month}-${x.year}` === selectedHistorical
    )?.label ?? "";

    return (
        <div className="mb-8 space-y-5">

            {/* ── Row 1: All-time summary tiles ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-indigo-200 rounded-xl shadow">
                    <p className="text-sm text-indigo-900">Total Orders</p>
                    <p className="text-2xl font-bold text-indigo-950">{formatNumber(totalOrders)}</p>
                </div>
                <div className="p-4 bg-green-200 rounded-xl shadow">
                    <p className="text-sm text-green-900">Delivered</p>
                    <p className="text-2xl font-bold text-green-950">{formatNumber(delivered)}</p>
                </div>
                <div className="p-4 bg-yellow-200 rounded-xl shadow">
                    <p className="text-sm text-yellow-900">Pending</p>
                    <p className="text-2xl font-bold text-yellow-950">{formatNumber(pending)}</p>
                </div>
            </div>

            {/* ── Row 2: Current month border commission ── */}
            <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
                    {currentMonthLabel}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 bg-orange-100 rounded-xl shadow">
                        <p className="text-sm font-medium text-orange-900 opacity-80">
                            Border Commission <span className="text-xs">(7%)</span>
                        </p>
                        <p className="text-xl font-bold text-orange-900 mt-1">
                            Rs. {formatNumber(currentCommission)}
                        </p>
                    </div>
                </div>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {historicalCommission !== null ? (
                        <div className="p-4 bg-orange-100 rounded-xl shadow">
                            <p className="text-sm font-medium text-orange-900 opacity-80">
                                Border Commission <span className="text-xs">(7%)</span>
                            </p>
                            <p className="text-xl font-bold text-orange-900 mt-1">
                                Rs. {formatNumber(historicalCommission)}
                            </p>
                        </div>
                    ) : (
                        <div className="p-4 bg-gray-100 rounded-xl shadow border border-dashed border-gray-300">
                            <p className="text-sm text-gray-400">Border Commission (7%)</p>
                            <p className="text-xl font-bold text-gray-300 mt-1">—</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default OrdersStatsAnkush;