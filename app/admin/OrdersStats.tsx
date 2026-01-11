"use client";

import React from "react";

interface StatsProps {
    totalOrders: number;
    delivered: number;
    pending: number;
    totalRevenue: number;
    remainingPayment: number;
    estimatedProfit: number;
    borderCommission: number;
    borderCommissionLastMonth: number;
    Profit: number;
}

interface FormatNumberProps {
    num: number;
}

const formatNumber = (num: number) => Math.round(num).toLocaleString("en-IN");

const OrdersStats: React.FC<StatsProps> = ({
    totalOrders,
    delivered,
    pending,
    totalRevenue,
    remainingPayment,
    estimatedProfit,
    borderCommission,
    borderCommissionLastMonth,
    Profit
}) => {

    const now = new Date();

    const currentMonth = now.toLocaleString("en-US", { month: "long" });

    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastMonthDate.toLocaleString("en-US", { month: "long" });

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">

            {/* Total Orders */}
            <div className="p-4 bg-indigo-200 rounded-xl shadow">
                <p className="text-sm text-indigo-900">Total Orders</p>
                <p className="text-2xl font-bold text-indigo-950">{formatNumber(totalOrders)}</p>
            </div>

            {/* Delivered */}
            <div className="p-4 bg-green-200 rounded-xl shadow">
                <p className="text-sm text-green-900">Delivered</p>
                <p className="text-2xl font-bold text-green-950">{formatNumber(delivered)}</p>
            </div>

            {/* Pending */}
            <div className="p-4 bg-yellow-200 rounded-xl shadow">
                <p className="text-sm text-yellow-900">Pending</p>
                <p className="text-2xl font-bold text-yellow-950">{formatNumber(pending)}</p>
            </div>

            {/* Total Revenue */}
            <div className="p-4 bg-blue-200 rounded-xl shadow">
                <p className="text-sm text-blue-900">Total Revenue</p>
                <p className="text-xl font-bold text-blue-950">Rs. {formatNumber(totalRevenue)}</p>
            </div>

            {/* Remaining Payment */}
            <div className="p-4 bg-red-200 rounded-xl shadow">
                <p className="text-sm text-red-900">Remaining Payment</p>
                <p className="text-xl font-bold text-red-950">Rs. {formatNumber(remainingPayment)}</p>
            </div>

            {/* Profit */}
            <div className={`p-4 rounded-xl shadow ${Profit < 0 ? "bg-red-300" : "bg-purple-200"}`}>
                <p className={`text-sm font-semibold ${Profit < 0 ? "text-red-900" : "text-purple-900"}`}>Profit</p>
                <p className={`text-xl font-bold ${Profit < 0 ? "text-red-950" : "text-purple-950"}`}>
                    Rs. {formatNumber(Profit)}
                </p>
            </div>

            {/* Estimated Profit */}
            <div className={`p-4 rounded-xl shadow ${estimatedProfit < 0 ? "bg-red-300" : "bg-teal-200"}`}>
                <p className={`text-sm font-semibold ${estimatedProfit < 0 ? "text-red-900" : "text-teal-900"}`}>Estimated Profit</p>
                <p className={`text-xl font-bold ${estimatedProfit < 0 ? "text-red-950" : "text-teal-950"}`}>
                    Rs. {formatNumber(estimatedProfit)}
                </p>
            </div>

            {/* Border Commission - Current Month */}
            <div className="p-4 bg-orange-200 rounded-xl shadow">
                <p className="text-sm font-semibold text-orange-900">
                    Border Commission
                </p>

                <div className="mt-1 space-y-1">
                    <div className="flex justify-between text-lg font-bold text-orange-900">
                        <span>{currentMonth}</span>
                        <span className="font-semibold">
                            Rs. {formatNumber(borderCommission)}
                        </span>
                    </div>

                    <div className="flex justify-between text-sm  text-orange-900">
                        <span>{lastMonth}</span>
                        <span>
                            Rs. {formatNumber(borderCommissionLastMonth)}
                        </span>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default OrdersStats;