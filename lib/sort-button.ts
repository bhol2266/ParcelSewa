// Look of a sort button on the admin and Ankush order lists: blue when active, amber for the Late section.
export const sortButtonCls = (active: boolean, option: string) =>
    `px-4 py-2 rounded-xl border shadow-sm transition-all hover:text-white ${
        active
            ? option === "late" ? "bg-amber-500 text-white border-amber-500" : "bg-blue-500 text-white"
            : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
    } ${option === "late" ? "hover:bg-amber-500" : "hover:bg-blue-500"}`;
