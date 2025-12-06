"use client";

import React from "react";
import { FaWhatsapp } from "react-icons/fa";


const BottomSection: React.FC = () => {
    return (
        <section className="w-full py-12 px-6 flex flex-col items-center text-center">
            {/* Subtitle */}
            <p className="text-sm md:text-base text-gray-700 mb-2 uppercase tracking-wide">
                Ready when you are
            </p>

            {/* Heading */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#002f5c] mb-4 leading-snug">
                Start with your first order in under 2 minutes
            </h2>

            {/* Description */}
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mb-8">
                No app download needed. Just paste the link, get your quote and
                get checkout securely in NPR
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
                <a
                    href="https://wa.me/9779817254118" // Replace with your WhatsApp number
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold rounded-full py-3 px-6 text-sm sm:text-base transition"
                >
                    <FaWhatsapp className="w-5 h-5" />
                    Chat with support on WhatsApp
                </a>
            </div>
        </section>
    );
};

export default BottomSection;
