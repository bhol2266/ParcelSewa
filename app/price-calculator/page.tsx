"use client";

import React from "react";

export default function PriceCalculator() {
  return (
    <div className="w-full  mx-auto px-5 py-10">
      {/* Badge */}
      <div className="inline-block bg-blue-100 text-blue-700 px-6 py-2 rounded-full text-sm font-medium mb-6">
        Price Calculator
      </div>

      {/* Heading */}
      <h1 className="text-[38px] font-semibold leading-tight text-[#002B5B]">
        Know your <br /> final cost <br /> before you say <br />
        <span className="text-orange-500">“yes”.</span>
      </h1>

      <p className="mt-6 text-[#002B5B] text-lg leading-relaxed">
        Our calculator uses live FX rates, category-based customs rules and your
        delivery location to estimate your final price. No extra charges at the
        door.
      </p>

      {/* Form Container */}
      <div className="mt-10 border border-gray-300 rounded-3xl p-6 space-y-6">

        {/* Price */}
        <div>
          <label className="block text-lg font-medium text-[#002B5B]">
            Price of item(INR)
          </label>
          <input
            type="number"
            placeholder="Enter the price"
            className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-300 outline-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-lg font-medium text-[#002B5B]">
            Product categories
          </label>
          <select
            className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-300 outline-none text-gray-500"
          >
            <option>Choose the product categories</option>
            <option>Electronics</option>
            <option>Clothing</option>
            <option>Accessories</option>
            <option>Others</option>
          </select>
        </div>

        {/* Weight */}
        <div>
          <label className="block text-lg font-medium text-[#002B5B]">
            Weight in KGs
          </label>
          <input
            type="number"
            placeholder="Enter the weights"
            className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-300 outline-none"
          />
        </div>

        {/* Button */}
        <button
          className="mx-auto block w-[300px] bg-[#003366] text-white py-3 rounded-full text-md font-semibold"
        >
          Submit Order Request
        </button>
      </div>
    </div>
  );
}
