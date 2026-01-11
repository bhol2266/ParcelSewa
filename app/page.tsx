
import BottomSection from "@/components/BottomSection";
import Brands from "@/components/Brands";
import Faqs from "@/components/Faqs";
import PricingWorkflow from "@/components/PricingWorkflow";
import Services from "@/components/Services";
import TopLayerLandingPage from "@/components/TopLayerLandingPage";
import UserRating from "@/components/UserRating";
import Workflow from "@/components/Workflow";
import Workflow2 from "@/components/Workflow2";
import ReactCountryFlag from "react-country-flag";
import Link from "next/link";

export const metadata = {
  title: "ParcelSewa | Buy from Indian Online Stores & Get Delivered in Nepal",
  description:
    "ParcelSewa lets you shop from Amazon, Flipkart, Myntra, and other Indian online stores from home. Pay in Nepali currency and get your products delivered straight to your doorstep hassle-free.",
  openGraph: {
    title: "ParcelSewa | Buy from Indian Online Stores & Get Delivered in Nepal",
    description:
      "ParcelSewa lets you shop from Amazon, Flipkart, Myntra, and other Indian online stores from home. Pay in Nepali currency and get your products delivered straight to your doorstep hassle-free.",
    url: "https://www.parcelsewa.com/",
    siteName: "ParcelSewa",
    images: [
      {
        url: "https://www.parcelsewa.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "ParcelSewa - Shop from India, Delivered in Nepal",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ParcelSewa | Buy from Indian Online Stores & Get Delivered in Nepal",
    description:
      "ParcelSewa lets you shop from Amazon, Flipkart, Myntra, and other Indian online stores from home. Pay in Nepali currency and get your products delivered straight to your doorstep hassle-free.",
    images: ["https://www.parcelsewa.com/og-image.jpg"],
  },
};


export default function Home() {
  return (
    <div>

      <div className="lg:px-6   px-4 mt-6 lg:mt-12">

        <div className="flex lg:justify-start justify-center w-full my-4 text-[#2460E9]">
          <span className="py-2 px-4 bg-[#DDEBFE] rounded-3xl text-sm flex items-center gap-2">

            <ReactCountryFlag countryCode="IN" svg style={{ width: "1.5em", height: "1.5em" }} />

            <span>→</span>

            <ReactCountryFlag countryCode="NP" svg style={{ width: "1.5em", height: "1.5em" }} />

            Order from any Indian site, pay in NPR
          </span>


        </div>


        <TopLayerLandingPage />

        <div className="flex items-center justify-between">


          <div>



            <div className="lg:w-4/5">

              <span className="text-themeBlue font-medium ">Paste the product link from Amazon, Flipkart, Myntra or any Indian store. We handle buying, customs and shipping — you pay once in NPR and relax.</span>
            </div>


            {/* Buttons */}
            <div className="flex items-center justify-between gap-2 my-8 max-w-[600px] sm:gap-12">

              <Link
                href="/order"
                className="bg-themeBlue text-white flex-1 py-3 rounded-[26px] text-sm cursor-pointer inline-flex justify-center items-center"
                style={{
                  boxShadow: '0 4px 6px rgba(1, 49, 89, 0.5)' // themeBlue rgba with 50% opacity
                }}
              >
                Create your first order
              </Link>


              <Link
                href="/price-calculator"
                className="bg-[#F8862A] text-white flex-1 py-3 rounded-[26px] text-sm cursor-pointer inline-flex justify-center items-center"
                style={{
                  boxShadow: '0 4px 6px rgba(248, 134, 42, 0.5)',
                }}
              >
                Try cost calculator
              </Link>


            </div>
          </div>

          <img className=" max-w-[500px] xl:max-w-[600px] 2xl:max-w-[700px] 3xl:max-w-[800px] lg:flex hidden" src="/landingPage/box4.png" alt="" />

        </div>


        {/* Customer Stats  */}
        <UserRating />

      </div>

      {/* <Services /> */}

      <Workflow2 />

      <Brands />
      <Workflow />


      <div className="bg-gradient-to-b from-white to-[#EEF1F5]">
        <PricingWorkflow />
        <Faqs />
        <BottomSection />
      </div>




    </div>
  );
}
