import React from "react";
import { MapPinIcon } from "@heroicons/react/24/outline";
import { Link } from "next-view-transitions";


const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-[#0A2F4E] to-[#06203A] text-white py-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Top Section */}
        <div className="flex flex-col md:flex-row md:justify-between gap-10">
          {/* Logo + Description + Address */}
          <div className="max-w-md">
            <img
              src="/logo.png"
              alt="ParcelSewa Logo"
              className="w-44 mb-5"
            />
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              A seamless bridge between Indian e-commerce and Nepalese shoppers.
              We buy, process, and deliver your favorite products.
            </p>
            <p className="text-gray-400 text-sm flex items-center gap-2">
              <MapPinIcon className="w-5 h-5 text-green-400" />
              Office: Buddhanagar, Kathmandu 44600, Nepal
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col sm:flex-row gap-12">
            {/* Company */}
            <div>
              <h3 className="font-semibold text-lg mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li className="hover:text-white transition-colors">
                  <Link href="/about">About</Link>
                </li>
                <li className="hover:text-white transition-colors">
                  <Link href="/terms">Terms & Conditions</Link>
                </li>
                <li className="hover:text-white transition-colors">
                  <Link href="/returnsPolicy">Refund & Return Policy</Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="font-semibold text-lg mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li className="hover:text-white transition-colors">
                  <a href="mailto:ukdevelopers007@gmail.com">Email Us</a>
                </li>
                <li className="hover:text-white transition-colors">
                  <Link href="/faqs">Help / FAQs</Link>
                </li>
                <li>
                  <a
                    href="https://wa.me/9779817254118"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-green-400 transition-colors"
                  >
                    WhatsApp Support
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="mt-12 border-t border-white/20 pt-6 text-gray-400 text-sm flex flex-col md:flex-row justify-between items-center">
          <p>© 2025 ParcelSewa. All rights reserved.</p>
          <p className="mt-2 md:mt-0 text-xs text-gray-500">
            Designed with ❤️ in Nepal
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
