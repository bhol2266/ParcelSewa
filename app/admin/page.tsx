"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import OrderCard from "./OrderCard";
import Cookies from "js-cookie";
import OrdersStats from "./OrdersStats";
import ClickableTiles from "@/components/ClickableTiles";

interface Order {
    id: string;
    [key: string]: any;
}

type SortOption = "latest" | "oldest" | "pending" | "delivered";

// Safe commission parser — handles string "10%", number 10, null, undefined
const parseCommission = (commission: any): number => {
    if (commission === null || commission === undefined) return 0;
    if (typeof commission === "number") return isNaN(commission) ? 0 : commission / 100;
    const parsed = parseFloat(String(commission).replace("%", "").trim());
    return isNaN(parsed) ? 0 : parsed / 100;
};

export default function OrdersPage() {
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

        const q = query(
            collection(db, "Confirm Orders"),
            orderBy("orderedDate", "desc"),
            limit(150)
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
        // Exclude cancelled orders from all stats
        const activeOrders = orders.filter((o) => o.deliveryStatus !== "cancelled");

        const totalOrders = activeOrders.length;

        const deliveredOrders = activeOrders.filter((o) => o.deliveryStatus === true);
        const pendingOrders = activeOrders.filter((o) => o.deliveryStatus !== true);

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Calculate last month safely
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonth = lastMonthDate.getMonth();
        const lastMonthYear = lastMonthDate.getFullYear();

        // ── Current month delivered orders (scoped by deliveryDate) ──
        const deliveredOrdersThisMonth = activeOrders.filter((o) => {
            if (o.deliveryStatus !== true) return false;
            if (!o.deliveryDate?.seconds) return false;
            const d = new Date(o.deliveryDate.seconds * 1000);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        // ── Last month delivered orders (scoped by deliveryDate) ──
        const deliveredOrdersLastMonth = activeOrders.filter((o) => {
            if (o.deliveryStatus !== true) return false;
            if (!o.deliveryDate?.seconds) return false;
            const d = new Date(o.deliveryDate.seconds * 1000);
            return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
        });

        // ── Border commission: Ankush deliveries this month ──
        const deliveryByAnkushThisMonth = activeOrders.filter((o) => {
            if (!o.deliveryStatus) return false;
            if (o.deliveredBy !== "Ankush") return false;
            if (!o.deliveryDate?.seconds) return false;
            const deliveryDate = new Date(o.deliveryDate.seconds * 1000);
            return (
                deliveryDate.getMonth() === currentMonth &&
                deliveryDate.getFullYear() === currentYear
            );
        });

        // ── Border commission: Ankush deliveries last month ──
        const deliveryByAnkushLastMonth = activeOrders.filter((o) => {
            if (!o.deliveryStatus) return false;
            if (o.deliveredBy !== "Ankush") return false;
            if (!o.deliveryDate?.seconds) return false;
            const deliveryDate = new Date(o.deliveryDate.seconds * 1000);
            return (
                deliveryDate.getMonth() === lastMonth &&
                deliveryDate.getFullYear() === lastMonthYear
            );
        });

        // ── Total Revenue: this month delivered + advance from all pending ──
        const deliveredRevenueThisMonth = deliveredOrdersThisMonth.reduce(
            (sum, o) => sum + (o.totalAmount || 0),
            0
        );

        const advanceFromPending = pendingOrders.reduce(
            (sum, o) => sum + (o.advancePayment || 0),
            0
        );

        const totalRevenue = deliveredRevenueThisMonth + advanceFromPending;

        // ── Total Revenue last month ──
        const totalRevenueLastMonth = deliveredOrdersLastMonth.reduce(
            (sum, o) => sum + (o.totalAmount || 0),
            0
        );

        // ── Remaining Payment: all pending orders ──
        const remainingPayment = pendingOrders.reduce(
            (sum, o) => sum + ((o.totalAmount || 0) - (o.advancePayment || 0)),
            0
        );

        // ── Profit: based on delivered orders in the month ──
        const calcProfit = (list: Order[]) =>
            list.reduce((sum, o) => {
                const commissionPercent = parseCommission(o.commission);
                if (commissionPercent === 0) return sum;
                const x = (o.totalAmount || 0) / (1 + commissionPercent);
                return sum + x * (commissionPercent - 0.05);
            }, 0) - list.filter((o) => parseCommission(o.commission) !== 0).length * 100;

        const Profit = calcProfit(deliveredOrdersThisMonth);       // FIX: was deliveredOrders (all-time)
        const ProfitLastMonth = calcProfit(deliveredOrdersLastMonth);

        // ── Border Commission ──
        const calcBorderCommission = (deliveredList: Order[]) =>
            deliveredList.reduce((sum, o) => {
                const commission = o.commission || "";

                if (commission === "Flat NPR 600") {
                    const principal = (o.totalAmount || 0) - 600;
                    return sum + principal * 0.07;
                }
                if (commission === "Flat NPR 700") {
                    const principal = (o.totalAmount || 0) - 700;
                    return sum + principal * 0.07;
                }

                const commissionPercent = parseCommission(commission);
                if (commissionPercent === 0) return sum;

                const x = (o.totalAmount || 0) / (1 + commissionPercent);
                return sum + x * 0.07;
            }, 0);

        const totalFivePercent = calcBorderCommission(deliveryByAnkushThisMonth);
        const totalFivePercent_LastMonth = calcBorderCommission(deliveryByAnkushLastMonth);

        // ── Estimated Profit: all active orders this month (ordered this month) ──
        const calcEstimatedProfit = (allList: Order[], delvList: Order[]) =>
            allList.reduce((sum, o) => {
                const commissionPercent = parseCommission(o.commission);
                if (commissionPercent === 0) return sum;
                const x = (o.totalAmount || 0) / (1 + commissionPercent);
                return sum + x * (commissionPercent - 0.05);
            }, 0) - delvList.filter((o) => parseCommission(o.commission) !== 0).length * 100;

        // Current month: orders placed this month (pending + delivered this month)
        const activeOrdersThisMonth = activeOrders.filter((o) => {
            if (!o.orderedDate?.seconds) return false;
            const d = new Date(o.orderedDate.seconds * 1000);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const estimatedProfit = calcEstimatedProfit(activeOrdersThisMonth, deliveredOrdersThisMonth); // FIX: was all activeOrders

        // Last month: orders placed last month
        const activeOrdersLastMonth = activeOrders.filter((o) => {
            if (!o.orderedDate?.seconds) return false;
            const d = new Date(o.orderedDate.seconds * 1000);
            return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
        });
        const estimatedProfitLastMonth = calcEstimatedProfit(activeOrdersLastMonth, deliveredOrdersLastMonth);

        return {
            totalOrders,
            delivered: deliveredOrders.length,
            pending: pendingOrders.length,
            totalRevenue,
            totalRevenueLastMonth,
            remainingPayment,
            estimatedProfit,
            estimatedProfitLastMonth,
            totalFivePercent,
            totalFivePercent_LastMonth,
            Profit,
            ProfitLastMonth,
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

                <OrdersStats
                    totalOrders={stats.totalOrders}
                    delivered={stats.delivered}
                    pending={stats.pending}
                    totalRevenue={stats.totalRevenue}
                    totalRevenueLastMonth={stats.totalRevenueLastMonth}
                    remainingPayment={stats.remainingPayment}
                    estimatedProfit={stats.estimatedProfit}
                    estimatedProfitLastMonth={stats.estimatedProfitLastMonth}
                    borderCommission={stats.totalFivePercent}
                    borderCommissionLastMonth={stats.totalFivePercent_LastMonth}
                    Profit={stats.Profit}
                    ProfitLastMonth={stats.ProfitLastMonth}
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
                            <OrderCard key={order.id} order={order} refresh={fetchOrders} />
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