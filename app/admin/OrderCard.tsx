"use client";

import { useState, useEffect } from "react";
import { updateDoc, doc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";

interface OrderProps {
    order: any;
    refresh: () => void;
}

const DELETE_PASSWORD = "5555";

// Reusable labeled field wrapper for edit mode
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {label}
        </label>
        {children}
    </div>
);

export default function OrderCard({ order, refresh }: OrderProps) {
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

    const remaining = (order.totalAmount || 0) - (order.advancePayment || 0);

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
            <div className={`rounded-xl p-5 shadow-md border transition-all overflow-hidden ${cardStyle}`}>
                {/* Header */}
                <div className="flex justify-between items-center mb-3 gap-2 min-w-0">
                    <h2 className="font-semibold text-xl text-gray-800 truncate min-w-0">{order.name}</h2>
                    <span className={`px-3 py-1 text-sm rounded-full font-semibold shrink-0 ${badgeStyle}`}>
                        {badgeLabel}
                    </span>
                </div>

                {/* EDIT MODE */}
                {isEditing ? (
                    <div className="space-y-3">

                        <Field label="Customer Name">
                            <input
                                className="w-full border p-2 rounded-md"
                                value={editData.name || ""}
                                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                placeholder="Customer Name"
                            />
                        </Field>

                        <Field label="Mobile Number">
                            <input
                                className="w-full border p-2 rounded-md"
                                value={editData.mobile || ""}
                                onChange={(e) => setEditData({ ...editData, mobile: e.target.value })}
                                placeholder="Mobile Number"
                            />
                        </Field>

                        <Field label="Address">
                            <input
                                className="w-full border p-2 rounded-md"
                                value={editData.address || ""}
                                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                                placeholder="Address"
                            />
                        </Field>

                        <Field label="Store Name">
                            <input
                                className="w-full border p-2 rounded-md"
                                value={editData.storeName || ""}
                                onChange={(e) => setEditData({ ...editData, storeName: e.target.value })}
                                placeholder="Store Name"
                            />
                        </Field>

                        <Field label="Commission">
                            <select
                                className="w-full border p-2 rounded-md"
                                value={editData.commission || ""}
                                onChange={(e) => setEditData({ ...editData, commission: e.target.value })}
                            >
                                <option value="15%">15%</option>
                                <option value="20%">20%</option>
                                <option value="25%">25%</option>
                                <option value="30%">30%</option>
                                <option value="35%">35%</option>
                                <option value="40%">40%</option>
                            </select>
                        </Field>

                        <Field label="Total Amount (Rs.)">
                            <input
                                type="number"
                                className="w-full border p-2 rounded-md"
                                value={editData.totalAmount || ""}
                                onChange={(e) =>
                                    setEditData({ ...editData, totalAmount: Number(e.target.value) })
                                }
                                placeholder="Total Amount"
                            />
                        </Field>

                        <Field label="Advance Payment (Rs.)">
                            <input
                                type="number"
                                className="w-full border p-2 rounded-md"
                                value={editData.advancePayment || ""}
                                onChange={(e) =>
                                    setEditData({ ...editData, advancePayment: Number(e.target.value) })
                                }
                                placeholder="Advance Payment"
                            />
                        </Field>

                        <Field label="Ordered Date">
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
                        </Field>

                        <Field label="Delivered Date">
                            <input
                                type="date"
                                className="w-full border p-2 rounded-md"
                                value={
                                    editData.deliveryDate
                                        ? editData.deliveryDate.toDate().toISOString().split("T")[0]
                                        : ""
                                }
                                onChange={(e) =>
                                    setEditData({
                                        ...editData,
                                        deliveryDate: Timestamp.fromDate(new Date(e.target.value)),
                                    })
                                }
                            />
                        </Field>

                        {/* Delivery Status Toggle */}
                        <Field label="Delivery Status">
                            <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={editData.deliveryStatus === true}
                                        onChange={(e) =>
                                            setEditData({
                                                ...editData,
                                                deliveryStatus: e.target.checked,
                                                deliveredBy: e.target.checked ? (editData.deliveredBy || "Ankush") : editData.deliveredBy,
                                            })
                                        }
                                    />
                                    <div
                                        className={`w-12 h-6 rounded-full transition-colors ${
                                            editData.deliveryStatus === true ? "bg-green-500" : "bg-gray-300"
                                        }`}
                                    />
                                    <div
                                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                            editData.deliveryStatus === true ? "translate-x-7" : "translate-x-1"
                                        }`}
                                    />
                                </div>
                                <span className="ml-3 font-medium text-gray-700">
                                    {editData.deliveryStatus === true ? "Delivered" : "Pending"}
                                </span>
                            </label>
                        </Field>

                        {editData.deliveryStatus === true && (
                            <Field label="Delivered By">
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
                            </Field>
                        )}

                        {/* Product URLs */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Product URLs</p>
                                <button
                                    type="button"
                                    className="text-sm px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
                                    onClick={() =>
                                        setEditData({
                                            ...editData,
                                            productUrls: [...(editData.productUrls || []), ""],
                                        })
                                    }
                                >
                                    + Add URL
                                </button>
                            </div>
                            {editData.productUrls?.map((url: string, i: number) => (
                                <div key={i} className="flex gap-2">
                                    <input
                                        className="flex-1 border p-2 rounded-md"
                                        value={url}
                                        onChange={(e) => {
                                            const updated = [...editData.productUrls];
                                            updated[i] = e.target.value;
                                            setEditData({ ...editData, productUrls: updated });
                                        }}
                                        placeholder={`Product URL ${i + 1}`}
                                    />
                                    <button
                                        type="button"
                                        className="px-3 bg-red-500 text-white rounded-md hover:bg-red-600"
                                        onClick={() => {
                                            const updated = editData.productUrls.filter(
                                                (_: string, index: number) => index !== i
                                            );
                                            setEditData({ ...editData, productUrls: updated });
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
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

                        {/* Cancel & Delete in Edit Mode */}
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
                        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                            <p className="min-w-0 break-words"><b>Store:</b> {order.storeName}</p>
                            <p className="shrink-0"><b>Commission:</b> {order.commission}</p>
                        </div>

                        <button
                            className="w-full text-left bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 truncate"
                            onClick={() =>
                                window.open(`https://wa.me/${order.mobile.replace("+", "")}`, "_blank")
                            }
                        >
                            📞 WhatsApp: {order.mobile}
                        </button>

                        <p className="break-words"><b>Address:</b> {order.address}</p>
                        <p><b>Total Amount:</b> Rs. {order.totalAmount}</p>
                        <p><b>Advance Paid:</b> Rs. {order.advancePayment}</p>

                        {!isDelivered && !isCancelled && (
                            <p className="text-red-700 font-semibold text-lg">
                                <b>Remaining Payment:</b> Rs. {remaining}
                            </p>
                        )}

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

                        {/* Action Buttons Row 1 */}
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