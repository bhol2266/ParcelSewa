import type { AnchorHTMLAttributes } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { SUPPORT_URL } from "@/lib/storefront";

export default function WhatsAppLink({ children = "Chat on WhatsApp", className = "", href = SUPPORT_URL, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} href={href} target="_blank" rel="noopener noreferrer" className={`whatsapp-button ${className}`}><FaWhatsapp aria-hidden="true" />{children}<span className="sr-only"> (opens a new tab)</span></a>;
}
