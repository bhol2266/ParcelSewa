"use client";

import WhatsAppLink from "@/components/WhatsAppLink";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import toast, { Toaster } from "react-hot-toast";
import { festivalCampaign, SUPPORT_URL } from "@/lib/storefront";

export default function OrderRequestComponent({ festivalOffer = false }: { festivalOffer?: boolean }) {
  const [productUrl, setProductUrl] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [mobile, setMobile] = useState("+977");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [whatsappDraft, setWhatsappDraft] = useState("");
  const [firstOrderOfferRequested, setFirstOrderOfferRequested] = useState(false);
  const offerRequested = festivalOffer && firstOrderOfferRequested;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    try {
      const url = new URL(productUrl.trim());
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch {
      toast.error("Please enter a valid product link beginning with https://.");
      return;
    }
    if (!deliveryLocation.trim() || !Number.isInteger(quantity) || quantity < 1 || !/^\+9779\d{9}$/.test(mobile.trim())) {
      toast.error("Check your location, whole-number quantity, and Nepal WhatsApp number.");
      return;
    }
    try {
      setLoading(true);
      setWhatsappDraft("");
      await addDoc(collection(db, "Order Request"), {
        productUrl: productUrl.trim(), quantity, mobile: mobile.trim(),
        deliveryLocation: deliveryLocation.trim(), notes: notes.trim(),
        selectedDate: Timestamp.now(), createdAt: Timestamp.now(),
        ...(offerRequested ? { offerCode: festivalCampaign.offerCode, firstOrderOfferRequested: true } : {}),
      });
      const message = ["🛒 *New Order Request*", "", `🔗 *Product URL:* ${productUrl.trim()}`, `📦 *Quantity:* ${quantity}`, `📍 *Delivery Location:* ${deliveryLocation.trim()}`, `📞 *Customer WhatsApp:* ${mobile.trim()}`, offerRequested ? "🎉 *Festival offer requested:* First ParcelSewa order — 10% off the service fee only. Please confirm eligibility and the discounted quote." : null, notes.trim() ? `📝 *Notes:* ${notes.trim()}` : null].filter(Boolean).join("\n");
      const whatsappUrl = `${SUPPORT_URL}?text=${encodeURIComponent(message)}`;
      setWhatsappDraft(whatsappUrl);
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      toast.success("Request saved. Send the prepared WhatsApp message to continue.");
      setProductUrl(""); setQuantity(1); setMobile("+977"); setDeliveryLocation(""); setNotes("");
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
      <div><p className="eyebrow">Let’s start with your wishlist</p><div className="request-progress"><strong>01 Your request</strong><span>→</span><span>02 Team review</span><span>→</span><span>03 Confirm your quote</span></div><h1>Found it in India?<br /><span className="accent-text">Let’s bring it home.</span></h1><p className="section-description">Paste the exact product link and tell us where you need it delivered. We’ll review your request and help you with a quote in NPR.</p><div className="form-tip"><h2>A few details make a better quote</h2><ul><li>Include the size, colour, and model in your notes.</li><li>Tell us your city or municipality in Nepal.</li><li>Shopping for a festival date? Mention your deadline.</li><li>Wait for confirmation before making a payment.</li></ul></div><Link href="/price-calculator" className="text-link mt-6">Want a budget estimate first? Try the calculator →</Link><p className="small-note mt-5">Need help choosing a link? <WhatsAppLink>Chat with our team</WhatsAppLink></p></div>
      <div>
        {whatsappDraft && <div className="surface-panel mb-5" role="status"><h2 className="text-xl">Your request is saved.</h2><p className="small-note mt-3">If WhatsApp didn’t open, use the button below. Send the prepared message to continue with our team.</p><WhatsAppLink href={whatsappDraft} className="mt-4">Continue on WhatsApp</WhatsAppLink></div>}
        <form onSubmit={handleSubmit} className="surface-panel form-panel">
          <div><h2>Your shopping request</h2><p className="small-note mt-2">No payment is collected in this form.</p></div>
          {festivalOffer && <div className="order-offer-panel"><p className="eyebrow">Dashain & Tihar offer</p><h3>10% off your first order’s service fee</h3><label htmlFor="first-order-offer"><input id="first-order-offer" type="checkbox" checked={firstOrderOfferRequested} onChange={event => setFirstOrderOfferRequested(event.target.checked)} /><span>This is my first ParcelSewa order. Please apply the service fee offer.</span></label><p>Our team verifies eligibility and confirms the discount in your quote. Product and delivery charges are unchanged.</p><Link href="/offers#offer-details">Read offer details →</Link></div>}
          <div className="form-field"><label htmlFor="order-product">Product link <span aria-hidden="true">*</span></label><input id="order-product" type="url" required name="productUrl" autoComplete="url" placeholder="https://www.amazon.in/…" value={productUrl} onChange={event => setProductUrl(event.target.value)} /><p>Copy the full link from the retailer’s product page.</p></div>
          <div className="form-row"><div className="form-field"><label htmlFor="order-location">Delivery location *</label><input id="order-location" name="deliveryLocation" required autoComplete="address-level2" placeholder="e.g. Kathmandu" value={deliveryLocation} onChange={event => setDeliveryLocation(event.target.value)} /></div><div className="form-field"><label htmlFor="order-quantity">Quantity *</label><input id="order-quantity" name="quantity" type="number" min="1" step="1" required value={quantity} onChange={event => setQuantity(Number(event.target.value))} /></div></div>
          <div className="form-field"><label htmlFor="order-mobile">WhatsApp number *</label><input id="order-mobile" name="mobile" type="tel" required autoComplete="tel" pattern="\+9779[0-9]{9}" title="Enter +977 followed by your 10-digit Nepal mobile number." value={mobile} onChange={event => setMobile(event.target.value)} placeholder="+97798XXXXXXXX" /><p>Include +977 followed by your 10-digit mobile number.</p></div>
          <div className="form-field"><label htmlFor="order-notes">Size, colour, or other notes <span className="font-normal">(optional)</span></label><textarea id="order-notes" name="notes" rows={3} value={notes} onChange={event => setNotes(event.target.value)} placeholder="e.g. Size M, blue. Please check arrival before my festival date." /></div>
          <button type="submit" disabled={loading} className="button-primary">{loading ? "Saving your request…" : "Submit my request"}</button>
          <p className="small-note">Submitting saves your details with ParcelSewa and opens WhatsApp with a prepared message. You’ll need to send that message yourself.</p>
          <p className="small-note">Before confirming your order, review our <Link href="/terms" className="underline underline-offset-4">Terms &amp; Conditions</Link> and <Link href="/returnsPolicy" className="underline underline-offset-4">Returns &amp; Refund Policy</Link>.</p>
        </form>
      </div>
    </section>
  );
}
