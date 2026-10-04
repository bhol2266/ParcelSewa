"use client";

import WhatsAppLink from "@/components/WhatsAppLink";
import { Disclosure } from "@headlessui/react";
import { Bars3Icon, XMarkIcon, ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import BrandLogo from "@/components/BrandLogo";

const navigation = [
  { name: "Home", href: "/" },
  { name: "How it works", href: "/#how-it-works" },
  { name: "Festival picks", href: "/offers" },
  { name: "Price calculator", href: "/price-calculator" },
  { name: "FAQs", href: "/faqs" },
];
const hiddenPaths = ["/huggai-delete-account", "/huggai-privacy-policy", "/vixoai-delete-account", "/vixoai-privacy-policy"];

export default function Navbar() {
  const pathname = usePathname();
  const inAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const statsActive = pathname.startsWith("/admin/stats");
  if (hiddenPaths.includes(pathname)) return null;

  return (
    <Disclosure as="header" className="site-header">
      {({ open, close }) => <>
        <div className="header-inner">
          <Link href="/" aria-label="ParcelSewa home"><BrandLogo className="w-[150px] sm:w-[170px]" /></Link>
          <nav className="desktop-navigation" aria-label="Main navigation">
            {navigation.map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={pathname === item.href ? "active" : ""}>{item.name}{item.href === "/offers" && <span className="nav-dot" aria-hidden="true" />}</Link>)}
          </nav>
          <div className="header-actions">
            {inAdmin && <Link className="admin-navigation" href={statsActive ? "/admin" : "/admin/stats"}>{statsActive ? "Orders" : "Stats"}</Link>}
            <ThemeToggle />
            <Link href="/order" className="header-order">Start an order <ArrowUpRightIcon className="size-4" aria-hidden="true" /></Link>
            <Disclosure.Button className="mobile-menu-button" aria-label={open ? "Close navigation menu" : "Open navigation menu"}>{open ? <XMarkIcon /> : <Bars3Icon />}</Disclosure.Button>
          </div>
        </div>
        <Disclosure.Panel className="mobile-navigation">
          <nav aria-label="Mobile navigation">{navigation.map((item) => <Link key={item.href} href={item.href} onClick={() => close()} aria-current={pathname === item.href ? "page" : undefined}>{item.name}</Link>)}<Link href="/order" className="mobile-order-link" onClick={() => close()}>Start an order</Link><WhatsAppLink onClick={() => close()}>WhatsApp support</WhatsAppLink></nav>
        </Disclosure.Panel>
      </>}
    </Disclosure>
  );
}
