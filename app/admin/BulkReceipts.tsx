"use client";

// Bulk courier receipts: paste/drop/pick many receipt photos at once. Each is uploaded to R2, read by Claude
// (consignee name, phone, tracking number) and matched to an order that is all received, or was marked delivered
// in the last 48 hours. Sure matches are pre-selected; unsure ones stop and ask, with suggested orders to pick.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { arrayUnion, collection, doc, getDocs, limit, orderBy, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { logOrderActivity } from "@/lib/order-logs";
import { isOrderAllReceived } from "@/lib/product-checks";
import { pastedImages, PRODUCT_IMAGE_ACCEPT, uploadProductImages } from "@/lib/upload-product-image";

type Order = { id: string; [key: string]: any };
type Reading = { name: string; phone: string; address: string; trackingNumber: string; code: string; cod: string; readable: boolean };
type Suggestion = { order: Order; score: number; why: string };
type Item = {
    key: string;
    preview: string;
    url?: string;
    status: "uploading" | "reading" | "done" | "error";
    error?: string;
    reading?: Reading;
    suggestions: Suggestion[];
    sure: boolean;
    // undefined = still to decide, "" = skip, otherwise the order id.
    choice?: string;
};

const DELIVERED_WINDOW_MS = 48 * 3600_000;
const last10 = (v: unknown) => String(v ?? "").replace(/\D/g, "").slice(-10);
const letters = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);

function editDistance(a: string, b: string): number {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        let prev = row[0];
        row[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const cur = row[j];
            row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
            prev = cur;
        }
    }
    return row[b.length];
}

// 0..1: how alike two names are, forgiving spacing ("Sirshan raj" / "sirshanraj") and small typos ("gauirav" / "gaurav").
function nameScore(a: string, b: string): number {
    const ta = letters(a), tb = letters(b);
    if (!ta.length || !tb.length) return 0;
    const ca = ta.join(""), cb = tb.join("");
    const whole = 1 - editDistance(ca, cb) / Math.max(ca.length, cb.length);
    const tokenHits = ta.filter((t) => tb.some((u) => u === t || (t.length >= 4 && u.length >= 4 && editDistance(t, u) <= 1))).length;
    const tokens = tokenHits / Math.max(ta.length, tb.length);
    return Math.max(whole, tokens);
}

function suggest(reading: Reading, orders: Order[]): { suggestions: Suggestion[]; sure: boolean } {
    const scored = orders.map((order) => {
        const phoneHit = !!reading.phone && reading.phone.length === 10 && last10(order.mobile) === reading.phone;
        const name = nameScore(reading.name, order.name);
        const score = (phoneHit ? 1 : 0) + name;
        const why = phoneHit ? (name >= 0.6 ? "phone + name match" : "phone matches") : name >= 0.6 ? "name looks similar" : "weak match";
        return { order, score, why, phoneHit, name };
    }).sort((a, b) => b.score - a.score);

    const top = scored[0];
    const second = scored[1];
    const phoneHits = scored.filter((s) => s.phoneHit);
    const sure = !!top && reading.readable && (
        (phoneHits.length === 1 && top.phoneHit) ||
        (!reading.phone && top.name >= 0.85 && (!second || second.name < 0.6))
    );
    return { suggestions: scored.filter((s) => s.score >= 0.4).slice(0, 3).map(({ order, score, why }) => ({ order, score, why })), sure };
}

const orderState = (o: Order) => (o.deliveryStatus === true ? "Delivered" : "All received");

export default function BulkReceipts({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
    const [orders, setOrders] = useState<Order[] | null>(null);
    const [loadError, setLoadError] = useState("");
    const [items, setItems] = useState<Item[]>([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState("");
    const [viewing, setViewing] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const ordersRef = useRef<Order[]>([]);

    // Orders a receipt can belong to: all received (pending), or marked delivered in the last 48 hours.
    useEffect(() => {
        (async () => {
            try {
                const [pendingSnap, deliveredSnap] = await Promise.all([
                    getDocs(query(collection(db, "Confirm Orders"), where("deliveryStatus", "==", false), orderBy("createdAt", "asc"))),
                    getDocs(query(collection(db, "Confirm Orders"), where("deliveryStatus", "==", true), orderBy("deliveryDate", "desc"), limit(80))),
                ]);
                const since = Date.now() - DELIVERED_WINDOW_MS;
                const list: Order[] = [
                    ...pendingSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isOrderAllReceived),
                    ...deliveredSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)).filter((o) => (o.deliveryDate?.toMillis?.() ?? 0) >= since),
                ];
                ordersRef.current = list;
                setOrders(list);
            } catch (err) {
                console.error("Loading orders for receipts failed:", err);
                setLoadError("Couldn't load the orders. Close and try again.");
            }
        })();
    }, []);

    const update = (key: string, patch: Partial<Item>) => setItems((list) => list.map((it) => (it.key === key ? { ...it, ...patch } : it)));

    const processOne = useCallback(async (key: string, file: File) => {
        try {
            const { urls, errors } = await uploadProductImages([file]);
            if (!urls[0]) throw new Error(errors[0] || "Upload failed");
            update(key, { url: urls[0], status: "reading" });
            const res = await fetch("/api/read-courier-receipt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: urls[0] }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Couldn't read the receipt");
            const reading = data as Reading;
            const { suggestions, sure } = suggest(reading, ordersRef.current);
            const already = suggestions[0]?.order.courierTrackingNumber && suggestions[0].order.courierTrackingNumber === reading.trackingNumber;
            update(key, { status: "done", reading, suggestions, sure: sure && !already, choice: sure && !already ? suggestions[0].order.id : undefined });
        } catch (err) {
            update(key, { status: "error", error: err instanceof Error ? err.message : "Failed", suggestions: [], sure: false });
        }
    }, []);

    const addFiles = useCallback((files: File[]) => {
        const images = files.filter((f) => f.type.startsWith("image/"));
        if (!images.length) return;
        setSaved("");
        const fresh = images.map((file, i) => ({ file, item: { key: `${Date.now()}-${i}-${file.name}`, preview: URL.createObjectURL(file), status: "uploading" as const, suggestions: [], sure: false } }));
        setItems((list) => [...list, ...fresh.map((f) => f.item)]);
        // Three at a time keeps it quick without flooding the upload or Claude.
        let next = 0;
        const worker = async () => { while (next < fresh.length) { const { file, item } = fresh[next++]; await processOne(item.key, file); } };
        Promise.all([worker(), worker(), worker()]);
    }, [processOne]);

    useEffect(() => {
        const onPaste = (e: ClipboardEvent) => { const files = pastedImages(e); if (files.length) { e.preventDefault(); addFiles(files); } };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { if (viewing) setViewing(null); else if (!saving) onClose(); } };
        window.addEventListener("paste", onPaste);
        window.addEventListener("keydown", onKey);
        return () => { window.removeEventListener("paste", onPaste); window.removeEventListener("keydown", onKey); };
    }, [addFiles, onClose, saving, viewing]);

    const busy = items.some((it) => it.status === "uploading" || it.status === "reading");
    const toAttach = items.filter((it) => it.status === "done" && it.url && it.choice);
    const undecided = items.filter((it) => it.status === "done" && it.choice === undefined);
    const usedBy = (orderId: string) => items.filter((it) => it.choice === orderId).length;

    const attach = async () => {
        if (!toAttach.length || saving) return;
        setSaving(true);
        try {
            const byOrder = new Map<string, Item[]>();
            for (const it of toAttach) byOrder.set(it.choice as string, [...(byOrder.get(it.choice as string) || []), it]);
            for (const [orderId, its] of byOrder) {
                const order = ordersRef.current.find((o) => o.id === orderId);
                const urls = its.map((it) => it.url as string);
                const tracking = its.map((it) => it.reading?.trackingNumber).filter(Boolean).at(-1);
                const patch: Record<string, unknown> = { courierReceipts: arrayUnion(...urls) };
                if (tracking) patch.courierTrackingNumber = tracking;
                await updateDoc(doc(db, "Confirm Orders", orderId), patch);
                await logOrderActivity({
                    action: "file_added", orderId, before: order,
                    after: { ...order, courierReceipts: [...(order?.courierReceipts || []), ...urls], ...(tracking ? { courierTrackingNumber: tracking } : {}) },
                    details: { album: "Courier receipts", bulk: true, photos: urls, ...(tracking ? { trackingNumber: tracking } : {}) },
                });
            }
            setSaved(`Attached ${toAttach.length} receipt${toAttach.length === 1 ? "" : "s"} to ${byOrder.size} order${byOrder.size === 1 ? "" : "s"}.`);
            setItems((list) => list.filter((it) => !toAttach.includes(it)));
            onDone();
        } catch (err) {
            console.error("Attaching receipts failed:", err);
            setSaved("Something failed while saving. Check the orders and try again.");
        } finally {
            setSaving(false);
        }
    };

    const optionLabel = (o: Order) => `${o.name} · ${String(o.mobile || "").replace(/^\+977/, "")} · ${orderState(o)}`;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={() => !saving && onClose()}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files)); }}>
            <input ref={inputRef} type="file" accept={PRODUCT_IMAGE_ACCEPT} multiple className="hidden"
                onChange={(e) => { const files = Array.from(e.target.files || []); e.target.value = ""; addFiles(files); }} />
            <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 border-b border-gray-100 p-4">
                    <span className="text-lg">🧾</span>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-gray-900">Bulk courier receipts</h3>
                        <p className="text-xs text-gray-500">
                            {orders === null ? "Loading orders…" : `${orders.length} orders to match against: all received, or marked delivered in the last 48 hours.`}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-gray-500 hover:bg-gray-100">✕</button>
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
                    {loadError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{loadError}</p>}
                    <button type="button" disabled={orders === null} onClick={() => inputRef.current?.click()}
                        className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 px-3 py-5 text-sm text-gray-600 transition hover:border-blue-400 hover:bg-blue-50 disabled:opacity-60">
                        <span className="font-semibold">Paste all receipts here (Ctrl+V), drop them, or click to choose</span>
                        <span className="text-xs text-gray-400">Each photo is read and matched to its order by phone number and name.</span>
                    </button>

                    {saved && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">{saved}</p>}

                    {items.map((it) => {
                        const chosen = ordersRef.current.find((o) => o.id === it.choice);
                        const needsCheck = it.status === "done" && it.choice === undefined;
                        const clash = it.choice ? usedBy(it.choice) > 1 : false;
                        return (
                            <div key={it.key} className={`flex gap-3 rounded-xl p-2.5 ring-1 ${it.status === "error" ? "bg-rose-50 ring-rose-200" : needsCheck ? "bg-amber-50 ring-amber-300" : it.choice ? "bg-emerald-50/60 ring-emerald-200" : "bg-gray-50 ring-gray-200"}`}>
                                <button type="button" onClick={() => setViewing(it.url || it.preview)} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-200 ring-1 ring-gray-200">
                                    <img src={it.preview} alt="Receipt" className="h-full w-full object-cover" />
                                </button>
                                <div className="min-w-0 flex-1 space-y-1.5 text-sm">
                                    {it.status === "uploading" && <p className="text-gray-500">Uploading…</p>}
                                    {it.status === "reading" && <p className="text-gray-500">Reading the receipt…</p>}
                                    {it.status === "error" && <p className="text-rose-700">{it.error}</p>}
                                    {it.status === "done" && it.reading && (
                                        <>
                                            <p className="text-xs text-gray-600">
                                                Read: <strong className="text-gray-900">{it.reading.name || "?"}</strong> · {it.reading.phone || "no phone"}
                                                {it.reading.trackingNumber && <> · #{it.reading.trackingNumber}</>}
                                                {it.reading.cod && <> · COD {it.reading.cod}</>}
                                                {!it.reading.readable && <span className="ml-1 font-semibold text-amber-700">(hard to read)</span>}
                                            </p>
                                            {needsCheck && (
                                                <p className="text-xs font-semibold text-amber-800">
                                                    {it.suggestions.length ? "Not sure which order this is. Pick one:" : "No matching order found. Pick one or skip:"}
                                                </p>
                                            )}
                                            {(needsCheck || !it.sure) && it.suggestions.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {it.suggestions.map((s) => (
                                                        <button key={s.order.id} type="button" onClick={() => update(it.key, { choice: s.order.id })}
                                                            className={`rounded-lg px-2 py-1 text-xs font-medium ring-1 transition ${it.choice === s.order.id ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-gray-700 ring-gray-300 hover:ring-blue-400"}`}>
                                                            {s.order.name} · {last10(s.order.mobile)} <span className="opacity-70">({s.why})</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <select value={it.choice ?? "?"} onChange={(e) => update(it.key, { choice: e.target.value === "?" ? undefined : e.target.value })}
                                                    className="min-w-0 max-w-full flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs">
                                                    <option value="?" disabled>Choose the order…</option>
                                                    <option value="">Skip this receipt</option>
                                                    {(orders || []).map((o) => <option key={o.id} value={o.id}>{optionLabel(o)}</option>)}
                                                </select>
                                                {chosen && it.sure && <span className="text-xs font-semibold text-emerald-700">✓ {it.suggestions[0]?.why}</span>}
                                                {(chosen?.courierReceipts?.length ?? 0) > 0 && <span className="text-xs text-gray-500">already has {chosen?.courierReceipts.length} receipt{chosen?.courierReceipts.length === 1 ? "" : "s"}</span>}
                                                {clash && <span className="text-xs font-semibold text-amber-700">⚠ same order picked twice</span>}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <button type="button" onClick={() => setItems((list) => list.filter((x) => x.key !== it.key))} aria-label="Remove" className="h-7 w-7 shrink-0 rounded-full text-gray-400 hover:bg-white hover:text-gray-700">✕</button>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 p-4">
                    <p className="flex-1 text-xs text-gray-500">
                        {busy ? "Reading receipts…" : undecided.length ? `${undecided.length} receipt${undecided.length === 1 ? "" : "s"} need${undecided.length === 1 ? "s" : ""} you to pick the order.` : items.length ? "Check the matches, then attach." : ""}
                    </p>
                    <button type="button" onClick={attach} disabled={!toAttach.length || busy || undecided.length > 0 || saving}
                        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
                        {saving ? "Attaching…" : `Attach ${toAttach.length || ""} receipt${toAttach.length === 1 ? "" : "s"}`}
                    </button>
                </div>
            </div>

            {viewing && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4" onClick={(e) => { e.stopPropagation(); setViewing(null); }}>
                    <img src={viewing} alt="Receipt" className="max-h-[90vh] max-w-[94vw] rounded-xl object-contain" />
                </div>
            )}
        </div>,
        document.body,
    );
}
