"use client";

import { useState, useEffect } from "react";
import { updateDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";

interface OrderProps {
    order: any;
    refresh: () => void;
}

export default function OrderCard({ order, refresh }: OrderProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(order);

    useEffect(() => {
        setEditData(order);

    }, [order])



    const isDelivered = order.deliveryStatus

    const remaining = (order.totalAmount || 0) - (order.advancePayment || 0);

    const formatDate = (ts: any) => {
        const date = ts.toDate();
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    };

    const formatTime = (ts: any) => {
        const date = ts.toDate();
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        });
    };

    const handleCopy = () => {
        const text = `${order.name}\nMobile: ${order.mobile.replace("+977", "")}\n ${order.address}`;
        navigator.clipboard.writeText(text);
    };



    return (
        <div
            className={`rounded-xl p-5 shadow-md border transition-all 
      ${isDelivered ? "border-red-400 bg-red-50" : "border-green-400 bg-green-50"}
    `}
        >
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold text-xl text-gray-800">{order.name}</h2>

                <span
                    className={`px-3 py-1 text-sm rounded-full font-semibold 
          ${isDelivered ? "bg-red-500 text-white" : "bg-green-500 text-white"}`}
                >
                    {isDelivered ? "Delivered" : "Pending"}
                </span>
            </div>

            {/* EDIT MODE */}
            {isEditing ? (
                <div className="space-y-3">

                    {/* Name */}
                    <input
                        className="w-full border p-2 rounded-md"
                        value={editData.name || ""}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        placeholder="Customer Name"
                    />

                    {/* Mobile */}
                    <input
                        className="w-full border p-2 rounded-md"
                        value={editData.mobile || ""}
                        onChange={(e) => setEditData({ ...editData, mobile: e.target.value })}
                        placeholder="Mobile Number"
                    />

                    {/* Address */}
                    <input
                        className="w-full border p-2 rounded-md"
                        value={editData.address || ""}
                        onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                        placeholder="Address"
                    />

                    {/* Store Name */}
                    <input
                        className="w-full border p-2 rounded-md"
                        value={editData.storeName || ""}
                        onChange={(e) => setEditData({ ...editData, storeName: e.target.value })}
                        placeholder="Store Name"
                    />

                    {/* Commission */}
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

                    {/* Total Amount */}
                    <input
                        type="number"
                        className="w-full border p-2 rounded-md"
                        value={editData.totalAmount || ""}
                        onChange={(e) =>
                            setEditData({ ...editData, totalAmount: Number(e.target.value) })
                        }
                        placeholder="Total Amount"
                    />

                    {/* Advance Payment */}
                    <input
                        type="number"
                        className="w-full border p-2 rounded-md"
                        value={editData.advancePayment || ""}
                        onChange={(e) =>
                            setEditData({ ...editData, advancePayment: Number(e.target.value) })
                        }
                        placeholder="Advance Payment"
                    />

                    {/* Ordered Date */}
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

                    {/* Delivery Status Toggle */}
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={editData.deliveryStatus || false}
                            onChange={(e) =>
                                setEditData({
                                    ...editData,
                                    deliveryStatus: e.target.checked,
                                })
                            }
                            className="sr-only"
                        />

                        <div
                            className={`w-14 h-8 rounded-full transition-colors ${editData.deliveryStatus ? "bg-green-500" : "bg-gray-300"
                                }`}
                        >
                            <div
                                className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform mt-1 ${editData.deliveryStatus ? "translate-x-6" : "translate-x-1"
                                    }`}
                            />
                        </div>

                        <span className="ml-3 font-medium">Delivered</span>
                    </label>

                    {/* Delivered By */}
                    {editData.deliveryStatus && (
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

                    {/* Save / Cancel */}
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

                                await updateDoc(
                                    doc(db, "Confirm Orders", order.id),
                                    dataToSave
                                );
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
                </div>
            ) : (
                // VIEW MODE
                <div className="space-y-2 text-gray-700">
                    <div className="flex justify-between">
                        <p><b>Store:</b> {order.storeName}</p>
                        <p><b>Commission:</b> {order.commission}</p>
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

                    <p><b>Total Amount:</b> Rs. {order.totalAmount}</p>


                    <p><b>Advance Paid:</b> Rs. {order.advancePayment}</p>

                    {!isDelivered && (
                        <p className="text-red-700 font-semibold text-lg">
                            <b>Remaining Payment:</b> Rs. {remaining}
                        </p>
                    )}
                    <p><b>Ordered Date:</b> {formatDate(order.orderedDate)}</p>
                    {order.deliveryStatus &&
                        <p><b>Delivered Date:</b> {formatDate(order.deliveryDate)}</p>
                    }
                    {/* <p><b>Time:</b> {formatTime(order.orderedDate)}</p> */}

                    <details className="bg-white rounded-md p-3 border cursor-pointer">
                        <summary className="font-semibold text-blue-600">View Products</summary>
                        <div className="mt-2 space-y-1">
                            {order.productUrls?.map((url: string, i: number) => (
                                <a
                                    key={i}
                                    href={url}
                                    target="_blank"
                                    className="block text-sm underline text-blue-500"
                                >
                                    Product {i + 1}
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
    );
}
