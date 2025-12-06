"use client";

import React from "react";
import { motion } from "framer-motion";
import { div } from "motion/react-client";

export default function Workflow() {
  const steps = [
    {
      title: "1. Paste your product link",
      desc: "From Amazon, Flipkart, Myntra or any reliable Indian store. Add size, color and quantity details if needed.",
    },
    {
      title: "2. Get an all-inclusive quote",
      desc: "We calculate item cost, shipping, duties and our fee into a single NPR amount. You see it before paying.",
    },
    {
      title: "3. We purchase & ship",
      desc: "ParcelFlow buys on your behalf, receives it at our hub, handles customs and forwards it to Nepal.",
    },
    {
      title: "4. Track until it arrives",
      desc: "One tracking link shows every checkpoint—ordered, on the way to hub, customs, out for delivery, delivered.",
    },
  ];

  // Variants for staggering
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.3,
      },
    },
  };

  const stepVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div id="workflow" className="bg-[#F7F7F7]">

      <section className="lg:hidden py-12 max-w-2xl mx-auto lg:px-6   px-4 ">
        {/* Tag */}
        <div className="inline-block bg-blue-100 text-blue-600 px-6 py-2 rounded-full mb-6">
          How ParcelSewa Works
        </div>

        {/* Heading */}
        <h2 className="text-3xl md:text-4xl font-bold text-themeBlue leading-snug">
          From product link to <br /> delivery in four steps.
        </h2>

        {/* Subheading */}
        <p className="text-secondary mt-4 text-lg leading-relaxed">
          Instead of figuring out customs and shipping yourself, you interact with
          just three simple screens: Create Order, Order Summary and Payment.
        </p>

        {/* Steps */}
        <motion.div
          className="mt-10 border-l-2 border-blue-300 pl-10 space-y-10"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {steps.map((step, index) => (
            <motion.div key={index} className="relative" variants={stepVariants}>
              {/* Bullet */}
              <span className="absolute -left-4 top-1.5 w-3 h-3 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 border-2 border-white shadow"></span>

              {/* Text */}
              <h3 className="font-semibold text-themeBlue text-lg ml-3">
                {step.title}
              </h3>
              <p className="text-secondary mt-1 leading-relaxed text-sm ml-3">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

    </div>

  );
}
