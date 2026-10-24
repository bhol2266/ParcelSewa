"use client";

import { useEffect, useMemo, useState } from "react";
import ProductTick from "./ProductTick";
import { checkedDateLabel, isProductChecked, tickTheme } from "@/lib/product-checks";

interface Order {
    id: string;
    [key: string]: any;
}

type GallerySort = "latest" | "oldest" | "name";

type ToggleProduct = (order: Order, index: number, checked: boolean) => void;

interface GalleryItem {
    key: string;
    url: string;
    index: number;
    checked: boolean;
    checkedOn: string;
    qty: string | null;
    order: Order;
}

const PAGE_SIZE = 60;

const SORT_LABELS: Record<GallerySort, string> = {
    oldest: "Oldest",
    latest: "Latest",
    name: "Name A–Z",
};

const createdMillis = (o: Order) => o.createdAt?.toMillis?.() ?? 0;

function Thumb({ item, onOpen, onToggle }: { item: GalleryItem; onOpen: () => void; onToggle: ToggleProduct }) {
    const [failed, setFailed] = useState(false);
    return (
        <div className="relative">
            <button
                type="button"
                onClick={onOpen}
                title={item.order.name}
                aria-label={`Open product image of ${item.order.name}`}
                className={`group relative block aspect-square w-full overflow-hidden rounded-lg bg-gray-100 transition-colors ${tickTheme(item.checked)}`}
            >
                {failed ? (
                    <span className="flex h-full w-full items-center justify-center text-xl text-gray-400">🔗</span>
                ) : (
                    <img
                        src={item.url}
                        alt="Product"
                        loading="lazy"
                        decoding="async"
                        onError={() => setFailed(true)}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                )}
                {item.checkedOn && (
                    <span className="absolute bottom-1 left-1 rounded-full bg-green-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {item.checkedOn}
                    </span>
                )}
                {item.qty && item.qty !== "1" && (
                    <span className="absolute bottom-1 right-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        ×{item.qty}
                    </span>
                )}
            </button>
            <ProductTick checked={item.checked} onToggle={(checked) => onToggle(item.order, item.index, checked)} />
        </div>
    );
}

function Lightbox({
    item,
    onClose,
    onPrev,
    onNext,
    onToggle,
}: {
    item: GalleryItem;
    onToggle: ToggleProduct;
    onClose: () => void;
    onPrev: (() => void) | null;
    onNext: (() => void) | null;
}) {
    const [failed, setFailed] = useState(false);
    const { order } = item;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowLeft") onPrev?.();
            else if (e.key === "ArrowRight") onNext?.();
        };
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [onClose, onPrev, onNext]);

    const arrowCls =
        "absolute top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-2xl text-white hover:bg-black/70";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={`Product image for ${order.name}`}
        >
            <div
                className="flex max-h-full w-full max-w-2xl flex-col overflow-y-auto rounded-xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`relative flex shrink-0 items-center justify-center bg-gray-100 ring-4 ring-inset ${item.checked ? "ring-green-500" : "ring-red-400"}`}>
                    {failed ? (
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-64 w-full items-center justify-center p-4 text-center text-sm text-blue-600 underline"
                        >
                            🔗 Image can&apos;t be shown — open link
                        </a>
                    ) : (
                        <img
                            src={item.url}
                            alt="Product"
                            onError={() => setFailed(true)}
                            className="max-h-[60vh] w-full object-contain"
                        />
                    )}
                    <ProductTick
                        checked={item.checked}
                        onToggle={(checked) => onToggle(order, item.index, checked)}
                        className="left-1.5 top-1.5 h-16 w-16 p-1.5"
                        dotClassName="h-9 w-9"
                    />
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-lg text-white hover:bg-black/80"
                    >
                        ✕
                    </button>
                    {onPrev && (
                        <button type="button" onClick={onPrev} aria-label="Previous image" className={`${arrowCls} left-2`}>
                            ‹
                        </button>
                    )}
                    {onNext && (
                        <button type="button" onClick={onNext} aria-label="Next image" className={`${arrowCls} right-2`}>
                            ›
                        </button>
                    )}
                </div>

                <div className="space-y-2 p-4 text-gray-700">
                    <h3 className="text-xl font-bold text-gray-900">{order.name}</h3>
                    {order.mobile && (
                        <a
                            href={`https://wa.me/${String(order.mobile).replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-md bg-green-600 px-3 py-2 text-white hover:bg-green-700"
                        >
                            📞 WhatsApp: {order.mobile}
                        </a>
                    )}
                    <p><b>Address:</b> {order.address}</p>
                    {item.checked && (
                        <p className="font-semibold text-green-700">
                            ✓ Received{checkedDateLabel(order, item.index, true) && ` on ${checkedDateLabel(order, item.index, true)}`}
                        </p>
                    )}
                    <p className="text-xs text-gray-500">
                        {[order.storeName, item.qty && `×${item.qty}`].filter(Boolean).join(" · ")}
                        {(order.storeName || item.qty) && " · "}
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                            Open original
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function ProductGalleryAnkush({ orders, onToggle }: { orders: Order[] | null; onToggle: ToggleProduct }) {
    const [sort, setSort] = useState<GallerySort>("oldest");
    const [visible, setVisible] = useState(PAGE_SIZE);
    // Kept by key, not position, so the open image stays put when ticking moves it in the list.
    const [activeKey, setActiveKey] = useState<string | null>(null);

    const { items, orderCount } = useMemo(() => {
        const sorted = [...(orders ?? [])].sort((a, b) => {
            if (sort === "oldest") return createdMillis(a) - createdMillis(b);
            if (sort === "name") {
                return (
                    (a.name ?? "").trim().localeCompare((b.name ?? "").trim(), undefined, { sensitivity: "base" }) ||
                    createdMillis(b) - createdMillis(a)
                );
            }
            return createdMillis(b) - createdMillis(a);
        });
        const flat: GalleryItem[] = [];
        let withImages = 0;
        for (const order of sorted) {
            const urls: string[] = order.productUrls ?? [];
            let added = false;
            urls.forEach((url, i) => {
                if (!url) return;
                added = true;
                flat.push({
                    key: `${order.id}-${i}`,
                    url,
                    index: i,
                    checked: isProductChecked(order, i),
                    checkedOn: checkedDateLabel(order, i),
                    qty: order.productItems?.[i]?.quantity ?? null,
                    order,
                });
            });
            if (added) withImages++;
        }
        // Not received first, received last; stable, so each group keeps the order chosen above.
        flat.sort((a, b) => Number(a.checked) - Number(b.checked));
        return { items: flat, orderCount: withImages };
    }, [orders, sort]);

    if (orders === null) {
        return <p className="mt-10 text-center text-gray-500 dark:text-gray-400">Loading images…</p>;
    }

    const active = activeKey !== null ? items.findIndex((item) => item.key === activeKey) : -1;
    const current = active >= 0 ? items[active] : undefined;

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                {(Object.keys(SORT_LABELS) as GallerySort[]).map((option) => (
                    <button
                        key={option}
                        className={`rounded-lg border px-3 py-1 text-sm ${
                            sort === option
                                ? "bg-blue-500 text-white"
                                : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                        } shadow-sm hover:bg-blue-500 hover:text-white transition-all`}
                        onClick={() => {
                            setSort(option);
                            setVisible(PAGE_SIZE);
                        }}
                    >
                        {SORT_LABELS[option]}
                    </button>
                ))}
                <span className="text-xs text-gray-400">
                    {items.length} images · {orderCount} orders
                </span>
            </div>

            {items.length === 0 ? (
                <p className="mt-10 text-center text-gray-500 dark:text-gray-400">No product images found.</p>
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
                        {items.slice(0, visible).map((item) => (
                            <Thumb key={item.key} item={item} onOpen={() => setActiveKey(item.key)} onToggle={onToggle} />
                        ))}
                    </div>
                    {visible < items.length && (
                        <button
                            className="mx-auto mt-4 block rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm text-gray-700 shadow-sm hover:bg-blue-500 hover:text-white dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300"
                            onClick={() => setVisible((v) => v + PAGE_SIZE)}
                        >
                            Show more ({items.length - visible} left)
                        </button>
                    )}
                </>
            )}

            {current && (
                <Lightbox
                    key={current.key}
                    item={current}
                    onToggle={onToggle}
                    onClose={() => setActiveKey(null)}
                    onPrev={active > 0 ? () => setActiveKey(items[active - 1].key) : null}
                    onNext={active < items.length - 1 ? () => setActiveKey(items[active + 1].key) : null}
                />
            )}
        </div>
    );
}
