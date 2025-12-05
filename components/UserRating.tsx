import React from "react";

type StatItem = {
  value: string;
  label: string;
};

const stats: StatItem[] = [
  { value: "1k+", label: "Orders delivered" },
  { value: "4.8★", label: "Avg customer rating" },
  { value: "7-10 Days", label: "Typical delivery time" },
];

const UserRating: React.FC = () => {
  return (
    <div className="flex  md:flex-row justify-around items-center bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="flex flex-col items-center text-center"
        >
          <span className="text-2xl md:text-3xl font-bold text-themeBlue dark:text-blue-400">
            {stat.value}
          </span>
          <span className="text-sm md:text-base text-gray-600 dark:text-gray-300">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default UserRating;
