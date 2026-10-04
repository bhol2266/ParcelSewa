"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { calculateStorefrontEstimate, ESTIMATE_CONVERSION_RATE } from "@/lib/storefront-estimate";

const formatNPR = (value: number) => `NPR ${value.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PriceCalculator() {
  const [price, setPrice] = useState("");
  const [weight, setWeight] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ReturnType<typeof calculateStorefrontEstimate> | null>(null);

  function handleCalculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setResult(calculateStorefrontEstimate(Number(price), Number(weight)));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please check your values.");
      setResult(null);
    }
  }

  return (
    <div className="storefront page-container inner-page form-page">
      <div><p className="eyebrow">The price calculator</p><h1>A great find.<br /><span className="accent-text">A clearer budget.</span></h1><p className="section-description">Start with the retailer’s item price and estimated weight. See an indicative cost in NPR before requesting your confirmed quote.</p><div className="form-tip"><h2>How this estimate works</h2><p>The calculator uses a fixed conversion of 1 INR = {ESTIMATE_CONVERSION_RATE.toFixed(2)} NPR. Actual item eligibility, category, shipping, and handling are reviewed by our team.</p><ul className="service-tiers"><li><span>Below INR 1,500</span><strong>Flat NPR 1,000</strong></li><li><span>INR 1,500–20,000</span><strong>30% service fee</strong></li><li><span>Above INR 20,000</span><strong>25% service fee</strong></li></ul><p className="small-note mt-3">Percentage fees apply to the product price converted to NPR. Shipping estimate: (INR 60 × weight in kg + INR 90) converted to NPR.</p></div><Link href="/order" className="text-link mt-6">Already have a product link? Request a quote →</Link></div>
      <div>
        <form onSubmit={handleCalculate} className="surface-panel form-panel">
          <div><h2>Estimate your order</h2><p className="small-note mt-2">Use the price of your selected variant.</p></div>
          <div className="form-field"><label htmlFor="estimate-price">Item price in Indian rupees (INR)</label><input id="estimate-price" name="price" type="number" required min="0.01" step="0.01" inputMode="decimal" placeholder="e.g. 2499" value={price} onChange={event => { setPrice(event.target.value); setResult(null); setError(""); }} /></div>
          <div className="form-field"><label htmlFor="estimate-weight">Estimated weight in kilograms</label><input id="estimate-weight" name="weight" type="number" required min="0.01" step="0.01" inputMode="decimal" placeholder="e.g. 0.5" value={weight} onChange={event => { setWeight(event.target.value); setResult(null); setError(""); }} /><p>Include packaging. If you’re unsure, ask our team for help.</p></div>
          {error && <p role="alert" className="form-error">{error}</p>}
          <button type="submit" className="button-primary">Calculate my estimate</button>
          <p className="small-note">An estimate helps you plan. Your final quote is confirmed before purchase.</p>
        </form>
        <div aria-live="polite" aria-atomic="true">
          {result && <section className="surface-panel estimate-panel"><p className="eyebrow">Your indicative breakdown</p><h2>Here’s what to budget.</h2><div className="estimate-line"><span>Product in NPR</span><strong>{formatNPR(result.productNPR)}</strong></div><div className="estimate-line"><span>Service estimate</span><strong>{formatNPR(result.serviceNPR)}</strong></div><div className="estimate-line"><span>Shipping estimate</span><strong>{formatNPR(result.shippingNPR)}</strong></div><div className="estimate-line estimate-total"><span>Estimated total</span><strong>{formatNPR(result.totalNPR)}</strong></div><p className="small-note">This is not a confirmed quote. Share your product link and delivery location for the payable amount.</p><Link href="/order" className="button-primary mt-5">Request my final quote</Link></section>}
        </div>
      </div>
    </div>
  );
}
