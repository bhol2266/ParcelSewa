import WhatsAppLink from "@/components/WhatsAppLink";
import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon, ChatBubbleLeftRightIcon, CheckIcon, CurrencyRupeeIcon, ShoppingBagIcon, TruckIcon } from "@heroicons/react/24/outline";
import FestivalBanner from "@/components/FestivalBanner";
import ShoppingEdits from "@/components/ShoppingEdits";
import Faqs from "@/components/Faqs";
import { brands } from "@/constants/brands";
import { shoppingSteps } from "@/lib/storefront";
import { IS_COMPANY_CLOSED } from "@/lib/site-status";

export const metadata = {
  title: "ParcelSewa | Shop India. Delivered to Nepal.",
  description: "Shop from Amazon India, Flipkart, Myntra, and other Indian stores. Request your quote in NPR and let ParcelSewa coordinate purchase and delivery to Nepal.",
};

export default function Home() {
  if (IS_COMPANY_CLOSED) {
    return <section className="page-container storefront closed-notice"><h1>We’re temporarily closed</h1><p>We’re currently not accepting new orders. Please contact support for urgent queries.</p><WhatsAppLink>WhatsApp support</WhatsAppLink></section>;
  }

  return (
    <div className="storefront">
      <section className="hero-section page-container">
        <div className="hero-copy">
          <p className="route-badge"><span aria-hidden="true">🇮🇳</span> Shop in India <ArrowRightIcon className="size-3.5" aria-hidden="true" /><span aria-hidden="true">🇳🇵</span> Pay in NPR</p>
          <h1>India’s favourites.<br /><span>At your doorstep</span><br />in Nepal.</h1>
          <p className="hero-description">That outfit, gadget, or home find you’ve had your eye on? Send us the product link. We handle the buying and delivery, so you can enjoy the shopping.</p>
          <div className="button-row"><Link href="/order" className="button-primary">Start your order <ArrowUpRightIcon className="size-4" aria-hidden="true" /></Link><Link href="/price-calculator" className="button-secondary">Estimate the cost</Link></div>
          <div className="hero-assurance"><CheckIcon className="size-4" aria-hidden="true" /> Review your quote before purchase. No app needed.</div>
        </div>
        <div className="hero-visual">
          <div className="hero-orbit" aria-hidden="true" />
          <div className="hero-image-wrap"><img src="/landingPage/box4.webp" alt="Shopping parcels and a delivery rider bringing Indian store purchases to Nepal" width={1440} height={785} loading="eager" fetchPriority="high" decoding="async" /></div>
          <div className="hero-stamp"><TruckIcon aria-hidden="true" /><div><strong>From link to doorstep</strong><span>Your shopping, made simpler</span></div></div>
          <div className="hero-tag"><span aria-hidden="true">✦</span> A world of finds, closer to home.</div>
        </div>
      </section>

      <section className="store-strip page-container" aria-label="Shop from Indian stores">
        <p>Your favourite stores.<br /><strong>One helpful partner.</strong></p>
        <div>{brands.slice(0, 4).map((brand) => <a key={brand.name} href={brand.url} target="_blank" rel="noopener noreferrer" aria-label={`Shop ${brand.name} (opens a new tab)`}><img src={brand.image} alt={brand.name} width={140} height={52} loading="lazy" decoding="async" /></a>)}</div>
        <a className="text-link" href="#shopping-edits">Find your next favourite <ArrowRightIcon className="size-4" aria-hidden="true" /></a>
      </section>

      <div className="page-container festival-home"><FestivalBanner /></div>

      <section className="page-container store-section" id="how-it-works">
        <div className="section-heading"><div><p className="eyebrow">A simple way to shop across the border</p><h2>You find it.<br />We bring it home.</h2></div><p>From the first product link to your delivery in Nepal, our team helps you through every step.</p></div>
        <div className="steps-grid">{shoppingSteps.map((step, index) => <article key={step.title}><span className="step-number">0{index + 1}</span><h3>{step.title}</h3><p>{step.description}</p></article>)}</div>
      </section>

      <section className="edits-section" id="shopping-edits"><div className="page-container store-section"><div className="section-heading"><div><p className="eyebrow">The festive shortlist</p><h2>Good finds for<br />every kind of celebration.</h2></div><Link href="/offers" className="text-link">Explore the festival edit <ArrowRightIcon className="size-4" aria-hidden="true" /></Link></div><ShoppingEdits /></div></section>

      <section className="page-container store-section pricing-section">
        <div><p className="eyebrow">A clearer picture of your cost</p><h2>Plan your shopping.<br /><span className="accent-text">Know your budget.</span></h2><p className="section-description">Get an estimate in NPR, then share your product link for a confirmed quote. You can check the details before deciding to buy.</p><ul className="check-list"><li><CheckIcon aria-hidden="true" />Product cost converted to NPR</li><li><CheckIcon aria-hidden="true" />Service and delivery estimate</li><li><CheckIcon aria-hidden="true" />Final details confirmed by our team</li></ul><Link href="/price-calculator" className="button-primary">Open the price calculator <ArrowRightIcon className="size-4" aria-hidden="true" /></Link></div>
        <div className="cost-guide surface-panel"><span className="eyebrow">What goes into your quote</span><h3>Every part, explained.</h3>{[{Icon: ShoppingBagIcon, title: "Your product", detail: "The retailer’s item price and selected variant."}, {Icon: CurrencyRupeeIcon, title: "Service & handling", detail: "The cost of coordinating your purchase and cross-border handling."}, {Icon: TruckIcon, title: "Delivery to Nepal", detail: "Shipping and local courier charges for your order."}].map(({Icon, title, detail}) => <div className="cost-guide-row" key={title}><span><Icon aria-hidden="true" /></span><div><h4>{title}</h4><p>{detail}</p></div></div>)}<p className="small-note">Calculator results are estimates. Confirm the payable amount and delivery timing before purchase.</p></div>
      </section>

      <section className="page-container store-section why-section"><div className="section-heading"><div><p className="eyebrow">Shopping with a little more support</p><h2>More than moving a parcel.</h2></div></div><div className="benefits-grid"><article><CurrencyRupeeIcon aria-hidden="true" /><h3>Think in Nepali rupees</h3><p>Plan your budget in the currency you use every day, with the amount confirmed before purchase.</p></article><article><ChatBubbleLeftRightIcon aria-hidden="true" /><h3>A team you can talk to</h3><p>Need help with a seller, variant, or delivery location? Share the details with us on WhatsApp.</p></article><article><ShoppingBagIcon aria-hidden="true" /><h3>Your choice of store</h3><p>Browse Indian stores yourself. Send the exact link and we’ll check whether we can bring it to you.</p></article></div></section>

      <section className="page-container store-section"><Faqs compact /></section>
      <section className="page-container support-callout"><div><p className="eyebrow">Your next find is one link away</p><h2>Let’s bring it home.</h2><p>Start with a product link. We’ll help you take it from there.</p></div><div className="button-row"><Link href="/order" className="button-primary">Request a quote <ArrowUpRightIcon className="size-4" aria-hidden="true" /></Link><WhatsAppLink>Chat on WhatsApp</WhatsAppLink></div></section>
    </div>
  );
}
