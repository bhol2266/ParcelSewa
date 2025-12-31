// components/ClickableTiles.tsx
"use client";

import Link from "next/link";
import { FaCalculator, FaShoppingCart } from "react-icons/fa";
import { ReactNode } from "react";

type Tile = {
  title: string;
  icon: ReactNode;
  href: string;
  bg: string;
};

const tiles: Tile[] = [
  {
    title: "Price Calculator",
    icon: <FaCalculator size={30} />,
    href: "/price-calculator",
    bg: "bg-blue-500",
  },
  {
    title: "Create Order",
    icon: <FaShoppingCart size={30} />,
    href: "/createOrder",
    bg: "bg-green-500",
  },
];

const ClickableTiles: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6">
      {tiles.map((tile) => (
        <Link key={tile.title} href={tile.href}>
          <div
            className={`flex flex-col items-center justify-center p-6 rounded-xl shadow-lg hover:scale-105 transform transition duration-300 cursor-pointer ${tile.bg} text-white`}
          >
            {tile.icon}
            <h2 className="mt-4 text-xl font-semibold">{tile.title}</h2>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default ClickableTiles;
