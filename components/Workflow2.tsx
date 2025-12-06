import { div, image, img } from "motion/react-client";
import Image from "next/image";

const brandsimages = ["StoresImages/hd/amazon.png", "StoresImages/hd/flipkart.png", "StoresImages/hd/myntra.png", "StoresImages/hd/lenskart.png",]

export default function Workflow2() {
    return (

        <div className="hidden lg:flex items-center gap-12">

            <div>
                <img width={800} height={800} src="landingPage//box2.png" alt="" />

                <div className="flex items-center justify-between">
                    {brandsimages.map((image, idx) => {

                        return (
                            <img width={100} key={idx} src={image} alt="" />

                        )
                    })}
                </div>
            </div>

            <section className="w-full py-16">
                <div className="max-w-6xl mx-auto px-6">
                    {/* Header */}
                    <p className="text-gray-600 text-base font-medium mb-2">How it works</p>

                    <h2 className="text-3xl md:text-4xl font-bold text-[#0A2A4A] leading-tight">
                        Shop from India, get it in <br /> Nepal in 4 steps.
                    </h2>

                    <p className="text-gray-600 mt-4 max-w-3xl text-sm md:text-base">
                        No more confusion about customs, currency conversion or courier charges.
                        Paste the link, confirm the quote, pay in NPR and we handle the rest.
                    </p>

                    {/* Steps */}
                    <div className="grid md:grid-cols-2 gap-8 mt-12">
                        <div>
                            <h3 className="text-lg font-semibold text-orange-500">
                                Paste the product link
                            </h3>
                            <p className="text-gray-600 mt-1 text-sm md:text-base">
                                Copy the URL from Amazon, Flipkart, Myntra, Ajio or any trusted Indian store.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-orange-500">
                                Get an all-inclusive quote
                            </h3>
                            <p className="text-gray-600 mt-1 text-sm md:text-base">
                                We calculate product price, duties, service fees and shipping in real-time.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-orange-500">
                                Pay securely in NPR
                            </h3>
                            <p className="text-gray-600 mt-1 text-sm md:text-base">
                                Use bank transfer, wallet or QR. No international cards or USD balance needed.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-orange-500">
                                Relax while we deliver
                            </h3>
                            <p className="text-gray-600 mt-1 text-sm md:text-base">
                                We purchase the item in India, clear customs and ship to your address in Nepal.
                            </p>
                        </div>
                    </div>

                
                </div>
            </section>

        </div>
    );
}
