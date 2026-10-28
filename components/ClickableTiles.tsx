// components/ClickableTiles.tsx
"use client";

import Link from "next/link";
import { FaCalculator, FaHistory, FaShoppingCart } from "react-icons/fa";
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

// Only the admin page links to the activity logs.
const logsTile: Tile = {
  title: "Logs",
  icon: <FaHistory size={22} />,
  href: "/admin/logs",
  bg: "bg-slate-700",
};

const ClickableTiles: React.FC<{ showLogs?: boolean }> = ({ showLogs = false }) => {
  const shown = showLogs ? [...tiles, logsTile] : tiles;
  return (
    <div className={`grid ${showLogs ? "grid-cols-3" : "grid-cols-2"} gap-2 p-2 sm:gap-3 sm:p-3`}>
      {shown.map((tile) => (
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
