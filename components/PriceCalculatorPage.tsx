"use client";

import React, { useState } from "react";
import ReactCountryFlag from "react-country-flag";
import Cookies from "js-cookie";
import { useEffect } from "react";
import Quatation_Calc from "./Quatation_Calc";



const COOKIE_NAME = "admin_access";


export default function PriceCalculator() {
  const [price, setPrice] = useState("");
  const [weight, setWeight] = useState("");
  const [category, setCategory] = useState("");
  const [total, setTotal] = useState<number | null>(null);

  const [accessGranted, setAccessGranted] = useState(false);


  useEffect(() => {
    const cookie = Cookies.get(COOKIE_NAME);
    if (cookie === "5555") {
      setAccessGranted(true);
    }
  }, []);

  const handleCalculate = () => {
    if (!price || !weight || !category || category === "Choose Product Category") {
      alert("Please fill all fields.");
      return;
    }

    const itemPrice = Number(price);
    const weightValue = Number(weight);

    // 20% of item price
    const serviceFee = itemPrice * 0.20;

    // Weight = Rs. 60 per kg
    const weightCharge = weightValue * 60;

    // Fixed delivery charge
    const deliveryCharge = 90;

    // Final formula
    const finalAmount =
      itemPrice + serviceFee + weightCharge + deliveryCharge;

    setTotal(finalAmount);
  };

  return (
    <div className="w-full mx-auto px-4 py-8 md:flex justify-evenly gap-8">



      <div className="w-full mx-auto max-w-[500px] lg:max-w-[700px]">
        {/* Badge */}
        <div className="inline-block bg-blue-100 text-blue-700 px-5 py-1.5 rounded-full text-sm font-medium mb-4">
          Price Calculator
        </div>

        {/* Heading */}
        <h1 className="w-full text-[24px] md:text-[32px] lg:text-[40px] font-semibold leading-snug text-[#002B5B]">
          Know your final cost before you say <span className="text-orange-500">“yes”.</span>
        </h1>

        <p className="mt-4 text-[#002B5B] text-sm md:text-base leading-relaxed">
          Our calculator uses live FX rates, category-based customs rules and your delivery location to estimate your final price.
        </p>

        {accessGranted &&
          <Quatation_Calc />
        }
        {/* Result Box */}
        {total !== null && (
          <div className="mx-auto  max-w-[500px] mt-6 p-5 rounded-xl shadow-acertinity bg-white border border-gray-200">
            <h3 className="text-md text-[#002B5B] mb-3">Estimated Total Cost (Approx*)  <br /> (Including border handling + courier)</h3>

            {/* INR Section */}
            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg mb-3">
              <div className="flex items-center gap-2">
                <ReactCountryFlag countryCode="IN" svg style={{ width: "1.5em", height: "1.5em" }} />
                <span className="font-medium text-[#002B5B]">India (INR)</span>
              </div>
              <span className="text-lg font-bold text-[#003366]">₹{total}</span>
            </div>

            {/* Conversion Rate */}
            <div className="text-center text-sm text-gray-600 mb-3">
              1 INR = 1.60 NPR
            </div>

            {/* NPR Section */}
            <div className="flex items-center justify-between bg-orange-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <ReactCountryFlag countryCode="NP" svg style={{ width: "1.5em", height: "1.5em" }} />
                <span className="font-medium text-[#002B5B]">Nepal (NPR)</span>
              </div>
              <span className="text-lg font-bold text-orange-600">
                NPR {(total * 1.6).toFixed(2)}
              </span>
            </div>
          </div>
        )}

      </div>

      {/* Form Container */}
      <div className="mt-8 border border-gray-300 rounded-2xl p-5 space-y-4 max-w-[400px] mx-auto">

        {/* Price */}
        <div>
          <label className="block text-base font-medium text-[#002B5B]">Price of item (INR)</label>
          <input
            type="number"
            placeholder="Enter price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 outline-none text-[15px]"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-base font-medium text-[#002B5B]">Product Category</label>
          <select
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 outline-none text-[15px] text-gray-600"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>Choose Product Category</option>
            <option>Clothing & Accessories</option>
            <option>Health & Beauty</option>
            <option>Baby Care</option>
            <option>Home & Kitchen Items</option>
            <option>Electronics Item</option>
            <option>Moto Parts & Accessories</option>
            <option>Books & Stationery</option>
            <option>Pet Food & Accessories</option>
            <option>Sports & Gym Fitness</option>
            <option>Digital Bookings</option>
          </select>
        </div>

        {/* Weight */}
        <div>
          <label className="block text-base font-medium text-[#002B5B]">Weight in KGs</label>
          <input
            type="number"
            placeholder="Enter weight"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 outline-none text-[15px]"
          />
        </div>

        {/* Button */}
        <button
          onClick={handleCalculate}
          className="mx-auto block w-[260px] bg-[#003366] text-white py-2.5 rounded-full text-sm font-semibold cursor-pointer"
        >
          Calculate
        </button>


      </div>
    </div>
  );
}



