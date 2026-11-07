"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import toast, { Toaster } from "react-hot-toast";
import OrderItemsEditor, { countPieces, emptyItem, fromEditorItems, toEditorItems, type EditorItem } from "@/components/OrderItemsEditor";
import { CART_DAYS, cartQuotation, commissionText, isValidUrl, nepalDate, orderNotes, orderProducts, orderStoreName, ORDER_REQUESTS, syncOrderProducts, visibleRequests, type CartRequest } from "@/lib/cart";
import { addDoc, collection, deleteField, doc, getDoc, onSnapshot, query, serverTimestamp, Timestamp, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { logOrderActivity } from "@/lib/order-logs";
import { brands } from "@/constants/brands";
import { commissionOptions, type CommissionOption } from "@/lib/quotation-estimate";
import { getDefaultServiceRate } from "@/lib/storefront-estimate";
import { fetchProductPriceViaExtension, fetchStoreImageViaExtension, hasExtension } from "@/lib/extension-client";
import { fetchProductPriceViaClaude } from "@/lib/claude-price-client";
import { SUPPORT_URL } from "@/lib/storefront";

type Props = { apiQuery: string; mobile: string; admin: boolean };

// Dates are shown in Nepal time wherever the page is opened.
const dateLabel = nepalDate;
const npr = (amount: number) => `NPR ${amount.toLocaleString("en-IN")}`;
const storeName = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "link"; } };

/** What still stops a draft from being saved, in words that follow "Not saved yet: ", or null when it can be saved. */
function draftProblem(items: EditorItem[], address: string, name?: string): string | null {
  const badLink = items.findIndex(item => !isValidUrl(item.productUrl));
  if (badLink !== -1) return items.length > 1 ? `add a full link for product ${badLink + 1}` : "add the full product link";
  const badQuantity = items.findIndex(item => !Number.isInteger(item.quantity) || item.quantity < 1);
  if (badQuantity !== -1) return `set a quantity for product ${badQuantity + 1}`;
  if (name !== undefined && !name.trim()) return "add the name";
  if (!address.trim()) return "add the delivery address";
  return null;
}

/** Warns before closing the tab while a change hasn't reached the server yet. */
function useUnsavedWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
}

export default function CartPage({ apiQuery, mobile, admin }: Props) {
  const [requests, setRequests] = useState<CartRequest[] | null>(null);
  const [error, setError] = useState("");
  // Bumped after an order is created here, to load the cart again.
  const [reloadKey, setReloadKey] = useState(0);

  // Live: the cart follows the database, so the customer and the team see each other's saves straight away.
  // If live updates aren't available (blocked network, database rules), it loads through the API every 15 seconds.
  useEffect(() => {
    let active = true;
    let poll: ReturnType<typeof setInterval> | undefined;
    const load = () => fetch(`/api/cart?${apiQuery}`, { cache: "no-store" })
      .then(async response => {
        const result = await response.json().catch(() => ({}));
        if (!active) return;
        if (response.ok) setRequests(result.requests);
        else setError(result.error === "expired" ? "This cart link has expired. Message us on WhatsApp to change your order." : "We couldn’t open this cart. Please use the link from your WhatsApp message.");
      })
      .catch(() => { if (active) setError("We couldn’t load your cart. Check your connection and try again."); });
    const stop = onSnapshot(
      query(collection(db, ORDER_REQUESTS), where("mobile", "==", `+977${mobile}`)),
      snap => { if (active) setRequests(visibleRequests(snap.docs.map(d => ({ id: d.id, data: d.data() })), admin)); },
      () => { if (!active || poll) return; void load(); poll = setInterval(load, 15000); },
    );
    return () => { active = false; stop(); if (poll) clearInterval(poll); };
  }, [apiQuery, mobile, admin, reloadKey]);

  const replace = (updated: CartRequest) => setRequests(current => current?.map(r => (r.id === updated.id ? updated : r)) ?? null);
  const drop = (id: string) => setRequests(current => current?.filter(r => r.id !== id) ?? null);

  return (
    <section className="storefront page-container inner-page cart-page">
      <Toaster position="top-center" />
      <header className="cart-header">
        <h1>{admin ? "Customer cart" : "Your cart"}</h1>
        {admin
          ? <p className="small-note">+977 {mobile} · <span className="cart-admin-badge">Admin view</span></p>
          : <p className="small-note">Change products, quantities or details, then tap <strong>Save</strong>. Each order can be changed for 7 days after you send it.</p>}
      </header>

      {error && <div className="surface-panel cart-notice"><p>{error}</p><a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="whatsapp-button mt-4">Message us on WhatsApp</a></div>}
      {!error && requests === null && <p className="small-note" role="status">Loading your cart…</p>}
      {!error && requests?.length === 0 && (
        <NewRequestForm mobile={mobile} admin={admin} onCreated={created => (created ? setRequests([created]) : setReloadKey(key => key + 1))} />
      )}
      <div className="cart-requests">
        {requests?.map(request => <RequestCard key={`${apiQuery}:${request.id}`} request={request} apiQuery={apiQuery} mobile={mobile} admin={admin} onSaved={replace} onCancelled={drop} />)}
      </div>
      {!admin && requests && requests.length > 0 && <p className="small-note cart-footnote">Our team sees your changes as soon as they’re saved. Need help? <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Chat with us</a></p>}
    </section>
  );
}

// An empty cart takes the order right here: the number comes from the link. Save creates the order; after that it is
// an ordinary cart.
function NewRequestForm({ mobile, admin, onCreated }: { mobile: string; admin: boolean; onCreated: (created?: CartRequest) => void }) {
  const [items, setItems] = useState<EditorItem[]>(() => [emptyItem()]);
  const [name, setName] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const creating = useRef(false);

  const touched = items.some(item => item.productUrl.trim()) || !!name.trim() || !!deliveryLocation.trim();
  useUnsavedWarning(touched);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating.current) return;
    const problem = draftProblem(items, deliveryLocation, name);
    if (problem) { toast.error(`Please ${problem}.`); return; }
    creating.current = true;
    setSaving(true);
    try {
      const response = await fetch("/api/cart", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: fromEditorItems(items), name: name.trim(), mobile: `+977${mobile}`, deliveryLocation: deliveryLocation.trim(), notes: notes.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { toast.error(result.error || "Couldn’t save the order. Please try again."); return; }
      toast.success(admin ? "Order created" : "Order saved");
      // The server sends the saved request back, so the cart shows it without loading again.
      onCreated(result.request);
    } catch {
      toast.error("Couldn’t save the order. Check your connection and try again.");
    } finally {
      creating.current = false;
      setSaving(false);
    }
  }

  return (
    <article className="cart-request">
      <p className="cart-request-meta">
        <strong>{admin ? "No current orders — add one" : "No current orders"}</strong>
        <span>{admin ? `Enter the products for +977 ${mobile}, then tap Save.` : "Add the products you want, then tap Save. We’ll send you a quote."}</span>
      </p>
      <form className="form-panel order-form cart-form" onSubmit={create}>
        <OrderItemsEditor items={items} setItems={setItems} idPrefix="new" />
        <fieldset className="cart-delivery">
          <legend>Delivery</legend>
          <div className="form-field"><label htmlFor="new-name">Name *</label><input id="new-name" className="order-input" required autoComplete={admin ? "off" : "name"} maxLength={80} placeholder="e.g. Sita Sharma" value={name} onChange={event => setName(event.target.value)} /></div>
          <div className="form-field"><label htmlFor="new-address">Address *</label><input id="new-address" className="order-input" required autoComplete={admin ? "off" : "street-address"} placeholder="New Baneswor, Kathmandu" value={deliveryLocation} onChange={event => setDeliveryLocation(event.target.value)} /></div>
          <div className="form-field"><label htmlFor="new-mobile">WhatsApp number</label><input id="new-mobile" className="order-input" value={`+977${mobile}`} readOnly disabled /></div>
          <div className="form-field"><label htmlFor="new-notes">Note for the whole order <span className="font-normal">(optional)</span></label><textarea id="new-notes" className="order-input" rows={2} placeholder="e.g. Need it before Tihar" value={notes} onChange={event => setNotes(event.target.value)} /></div>
        </fieldset>
        <div className="order-submit cart-save-bar">
          <p className="order-summary"><strong>{items.length} {items.length === 1 ? "product" : "products"}</strong><span>{countPieces(items)} {countPieces(items) === 1 ? "piece" : "pieces"}</span></p>
          <button type="submit" disabled={saving} className="button-primary">{saving ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </article>
  );
}

function RequestCard({ request, apiQuery, mobile, admin, onSaved, onCancelled }: {
  request: CartRequest; apiQuery: string; mobile: string; admin: boolean; onSaved: (r: CartRequest) => void; onCancelled: (id: string) => void;
}) {
  const [items, setItems] = useState<EditorItem[]>(() => toEditorItems(request.items));
  const [customerName, setCustomerName] = useState(request.customerName);
  const [deliveryLocation, setDeliveryLocation] = useState(request.deliveryLocation);
  const [notes, setNotes] = useState(request.notes);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const inFlight = useRef(false);
  const idPrefix = `cart-${request.id}`;

  const savedShape = useMemo(() => JSON.stringify([request.items.map(({ productUrl, quantity, details }) => ({ productUrl, quantity, details })), request.customerName, request.deliveryLocation, request.notes]), [request]);
  const draft = JSON.stringify([fromEditorItems(items), customerName.trim(), deliveryLocation.trim(), notes.trim()]);
  const dirty = draft !== savedShape;
  useUnsavedWarning(dirty);

  // A save from elsewhere (the customer, the team, another tab) arrives live. With no unsaved edits here the boxes
  // simply show it; with unsaved edits they are kept and a warning offers the latest copy instead.
  const remoteShape = JSON.stringify([request.items, request.customerName, request.deliveryLocation, request.notes]);
  const [seen, setSeen] = useState({ remote: remoteShape, saved: savedShape });
  const [conflict, setConflict] = useState(false);
  const loadLatest = () => {
    setItems(toEditorItems(request.items)); setCustomerName(request.customerName);
    setDeliveryLocation(request.deliveryLocation); setNotes(request.notes); setConflict(false);
  };
  if (remoteShape !== seen.remote) {
    setSeen({ remote: remoteShape, saved: savedShape });
    if (draft === seen.saved) loadLatest();
    else if (draft !== savedShape && !saving) setConflict(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !dirty) return;
    const problem = draftProblem(items, deliveryLocation);
    if (problem) { toast.error(`Please ${problem}.`); return; }
    inFlight.current = true;
    setSaving(true);
    try {
      const response = await fetch(`/api/cart?${apiQuery}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: request.id, items: fromEditorItems(items), customerName: customerName.trim(), deliveryLocation: deliveryLocation.trim(), notes: notes.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result.error === "expired" ? "This order can no longer be changed." : result.error || "Couldn’t save. Please try again.");
        return;
      }
      // Only the saved copy is replaced, so the boxes being edited are left alone; Save shows again on the next change.
      onSaved(result.request);
      setJustSaved(true);
      setConflict(false);
    } catch {
      toast.error("Couldn’t save. Check your connection and try again.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  // Team only: product pictures, read like the orders page does (the extension first, then the server).
  const [fetchingImages, setFetchingImages] = useState("");
  async function fetchImages() {
    const missing = request.items.filter(item => !item.imageUrl);
    const targets = missing.length ? missing : request.items;
    const found: { productUrl: string; imageUrl: string }[] = [];
    try {
      for (const [n, item] of targets.entries()) {
        setFetchingImages(`${n + 1}/${targets.length}`);
        const notes = item.details.map(d => `${d.label}: ${d.value}`).join(", ");
        let imageUrl = (await fetchStoreImageViaExtension(item.productUrl, notes)).image;
        if (!imageUrl) {
          const response = await fetch("/api/fetch-product-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productUrl: item.productUrl, notes }) }).catch(() => null);
          const result = response ? await response.json().catch(() => ({})) : {};
          imageUrl = response?.ok && typeof result.imageUrl === "string" ? result.imageUrl : null;
        }
        if (imageUrl) found.push({ productUrl: item.productUrl, imageUrl });
      }
      if (!found.length) { toast.error("Couldn’t find any product pictures."); return; }
      const response = await fetch("/api/cart/images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: request.id, images: found }) });
      if (!response.ok) { toast.error("Found pictures, but saving them failed."); return; }
      const byUrl = new Map(found.map(f => [f.productUrl, f.imageUrl]));
      onSaved({ ...request, items: request.items.map(item => (byUrl.has(item.productUrl) ? { ...item, imageUrl: byUrl.get(item.productUrl) } : item)) });
      // Show them in the cards now, without touching anything being edited.
      setItems(current => current.map(item => {
        const link = fromEditorItems([item])[0].productUrl;
        return byUrl.has(link) ? { ...item, imageUrl: byUrl.get(link), imageOf: link } : item;
      }));
      toast.success(`${found.length} of ${targets.length} pictures found`);
    } finally {
      setFetchingImages("");
    }
  }

  // Team only: whether the order this cart points to still exists. If it was deleted on the orders page, the cart
  // forgets it (for the customer too) and offers Create order again.
  const orderExists = useOrderExists(admin ? request.orderId : undefined);
  const linked: CartRequest = orderExists === false ? { ...request, orderId: undefined, orderSyncedAt: undefined, ordered: false } : request;
  useEffect(() => {
    if (orderExists !== false || !request.orderId) return;
    updateDoc(doc(db, ORDER_REQUESTS, request.id), { orderId: deleteField(), orderSyncedAt: deleteField() }).catch(() => {});
  }, [orderExists, request.id, request.orderId]);

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
          {!admin && <span className="cart-expiry">Editable until {dateLabel(request.createdAt + CART_DAYS * 86_400_000)}</span>}
        </p>
        <div className="cart-request-actions">
          {admin && <button type="button" className="cart-images-btn" disabled={!!fetchingImages} onClick={fetchImages}>{fetchingImages ? `Images ${fetchingImages}…` : "Fetch images"}</button>}
          {request.ordered && !admin
            ? <span className="cart-confirmed">✓ Order confirmed</span>
            : <button type="button" className="cart-cancel" onClick={cancelRequest}>Cancel</button>}
        </div>
      </div>

      {conflict && (
        <div className="cart-conflict" role="alert">
          <p>This order was just changed somewhere else. Saving now will replace those changes with yours.</p>
          <button type="button" onClick={loadLatest}>Show the latest instead</button>
        </div>
      )}

      {admin && cartChangedSinceOrder(linked) && (
        <div className="cart-order-alert" role="alert">
          <span className="cart-order-alert-icon" aria-hidden="true">!</span>
          <p>
            <strong>Order out of date.</strong> The cart changed on {dateLabel(linked.updatedAt!, true)}, after the order was {linked.orderSyncedAt ? "last updated" : "created"}.{" "}
            {linked.quote
              ? <>The quotation was updated automatically — tap <strong>Update the order</strong> below.</>
              : <>Price the new products, then tap <strong>Update the order</strong> below.</>}
          </p>
        </div>
      )}

      <form className="form-panel order-form cart-form" onSubmit={save}>
        <OrderItemsEditor items={items} setItems={setItems} idPrefix={idPrefix} priceFor={request.quote ? link => request.items.find(item => item.productUrl === link)?.priceInr : undefined} />
        <fieldset className="cart-delivery">
          <legend>Delivery</legend>
          <div className="form-field"><label htmlFor={`${idPrefix}-name`}>Name</label><input id={`${idPrefix}-name`} className="order-input" autoComplete="name" maxLength={80} placeholder="e.g. Sita Sharma" value={customerName} onChange={event => setCustomerName(event.target.value)} /></div>
          <div className="form-field"><label htmlFor={`${idPrefix}-address`}>Address *</label><input id={`${idPrefix}-address`} className="order-input" required autoComplete="street-address" placeholder="New Baneswor, Kathmandu" value={deliveryLocation} onChange={event => setDeliveryLocation(event.target.value)} /></div>
          <div className="form-field"><label htmlFor={`${idPrefix}-notes`}>Note for the whole order <span className="font-normal">(optional)</span></label><textarea id={`${idPrefix}-notes`} className="order-input" rows={2} placeholder="e.g. Need it before Tihar" value={notes} onChange={event => setNotes(event.target.value)} /></div>
        </fieldset>
        {dirty ? (
          <div className="order-submit cart-save-bar">
            <p className="order-summary"><strong>{items.length} {items.length === 1 ? "product" : "products"}</strong><span>{countPieces(items)} {countPieces(items) === 1 ? "piece" : "pieces"}</span></p>
            <button type="submit" disabled={saving} className="button-primary">{saving ? "Saving…" : "Save"}</button>
          </div>
        ) : justSaved && <p className="cart-save-status is-saved" role="status">✓ Saved</p>}
      </form>

      {!admin && request.quote && <QuoteBill request={request} changing={dirty} />}

      {/* Remounts with fresh price boxes when the products or quantities change. */}
      {admin && <QuotePanel key={JSON.stringify(request.items.map(item => [item.productUrl, item.quantity]))} request={linked} mobile={mobile} unsaved={dirty} onSaved={onSaved} orderDeleted={orderExists === false && !!request.orderId} />}
    </article>
  );
}

// ── Team only: read each product's price through the ParcelSewa extension (like "Verify" on the orders page),
//    or type it in, then copy a quotation in the quotation calculator's format. ───────────────────────────────
function QuotePanel({ request, mobile, unsaved, onSaved, orderDeleted }: { request: CartRequest; mobile: string; unsaved: boolean; onSaved: (r: CartRequest) => void; orderDeleted: boolean }) {
  const [prices, setPrices] = useState<string[]>(() => request.items.map(item => (item.priceInr ? String(item.priceInr) : "")));
  const [status, setStatus] = useState<string[]>(() => request.items.map(() => ""));
  const [reading, setReading] = useState(false);
  // null = automatic service fee (picked from the total); the server keeps it automatic when products change.
  const [rate, setRate] = useState<CommissionOption | null>(request.quote && !request.quote.rateAuto ? request.quote.rate : null);
  const [copyState, setCopyState] = useState("");
  // What the customer has already paid; typed by the team and shown on the customer's bill.
  const [advance, setAdvance] = useState(String(request.quote?.advance ?? 0));
  const [savingQuote, setSavingQuote] = useState(false);

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

  // On a computer with the ParcelSewa extension, prices are read through it (like "Verify" on the orders page).
  // Without it (phones), or when the extension can't read a page, the server asks Claude instead.
  async function readPrices(only?: number) {
    setReading(true);
    setCopyState("");
    const indexes = request.items.map((_, i) => i).filter(i => (only !== undefined ? i === only : !prices[i]));
    const done = (i: number, price: number | null, note: string) => {
      if (price) { setPrices(current => setAt(current, i, String(price))); setStatus(current => setAt(current, i, "")); }
      else setStatus(current => setAt(current, i, `Couldn’t read the price (${note}). Type it in.`));
    };
    try {
      const withExtension = await hasExtension();
      // The extension opens store pages one at a time; Claude lookups run side by side.
      const leftForClaude: number[] = [];
      if (withExtension) {
        for (const i of indexes) {
          setStatus(current => setAt(current, i, "Reading price…"));
          const { price } = await fetchProductPriceViaExtension(request.items[i].productUrl);
          if (price) done(i, price, ""); else leftForClaude.push(i);
        }
      } else {
        leftForClaude.push(...indexes);
      }
      await Promise.all(leftForClaude.map(async i => {
        setStatus(current => setAt(current, i, withExtension ? "Extension couldn’t read it — asking Claude…" : "Asking Claude for the price…"));
        const { price, note } = await fetchProductPriceViaClaude(request.items[i].productUrl);
        done(i, price, note);
      }));
    } finally {
      setReading(false);
    }
  }

  const advanceAmount = Number(advance || 0);
  // Whether the prices, fee or advance differ from the quotation the customer currently sees.
  const quoteChanged = !!quotation && (!request.quote
    || request.quote.totalNPR !== quotation.totalNPR || request.quote.rate !== appliedRate || (request.quote.advance ?? 0) !== Math.round(advanceAmount)
    || request.items.some((item, i) => item.priceInr !== lines[i].priceInr));

  /** Saves prices, fee and advance on the request; the customer's cart then shows them as a bill. */
  async function saveQuote(): Promise<boolean> {
    if (!quotation) return false;
    if (!Number.isFinite(advanceAmount) || advanceAmount < 0) { toast.error("Advance can’t be negative."); return false; }
    setSavingQuote(true);
    try {
      const response = await fetch("/api/cart/quote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: request.id, prices: lines.map(line => line.priceInr), rate: appliedRate, rateAuto: rate === null, totalNPR: quotation.totalNPR, advance: advanceAmount }),
      });
      if (!response.ok) { toast.error("Saving the quotation failed. Please try again."); return false; }
      onSaved({ ...request, items: request.items.map((item, i) => ({ ...item, priceInr: lines[i].priceInr })), quote: { rate: appliedRate, rateAuto: rate === null, totalNPR: quotation.totalNPR, advance: Math.round(advanceAmount), quotedAt: Date.now() } });
      return true;
    } catch {
      toast.error("Saving the quotation failed. Check your connection.");
      return false;
    } finally {
      setSavingQuote(false);
    }
  }

  async function updateQuote() {
    if (await saveQuote()) toast.success(request.quote ? "Quotation updated — the customer sees it now" : "Quotation saved — the customer sees it now");
  }

  async function copy() {
    if (!quotation) return;
    try {
      await navigator.clipboard.writeText(quotation.message);
      setCopyState("Quotation copied");
    } catch {
      setCopyState("Clipboard blocked — copy it from the preview below.");
    }
    // Copying also saves the quotation, so the customer's cart shows it.
    if (quoteChanged) await saveQuote();
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
              <input id={`price-${request.id}-${i}`} type="number" onWheel={event => event.currentTarget.blur()} inputMode="decimal" min="0.01" step="0.01" placeholder="Price" value={prices[i] ?? ""} onChange={event => { setPrices(current => setAt(current, i, event.target.value)); setStatus(current => setAt(current, i, "")); setCopyState(""); }} />
              <button type="button" aria-label={`Fetch price of product ${i + 1}`} title="Fetch this price" disabled={reading || unsaved} onClick={() => readPrices(i)}>↻</button>
            </div>
            {status[i] && <p className={status[i].startsWith("Couldn’t") ? "cart-quote-status is-error" : "cart-quote-status"}>{status[i]}</p>}
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
          <div className="cart-quote-advance">
            <label htmlFor={`advance-quote-${request.id}`}>Advance paid (NPR)</label>
            <input id={`advance-quote-${request.id}`} type="number" onWheel={event => event.currentTarget.blur()} inputMode="numeric" min="0" value={advance} onChange={event => { setAdvance(event.target.value); setCopyState(""); }} />
          </div>
          <div className="estimate-line"><span>Remaining to pay</span><strong>{npr(Math.max(0, quotation.totalNPR - (Number.isFinite(advanceAmount) ? Math.round(advanceAmount) : 0)))}</strong></div>
          <div className="cart-quote-buttons">
            <button type="button" className="button-secondary" disabled={unsaved || savingQuote || !quoteChanged} onClick={updateQuote}>{savingQuote ? "Saving…" : !quoteChanged ? "✓ Customer sees this" : request.quote ? "Update quotation" : "Save quotation"}</button>
            <button type="button" className="button-primary" disabled={unsaved} onClick={copy}>{copyState === "Quotation copied" ? "✓ Copied" : "Copy quotation"}</button>
          </div>
          {copyState && copyState !== "Quotation copied" && <p className="cart-quote-status is-error">{copyState}</p>}
          <details className="quotation-preview" open={copyState.startsWith("Clipboard")}><summary>Preview message</summary><pre>{quotation.message}</pre></details>
        </div>
      ) : (
        <p className="small-note">Fetch or type every product’s price to see the quotation.</p>
      )}

      <CreateOrderPanel request={request} orderDeleted={orderDeleted} mobile={mobile} unsaved={unsaved} rate={appliedRate} quotedTotal={quotation?.totalNPR ?? null} quotedAdvance={Number.isFinite(advanceAmount) ? Math.round(advanceAmount) : 0} onCreated={(orderId, syncedAt) => onSaved({ ...request, orderId, orderSyncedAt: syncedAt })} />
    </section>
  );
}

// ── Team only: create the order on the orders page from this cart, or bring an existing order up to date. ────────
function CreateOrderPanel({ request, orderDeleted, mobile, unsaved, rate, quotedTotal, quotedAdvance, onCreated }: {
  request: CartRequest; orderDeleted: boolean; mobile: string; unsaved: boolean; rate: CommissionOption; quotedTotal: number | null; quotedAdvance: number;
  onCreated: (orderId: string, syncedAt: number) => void;
}) {
  const [storeName, setStoreName] = useState(() => orderStoreName(request.items, brands));
  const [total, setTotal] = useState("");
  const [typedTotal, setTypedTotal] = useState(false);
  const [advance, setAdvance] = useState("");
  const [typedAdvance, setTypedAdvance] = useState(false);
  const [working, setWorking] = useState(false);
  // Total and advance follow the quotation until the team types its own here.
  const shownTotal = typedTotal ? total : quotedTotal ? String(quotedTotal) : total;
  const shownAdvance = typedAdvance ? advance : String(quotedAdvance);
  const existing = !!request.orderId;
  const upToDate = existing && !cartChangedSinceOrder(request);

  async function saveOrder() {
    const totalAmount = Number(shownTotal), advancePayment = Number(shownAdvance || 0);
    if (!request.customerName.trim()) { toast.error("Add the customer’s name in the Delivery box first."); return; }
    if (!storeName.trim()) { toast.error("Enter the store name."); return; }
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) { toast.error("Enter the total amount in NPR — quote the products first."); return; }
    if (!Number.isFinite(advancePayment) || advancePayment < 0) { toast.error("Advance payment can’t be negative."); return; }
    const question = existing
      ? `Update the order for ${request.customerName} with the cart's ${request.items.length} products — NPR ${totalAmount.toLocaleString("en-IN")}?`
      : `Create an order for ${request.customerName} — NPR ${totalAmount.toLocaleString("en-IN")}?`;
    if (!window.confirm(question)) return;
    setWorking(true);
    try {
      const details = {
        name: request.customerName.trim(),
        mobile: `+977${mobile}`,
        notes: orderNotes(request.items, request.notes),
        address: request.deliveryLocation,
        storeName: storeName.trim(),
        commission: commissionText(rate),
        totalAmount,
        advancePayment,
      };
      // The database's own clock, the same one the cart's "edited" time uses, so the two can be compared.
      const syncedAt = serverTimestamp();
      let orderId = request.orderId;
      if (orderId) {
        // Only what the cart owns changes; delivery status, dates and per-product ticks stay as they are.
        const ref = doc(db, "Confirm Orders", orderId);
        const before = (await getDoc(ref)).data();
        if (!before) { toast.error("That order no longer exists on the orders page."); return; }
        const changes = { ...details, ...syncOrderProducts(before, request.items) };
        await updateDoc(ref, changes);
        await logOrderActivity({ action: "edited", orderId, before: { id: orderId, ...before }, after: { id: orderId, ...before, ...changes }, page: "cart" });
      } else {
        const newOrder = {
          ...details,
          orderedDate: Timestamp.now(),
          courierCharge: "Included",
          // New orders always start as not delivered; the admin page marks delivery.
          deliveryStatus: false,
          ...orderProducts(request.items),
          createdAt: Timestamp.now(),
          fromRequestId: request.requestId,
        };
        const created = await addDoc(collection(db, "Confirm Orders"), newOrder);
        orderId = created.id;
        await logOrderActivity({ action: "created", orderId, after: newOrder, page: "cart" });
      }
      await updateDoc(doc(db, ORDER_REQUESTS, request.id), { orderId, orderSyncedAt: syncedAt, ...(existing ? {} : { orderCreatedAt: syncedAt }) });
      // The live update brings the exact saved time; until then, now.
      toast.success(existing ? "Order updated" : "Order created");
      onCreated(orderId, Date.now());
    } catch (error) {
      console.error("Saving the order failed:", error);
      toast.error(existing ? "Couldn’t update the order. Please try again." : "Couldn’t create the order. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="cart-create-order">
      <div className="cart-create-head">
        <h3>{existing ? "Order" : "Create order"}</h3>
        {upToDate && <span className="cart-order-flag">✓ Up to date</span>}
      </div>
      {orderDeleted && <p className="cart-quote-warn">The earlier order was deleted from the orders page. Create it again if it’s still needed.</p>}
      {existing && <p className="small-note">On the orders page since {dateLabel(request.orderSyncedAt ?? 0, true)}. <a href="/admin" className="underline underline-offset-4">Open orders</a></p>}
      <div className="cart-create-grid">
        <div className="form-field"><label htmlFor={`store-${request.id}`}>Store</label><input id={`store-${request.id}`} list="cart-store-options" className="order-input" value={storeName} onChange={event => setStoreName(event.target.value)} /></div>
        <div className="form-field"><label htmlFor={`commission-${request.id}`}>Commission</label><input id={`commission-${request.id}`} className="order-input" value={commissionText(rate)} readOnly disabled /></div>
        <div className="form-field"><label htmlFor={`total-${request.id}`}>Total (NPR)</label><input id={`total-${request.id}`} className="order-input" type="number" onWheel={event => event.currentTarget.blur()} inputMode="numeric" min="1" value={shownTotal} placeholder="From the quotation" onChange={event => { setTypedTotal(true); setTotal(event.target.value); }} /></div>
        <div className="form-field"><label htmlFor={`advance-${request.id}`}>Advance paid (NPR)</label><input id={`advance-${request.id}`} className="order-input" type="number" onWheel={event => event.currentTarget.blur()} inputMode="numeric" min="0" value={shownAdvance} onChange={event => { setTypedAdvance(true); setAdvance(event.target.value); }} /></div>
      </div>
      <datalist id="cart-store-options">{brands.map(b => <option key={b.name} value={b.name} />)}</datalist>
      <p className="small-note">Uses {request.customerName || "the customer’s name"}, +977 {mobile}, the address and the products above{existing ? "; products still in the cart keep their pictures and received ticks" : ""}. Sizes, colours and notes go into the order’s notes.</p>
      <button type="button" className="button-primary" disabled={working || unsaved} onClick={saveOrder}>{working ? (existing ? "Updating…" : "Creating…") : existing ? "Update the order" : "Create order"}</button>
      {unsaved && <p className="cart-quote-warn">Save the cart changes above first.</p>}
    </div>
  );
}

/** True when the cart was edited (by the customer or the team) after the order was last brought up to date. */
function cartChangedSinceOrder(request: CartRequest) {
  return !!request.orderId && !!request.updatedAt && request.updatedAt > (request.orderSyncedAt ?? 0) + 1000;
}

// ── Customer: the team's saved quotation as a bill, under the products. ─────────────────────────────────────────
function QuoteBill({ request, changing }: { request: CartRequest; changing: boolean }) {
  const quote = request.quote!;
  const lines = request.items.map(item => ({ priceInr: item.priceInr ?? NaN, quantity: item.quantity }));
  if (!lines.every(line => Number.isFinite(line.priceInr) && line.priceInr > 0)) return null;
  let bill: ReturnType<typeof cartQuotation>;
  try { bill = cartQuotation(lines, quote.rate); } catch { return null; }
  const total = bill.totalNPR;
  const advance = Math.min(quote.advance ?? 0, total);
  return (
    <section className="cart-bill" aria-label="Your quotation">
      <div className="cart-bill-head"><h3>Your quotation</h3><span>{dateLabel(quote.quotedAt, true)}</span></div>
      <div className="cart-bill-line"><span>Products · INR {bill.totalInr.toLocaleString("en-IN")} × 1.6</span><strong>{npr(bill.productNPR)}</strong></div>
      <div className="cart-bill-line"><span>Service & handling · {bill.serviceLabel}</span><strong>{npr(bill.serviceNPR)}</strong></div>
      <div className="cart-bill-line is-total"><span>Total</span><strong>{npr(total)}</strong></div>
      {advance > 0 && <div className="cart-bill-line is-paid"><span>Advance paid</span><strong>− {npr(advance)}</strong></div>}
      {advance > 0 && <div className="cart-bill-line is-due"><span>Remaining to pay</span><strong>{npr(total - advance)}</strong></div>}
      <p className="cart-bill-note">+ courier charge (NPR 180/kg), paid on delivery.</p>
      {changing && <p className="cart-bill-warn">Saving changes to products or quantities sends them to our team for a new quote.</p>}
    </section>
  );
}

/** Team only: true / false once known whether an order exists on the orders page (live), null while checking. */
function useOrderExists(orderId: string | undefined): boolean | null {
  const [state, setState] = useState<{ id: string; exists: boolean } | null>(null);
  useEffect(() => {
    if (!orderId) return;
    // If the check itself fails, assume the order is there rather than offering a duplicate.
    return onSnapshot(doc(db, "Confirm Orders", orderId), snap => setState({ id: orderId, exists: snap.exists() }), () => setState({ id: orderId, exists: true }));
  }, [orderId]);
  return orderId && state?.id === orderId ? state.exists : null;
}
