// Round tick box laid over the image corner, so the tile keeps its size. Place inside a relative tile.
// The button around the circle is a larger, invisible touch area, so a tap near the tick ticks it
// instead of opening the image underneath.
export default function ProductTick({
    checked,
    onToggle,
    className = "left-0 top-0 h-12 w-12 p-1.5",
    dotClassName = "h-6 w-6",
}: {
    checked: boolean;
    onToggle: (checked: boolean) => void;
    className?: string;
    dotClassName?: string;
}) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={checked ? "Untick product" : "Tick product"}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggle(!checked);
            }}
            className={`group/tick absolute z-10 flex touch-manipulation items-start justify-start ${className}`}
        >
            <span
                className={`flex items-center justify-center rounded-full border-2 shadow-md transition group-active/tick:scale-90 ${dotClassName} ${
                    checked
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-red-400 bg-white/95 text-transparent group-hover/tick:text-red-300"
                }`}
            >
                <svg viewBox="0 0 20 20" className="h-[65%] w-[65%]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 10.5l3.2 3.2L15 6.8" />
                </svg>
            </span>
        </button>
    );
}
