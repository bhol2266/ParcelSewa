// app/admin/quotation-calculator/page.tsx
import Quatation_Calc from "@/components/Quatation_Calc";

export const metadata = {
  title: "Quotation Calculator | ParcelSewa Admin",
  description: "Internal admin tool for generating product quotations.",
};

export default function AdminQuotationCalculatorPage() {
  return (
    <div className="w-full mx-auto px-4 py-8">
      {/* Badge */}
      <div className="inline-block bg-orange-100 text-orange-700 px-5 py-1.5 rounded-full text-sm font-medium mb-4">
        Admin Tool
      </div>

      <h1 className="text-[24px] md:text-[32px] font-semibold text-[#002B5B] mb-6">
        Quotation Calculator
      </h1>

      <Quatation_Calc />
    </div>
  );
}