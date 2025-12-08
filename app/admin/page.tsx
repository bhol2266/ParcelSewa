"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import OrderCard from "./OrderCard";

interface Order {
  id: string;
  [key: string]: any;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "Confirm Orders"));

    const docs = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Order[];

    docs.sort(
      (a, b) => b.orderedDate.toMillis() - a.orderedDate.toMillis()
    );

    setOrders(docs);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // -------------------------
  // 🔎 Filtered Orders
  // -------------------------
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const nameMatch = o.name?.toLowerCase().includes(search.toLowerCase());
      const mobileMatch = o.mobile?.includes(search);
      return nameMatch || mobileMatch;
    });
  }, [search, orders]);

  // -------------------------
  // 🔥 Stats Calculation
  // -------------------------
  const stats = useMemo(() => {
    const totalOrders = orders.length;

    const deliveredOrders = orders.filter(
      (o) => o.deliveryStatus?.toLowerCase() === "delivered"
    );

    const pendingOrders = orders.filter(
      (o) => o.deliveryStatus?.toLowerCase() !== "delivered"
    );

    const deliveredRevenue = deliveredOrders.reduce(
      (sum, o) => sum + (o.totalAmount || 0),
      0
    );

    const advanceFromPending = pendingOrders.reduce(
      (sum, o) => sum + (o.advancePayment || 0),
      0
    );

    const totalRevenue = deliveredRevenue + advanceFromPending;

    const remainingPayment = pendingOrders.reduce(
      (sum, o) => sum + ((o.totalAmount || 0) - (o.advancePayment || 0)),
      0
    );

    // Estimated Profit = sum(commission% of totalAmount) - (totalOrders * 300)
    const estimatedProfit = orders.reduce((sum, o) => {
      const commissionPercent = parseFloat(o.commission?.replace("%", "") || "0") / 100;
      return sum + ((o.totalAmount || 0) * commissionPercent);
    }, 0) - totalOrders * 300;

    return {
      totalOrders,
      delivered: deliveredOrders.length,
      pending: pendingOrders.length,
      totalRevenue,
      remainingPayment,
      estimatedProfit,
    };
  }, [orders]);

  // Number formatting helper
  const formatNumber = (num: number) => num.toLocaleString("en-IN");

  if (loading) return <p className="p-5 text-center">Loading…</p>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">All Orders</h1>

      {/* 🔍 Search Bar */}
      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
        <input
          type="text"
          placeholder="Search by name or mobile…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 shadow-sm
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        />
      </div>

      {/* ============================================= */}
      {/* 🔥 Stats Row */}
      {/* ============================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <div className="p-4 bg-white rounded-xl shadow">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="text-2xl font-bold">{formatNumber(stats.totalOrders)}</p>
        </div>

        <div className="p-4 bg-green-100 rounded-xl shadow">
          <p className="text-sm text-gray-600">Delivered</p>
          <p className="text-2xl font-bold text-green-700">
            {formatNumber(stats.delivered)}
          </p>
        </div>

        <div className="p-4 bg-yellow-100 rounded-xl shadow">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-700">
            {formatNumber(stats.pending)}
          </p>
        </div>

        <div className="p-4 bg-blue-100 rounded-xl shadow">
          <p className="text-sm text-gray-600">Total Revenue</p>
          <p className="text-xl font-bold text-blue-700">
            Rs. {formatNumber(stats.totalRevenue)}
          </p>
        </div>

        <div className="p-4 bg-red-100 rounded-xl shadow">
          <p className="text-sm text-gray-600">Remaining Payment</p>
          <p className="text-xl font-bold text-red-700">
            Rs. {formatNumber(stats.remainingPayment)}
          </p>
        </div>

        <div className="p-4 bg-purple-100 rounded-xl shadow">
          <p className="text-sm text-gray-600">Estimated Profit</p>
          <p
            className={`text-xl font-bold ${
              stats.estimatedProfit < 0 ? "text-red-600" : "text-purple-700"
            }`}
          >
            Rs. {formatNumber(stats.estimatedProfit)}
          </p>
        </div>
      </div>

      {/* Orders List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} refresh={fetchOrders} />
          ))
        ) : (
          <p className="text-center col-span-full text-gray-500 mt-10">
            No orders found.
          </p>
        )}
      </div>
    </div>
  );
}
