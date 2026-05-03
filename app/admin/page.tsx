"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
    collection,
    getDocs,
    query,
    orderBy,
    where,
    Timestamp,
} from "firebase/firestore";
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

// ── Build the last 24 months list ─────────────────────────────────────────────
function buildAvailableMonths(): { month: number; year: number; label: string }[] {
    const now = new Date();
    const months: { month: number; year: number; label: string }[] = [];
    for (let i = 0; i <= 23; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            month: d.getMonth(),
            year: d.getFullYear(),
            label: d.toLocaleString("en-US", { month: "long", year: "numeric" }),
        });
    }
    return months;
}

const availableMonths = buildAvailableMonths();

export default function OrdersPage() {
    const [search, setSearch] = useState("");
    const [accessGranted, setAccessGranted] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const passwordInputRef = useRef<HTMLInputElement>(null);
    const [sortOption, setSortOption] = useState<SortOption>("pending");

    // ── Month selector state — empty string = "All Pending" default ───────────
    const [selectedMonth, setSelectedMonth] = useState<string>("");

    // Orders created in the selected month (by createdAt) — latest / oldest / pending card list + stats
    const [monthStatOrders, setMonthStatOrders] = useState<Order[]>([]);
    // Orders delivered in the selected month (by deliveryDate) — delivered card list + border commission
    const [monthDeliveredOrders, setMonthDeliveredOrders] = useState<Order[]>([]);

    // All-time pending orders shown by default when no month is selected
    const [allPendingOrders, setAllPendingOrders] = useState<Order[]>([]);
    const [allPendingLoading, setAllPendingLoading] = useState(false);

    const [monthOrdersLoading, setMonthOrdersLoading] = useState(false);

    const PASSWORD = "5555";
    const COOKIE_NAME = "admin_access";

    // ── Fetch all pending orders (all time) ───────────────────────────────────
    const fetchAllPendingOrders = useCallback(async () => {
        setAllPendingLoading(true);
        try {
            const q = query(
                collection(db, "Confirm Orders"),
                where("deliveryStatus", "==", false),
                orderBy("createdAt", "asc")
            );
            const snap = await getDocs(q);
            setAllPendingOrders(
                snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[]
            );
        } catch (err) {
            console.error("Failed to fetch all pending orders:", err);
            setAllPendingOrders([]);
        } finally {
            setAllPendingLoading(false);
        }
    }, []);

    // ── Fetch both order sets for a specific month ────────────────────────────
    const fetchMonthOrders = useCallback(async (monthKey: string) => {
        if (!monthKey) {
            setMonthStatOrders([]);
            setMonthDeliveredOrders([]);
            return;
        }
        const [m, y] = monthKey.split("-").map(Number);
        const start = new Date(y, m, 1);
        const end = new Date(y, m + 1, 1);

        setMonthOrdersLoading(true);
        try {
            // Query 1: orders created this month (by createdAt) — latest / oldest / pending tabs
            const statQuery = query(
                collection(db, "Confirm Orders"),
                where("createdAt", ">=", Timestamp.fromDate(start)),
                where("createdAt", "<", Timestamp.fromDate(end)),
                orderBy("createdAt", "desc")
            );

            // Query 2: orders delivered this month (by deliveryDate) — delivered tab + border commission
            const deliveryQuery = query(
                collection(db, "Confirm Orders"),
                where("deliveryDate", ">=", Timestamp.fromDate(start)),
                where("deliveryDate", "<", Timestamp.fromDate(end)),
                orderBy("deliveryDate", "desc")
            );

            const [statSnap, deliverySnap] = await Promise.all([
                getDocs(statQuery),
                getDocs(deliveryQuery),
            ]);

            setMonthStatOrders(
                statSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[]
            );
            setMonthDeliveredOrders(
                deliverySnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[]
            );
        } catch (err) {
            console.error("Failed to fetch month orders:", err);
            setMonthStatOrders([]);
            setMonthDeliveredOrders([]);
        } finally {
            setMonthOrdersLoading(false);
        }
    }, []);

    // ── On mount: fetch all pending orders (default view) ────────────────────
    useEffect(() => {
        fetchAllPendingOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Auth cookie check ─────────────────────────────────────────────────────
    useEffect(() => {
        const cookie = Cookies.get(COOKIE_NAME);
        if (cookie === PASSWORD) {
            setAccessGranted(true);
        } else {
            setTimeout(() => passwordInputRef.current?.focus(), 300);
        }
    }, []);

    useEffect(() => {
        if (passwordInput === PASSWORD) {
            setAccessGranted(true);
            setPasswordInput("");
            Cookies.set(COOKIE_NAME, PASSWORD, { expires: 5, path: "/" });
        }
    }, [passwordInput]);

    // ── Month dropdown change → fetch from Firestore ──────────────────────────
    const handleMonthChange = (value: string) => {
        setSelectedMonth(value);
        if (value) {
            fetchMonthOrders(value);
        } else {
            // Switched back to "All Pending" — re-fetch if needed
            fetchAllPendingOrders();
        }
    };

    // ── refresh callback passed to cards ─────────────────────────────────────
    const refresh = useCallback(() => {
        if (selectedMonth) {
            fetchMonthOrders(selectedMonth);
        } else {
            fetchAllPendingOrders();
        }
    }, [fetchMonthOrders, fetchAllPendingOrders, selectedMonth]);

    // ── Filtered + sorted card list ───────────────────────────────────────────
    // When no month selected: always show all pending orders
    // When month selected:
    //   latest / oldest / pending  →  monthStatOrders  (sorted by createdAt)
    //   delivered                  →  monthDeliveredOrders  (sorted by deliveryDate)
    const filteredOrders = useMemo(() => {
        const matchesSearch = (o: Order) =>
            o.name?.toLowerCase().includes(search.toLowerCase()) ||
            o.mobile?.includes(search);

        // Default all-time pending view
        if (!selectedMonth) {
            return allPendingOrders
                .filter(matchesSearch)
                .sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
        }

        switch (sortOption) {
            case "latest":
                return monthStatOrders
                    .filter(matchesSearch)
                    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));

            case "oldest":
                return monthStatOrders
                    .filter(matchesSearch)
                    .sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));

            case "pending":
                return monthStatOrders
                    .filter((o) => matchesSearch(o) && o.deliveryStatus !== true && o.deliveryStatus !== "cancelled")
                    .sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));

            case "delivered":
                return monthDeliveredOrders
                    .filter(matchesSearch)
                    .sort((a, b) => (b.deliveryDate?.toMillis() ?? 0) - (a.deliveryDate?.toMillis() ?? 0));

            default:
                return [];
        }
    }, [search, sortOption, selectedMonth, monthStatOrders, monthDeliveredOrders, allPendingOrders]);

    const isLoading = !selectedMonth ? allPendingLoading : monthOrdersLoading;
    if (isLoading) return <p className="p-5 text-center">Loading…</p>;

    return (
        <div className="relative min-h-screen">

            <ClickableTiles />
            <div className={`p-6 ${!accessGranted ? "filter blur-md" : ""}`}>

                <OrdersStats
                    selectedMonth={selectedMonth}
                    availableMonths={availableMonths}
                    onMonthChange={handleMonthChange}
                    monthOrdersLoading={monthOrdersLoading}
                    monthStatOrders={monthStatOrders}
                    monthDeliveredOrders={monthDeliveredOrders}
                    allPendingOrders={allPendingOrders}
                    allPendingLoading={allPendingLoading}
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

                {/* Sort Buttons — only shown when a month is selected */}
                {selectedMonth && (
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
                )}

                {/* Orders List */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => (
                            <OrderCard key={order.id} order={order} refresh={refresh} />
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