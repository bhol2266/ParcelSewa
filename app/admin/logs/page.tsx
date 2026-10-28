"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { collection, getDocs, limit, orderBy, query, startAfter, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { LOGS_COOKIE, LOGS_PASSWORD } from "@/lib/admin-access";
import { ACTION_LABEL, ORDER_LOGS, showValue, type FieldChange, type LogAction, type LogProduct, type OrderLog } from "@/lib/order-logs";

const PAGE_SIZE = 100;

// Read-only: this page never writes to the logs, it only lists them.
const ACTION_STYLE: Record<LogAction, { icon: string; cls: string }> = {
    created: { icon: "🆕", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    edited: { icon: "✏️", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
    cancelled: { icon: "🚫", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
    cancel_reversed: { icon: "↩️", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
    deleted: { icon: "🗑️", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
    price_verified: { icon: "✓", cls: "bg-violet-50 text-violet-700 ring-violet-200" },
    error_removed: { icon: "✕", cls: "bg-orange-50 text-orange-700 ring-orange-200" },
    images_fetched: { icon: "🤖", cls: "bg-purple-50 text-purple-700 ring-purple-200" },
    product_received: { icon: "☑️", cls: "bg-teal-50 text-teal-700 ring-teal-200" },
    product_unreceived: { icon: "⬜", cls: "bg-gray-50 text-gray-700 ring-gray-200" },
};

// Quick filters on top of the action type: anything that touched prices or products.
type Filter = "all" | "price" | "products" | LogAction;

const hasPriceChange = (log: OrderLog) => log.changes?.some(c => c.kind === "price") || log.action === "price_verified" || log.action === "error_removed";
const hasProductChange = (log: OrderLog) => !!log.products && (log.products.added?.length > 0 || log.products.removed?.length > 0 || log.products.updated?.length > 0) && log.action !== "created";

const dayLabel = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });
const timeLabel = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function ProductRow({ p, tone }: { p: LogProduct; tone: string }) {
    return (
        <li className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs ring-1 ${tone}`}>
            <span className="shrink-0 font-bold">#{p.position}</span>
            <span className="min-w-0 flex-1 space-y-0.5">
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="block truncate underline decoration-dotted underline-offset-2" title={p.url}>{p.url || "—"}</a>
                {p.pageUrl && p.pageUrl !== p.url && (
                    <a href={p.pageUrl} target="_blank" rel="noopener noreferrer" className="block truncate opacity-70 underline decoration-dotted underline-offset-2" title={p.pageUrl}>Page: {p.pageUrl}</a>
                )}
            </span>
            <span className="shrink-0 font-semibold">×{p.quantity}</span>
        </li>
    );
}

function ChangesTable({ changes }: { changes: FieldChange[] }) {
    return (
        <div className="overflow-x-auto rounded-lg ring-1 ring-gray-200 dark:ring-gray-700">
            <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    <tr><th className="px-2 py-1.5">Field</th><th className="px-2 py-1.5">Before</th><th className="px-2 py-1.5">After</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {changes.map(c => (
                        <tr key={c.field} className={c.kind === "price" ? "bg-amber-50/60 dark:bg-amber-900/10" : ""}>
                            <td className="whitespace-nowrap px-2 py-1.5 font-semibold text-gray-700 dark:text-gray-200">{c.kind === "price" && "💰 "}{c.label}</td>
                            <td className="px-2 py-1.5 text-rose-700 line-through decoration-rose-300 dark:text-rose-300 whitespace-pre-wrap break-words">{c.from}</td>
                            <td className="px-2 py-1.5 font-medium text-emerald-700 dark:text-emerald-300 whitespace-pre-wrap break-words">{c.to}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Order fields shown for a created or deleted order, in a readable order.
const SNAPSHOT_FIELDS: [string, string][] = [
    ["name", "Customer"], ["mobile", "Mobile"], ["address", "Address"], ["storeName", "Store"],
    ["totalAmount", "Total amount"], ["advancePayment", "Advance payment"], ["commission", "Commission"], ["courierCharge", "Courier charge"],
    ["deliveryStatus", "Delivery status"], ["deliveredBy", "Delivered by"], ["orderedDate", "Ordered date"], ["deliveryDate", "Delivered date"],
    ["createdAt", "Created"], ["hasError", "Error mode"], ["errorNote", "Error note"], ["notes", "Notes"],
];

function Snapshot({ order }: { order: Record<string, any> }) {
    const products: LogProduct[] = (order.productUrls || []).map((url: string, i: number) => ({
        position: i + 1, url, pageUrl: order.productPageUrls?.[i] || "", quantity: String(order.productItems?.[i]?.quantity ?? "1"),
    }));
    return (
        <div className="space-y-2">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                {SNAPSHOT_FIELDS.filter(([f]) => order[f] !== undefined && order[f] !== null && order[f] !== "").map(([f, label]) => (
                    <div key={f} className="flex gap-2">
                        <dt className="shrink-0 text-gray-500 dark:text-gray-400">{label}:</dt>
                        <dd className="min-w-0 break-words font-medium text-gray-800 dark:text-gray-100">{showValue(f, order[f])}</dd>
                    </div>
                ))}
            </dl>
            {products.length > 0 && (
                <ul className="space-y-1">{products.map(p => <ProductRow key={p.position} p={p} tone="bg-gray-50 text-gray-700 ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700" />)}</ul>
            )}
        </div>
    );
}

function Details({ details }: { details: Record<string, any> }) {
    const items: { url: string; priceInr: number; qty: number }[] = Array.isArray(details.items) ? details.items : [];
    const rows = Object.entries(details).filter(([k]) => k !== "items");
    const label = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
    return (
        <div className="space-y-1.5 text-xs">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                {rows.map(([k, v]) => (
                    <div key={k}><dt className="text-gray-500 dark:text-gray-400">{label(k)}</dt><dd className="font-semibold text-gray-800 dark:text-gray-100">{typeof v === "number" ? v.toLocaleString("en-IN") : String(v)}</dd></div>
                ))}
            </dl>
            {items.length > 0 && (
                <ul className="space-y-0.5">
                    {items.map((item, i) => (
                        <li key={i} className="flex justify-between gap-2">
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate underline decoration-dotted underline-offset-2">{i + 1}. {item.url}</a>
                            <span className="shrink-0 font-medium">₹{item.priceInr.toLocaleString()}{item.qty !== 1 && ` × ${item.qty}`}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function LogEntry({ log }: { log: OrderLog }) {
    const style = ACTION_STYLE[log.action] ?? { icon: "•", cls: "bg-gray-50 text-gray-700 ring-gray-200" };
    const at = log.at?.toDate?.() ?? new Date(0);
    const p = log.products ?? { added: [], removed: [], updated: [] };
    const showProducts = log.action !== "created" && (p.added?.length || p.removed?.length || p.updated?.length);
    return (
        <details className="group rounded-xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
            <summary className="flex cursor-pointer list-none items-start gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                <span className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${style.cls}`}>
                    <span>{style.icon}</span>{ACTION_LABEL[log.action] ?? log.action}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{log.customer || "Unknown customer"}<span className="font-normal text-gray-400"> · {log.mobile}</span></span>
                    <span className="block text-xs text-gray-600 dark:text-gray-300">{log.summary}</span>
                </span>
                <span className="shrink-0 text-right text-[11px] text-gray-400">
                    {timeLabel(at)}
                    <span className="mt-0.5 block transition-transform group-open:rotate-180">▾</span>
                </span>
            </summary>
            <div className="space-y-3 border-t border-gray-100 px-3 py-3 dark:border-gray-800">
                <p className="text-[11px] text-gray-400">
                    Order ID <span className="font-mono text-gray-600 dark:text-gray-300">{log.orderId}</span> · from /{log.page} · {at.toLocaleString("en-GB")}
                </p>
                {log.changes?.length > 0 && <ChangesTable changes={log.changes} />}
                {!!showProducts && (
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Products</p>
                        <ul className="space-y-1">
                            {p.added?.map(x => <ProductRow key={`a${x.position}`} p={x} tone="bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-800" />)}
                            {p.removed?.map(x => <ProductRow key={`r${x.position}`} p={x} tone="bg-rose-50 text-rose-800 ring-rose-200 line-through dark:bg-rose-900/20 dark:text-rose-200 dark:ring-rose-800" />)}
                            {p.updated?.map(x => (
                                <li key={`u${x.position}`} className="space-y-1 rounded-lg bg-blue-50 p-1.5 ring-1 ring-blue-200 dark:bg-blue-900/20 dark:ring-blue-800">
                                    <ul className="space-y-1">
                                        <ProductRow p={x.from} tone="bg-white/70 text-rose-700 ring-rose-100 dark:bg-transparent dark:text-rose-300 dark:ring-rose-900" />
                                        <ProductRow p={x.to} tone="bg-white text-emerald-700 ring-emerald-100 dark:bg-transparent dark:text-emerald-300 dark:ring-emerald-900" />
                                    </ul>
                                </li>
                            ))}
                        </ul>
                        <p className="text-[10px] text-gray-400">Green = added · red = removed · blue = link or quantity changed (before, then after)</p>
                    </div>
                )}
                {log.details && <Details details={log.details} />}
                {log.snapshot && (
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{log.action === "deleted" ? "Order as it was before deleting" : "Order details"}</p>
                        <Snapshot order={log.snapshot} />
                    </div>
                )}
                {log.action === "edited" && !log.changes?.length && !showProducts && <p className="text-xs text-gray-400">Saved without changing any field.</p>}
            </div>
        </details>
    );
}

export default function OrderLogsPage() {
    const [accessGranted, setAccessGranted] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const passwordRef = useRef<HTMLInputElement>(null);

    const [logs, setLogs] = useState<OrderLog[]>([]);
    const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (Cookies.get(LOGS_COOKIE) === LOGS_PASSWORD) setAccessGranted(true);
        else setTimeout(() => passwordRef.current?.focus(), 300);
    }, []);
    // The logs have their own password (not the admin one). It is remembered until the browser closes.
    const unlock = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordInput === LOGS_PASSWORD) {
            setAccessGranted(true);
            setPasswordInput("");
            Cookies.set(LOGS_COOKIE, LOGS_PASSWORD, { path: "/" });
        } else {
            setPasswordError("Wrong password. Try again.");
            setPasswordInput("");
        }
    };

    const load = useCallback(async (after: QueryDocumentSnapshot | null) => {
        setLoading(true);
        setLoadError("");
        try {
            const q = after
                ? query(collection(db, ORDER_LOGS), orderBy("at", "desc"), startAfter(after), limit(PAGE_SIZE))
                : query(collection(db, ORDER_LOGS), orderBy("at", "desc"), limit(PAGE_SIZE));
            const snap = await getDocs(q);
            const page = snap.docs.map(d => ({ id: d.id, ...d.data() }) as OrderLog);
            setLogs(prev => (after ? [...prev, ...page] : page));
            setCursor(snap.docs[snap.docs.length - 1] ?? after);
            setHasMore(snap.docs.length === PAGE_SIZE);
        } catch (error) {
            console.error("Failed to load order logs:", error);
            setLoadError("Could not load the logs. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { if (accessGranted) load(null); }, [accessGranted, load]);

    const counts = useMemo(() => {
        const c: Record<string, number> = { all: logs.length, price: 0, products: 0 };
        for (const log of logs) {
            c[log.action] = (c[log.action] ?? 0) + 1;
            if (hasPriceChange(log)) c.price++;
            if (hasProductChange(log)) c.products++;
        }
        return c;
    }, [logs]);

    const visible = useMemo(() => {
        const words = search.toLowerCase().split(/\s+/).filter(Boolean);
        return logs.filter(log => {
            if (filter === "price" && !hasPriceChange(log)) return false;
            if (filter === "products" && !hasProductChange(log)) return false;
            if (filter !== "all" && filter !== "price" && filter !== "products" && log.action !== filter) return false;
            if (!words.length) return true;
            const hay = `${log.customer} ${log.mobile} ${log.orderId} ${log.summary}`.toLowerCase();
            return words.every(w => hay.includes(w));
        });
    }, [logs, filter, search]);

    // Group by day, newest first (the list is already sorted).
    const groups = useMemo(() => {
        const out: { day: string; items: OrderLog[] }[] = [];
        for (const log of visible) {
            const day = dayLabel(log.at?.toDate?.() ?? new Date(0));
            if (out.length && out[out.length - 1].day === day) out[out.length - 1].items.push(log);
            else out.push({ day, items: [log] });
        }
        return out;
    }, [visible]);

    const chips: { id: Filter; label: string }[] = [
        { id: "all", label: "All" },
        { id: "price", label: "💰 Price changes" },
        { id: "products", label: "📦 Products added / removed" },
        ...(Object.keys(ACTION_LABEL) as LogAction[]).map(a => ({ id: a, label: `${ACTION_STYLE[a].icon} ${ACTION_LABEL[a]}` })),
    ];

    return (
        <div className="relative min-h-screen">
            <div className={`mx-auto max-w-4xl space-y-4 p-3 sm:p-6 ${!accessGranted ? "pointer-events-none select-none blur-md" : ""}`}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <Link href="/admin" className="text-xs font-medium text-gray-400 hover:text-gray-600">← Back to orders</Link>
                        <h1 className="mt-1 bg-gradient-to-r from-slate-700 via-blue-600 to-violet-600 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">Activity Logs</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Every order created, edited, cancelled or deleted from the admin and Ankush pages. Read only.</p>
                    </div>
                    <button type="button" onClick={() => load(null)} disabled={loading}
                        className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:opacity-60 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700">
                        {loading ? "Loading…" : "↻ Refresh"}
                    </button>
                </div>

                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer, mobile or order ID…"
                        className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600" />
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {chips.filter(c => c.id === "all" || (counts[c.id] ?? 0) > 0).map(c => (
                        <button key={c.id} type="button" onClick={() => setFilter(c.id)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${filter === c.id ? "bg-gray-900 text-white ring-gray-900 dark:bg-white dark:text-gray-900" : "bg-white text-gray-600 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700"}`}>
                            {c.label} <span className="opacity-60">{counts[c.id] ?? 0}</span>
                        </button>
                    ))}
                </div>

                {loadError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{loadError}</p>}

                {!loading && !loadError && visible.length === 0 && (
                    <p className="py-10 text-center text-sm text-gray-500">{logs.length ? "No logs match this filter." : "No activity logged yet. Changes made from the admin and Ankush pages will show up here."}</p>
                )}

                {groups.map(g => (
                    <section key={g.day} className="space-y-2">
                        <h2 className="sticky top-0 z-10 bg-white/90 py-1 text-xs font-bold uppercase tracking-wider text-gray-500 backdrop-blur dark:bg-gray-950/90">{g.day}</h2>
                        {g.items.map(log => <LogEntry key={log.id} log={log} />)}
                    </section>
                ))}

                {hasMore && (
                    <button type="button" onClick={() => load(cursor)} disabled={loading}
                        className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:opacity-60 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700">
                        {loading ? "Loading…" : "Load older logs"}
                    </button>
                )}
            </div>

            {!accessGranted && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <form onSubmit={unlock} className="w-80 space-y-3 rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-900">
                        <h2 className="text-2xl font-bold">🔒 Activity Logs</h2>
                        <p className="text-sm text-gray-500">Enter the logs password to continue.</p>
                        <input type="password" placeholder="Logs password" value={passwordInput} onChange={e => { setPasswordInput(e.target.value); setPasswordError(""); }}
                            className="w-full rounded-md border px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-blue-500"
                            ref={passwordRef} autoFocus autoComplete="off" />
                        {passwordError && <p className="text-sm font-medium text-red-600">{passwordError}</p>}
                        <button type="submit" className="w-full rounded-md bg-gray-900 py-2.5 font-semibold text-white transition hover:bg-gray-800">Unlock</button>
                        <Link href="/admin" className="block text-xs text-gray-400 hover:text-gray-600">← Back to orders</Link>
                    </form>
                </div>
            )}
        </div>
    );
}
