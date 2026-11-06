"use client";

import WhatsAppLink from "@/components/WhatsAppLink";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import toast, { Toaster } from "react-hot-toast";
import { festivalCampaign, SUPPORT_URL } from "@/lib/storefront";

// Extra details the customer can choose to add to a product. Only "other" may be added more than once.
type DetailType = "size" | "color" | "variant" | "notes" | "other";
const DETAIL_TYPES: { type: DetailType; label: string; placeholder: string }[] = [
  { type: "size", label: "Size", placeholder: "e.g. M or UK 9" },
  { type: "color", label: "Colour", placeholder: "e.g. Navy blue" },
  { type: "variant", label: "Model / variant", placeholder: "e.g. 8GB + 128GB" },
  { type: "notes", label: "Notes", placeholder: "Anything else about this product" },
  { type: "other", label: "Something else", placeholder: "Details" },
];
type Detail = { key: number; type: DetailType; label: string; value: string };

// One product in the customer's request. `key` only keeps React rows stable while items are added and removed.
type OrderItem = { key: number; productUrl: string; quantity: number; details: Detail[] };

const MAX_ITEMS = 20;
let nextKey = 1;
const emptyItem = (): OrderItem => ({ key: nextKey++, productUrl: "", quantity: 1, details: [] });

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
  const [openPicker, setOpenPicker] = useState<number | null>(null);
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

  function addDetail(itemKey: number, type: DetailType) {
    const detail: Detail = { key: nextKey++, type, label: type === "other" ? "" : DETAIL_TYPES.find(d => d.type === type)!.label, value: "" };
    setItems(current => current.map(item => (item.key === itemKey ? { ...item, details: [...item.details, detail] } : item)));
    setOpenPicker(null);
    // "Something else" starts on its name field; every other detail starts on its value.
    setTimeout(() => document.getElementById(type === "other" ? `detail-label-${detail.key}` : `detail-${detail.key}`)?.focus(), 0);
  }

  function updateDetail(itemKey: number, detailKey: number, changes: Partial<Detail>) {
    setItems(current => current.map(item => (item.key === itemKey ? { ...item, details: item.details.map(d => (d.key === detailKey ? { ...d, ...changes } : d)) } : item)));
  }

  function removeDetail(itemKey: number, detailKey: number) {
    setItems(current => current.map(item => (item.key === itemKey ? { ...item, details: item.details.filter(d => d.key !== detailKey) } : item)));
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
    // Empty details are dropped; a "Something else" with no name is saved as "Detail".
    const cleanItems = items.map(item => ({
      productUrl: item.productUrl.trim(), quantity: item.quantity,
      details: item.details
        .filter(d => d.value.trim())
        .map(d => ({ type: d.type, label: d.label.trim() || "Detail", value: d.value.trim() })),
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
        `    📦 Qty: ${item.quantity}`,
        ...item.details.map(d => `    • ${d.label}: ${d.value}`),
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
      <div><p className="eyebrow">Let’s start with your wishlist</p><div className="request-progress"><strong>01 Your request</strong><span>→</span><span>02 Team review</span><span>→</span><span>03 Confirm your quote</span></div><h1>Found it in India?<br /><span className="accent-text">Let’s bring it home.</span></h1><p className="section-description">Paste the exact product links and tell us where you need them delivered. Add as many products as you like in one request — we’ll review them together and help you with a quote in NPR.</p><div className="form-tip"><h2>A few details make a better quote</h2><ul><li>Add each product separately, with its own size, colour, or notes.</li><li>Tell us your city or municipality in Nepal.</li><li>Shopping for a festival date? Mention your deadline.</li><li>Wait for confirmation before making a payment.</li></ul></div><Link href="/price-calculator" className="text-link mt-6">Want a budget estimate first? Try the calculator →</Link><p className="small-note mt-5">Need help choosing a link? <WhatsAppLink>Chat with our team</WhatsAppLink></p></div>
      <div>
        {whatsappDraft && <div className="surface-panel mb-5" role="status"><h2 className="text-xl">Your request {savedRequestId} is saved.</h2><p className="small-note mt-3">If WhatsApp didn’t open, use the button below. Send the prepared message to continue with our team. Mention {savedRequestId} if you need to change anything.</p><WhatsAppLink href={whatsappDraft} className="mt-4">Continue on WhatsApp</WhatsAppLink></div>}
        <form onSubmit={handleSubmit} className="surface-panel form-panel order-form">
          <div><h2>Your shopping request</h2><p className="small-note mt-2">No payment now — we’ll send you a quote first.</p></div>
          {festivalOffer && <div className="order-offer-panel"><p className="eyebrow">Dashain & Tihar offer</p><h3>10% off your first order’s service fee</h3><label htmlFor="first-order-offer"><input id="first-order-offer" type="checkbox" checked={firstOrderOfferRequested} onChange={event => setFirstOrderOfferRequested(event.target.checked)} /><span>This is my first ParcelSewa order. Please apply the service fee offer.</span></label><p>Our team verifies eligibility and confirms the discount in your quote. Product and delivery charges are unchanged.</p><Link href="/offers#offer-details">Read offer details →</Link></div>}

          <section className="order-step" aria-labelledby="step-products">
            <div className="order-step-title"><span aria-hidden="true">1</span><div><h3 id="step-products">What would you like to buy?</h3><p>Paste the link from Amazon, Flipkart, Myntra or any Indian store.</p></div></div>

            {items.map((item, index) => {
              const available = DETAIL_TYPES.filter(d => d.type === "other" || !item.details.some(existing => existing.type === d.type));
              const pickerOpen = openPicker === item.key;
              return (
                <fieldset key={item.key} className="order-item">
                  <legend className="sr-only">Product {index + 1}</legend>
                  <div className="order-item-head">
                    <span className="order-item-title">Product {index + 1}</span>
                    {items.length > 1 && <button type="button" className="order-item-remove" onClick={() => removeItem(item.key)} aria-label={`Remove product ${index + 1}`}>Remove</button>}
                  </div>

                  <div className="form-field">
                    <label htmlFor={`order-product-${item.key}`}>Product link *</label>
                    <input id={`order-product-${item.key}`} type="url" required autoComplete="url" placeholder="https://www.amazon.in/…" value={item.productUrl} onChange={event => updateItem(item.key, { productUrl: event.target.value })} />
                  </div>

                  <div className="order-item-qty">
                    <label htmlFor={`order-quantity-${item.key}`}>Quantity</label>
                    <div className="qty-stepper">
                      <button type="button" aria-label={`Decrease quantity of product ${index + 1}`} disabled={!(item.quantity > 1)} onClick={() => updateItem(item.key, { quantity: Math.max(1, (item.quantity || 1) - 1) })}>−</button>
                      <input id={`order-quantity-${item.key}`} type="number" min="1" step="1" required inputMode="numeric" value={Number.isNaN(item.quantity) ? "" : item.quantity} onChange={event => updateItem(item.key, { quantity: event.target.valueAsNumber })} />
                      <button type="button" aria-label={`Increase quantity of product ${index + 1}`} onClick={() => updateItem(item.key, { quantity: (item.quantity || 0) + 1 })}>+</button>
                    </div>
                  </div>

                  {item.details.length > 0 && (
                    <div className="order-details">
                      {item.details.map(detail => {
                        const meta = DETAIL_TYPES.find(d => d.type === detail.type)!;
                        return (
                          <div key={detail.key} className={`order-detail${detail.type === "notes" ? " is-notes" : ""}`}>
                            {detail.type === "other"
                              ? <input id={`detail-label-${detail.key}`} className="order-detail-name" aria-label="Detail name" placeholder="Name, e.g. Storage" value={detail.label} onChange={event => updateDetail(item.key, detail.key, { label: event.target.value })} />
                              : <label htmlFor={`detail-${detail.key}`} className="order-detail-name">{meta.label}</label>}
                            {detail.type === "notes"
                              ? <textarea id={`detail-${detail.key}`} rows={2} placeholder={meta.placeholder} value={detail.value} onChange={event => updateDetail(item.key, detail.key, { value: event.target.value })} />
                              : <input id={`detail-${detail.key}`} aria-label={detail.type === "other" ? detail.label || "Detail" : undefined} placeholder={meta.placeholder} value={detail.value} onChange={event => updateDetail(item.key, detail.key, { value: event.target.value })} />}
                            <button type="button" className="order-detail-remove" onClick={() => removeDetail(item.key, detail.key)} aria-label={`Remove ${detail.label || "detail"} from product ${index + 1}`}>×</button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {pickerOpen ? (
                    <div className="order-detail-options" role="group" aria-label={`Choose a detail to add to product ${index + 1}`}>
                      <span>Add:</span>
                      {available.map(d => <button key={d.type} type="button" onClick={() => addDetail(item.key, d.type)}>{d.label}</button>)}
                      <button type="button" className="order-detail-close" onClick={() => setOpenPicker(null)} aria-label="Close">×</button>
                    </div>
                  ) : (
                    <button type="button" className="order-detail-toggle" onClick={() => setOpenPicker(item.key)}>
                      <span aria-hidden="true">+</span> {item.details.length ? "Add more details" : "Add size, colour or notes"}
                    </button>
                  )}
                </fieldset>
              );
            })}

            <button type="button" className="order-item-add" onClick={addItem} disabled={items.length >= MAX_ITEMS}><span aria-hidden="true">+</span> Add another product</button>
          </section>

          <section className="order-step" aria-labelledby="step-delivery">
            <div className="order-step-title"><span aria-hidden="true">2</span><div><h3 id="step-delivery">Where should we deliver?</h3><p>We’ll send your quote on WhatsApp.</p></div></div>
            <div className="form-field"><label htmlFor="order-location">Delivery location *</label><input id="order-location" name="deliveryLocation" required autoComplete="address-level2" placeholder="City or municipality, e.g. Kathmandu" value={deliveryLocation} onChange={event => setDeliveryLocation(event.target.value)} /></div>
            <div className="form-field"><label htmlFor="order-mobile">WhatsApp number *</label><input id="order-mobile" name="mobile" type="tel" required autoComplete="tel" pattern="\+9779[0-9]{9}" title="Enter +977 followed by your 10-digit Nepal mobile number." value={mobile} onChange={event => setMobile(event.target.value)} placeholder="+97798XXXXXXXX" /><p>+977 followed by your 10-digit mobile number.</p></div>
          </section>

          <section className="order-step" aria-labelledby="step-notes">
            <div className="order-step-title"><span aria-hidden="true">3</span><div><h3 id="step-notes">Anything else? <span className="font-normal">(optional)</span></h3><p>A deadline, gift wrap, or anything about the whole order.</p></div></div>
            <div className="form-field"><label htmlFor="order-notes" className="sr-only">Notes for the whole request</label><textarea id="order-notes" name="notes" rows={2} value={notes} onChange={event => setNotes(event.target.value)} placeholder="e.g. Please deliver everything before Tihar." /></div>
          </section>

          <div className="order-submit">
            <p className="order-summary"><strong>{items.length} {items.length === 1 ? "product" : "products"}</strong> · {totalUnits} {totalUnits === 1 ? "piece" : "pieces"}</p>
            <button type="submit" disabled={loading} className="button-primary">{loading ? "Saving your request…" : "Send request on WhatsApp"}</button>
          </div>
          <p className="small-note">This saves your request and opens WhatsApp with a prepared message — just press send. By submitting you agree to our <Link href="/terms" className="underline underline-offset-4">Terms</Link> and <Link href="/returnsPolicy" className="underline underline-offset-4">Returns Policy</Link>.</p>
        </form>
      </div>
    </section>
  );
}
