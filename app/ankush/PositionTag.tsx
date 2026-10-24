// Small number pill laid over a product image or an edit row, so it adds no height or width.
export default function PositionTag({ n, className = "" }: { n: number; className?: string }) {
    return (
        <span
            className={`pointer-events-none absolute z-10 min-w-[1.125rem] rounded-full bg-black/75 px-1.5 text-center font-bold text-white ring-1 ring-white/30 ${className}`}
        >
            {n}
        </span>
    );
}
