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
    icon: <FaCalculator size={22} />,
    href: "/admin/quotation-calculator",
    bg: "bg-blue-500",
  },
  {
    title: "Create Order",
    icon: <FaShoppingCart size={22} />,
    href: "/createOrder",
    bg: "bg-green-500",
  },
];

const ClickableTiles: React.FC = () => {
  return (
    <div className="grid grid-cols-2 gap-2 p-2 sm:gap-3 sm:p-3">
      {tiles.map((tile) => (
        <Link key={tile.title} href={tile.href}>
          <div
            className={`flex flex-col items-center justify-center px-2 py-3 rounded-xl shadow-md hover:scale-[1.02] transform transition duration-300 cursor-pointer ${tile.bg} text-white`}
          >
            {tile.icon}
            <h2 className="mt-1.5 text-base font-semibold">{tile.title}</h2>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default ClickableTiles;
