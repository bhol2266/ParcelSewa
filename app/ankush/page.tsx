"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
    collection,
    getDocs,
    query,
    orderBy,
    where,
    Timestamp,
    limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import OrderCardAnkush from "./OrderCardAnkush";
import Cookies from "js-cookie";
import OrdersStatsAnkush from "./OrdersStatsAnkush";
import ClickableTiles from "@/components/ClickableTiles";

interface Order {
    id: string;
    [key: string]: any;
}

type SortOption = "latest" | "oldest" | "delivered";
type AllTimeSortOption = "latest" | "oldest" | "delivered";

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

export default function Ankush() {
    const [search, setSearch] = useState("");
    const [accessGranted, setAccessGranted] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const passwordInputRef = useRef<HTMLInputElement>(null);
    const [sortOption, setSortOption] = useState<SortOption>("oldest");
    const [allTimeSortOption, setAllTimeSortOption] = useState<AllTimeSortOption>("oldest");
    const [selectedMonth, setSelectedMonth] = useState<string>("");

    const [monthStatOrders, setMonthStatOrders] = useState<Order[]>([]);
    const [monthDeliveredOrders, setMonthDeliveredOrders] = useState<Order[]>([]);
    const [monthOrdersLoading, setMonthOrdersLoading] = useState(false);

    const [allPendingOrders, setAllPendingOrders] = useState<Order[]>([]);
    const [allRecentDeliveredOrders, setAllRecentDeliveredOrders] = useState<Order[]>([]);
    const [allPendingLoading, setAllPendingLoading] = useState(false);
    const [allDeliveredLoading, setAllDeliveredLoading] = useState(false);

    const [currentMonthDeliveredOrders, setCurrentMonthDeliveredOrders] = useState<Order[]>([]);

    const PASSWORD = "5555";
    const COOKIE_NAME = "admin_access";

    // ── Fetch all pending orders — IDENTICAL to admin, deliveredBy filtered client-side ──
    const fetchAllPendingOrders = useCallback(async () => {
        setAllPendingLoading(true);
        try {
            const q = query(
                collection(db, "Confirm Orders"),
                where("deliveryStatus", "==", false),
                orderBy("createdAt", "asc")
            );
            const snap = await getDocs(q);
            const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[];
            setAllPendingOrders(all);
        } catch (err) {
            console.error("Failed to fetch all pending orders:", err);
            setAllPendingOrders([]);
        } finally {
            setAllPendingLoading(false);
        }
    }, []);

    // ── Fetch last 30 delivered orders for Ankush ─────────────────────────────
    const fetchAllRecentDeliveredOrders = useCallback(async () => {
        setAllDeliveredLoading(true);
        try {
            const q = query(
                collection(db, "Confirm Orders"),
                where("deliveryStatus", "==", true),
                orderBy("deliveryDate", "desc"),
                limit(60)
            );
            const snap = await getDocs(q);
            const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[];
            setAllRecentDeliveredOrders(all.slice(0, 30));
        } catch (err) {
            console.error("Failed to fetch recent delivered orders:", err);
            setAllRecentDeliveredOrders([]);
        } finally {
            setAllDeliveredLoading(false);
        }
    }, []);

    // ── Fetch current month delivered for commission stat ─────────────────────
    const fetchCurrentMonthDelivered = useCallback(async () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        try {
            const q = query(
                collection(db, "Confirm Orders"),
                where("deliveryDate", ">=", Timestamp.fromDate(start)),
                where("deliveryDate", "<", Timestamp.fromDate(end)),
                orderBy("deliveryDate", "desc")
            );
            const snap = await getDocs(q);
            setCurrentMonthDeliveredOrders(
                snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[]
            );
        } catch (err) {
            console.error("Failed to fetch current month delivered:", err);
            setCurrentMonthDeliveredOrders([]);
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
            const statQuery = query(
                collection(db, "Confirm Orders"),
                where("createdAt", ">=", Timestamp.fromDate(start)),
                where("createdAt", "<", Timestamp.fromDate(end)),
                orderBy("createdAt", "desc")
            );
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

    // ── On mount ──────────────────────────────────────────────────────────────
    useEffect(() => {
        fetchAllPendingOrders();
        fetchCurrentMonthDelivered();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Lazy-load delivered tab
    useEffect(() => {
        if (!selectedMonth && allTimeSortOption === "delivered" && allRecentDeliveredOrders.length === 0) {
            fetchAllRecentDeliveredOrders();
        }
    }, [selectedMonth, allTimeSortOption, allRecentDeliveredOrders.length, fetchAllRecentDeliveredOrders]);

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

    const handleMonthChange = (value: string) => {
        setSelectedMonth(value);
        if (value) {
            setSortOption("oldest");
            setMonthStatOrders([]);
            setMonthDeliveredOrders([]);
            fetchMonthOrders(value);
        } else {
            fetchAllPendingOrders();
            setAllTimeSortOption("oldest");
        }
    };

    const refresh = useCallback(() => {
        if (selectedMonth) {
            fetchMonthOrders(selectedMonth);
        } else {
            fetchAllPendingOrders();
            fetchCurrentMonthDelivered();
            if (allTimeSortOption === "delivered") {
                fetchAllRecentDeliveredOrders();
            }
        }
    }, [fetchMonthOrders, fetchAllPendingOrders, fetchCurrentMonthDelivered, fetchAllRecentDeliveredOrders, selectedMonth, allTimeSortOption]);

    // ── filteredOrders — identical logic to admin ─────────────────────────────
    const filteredOrders = useMemo(() => {
        const matchesSearch = (o: Order) =>
            o.name?.toLowerCase().includes(search.toLowerCase()) ||
            o.mobile?.includes(search);

        if (!selectedMonth) {
            if (allTimeSortOption === "delivered") {
                return allRecentDeliveredOrders.filter(matchesSearch);
            }
            return allPendingOrders
                .filter(matchesSearch)
                .sort((a, b) => {
                    if (allTimeSortOption === "latest") {
                        return (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0);
                    }
                    return (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0);
                });
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
            case "delivered":
                return monthDeliveredOrders
                    .filter(matchesSearch)
                    .sort((a, b) => (b.deliveryDate?.toMillis() ?? 0) - (a.deliveryDate?.toMillis() ?? 0));
            default:
                return [];
        }
    }, [search, sortOption, allTimeSortOption, selectedMonth, monthStatOrders, monthDeliveredOrders, allPendingOrders, allRecentDeliveredOrders]);

    const isLoading = !selectedMonth
        ? (allTimeSortOption === "delivered" ? allDeliveredLoading : allPendingLoading)
        : monthOrdersLoading;

    if (isLoading) return <p className="p-5 text-center">Loading…</p>;

    return (
        <div className="relative min-h-screen">
            <ClickableTiles />
            <div className={`p-6 ${!accessGranted ? "filter blur-md" : ""}`}>

                <OrdersStatsAnkush
                    selectedMonth={selectedMonth}
                    availableMonths={availableMonths}
                    onMonthChange={handleMonthChange}
                    monthOrdersLoading={monthOrdersLoading}
                    monthStatOrders={monthStatOrders}
                    monthDeliveredOrders={monthDeliveredOrders}
                    allPendingOrders={allPendingOrders}
                    allPendingLoading={allPendingLoading}
                    currentMonthDeliveredOrders={currentMonthDeliveredOrders}
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

                {/* Sort Buttons — All Pending (All Time) view */}
                {!selectedMonth && (
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        {(["oldest", "latest", "delivered"] as AllTimeSortOption[]).map((option) => (
                            <button
                                key={option}
                                className={`px-4 py-2 rounded-xl border ${
                                    allTimeSortOption === option
                                        ? "bg-blue-500 text-white"
                                        : "bg-white text-gray-700 border-gray-300"
                                } shadow-sm hover:bg-blue-500 hover:text-white transition-all`}
                                onClick={() => setAllTimeSortOption(option)}
                            >
                                {option === "oldest" && "Oldest First"}
                                {option === "latest" && "Latest First"}
                                {option === "delivered" && "Delivered Orders"}
                            </button>
                        ))}
                        {allTimeSortOption === "delivered" && (
                            <span className="text-xs text-gray-400">Last 30 delivered orders</span>
                        )}
                    </div>
                )}

                {/* Sort Buttons — Monthly view */}
                {selectedMonth && (
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        {(["oldest", "latest", "delivered"] as SortOption[]).map((option) => (
                            <button
                                key={option}
                                className={`px-4 py-2 rounded-xl border ${
                                    sortOption === option
                                        ? "bg-blue-500 text-white"
                                        : "bg-white text-gray-700 border-gray-300"
                                } shadow-sm hover:bg-blue-500 hover:text-white transition-all`}
                                onClick={() => setSortOption(option)}
                            >
                                {option === "oldest" && "Oldest First"}
                                {option === "latest" && "Latest First"}
                                {option === "delivered" && "Delivered Orders"}
                            </button>
                        ))}
                    </div>
                )}

                {/* Orders List */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => (
                            <OrderCardAnkush key={order.id} order={order} refresh={refresh} />
                        ))
                    ) : (
                        <p className="text-center col-span-full text-gray-500 mt-10">
                            No orders found.
                        </p>
                    )}
                </div>
            </div>

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