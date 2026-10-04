import WhatsAppLink from "@/components/WhatsAppLink";
import Link from "next/link";
import FestivalBanner from "@/components/FestivalBanner";
import ShoppingEdits from "@/components/ShoppingEdits";
import { festivalCampaign } from "@/lib/storefront";

export const metadata = {
  title: "Dashain & Tihar Offer: 10% Off Your First Order’s Service Fee | ParcelSewa",
  description: "Celebrate Dashain and Tihar with 10% off the ParcelSewa service fee on your first order. Explore Indian store finds and request your discounted quote in NPR.",
};

export default function OffersPage() {
  return (
    <div className="storefront page-container">
      <div className="breadcrumb"><Link href="/">Home</Link><span>/</span><span>Festival picks & offers</span></div>
      <FestivalBanner full />
      <section className="store-section">
        <div className="section-heading"><div><p className="eyebrow">For you. For home. For the people you love.</p><h2>Your festive shopping starts here.</h2></div><p>Browse the retailer, choose your exact item, then share the product link with us.</p></div>
        <ShoppingEdits />
      </section>
      <section className="festival-guide surface-panel">
        <div><p className="eyebrow">Shop with a plan</p><h2>Make room for the celebration.</h2><p>Before you order, a few small checks can make a big difference.</p></div>
        <ol className="guide-list">
          <li><span>01</span><div><h3>Check the full cost</h3><p>A retailer discount applies to the product price. Ask for your NPR quote including applicable service, handling, and delivery charges.</p></div></li>
          <li><span>02</span><div><h3>Confirm your festival deadline</h3><p>Tell us when you need the item. Festival schedules and seller dispatch can affect delivery, so check timing before purchase.</p></div></li>
          <li><span>03</span><div><h3>Get the details right</h3><p>Check sizes, colours, dimensions, seller ratings, and return eligibility. Include your preferred variant in the order notes.</p></div></li>
        </ol>
      </section>
      <section className="campaign-terms" id="offer-details"><p className="eyebrow">Your first-order offer</p><h2>How to get your 10% service fee discount</h2><p>{festivalCampaign.terms}</p><p>Use the offer button, share your product link, and tick the first-order option in your request. Retailer prices, stock, and seller terms may change. Ask our team about delivery timing if you need your order before a festival date.</p><p className="offer-example">For example: a quoted NPR 1,000 service fee becomes NPR 900. This example shows the discount calculation; your service fee depends on your order.</p></section>
      <section className="support-callout"><div><p className="eyebrow">Found something you love?</p><h2>Send the link. We’ll help with the rest.</h2></div><div className="button-row"><Link href={festivalCampaign.orderUrl} className="button-primary">Claim my first-order offer</Link><WhatsAppLink>Ask on WhatsApp</WhatsAppLink></div></section>
    </div>
  );
}
