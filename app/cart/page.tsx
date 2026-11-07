import { cookies } from "next/headers";
import Link from "next/link";
import CartPage from "@/components/CartPage";
import { ADMIN_COOKIE } from "@/lib/admin-access";
import { checkCartAccess } from "@/lib/cart-link";
import { SUPPORT_URL } from "@/lib/storefront";

export const metadata = {
  title: "Your Cart | ParcelSewa",
  description: "Add, remove or change the products in your ParcelSewa order request.",
  robots: { index: false, follow: false },
};

// /cart?9817254118 — the customer's order requests from the last 7 days, editable. The team (admin cookie)
// can open any number's cart and build a quotation from it.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const access = checkCartAccess(params, (await cookies()).get(ADMIN_COOKIE)?.value);

  if (!access.ok) {
    const message = { title: "Open your cart from WhatsApp", text: "Use the cart link in the message you sent us after placing your order request." };
    return (
      <section className="storefront page-container inner-page cart-page">
        <div className="surface-panel cart-notice">
          <h1>{message.title}</h1>
          <p className="small-note mt-3">{message.text}</p>
          <div className="button-row mt-6"><a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="whatsapp-button">Message us on WhatsApp</a><Link href="/order" className="button-secondary">Start a new order</Link></div>
        </div>
      </section>
    );
  }

  return <CartPage apiQuery={`m=${access.mobile}`} mobile={access.mobile} admin={access.admin} />;
}
