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

  // Remaining Amount
  const remaining = (order.totalAmount || 0) - (order.advancePayment || 0);

  // Format date to "24 March 2025"
  const formatDate = (ts: any) => {
    const date = ts.toDate();
    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "long",
      year: "numeric",
    };
    return date.toLocaleDateString("en-GB", options); // 24 March 2025
  };

  // Format time
  const formatTime = (ts: any) => {
    const date = ts.toDate();
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Copy Address Handler
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
      {/* Header: Name + Status */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold text-xl text-gray-800">{order.name}</h2>

        <span
          className={`px-3 py-1 text-sm rounded-full font-semibold 
            ${isDelivered ? "bg-red-500 text-white" : "bg-green-500 text-white"}
          `}
        >
          {order.deliveryStatus}
        </span>
      </div>

      {/* Editing Mode */}
      {isEditing ? (
        <div className="space-y-3">

          <input
            className="w-full border p-2 rounded-md"
            defaultValue={order.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
          />

          <input
            className="w-full border p-2 rounded-md"
            defaultValue={order.mobile}
            onChange={(e) => setEditData({ ...editData, mobile: e.target.value })}
          />

          <input
            className="w-full border p-2 rounded-md"
            defaultValue={order.address}
            onChange={(e) => setEditData({ ...editData, address: e.target.value })}
          />

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

          <textarea
            className="w-full border p-2 rounded-md"
            defaultValue={order.notes}
            rows={2}
            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
          />

          {/* SAVE + CANCEL */}
          <div className="flex gap-3 pt-2">
            <button
              className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
              onClick={async () => {
                await updateDoc(doc(db, "orders", order.id), editData);
                setIsEditing(false);
                refresh();
              }}
            >
              Save
            </button>

            <button
              className="flex-1 bg-gray-300 py-2 rounded-md hover:bg-gray-400 transition"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // VIEW Mode
        <div className="space-y-2 text-gray-700">

          <div className="flex justify-between">
            <p><b>Store:</b> {order.storeName}</p>
            <p><b>Commission:</b> {order.commission}</p>
          </div>

          <button
            className="w-full text-left bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition"
            onClick={() =>
              window.open(`https://wa.me/${order.mobile.replace("+", "")}`, "_blank")
            }
          >
            📞 WhatsApp: {order.mobile}
          </button>

          <p><b>Address:</b> {order.address}</p>

          <p>
            <b>Total Amount:</b>{" "}
            <span className="text-black font-semibold">Rs. {order.totalAmount}</span>
          </p>

          <p><b>Advance Paid:</b> Rs. {order.advancePayment}</p>

          <p className="text-blue-700 font-semibold">
            <b>Remaining Payment:</b> Rs. {remaining}
          </p>

          <p><b>Ordered Date:</b> {formatDate(order.orderedDate)}</p>
          <p><b>Time:</b> {formatTime(order.orderedDate)}</p>

          {/* PRODUCT LINK SECTION */}
          <details className="bg-white rounded-md p-3 border cursor-pointer">
            <summary className="font-semibold text-blue-600 select-none">
              View Products
            </summary>

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

          {/* ACTION BUTTONS */}
          <div className="flex gap-3 mt-3">
            <button
              className="flex-1 py-2 rounded-md bg-black text-white font-semibold hover:bg-gray-800 transition"
              onClick={() => setIsEditing(true)}
            >
              ✏️ Edit Order
            </button>

            <button
              className="flex-1 py-2 rounded-md bg-yellow-500 text-white font-semibold hover:bg-yellow-600 transition"
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
