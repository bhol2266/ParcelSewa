"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import OrderCardAnkush from "./OrderCardAnkush";
import Cookies from "js-cookie";
import OrdersStatsAnkush from "./OrdersStatsAnkush";
import ClickableTiles from "@/components/ClickableTiles";

interface Order {
    id: string;
    [key: string]: any;
}

type SortOption = "latest" | "oldest" | "pending" | "delivered";

export default function Ankush() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [accessGranted, setAccessGranted] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const passwordInputRef = useRef<HTMLInputElement>(null);
    const [sortOption, setSortOption] = useState<SortOption>("pending");

    const PASSWORD = "5555";
    const COOKIE_NAME = "admin_access";

    const fetchOrders = async () => {
        setLoading(true);

        const q = query(
            collection(db, "Confirm Orders"),
            orderBy("orderedDate", "desc"),
            limit(100)
        );

        const snap = await getDocs(q);

        const docs = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        })) as Order[];

        setOrders(docs);
        setLoading(false);
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    useEffect(() => {
        const cookie = Cookies.get(COOKIE_NAME);
        if (cookie === PASSWORD) {
            setAccessGranted(true);
        } else {
            setTimeout(() => {
                passwordInputRef.current?.focus();
            }, 300);
        }
    }, []);

    useEffect(() => {
        if (passwordInput === PASSWORD) {
            setAccessGranted(true);
            setPasswordInput("");
            Cookies.set(COOKIE_NAME, PASSWORD, { expires: 5, path: "/" });
        }
    }, [passwordInput]);

    const filteredOrders = useMemo(() => {
        let filtered = orders.filter((o) => {
            const nameMatch = o.name?.toLowerCase().includes(search.toLowerCase());
            const mobileMatch = o.mobile?.includes(search);
            return nameMatch || mobileMatch;
        });

        switch (sortOption) {
            case "latest":
                filtered.sort((a, b) => b.orderedDate.toMillis() - a.orderedDate.toMillis());
                break;
            case "oldest":
                filtered.sort((a, b) => a.orderedDate.toMillis() - b.orderedDate.toMillis());
                break;
            case "pending":
                filtered = filtered
                    .filter((o) => o.deliveryStatus !== true)
                    .sort((a, b) => a.orderedDate.toMillis() - b.orderedDate.toMillis());
                break;
            case "delivered":
                filtered = filtered
                    .filter((o) => o.deliveryStatus === true && o.deliveryDate)
                    .sort((a, b) => b.deliveryDate.toMillis() - a.deliveryDate.toMillis());
                break;
        }

        return filtered;
    }, [search, orders, sortOption]);

    // Only summary counts needed — monthly stats computed inside OrdersStatsAnkush
    const summaryStats = useMemo(() => {
        const activeOrders = orders.filter((o) => o.deliveryStatus !== "cancelled");
        const deliveredOrders = activeOrders.filter((o) => o.deliveryStatus === true);
        const pendingOrders = activeOrders.filter((o) => o.deliveryStatus !== true);

        return {
            totalOrders: activeOrders.length,
            delivered: deliveredOrders.length,
            pending: pendingOrders.length,
        };
    }, [orders]);

    if (loading)
        return <p className="p-5 text-center">Loading…</p>;

    return (
        <div className="relative min-h-screen">

            <ClickableTiles />
            <div className={`p-6 ${!accessGranted ? "filter blur-md" : ""}`}>
                <h1 className="text-3xl font-bold mb-6">All Orders</h1>

                <OrdersStatsAnkush
                    totalOrders={summaryStats.totalOrders}
                    delivered={summaryStats.delivered}
                    pending={summaryStats.pending}
                    orders={orders}
                />

                {/* Search Bar */}
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

                {/* Sort Buttons */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {["latest", "oldest", "pending", "delivered"].map((option) => (
                        <button
                            key={option}
                            className={`px-4 py-2 rounded-xl border ${
                                sortOption === option
                                    ? "bg-blue-500 text-white"
                                    : "bg-white text-gray-700 border-gray-300"
                            } shadow-sm hover:bg-blue-500 hover:text-white transition-all`}
                            onClick={() => setSortOption(option as SortOption)}
                        >
                            {option.charAt(0).toUpperCase() +
                                option
                                    .slice(1)
                                    .replace("pending", "Pending Orders")
                                    .replace("delivered", "Delivered Orders")}
                        </button>
                    ))}
                </div>

                {/* Orders List */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => (
                            <OrderCardAnkush key={order.id} order={order} refresh={fetchOrders} />
                        ))
                    ) : (
                        <p className="text-center col-span-full text-gray-500 mt-10">
                            No orders found.
                        </p>
                    )}
                </div>
            </div>

            {/* Admin Password Modal */}
            {!accessGranted && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-xl shadow-lg w-80 text-center">
                        <h2 className="text-2xl font-bold mb-4">Admin Access</h2>
                        <input
                            type="password"
                            placeholder="Enter Password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            className="w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-center text-lg"
                            ref={passwordInputRef}
                            autoFocus
                            inputMode="numeric"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}