"use client";

import React from "react";
import Image from "next/image";

const PricingWorkflow = () => {
    return (

        <div className="py-12">
            {/* Badge */}
            <div className="inline-block bg-blue-100 text-blue-600 px-5 py-2 rounded-full text-sm font-medium">
                Transparent Pricing
            </div>
            <section className="w-full  mx-auto   flex flex-col lg:flex-row    justify-evenly gap-8">




                <div className=" lg:max-w-3xl">



                    {/* Heading */}
                    <h2 className="text-3xl lg:text-4xl font-bold text-[#0C2F4A] mt-6 leading-tight">
                        Know your final <br /> cost before you say <span className="text-orange-500">“yes”</span>.
                    </h2>

                    {/* Description */}
                    <p className="text-[#1c3e57]/80 mt-6 text-md lg:text-lg leading-relaxed">
                        Our calculator uses live FX rates, category-based customs rules and your delivery
                        location to estimate your final price. No extra charges at the door.
                    </p>

                    {/* Bullet points */}
                    <ul className="mt-6 space-y-2 lg:space-y-4 text-[#0c2f4a] text-md lg:text-lg">
                        <li className="flex items-start gap-2">
                            <span className="text-orange-500 text-xl">✓</span>
                            Live INR → NPR conversion
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-orange-500 text-xl">✓</span>
                            Weight & category-based shipping rules
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-orange-500 text-xl">✓</span>
                            Service fee clearly separated
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-orange-500 text-xl">✓</span>
                            Estimate before you even create an order
                        </li>
                    </ul>
                </div>

                {/* Quote box mockup */}
                <div className="lg:min-w-[500px] max-w-[600px]  2xl:max-w-[550px]  w-full   shadow-acertinity rounded-3xl p-3 lg:p-6  mx-auto">

                    <div className="mb-4 flex justify-between items-center">

                        <div>

                            <p className="text-gray-600 font-medium ">Instant quote preview</p>
                            <span className="text-secondary text-xs">Flipkart . Myntra . Amazon . Ajio</span>
                        </div>

                        <span className="text-secondary text-sm">Live Rates</span>


                    </div>

                    <div className="rounded-2xl border border-gray-200 border-dashed p-5 text-sm">
                        <div className="flex justify-between py-1">
                            <span>Product price (Indian Rupee)</span>
                            <span className="font-bold">₹2,499</span>
                        </div>
                        <div className="flex justify-between py-1">
                            <span>Product price (Nepali Rupee)</span>
                            <span className="font-bold">NPR 4,000</span>
                        </div>

                        <div className="flex justify-between py-1">
                            <span>Border & customs</span>
                            <span className="font-bold">NPR 400</span>
                        </div>
                        <div className="flex justify-between py-1">
                            <span>Nepali Courier Charge</span>
                            <span className="font-bold">NPR 250</span>
                        </div>
                        <div className="flex justify-between py-1">
                            <span>Service & handling</span>
                            <span className="font-bold">NPR 200</span>
                        </div>

                        <div className="flex justify-between items-center border-t pt-3 mt-3 font-semibold text-[#0C2F4A]">
                            <span>Total (approx. NPR)</span>
                            <span className="text-xl font-bold">NPR 4,850</span>
                        </div>

                        <button className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl font-medium">
                            Try Cost Calculator
                        </button>
                    </div>
                    <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
                        <span>
                            <span className="font-bold text-black">2,300+</span> active shoppers
                        </span>
                        <span>Secured by esewa wallet</span>
                    </div>
                </div>

            </section>
        </div>

    );
};

export default PricingWorkflow;
