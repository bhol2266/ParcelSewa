"use client";

import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";

interface MonthlyAvg { month: string; avgOrderValue: number; avgProfit: number; }
interface Props { data: MonthlyAvg[]; }

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl p-4 text-sm shadow-xl bg-white border border-slate-100">
            <p className="font-bold text-slate-800 mb-2">{label}</p>
            {payload.map((p: any) => (
                <p key={p.name} style={{ color: p.color }}>
                    {p.name}: <span className="font-semibold text-slate-700">Rs. {Math.round(p.value).toLocaleString("en-IN")}</span>
                </p>
            ))}
        </div>
    );
};

export default function AvgOrderValueChart({ data }: Props) {
    const overallAvg = data.length > 0 ? data.reduce((s, d) => s + d.avgOrderValue, 0) / data.length : 0;
    return (
        <div className="rounded-2xl p-6 bg-white shadow-sm" style={{ border: "1.5px solid #e2e8f0" }}>
            <div className="flex justify-between items-start mb-1">
                <h2 className="text-lg font-bold text-slate-800">Avg. Order Value</h2>
                <div className="text-right">
                    <p className="text-xs text-slate-400">Overall avg</p>
                    <p className="text-sm font-black text-amber-500">Rs. {Math.round(overallAvg).toLocaleString("en-IN")}</p>
                </div>
            </div>
            <p className="text-xs text-slate-400 mb-6 tracking-wide">Are customers spending more over time?</p>
            <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={overallAvg} stroke="#fbbf24" strokeDasharray="4 4" label={{ value: "avg", position: "right", fill: "#f59e0b", fontSize: 10 }} />
                    <Line type="monotone" dataKey="avgOrderValue" name="Avg Order Value" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: "#f59e0b", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: "#fbbf24" }} />
                    <Line type="monotone" dataKey="avgProfit" name="Avg Profit/Order" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 3" dot={{ fill: "#a78bfa", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: "#c4b5fd" }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
