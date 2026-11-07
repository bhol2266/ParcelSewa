// app/admin/quotation-calculator/page.tsx
import Quatation_Calc from "@/components/Quatation_Calc";
import Link from "next/link";
import { FaClipboardList } from "react-icons/fa";

export const metadata = {
  title: "Quotation Calculator | ParcelSewa Admin",
  description: "Internal admin tool for generating product quotations.",
  robots: { index: false, follow: false },
};

export default function AdminQuotationCalculatorPage() {
  return (
    <div className="storefront page-container inner-page quotation-page">
      <Link href="/admin" className="mb-6 flex flex-col items-center justify-center rounded-xl bg-blue-500 px-2 py-3 text-white shadow-md transition duration-300 hover:scale-[1.02]">
        <FaClipboardList size={22} aria-hidden="true" />
        <span className="mt-1.5 text-base font-semibold">Orders</span>
      </Link>
      <div className="quotation-heading"><h1>Quotation calculator</h1><Link href="/admin" className="text-link">← Orders</Link></div>
      <Quatation_Calc />
    </div>
  );
}
