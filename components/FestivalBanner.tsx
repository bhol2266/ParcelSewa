import Image from "next/image";
import Link from "next/link";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { festivalCampaign, festivalArtwork } from "@/lib/storefront";

export default function FestivalBanner({ full = false }: { full?: boolean }) {
  const Heading = full ? "h1" : "h2";
  const headingId = full ? "festival-page-title" : "festival-title";

  return (
    <section className={`festival-banner ${full ? "festival-banner-full" : ""}`} aria-labelledby={headingId}>
      <div className="festival-copy">
        <p className="festival-eyebrow"><span aria-hidden="true">✦</span> {festivalCampaign.eyebrow}</p>
        <Heading id={headingId}><span className="festival-discount">{festivalCampaign.headline}</span><span className="festival-discount-context">{festivalCampaign.title}</span></Heading>
        <p>{festivalCampaign.description}</p>
        <Link href={full ? festivalCampaign.orderUrl : "/offers"} className="festival-button">{full ? "Claim my first-order offer" : "Explore the festival offer"}<ArrowUpRightIcon className="size-4" aria-hidden="true" /></Link>
        <span className="festival-note">First orders only · Service fee discount · Confirmed in your quote</span>
        <Link href={full ? "#offer-details" : "/offers#offer-details"} className="festival-terms-link">See offer details →</Link>
      </div>
      <div className="festival-photos">
        <p className="festival-wish">Celebrate the moments that matter.</p>
        <div className="festival-photo-grid">
          {festivalArtwork.map((artwork) => <figure key={artwork.src} className={`festival-photo festival-photo-${artwork.label.toLowerCase()}`}><div><Image src={artwork.src} alt={artwork.alt} fill sizes="(max-width: 767px) 40vw, 230px" priority={full} /></div><figcaption>{artwork.label}<span>{artwork.caption}</span></figcaption></figure>)}
        </div>
      </div>
    </section>
  );
}
