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

  // -----------------------------
  // 🔥 Calculate Stats
  // -----------------------------
 const stats = useMemo(() => {
  const totalOrders = orders.length;

  const deliveredOrders = orders.filter(
    (o) => o.deliveryStatus?.toLowerCase() === "delivered"
  );

  const pendingOrders = orders.filter(
    (o) => o.deliveryStatus?.toLowerCase() !== "delivered"
  );

  // 1️⃣ Sum of totalAmount of delivered orders
  const deliveredRevenue = deliveredOrders.reduce(
    (sum, o) => sum + (o.totalAmount || 0),
    0
  );

  // 2️⃣ Sum of advancePayment of all pending orders
  const advanceFromPending = pendingOrders.reduce(
    (sum, o) => sum + (o.advancePayment || 0),
    0
  );

  // 🔥 New Total Revenue Formula
  const totalRevenue = deliveredRevenue + advanceFromPending;

  // 3️⃣ Remaining Payment = (sum of totalAmount - advancePayment for pending orders)
  const remainingPayment = pendingOrders.reduce(
    (sum, o) =>
      sum + ((o.totalAmount || 0) - (o.advancePayment || 0)),
    0
  );

  return {
    totalOrders,
    delivered: deliveredOrders.length,
    pending: pendingOrders.length,
    totalRevenue,
    remainingPayment,
  };
}, [orders]);

  if (loading) return <p className="p-5 text-center">Loading…</p>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">All Orders</h1>

      {/* ============================================= */}
      {/* 🔥 Stats Row */}
      {/* ============================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
        <div className="p-4 bg-white rounded-xl shadow">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="text-2xl font-bold">{stats.totalOrders}</p>
        </div>

        <div className="p-4 bg-green-100 rounded-xl shadow">
          <p className="text-sm text-gray-600">Delivered</p>
          <p className="text-2xl font-bold text-green-700">
            {stats.delivered}
          </p>
        </div>

        <div className="p-4 bg-yellow-100 rounded-xl shadow">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-700">
            {stats.pending}
          </p>
        </div>

        <div className="p-4 bg-blue-100 rounded-xl shadow">
          <p className="text-sm text-gray-600">Total Revenue</p>
          <p className="text-xl font-bold text-blue-700">
            Rs. {stats.totalRevenue}
          </p>
        </div>

        <div className="p-4 bg-red-100 rounded-xl shadow">
          <p className="text-sm text-gray-600">Remaining Payment</p>
          <p className="text-xl font-bold text-red-700">
            Rs. {stats.remainingPayment}
          </p>
        </div>
      </div>

      {/* Orders List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} refresh={fetchOrders} />
        ))}
      </div>
    </div>
  );
}
