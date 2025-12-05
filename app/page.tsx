import Brands from "@/components/Brands";
import PricingWorkflow from "@/components/PricingWorkflow";
import UserRating from "@/components/UserRating";
import Workflow from "@/components/Workflow";
import { Link } from "next-view-transitions";
import ReactCountryFlag from "react-country-flag";

export default function Home() {
  return (
    <div>

      <div className="flex justify-center w-full my-4 text-[#2460E9]">
        <span className="py-2 px-6 bg-[#DDEBFE] rounded-3xl text-sm flex items-center gap-2">

          <ReactCountryFlag countryCode="IN" svg style={{ width: "1.5em", height: "1.5em" }} />

          <span>→</span>

          <ReactCountryFlag countryCode="NP" svg style={{ width: "1.5em", height: "1.5em" }} />

          Order from any Indian site, pay in NPR
        </span>


      </div>
      <img src="/landingPage/text1.png" alt="" className="h-[250px] mx-auto my-6 cursor-pointer" />

      <span className="text-themeBlue font-medium ">Paste the product link from Amazon, Flipkart, Myntra or any Indian store. We handle buying, customs and shipping — you pay once in NPR and relax.</span>


      {/* Buttons */}
      <div className="flex items-center justify-between gap-2 my-8">
        <button
          className="bg-themeBlue text-white flex-1 py-3 rounded-[26px] text-sm"
          style={{
            boxShadow: '0 4px 6px rgba(1, 49, 89, 0.5)' // themeBlue rgba with 50% opacity
          }}
        >
          Create your first order
        </button>


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

      {/* Customer Stats  */}
      <UserRating />

      <Brands />

      <Workflow />

      <PricingWorkflow />




    </div>
  );
}
