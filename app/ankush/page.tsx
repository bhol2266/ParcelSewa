"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
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
import ProductGalleryAnkush from "./ProductGalleryAnkush";
import LateImages, { LateBar, type LateView } from "@/components/LateImages";
import { isOrderAllReceived, withProductChecked } from "@/lib/product-checks";
import { daysSinceOrdered, isLateOrder, lateProductImages, orderedMillis } from "@/lib/late-orders";
import { sortButtonCls } from "@/lib/sort-button";
import { logOrderActivity } from "@/lib/order-logs";

interface Order {
    id: string;
    [key: string]: any;
}

type SortOption = "latest" | "oldest" | "delivered" | "images" | "late";
type AllTimeSortOption = "latest" | "oldest" | "delivered" | "images" | "late";

const orderMatchesSearch = (o: Order, search: string) =>
    o.name?.toLowerCase().includes(search.toLowerCase()) || o.mobile?.includes(search);

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

    // Inside the Late section: the late orders themselves, or just their images that aren't ticked yet
    const [lateView, setLateView] = useState<LateView>("orders");

    const [monthStatOrders, setMonthStatOrders] = useState<Order[]>([]);
    const [monthDeliveredOrders, setMonthDeliveredOrders] = useState<Order[]>([]);
    const [monthOrdersLoading, setMonthOrdersLoading] = useState(false);

    const [allPendingOrders, setAllPendingOrders] = useState<Order[]>([]);
    const [allRecentDeliveredOrders, setAllRecentDeliveredOrders] = useState<Order[]>([]);
    const [allPendingLoading, setAllPendingLoading] = useState(false);
    const [allDeliveredLoading, setAllDeliveredLoading] = useState(false);

    const [currentMonthDeliveredOrders, setCurrentMonthDeliveredOrders] = useState<Order[]>([]);

    // Each product image's tick as first seen in Product Images; lets a new tick wait for a reload to move it down
    const checkedWhenFirstSeen = useRef(new Map<string, boolean>());

    const PASSWORD = "5555";
    const COOKIE_NAME = "admin_access";

    // ── Fetch all pending orders — IDENTICAL to admin, deliveredBy filtered client-side ──
    const fetchAllPendingOrders = useCallback(async (silent = false) => {
        if (!silent) setAllPendingLoading(true);
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
    const fetchAllRecentDeliveredOrders = useCallback(async (silent = false) => {
        if (!silent) setAllDeliveredLoading(true);
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
    const fetchMonthOrders = useCallback(async (monthKey: string, silent = false) => {
        if (!monthKey) {
            setMonthStatOrders([]);
            setMonthDeliveredOrders([]);
            return;
        }
        const [m, y] = monthKey.split("-").map(Number);
        const start = new Date(y, m, 1);
        const end = new Date(y, m + 1, 1);

        if (!silent) setMonthOrdersLoading(true);
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
        // Silent refetch: keep the list mounted so scroll position is kept
        if (selectedMonth) {
            fetchMonthOrders(selectedMonth, true);
        } else {
            fetchAllPendingOrders(true);
            fetchCurrentMonthDelivered();
            if (allTimeSortOption === "delivered") {
                fetchAllRecentDeliveredOrders(true);
            }
        }
    }, [fetchMonthOrders, fetchAllPendingOrders, fetchCurrentMonthDelivered, fetchAllRecentDeliveredOrders, selectedMonth, allTimeSortOption]);

    // ── Tick / untick a product: shown at once, then saved to Firestore (undone if saving fails) ──
    const toggleProductChecked = useCallback(async (order: Order, index: number, checked: boolean) => {
        const show = (productItems: any) => {
            const patch = (list: Order[]) => list.map((o) => (o.id === order.id ? { ...o, productItems } : o));
            setAllPendingOrders(patch);
            setMonthStatOrders(patch);
            setMonthDeliveredOrders(patch);
            setAllRecentDeliveredOrders(patch);
        };
        const productItems = withProductChecked(order, index, checked);
        show(productItems);
        try {
            await updateDoc(doc(db, "Confirm Orders", order.id), { productItems });
            await logOrderActivity({
                action: checked ? "product_received" : "product_unreceived", orderId: order.id, page: "ankush",
                before: order, after: { ...order, productItems },
                details: { product: index + 1, link: order.productPageUrls?.[index] || order.productUrls?.[index] || "" },
            });
        } catch (err) {
            console.error("Failed to save product tick:", err);
            show(order.productItems);
        }
    }, []);

    // ── filteredOrders — identical logic to admin ─────────────────────────────
    const filteredOrders = useMemo(() => {
        const matchesSearch = (o: Order) => orderMatchesSearch(o, search);
        // Orders whose products are all received go to the top; the rest keep their order.
        const receivedFirst = (list: Order[]) => [...list.filter(isOrderAllReceived), ...list.filter((o) => !isOrderAllReceived(o))];

        if (!selectedMonth) {
            if (allTimeSortOption === "delivered") {
                return allRecentDeliveredOrders.filter(matchesSearch);
            }
            if (allTimeSortOption === "late") {
                return allPendingOrders.filter(matchesSearch).filter((o) => isLateOrder(o)).sort((a, b) => orderedMillis(a) - orderedMillis(b));
            }
            return receivedFirst(
                allPendingOrders
                    .filter(matchesSearch)
                    .sort((a, b) => {
                        if (allTimeSortOption === "latest") {
                            return (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0);
                        }
                        return (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0);
                    })
            );
        }

        switch (sortOption) {
            case "latest":
                return receivedFirst(
                    monthStatOrders
                        .filter(matchesSearch)
                        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
                );
            case "oldest":
                return receivedFirst(
                    monthStatOrders
                        .filter(matchesSearch)
                        .sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0))
                );
            case "late":
                return monthStatOrders
                    .filter(matchesSearch)
                    .filter((o) => isLateOrder(o))
                    .sort((a, b) => orderedMillis(a) - orderedMillis(b));
            case "delivered":
                return monthDeliveredOrders
                    .filter(matchesSearch)
                    .sort((a, b) => (b.deliveryDate?.toMillis() ?? 0) - (a.deliveryDate?.toMillis() ?? 0));
            default:
                return [];
        }
    }, [search, sortOption, allTimeSortOption, selectedMonth, monthStatOrders, monthDeliveredOrders, allPendingOrders, allRecentDeliveredOrders]);

    // Product Images view: pending orders only — all of them, or just the selected month's
    const showGallery = (selectedMonth ? sortOption : allTimeSortOption) === "images";
    const galleryOrders = useMemo(() => {
        const source = selectedMonth ? monthStatOrders.filter((o) => o.deliveryStatus === false) : allPendingOrders;
        return source.filter((o) => orderMatchesSearch(o, search));
    }, [search, selectedMonth, monthStatOrders, allPendingOrders]);

    // The Late section only exists while at least one pending order is older than LATE_AFTER_DAYS.
    const lateCount = (selectedMonth ? monthStatOrders : allPendingOrders).filter((o) => isLateOrder(o)).length;
    useEffect(() => {
        if (lateCount > 0) return;
        if (allTimeSortOption === "late") setAllTimeSortOption("oldest");
        if (sortOption === "late") setSortOption("oldest");
    }, [lateCount, allTimeSortOption, sortOption]);

    // Late section: its orders, and the images of those orders that haven't been ticked as received
    const lateSelected = (selectedMonth ? sortOption : allTimeSortOption) === "late";
    const lateImageItems = useMemo(() => (lateSelected ? lateProductImages(filteredOrders) : []), [lateSelected, filteredOrders]);

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
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                </div>

                {/* Sort Buttons — All Pending (All Time) view */}
                {!selectedMonth && (
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        {(["oldest", "latest", "delivered", "images", ...(lateCount > 0 ? ["late"] : [])] as AllTimeSortOption[]).map((option) => (
                            <button
                                key={option}
                                className={sortButtonCls(allTimeSortOption === option, option)}
                                onClick={() => setAllTimeSortOption(option)}
                            >
                                {option === "oldest" && "Oldest First"}
                                {option === "latest" && "Latest First"}
                                {option === "delivered" && "Delivered Orders"}
                                {option === "images" && "🖼️ Product Images"}
                                {option === "late" && `⏰ Late (${lateCount})`}
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
                        {(["oldest", "latest", "delivered", "images", ...(lateCount > 0 ? ["late"] : [])] as SortOption[]).map((option) => (
                            <button
                                key={option}
                                className={sortButtonCls(sortOption === option, option)}
                                onClick={() => setSortOption(option)}
                            >
                                {option === "oldest" && "Oldest First"}
                                {option === "latest" && "Latest First"}
                                {option === "delivered" && "Delivered Orders"}
                                {option === "images" && "🖼️ Product Images"}
                                {option === "late" && `⏰ Late (${lateCount})`}
                            </button>
                        ))}
                    </div>
                )}

                {/* Late section: late orders, or only their product images that aren't ticked yet */}
                {lateSelected && (
                    <LateBar
                        orderCount={filteredOrders.length}
                        imageCount={lateImageItems.length}
                        oldestDays={filteredOrders.length > 0 ? daysSinceOrdered(filteredOrders[0]) : null}
                        view={lateView}
                        onView={setLateView}
                    />
                )}

                {/* Product Images / Late Images / Orders List */}
                {showGallery ? (
                    <ProductGalleryAnkush orders={galleryOrders} onToggle={toggleProductChecked} sortSnapshot={checkedWhenFirstSeen.current} />
                ) : lateSelected && lateView === "images" ? (
                    <LateImages items={lateImageItems} />
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredOrders.length > 0 ? (
                            filteredOrders.map((order) => (
                                <OrderCardAnkush key={order.id} order={order} refresh={refresh} />
                            ))
                        ) : (
                            <p className="text-center col-span-full text-gray-500 dark:text-gray-400 mt-10">
                                No orders found.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {!accessGranted && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-lg w-80 text-center">
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