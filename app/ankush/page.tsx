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

    // Fetch orders
    const fetchOrders = async () => {
        setLoading(true);

        // Create a query: order by orderedDate descending, limit 50
        const q = query(
            collection(db, "Confirm Orders"),
            orderBy("orderedDate", "desc"),
            limit(50)
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

    // Check cookie on load
    useEffect(() => {
        const cookie = Cookies.get(COOKIE_NAME);
        if (cookie === PASSWORD) {
            setAccessGranted(true);
        } else {
            // Focus input after slight delay to open keyboard on mobile
            setTimeout(() => {
                passwordInputRef.current?.focus();
            }, 300);
        }
    }, []);

    // Check password
    useEffect(() => {
        if (passwordInput === PASSWORD) {
            setAccessGranted(true);
            setPasswordInput("");
            // Save cookie for 5 days
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
                    .sort(
                        (a, b) =>
                            b.deliveryDate.toMillis() - a.deliveryDate.toMillis()
                    );
                break;

        }

        return filtered;
    }, [search, orders, sortOption]);

    // Stats calculation
    const stats = useMemo(() => {
        const totalOrders = orders.length;

        const deliveredOrders = orders.filter((o) => o.deliveryStatus === true);

        const pendingOrders = orders.filter((o) => o.deliveryStatus !== true);
        const deleiveryByAnkush = orders.filter((o) => o.deliveryStatus == true && o.deliveredBy == "Ankush");

        console.log(deleiveryByAnkush);




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


        const Profit = deliveredOrders.reduce((sum, o) => {
            // Convert commission string to decimal
            const commissionPercent = parseFloat(o.commission?.replace("%", "") || "0") / 100;

            // Skip orders with 0% commission
            if (commissionPercent === 0) return sum;

            // Calculate principal amount (before commission)
            const x = (o.totalAmount || 0) / (1 + commissionPercent);


            // Profit = adjusted commission (subtract 5%)
            const profit = x * (commissionPercent - 0.05);

            return sum + profit;
        }, 0) - deliveredOrders.filter(o => parseFloat(o.commission?.replace("%", "") || "0") !== 0).length * 100;



        const totalFivePercent = deleiveryByAnkush.reduce((sum, o) => {
            // Convert commission string to decimal
            const commissionPercent = parseFloat(o.commission?.replace("%", "") || "0") / 100;

            // Skip orders with 0% commission
            if (commissionPercent === 0) return sum;

            // Calculate principal amount (before commission)
            const x = (o.totalAmount || 0) / (1 + commissionPercent);

            // 5% of principal
            const fivePercent = x * 0.05;

            return sum + fivePercent;
        }, 0);


        const estimatedProfit = orders.reduce((sum, o) => {
            // Convert commission string to decimal
            const commissionPercent = parseFloat(o.commission?.replace("%", "") || "0") / 100;

            // Skip orders with 0% commission
            if (commissionPercent === 0) return sum;

            // Calculate principal amount (before commission)
            const x = (o.totalAmount || 0) / (1 + commissionPercent);


            // Profit = adjusted commission (subtract 5%)
            const profit = x * (commissionPercent - 0.05);

            return sum + profit;
        }, 0) - deliveredOrders.filter(o => parseFloat(o.commission?.replace("%", "") || "0") !== 0).length * 100;



        return {
            totalOrders,
            delivered: deliveredOrders.length,
            pending: pendingOrders.length,
            totalRevenue,
            remainingPayment,
            estimatedProfit,
            totalFivePercent,
            Profit
        };
    }, [orders]);


    if (loading)
        return <p className="p-5 text-center">Loading…</p>;

    return (
        <div className="relative min-h-screen">

            <ClickableTiles />
            {/* Page content (blurred when modal active) */}
            <div className={`p-6 ${!accessGranted ? "filter blur-md" : ""}`}>
                <h1 className="text-3xl font-bold mb-6">All Orders</h1>



                <OrdersStatsAnkush
                    totalOrders={stats.totalOrders}
                    delivered={stats.delivered}
                    pending={stats.pending}
                    totalRevenue={stats.totalRevenue}
                    remainingPayment={stats.remainingPayment}
                    estimatedProfit={stats.estimatedProfit}
                    borderCommission={stats.totalFivePercent}
                    Profit={stats.Profit}

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
                            className={`px-4 py-2 rounded-xl border ${sortOption === option ? "bg-blue-500 text-white" : "bg-white text-gray-700 border-gray-300"
                                } shadow-sm hover:bg-blue-500 hover:text-white transition-all`}
                            onClick={() => setSortOption(option as SortOption)}
                        >
                            {option.charAt(0).toUpperCase() + option.slice(1).replace("pending", "Pending Orders").replace("delivered", "Delivered Orders")}
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
