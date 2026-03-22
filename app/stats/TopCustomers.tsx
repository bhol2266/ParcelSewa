"use client";

import React, { useState } from "react";

interface CustomerStat { name: string; mobile: string; orderCount: number; totalRevenue: number; totalProfit: number; lastOrderDate: string; }
interface Props { customers: CustomerStat[]; }
type SortBy = "orders" | "revenue" | "profit";

export default function TopCustomers({ customers }: Props) {
    const [sortBy, setSortBy] = useState<SortBy>("orders");
    const sorted = [...customers].sort((a, b) => {
        if (sortBy === "orders") return b.orderCount - a.orderCount;
        if (sortBy === "revenue") return b.totalRevenue - a.totalRevenue;
        return b.totalProfit - a.totalProfit;
    });
    const medals = ["🥇", "🥈", "🥉"];
    const tabs: { key: SortBy; label: string }[] = [
        { key: "orders", label: "Most Orders" },
        { key: "revenue", label: "Top Revenue" },
        { key: "profit", label: "Top Profit" },
    ];
    return (
        <div className="rounded-2xl p-6 bg-white shadow-sm" style={{ border: "1.5px solid #e2e8f0" }}>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Top Customers</h2>
            <p className="text-xs text-slate-400 mb-5 tracking-wide">Your most valuable clients</p>
            <div className="flex gap-2 mb-5">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setSortBy(t.key)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                        style={{
                            background: sortBy === t.key ? "#6366f1" : "#f1f5f9",
                            color: sortBy === t.key ? "#fff" : "#64748b",
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            <div className="space-y-2">
                {sorted.slice(0, 10).map((c, i) => (
                    <div
                        key={c.mobile}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all hover:shadow-sm"
                        style={{
                            background: i < 3 ? "#eef2ff" : "#f8fafc",
                            border: i < 3 ? "1.5px solid #c7d2fe" : "1.5px solid #e2e8f0",
                        }}
                    >
                        <span className="text-xl w-8 text-center flex-shrink-0">
                            {i < 3 ? medals[i] : <span className="text-slate-400 font-bold text-sm">#{i + 1}</span>}
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{c.name}</p>
                            <p className="text-xs text-slate-400">{c.mobile.replace("+977", "")} · Last: {c.lastOrderDate}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                            {sortBy === "orders" && <><p className="text-base font-black text-indigo-500">{c.orderCount}</p><p className="text-xs text-slate-400">orders</p></>}
                            {sortBy === "revenue" && <><p className="text-sm font-black text-sky-500">Rs. {Math.round(c.totalRevenue).toLocaleString("en-IN")}</p><p className="text-xs text-slate-400">{c.orderCount} orders</p></>}
                            {sortBy === "profit" && <><p className="text-sm font-black text-emerald-500">Rs. {Math.round(c.totalProfit).toLocaleString("en-IN")}</p><p className="text-xs text-slate-400">{c.orderCount} orders</p></>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
