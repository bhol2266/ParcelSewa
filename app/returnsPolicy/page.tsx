// pages/returns.tsx or app/(pages)/returns.tsx
"use client";

import React from "react";

const returnsPolicy = [
  {
    title: "Our Commitment",
    content:
      "At ParcelSewa, we strive to ensure that you are satisfied with your purchase. If for any reason you are not completely satisfied — e.g. the product arrives damaged or is not as described — we offer a clear Returns & Refund policy to help you request a return or refund.",
  },
  {
    title: "When Are Returns/Refunds Allowed",
    content:
      "You may request a return or refund in the following situations:\n- The product arrives damaged, defective, or broken during shipping.\n- The product received is different from what you ordered (wrong product, wrong size/color/variant).\n- The product is expired, or its packaging is tampered.\n- The product is not as described on the foreign website (wrong description, missing parts, missing accessories, etc.).",
  },
  {
    title: "Conditions for Return",
    content:
      "To be eligible for return/refund, the following conditions must be met:\n- The item must be unused / unopened (unless it's defective).\n- It must be in the original packaging, with all labels, tags, accessories, manuals, and invoice intact.\n- You must submit your request within [X] days of delivery.\n- You must provide proof of purchase (order receipt, tracking number, etc.).",
  },
  {
    title: "Non-Returnable / Non-Refundable Items",
    content:
      "Some items may not be eligible for return or refund. These include:\n- Products that are personalized or custom-made.\n- Goods not suitable for return for hygiene or safety reasons (e.g. opened personal-care items, perishable goods, sealed items once opened).\n- Items that have been used, damaged, altered, or worn after delivery.\n- Sale/clearance items — refunds/exchanges may not be available.",
  },
  {
    title: "How to Submit a Return / Refund Request",
    content:
      "1. Contact our customer support immediately after delivery if you encounter any problem — damaged items, wrong items, missing parts, etc.\n2. Provide your order number, photos of the product and packaging (if damaged), and a brief description of the issue.\n3. Our team will review your request and — if approved — provide instructions for returning or discarding the package.\n4. For returns: arrange return shipping (unless we pre-pay return shipping due to our error).",
  },
  {
    title: "Refund or Exchange Process",
    content:
      "- Once we receive the returned item (if return is required) and verify its condition, we will process the refund or exchange.\n- Refunds will be credited to your original payment method (card, eSewa / Khalti / IME Pay / bank transfer) within [Y] business days.\n- If the return was initiated because of our error (wrong item, defective item), we will also refund the shipping cost. Otherwise, return shipping costs may be borne by the customer.\n- Exchange depends on availability. If the requested replacement is unavailable, a refund will be issued instead.",
  },
  {
    title: "Cancellation Before Dispatch",
    content:
      "If you want to cancel your order before we purchase the item from the foreign seller or before dispatch: please contact us as soon as possible. If the order has not been purchased/dispatched — we can cancel and refund your payment (minus any transaction or processing fees, if applicable).",
  },
  {
    title: "Policy Duration",
    content:
      "Return/refund eligibility period starts from the date of delivery. You typically have [X] days to notify us about a return request. Requests made after this period may not be accepted.",
  },
  {
    title: "Contact Us",
    content:
      "For any questions, return/refund requests or support, contact us at:\n- Email: ukdevelopers007@gmail.com\n- Phone / WhatsApp: +977-9817254118\n- Live Chat: On our website",
  },
  {
    title: "Notes",
    content:
      "- Because ParcelSewa acts as an intermediary — sourcing products from foreign websites — policies for returns or refunds may also depend on the original seller’s terms.\n- For hygiene/safety/perishable items — returns may be restricted.\n- Keep your order confirmation, payment receipt, and shipping/tracking info until you are fully satisfied with delivery.",
  },
];

const ReturnsPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold text-center text-themeBlue mb-10">
        Returns & Refund Policy
      </h1>

      {returnsPolicy.map((section, idx) => (
        <div key={idx} className="mb-8">
          <h2 className="text-2xl font-semibold mb-3 text-themeBlue">
            {section.title}
          </h2>
          <p className="text-secondary text-sm whitespace-pre-line">{section.content}</p>
        </div>
      ))}
    </div>
  );
};

export default ReturnsPage;
