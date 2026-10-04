// app/admin/quotation-calculator/page.tsx
import Quatation_Calc from "@/components/Quatation_Calc";
import Link from "next/link";

export const metadata = {
  title: "Quotation Calculator | ParcelSewa Admin",
  description: "Internal admin tool for generating product quotations.",
  robots: { index: false, follow: false },
};

export default function AdminQuotationCalculatorPage() {
  return (
    <div className="storefront page-container inner-page quotation-page">
      <div className="quotation-heading"><h1>Quotation calculator</h1><Link href="/admin" className="text-link">← Orders</Link></div>
      <Quatation_Calc />
    </div>
  );
}
