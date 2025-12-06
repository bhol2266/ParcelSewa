import React from "react";
import Image from "next/image";

const Services = () => {
  const services = [
    {
      title: "Create Order (link-based)",
      description:
        "Paste a URL from any major Indian e-commerce site. Add size, color and quantity, and we’ll turn it into a ready-to-pay quote.",
      icon: "/landingPage/atm.png",
      footer: "pages- create orders",
      href: "#",
    },
    {
      title: "Cost calculator",
      description:
        "Get a rough idea of total cost in NPR using price, weight and category—before you even submit an order request.",
      icon: "/landingPage/box.png",
      footer: "pages- cost calculator",
      href: "#",
    },
    {
      title: "Order & payment flow",
      description:
        "Review order summary, confirm and pay in NPR using bank transfer or wallet, then track until delivered.",
      icon: "/landingPage/stats.png",
      footer: "pages- summary & payment",
      href: "#",
    },
  ];

  return (
    <section className="w-full px-6 py-20 bg-[#023059] text-white">
      <div className="max-w-6xl mx-auto">
        
        <div className="inline-block bg-white/20 text-white px-5 py-1 rounded-full text-xs mb-4">
          Services
        </div>

        <h2 className="text-2xl md:text-4xl font-semibold leading-tight">
          Designed for simple cross-border
          <br /> shopping
        </h2>

        <p className="text-white/80 max-w-2xl mt-4 text-sm">
          Parcel Sewa focuses only on what you need: create order, understand cost and track delivery. No complicated freight or bulk logistics screens.
        </p>

        <div className="mt-6">
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-full shadow-lg text-sm">
            Start with a product link
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {services.map((item, index) => (
            <div
              key={index}
              className="rounded-3xl p-6 bg-gradient-to-br from-[#0F1D3A] to-[#0A1530] border border-white/10 shadow-lg"
            >
              
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4">
                <Image src={item.icon} alt={item.title} width={28} height={28} />
              </div>

              <h3 className="text-base font-semibold mb-2">{item.title}</h3>

              <p className="text-white/80 text-xs mb-6">{item.description}</p>

              <div className="flex items-center justify-between mt-auto text-white/50 text-[10px]">
                <span>{item.footer}</span>
                <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white text-base">
                  →
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
