import { ESTIMATE_CONVERSION_RATE } from "./storefront-estimate";

export const FLAT_SERVICE_FEES = { below_1500_1000: 1000 } as const;
export type CommissionOption = 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 50 | keyof typeof FLAT_SERVICE_FEES;
export const commissionOptions: { label: string; value: CommissionOption }[] = [
  { label: "5%", value: 5 }, { label: "10%", value: 10 }, { label: "15%", value: 15 },
  { label: "20%", value: 20 }, { label: "25%", value: 25 }, { label: "30%", value: 30 },
  { label: "35%", value: 35 }, { label: "40%", value: 40 }, { label: "50%", value: 50 },
  { label: "Flat NPR 1,000", value: "below_1500_1000" },
];

export function calculateAdminQuotation(amountINR: number, rate: CommissionOption) {
  if (!Number.isFinite(amountINR) || amountINR <= 0) throw new RangeError("Enter a positive product price.");
  if (!commissionOptions.some(option => option.value === rate)) throw new RangeError("Choose a supported service fee.");
  const productNPR = Math.round(amountINR * ESTIMATE_CONVERSION_RATE);
  const serviceNPR = typeof rate === "string" ? FLAT_SERVICE_FEES[rate] : Math.round(productNPR * rate / 100);
  const totalNPR = productNPR + serviceNPR;
  if (![productNPR, serviceNPR, totalNPR].every(Number.isFinite)) throw new RangeError("This amount is too large to calculate.");
  const serviceLabel = typeof rate === "string" ? `Flat NPR ${serviceNPR.toLocaleString("en-IN")}` : `${rate}%`;
  const message = [
    "🛍️ *Your ParcelSewa quotation*", "",
    `🇮🇳 INR ${amountINR.toLocaleString("en-IN", { maximumFractionDigits: 2 })} × ${ESTIMATE_CONVERSION_RATE} = NPR ${productNPR.toLocaleString("en-IN")} 🇳🇵`,
    `Service & handling (${serviceLabel}): NPR ${serviceNPR.toLocaleString("en-IN")}`, "",
    `*TOTAL = NPR ${totalNPR.toLocaleString("en-IN")}* + courier charge`, "",
    "Product + customs & service handling. Courier charge is additional.",
    "Please confirm the complete payable amount and delivery timing with our team before purchase.",
  ].join("\n");
  return { productNPR, serviceNPR, totalNPR, serviceLabel, message };
}
