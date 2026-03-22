"use client";

import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface DeliveryPersonMonth { month: string; Ankush: number; Bhola: number; }
interface PersonSummary { name: string; total: number; commission: number; }
interface Props { monthlyData: DeliveryPersonMonth[]; summary: PersonSummary[]; }

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl p-4 text-sm shadow-xl bg-white border border-slate-100">
            <p className="font-bold text-slate-800 mb-2">{label}</p>
            {payload.map((p: any) => (
                <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-semibold text-slate-700">{p.value} deliveries</span></p>
            ))}
        </div>
    );
};

export default function DeliveryPersonChart({ monthlyData, summary }: Props) {
    const colors = ["#818cf8", "#34d399"];
    return (
        <div className="rounded-2xl p-6 bg-white shadow-sm" style={{ border: "1.5px solid #e2e8f0" }}>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Delivery Performance</h2>
            <p className="text-xs text-slate-400 mb-4 tracking-wide">Deliveries per person per month</p>
            <div className="flex gap-3 mb-5">
                {summary.map((s, i) => (
                    <div key={s.name} className="flex-1 rounded-xl p-3 text-center" style={{ background: i === 0 ? "#eef2ff" : "#f0fdf4", border: `1.5px solid ${i === 0 ? "#c7d2fe" : "#bbf7d0"}` }}>
                        <p className="text-xs text-slate-500 mb-1 font-medium">{s.name}</p>
                        <p className="text-2xl font-black" style={{ color: colors[i] }}>{s.total}</p>
                        <p className="text-xs text-slate-400">deliveries</p>
                        <p className="text-xs font-semibold mt-1" style={{ color: colors[i] }}>Rs. {Math.round(s.commission).toLocaleString("en-IN")}</p>
                    </div>
                ))}
            </div>
            <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#64748b", paddingTop: 16 }} />
                    <Bar dataKey="Ankush" fill="#818cf8" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="Bhola" fill="#34d399" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
