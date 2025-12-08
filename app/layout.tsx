import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ViewTransitions } from 'next-view-transitions'

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ParcelSewa — Fast & Reliable Parcel Delivery Nepal",
  description:
    "ParcelSewa is a leading courier & parcel delivery service in Nepal. Track, book, and send parcels across Nepal quickly, affordably, and securely.",
  metadataBase: new URL("https://parcelsewa.com"),
  icons: {
    icon: "/favicon-32x32.png",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "ParcelSewa — Parcels Made Easy",
    description:
      "Send and track parcels across Nepal with ParcelSewa. Affordable pricing, door‑to‑door delivery, real‑time tracking and reliable service.",
    url: "https://parcelsewa.com",
    siteName: "ParcelSewa",
    images: [
      {
        url: "https://parcelsewa.com/og-image.png",  // replace with actual OG image path
        width: 1200,
        height: 630,
        alt: "ParcelSewa — Nepal Courier & Parcel Service",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ParcelSewa — Fast & Reliable Parcel Delivery Nepal",
    description:
      "ParcelSewa courier & parcel delivery service in Nepal. Book & track parcels easily online.",
    images: ["https://parcelsewa.com/og-image.png"],  // same as og image
  },
  // Optionally: add keywords, authors, viewport override etc.
  // keywords: ["ParcelSewa", "Nepal courier", "parcel delivery", "send parcel Nepal"],
  // authors: [{ name: "ParcelSewa Team" }],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ViewTransitions>

      <html lang="en">
        <body
          className={`${inter.className}  antialiased`}
        >

          <div className="pt-[50px]  xl:px-10 3xl:w-1/5 mx-auto ">
            <Navbar />

            {children}
          </div>
          <Footer />
        </body>
      </html>
    </ViewTransitions>

  );
}
