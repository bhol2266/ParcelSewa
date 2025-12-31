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
    Profit: number;
}

interface FormatNumberProps {
    num: number;
}

const formatNumber = (num: number) => Math.round(num).toLocaleString("en-IN");

const OrdersStatsAnkush: React.FC<StatsProps> = ({
    totalOrders,
    delivered,
    pending,
    totalRevenue,
    remainingPayment,
    estimatedProfit,
    borderCommission,
    Profit
}) => {
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

         

       

       


            {/* Border Commission */}
            <div className={`p-4 rounded-xl shadow ${borderCommission < 0 ? "bg-red-300" : "bg-orange-200"}`}>
                <p className={`text-sm font-semibold ${borderCommission < 0 ? "text-red-900" : "text-orange-900"}`}>Border Commission</p>
                <p className={`text-xl font-bold ${borderCommission < 0 ? "text-red-950" : "text-orange-950"}`}>
                    Rs. {formatNumber(borderCommission)}
                </p>
            </div>

        </div>
    );
};

export default OrdersStatsAnkush;