"use client";

import { useState, useEffect } from "react";
import { updateDoc, doc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";

interface OrderProps {
    order: any;
    refresh: () => void;
}

const DELETE_PASSWORD = "5555";

export default function OrderCardAnkush({ order, refresh }: OrderProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(order);

    // Delete modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteError, setDeleteError] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    // Cancel confirmation state
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    useEffect(() => {
        setEditData(order);
    }, [order]);

    const isCancelled = order.deliveryStatus === "cancelled";
    const isDelivered = order.deliveryStatus === true;

    const formatDate = (ts: any) => {
        const date = ts.toDate();
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    };

    const handleCopy = () => {
        const text = `${order.name}\nMobile: ${order.mobile.replace("+977", "")}\n ${order.address}`;
        navigator.clipboard.writeText(text);
    };

    // ── Cancel ──────────────────────────────────────────────
    const handleCancelOrder = async () => {
        setIsCancelling(true);
        try {
            await updateDoc(doc(db, "Confirm Orders", order.id), {
                deliveryStatus: "cancelled",
            });
            setShowCancelConfirm(false);
            refresh();
        } catch (err) {
            console.error("Cancel failed:", err);
        } finally {
            setIsCancelling(false);
        }
    };

    // ── Delete ───────────────────────────────────────────────
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
            refresh();
        } catch (err) {
            console.error("Delete failed:", err);
            setDeleteError("Something went wrong. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    // ── Card border/bg based on status ──────────────────────
    const cardStyle = isCancelled
        ? "border-gray-400 bg-gray-100"
        : isDelivered
        ? "border-red-400 bg-red-50"
        : "border-green-400 bg-green-50";

    const badgeStyle = isCancelled
        ? "bg-gray-500 text-white"
        : isDelivered
        ? "bg-red-500 text-white"
        : "bg-green-500 text-white";

    const badgeLabel = isCancelled ? "Cancelled" : isDelivered ? "Delivered" : "Pending";

    return (
        <>
            <div className={`rounded-xl p-5 shadow-md border transition-all ${cardStyle}`}>
                {/* Header */}
                <div className="flex justify-between items-center mb-3">
                    <h2 className="font-semibold text-xl text-gray-800">{order.name}</h2>
                    <span className={`px-3 py-1 text-sm rounded-full font-semibold ${badgeStyle}`}>
                        {badgeLabel}
                    </span>
                </div>

                {/* EDIT MODE */}
                {isEditing ? (
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Customer Name</p>
                            <input
                                className="w-full border p-2 rounded-md"
                                value={editData.name || ""}
                                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                placeholder="Customer Name"
                            />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Mobile Number</p>
                            <input
                                className="w-full border p-2 rounded-md"
                                value={editData.mobile || ""}
                                onChange={(e) => setEditData({ ...editData, mobile: e.target.value })}
                                placeholder="Mobile Number"
                            />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Address</p>
                            <input
                                className="w-full border p-2 rounded-md"
                                value={editData.address || ""}
                                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                                placeholder="Address"
                            />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Store Name</p>
                            <input
                                className="w-full border p-2 rounded-md"
                                value={editData.storeName || ""}
                                onChange={(e) => setEditData({ ...editData, storeName: e.target.value })}
                                placeholder="Store Name"
                            />
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Ordered Date</p>
                            <input
                                type="date"
                                className="w-full border p-2 rounded-md"
                                value={
                                    editData.orderedDate
                                        ? editData.orderedDate.toDate().toISOString().split("T")[0]
                                        : ""
                                }
                                onChange={(e) =>
                                    setEditData({
                                        ...editData,
                                        orderedDate: Timestamp.fromDate(new Date(e.target.value)),
                                    })
                                }
                            />
                        </div>

                        {/* Delivery Status Toggle */}
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={editData.deliveryStatus === true}
                                onChange={(e) =>
                                    setEditData({
                                        ...editData,
                                        deliveryStatus: e.target.checked,
                                        deliveredBy: e.target.checked
                                            ? (editData.deliveredBy || "Ankush")
                                            : editData.deliveredBy,
                                    })
                                }
                                className="sr-only"
                            />
                            <div
                                className={`w-14 h-8 rounded-full transition-colors ${
                                    editData.deliveryStatus === true ? "bg-green-500" : "bg-gray-300"
                                }`}
                            >
                                <div
                                    className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform mt-1 ${
                                        editData.deliveryStatus === true ? "translate-x-6" : "translate-x-1"
                                    }`}
                                />
                            </div>
                            <span className="ml-3 font-medium">Delivered</span>
                        </label>

                        {editData.deliveryStatus === true && (
                            <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">Delivered By</p>
                                <select
                                    className="w-full border p-2 rounded-md"
                                    value={editData.deliveredBy || ""}
                                    onChange={(e) =>
                                        setEditData({ ...editData, deliveredBy: e.target.value })
                                    }
                                >
                                    <option value="">Select Delivery Person</option>
                                    <option value="Ankush">Ankush</option>
                                    <option value="Bhola">Bhola</option>
                                </select>
                            </div>
                        )}

                        {/* Product URLs */}
                        <div className="space-y-2">
                            <p className="font-semibold">Product URLs</p>
                            {editData.productUrls?.map((url: string, i: number) => (
                                <input
                                    key={i}
                                    className="w-full border p-2 rounded-md"
                                    value={url}
                                    onChange={(e) => {
                                        const updated = [...editData.productUrls];
                                        updated[i] = e.target.value;
                                        setEditData({ ...editData, productUrls: updated });
                                    }}
                                    placeholder={`Product ${i + 1}`}
                                />
                            ))}
                        </div>

                        {/* Save / Cancel Edit */}
                        <div className="flex gap-3 pt-2">
                            <button
                                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                                onClick={async () => {
                                    const dataToSave = {
                                        ...editData,
                                        deliveredBy: editData.deliveryStatus ? editData.deliveredBy || "" : "",
                                    };
                                    if (editData.deliveryStatus && !editData.deliveryDate) {
                                        dataToSave.deliveryDate = Timestamp.now();
                                    }
                                    await updateDoc(doc(db, "Confirm Orders", order.id), dataToSave);
                                    setIsEditing(false);
                                    refresh();
                                }}
                            >
                                Save
                            </button>
                            <button
                                className="flex-1 bg-gray-300 py-2 rounded-md hover:bg-gray-400"
                                onClick={() => {
                                    setEditData(order);
                                    setIsEditing(false);
                                }}
                            >
                                Cancel
                            </button>
                        </div>

                        {/* Reverse Cancellation — only if order is cancelled */}
                        {isCancelled && (
                            <button
                                className="w-full py-2 rounded-md bg-blue-500 text-white font-semibold hover:bg-blue-600"
                                onClick={async () => {
                                    await updateDoc(doc(db, "Confirm Orders", order.id), {
                                        deliveryStatus: false,
                                    });
                                    setIsEditing(false);
                                    refresh();
                                }}
                            >
                                ↩️ Reverse Cancellation
                            </button>
                        )}

                        {/* Cancel & Delete in Edit Mode only */}
                        <div className="flex gap-3 pt-1">
                            {!isCancelled && (
                                <button
                                    className="flex-1 py-2 rounded-md bg-orange-500 text-white font-semibold hover:bg-orange-600"
                                    onClick={() => setShowCancelConfirm(true)}
                                >
                                    🚫 Cancel Order
                                </button>
                            )}
                            <button
                                className="flex-1 py-2 rounded-md bg-red-600 text-white font-semibold hover:bg-red-700"
                                onClick={() => {
                                    setDeletePassword("");
                                    setDeleteError("");
                                    setShowDeleteModal(true);
                                }}
                            >
                                🗑️ Delete Order
                            </button>
                        </div>
                    </div>
                ) : (
                    // VIEW MODE
                    <div className="space-y-2 text-gray-700">
                        <div className="flex justify-between">
                            <p><b>Store:</b> {order.storeName}</p>
                        </div>

                        <button
                            className="w-full text-left bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700"
                            onClick={() =>
                                window.open(`https://wa.me/${order.mobile.replace("+", "")}`, "_blank")
                            }
                        >
                            📞 WhatsApp: {order.mobile}
                        </button>

                        <p><b>Address:</b> {order.address}</p>


                        {/* Price without commission */}
                        {!isCancelled && (() => {
                            const commission = order.commission || "";
                            const total = order.totalAmount || 0;
                            let priceWithoutCommission: number | null = null;

                            if (commission === "Flat NPR 700") {
                                priceWithoutCommission = total - 700;
                                return (
                                    <>
                                        <p className="text-blue-700 font-semibold">
                                            <b>Price (w/o Commission):</b> Rs. {Math.round(priceWithoutCommission).toLocaleString("en-IN")}
                                        </p>
                                        <p className="text-green-700 font-semibold">
                                            <b>Commission (5%):</b> Rs. {(100).toLocaleString("en-IN")}
                                        </p>
                                    </>
                                );
                            } else if (commission === "Flat NPR 600") {
                                priceWithoutCommission = total - 600;
                                return (
                                    <>
                                        <p className="text-blue-700 font-semibold">
                                            <b>Price (w/o Commission):</b> Rs. {Math.round(priceWithoutCommission).toLocaleString("en-IN")}
                                        </p>
                                        <p className="text-green-700 font-semibold">
                                            <b>Commission (5%):</b> Rs. {(70).toLocaleString("en-IN")}
                                        </p>
                                    </>
                                );
                            } else {
                                const rate = parseFloat(commission.replace("%", "").trim());
                                if (!isNaN(rate) && rate > 0) {
                                    priceWithoutCommission = total / (1 + rate / 100);
                                }
                            }

                            if (priceWithoutCommission === null) return null;

                            return (
                                <>
                                    <p className="text-blue-700 font-semibold">
                                        <b>Price (w/o Commission):</b> Rs. {Math.round(priceWithoutCommission).toLocaleString("en-IN")}
                                    </p>
                                    <p className="text-green-700 font-semibold">
                                        <b>Commission (5%):</b> Rs. {Math.round(priceWithoutCommission * 0.05).toLocaleString("en-IN")}
                                    </p>
                                </>
                            );
                        })()}

                        <p><b>Ordered Date:</b> {formatDate(order.orderedDate)}</p>
                        {order.deliveryStatus === true && order.deliveryDate && (
                            <p><b>Delivered Date:</b> {formatDate(order.deliveryDate)}</p>
                        )}
                        <p><b>Delivered By:</b> {order.deliveredBy}</p>

                        <details className="bg-white rounded-md p-3 border cursor-pointer">
                            <summary className="font-semibold text-blue-600">View Products</summary>
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {order.productUrls?.map((url: string, i: number) => (
                                    <a
                                        key={i}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group block"
                                    >
                                        <div className="relative w-full aspect-square overflow-hidden rounded-md border bg-gray-100">
                                            <img
                                                src={url}
                                                alt={`Product ${i + 1}`}
                                                loading="lazy"
                                                decoding="async"
                                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                            />
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </details>

                        <div className="flex gap-3 mt-3">
                            <button
                                className="flex-1 py-2 rounded-md bg-black text-white font-semibold hover:bg-gray-800"
                                onClick={() => setIsEditing(true)}
                            >
                                ✏️ Edit Order
                            </button>
                            <button
                                className="flex-1 py-2 rounded-md bg-yellow-500 text-white font-semibold hover:bg-yellow-600"
                                onClick={handleCopy}
                            >
                                📋 Copy Address
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Cancel Confirmation Modal ────────────────────────── */}
            {showCancelConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-80 text-center space-y-4">
                        <div className="text-4xl">🚫</div>
                        <h3 className="text-xl font-bold text-gray-800">Cancel Order?</h3>
                        <p className="text-gray-600 text-sm">
                            Are you sure you want to cancel the order for{" "}
                            <span className="font-semibold">{order.name}</span>? This will mark it as cancelled.
                        </p>
                        <div className="flex gap-3">
                            <button
                                className="flex-1 py-2 rounded-md bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300"
                                onClick={() => setShowCancelConfirm(false)}
                                disabled={isCancelling}
                            >
                                Go Back
                            </button>
                            <button
                                className="flex-1 py-2 rounded-md bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-60"
                                onClick={handleCancelOrder}
                                disabled={isCancelling}
                            >
                                {isCancelling ? "Cancelling…" : "Yes, Cancel"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Modal (password protected) ───── */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-80 text-center space-y-4">
                        <div className="text-4xl">🗑️</div>
                        <h3 className="text-xl font-bold text-gray-800">Delete Order?</h3>
                        <p className="text-gray-600 text-sm">
                            This will <span className="font-semibold text-red-600">permanently delete</span> the
                            order for <span className="font-semibold">{order.name}</span>. Enter the admin
                            password to confirm.
                        </p>
                        <input
                            type="password"
                            inputMode="numeric"
                            placeholder="Enter password"
                            value={deletePassword}
                            autoFocus
                            onChange={(e) => {
                                setDeletePassword(e.target.value);
                                setDeleteError("");
                            }}
                            onKeyDown={(e) => e.key === "Enter" && handleDeleteConfirm()}
                            className="w-full px-4 py-2 border rounded-md text-center text-lg focus:ring-2 focus:ring-red-400 outline-none"
                        />
                        {deleteError && (
                            <p className="text-red-600 text-sm font-medium">{deleteError}</p>
                        )}
                        <div className="flex gap-3">
                            <button
                                className="flex-1 py-2 rounded-md bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300"
                                onClick={() => setShowDeleteModal(false)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                className="flex-1 py-2 rounded-md bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Deleting…" : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}