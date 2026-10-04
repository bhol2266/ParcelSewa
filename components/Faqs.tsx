import WhatsAppLink from "@/components/WhatsAppLink";
import Link from "next/link";
import { PlusIcon } from "@heroicons/react/24/outline";
import { storefrontFaqs } from "@/lib/storefront";

export default function Faqs({ compact = false }: { compact?: boolean }) {
  const questions = compact ? storefrontFaqs.slice(0, 4) : storefrontFaqs;
  return (
    <div className="faq-layout" id="faqs">
      <div><p className="eyebrow">A little clarity before you shop</p>{compact ? <h2>Good questions.<br />Helpful answers.</h2> : <h1>How can we help?</h1>}<p className="section-description">Everything you need to get started, from your first product link to your quote in NPR.</p><WhatsAppLink>Talk to our team</WhatsAppLink>{compact && <Link href="/faqs" className="text-link faq-all-link">View all questions →</Link>}</div>
      <div className="faq-list">{questions.map((faq) => <details key={faq.question}><summary>{faq.question}<PlusIcon aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}{!compact && <Link className="text-link" href="/returnsPolicy">Read the Returns & Refund Policy →</Link>}</div>
    </div>
  );
}
