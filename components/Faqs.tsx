"use client";

import { useState } from "react";
import { IoAdd, IoRemove } from "react-icons/io5";

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "Which Indian websites do you support?",
    answer:
      "Any trusted Indian e-commerce site including Amazon, Flipkart, Myntra, Ajio, Nykaa and more. If you're unsure, send us the link and we'll confirm.",
  },
  {
    question: "How long does delivery usually take?",
    answer:
      "Delivery typically takes 7–10 days depending on shipping speed and product availability.",
  },
  {
    question: "What if my product is damaged or lost?",
    answer:
      "We take full responsibility! If your order is damaged or lost, we will assist you with refund or replacement.",
  },
  {
    question: "Do I have to pay anything while delivery?",
    answer:
      "No, you pay only once during order placement. There are no extra delivery charges.",
  },
];

export default function Faqs() {
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(new Set());

  const toggle = (index: number) => {
    setOpenIndexes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      return newSet;
    });
  };

  return (
    <section id="faqs" className="w-full px-4 md:px-8 lg:px-20 py-4">
      <div className="inline-block bg-blue-100 text-blue-600 px-5 py-2 rounded-full text-sm font-medium mb-2">
        FAQs
      </div>

      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
        Frequently <br className="md:hidden" />
        <span className="text-orange-500">Asked Questions</span>
      </h2>

      <div className="mt-6 flex flex-col gap-4">
        {faqData.map((faq, index) => {
          const isOpen = openIndexes.has(index);

          return (
            <div
              key={index}
              className="rounded-xl shadow-acertinity border border-gray-200 overflow-hidden"
            >
              {/* Question */}
              <button
                onClick={() => toggle(index)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
              >
                <span className="text-lg font-medium text-themeBlue">
                  {faq.question}
                </span>

                <span className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100">
                  {isOpen ? (
                    <IoRemove className="text-2xl text-gray-700" />
                  ) : (
                    <IoAdd className="text-2xl text-gray-700" />
                  )}
                </span>
              </button>

              {/* Answer */}
              {isOpen && (
                <div className="px-6 pb-5">
                  <p className="text-[15px] leading-relaxed text-themeBlue">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
