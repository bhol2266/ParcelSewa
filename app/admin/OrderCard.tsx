"use client";

import { useState } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";

interface OrderProps {
  order: any;
  refresh: () => void;
}

export default function OrderCard({ order, refresh }: OrderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(order);

  const isDelivered = order.deliveryStatus?.toLowerCase() === "delivered";

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
    const text = `${order.name}\nMobile: ${order.mobile.replace("+977","")}\n ${order.address}`;
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
          {order.deliveryStatus}
        </span>
      </div>

      {/* EDIT MODE */}
      {isEditing ? (
        <div className="space-y-3">
          {/* Name */}
          <input
            className="w-full border p-2 rounded-md"
            defaultValue={order.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
          />

          {/* Mobile */}
          <input
            className="w-full border p-2 rounded-md"
            defaultValue={order.mobile}
            onChange={(e) => setEditData({ ...editData, mobile: e.target.value })}
          />

          {/* Address */}
          <input
            className="w-full border p-2 rounded-md"
            defaultValue={order.address}
            onChange={(e) => setEditData({ ...editData, address: e.target.value })}
          />

          {/* Store Name */}
          <input
            className="w-full border p-2 rounded-md"
            defaultValue={order.storeName}
            onChange={(e) => setEditData({ ...editData, storeName: e.target.value })}
          />

          {/* Commission */}
          <select
            className="w-full border p-2 rounded-md"
            defaultValue={order.commission}
            onChange={(e) =>
              setEditData({ ...editData, commission: e.target.value })
            }
          >
            <option>15%</option>
            <option>20%</option>
            <option>25%</option>
            <option>30%</option>
            <option>35%</option>
            <option>40%</option>
          </select>

          {/* Delivery Status */}
          <select
            className="w-full border p-2 rounded-md"
            defaultValue={order.deliveryStatus}
            onChange={(e) =>
              setEditData({ ...editData, deliveryStatus: e.target.value })
            }
          >
            <option>Yet to reach border</option>
            <option>At border</option>
            <option>In Transit</option>
            <option>Delivered</option>
          </select>

          {/* Notes */}
          <textarea
            className="w-full border p-2 rounded-md"
            defaultValue={order.notes}
            rows={2}
            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
          />

          {/* Save / Cancel */}
          <div className="flex gap-3 pt-2">
            <button
              className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
              onClick={async () => {
                await updateDoc(doc(db, "Confirm Orders", order.id), editData);
                setIsEditing(false);
                refresh();
              }}
            >
              Save
            </button>

            <button
              className="flex-1 bg-gray-300 py-2 rounded-md hover:bg-gray-400"
              onClick={() => setIsEditing(false)}
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

          <p className="text-blue-700 font-semibold">
            <b>Remaining Payment:</b> Rs. {remaining}
          </p>

          <p><b>Ordered Date:</b> {formatDate(order.orderedDate)}</p>
          <p><b>Time:</b> {formatTime(order.orderedDate)}</p>

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
