"use client";

import React from "react";

const PriceCalculator: React.FC = () => {
  return (
    <section className="w-full px-6 py-4 flex justify-center">
      <div className="w-full max-w-3xl">

        {/* Heading */}
        <h2 className="mt-3 text-3xl lg:text-5xl font-bold leading-snug text-[#002f5c] w-full">
          Paste any <span className="text-[#f48b28]">Indian product</span>
          <br />
          link to get started
        </h2>

        {/* Description */}
        <p className="mt-4 text-[#0a2540] text-sm md:text-base leading-relaxed">
          Copy the URL from Amazon, Flipkart, Myntra, Ajio or any other Indian
          store. Add size, color and quantity. We’ll review and send you a
          final quote in NPR.
        </p>

        {/* Form Container */}
        <div className="mt-6 border border-gray-300 rounded-2xl p-4 shadow-sm bg-white">

          {/* Product URL */}
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product URL (from Indian website)
          </label>
          <input
            type="text"
            placeholder="https://www.amazon.in/…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />

          {/* Variant */}
          <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">
            Variant (size / color)
          </label>
          <input
            type="text"
            placeholder="Size M, Black"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />

          {/* Quantity */}
          <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">
            Quantity
          </label>
          <input
            type="number"
            defaultValue={1}
            min={1}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />

          {/* Mobile Number */}
          <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">
            Mobile Number (Nepal)
          </label>
          <input
            type="tel"
            defaultValue="+977"
            placeholder="+97798XXXXXXXX"
            pattern="\+977(97|98)[0-9]{8}"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />

          {/* Notes */}
          <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">
            Notes
          </label>
          <textarea
            rows={3}
            placeholder="Any special instructions? Preferred seller, gift wrap etc."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
          />

          {/* Submit Button */}
          <button className="w-full mt-4 bg-[#002f5c] text-white font-semibold rounded-full py-2 text-sm shadow hover:bg-[#003c75] transition">
            Submit Order Request
          </button>

          {/* Footer Info */}
          <p className="text-center text-gray-500 text-xs mt-2">
            We’ll send a quotation link to your email and dashboard within a few hours.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PriceCalculator;
