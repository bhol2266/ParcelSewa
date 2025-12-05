// app/(pages)/faq.tsx or pages/faq.tsx
"use client";

import React from "react";

const faqs = [
  {
    category: "What is ParcelSewa?",
    items: [
      {
        question: "What does ParcelSewa do?",
        answer:
          "ParcelSewa helps people in Nepal buy products from India and delivers them directly to your doorstep. We act as your trusted international shipping partner, handling the purchase, shipping, customs, and delivery process so you don’t have to worry about anything.",
      },
      {
        question: "How does ParcelSewa work?",
        answer:
          "1. Find the product on the international website (India, U.S., etc.) and copy the product link.\n2. Submit the product link and order details on ParcelSewa.com.\n3. Our team reviews your request, purchases the item, and ships it to Nepal.\n4. Track your order online and receive it safely at your address.",
      },
    ],
  },
  {
    category: "Ordering & Payment",
    items: [
      {
        question: "How do I place an order?",
        answer:
          "Paste the product URL on our order form, provide your shipping details, and make the payment. Our team will confirm your order and start the process.",
      },
      {
        question: "What payment methods are accepted?",
        answer:
          "We accept major credit/debit cards, eSewa, Khalti, IME Pay, and bank transfers for your convenience.",
      },
      {
        question: "Do I need to pay upfront?",
        answer:
          "Yes, partial or full payment is required before we initiate the purchase. This ensures we can secure your product from the seller.",
      },
    ],
  },
  {
    category: "Shipping & Delivery",
    items: [
      {
        question: "How long does delivery take?",
        answer:
          "India orders: 5–12 business days\nDelivery times may vary depending on customs clearance, product availability, and seller location.",
      },
      {
        question: "Can I track my order?",
        answer: "Yes! Once your order is shipped, we provide a tracking number so you can monitor your package in real time.",
      },
      {
        question: "Are there extra charges for customs or import duties?",
        answer:
          "Yes, customs or import duties may apply depending on the product type and country of origin. ParcelSewa will notify you about any additional charges before shipping.",
      },
    ],
  },
  {
    category: "Returns & Refunds",
    items: [
      {
        question: "Can I return a product?",
        answer:
          "Returns are handled in accordance with the original seller’s policy. ParcelSewa assists in facilitating returns to the seller, but the final approval depends on them.",
      },
      {
        question: "How do I get a refund?",
        answer:
          "Once the seller approves your return, ParcelSewa will process your refund. Please note that shipping fees may not always be refundable.",
      },
    ],
  },
  {
    category: "Customer Support",
    items: [
      {
        question: "How do I contact ParcelSewa?",
        answer:
          "You can reach us via:\n- Email: ukdevelopers007@gmail.com\n- Phone/WhatsApp: +977-981754118\n- Live chat on our website",
      },
      {
        question: "Is ParcelSewa safe and reliable?",
        answer:
          "Absolutely! We have delivered thousands of products safely to Nepal, ensuring timely delivery and secure handling of your items.",
      },
    ],
  },
  {
    category: "General Questions",
    items: [
      {
        question: "Can I order multiple products at once?",
        answer:
          "Yes, you can submit multiple product links in a single order. We will calculate combined shipping and provide a total cost.",
      },
      {
        question: "Can ParcelSewa help with gift delivery?",
        answer:
          "Yes! You can request us to deliver products as gifts, and we can include gift wrapping and personalized messages upon request.",
      },
    ],
  },
];

const FAQPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold text-center text-themeBlue mb-10">
        Frequently Asked Questions
      </h1>

      {faqs.map((section, idx) => (
        <div key={idx} className="mb-10">
          <h2 className="text-2xl font-semibold mb-6 text-themeBlue">
            {section.category}
          </h2>
          <div className="space-y-4">
            {section.items.map((item, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow duration-200"
              >
                <h3 className="font-medium text-lg text-gray-800 mb-2">
                  {item.question}
                </h3>
                <p className="text-secondary text-sm whitespace-pre-line">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FAQPage;
