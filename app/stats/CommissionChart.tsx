"use client";

import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

interface CommissionData { tier: string; count: number; revenue: number; }
interface Props { data: CommissionData[]; }

const COLORS = ["#818cf8", "#38bdf8", "#34d399", "#fbbf24", "#f472b6", "#a78bfa"];

const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="rounded-xl p-4 text-sm shadow-xl bg-white border border-slate-100">
            <p className="font-bold text-slate-800 mb-1">{d.tier} commission</p>
            <p className="text-slate-500">Orders: <span className="text-slate-800 font-semibold">{d.count}</span></p>
            <p className="text-slate-500">Revenue: <span className="text-slate-800 font-semibold">Rs. {Math.round(d.revenue).toLocaleString("en-IN")}</span></p>
        </div>
    );
};

export default function CommissionChart({ data }: Props) {
    return (
        <div className="rounded-2xl p-6 bg-white shadow-sm" style={{ border: "1.5px solid #e2e8f0" }}>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Commission Tiers</h2>
            <p className="text-xs text-slate-400 mb-4 tracking-wide">Order distribution by commission %</p>
            <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                    <Pie data={data} dataKey="count" nameKey="tier" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3}>
                        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={(value) => <span style={{ color: "#64748b", fontSize: 12 }}>{value}</span>} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
