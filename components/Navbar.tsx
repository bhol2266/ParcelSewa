"use client";

import { Fragment } from "react";
import { Disclosure, Transition } from "@headlessui/react";
import { FaBars, FaTimes } from "react-icons/fa";
import { usePathname, useRouter } from "next/navigation";
import { Link } from "next-view-transitions";
import React, { useState } from "react";
import { easeInOut, motion, useMotionValueEvent, useScroll } from "motion/react";

const navigation = [
  { name: "Home", href: "/" },
  { name: "Price-Calculator", href: "/price-calculator" },
  { name: "FAQs", href: "/faqs" },
  { name: "WhatsApp Support", href: "https://wa.me/9779817254118" },
];

const Navbar = () => {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState<boolean>(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 10);
  });

  const pathname = usePathname();
  const router = useRouter();

  return (
    <motion.div
      animate={{
        boxShadow: scrolled ? "var(--shadow-acertinity)" : "none",
        width: scrolled ? "90%" : "100%",
        borderRadius: scrolled ? "26px" : "0px",
        y: scrolled ? 10 : 0,
      }}
      transition={{ duration: 0.3, ease: easeInOut }}
      className="fixed z-50 inset-x-0 top-0 mx-auto bg-white"
    >
      <Disclosure as="nav">
        {({ open, close }) => (
          <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16 items-center">
                {/* Logo */}
                <div className="flex-shrink-0">
                  <Link href="/">
                    <img src="/logo.png" alt="Logo" className="w-[180px]" />
                  </Link>
                </div>

                {/* Desktop nav links */}
                <div className="hidden lg:flex space-x-4">
                  {navigation.map((item) => {
                    const isCurrent = item.href === pathname && !item.href.startsWith("https://wa");
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`px-3 py-2 rounded-md text-sm font-medium ${
                          isCurrent ? "text-white bg-themeBlue" : "text-primary hover:bg-gray-200"
                        }`}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </div>

                {/* Action buttons */}
                <div className="gap-6 items-center hidden lg:flex">
                  <Link href="/login" className="px-3 py-2 rounded-md text-sm font-medium hover:underline">
                    Login
                  </Link>
                  <Link
                    href="/order"
                    className="bg-themeBlue text-white flex-1 py-3 rounded-[26px] text-sm cursor-pointer inline-flex justify-center items-center px-6"
                    style={{ boxShadow: "0 4px 6px rgba(1, 49, 89, 0.5)" }}
                  >
                    Create your first order
                  </Link>
                </div>

                {/* Mobile menu button */}
                <div className="lg:hidden">
                  <Disclosure.Button className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-white hover:bg-themeBlue focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                    {open ? <FaTimes size={24} /> : <FaBars size={24} />}
                  </Disclosure.Button>
                </div>
              </div>
            </div>

            {/* Mobile menu */}
            <Transition
              as={Fragment}
              enter="transition duration-200 ease-out"
              enterFrom="transform opacity-0 -translate-y-2"
              enterTo="transform opacity-100 translate-y-0"
              leave="transition duration-150 ease-in"
              leaveFrom="transform opacity-100 translate-y-0"
              leaveTo="transform opacity-0 -translate-y-2"
            >
              <Disclosure.Panel className="lg:hidden">
                <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                  {navigation.map((item) => {
                    const isCurrent = item.href === pathname && !item.href.startsWith("https://wa");

                    return (
                      <button
                        key={item.name}
                        onClick={() => {
                          close(); // close menu first
                          setTimeout(() => {
                            // navigate after menu closes
                            if (item.href.startsWith("https://")) {
                              window.location.href = item.href; // external links
                            } else {
                              router.push(item.href); // internal links SPA-style
                            }
                          }, 200); // match transition duration
                        }}
                        className={`block w-full text-left px-3 py-2 rounded-md text-base ${
                          isCurrent ? "text-white bg-themeBlue" : "text-secondary hover:bg-gray-200"
                        }`}
                      >
                        {item.name}
                      </button>
                    );
                  })}
                </div>
              </Disclosure.Panel>
            </Transition>
          </>
        )}
      </Disclosure>
    </motion.div>
  );
};

export default Navbar;
