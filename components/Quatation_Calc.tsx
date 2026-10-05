"use client";

import { useRef, useState, type FormEvent } from "react";
import { CalculatorIcon, CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { ESTIMATE_CONVERSION_RATE, getDefaultServiceRate } from "@/lib/storefront-estimate";
import { calculateAdminQuotation, commissionOptions, type CommissionOption } from "@/lib/quotation-estimate";

const formatNPR = (amount: number) => `NPR ${amount.toLocaleString("en-IN")}`;

export default function QuotationCalculator() {
  const [amountINR, setAmountINR] = useState("");
  const [commissionRate, setCommissionRate] = useState<CommissionOption>("below_1500_1000");
  const [result, setResult] = useState<ReturnType<typeof calculateAdminQuotation> | null>(null);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [copying, setCopying] = useState(false);
  const amountBand = useRef<CommissionOption | null>(null);

  const clearResult = () => { setResult(null); setError(""); setCopyStatus(""); };
  const changeAmount = (value: string) => {
    setAmountINR(value);
    clearResult();
    const amount = Number(value);
    const band = value !== "" && Number.isFinite(amount) && amount > 0 ? getDefaultServiceRate(amount) : null;
    // Keep a manual selection while the price stays within the same service tier.
    if (band !== null && band !== amountBand.current) setCommissionRate(band);
    amountBand.current = band;
  };

  const calculate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCopyStatus("");
    try { const quotation = calculateAdminQuotation(Number(amountINR), commissionRate); setResult(quotation); setError(""); await copyQuotation(quotation); }
    catch (error) { setResult(null); setError(error instanceof Error ? error.message : "Please check the product price."); }
  };

  const copyQuotation = async (quotation: ReturnType<typeof calculateAdminQuotation>) => {
    if (copying) return;
    setCopying(true);
    try { await navigator.clipboard.writeText(quotation.message); setCopyStatus("Quotation copied. Ready to share with your customer."); }
    catch { setCopyStatus("Clipboard access is unavailable. Open the customer message below and copy it manually."); }
    finally { setCopying(false); }
  };

  const reset = () => { setAmountINR(""); setCommissionRate("below_1500_1000"); amountBand.current = null; clearResult(); };

  return (
    <>
      <div className="surface-panel quotation-compact">
        <form onSubmit={calculate} className="form-panel">
          <div className="form-row">
          <div className="form-field"><label htmlFor="quotation-price">Product price (INR / IC)</label><input id="quotation-price" type="number" inputMode="decimal" required min="0.01" step="0.01" value={amountINR} onChange={event => changeAmount(event.target.value)} placeholder="e.g. 2499" /><p>1 INR = {ESTIMATE_CONVERSION_RATE.toFixed(2)} NPR</p></div>
          <div className="form-field"><label htmlFor="quotation-rate">Service fee</label><select id="quotation-rate" value={commissionRate} onChange={event => { const option = commissionOptions.find(option => String(option.value) === event.target.value); if (option) setCommissionRate(option.value); clearResult(); }}>{commissionOptions.map(option => <option key={String(option.value)} value={option.value}>{option.label}</option>)}</select><p>Suggested by price. Change if needed.</p></div>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="button-primary" disabled={copying}><CalculatorIcon className="size-5" aria-hidden="true" />{copying ? "Copying quotation…" : "Calculate & copy quotation"}</button>
        </form>
        {result && <section className="quotation-result" aria-live="polite" aria-atomic="true">
            <div className="estimate-line"><span>Product converted to NPR</span><strong>{formatNPR(result.productNPR)}</strong></div>
            <div className="estimate-line"><span>Service & handling · {result.serviceLabel}</span><strong>{formatNPR(result.serviceNPR)}</strong></div>
            <div className="quotation-total"><p>Quotation subtotal</p><strong>{formatNPR(result.totalNPR)}</strong><p>+ courier charge (180/kg)</p></div>
            <div className="button-row mt-6"><button type="button" className="button-primary" disabled={copying} onClick={() => copyQuotation(result)}>{copyStatus.startsWith("Quotation copied") ? <CheckIcon className="size-5" aria-hidden="true" /> : <ClipboardDocumentIcon className="size-5" aria-hidden="true" />}{copying ? "Copying…" : "Copy quotation"}</button><button type="button" className="button-secondary" onClick={reset}>New quote</button></div>
            {copyStatus && <p className="copy-status" role="status">{copyStatus}</p>}
            <details className="quotation-preview" open={copyStatus.startsWith("Clipboard access")}><summary>Preview customer message</summary><pre>{result.message}</pre></details>
        </section>}
      </div>
    </>
  );
}
