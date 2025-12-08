"use client";

import React from "react";

interface StatsProps {
    totalOrders: number;
    delivered: number;
    pending: number;
    totalRevenue: number;
    remainingPayment: number;
    estimatedProfit: number;
}

interface FormatNumberProps {
    num: number;
}

const formatNumber = (num: number) => num.toLocaleString("en-IN");

const OrdersStats: React.FC<StatsProps> = ({
    totalOrders,
    delivered,
    pending,
    totalRevenue,
    remainingPayment,
    estimatedProfit,
}) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <div className="p-4 bg-white rounded-xl shadow">
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold">{formatNumber(totalOrders)}</p>
            </div>

            <div className="p-4 bg-green-100 rounded-xl shadow">
                <p className="text-sm text-gray-600">Delivered</p>
                <p className="text-2xl font-bold text-green-700">{formatNumber(delivered)}</p>
            </div>

            <div className="p-4 bg-yellow-100 rounded-xl shadow">
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-700">{formatNumber(pending)}</p>
            </div>

            <div className="p-4 bg-blue-100 rounded-xl shadow">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-xl font-bold text-blue-700">Rs. {formatNumber(totalRevenue)}</p>
            </div>

            <div className="p-4 bg-red-100 rounded-xl shadow">
                <p className="text-sm text-gray-600">Remaining Payment</p>
                <p className="text-xl font-bold text-red-700">Rs. {formatNumber(remainingPayment)}</p>
            </div>

            <div className="p-4 bg-purple-100 rounded-xl shadow">
                <p className="text-sm text-gray-600">Estimated Profit</p>
                <p className={`text-xl font-bold ${estimatedProfit < 0 ? "text-red-600" : "text-purple-700"}`}>
                    Rs. {formatNumber(estimatedProfit)}
                </p>
            </div>
        </div>
    );
};

export default OrdersStats;
