"use client";

import React from "react";

interface AgingBucket { label: string; count: number; color: string; accent: string; }
interface PendingOrder { name: string; mobile: string; totalAmount: number; advancePayment: number; orderedDate: any; daysWaiting: number; }
interface Props { buckets: AgingBucket[]; oldestOrders: PendingOrder[]; }

export default function PendingAging({ buckets, oldestOrders }: Props) {
    const total = buckets.reduce((s, b) => s + b.count, 0);
    return (
        <div className="rounded-2xl p-6 bg-white shadow-sm" style={{ border: "1.5px solid #e2e8f0" }}>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Pending Order Aging</h2>
            <p className="text-xs text-slate-400 mb-5 tracking-wide">How long orders have been waiting</p>
            <div className="space-y-3 mb-6">
                {buckets.map((b) => (
                    <div key={b.label}>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="font-semibold" style={{ color: b.accent }}>{b.label}</span>
                            <span className="font-semibold text-slate-600">{b.count} orders</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-100">
                            <div
                                className="h-2.5 rounded-full transition-all duration-700"
                                style={{ width: total > 0 ? `${(b.count / total) * 100}%` : "0%", background: b.accent }}
                            />
                        </div>
                    </div>
                ))}
            </div>
            {oldestOrders.length > 0 && (
                <>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">⚠️ Oldest Pending</p>
                    <div className="space-y-2">
                        {oldestOrders.slice(0, 5).map((o, i) => (
                            <div key={i} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "#fef2f2", border: "1.5px solid #fecaca" }}>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">{o.name}</p>
                                    <p className="text-xs text-slate-400">{o.mobile}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-red-500">{o.daysWaiting}d waiting</p>
                                    <p className="text-xs text-slate-400">Rs. {((o.totalAmount || 0) - (o.advancePayment || 0)).toLocaleString("en-IN")} due</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
