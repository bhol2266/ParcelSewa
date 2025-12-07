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
        url: "https://www.parcelsewa.com/og-image-order.jpg",
        width: 1200,
        height: 630,
        alt: "ParcelSewa - Create Your Order from Indian Stores",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Create Order | ParcelSewa - Shop from Indian Stores & Deliver in Nepal",
    description:
      "Place your order from Amazon, Flipkart, Myntra, and other Indian stores with ParcelSewa. Pay in Nepali currency and get products delivered hassle-free to your doorstep.",
    images: ["https://www.parcelsewa.com/og-image-order.jpg"],
  },
};


const Page = () => {
  return (
    <div>

      <OrderRequestComponent />
    </div>
  )
}

export default Page