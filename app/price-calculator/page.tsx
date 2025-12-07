import PriceCalculator from '@/components/PriceCalculatorPage'



// app/price-calculator/page.tsx (Server Component)
export const metadata = {
  title: "Price Calculator | ParcelSewa - Know Your Total Cost",
  description:
    "Use ParcelSewa's Price Calculator to estimate total cost of products from Amazon, Flipkart, Myntra, and other Indian stores. Includes service fees, delivery charges, and INR to NPR conversion.",
  openGraph: {
    title: "Price Calculator | ParcelSewa - Know Your Total Cost",
    description:
      "Use ParcelSewa's Price Calculator to estimate total cost of products from Amazon, Flipkart, Myntra, and other Indian stores. Includes service fees, delivery charges, and INR to NPR conversion.",
    images: [
      {
        url: "https://www.parcelsewa.com/og-image-calculator.jpg",
      },
    ],
  },
};

const Page = () => {
  return (
    <div><PriceCalculator /></div>
  )
}

export default Page