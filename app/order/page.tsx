import OrderRequestComponent from '@/components/OrderRequestPage'
import React from 'react'

// app/order/page.tsx (Server Component)
export const metadata = {
  title: "Create Order | ParcelSewa - Shop from Indian Stores & Deliver in Nepal",
  description:
    "Place your order from Amazon, Flipkart, Myntra, and other Indian stores with ParcelSewa. Pay in Nepali currency and get products delivered hassle-free to your doorstep.",
  openGraph: {
    title: "Create Order | ParcelSewa - Shop from Indian Stores & Deliver in Nepal",
    description:
      "Place your order from Amazon, Flipkart, Myntra, and other Indian stores with ParcelSewa. Pay in Nepali currency and get products delivered hassle-free to your doorstep.",
    url: "https://www.parcelsewa.com/order",
    siteName: "ParcelSewa",
    images: [
      {
        url: "/logo.png",
        width: 605,
        height: 195,
        alt: "ParcelSewa - Create Your Order from Indian Stores",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Create Order | ParcelSewa - Shop from Indian Stores & Deliver in Nepal",
    description:
      "Place your order from Amazon, Flipkart, Myntra, and other Indian stores with ParcelSewa. Pay in Nepali currency and get products delivered hassle-free to your doorstep.",
    images: ["/logo.png"],
  },
};


const Page = async ({ searchParams }: { searchParams: Promise<{ offer?: string | string[] }> }) => {
  const params = await searchParams;
  return (
    <div>

      <OrderRequestComponent festivalOffer={params.offer === "festival-first-order"} />
    </div>
  )
}

export default Page
