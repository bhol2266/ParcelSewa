"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import OrderItemsEditor, { checkItems, countPieces, fromEditorItems, toEditorItems, type EditorItem } from "@/components/OrderItemsEditor";
import { cartQuotation, requestMessage, type CartRequest } from "@/lib/cart";
import { commissionOptions, type CommissionOption } from "@/lib/quotation-estimate";
import { getDefaultServiceRate } from "@/lib/storefront-estimate";
import { fetchProductPriceViaExtension } from "@/lib/extension-client";
import { SUPPORT_URL } from "@/lib/storefront";

type Props = { apiQuery: string; mobile: string; admin: boolean; expiresAt: number | null };

const dateLabel = (ms: number, withTime = false) =>
  new Date(ms).toLocaleString("en-GB", { day: "numeric", month: "short", ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}) });
const npr = (amount: number) => `NPR ${amount.toLocaleString("en-IN")}`;
const storeName = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "link"; } };

export default function CartPage({ apiQuery, mobile, admin, expiresAt }: Props) {
  const [requests, setRequests] = useState<CartRequest[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/cart?${apiQuery}`, { cache: "no-store" })
      .then(async response => {
        const result = await response.json().catch(() => ({}));
        if (!active) return;
        if (response.ok) setRequests(result.requests);
        else setError(result.error === "expired" ? "This cart link has expired. Message us on WhatsApp to change your order." : "We couldn’t open this cart. Please use the link from your WhatsApp message.");
      })
      .catch(() => { if (active) setError("We couldn’t load your cart. Check your connection and try again."); });
    return () => { active = false; };
  }, [apiQuery]);

  const replace = (updated: CartRequest) => setRequests(current => current?.map(r => (r.id === updated.id ? updated : r)) ?? null);
  const drop = (id: string) => setRequests(current => current?.filter(r => r.id !== id) ?? null);

  return (
    <section className="storefront page-container inner-page cart-page">
      <Toaster position="top-center" />
      <header className="cart-header">
        <h1>{admin ? "Customer cart" : "Your cart"}</h1>
        {admin
          ? <p className="small-note">+977 {mobile} · <span className="cart-admin-badge">Admin view</span></p>
          : <p className="small-note">Change products, quantities or details, then tap <strong>Save changes</strong>.{expiresAt && <span className="cart-expiry">Editable until {dateLabel(expiresAt)}</span>}</p>}
      </header>

      {error && <div className="surface-panel cart-notice"><p>{error}</p><a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="whatsapp-button mt-4">Message us on WhatsApp</a></div>}
      {!error && requests === null && <p className="small-note" role="status">Loading your cart…</p>}
      {!error && requests?.length === 0 && (
        <div className="surface-panel cart-notice"><h2>No current orders</h2><p className="small-note mt-2">Requests from the last 7 days show here.</p><Link href="/order" className="button-primary mt-5">Start a new order</Link></div>
      )}
      <div className="cart-requests">
        {requests?.map(request => <RequestCard key={`${apiQuery}:${request.id}`} request={request} apiQuery={apiQuery} mobile={mobile} admin={admin} onSaved={replace} onCancelled={drop} />)}
      </div>
      {!admin && requests && requests.length > 0 && <p className="small-note cart-footnote">Changes are sent to our team when you save. Need help? <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Chat with us</a></p>}
    </section>
  );
}

function RequestCard({ request, apiQuery, mobile, admin, onSaved, onCancelled }: {
  request: CartRequest; apiQuery: string; mobile: string; admin: boolean; onSaved: (r: CartRequest) => void; onCancelled: (id: string) => void;
}) {
  const [items, setItems] = useState<EditorItem[]>(() => toEditorItems(request.items));
  const [deliveryLocation, setDeliveryLocation] = useState(request.deliveryLocation);
  const [notes, setNotes] = useState(request.notes);
  const [saving, setSaving] = useState(false);
  const [updateLink, setUpdateLink] = useState("");
  const idPrefix = `cart-${request.id}`;

  const savedShape = useMemo(() => JSON.stringify([request.items.map(({ productUrl, quantity, details }) => ({ productUrl, quantity, details })), request.deliveryLocation, request.notes]), [request]);
  const dirty = JSON.stringify([fromEditorItems(items), deliveryLocation.trim(), notes.trim()]) !== savedShape;

  async function save() {
    const problem = checkItems(items, idPrefix);
    if (problem) { toast.error(problem); return; }
    if (!deliveryLocation.trim()) { toast.error("Enter your delivery address."); return; }
    setSaving(true);
    try {
      const products = fromEditorItems(items);
      const response = await fetch(`/api/cart?${apiQuery}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: request.id, items: products, deliveryLocation: deliveryLocation.trim(), notes: notes.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { toast.error(result.error === "expired" ? "This cart link has expired." : result.error || "Couldn’t save. Please try again."); return; }
      onSaved(result.request);
      setItems(toEditorItems(result.request.items));
      toast.success("Changes saved");
      // Customers let the team know on WhatsApp with the updated list.
      if (!admin) {
        const message = requestMessage({
          title: "✏️ *Order Request Updated*", items: products,
          deliveryLocation: deliveryLocation.trim(), mobile: `+977${mobile}`, notes: notes.trim(), cartUrl: window.location.href,
        });
        setUpdateLink(`${SUPPORT_URL}?text=${encodeURIComponent(message)}`);
      }
    } catch {
      toast.error("Couldn’t save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelRequest() {
    if (!window.confirm("Cancel this order request? It will be removed from your cart.")) return;
    const response = await fetch(`/api/cart?${apiQuery}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: request.id, cancel: true }) });
    if (response.ok) { toast.success("Request cancelled"); onCancelled(request.id); }
    else toast.error("Couldn’t cancel. Please try again.");
  }

  return (
    <article className="cart-request">
      <div className="cart-request-head">
        <p className="cart-request-meta">
          <strong>Order request</strong>
          <span>Sent {dateLabel(request.createdAt, true)}{request.updatedAt ? ` · edited ${dateLabel(request.updatedAt, true)}` : ""}{admin ? ` · ${request.requestId}` : ""}</span>
        </p>
        <button type="button" className="cart-cancel" onClick={cancelRequest}>Cancel</button>
      </div>

      {updateLink && !dirty && (
        <div className="cart-sent" role="status">
          <p>Saved. Let our team know about the change:</p>
          <a href={updateLink} target="_blank" rel="noopener noreferrer" className="whatsapp-button" onClick={() => setTimeout(() => setUpdateLink(""), 500)}>Send update on WhatsApp</a>
        </div>
      )}

      <form className="form-panel order-form cart-form" onSubmit={event => { event.preventDefault(); save(); }}>
        <OrderItemsEditor items={items} setItems={setItems} idPrefix={idPrefix} />
        <fieldset className="cart-delivery">
          <legend>Delivery</legend>
          <div className="form-field"><label htmlFor={`${idPrefix}-address`}>Address *</label><input id={`${idPrefix}-address`} className="order-input" required autoComplete="street-address" placeholder="New Baneswor, Kathmandu" value={deliveryLocation} onChange={event => setDeliveryLocation(event.target.value)} /></div>
          <div className="form-field"><label htmlFor={`${idPrefix}-notes`}>Note for the whole order <span className="font-normal">(optional)</span></label><textarea id={`${idPrefix}-notes`} className="order-input" rows={2} placeholder="e.g. Need it before Tihar" value={notes} onChange={event => setNotes(event.target.value)} /></div>
        </fieldset>
        {dirty && (
          <div className="order-submit cart-save-bar">
            <p className="order-summary"><strong>{items.length} {items.length === 1 ? "product" : "products"}</strong><span>{countPieces(items)} {countPieces(items) === 1 ? "piece" : "pieces"}</span></p>
            <button type="submit" disabled={saving} className="button-primary">{saving ? "Saving…" : "Save changes"}</button>
          </div>
        )}
      </form>

      {/* Remounts with fresh price boxes when the products or quantities change. */}
      {admin && <QuotePanel key={JSON.stringify(request.items.map(item => [item.productUrl, item.quantity]))} request={request} unsaved={dirty} onSaved={onSaved} />}
    </article>
  );
}

// ── Team only: read each product's price through the ParcelSewa extension (like "Verify" on the orders page),
//    or type it in, then copy a quotation in the quotation calculator's format. ───────────────────────────────
function QuotePanel({ request, unsaved, onSaved }: { request: CartRequest; unsaved: boolean; onSaved: (r: CartRequest) => void }) {
  const [prices, setPrices] = useState<string[]>(() => request.items.map(item => (item.priceInr ? String(item.priceInr) : "")));
  const [status, setStatus] = useState<string[]>(() => request.items.map(() => ""));
  const [reading, setReading] = useState(false);
  const [rate, setRate] = useState<CommissionOption | null>(request.quote?.rate ?? null);
  const [copyState, setCopyState] = useState("");

  const lines = request.items.map((item, i) => ({ priceInr: Number(prices[i]), quantity: item.quantity }));
  const complete = lines.length > 0 && lines.every(line => Number.isFinite(line.priceInr) && line.priceInr > 0);
  const totalInr = complete ? lines.reduce((sum, line) => sum + line.priceInr * line.quantity, 0) : 0;
  const appliedRate: CommissionOption = rate ?? (complete ? getDefaultServiceRate(totalInr) : 30);
  const quotation = useMemo(() => {
    if (!complete) return null;
    try { return cartQuotation(lines, appliedRate); } catch { return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, JSON.stringify(lines), appliedRate]);

  const setAt = <T,>(list: T[], index: number, value: T) => list.map((entry, i) => (i === index ? value : entry));

  async function readPrices(only?: number) {
    setReading(true);
    setCopyState("");
    try {
      for (let i = 0; i < request.items.length; i++) {
        if (only !== undefined ? i !== only : !!prices[i]) continue;
        setStatus(current => setAt(current, i, "Reading price…"));
        const { price, note } = await fetchProductPriceViaExtension(request.items[i].productUrl);
        if (price) {
          setPrices(current => setAt(current, i, String(price)));
          setStatus(current => setAt(current, i, ""));
        } else {
          setStatus(current => setAt(current, i, `Couldn’t read the price (${note}). Type it in.`));
        }
      }
    } finally {
      setReading(false);
    }
  }

  async function copy() {
    if (!quotation) return;
    try {
      await navigator.clipboard.writeText(quotation.message);
      setCopyState("Quotation copied");
    } catch {
      setCopyState("Clipboard blocked — copy it from the preview below.");
    }
    // Keep the prices and quotation on the request for next time.
    const response = await fetch("/api/cart/quote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: request.id, prices: lines.map(line => line.priceInr), rate: appliedRate, totalNPR: quotation.totalNPR }),
    });
    if (response.ok) onSaved({ ...request, items: request.items.map((item, i) => ({ ...item, priceInr: lines[i].priceInr })), quote: { rate: appliedRate, totalNPR: quotation.totalNPR, quotedAt: Date.now() } });
    else toast.error("Quotation copied, but saving the prices failed.");
  }

  return (
    <section className="cart-quote" aria-label={`Quotation for ${request.requestId}`}>
      <div className="cart-quote-head">
        <h3>Quotation</h3>
        <button type="button" className="button-secondary" disabled={reading || unsaved} onClick={() => readPrices()}>{reading ? "Reading prices…" : "Fetch prices"}</button>
      </div>
      {unsaved && <p className="cart-quote-warn">Save the changes above before quoting.</p>}
      {request.quote && <p className="small-note">Last quoted {npr(request.quote.totalNPR)} on {dateLabel(request.quote.quotedAt, true)}.</p>}

      <ol className="cart-quote-lines">
        {request.items.map((item, i) => (
          <li key={`${item.productUrl}-${i}`}>
            <div className="cart-quote-product">
              <span>{i + 1}.</span>
              <a href={item.productUrl} target="_blank" rel="noopener noreferrer">{storeName(item.productUrl)}</a>
              {item.quantity > 1 && <span>× {item.quantity}</span>}
            </div>
            <div className="cart-quote-price">
              <label htmlFor={`price-${request.id}-${i}`} className="sr-only">Price of product {i + 1} in INR</label>
              <span aria-hidden="true">INR</span>
              <input id={`price-${request.id}-${i}`} type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="Price" value={prices[i] ?? ""} onChange={event => { setPrices(current => setAt(current, i, event.target.value)); setStatus(current => setAt(current, i, "")); setCopyState(""); }} />
              <button type="button" aria-label={`Fetch price of product ${i + 1}`} title="Fetch this price" disabled={reading || unsaved} onClick={() => readPrices(i)}>↻</button>
            </div>
            {status[i] && <p className={status[i].startsWith("Reading") ? "cart-quote-status" : "cart-quote-status is-error"}>{status[i]}</p>}
          </li>
        ))}
      </ol>

      <div className="form-field">
        <label htmlFor={`rate-${request.id}`}>Service fee</label>
        <select id={`rate-${request.id}`} value={String(appliedRate)} onChange={event => { const option = commissionOptions.find(o => String(o.value) === event.target.value); if (option) setRate(option.value); setCopyState(""); }}>
          {commissionOptions.map(option => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}
        </select>
      </div>

      {quotation ? (
        <div className="cart-quote-result">
          <div className="estimate-line"><span>Products · INR {quotation.totalInr.toLocaleString("en-IN")}</span><strong>{npr(quotation.productNPR)}</strong></div>
          <div className="estimate-line"><span>Service & handling · {quotation.serviceLabel}</span><strong>{npr(quotation.serviceNPR)}</strong></div>
          <div className="estimate-line cart-quote-total"><span>Total + courier</span><strong>{npr(quotation.totalNPR)}</strong></div>
          <button type="button" className="button-primary" disabled={unsaved} onClick={copy}>{copyState === "Quotation copied" ? "✓ Copied" : "Copy quotation"}</button>
          {copyState && copyState !== "Quotation copied" && <p className="cart-quote-status is-error">{copyState}</p>}
          <details className="quotation-preview" open={copyState.startsWith("Clipboard")}><summary>Preview message</summary><pre>{quotation.message}</pre></details>
        </div>
      ) : (
        <p className="small-note">Fetch or type every product’s price to see the quotation.</p>
      )}
    </section>
  );
}
