"use client";

import { useEffect, useState } from "react";
import FestivalBanner from "@/components/FestivalBanner";
import { readHomepageOffer } from "@/lib/homepage-offer";

export default function HomepageOffer() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    // Wait for the saved setting so a hidden ad never flashes during page load.
    readHomepageOffer(controller.signal).then(setVisible).catch(() => {});
    return () => controller.abort();
  }, []);

  return visible ? <div className="page-container festival-home"><FestivalBanner /></div> : null;
}
