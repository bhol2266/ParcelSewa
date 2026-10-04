import WhatsAppLink from "@/components/WhatsAppLink";
import Link from "next/link";
import { shoppingSteps } from "@/lib/storefront";

export const metadata = { title: "About ParcelSewa | Bringing Your Indian Store Finds to Nepal", description: "Meet ParcelSewa, your partner for purchasing from Indian online stores and coordinating delivery to Nepal." };

export default function AboutPage() {
  return (
    <div className="storefront page-container inner-page">
      <div className="about-intro"><p className="eyebrow">A bridge between your wishlist and your doorstep</p><h1>Great shopping finds<br /><span className="accent-text">should feel closer.</span></h1><p>ParcelSewa helps shoppers in Nepal purchase from Indian online stores. You choose the product. We review your request and help coordinate buying, cross-border handling, and delivery.</p></div>
      <section className="surface-panel festival-guide"><div><p className="eyebrow">Based in Kathmandu</p><h2>Local support.<br />More shopping possibilities.</h2></div><div><p className="section-description">Find us in Buddhanagar, Kathmandu 44600, Nepal. Whether you’re shopping for yourself, your home, or a gift, start by sharing the exact product link and your delivery location.</p><p className="small-note">Our team confirms the seller, availability, applicable charges, and timing before purchase. The order request form starts that conversation.</p><WhatsAppLink>Talk to ParcelSewa</WhatsAppLink></div></section>
      <section className="store-section"><div className="section-heading"><div><p className="eyebrow">How we help</p><h2>One link. Four simple steps.</h2></div></div><div className="steps-grid">{shoppingSteps.map((step, index) => <article key={step.title}><span className="step-number">0{index + 1}</span><h3>{step.title}</h3><p>{step.description}</p></article>)}</div></section>
      <section className="support-callout"><div><h2>What’s on your wishlist?</h2><p>We’d love to help you bring it home.</p></div><Link href="/order" className="button-primary">Start an order</Link></section>
    </div>
  );
}
