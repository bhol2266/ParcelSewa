// A product's tick lives on its entry in the order's productItems, so it moves with the product when links are edited.
export const isProductChecked = (order: any, index: number): boolean => order.productItems?.[index]?.checked === true;

// The order's productItems with one product's tick set; older orders without productItems get them built from the links.
export function withProductChecked(order: any, index: number, checked: boolean) {
    const items = (order.productUrls ?? []).map((url: string, i: number) => ({ url, quantity: "1", ...(order.productItems?.[i] ?? {}) }));
    items[index] = { ...items[index], checked };
    return items;
}

// The tile's border carries the theme: green once ticked, red until then.
export const tickTheme = (checked: boolean) => (checked ? "border-2 border-green-500" : "border-2 border-red-400");

// Round tick box laid over the image corner, so the tile keeps its size. Place inside a relative tile.
export default function ProductTick({
    checked,
    onToggle,
    className = "left-1.5 top-1.5 h-6 w-6",
}: {
    checked: boolean;
    onToggle: (checked: boolean) => void;
    className?: string;
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
            className={`absolute z-10 flex items-center justify-center rounded-full border-2 shadow-md transition active:scale-90 ${className} ${
                checked
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-red-400 bg-white/95 text-transparent hover:text-red-300"
            }`}
        >
            <svg viewBox="0 0 20 20" className="h-[65%] w-[65%]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 10.5l3.2 3.2L15 6.8" />
            </svg>
        </button>
    );
}
