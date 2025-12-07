"use client";

import React, { useState } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import toast, { Toaster } from "react-hot-toast";
import Head from "next/head";







const OrderRequestComponent: React.FC = () => {
  const [productUrl, setProductUrl] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [mobile, setMobile] = useState("+977");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!productUrl.trim()) {
      toast.error("Product URL is required.");
      return;
    }

    if (!deliveryLocation.trim()) {
      toast.error("Delivery Location is required.");
      return;
    }

    if (!quantity || quantity < 1) {
      toast.error("Quantity must be at least 1.");
      return;
    }



    if (mobile.trim().length < 14) {
      toast.error("Mobile number is required.");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "Order Request"), {
        productUrl,
        quantity,
        mobile,
        deliveryLocation,
        notes, // optional
        selectedDate: Timestamp.now(),
        createdAt: Timestamp.now(),
      });

      toast.success("Order Request Submitted Successfully!");

      // Reset fields
      setProductUrl("");
      setQuantity(1);
      setMobile("+977");
      setDeliveryLocation("");
      setNotes("");
    } catch (error) {
      console.log("Error submitting request:", error);
      toast.error("Something went wrong! Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full px-6 py-4 flex justify-center">
    


      <Toaster position="top-center" />

      <div className="w-full justify-evenly lg:flex">
        <div className="max-w-[600px] 2xl:max-w-[800px] ">
          <h2 className="mt-3 text-3xl lg:text-5xl font-bold leading-snug text-[#002f5c] w-full">
            Paste any <span className="text-[#f48b28]">Indian product</span>
            <br />
            link to get started
          </h2>

          <p className="mt-4 text-[#0a2540] text-sm md:text-base leading-relaxed">
            Copy the URL from Amazon, Flipkart, Myntra, Ajio or any other
            Indian store. Add quantity and delivery location. We’ll review and send you a final
            quote in NPR.
          </p>
        </div>

        {/* FORM */}
        <div className="mt-6 border border-gray-300 rounded-2xl p-4 shadow-sm">

          {/* Product URL */}
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product URL (from Indian website) *
          </label>
          <input
            type="text"
            placeholder="https://www.amazon.in/…"
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />

          {/* Delivery Location */}
          <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">
            Delivery Location *
          </label>
          <input
            type="text"
            placeholder="Kathmandu"
            value={deliveryLocation}
            onChange={(e) => setDeliveryLocation(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />

          {/* Quantity */}
          <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">
            Quantity *
          </label>
          <input
            type="number"
            value={quantity}
            min={1}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />

          {/* Mobile */}
          <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">
            Mobile Number (WhatsApp) *
          </label>
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="+97798XXXXXXXX"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />

          {/* Notes (Optional) */}
          <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">
            Notes (Optional)
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special instructions? Preferred seller, gift wrap etc."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
          />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full mt-4 bg-[#002f5c] text-white font-semibold rounded-full py-2 text-sm shadow hover:bg-[#003c75] transition flex items-center justify-center"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Submit Order Request"
            )}
          </button>

          <p className="text-center text-gray-500 text-xs mt-2">
            We’ll send a quotation link to your email and dashboard within a few hours.
          </p>
        </div>
      </div>
    </section>
  );
};

export default OrderRequestComponent;
