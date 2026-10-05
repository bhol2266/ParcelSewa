import type { Metadata } from "next";
import Link from "next/link";
import WhatsAppLink from "@/components/WhatsAppLink";
import { festivalCampaign } from "@/lib/storefront";

export const metadata: Metadata = {
  title: "Terms & Conditions | ParcelSewa",
  description: "Read how ParcelSewa order requests, confirmed quotes, delivery, returns, and first-order offers work before you shop.",
};

export default function TermsPage() {
  return (
    <article className="storefront page-container inner-page max-w-4xl terms-page">
      <nav className="text-link mb-6" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>Terms &amp; Conditions</span></nav>
      <header className="mb-10">
        <p className="eyebrow">Before you order</p>
        <h1 className="text-3xl sm:text-4xl font-bold mb-5">Terms &amp; Conditions</h1>
        <p className="section-description">Understand your order, the costs, and the next steps. Ask our team about anything that needs clarification before confirming a purchase.</p>
      </header>

      <section className="surface-panel mb-6" aria-labelledby="terms-service">
        <h2 id="terms-service" className="text-xl font-semibold mb-3">1. How our service works</h2>
        <p className="small-note">ParcelSewa helps customers in Nepal purchase products from Indian online stores and coordinates purchase, cross-border handling, and delivery. You select the retailer and product; our team reviews availability and whether we can bring the item to your location.</p>
      </section>

      <section className="surface-panel mb-6" aria-labelledby="terms-order">
        <h2 id="terms-order" className="text-xl font-semibold mb-3">2. Your request and order confirmation</h2>
        <p className="small-note">Share the exact product link, size, colour, model, quantity, and delivery location. Check the retailer’s product description and size chart before requesting your order.</p>
        <p className="small-note mt-3">Submitting an order request starts our team’s review. Review your confirmed quote and payment details with our team before we purchase on your behalf. No payment is collected through the order request form.</p>
      </section>

      <section className="surface-panel mb-6" aria-labelledby="terms-cost">
        <h2 id="terms-cost" className="text-xl font-semibold mb-3">3. Quotes, charges, and payment</h2>
        <p className="small-note">Your quote explains the product cost in NPR and the applicable service, handling, and delivery charges. Courier charges are additional unless included in your confirmed quote. Review the complete payable amount before making payment.</p>
        <p className="small-note mt-3">The website’s price calculator provides an estimate. Retailer prices, stock, and applicable charges may change; our team confirms the final quote before purchase.</p>
        <Link href="/price-calculator" className="text-link mt-4">View the price calculator →</Link>
      </section>

      <section className="surface-panel mb-6" aria-labelledby="terms-delivery">
        <h2 id="terms-delivery" className="text-xl font-semibold mb-3">4. Delivery and timing</h2>
        <p className="small-note">Delivery depends on the seller’s dispatch, cross-border handling, and local courier arrangements. Festival schedules can affect timing. Tell us about any deadline and check the expected delivery date with our team before confirming your purchase.</p>
        <p className="small-note mt-3">Provide an accurate delivery location and a working WhatsApp number so our team can contact you about your order.</p>
      </section>

      <section className="surface-panel mb-6" aria-labelledby="terms-returns">
        <h2 id="terms-returns" className="text-xl font-semibold mb-3">5. Changes, cancellations, returns, and refunds</h2>
        <p className="small-note">Contact support promptly if you need to change or cancel an order, or if an item arrives damaged, incorrect, or incomplete. Keep your order confirmation, payment receipt, packaging, and photos of any issue.</p>
        <p className="small-note mt-3">Eligibility depends on the order stage, product condition, and the original seller’s return terms. Our team reviews requests and explains the next steps and any applicable costs.</p>
        <Link href="/returnsPolicy" className="text-link mt-4">Read the Returns &amp; Refund Policy →</Link>
      </section>

      <section className="surface-panel mb-6" aria-labelledby="terms-offer">
        <h2 id="terms-offer" className="text-xl font-semibold mb-3">6. Dashain &amp; Tihar first-order offer</h2>
        <p className="small-note">{festivalCampaign.terms}</p>
        <Link href="/offers#offer-details" className="text-link mt-4">Read the offer details →</Link>
      </section>

      <section className="surface-panel" aria-labelledby="terms-contact">
        <h2 id="terms-contact" className="text-xl font-semibold mb-3">7. Questions and support</h2>
        <p className="small-note">ParcelSewa is based in Buddhanagar, Kathmandu 44600, Nepal. Contact our team if you need clarification about your quote, delivery, or order.</p>
        <div className="button-row mt-5"><WhatsAppLink>Ask on WhatsApp</WhatsAppLink><a href="mailto:ukdevelopers007@gmail.com" className="text-link">Email support</a></div>
      </section>
    </article>
  );
}
