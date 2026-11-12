"use client";

// The ⋯ menu on an admin order card: website order screenshots, a small photo album.
// Photos go to Cloudflare R2 (/api/upload-product-image) and their links are saved on the order.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { logOrderActivity } from "@/lib/order-logs";
import { pastedImages, PRODUCT_IMAGE_ACCEPT, uploadProductImages } from "@/lib/upload-product-image";

// Courier receipts are added in bulk from the admin header's "Receipts" link instead (app/admin/BulkReceipts.tsx).
const ALBUMS = {
    orderScreenshots: { title: "Order screenshots", icon: "🛒", empty: "No website order screenshots yet." },
} as const;
type AlbumKey = keyof typeof ALBUMS;

export default function OrderFilesMenu({ order, refresh }: { order: any; refresh: (orderId?: string) => void }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [album, setAlbum] = useState<AlbumKey | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const count = (key: AlbumKey) => (Array.isArray(order[key]) ? order[key].length : 0);

    useEffect(() => {
        if (!menuOpen) return;
        const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [menuOpen]);

    const total = count("orderScreenshots");

    return (
        <>
            <div ref={menuRef} className="relative shrink-0">
                <button type="button" onClick={() => setMenuOpen((o) => !o)} aria-label="Order files" title="Order screenshots"
                    className="relative grid h-7 w-7 place-items-center rounded-full bg-white text-gray-500 ring-1 ring-gray-200 transition hover:bg-gray-50 hover:text-gray-800">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><circle cx="4" cy="10" r="1.7" /><circle cx="10" cy="10" r="1.7" /><circle cx="16" cy="10" r="1.7" /></svg>
                    {total > 0 && (
                        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-blue-500 px-1 text-[9px] font-bold text-white">{total}</span>
                    )}
                </button>
                {menuOpen && (
                    <div className="absolute right-0 top-9 z-30 w-56 overflow-hidden rounded-xl bg-white py-1 shadow-xl ring-1 ring-gray-200">
                        {(Object.keys(ALBUMS) as AlbumKey[]).map((key) => (
                            <button key={key} type="button" onClick={() => { setAlbum(key); setMenuOpen(false); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                                <span>{ALBUMS[key].icon}</span>
                                <span className="flex-1">{ALBUMS[key].title}</span>
                                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-bold text-gray-600">{count(key)}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {/* Portalled to <body> so the card's overflow and blur can't clip the full-screen album. */}
            {album && createPortal(<AlbumModal order={order} refresh={refresh} albumKey={album} onClose={() => setAlbum(null)} />, document.body)}
        </>
    );
}

function AlbumModal({ order, refresh, albumKey, onClose }: { order: any; refresh: (orderId?: string) => void; albumKey: AlbumKey; onClose: () => void }) {
    const info = ALBUMS[albumKey];
    const photos: string[] = Array.isArray(order[albumKey]) ? order[albumKey] : [];
    const inputRef = useRef<HTMLInputElement>(null);
    // null = add new photos, a number = replace that photo.
    const replaceAt = useRef<number | null>(null);
    const [busy, setBusy] = useState("");
    const [message, setMessage] = useState("");
    const [viewing, setViewing] = useState<number | null>(null);

    const save = async (next: string[], what: "added" | "replaced" | "removed", details: Record<string, unknown>) => {
        await updateDoc(doc(db, "Confirm Orders", order.id), { [albumKey]: next });
        await logOrderActivity({
            action: what === "added" ? "file_added" : what === "replaced" ? "file_replaced" : "file_removed",
            orderId: order.id, before: order, after: { ...order, [albumKey]: next },
            details: { album: info.title, ...details },
        });
        refresh(order.id);
    };

    const upload = async (files: File[], at: number | null) => {
        if (files.length === 0 || busy) return;
        setBusy(at === null ? "Uploading…" : "Replacing…");
        setMessage("");
        try {
            const { urls, errors } = await uploadProductImages(at === null ? files : files.slice(0, 1));
            if (errors.length) setMessage(errors.join(" · "));
            if (urls.length === 0) return;
            if (at === null) {
                await save([...photos, ...urls], "added", { photos: urls });
            } else {
                const next = [...photos];
                const old = next[at];
                next[at] = urls[0];
                await save(next, "replaced", { photo: at + 1, from: old, to: urls[0] });
            }
        } catch (err) {
            console.error("Order file upload failed:", err);
            setMessage("Could not save the photo. Please try again.");
        } finally {
            setBusy("");
        }
    };

    const remove = async (i: number) => {
        if (!confirm("Remove this photo?")) return;
        setBusy("Removing…");
        try {
            const next = photos.filter((_, idx) => idx !== i);
            setViewing(next.length ? Math.min(i, next.length - 1) : null);
            await save(next, "removed", { photo: i + 1, url: photos[i] });
        } catch (err) {
            console.error("Order file remove failed:", err);
            setMessage("Could not remove the photo. Please try again.");
        } finally {
            setBusy("");
        }
    };

    // Screenshots can be pasted straight in (Ctrl+V) while the album is open.
    useEffect(() => {
        const onPaste = (e: ClipboardEvent) => {
            const files = pastedImages(e);
            if (!files.length) return;
            e.preventDefault();
            upload(files, viewing);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") { if (viewing !== null) setViewing(null); else onClose(); }
            if (viewing !== null && photos.length > 1 && e.key === "ArrowRight") setViewing((viewing + 1) % photos.length);
            if (viewing !== null && photos.length > 1 && e.key === "ArrowLeft") setViewing((viewing - 1 + photos.length) % photos.length);
        };
        window.addEventListener("paste", onPaste);
        window.addEventListener("keydown", onKey);
        return () => { window.removeEventListener("paste", onPaste); window.removeEventListener("keydown", onKey); };
    });

    const pick = (at: number | null) => { replaceAt.current = at; inputRef.current?.click(); };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            {/* The click that opens the file picker must not reach the backdrop, which closes the window. */}
            <input ref={inputRef} type="file" accept={PRODUCT_IMAGE_ACCEPT} multiple className="hidden" onClick={(e) => e.stopPropagation()}
                onChange={(e) => { const files = Array.from(e.target.files || []); e.target.value = ""; upload(files, replaceAt.current); }} />

            <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-3 flex items-center gap-2">
                    <span className="text-lg">{info.icon}</span>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-gray-900">{info.title}</h3>
                        <p className="truncate text-xs text-gray-500">{order.name} · {order.storeName}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-gray-500 hover:bg-gray-100">✕</button>
                </div>

                {photos.length === 0 ? (
                    <p className="rounded-xl bg-gray-50 px-3 py-6 text-center text-sm text-gray-500">{info.empty}</p>
                ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {photos.map((url, i) => (
                            <button key={url + i} type="button" onClick={() => setViewing(i)}
                                className="aspect-square overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200 transition hover:ring-2 hover:ring-blue-400">
                                <img src={url} alt={`${info.title} ${i + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}

                <button type="button" disabled={!!busy} onClick={() => pick(null)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60">
                    {busy || `⬆️ Upload ${info.title.toLowerCase()}`}
                </button>
                <p className="mt-1.5 text-center text-[11px] text-gray-400">You can also paste a screenshot here with Ctrl+V.</p>
                {message && <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700 ring-1 ring-rose-200">{message}</p>}
            </div>

            {viewing !== null && photos[viewing] && (
                <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black/85 p-4" onClick={(e) => { e.stopPropagation(); setViewing(null); }}>
                    <div className="relative flex max-h-[80vh] max-w-[92vw] items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <img src={photos[viewing]} alt={`${info.title} ${viewing + 1}`} className="max-h-[80vh] max-w-[92vw] rounded-xl object-contain shadow-2xl" />
                        {photos.length > 1 && (
                            <>
                                <button type="button" aria-label="Previous photo" onClick={() => setViewing((viewing - 1 + photos.length) % photos.length)}
                                    className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-xl text-white hover:bg-black/80">‹</button>
                                <button type="button" aria-label="Next photo" onClick={() => setViewing((viewing + 1) % photos.length)}
                                    className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-xl text-white hover:bg-black/80">›</button>
                            </>
                        )}
                        {busy && <div className="absolute inset-0 grid place-items-center rounded-xl bg-black/50 text-sm font-semibold text-white">{busy}</div>}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {photos.length > 1 && <span className="mr-1 text-xs font-semibold text-white/70">{viewing + 1} / {photos.length}</span>}
                        <a href={photos[viewing]} target="_blank" rel="noopener noreferrer"
                            className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/25">↗ Open</a>
                        <button type="button" disabled={!!busy} onClick={() => pick(viewing)}
                            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 disabled:opacity-60">🔁 Replace</button>
                        <button type="button" disabled={!!busy} onClick={() => remove(viewing)}
                            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60">🗑️ Remove</button>
                        <button type="button" onClick={() => setViewing(null)}
                            className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/25">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}
