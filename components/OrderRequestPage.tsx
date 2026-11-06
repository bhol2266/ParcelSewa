"use client";

import WhatsAppLink from "@/components/WhatsAppLink";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import toast, { Toaster } from "react-hot-toast";
import { festivalCampaign, SUPPORT_URL } from "@/lib/storefront";

// One product in the customer's request. `key` only keeps React rows stable while items are added and removed.
type OrderItem = { key: number; productUrl: string; quantity: number; size: string; color: string; notes: string };

const MAX_ITEMS = 20;
let nextKey = 1;
const emptyItem = (): OrderItem => ({ key: nextKey++, productUrl: "", quantity: 1, size: "", color: "", notes: "" });

// Short code the customer and team can both quote in WhatsApp, e.g. PS-R-4K7Q2.
function makeRequestId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return `PS-R-${id}`;
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export default function OrderRequestComponent({ festivalOffer = false }: { festivalOffer?: boolean }) {
  const [items, setItems] = useState<OrderItem[]>(() => [emptyItem()]);
  const [mobile, setMobile] = useState("+977");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [whatsappDraft, setWhatsappDraft] = useState("");
  const [savedRequestId, setSavedRequestId] = useState("");
  const [firstOrderOfferRequested, setFirstOrderOfferRequested] = useState(false);
  const offerRequested = festivalOffer && firstOrderOfferRequested;
  const totalUnits = items.reduce((sum, item) => sum + (Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 0), 0);

  function updateItem(key: number, changes: Partial<OrderItem>) {
    setItems(current => current.map(item => (item.key === key ? { ...item, ...changes } : item)));
  }

  function addItem() {
    if (items.length >= MAX_ITEMS) {
      toast.error(`You can add up to ${MAX_ITEMS} products in one request.`);
      return;
    }
    const added = emptyItem();
    setItems(current => [...current, added]);
    // Move the customer straight to the new product's link field.
    setTimeout(() => document.getElementById(`order-product-${added.key}`)?.focus(), 0);
  }

  function removeItem(key: number) {
    setItems(current => (current.length > 1 ? current.filter(item => item.key !== key) : current));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const badLink = items.findIndex(item => !isValidUrl(item.productUrl));
    if (badLink !== -1) {
      toast.error(`Product ${badLink + 1}: enter a valid product link beginning with https://.`);
      document.getElementById(`order-product-${items[badLink].key}`)?.focus();
      return;
    }
    const badQuantity = items.findIndex(item => !Number.isInteger(item.quantity) || item.quantity < 1);
    if (badQuantity !== -1) {
      toast.error(`Product ${badQuantity + 1}: quantity must be a whole number of at least 1.`);
      return;
    }
    if (!deliveryLocation.trim() || !/^\+9779\d{9}$/.test(mobile.trim())) {
      toast.error("Check your delivery location and Nepal WhatsApp number.");
      return;
    }
    const cleanItems = items.map(item => ({
      productUrl: item.productUrl.trim(), quantity: item.quantity,
      size: item.size.trim(), color: item.color.trim(), notes: item.notes.trim(),
    }));
    const requestId = makeRequestId();
    try {
      setLoading(true);
      setWhatsappDraft("");
      await addDoc(collection(db, "Order Request"), {
        requestId, items: cleanItems, itemCount: cleanItems.length,
        totalQuantity: cleanItems.reduce((sum, item) => sum + item.quantity, 0),
        // The first product is also kept at the top level, matching the older single-product records.
        productUrl: cleanItems[0].productUrl, quantity: cleanItems[0].quantity,
        mobile: mobile.trim(), deliveryLocation: deliveryLocation.trim(), notes: notes.trim(),
        selectedDate: Timestamp.now(), createdAt: Timestamp.now(),
        ...(offerRequested ? { offerCode: festivalCampaign.offerCode, firstOrderOfferRequested: true } : {}),
      });
      const itemLines = cleanItems.flatMap((item, index) => [
        "",
        `*${index + 1}.* 🔗 ${item.productUrl}`,
        `    📦 Qty: ${item.quantity}${item.size ? ` · Size: ${item.size}` : ""}${item.color ? ` · Colour: ${item.color}` : ""}`,
        item.notes ? `    📝 ${item.notes}` : null,
      ]);
      const message = [
        "🛒 *New Order Request*",
        `🆔 *Request ID:* ${requestId}`,
        `🧾 *Products:* ${cleanItems.length} (${cleanItems.reduce((sum, item) => sum + item.quantity, 0)} pcs)`,
        ...itemLines,
        "",
        `📍 *Delivery Location:* ${deliveryLocation.trim()}`,
        `📞 *Customer WhatsApp:* ${mobile.trim()}`,
        offerRequested ? "🎉 *Festival offer requested:* First ParcelSewa order — 10% off the service fee only. Please confirm eligibility and the discounted quote." : null,
        notes.trim() ? `📝 *Notes:* ${notes.trim()}` : null,
      ].filter(line => line !== null).join("\n");
      const whatsappUrl = `${SUPPORT_URL}?text=${encodeURIComponent(message)}`;
      setWhatsappDraft(whatsappUrl);
      setSavedRequestId(requestId);
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      toast.success("Request saved. Send the prepared WhatsApp message to continue.");
      setItems([emptyItem()]); setMobile("+977"); setDeliveryLocation(""); setNotes("");
      setFirstOrderOfferRequested(false);
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("We couldn’t save your request. Please try again or contact support.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="storefront page-container inner-page form-page">
      <Toaster position="top-center" />
      <div><p className="eyebrow">Let’s start with your wishlist</p><div className="request-progress"><strong>01 Your request</strong><span>→</span><span>02 Team review</span><span>→</span><span>03 Confirm your quote</span></div><h1>Found it in India?<br /><span className="accent-text">Let’s bring it home.</span></h1><p className="section-description">Paste the exact product links and tell us where you need them delivered. Add as many products as you like in one request — we’ll review them together and help you with a quote in NPR.</p><div className="form-tip"><h2>A few details make a better quote</h2><ul><li>Add each product separately with its own size and colour.</li><li>Tell us your city or municipality in Nepal.</li><li>Shopping for a festival date? Mention your deadline.</li><li>Wait for confirmation before making a payment.</li></ul></div><Link href="/price-calculator" className="text-link mt-6">Want a budget estimate first? Try the calculator →</Link><p className="small-note mt-5">Need help choosing a link? <WhatsAppLink>Chat with our team</WhatsAppLink></p></div>
      <div>
        {whatsappDraft && <div className="surface-panel mb-5" role="status"><h2 className="text-xl">Your request {savedRequestId} is saved.</h2><p className="small-note mt-3">If WhatsApp didn’t open, use the button below. Send the prepared message to continue with our team. Mention {savedRequestId} if you need to change anything.</p><WhatsAppLink href={whatsappDraft} className="mt-4">Continue on WhatsApp</WhatsAppLink></div>}
        <form onSubmit={handleSubmit} className="surface-panel form-panel">
          <div><h2>Your shopping request</h2><p className="small-note mt-2">No payment is collected in this form.</p></div>
          {festivalOffer && <div className="order-offer-panel"><p className="eyebrow">Dashain & Tihar offer</p><h3>10% off your first order’s service fee</h3><label htmlFor="first-order-offer"><input id="first-order-offer" type="checkbox" checked={firstOrderOfferRequested} onChange={event => setFirstOrderOfferRequested(event.target.checked)} /><span>This is my first ParcelSewa order. Please apply the service fee offer.</span></label><p>Our team verifies eligibility and confirms the discount in your quote. Product and delivery charges are unchanged.</p><Link href="/offers#offer-details">Read offer details →</Link></div>}

          <div className="order-items">
            {items.map((item, index) => (
              <fieldset key={item.key} className="order-item">
                <div className="order-item-head">
                  <legend>Product {index + 1}</legend>
                  {items.length > 1 && <button type="button" className="order-item-remove" onClick={() => removeItem(item.key)} aria-label={`Remove product ${index + 1}`}>Remove</button>}
                </div>
                <div className="form-field"><label htmlFor={`order-product-${item.key}`}>Product link <span aria-hidden="true">*</span></label><input id={`order-product-${item.key}`} type="url" required autoComplete="url" placeholder="https://www.amazon.in/…" value={item.productUrl} onChange={event => updateItem(item.key, { productUrl: event.target.value })} />{index === 0 && <p>Copy the full link from the retailer’s product page.</p>}</div>
                <div className="order-item-row">
                  <div className="form-field"><label htmlFor={`order-quantity-${item.key}`}>Quantity *</label><input id={`order-quantity-${item.key}`} type="number" min="1" step="1" required inputMode="numeric" value={Number.isNaN(item.quantity) ? "" : item.quantity} onChange={event => updateItem(item.key, { quantity: event.target.valueAsNumber })} /></div>
                  <div className="form-field"><label htmlFor={`order-size-${item.key}`}>Size</label><input id={`order-size-${item.key}`} placeholder="e.g. M, 9, 128GB" value={item.size} onChange={event => updateItem(item.key, { size: event.target.value })} /></div>
                  <div className="form-field"><label htmlFor={`order-color-${item.key}`}>Colour</label><input id={`order-color-${item.key}`} placeholder="e.g. Blue" value={item.color} onChange={event => updateItem(item.key, { color: event.target.value })} /></div>
                </div>
                <div className="form-field"><label htmlFor={`order-item-notes-${item.key}`}>Other details <span className="font-normal">(optional)</span></label><input id={`order-item-notes-${item.key}`} placeholder="e.g. model, variant, or a seller you prefer" value={item.notes} onChange={event => updateItem(item.key, { notes: event.target.value })} /></div>
              </fieldset>
            ))}
            <button type="button" className="button-secondary order-item-add" onClick={addItem} disabled={items.length >= MAX_ITEMS}>+ Add another product</button>
            <p className="small-note">{items.length} {items.length === 1 ? "product" : "products"} · {totalUnits} {totalUnits === 1 ? "piece" : "pieces"} in this request</p>
          </div>

          <div className="form-field"><label htmlFor="order-location">Delivery location *</label><input id="order-location" name="deliveryLocation" required autoComplete="address-level2" placeholder="e.g. Kathmandu" value={deliveryLocation} onChange={event => setDeliveryLocation(event.target.value)} /></div>
          <div className="form-field"><label htmlFor="order-mobile">WhatsApp number *</label><input id="order-mobile" name="mobile" type="tel" required autoComplete="tel" pattern="\+9779[0-9]{9}" title="Enter +977 followed by your 10-digit Nepal mobile number." value={mobile} onChange={event => setMobile(event.target.value)} placeholder="+97798XXXXXXXX" /><p>Include +977 followed by your 10-digit mobile number.</p></div>
          <div className="form-field"><label htmlFor="order-notes">Notes for the whole request <span className="font-normal">(optional)</span></label><textarea id="order-notes" name="notes" rows={3} value={notes} onChange={event => setNotes(event.target.value)} placeholder="e.g. Please deliver everything before my festival date." /></div>
          <button type="submit" disabled={loading} className="button-primary">{loading ? "Saving your request…" : items.length > 1 ? `Submit ${items.length} products` : "Submit my request"}</button>
          <p className="small-note">Submitting saves your details with ParcelSewa and opens WhatsApp with a prepared message. You’ll need to send that message yourself.</p>
          <p className="small-note">Before confirming your order, review our <Link href="/terms" className="underline underline-offset-4">Terms &amp; Conditions</Link> and <Link href="/returnsPolicy" className="underline underline-offset-4">Returns &amp; Refund Policy</Link>.</p>
        </form>
      </div>
    </section>
  );
}
