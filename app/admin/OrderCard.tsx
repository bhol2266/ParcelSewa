"use client";

import { useState, useEffect } from "react";
import { updateDoc, doc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";

interface OrderProps {
    order: any;
    refresh: (orderId?: string) => void;
}

const DELETE_PASSWORD = "5555";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {label}
        </label>
        {children}
    </div>
);

// ── Tiny inline icons (stroke follows currentColor) ───────────────────────────
const icon = (d: string, extra?: React.ReactNode) => (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="shrink-0">
        <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        {extra}
    </svg>
);

const IconStore = icon("M3 7l1-3h12l1 3M3 7h14v9H3V7zm4 9v-5h6v5");
const IconTag = icon("M3 3h6l8 8-6 6-8-8V3z", <circle cx="6.5" cy="6.5" r="1.2" fill="currentColor" />);
const IconCalendar = icon("M3 5h14v12H3V5zm4-2v4m6-4v4M3 9h14");
const IconTruck = icon("M2 5h9v9H2V5zm9 3h4l3 3v3h-7V8z", <><circle cx="6" cy="16" r="1.6" stroke="currentColor" strokeWidth="1.6" /><circle cx="14" cy="16" r="1.6" stroke="currentColor" strokeWidth="1.6" /></>);
const IconPin = icon("M10 18s6-5.2 6-9.5A6 6 0 004 8.5C4 12.8 10 18 10 18z", <circle cx="10" cy="8.5" r="2.2" stroke="currentColor" strokeWidth="1.6" />);
const IconBox = icon("M10 2l7 4v8l-7 4-7-4V6l7-4zM3 6l7 4 7-4M10 10v8");
const IconChevron = (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180">
        <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const Meta = ({ icon: ic, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
    <div className="flex items-center gap-2 min-w-0">
        <span className="text-gray-400">{ic}</span>
        <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 leading-none mb-0.5">{label}</p>
            <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
        </div>
    </div>
);

function isProductUrl(url: string): boolean {
    if (!url) return false;
    const imageExtensions = /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i;
    if (imageExtensions.test(url)) return false;
    try {
        const u = new URL(url);
        const shoppingSites = [
            "daraz", "amazon", "aliexpress", "alibaba", "shopify",
            "flipkart", "meesho", "myntra", "ajio", "snapdeal",
            "walmart", "ebay", "etsy", "shein", "temu", "1688"
        ];
        return shoppingSites.some(site => u.hostname.includes(site)) || u.pathname.length > 1;
    } catch {
        return false;
    }
}

async function fetchProductImageWithClaude(productUrl: string, notes: string): Promise<string> {
    const response = await fetch("/api/fetch-product-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUrl, notes }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
        throw new Error(data.error || `Server error ${response.status}`);
    }

    if (data.imageUrl) return data.imageUrl;

    throw new Error("No image URL returned from server");
}

export default function OrderCard({ order, refresh }: OrderProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(order);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteError, setDeleteError] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    const [isFetchingImages, setIsFetchingImages] = useState(false);
    const [fetchProgress, setFetchProgress] = useState<string[]>([]);

    useEffect(() => { setEditData(order); }, [order]);

    const isCancelled = order.deliveryStatus === "cancelled";
    const isDelivered = order.deliveryStatus === true;
    const remaining = (order.totalAmount || 0) - (order.advancePayment || 0);

    const formatDate = (ts: any) => {
        const date = ts.toDate();
        return date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    };

    const handleCopy = () => {
        const text = `${order.name}\nMobile: ${order.mobile.replace("+977", "")}\n ${order.address}`;
        navigator.clipboard.writeText(text);
    };

    // ── AI: Auto-fetch product images ─────────────────────────────────────────
    const handleAutoFetchImages = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const urls: string[] = order.productUrls || [];
        if (!urls.some(isProductUrl)) {
            alert("No product page URLs found — all items already have image URLs.");
            return;
        }

        setIsFetchingImages(true);
        setFetchProgress(["🚀 Starting image fetch..."]);

        const updatedUrls = [...urls];
        const updatedPageUrls: string[] = [...(order.productPageUrls || urls)];
        const updatedItems = [...(order.productItems || urls.map((u: string, i: number) => ({
            url: u,
            quantity: order.productItems?.[i]?.quantity ?? "1",
        })))];

        let anySuccess = false;

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            if (!isProductUrl(url)) continue;

            setFetchProgress(prev => [...prev, `🔍 Fetching image for product ${i + 1}...`]);

            try {
                const imageUrl = await fetchProductImageWithClaude(url, order.notes || "");
                updatedPageUrls[i] = url;
                updatedUrls[i] = imageUrl;
                updatedItems[i] = { ...updatedItems[i], url: imageUrl };
                anySuccess = true;
                setFetchProgress(prev => [...prev, `✅ Product ${i + 1}: Image found!`]);
            } catch (err: any) {
                setFetchProgress(prev => [...prev, `❌ Product ${i + 1}: ${err?.message || "Unknown error"}`]);
            }
        }

        // Save to Firestore
        try {
            await updateDoc(doc(db, "Confirm Orders", order.id), {
                productUrls: updatedUrls,
                productPageUrls: updatedPageUrls,
                productItems: updatedItems,
            });
            setFetchProgress(prev => [...prev, anySuccess ? "💾 Saved! Refreshing in 3s..." : "💾 Saved (no images changed). Refreshing in 3s..."]);
        } catch {
            setFetchProgress(prev => [...prev, "❌ Failed to save to Firestore."]);
        }

        setIsFetchingImages(false);

        // ── Delay refresh so user can read the log ─────────────────────────
        setTimeout(() => { refresh(order.id); }, 3000);
    };

    // ── Cancel ────────────────────────────────────────────────────────────────
    const handleCancelOrder = async () => {
        setIsCancelling(true);
        try {
            await updateDoc(doc(db, "Confirm Orders", order.id), { deliveryStatus: "cancelled" });
            setShowCancelConfirm(false);
            refresh(order.id);
        } catch (err) {
            console.error("Cancel failed:", err);
        } finally {
            setIsCancelling(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDeleteConfirm = async () => {
        if (deletePassword !== DELETE_PASSWORD) {
            setDeleteError("Incorrect password. Try again.");
            setDeletePassword("");
            return;
        }
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, "Confirm Orders", order.id));
            setShowDeleteModal(false);
            refresh(order.id);
        } catch (err) {
            console.error("Delete failed:", err);
            setDeleteError("Something went wrong. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    // ── Status theme — colour lives in the accent bar / pill / avatar, not the whole card ──
    const theme = isCancelled
        ? { bar: "from-slate-400 to-slate-500", pill: "bg-white text-slate-700 ring-slate-200", dot: "bg-slate-500", avatar: "from-slate-400 to-slate-600", label: "Cancelled", tint: "from-slate-200 to-slate-100", ring: "ring-slate-300" }
        : isDelivered
            ? { bar: "from-rose-400 to-red-500", pill: "bg-white text-rose-700 ring-rose-200", dot: "bg-rose-500", avatar: "from-rose-400 to-red-500", label: "Delivered", tint: "from-rose-100 to-orange-50", ring: "ring-rose-300/70" }
            : { bar: "from-emerald-400 to-green-500", pill: "bg-white text-emerald-700 ring-emerald-200", dot: "bg-emerald-500", avatar: "from-emerald-400 to-green-500", label: "Pending", tint: "from-emerald-100 to-teal-50", ring: "ring-emerald-300/70" };

    const hasProductPageUrls = (order.productUrls || []).some(isProductUrl);
    const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

    const initials = (order.name || "?").trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? "").join("");
    const total = order.totalAmount || 0;
    const paid = order.advancePayment || 0;
    const paidPct = total > 0 ? Math.min(100, Math.max(0, Math.round((paid / total) * 100))) : 0;
    const productCount = order.productUrls?.length ?? 0;

    return (
        <>
            <div
                data-order-id={order.id}
                className={`group/card relative overflow-hidden rounded-2xl bg-gradient-to-br ${theme.tint} ring-1 ${theme.ring} shadow-sm hover:shadow-lg transition-all duration-200`}
            >
                {/* status accent bar */}
                <div className={`h-1 w-full bg-gradient-to-r ${theme.bar}`} />

                <div className="p-4">
                    <div className="flex items-center gap-3 mb-3 min-w-0">
                        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${theme.avatar} text-sm font-bold text-white shadow-sm`}>
                            {initials || "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="truncate text-base font-bold leading-tight text-gray-900">{order.name}</h2>
                            <p className="truncate text-xs text-gray-500">{order.storeName}</p>
                        </div>
                        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${theme.pill}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
                            {theme.label}
                        </span>
                    </div>

                {isEditing ? (
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <Field label="Customer Name">
                                <input className={inputCls} value={editData.name || ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} placeholder="Customer Name" />
                            </Field>
                            <Field label="Mobile Number">
                                <input className={inputCls} value={editData.mobile || ""} onChange={(e) => setEditData({ ...editData, mobile: e.target.value })} placeholder="Mobile Number" />
                            </Field>
                        </div>
                        <Field label="Address">
                            <input className={inputCls} value={editData.address || ""} onChange={(e) => setEditData({ ...editData, address: e.target.value })} placeholder="Address" />
                        </Field>
                        <div className="grid grid-cols-2 gap-2">
                            <Field label="Store Name">
                                <input className={inputCls} value={editData.storeName || ""} onChange={(e) => setEditData({ ...editData, storeName: e.target.value })} placeholder="Store Name" />
                            </Field>
                            <Field label="Commission">
                                <select className={inputCls} value={editData.commission || ""} onChange={(e) => setEditData({ ...editData, commission: e.target.value })}>
                                    <option value="15%">15%</option>
                                    <option value="20%">20%</option>
                                    <option value="25%">25%</option>
                                    <option value="30%">30%</option>
                                    <option value="35%">35%</option>
                                    <option value="40%">40%</option>
                                </select>
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Field label="Total Amount (Rs.)">
                                <input type="number" className={inputCls} value={editData.totalAmount || ""} onChange={(e) => setEditData({ ...editData, totalAmount: Number(e.target.value) })} placeholder="Total Amount" />
                            </Field>
                            <Field label="Advance Payment (Rs.)">
                                <input type="number" className={inputCls} value={editData.advancePayment || ""} onChange={(e) => setEditData({ ...editData, advancePayment: Number(e.target.value) })} placeholder="Advance Payment" />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Field label="Ordered Date">
                                <input type="date" className={inputCls}
                                    value={editData.orderedDate ? editData.orderedDate.toDate().toISOString().split("T")[0] : ""}
                                    onChange={(e) => setEditData({ ...editData, orderedDate: Timestamp.fromDate(new Date(e.target.value)) })}
                                />
                            </Field>
                            <Field label="Delivered Date">
                                <input type="date" className={inputCls}
                                    value={editData.deliveryDate ? editData.deliveryDate.toDate().toISOString().split("T")[0] : ""}
                                    onChange={(e) => setEditData({ ...editData, deliveryDate: Timestamp.fromDate(new Date(e.target.value)) })}
                                />
                            </Field>
                        </div>

                        <div className="flex items-center justify-between gap-3 py-0.5">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery Status</span>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <div className="relative">
                                    <input type="checkbox" className="sr-only" checked={editData.deliveryStatus === true}
                                        onChange={(e) => setEditData({ ...editData, deliveryStatus: e.target.checked, deliveredBy: e.target.checked ? (editData.deliveredBy || "Ankush") : editData.deliveredBy })}
                                    />
                                    <div className={`w-10 h-5 rounded-full transition-colors ${editData.deliveryStatus === true ? "bg-green-500" : "bg-gray-300"}`} />
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${editData.deliveryStatus === true ? "translate-x-5" : "translate-x-0.5"}`} />
                                </div>
                                <span className="text-sm font-medium text-gray-700">{editData.deliveryStatus === true ? "Delivered" : "Pending"}</span>
                            </label>
                        </div>
                        {editData.deliveryStatus === true && (
                            <Field label="Delivered By">
                                <select className={inputCls} value={editData.deliveredBy || ""} onChange={(e) => setEditData({ ...editData, deliveredBy: e.target.value })}>
                                    <option value="">Select Delivery Person</option>
                                    <option value="Ankush">Ankush</option>
                                    <option value="Bhola">Bhola</option>
                                </select>
                            </Field>
                        )}

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Product URLs</p>
                                <button type="button" className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                                    onClick={() => setEditData({ ...editData, productUrls: [...(editData.productUrls || []), ""], productItems: [...(editData.productItems || []), { url: "", quantity: "1" }] })}>
                                    + Add URL
                                </button>
                            </div>
                            {editData.productUrls?.map((url: string, i: number) => {
                                const qty = editData.productItems?.[i]?.quantity ?? "1";
                                return (
                                    <div key={i} className="flex gap-1.5 items-center">
                                        <input className={`flex-1 ${inputCls}`} value={url}
                                            onChange={(e) => {
                                                const updatedUrls = [...editData.productUrls];
                                                updatedUrls[i] = e.target.value;
                                                const updatedItems = [...(editData.productItems || editData.productUrls.map((u: string, idx: number) => ({ url: u, quantity: editData.productItems?.[idx]?.quantity ?? "1" })))];
                                                updatedItems[i] = { ...updatedItems[i], url: e.target.value };
                                                setEditData({ ...editData, productUrls: updatedUrls, productItems: updatedItems });
                                            }}
                                            placeholder={`Product URL ${i + 1}`}
                                        />
                                        <input type="text" className="w-12 rounded-lg border border-gray-200 px-1 py-1.5 text-center text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" value={qty} title="Quantity"
                                            onChange={(e) => {
                                                const updatedItems = [...(editData.productItems || editData.productUrls.map((u: string, idx: number) => ({ url: u, quantity: editData.productItems?.[idx]?.quantity ?? "1" })))];
                                                updatedItems[i] = { ...updatedItems[i], quantity: e.target.value };
                                                setEditData({ ...editData, productItems: updatedItems });
                                            }}
                                        />
                                        <button type="button" className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-sm font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-100"
                                            onClick={() => {
                                                const updatedUrls = editData.productUrls.filter((_: string, index: number) => index !== i);
                                                const updatedItems = (editData.productItems || []).filter((_: any, index: number) => index !== i);
                                                setEditData({ ...editData, productUrls: updatedUrls, productItems: updatedItems });
                                            }}>✕</button>
                                    </div>
                                );
                            })}
                        </div>

                        <Field label="Notes">
                            <textarea className={`${inputCls} resize-none`} rows={2} value={editData.notes || ""}
                                onChange={(e) => setEditData({ ...editData, notes: e.target.value })} placeholder="Add any notes about this order…" />
                        </Field>

                        <div className="flex gap-2 pt-1">
                            <button type="button" className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99]"
                                onClick={async () => {
                                    const dataToSave = { ...editData, deliveredBy: editData.deliveryStatus ? editData.deliveredBy || "" : "" };
                                    if (editData.deliveryStatus && !editData.deliveryDate) dataToSave.deliveryDate = Timestamp.now();
                                    await updateDoc(doc(db, "Confirm Orders", order.id), dataToSave);
                                    setIsEditing(false);
                                    refresh(order.id);
                                }}>Save</button>
                            <button type="button" className="flex-1 rounded-xl bg-white py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-50 active:scale-[0.99]"
                                onClick={() => { setEditData(order); setIsEditing(false); }}>Cancel</button>
                        </div>

                        {isCancelled && (
                            <button type="button" className="w-full rounded-xl bg-blue-500 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
                                onClick={async () => {
                                    await updateDoc(doc(db, "Confirm Orders", order.id), { deliveryStatus: false });
                                    setIsEditing(false);
                                    refresh(order.id);
                                }}>↩️ Reverse Cancellation</button>
                        )}

                        <div className="flex gap-2">
                            {!isCancelled && (
                                <button type="button" className="flex-1 rounded-xl bg-amber-50 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
                                    onClick={() => setShowCancelConfirm(true)}>🚫 Cancel Order</button>
                            )}
                            <button type="button" className="flex-1 rounded-xl bg-rose-50 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100"
                                onClick={() => { setDeletePassword(""); setDeleteError(""); setShowDeleteModal(true); }}>🗑️ Delete Order</button>
                        </div>
                    </div>
                ) : (
                    // VIEW MODE
                    <div className="space-y-3">
                        {/* ── Payment summary ── */}
                        <div className="rounded-xl bg-white/80 p-3 shadow-sm ring-1 ring-white backdrop-blur-sm">
                            <div className="flex items-end justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 leading-none mb-1">Total</p>
                                    <p className="text-lg font-bold leading-none text-gray-900">Rs. {total.toLocaleString("en-IN")}</p>
                                </div>
                                <div className="min-w-0 text-right">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 leading-none mb-1">Paid</p>
                                    <p className="text-sm font-semibold leading-none text-gray-700">Rs. {paid.toLocaleString("en-IN")}</p>
                                </div>
                                {!isCancelled && (
                                    <div className="min-w-0 text-right">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 leading-none mb-1">Remaining</p>
                                        <p className={`text-sm font-bold leading-none ${remaining > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                            {remaining > 0 ? `Rs. ${remaining.toLocaleString("en-IN")}` : "Cleared ✓"}
                                        </p>
                                    </div>
                                )}
                            </div>
                            {!isCancelled && (
                                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                                    <div
                                        className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${remaining > 0 ? "from-amber-400 to-orange-500" : "from-emerald-400 to-green-500"}`}
                                        style={{ width: `${paidPct}%` }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* ── WhatsApp ── */}
                        <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-600 hover:to-green-700 active:scale-[0.99]"
                            onClick={() => window.open(`https://wa.me/${order.mobile.replace("+", "")}`, "_blank")}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                                <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1s-.5-.2-.7.1-.8 1-.9 1.2-.4.2-.7 0a8 8 0 01-2.4-1.5 9 9 0 01-1.6-2c-.2-.4 0-.5.1-.7l.5-.6.4-.6v-.6l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.8s1.2 3.3 1.4 3.5 2.4 3.6 5.7 5c3.3 1.3 3.3.9 3.9.8s1.7-.7 2-1.4.3-1.3.2-1.4zM12 2a10 10 0 00-8.6 15L2 22l5.1-1.3A10 10 0 1012 2z" />
                            </svg>
                            <span className="truncate">{order.mobile}</span>
                        </button>

                        {/* ── Address ── */}
                        <div className="flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2 ring-1 ring-white">
                            <span className="mt-0.5 text-gray-400">{IconPin}</span>
                            <p className="break-words text-sm leading-snug text-gray-600">{order.address}</p>
                        </div>

                        {/* ── Meta grid ── */}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                            <Meta icon={IconStore} label="Store" value={order.storeName} />
                            <Meta icon={IconTag} label="Commission" value={order.commission} />
                            <Meta icon={IconCalendar} label="Ordered" value={formatDate(order.orderedDate)} />
                            {order.deliveryStatus === true && order.deliveryDate && (
                                <Meta icon={IconCalendar} label="Delivered" value={formatDate(order.deliveryDate)} />
                            )}
                            {order.deliveredBy && <Meta icon={IconTruck} label="Delivered By" value={order.deliveredBy} />}
                        </div>

                        {order.notes && order.notes.trim() !== "" && (
                            <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50 px-3 py-2">
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-600">Notes</p>
                                <p className="whitespace-pre-wrap text-sm leading-snug text-amber-900">{order.notes}</p>
                            </div>
                        )}

                        <details className="group overflow-hidden rounded-xl bg-white/70 ring-1 ring-white">
                            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 transition hover:bg-white [&::-webkit-details-marker]:hidden">
                                <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                    <span className="text-gray-400">{IconBox}</span>
                                    Products
                                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-bold text-gray-600">{productCount}</span>
                                </span>
                                {IconChevron}
                            </summary>
                            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 p-3 sm:grid-cols-3 md:grid-cols-4">
                                {order.productUrls?.map((url: string, i: number) => {
                                    const qty = order.productItems?.[i]?.quantity ?? null;
                                    const isPageLink = isProductUrl(url);
                                    const pageUrl: string | null = order.productPageUrls?.[i]
                                        ? (isProductUrl(order.productPageUrls[i]) ? order.productPageUrls[i] : null)
                                        : (isPageLink ? url : null);
                                    return (
                                        <div key={i} className="flex flex-col gap-1.5">
                                            <a href={url} target="_blank" rel="noopener noreferrer" className="group/img block">
                                                <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200/70 transition group-hover/img:ring-blue-300">
                                                    {isPageLink ? (
                                                        <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-gray-400">
                                                            <span className="mb-1 text-xl">🔗</span>
                                                            <span className="line-clamp-3 break-all text-[10px] leading-tight">{url}</span>
                                                        </div>
                                                    ) : (
                                                        <img src={url} alt={`Product ${i + 1}`} loading="lazy" decoding="async"
                                                            className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-110" />
                                                    )}
                                                    {qty && (
                                                        <span className="absolute bottom-1 right-1 rounded-full bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">×{qty}</span>
                                                    )}
                                                </div>
                                            </a>
                                            {pageUrl && !isPageLink && (
                                                <a href={pageUrl} target="_blank" rel="noopener noreferrer"
                                                    className="flex items-center justify-center gap-1 truncate rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-600 ring-1 ring-blue-100 transition hover:bg-blue-100"
                                                    title={pageUrl}>
                                                    <span className="truncate">View Product</span>
                                                </a>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </details>

                        {/* ── AI Fetch Images Button ── */}
                        {hasProductPageUrls && (
                            <button
                                type="button"
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-violet-600 hover:to-purple-700 active:scale-[0.99] disabled:opacity-60"
                                onClick={handleAutoFetchImages}
                                disabled={isFetchingImages}
                            >
                                {isFetchingImages ? (
                                    <>
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                        Fetching Images…
                                    </>
                                ) : "🤖 Auto-Fetch Product Images"}
                            </button>
                        )}

                        {/* Progress Log — stays visible until refresh */}
                        {fetchProgress.length > 0 && (
                            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl bg-slate-900 p-3 font-mono text-xs text-emerald-400 ring-1 ring-slate-700">
                                {fetchProgress.map((msg, i) => (
                                    <p key={i}>{msg}</p>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2 pt-0.5">
                            <button
                                type="button"
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 active:scale-[0.99]"
                                onClick={() => setIsEditing(true)}
                            >
                                ✏️ Edit
                            </button>
                            <button
                                type="button"
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-50 active:scale-[0.99]"
                                onClick={handleCopy}
                            >
                                📋 Copy Address
                            </button>
                        </div>
                    </div>
                )}
                </div>
            </div>

            {/* ── Cancel Modal ── */}
            {showCancelConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-80 text-center space-y-4">
                        <div className="text-4xl">🚫</div>
                        <h3 className="text-xl font-bold text-gray-800">Cancel Order?</h3>
                        <p className="text-gray-600 text-sm">Are you sure you want to cancel the order for <span className="font-semibold">{order.name}</span>?</p>
                        <div className="flex gap-3">
                            <button type="button" className="flex-1 py-2 rounded-md bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300" onClick={() => setShowCancelConfirm(false)} disabled={isCancelling}>Go Back</button>
                            <button type="button" className="flex-1 py-2 rounded-md bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-60" onClick={handleCancelOrder} disabled={isCancelling}>
                                {isCancelling ? "Cancelling…" : "Yes, Cancel"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Modal ── */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-80 text-center space-y-4">
                        <div className="text-4xl">🗑️</div>
                        <h3 className="text-xl font-bold text-gray-800">Delete Order?</h3>
                        <p className="text-gray-600 text-sm">This will <span className="font-semibold text-red-600">permanently delete</span> the order for <span className="font-semibold">{order.name}</span>.</p>
                        <input type="password" inputMode="numeric" placeholder="Enter password" value={deletePassword} autoFocus
                            onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(""); }}
                            onKeyDown={(e) => e.key === "Enter" && handleDeleteConfirm()}
                            className="w-full px-4 py-2 border rounded-md text-center text-lg focus:ring-2 focus:ring-red-400 outline-none"
                        />
                        {deleteError && <p className="text-red-600 text-sm font-medium">{deleteError}</p>}
                        <div className="flex gap-3">
                            <button type="button" className="flex-1 py-2 rounded-md bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>Cancel</button>
                            <button type="button" className="flex-1 py-2 rounded-md bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60" onClick={handleDeleteConfirm} disabled={isDeleting}>
                                {isDeleting ? "Deleting…" : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}