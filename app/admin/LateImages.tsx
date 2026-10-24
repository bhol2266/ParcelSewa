"use client";

import { useEffect, useState } from "react";
import { LATE_AFTER_DAYS, type LateImage } from "@/lib/late-orders";
import { tickTheme } from "@/lib/product-checks";

const PAGE_SIZE = 60;

const daysLabel = (days: number) => `${days} day${days === 1 ? "" : "s"}`;

function Thumb({ item, onOpen }: { item: LateImage; onOpen: () => void }) {
    const [failed, setFailed] = useState(false);
    return (
        <button
            type="button"
            onClick={onOpen}
            title={`${item.order.name} · ${daysLabel(item.days)} since ordered`}
            aria-label={`Open product image of ${item.order.name}`}
            className="group block min-w-0 text-left"
        >
            <span className={`relative block aspect-square w-full overflow-hidden rounded-lg bg-gray-100 transition-colors dark:bg-gray-800 ${tickTheme(false)}`}>
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
                <span className="absolute left-1 top-1 rounded-full bg-red-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white">{item.days}d</span>
                {item.qty && item.qty !== "1" && (
                    <span className="absolute bottom-1 right-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">×{item.qty}</span>
                )}
            </span>
            <span className="mt-1 block truncate text-[11px] font-medium text-gray-600 dark:text-gray-300">{item.order.name}</span>
        </button>
    );
}

function Lightbox({ item, onClose, onPrev, onNext }: { item: LateImage; onClose: () => void; onPrev: (() => void) | null; onNext: (() => void) | null }) {
    const [failed, setFailed] = useState(false);
    const { order } = item;
    const pageUrl: string | undefined = order.productPageUrls?.[item.index];

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

    const arrowCls = "absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-2xl text-white hover:bg-black/70";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Late product image for ${order.name}`}>
            <div className="flex max-h-full w-full max-w-2xl flex-col overflow-y-auto rounded-2xl bg-white shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
                <div className="relative flex shrink-0 items-center justify-center bg-gray-100 ring-4 ring-inset ring-red-400 dark:bg-gray-800">
                    {failed ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex h-64 w-full items-center justify-center p-4 text-center text-sm text-blue-600 underline">
                            🔗 Image can&apos;t be shown — open link
                        </a>
                    ) : (
                        <img src={item.url} alt="Product" onError={() => setFailed(true)} className="max-h-[60vh] w-full object-contain" />
                    )}
                    <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-lg text-white hover:bg-black/80">
                        ✕
                    </button>
                    {onPrev && <button type="button" onClick={onPrev} aria-label="Previous image" className={`${arrowCls} left-2`}>‹</button>}
                    {onNext && <button type="button" onClick={onNext} aria-label="Next image" className={`${arrowCls} right-2`}>›</button>}
                </div>

                <div className="space-y-2.5 p-4 text-gray-700 dark:text-gray-300">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{order.name}</h3>
                        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950 dark:text-red-300">⏰ {daysLabel(item.days)} late</span>
                    </div>
                    {order.mobile && (
                        <a
                            href={`https://wa.me/${String(order.mobile).replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-lg bg-green-600 px-3 py-2 text-white hover:bg-green-700"
                        >
                            📞 WhatsApp: {order.mobile}
                        </a>
                    )}
                    {order.address && <p><b>Address:</b> {order.address}</p>}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {[order.storeName, item.qty && item.qty !== "1" && `×${item.qty}`].filter(Boolean).join(" · ")}
                        {(order.storeName || (item.qty && item.qty !== "1")) && " · "}
                        {pageUrl && (
                            <>
                                <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Product page</a>
                                {" · "}
                            </>
                        )}
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Open image</a>
                    </p>
                </div>
            </div>
        </div>
    );
}

// The product images of late orders that haven't been ticked as received yet, most overdue first.
export default function LateImages({ items }: { items: LateImage[] }) {
    const [visible, setVisible] = useState(PAGE_SIZE);
    // Kept by key, not position, so the open image stays put if the list changes underneath it.
    const [activeKey, setActiveKey] = useState<string | null>(null);

    const active = activeKey !== null ? items.findIndex((item) => item.key === activeKey) : -1;
    const current = active >= 0 ? items[active] : undefined;

    if (items.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-green-300 bg-green-50 p-8 text-center text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300">
                ✅ Nothing missing — every product of the late orders is ticked as received.
            </div>
        );
    }

    return (
        <div>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                {items.length} image{items.length === 1 ? "" : "s"} not received yet from orders older than {LATE_AFTER_DAYS} days · most overdue first
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
                {items.slice(0, visible).map((item) => (
                    <Thumb key={item.key} item={item} onOpen={() => setActiveKey(item.key)} />
                ))}
            </div>
            {visible < items.length && (
                <button
                    type="button"
                    className="mx-auto mt-4 block rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm text-gray-700 shadow-sm transition-all hover:bg-blue-500 hover:text-white dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                >
                    Show more ({items.length - visible} left)
                </button>
            )}
            {current && (
                <Lightbox
                    key={current.key}
                    item={current}
                    onClose={() => setActiveKey(null)}
                    onPrev={active > 0 ? () => setActiveKey(items[active - 1].key) : null}
                    onNext={active < items.length - 1 ? () => setActiveKey(items[active + 1].key) : null}
                />
            )}
        </div>
    );
}
