import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Script from "next/script";
import { IS_COMPANY_CLOSED } from "@/lib/site-status";
import { ThemeProvider, themeInitScript } from "@/components/ThemeProvider";


const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ParcelSewa | Shop India. Delivered to Nepal.",
  description:
    "Shop from Indian online stores and request your quote in NPR. ParcelSewa coordinates purchase, cross-border handling, and delivery to Nepal.",
  metadataBase: new URL("https://parcelsewa.com"),
  icons: {
    icon: "/favicon-32x32.png",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "ParcelSewa | Shop India. Delivered to Nepal.",
    description:
      "Discover your favourite Indian stores and let ParcelSewa help bring your purchases to Nepal.",
    url: "https://parcelsewa.com",
    siteName: "ParcelSewa",
    images: [
      {
        url: "/logo.png",
        width: 605,
        height: 195,
        alt: "ParcelSewa - Shop India. Delivered to Nepal.",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ParcelSewa | Shop India. Delivered to Nepal.",
    description:
      "Shop from Indian stores. Request a quote in NPR for purchase and delivery to Nepal.",
    images: ["/logo.png"],
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

      <html lang="en" suppressHydrationWarning>

        <head>
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        </head>

        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-0GMBZ1L7JR"
        />

        <Script id="gtm-script" strategy="afterInteractive">
          {` window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-0GMBZ1L7JR');`}
        </Script>
        <body
          className={`${inter.className} ${inter.variable} antialiased bg-white dark:bg-gray-950 transition-colors`}
        >
          <ThemeProvider>
            <a href="#main-content" className="skip-link">Skip to content</a>
              {!IS_COMPANY_CLOSED && <Navbar />}
            <main id="main-content" className={!IS_COMPANY_CLOSED ? "site-main" : ""}>
              {children}
            </main>
            {!IS_COMPANY_CLOSED && <Footer />}
          </ThemeProvider>
        </body>
      </html>

  );
}
