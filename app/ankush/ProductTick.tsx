// A product's tick lives on its entry in the order's productItems, so it moves with the product when links are edited.
export const isProductChecked = (order: any, index: number): boolean => order.productItems?.[index]?.checked === true;

// The order's productItems with one product's tick set; older orders without productItems get them built from the links.
export function withProductChecked(order: any, index: number, checked: boolean) {
    const items = (order.productUrls ?? []).map((url: string, i: number) => ({ url, quantity: "1", ...(order.productItems?.[i] ?? {}) }));
    items[index] = { ...items[index], checked };
    return items;
}

// Green glow around a ticked product, red glow around one that isn't ticked yet.
export const tickTheme = (checked: boolean) =>
    checked
        ? "ring-2 ring-green-500 shadow-[0_0_8px_rgba(34,197,94,0.55)]"
        : "ring-2 ring-red-400 shadow-[0_0_8px_rgba(248,113,113,0.55)]";

// Tick box plus a light green/red wash, laid over the image so the tile keeps its size. Place inside a relative tile.
export default function ProductTick({
    checked,
    onToggle,
    className = "left-1 top-1 h-6 w-6 text-sm",
}: {
    checked: boolean;
    onToggle: (checked: boolean) => void;
    className?: string;
}) {
    return (
        <>
            <span className={`pointer-events-none absolute inset-0 rounded-md ${checked ? "bg-green-500/15" : "bg-red-500/20"}`} />
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
                className={`absolute z-10 flex items-center justify-center rounded-md border-2 font-bold shadow transition ${className} ${
                    checked
                        ? "border-green-600 bg-green-500 text-white"
                        : "border-red-400 bg-white/90 text-transparent hover:border-red-500"
                }`}
            >
                ✓
            </button>
        </>
    );
}
