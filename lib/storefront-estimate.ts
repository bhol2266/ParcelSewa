export const ESTIMATE_CONVERSION_RATE = 1.6;

// The public estimate and admin default use the owner's current service tiers.
export function getDefaultServiceRate(itemPriceINR: number) {
  return itemPriceINR < 1500 ? "below_1500_1000" : itemPriceINR > 20000 ? 25 : 30;
}

export function calculateStorefrontEstimate(itemPriceINR: number, weightKg: number) {
  if (!Number.isFinite(itemPriceINR) || itemPriceINR <= 0 || !Number.isFinite(weightKg) || weightKg <= 0) {
    throw new RangeError("Enter a positive item price and weight.");
  }
  const productNPR = itemPriceINR * ESTIMATE_CONVERSION_RATE;
  const rate = getDefaultServiceRate(itemPriceINR);
  const serviceNPR = typeof rate === "string" ? 1000 : productNPR * rate / 100;
  const shippingNPR = (weightKg * 60 + 90) * ESTIMATE_CONVERSION_RATE;
  const totalNPR = productNPR + serviceNPR + shippingNPR;
  if (![productNPR, serviceNPR, shippingNPR, totalNPR].every(Number.isFinite)) {
    throw new RangeError("These values are too large to calculate. Please request a quote from our team.");
  }
  return { productNPR, serviceNPR, shippingNPR, totalNPR };
}
