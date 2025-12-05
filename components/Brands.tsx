"use client"

import React, { useRef, useEffect } from "react"
import { animate } from "motion"
import brands from "../constants/brands"

const BrandsMarquee: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<ReturnType<typeof animate> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const scrollDistance = containerRef.current.scrollWidth / 2
    animationRef.current = animate(
      containerRef.current,
      { translate: [`0px`, `-${scrollDistance}px`] },
      {
        duration: 20,
        repeat: Infinity,
        easing: "linear",
      }
    )
  }, [])

  const handleMouseEnter = () => {
    animationRef.current?.stop()
  }

  const handleMouseLeave = () => {
    if (!containerRef.current) return
    const scrollDistance = containerRef.current.scrollWidth / 2
    animationRef.current = animate(
      containerRef.current,
      { translate: [`${containerRef.current.getBoundingClientRect().x}px`, `-${scrollDistance}px`] },
      {
        duration: 20,
        repeat: Infinity,
        easing: "linear",
      }
    )
  }

  const doubledBrands = [...brands, ...brands]

  return (
    <div className="w-full py-6 overflow-hidden">
      <h2 className="text-xl md:text-2xl font-semibold text-center mb-6 text-themeBlue">
        Major Online Shopping Stores
      </h2>

      <div
        ref={containerRef}
        className="flex gap-6 w-max cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {doubledBrands.map((brand, idx) => (
          <a
            key={idx}
            href={brand.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
            aria-label={brand.name}
          >
            <img
              src={brand.image}
              alt={brand.name}
              className="h-10 md:h-14 object-contain"
            />
          </a>
        ))}
      </div>
    </div>
  )
}

export default BrandsMarquee
