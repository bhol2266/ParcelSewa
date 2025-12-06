"use client";

import React from "react";
import Marquee from "react-fast-marquee";
import brands from "../constants/brands";

const BrandsMarquee: React.FC = () => {
  return (
    <div className="w-full py-10 relative overflow-hidden">

      {/* Heading (Not affected by fade) */}
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 text-themeBlue tracking-wide">
        Major Online Shopping Stores
      </h2>

      {/* Marquee Wrapper (Only this div gets faded edges) */}
      <div className="relative w-full">
        
        {/* Fade Overlay - Left */}
        <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-white to-transparent z-20"></div>

        {/* Fade Overlay - Right */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-white to-transparent z-20"></div>

        {/* Marquee Container */}
        <div className="overflow-hidden [-webkit-mask-image:linear-gradient(to_right,transparent_0%,white_10%,white_90%,transparent_100%)]">
          <Marquee pauseOnHover speed={100} autoFill>
            {brands.map((brand, idx) => (
              <a
                key={idx}
                href={brand.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mx-8 transition-opacity hover:opacity-80"
                aria-label={brand.name}
              >
                <img
                  src={brand.image}
                  alt={brand.name}
                  className="h-12 md:h-16 object-contain"
                />
              </a>
            ))}
          </Marquee>
        </div>
      </div>
    </div>
  );
};

export default BrandsMarquee;
