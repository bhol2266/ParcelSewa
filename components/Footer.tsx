"use client";

import WhatsAppLink from "@/components/WhatsAppLink";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPinIcon } from "@heroicons/react/24/outline";
import BrandLogo from "@/components/BrandLogo";

export default function Footer() {
  const pathname = usePathname();
  if (["/huggai-delete-account", "/huggai-privacy-policy", "/vixoai-delete-account", "/vixoai-privacy-policy", "/admin/quotation-calculator"].includes(pathname)) return null;
  return (
    <footer className="site-footer">
      <div className="page-container">
        <div className="footer-grid">
          <div className="footer-brand"><Link href="/" aria-label="ParcelSewa home"><BrandLogo surface="dark" className="w-48" /></Link><p>Great finds from India, closer to home in Nepal. We help with the purchase, handling, and delivery.</p><span className="footer-location"><MapPinIcon className="size-4" aria-hidden="true" />Buddhanagar, Kathmandu 44600, Nepal</span></div>
          <div><h2>Explore</h2><Link href="/about">About ParcelSewa</Link><Link href="/offers">Festival picks</Link><Link href="/price-calculator">Price calculator</Link><Link href="/order">Start an order</Link></div>
          <div><h2>Here to help</h2><Link href="/faqs">Questions & answers</Link><Link href="/terms">Terms &amp; Conditions</Link><Link href="/returnsPolicy">Returns & refunds</Link><a href="mailto:ukdevelopers007@gmail.com">Email support</a><WhatsAppLink>WhatsApp support</WhatsAppLink></div>
        </div>
        <div className="footer-bottom"><p>© {new Date().getFullYear()} ParcelSewa. All rights reserved.</p><p>From India, with care. Made for Nepal.</p></div>
      </div>
    </footer>
  );
}
