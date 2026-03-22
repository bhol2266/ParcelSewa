"use client";

import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface MonthlyOrders { month: string; placed: number; delivered: number; pending: number; }
interface Props { data: MonthlyOrders[]; }

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl p-4 text-sm shadow-xl bg-white border border-slate-100">
            <p className="font-bold text-slate-800 mb-2">{label}</p>
            {payload.map((p: any) => (
                <p key={p.name} style={{ color: p.color }}>
                    {p.name}: <span className="font-semibold text-slate-700">{p.value}</span>
                </p>
            ))}
        </div>
    );
};

export default function OrdersVolumeChart({ data }: Props) {
    return (
        <div className="rounded-2xl p-6 bg-white shadow-sm" style={{ border: "1.5px solid #e2e8f0" }}>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Order Volume</h2>
            <p className="text-xs text-slate-400 mb-6 tracking-wide">Placed vs delivered per month</p>
            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#64748b", paddingTop: 16 }} />
                    <Bar dataKey="placed" name="Placed" fill="#38bdf8" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="delivered" name="Delivered" fill="#34d399" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="pending" name="Pending" fill="#fbbf24" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
