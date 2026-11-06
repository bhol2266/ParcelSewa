"use client";

import WhatsAppLink from "@/components/WhatsAppLink";
import OrderItemsEditor, { checkItems, countPieces, emptyItem, fromEditorItems, type EditorItem } from "@/components/OrderItemsEditor";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { SUPPORT_URL } from "@/lib/storefront";
import { requestMessage } from "@/lib/cart";

export default function OrderRequestComponent({ festivalOffer = false }: { festivalOffer?: boolean }) {
  const [items, setItems] = useState<EditorItem[]>(() => [emptyItem(0)]);
  const [mobile, setMobile] = useState("+977");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [whatsappDraft, setWhatsappDraft] = useState("");
  const [savedRequestId, setSavedRequestId] = useState("");
  const [savedCartUrl, setSavedCartUrl] = useState("");
  const [firstOrderOfferRequested, setFirstOrderOfferRequested] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const offerRequested = festivalOffer && firstOrderOfferRequested;
  const totalUnits = countPieces(items);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const problem = checkItems(items, "order");
    if (problem) { toast.error(problem); return; }
    if (!deliveryLocation.trim() || !/^\+9779\d{9}$/.test(mobile.trim())) {
      toast.error("Check your delivery address and Nepal WhatsApp number.");
      return;
    }
    const products = fromEditorItems(items);
    try {
      setLoading(true);
      setWhatsappDraft("");
      // The server saves the request and signs the customer's /cart link.
      const response = await fetch("/api/cart", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: products, mobile: mobile.trim(), deliveryLocation: deliveryLocation.trim(), notes: notes.trim(), firstOrderOfferRequested: offerRequested }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { toast.error(result.error || "We couldn’t save your request. Please try again."); return; }
      const cartUrl = `${window.location.origin}${result.cartPath}`;
      const message = requestMessage({
        title: "🛒 *New Order*", requestId: result.requestId, items: products,
        deliveryLocation: deliveryLocation.trim(), notes: notes.trim(), cartUrl,
        offerNote: offerRequested ? "🎉 First order — festival offer (10% off service fee) requested" : null,
      });
      const whatsappUrl = `${SUPPORT_URL}?text=${encodeURIComponent(message)}`;
      setWhatsappDraft(whatsappUrl);
      setSavedRequestId(result.requestId);
      setSavedCartUrl(result.cartPath);
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      toast.success("Request saved. Send the prepared WhatsApp message to continue.");
      setItems([emptyItem()]); setMobile("+977"); setDeliveryLocation(""); setNotes(""); setShowNotes(false);
      setFirstOrderOfferRequested(false);
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("We couldn’t save your request. Please try again or contact support.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="storefront page-container inner-page form-page order-page">
      <Toaster position="top-center" />
      <div className="order-intro">
        <p className="eyebrow order-desktop-only">Let’s start with your wishlist</p>
        <div className="request-progress order-desktop-only"><strong>01 Your request</strong><span>→</span><span>02 Team review</span><span>→</span><span>03 Confirm your quote</span></div>
        <h1>Found it in India?{" "}<br /><span className="accent-text">Let’s bring it home.</span></h1>
        <p className="section-description">Paste your product links — we’ll send you a quote in NPR on WhatsApp. No payment now.</p>
        <div className="form-tip order-desktop-only"><h2>A few details make a better quote</h2><ul><li>Add each product separately, with its own size, colour, or notes.</li><li>Tell us your full delivery address in Nepal.</li><li>Shopping for a festival date? Mention your deadline.</li><li>Wait for confirmation before making a payment.</li></ul></div>
        <div className="order-desktop-only"><Link href="/price-calculator" className="text-link mt-6">Want a budget estimate first? Try the calculator →</Link><p className="small-note mt-5">Need help choosing a link? <WhatsAppLink>Chat with our team</WhatsAppLink></p></div>
      </div>
      <div>
        {whatsappDraft && <div className="surface-panel order-saved mb-5" role="status"><h2 className="text-xl">Request {savedRequestId} saved</h2><p className="small-note mt-2">If WhatsApp didn’t open, tap below and press send. To add, remove or change products later, use your cart link (valid for 7 days).</p><WhatsAppLink href={whatsappDraft} className="mt-4">Continue on WhatsApp</WhatsAppLink>{savedCartUrl && <Link href={savedCartUrl} className="text-link mt-4 block">Open my cart →</Link>}</div>}
        <form onSubmit={handleSubmit} className="form-panel order-form">
          {festivalOffer && <div className="order-offer-panel"><p className="eyebrow">Dashain & Tihar offer</p><h3>10% off your first order’s service fee</h3><label htmlFor="first-order-offer"><input id="first-order-offer" type="checkbox" checked={firstOrderOfferRequested} onChange={event => setFirstOrderOfferRequested(event.target.checked)} /><span>This is my first ParcelSewa order. Please apply the service fee offer.</span></label><p>Our team verifies eligibility and confirms the discount in your quote. Product and delivery charges are unchanged.</p><Link href="/offers#offer-details">Read offer details →</Link></div>}

          <OrderItemsEditor items={items} setItems={setItems} idPrefix="order" />

          <div className="order-contact">
            <div className="form-field"><label htmlFor="order-location">Delivery address *</label><input id="order-location" className="order-input" name="deliveryLocation" required autoComplete="street-address" placeholder="New Baneswor, Kathmandu" value={deliveryLocation} onChange={event => setDeliveryLocation(event.target.value)} /></div>
            <div className="form-field"><label htmlFor="order-mobile">WhatsApp number *</label><input id="order-mobile" className="order-input" name="mobile" type="tel" required autoComplete="tel" inputMode="tel" pattern="\+9779[0-9]{9}" title="Enter +977 followed by your 10-digit Nepal mobile number." value={mobile} onChange={event => setMobile(event.target.value)} placeholder="+97798XXXXXXXX" /></div>
          </div>

          {showNotes || notes
            ? <div className="form-field"><label htmlFor="order-notes">Note for the whole order</label><textarea id="order-notes" className="order-input" name="notes" rows={2} value={notes} onChange={event => setNotes(event.target.value)} placeholder="e.g. Need it before Tihar" /></div>
            : <button type="button" className="order-detail-toggle" onClick={() => { setShowNotes(true); setTimeout(() => document.getElementById("order-notes")?.focus(), 0); }}><span aria-hidden="true">+</span> Note for the whole order</button>}

          <div className="order-submit">
            <p className="order-summary"><strong>{items.length} {items.length === 1 ? "product" : "products"}</strong><span>{totalUnits} {totalUnits === 1 ? "piece" : "pieces"}</span></p>
            <button type="submit" disabled={loading} className="button-primary">{loading ? "Saving…" : "Send on WhatsApp"}</button>
          </div>
          <p className="small-note">Opens WhatsApp with your request ready — just press send. No payment now. By sending you agree to our <Link href="/terms" className="underline underline-offset-4">Terms</Link> and <Link href="/returnsPolicy" className="underline underline-offset-4">Returns Policy</Link>.</p>
          <p className="small-note order-mobile-only">Need help? <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Chat with us</a> · <Link href="/price-calculator" className="underline underline-offset-4">Price calculator</Link></p>
        </form>
      </div>
    </section>
  );
}
