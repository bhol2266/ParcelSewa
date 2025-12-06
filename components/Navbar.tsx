"use client";

import { Fragment } from "react";
import { Disclosure, Transition } from "@headlessui/react";
import { FaBars, FaTimes } from "react-icons/fa";
import { Link } from "next-view-transitions";

const navigation = [
  { name: "Home", href: "/", current: true },
  { name: "Price-Calculator", href: "/price-calculator", current: false },
  { name: "FAQs", href: "/faqs", current: false },
  { name: "WhatsApp Support", href: "https://wa.me/9779817254118", current: false },
];

const Navbar = () => {
  return (
    <Disclosure as="nav" className="bg-white">
      {({ open }) => (
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
              <div className="hidden md:flex space-x-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${item.current ? "text-white bg-themeBlue" : "text-primary hover:bg-gray-200"
                      }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
              

              {/* Mobile menu button */}
              <div className="md:hidden">
                <Disclosure.Button className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-white hover:bg-themeBlue focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                  {open ? <FaTimes size={24} /> : <FaBars size={24} />}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          {/* Mobile menu with animation */}
          <Transition
            as={Fragment}
            enter="transition duration-200 ease-out"
            enterFrom="transform opacity-0 -translate-y-2"
            enterTo="transform opacity-100 translate-y-0"
            leave="transition duration-150 ease-in"
            leaveFrom="transform opacity-100 translate-y-0"
            leaveTo="transform opacity-0 -translate-y-2"
          >
            <Disclosure.Panel className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`block px-3 py-2 rounded-md text-base  ${item.current ? "text-white bg-themeBlue" : "text-secondary hover:bg-gray-200"
                      }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </Disclosure.Panel>
          </Transition>
        </>
      )}
    </Disclosure>
  );
};

export default Navbar;
