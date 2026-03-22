"use client";

import React from "react";

interface KpiCardsProps {
    totalOrders: number;
    delivered: number;
    pending: number;
    totalRevenue: number;
    remainingPayment: number;
    realizedProfit: number;
    estimatedProfit: number;
    borderCommissionThisMonth: number;
    borderCommissionLastMonth: number;
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");

const cards = (p: KpiCardsProps) => [
    {
        label: "Total Orders",
        value: fmt(p.totalOrders),
        sub: `${p.delivered} delivered · ${p.pending} pending`,
        accent: "#6366f1", bg: "#eef2ff", border: "#c7d2fe", icon: "📦",
    },
    {
        label: "Total Revenue",
        value: `Rs. ${fmt(p.totalRevenue)}`,
        sub: `Rs. ${fmt(p.remainingPayment)} still pending`,
        accent: "#0284c7", bg: "#f0f9ff", border: "#bae6fd", icon: "💰",
    },
    {
        label: "Realized Profit",
        value: `Rs. ${fmt(p.realizedProfit)}`,
        sub: "From delivered orders",
        accent: p.realizedProfit < 0 ? "#dc2626" : "#059669",
        bg: p.realizedProfit < 0 ? "#fef2f2" : "#f0fdf4",
        border: p.realizedProfit < 0 ? "#fecaca" : "#bbf7d0",
        icon: p.realizedProfit < 0 ? "📉" : "📈",
    },
    {
        label: "Estimated Profit",
        value: `Rs. ${fmt(p.estimatedProfit)}`,
        sub: "Including pending orders",
        accent: p.estimatedProfit < 0 ? "#dc2626" : "#7c3aed",
        bg: p.estimatedProfit < 0 ? "#fef2f2" : "#faf5ff",
        border: p.estimatedProfit < 0 ? "#fecaca" : "#ddd6fe",
        icon: "🔮",
    },
    {
        label: "Border Commission",
        value: `Rs. ${fmt(p.borderCommissionThisMonth)}`,
        sub: `Last month: Rs. ${fmt(p.borderCommissionLastMonth)}`,
        accent: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: "🏦",
    },
    {
        label: "Delivery Rate",
        value: `${p.totalOrders > 0 ? Math.round((p.delivered / p.totalOrders) * 100) : 0}%`,
        sub: `${p.delivered} of ${p.totalOrders} orders`,
        accent: "#db2777", bg: "#fdf2f8", border: "#fbcfe8", icon: "🚚",
    },
];

export default function KpiCards(props: KpiCardsProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {cards(props).map((c) => (
                <div
                    key={c.label}
                    className="relative rounded-2xl p-5 overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
                    style={{ background: c.bg, border: `1.5px solid ${c.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                >
                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: c.accent, opacity: 0.6 }} />
                    <p className="text-2xl mb-2 mt-1">{c.icon}</p>
                    <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: c.accent }}>{c.label}</p>
                    <p className="text-xl font-black leading-tight" style={{ color: "#0f172a" }}>{c.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
                </div>
            ))}
        </div>
    );
}
