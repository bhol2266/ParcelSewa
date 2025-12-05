import React from "react";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-[#0A2F4E] text-white py-12 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Top Section */}
        <div className="flex flex-col md:flex-row md:justify-between gap-10">
          {/* Logo + Description */}
          <div className="max-w-md">
            <img
              src="/logo.png" // update your image path
              alt="ParcelSewa Logo"
              className="w-40 mb-4"
            />
            <p className="text-gray-200 text-sm leading-relaxed">
              A simple bridge between Indian e-commerce and Nepalese shoppers.
              We buy, process and deliver your favourite products.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col sm:flex-row gap-12">
            {/* Company */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Company</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>
                  <Link href="/about">About</Link>
                </li>
                <li>
                  <Link href="/terms">Terms & Conditions</Link>
                </li>
                <li>
                  <Link href="/refund">Refund & Return policy</Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Support</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>
                  <Link href="/contact">Email us</Link>
                </li>
                <li>
                  <Link href="/faqs">Help / FAQs</Link>
                </li>
                <li>
                  <a
                    href="https://wa.me/your-whatsapp-number"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp support
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="mt-12 border-t border-white/20 pt-4 text-gray-300 text-sm">
          © 2025 ParcelSewa. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
