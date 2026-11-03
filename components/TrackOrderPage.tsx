"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import WhatsAppLink from "@/components/WhatsAppLink";
import { customerProfile, formatDay, groupProducts, isCancelled, isDelivered, orderDate, orderProducts, type Leg, type ProductTracking, type TrackingStep } from "@/lib/order-tracking";
import { ArrowPathIcon, CalendarDaysIcon, CheckIcon, ChevronDownIcon, MagnifyingGlassIcon, MapPinIcon, PhoneIcon, ShoppingBagIcon, SparklesIcon, TruckIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";

const LAST_NUMBER_KEY = "parcelsewa:track-mobile";
const LEGS: { leg: Leg; label: string; sub: string }[] = [
    { leg: "india", label: "India", sub: "Seller" },
    { leg: "border", label: "Raxaul", sub: "Border" },
    { leg: "nepal", label: "Birgunj", sub: "Hub" },
    { leg: "home", label: "Your door", sub: "Nepal" },
];
const legIndex = (leg: Leg) => LEGS.findIndex((l) => l.leg === leg);

type Status = "idle" | "loading" | "done" | "error";

export default function TrackOrderPage({ initialMobile = "" }: { initialMobile?: string }) {
    const [mobile, setMobile] = useState(initialMobile.replace(/\D/g, "").slice(-10));
    const [status, setStatus] = useState<Status>("idle");
    const [orders, setOrders] = useState<any[]>([]);
    const [searched, setSearched] = useState("");
    const valid = /^9\d{9}$/.test(mobile);

    const track = useCallback(async (digits: string) => {
        if (!/^9\d{9}$/.test(digits)) return;
        setStatus("loading");
        setSearched(digits);
        try {
            const snap = await getDocs(query(collection(db, "Confirm Orders"), where("mobile", "==", `+977${digits}`)));
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            list.sort((a, b) => (orderDate(b)?.getTime() ?? 0) - (orderDate(a)?.getTime() ?? 0));
            setOrders(list);
            setStatus("done");
            try { localStorage.setItem(LAST_NUMBER_KEY, digits); } catch {}
            const url = new URL(window.location.href);
            url.searchParams.set("mobile", digits);
            window.history.replaceState(null, "", url);
        } catch {
            setStatus("error");
        }
    }, []);

    // A number in the link tracks straight away; otherwise prefill the last number used on this device.
    useEffect(() => {
        if (/^9\d{9}$/.test(mobile)) { track(mobile); return; }
        try {
            const last = localStorage.getItem(LAST_NUMBER_KEY);
            if (last && !mobile) setMobile(last);
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const active = orders.filter((o) => !isDelivered(o) && !isCancelled(o));
    const past = orders.filter((o) => isDelivered(o) || isCancelled(o));
    // Once orders are showing, the hero shrinks to just the search bar so the tracking sits near the top.
    const showingResults = status !== "idle";

    return (
        <div className="min-h-[70vh] bg-[var(--store-soft)] pb-20 text-[var(--store-ink)]">
            {/* Hero + search */}
            <section className="relative overflow-hidden bg-gradient-to-br from-[#062c45] via-[#073856] to-[#0b4b70] text-white">
                <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#f48b28]/20 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
                <div className={`relative mx-auto w-full max-w-3xl px-4 sm:px-6 ${showingResults ? "pb-16 pt-5 sm:pt-6" : "pb-24 pt-12 sm:pt-16"}`}>
                    {!showingResults && <>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.14em] text-white/80">
                        <TruckIcon className="size-4 text-[#ffab68]" aria-hidden /> India → Nepal tracking
                    </span>
                    <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">Where&apos;s my order?</h1>
                    <p className="mt-3 max-w-xl text-sm text-white/75 sm:text-base">Enter the mobile number you ordered with to see live tracking and all your ParcelSewa orders.</p>
                    </>}

                    <form
                        className={`flex gap-2 sm:gap-3 ${showingResults ? "" : "mt-7 flex-col sm:flex-row"}`}
                        onSubmit={(e) => { e.preventDefault(); track(mobile); }}
                    >
                        <label htmlFor="track-mobile" className="sr-only">10-digit mobile number</label>
                        <div className="flex min-w-0 flex-1 items-center rounded-2xl bg-white p-1.5 shadow-xl shadow-black/20 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[#f48b28] dark:bg-[#111c2d]">
                            <span className="flex items-center gap-1.5 rounded-xl bg-[var(--store-soft)] px-3 py-3 text-sm font-semibold text-[var(--store-ink)]">+977</span>
                            <input
                                id="track-mobile"
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel-national"
                                maxLength={10}
                                placeholder="98XXXXXXXX"
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                className="min-w-0 flex-1 !border-0 !bg-transparent px-3 py-3 text-lg font-semibold tracking-wider text-[var(--store-ink)] outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-400"
                            />
                            {mobile && (
                                <span className={`mr-2 hidden text-xs font-medium sm:inline ${valid ? "text-emerald-600" : "text-gray-400"}`}>{mobile.length}/10</span>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={!valid || status === "loading"}
                            aria-label="Track orders"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f48b28] px-5 py-4 sm:px-7 text-sm font-bold text-[#122235] shadow-lg shadow-[#f48b28]/30 transition hover:bg-[#ffad63] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {status === "loading" ? <ArrowPathIcon className="size-5 animate-spin" aria-hidden /> : <MagnifyingGlassIcon className="size-5" aria-hidden />}
                            <span className={showingResults ? "hidden sm:inline" : ""}>Track orders</span>
                        </button>
                    </form>
                    {mobile && !valid && mobile.length === 10 && <p className="mt-2 text-xs text-[#ffab68]">Nepal mobile numbers start with 9.</p>}
                </div>
            </section>

            <div className={`relative mx-auto w-full max-w-3xl space-y-4 px-4 sm:px-6 ${showingResults ? "-mt-10" : "-mt-14"}`}>
                {status === "idle" && <HowItWorks />}
                {status === "loading" && <LoadingCards />}
                {status === "error" && (
                    <Panel className="text-center">
                        <XCircleIcon className="mx-auto size-10 text-rose-500" aria-hidden />
                        <p className="mt-3 font-semibold">We couldn&apos;t load your orders</p>
                        <p className="mt-1 text-sm text-[var(--store-text)]">Check your internet connection and try again.</p>
                        <button onClick={() => track(mobile)} className="mt-4 rounded-xl bg-[#073856] px-5 py-2.5 text-sm font-semibold text-white dark:bg-[#f48b28] dark:text-[#122235]">Try again</button>
                    </Panel>
                )}
                {status === "done" && orders.length === 0 && (
                    <Panel className="text-center">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[var(--store-soft)]"><ShoppingBagIcon className="size-7 text-[var(--store-text)]" aria-hidden /></div>
                        <p className="mt-4 text-lg font-semibold">No orders found for +977 {searched}</p>
                        <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--store-text)]">Make sure it&apos;s the number you gave when ordering. Still stuck? Message us and we&apos;ll check for you.</p>
                        <div className="mt-5 flex justify-center"><WhatsAppLink>Ask on WhatsApp</WhatsAppLink></div>
                    </Panel>
                )}
                {status === "done" && orders.length > 0 && (
                    <>
                        <ProfileCard
                            orders={orders}
                            mobile={searched}
                            onChangeNumber={() => {
                                setMobile("");
                                setStatus("idle");
                                setOrders([]);
                                try { localStorage.removeItem(LAST_NUMBER_KEY); } catch {}
                                window.history.replaceState(null, "", window.location.pathname);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                                setTimeout(() => document.getElementById("track-mobile")?.focus(), 300);
                            }}
                        />

                        {active.length > 0 && (
                            <section className="space-y-3">
                                <SectionTitle>On the way</SectionTitle>
                                {active.map((o, i) => <OrderCard key={o.id} order={o} defaultOpen={i === 0} />)}
                            </section>
                        )}
                        {past.length > 0 && (
                            <section className="space-y-3">
                                <SectionTitle>Previous orders</SectionTitle>
                                {past.map((o) => <OrderCard key={o.id} order={o} compact />)}
                            </section>
                        )}

                        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-sm text-[var(--store-text)]">
                            Questions about a delivery?
                            <WhatsAppLink className="!min-h-0 !py-2 !text-xs">Chat on WhatsApp</WhatsAppLink>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// The customer's profile: who they are, how long they've shopped with us, and totals across their orders.
function ProfileCard({ orders, mobile, onChangeNumber }: { orders: any[]; mobile: string; onChangeNumber: () => void }) {
    const p = useMemo(() => customerProfile(orders), [orders]);
    return (
        <section aria-label="Your profile" className="overflow-hidden rounded-3xl border border-[var(--store-line)] bg-[var(--store-paper)] shadow-lg shadow-black/5">
            <div className="flex flex-wrap items-center gap-3 p-4 sm:gap-4 sm:p-5">
                <div className="flex size-12 shrink-0 sm:size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f48b28] to-[#c85b13] text-lg font-bold text-white shadow-md shadow-[#f48b28]/30">
                    {p.initials}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold sm:text-xl"><span className="font-medium text-[var(--store-text)]">Namaste,</span> {p.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--store-text)]">
                        <span className="inline-flex items-center gap-1"><PhoneIcon className="size-3.5" aria-hidden />+977 {mobile}</span>
                        {p.city && <span className="inline-flex items-center gap-1"><MapPinIcon className="size-3.5" aria-hidden />{p.city}</span>}
                        {p.memberSince && <span className="inline-flex items-center gap-1"><CalendarDaysIcon className="size-3.5" aria-hidden />Since {p.memberSince.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</span>}
                        {p.stores.length > 0 && <span className="inline-flex items-center gap-1"><ShoppingBagIcon className="size-3.5" aria-hidden />{p.stores.join(", ")}</span>}
                    </div>
                </div>
                <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
                    <span title={p.tier.next ?? undefined} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#f48b28]/12 px-3 py-1 text-xs font-bold text-[#c85b13] ring-1 ring-[#f48b28]/30 dark:text-[#ffab68]">
                        <SparklesIcon className="size-3.5" aria-hidden />{p.tier.label}
                    </span>
                    <button type="button" onClick={onChangeNumber} className="whitespace-nowrap text-xs font-semibold text-[var(--store-text)] underline-offset-2 hover:text-[var(--store-ink)] hover:underline">
                        Not you? Change number
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-5 border-t border-[var(--store-line)]">
                <ProfileStat label="Orders" value={p.orders} />
                <ProfileStat label="On the way" value={p.onTheWay} tone="amber" />
                <ProfileStat label="Delivered" value={p.delivered} tone="green" />
                <ProfileStat label="Items" value={p.items} />
                <ProfileStat label="Due (Rs.)" value={p.due.toLocaleString("en-IN")} tone={p.due > 0 ? "amber" : "green"} />
            </div>
        </section>
    );
}

function ProfileStat({ label, value, tone = "slate" }: { label: string; value: string | number; tone?: "amber" | "green" | "slate" }) {
    const color = { amber: "text-[#c85b13] dark:text-[#ffab68]", green: "text-emerald-600 dark:text-emerald-400", slate: "text-[var(--store-ink)]" }[tone];
    return (
        <div className="min-w-0 border-r border-[var(--store-line)] px-1 py-2.5 text-center last:border-r-0">
            <p className={`truncate text-sm font-bold sm:text-lg ${color}`}>{value}</p>
            <p className="truncate text-[9px] font-medium uppercase tracking-wide text-[var(--store-text)] sm:text-[10px]">{label}</p>
        </div>
    );
}

function OrderCard({ order, defaultOpen = false, compact = false }: { order: any; defaultOpen?: boolean; compact?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    const groups = useMemo(() => groupProducts(order), [order]);
    const products = orderProducts(order);
    const cancelled = isCancelled(order);
    const delivered = isDelivered(order);
    // The order moves at the pace of its slowest product.
    const headline = groups[0]?.tracking;
    const due = delivered || cancelled ? 0 : Math.max((Number(order.totalAmount) || 0) - (Number(order.advancePayment) || 0), 0);
    const deliveredOn = delivered ? headline?.steps.at(-1)?.date ?? null : null;

    return (
        <article className={`overflow-hidden rounded-2xl border border-[var(--store-line)] bg-[var(--store-paper)] shadow-sm transition ${open ? "shadow-lg" : "hover:shadow-md"}`}>
            <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left sm:gap-4">
                {products.length <= 1 && <Thumbs images={products.map((p) => p.image)} />}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold">#{order.id.slice(0, 6).toUpperCase()}</span>
                        <StatusBadge cancelled={cancelled} delivered={delivered} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[var(--store-text)]">
                        {order.storeName ? `${order.storeName} · ` : ""}{products.length} item{products.length === 1 ? "" : "s"} · Ordered {formatDay(orderDate(order))}
                    </p>
                    {!cancelled && headline && (
                        <p className="mt-1 truncate text-sm font-semibold">
                            {delivered ? `Delivered ${formatDay(deliveredOn)}` : headline.current.title}
                        </p>
                    )}
                    {due > 0 && <p className="mt-1 text-xs font-semibold text-[#c85b13] dark:text-[#ffab68]">Due on delivery: Rs. {due.toLocaleString("en-IN")}</p>}
                </div>
                <ChevronDownIcon className={`size-5 shrink-0 text-[var(--store-text)] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
            </button>

            {products.length > 1 && <ProductStrip products={products} />}

            {!compact && !cancelled && headline && <div className="px-4 pb-4"><RouteBar tracking={headline} /></div>}

            {open && (
                <div className="border-t border-[var(--store-line)] bg-[var(--store-soft)]/60 p-3 sm:p-4">
                    {cancelled ? (
                        <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">This order was cancelled. Contact us on WhatsApp if you have any questions about it.</p>
                    ) : (
                        <div className="space-y-3">
                            {compact && headline && <RouteBar tracking={headline} />}
                            {groups.map((g, i) => (
                                <ProductGroup key={i} images={g.products} tracking={g.tracking} single={groups.length === 1} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}

// Four-leg route with the truck sitting at the order's progress.
function RouteBar({ tracking }: { tracking: ProductTracking }) {
    const reached = legIndex(tracking.leg);
    const pct = Math.round(tracking.progress * 100);
    return (
        <div className="rounded-xl bg-gradient-to-br from-[var(--store-soft)] to-[var(--store-paper)] px-3 pb-2.5 pt-5 ring-1 ring-[var(--store-line)]">
            <div className="relative mx-3 h-1.5 rounded-full bg-[var(--store-line)]">
                <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#f48b28] to-emerald-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                {LEGS.map((l, i) => (
                    <span
                        key={l.leg}
                        className={`absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${i <= reached || tracking.delivered ? "border-emerald-500 bg-emerald-500" : "border-[var(--store-line)] bg-[var(--store-paper)]"}`}
                        style={{ left: `${(i / 3) * 100}%` }}
                    />
                ))}
                {!tracking.delivered && (
                    <span className="absolute top-1/2 -translate-x-1/2 -translate-y-[130%] transition-all duration-700" style={{ left: `${pct}%` }}>
                        <span className="flex size-7 items-center justify-center rounded-full bg-[#073856] text-white shadow-lg ring-4 ring-[#f48b28]/25 dark:bg-[#f48b28] dark:text-[#122235]">
                            <TruckIcon className="size-4" aria-hidden />
                        </span>
                    </span>
                )}
            </div>
            <div className="mt-3 grid grid-cols-4 text-center">
                {LEGS.map((l, i) => (
                    <div key={l.leg} className={i === 0 ? "text-left" : i === 3 ? "text-right" : ""}>
                        <p className={`text-xs font-semibold ${i <= reached || tracking.delivered ? "text-[var(--store-ink)]" : "text-[var(--store-text)]/70"}`}>{l.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ProductGroup({ images, tracking, single }: { images: { index: number; image: string; quantity: string }[]; tracking: ProductTracking; single: boolean }) {
    const [showAll, setShowAll] = useState(false);
    // Upcoming India sub-steps add noise; show what's happened plus the big milestones still to come.
    const visible = tracking.steps.filter((s) => s.status !== "upcoming" || s.leg !== "india" || s.key === "near-border");
    const doneSteps = visible.filter((s) => s.status !== "upcoming");
    const upcoming = visible.filter((s) => s.status === "upcoming");
    // Folded: the latest update and the next milestone. Unfolded: the whole journey, top to bottom.
    const shown = showAll ? visible : [...doneSteps.slice(-1), ...upcoming.slice(0, 1)];

    return (
        <div className="rounded-xl border border-[var(--store-line)] bg-[var(--store-paper)] p-3 sm:p-4">
            {!single && (
                <div className="mb-3 flex items-center gap-3">
                    <div className="flex -space-x-3">
                        {images.slice(0, 4).map((p) => (
                            <div key={p.index} className="relative size-10 overflow-hidden rounded-lg border-2 border-[var(--store-paper)] bg-[var(--store-soft)] shadow-sm">
                                <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                                {p.quantity !== "1" && <span className="absolute bottom-0 right-0 rounded-full bg-black/70 px-1 text-[9px] font-bold text-white">×{p.quantity}</span>}
                            </div>
                        ))}
                        {images.length > 4 && <div className="flex size-10 items-center justify-center rounded-lg border-2 border-[var(--store-paper)] bg-[var(--store-soft)] text-xs font-bold">+{images.length - 4}</div>}
                    </div>
                    <p className="text-xs font-medium text-[var(--store-text)]">{images.length} item{images.length === 1 ? "" : "s"}</p>
                </div>
            )}
            <ol>
                {shown.map((step, i) => <TimelineStep key={step.key} step={step} last={i === shown.length - 1} />)}
            </ol>
            {visible.length > shown.length || showAll ? (
                <button type="button" onClick={() => setShowAll(!showAll)} className="ml-11 mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#c85b13] hover:underline dark:text-[#ffab68]">
                    {showAll ? "Show less" : `View full journey (${visible.length} steps)`}
                    <ChevronDownIcon className={`size-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} aria-hidden />
                </button>
            ) : null}
        </div>
    );
}

function TimelineStep({ step, last }: { step: TrackingStep; last: boolean }) {
    const done = step.status === "done";
    const current = step.status === "current";
    const isHome = step.key === "home";
    return (
        <li className="relative flex gap-3 pb-3 last:pb-1">
            {!last && <span aria-hidden className={`absolute left-[15px] top-8 bottom-0 w-0.5 ${step.status === "upcoming" ? "border-l-2 border-dashed border-[var(--store-line)]" : "bg-emerald-500/60"}`} />}
            <span className="relative z-[1] flex size-8 shrink-0 items-center justify-center">
                {current ? (
                    <>
                        <span className="absolute inset-0 animate-ping rounded-full bg-[#f48b28]/40" />
                        <span className="relative flex size-8 items-center justify-center rounded-full bg-[#f48b28] text-white shadow-md"><TruckIcon className="size-4" aria-hidden /></span>
                    </>
                ) : done ? (
                    <span className="flex size-8 items-center justify-center rounded-full bg-emerald-500 text-white">{isHome ? <CheckBadgeIcon className="size-5" aria-hidden /> : <CheckIcon className="size-4" strokeWidth={3} aria-hidden />}</span>
                ) : (
                    <span className="size-3.5 rounded-full border-2 border-[var(--store-line)] bg-[var(--store-paper)]" />
                )}
            </span>
            <div className={`min-w-0 flex-1 ${current ? "-mt-0.5 rounded-xl bg-[#f48b28]/10 px-3 py-2 ring-1 ring-[#f48b28]/30" : "pt-1"}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className={`text-sm font-semibold ${step.status === "upcoming" ? "text-[var(--store-text)]/70" : ""}`}>{step.title}</p>
                    {step.date && step.status !== "upcoming" && <p className="text-xs font-medium text-[var(--store-text)]">{formatDay(step.date)}</p>}
                </div>
                {current && <p className="mt-0.5 text-xs leading-relaxed text-[var(--store-text)]">{step.detail}</p>}
                {(step.status !== "upcoming" || isHome) && <p className={`mt-1 inline-flex items-center gap-1 text-[11px] ${isHome && done ? "font-semibold text-emerald-700 dark:text-emerald-400" : "text-[var(--store-text)]/80"}`}>
                    <MapPinIcon className="size-3.5 shrink-0" aria-hidden />{step.place}
                </p>}
            </div>
        </li>
    );
}

// Every product in the order, in a row that scrolls sideways on small screens; tapping one opens the full image.
function ProductStrip({ products }: { products: { index: number; image: string; quantity: string }[] }) {
    return (
        <div className="-mt-1 flex gap-2 overflow-x-auto px-4 pb-4 [scrollbar-width:thin]">
            {products.map((p) => (
                <a key={p.index} href={p.image} target="_blank" rel="noopener noreferrer" className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-[var(--store-soft)] ring-1 ring-[var(--store-line)] transition hover:ring-2 hover:ring-[#f48b28]">
                    <img src={p.image} alt={`Product ${p.index + 1}`} loading="lazy" className="h-full w-full object-cover" />
                    {p.quantity !== "1" && <span className="absolute bottom-0.5 right-0.5 rounded-full bg-black/70 px-1.5 text-[10px] font-bold text-white">×{p.quantity}</span>}
                </a>
            ))}
        </div>
    );
}

function Thumbs({ images }: { images: string[] }) {
    const first = images[0];
    return (
        <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-[var(--store-soft)] ring-1 ring-[var(--store-line)]">
            {first ? <img src={first} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ShoppingBagIcon className="m-auto mt-4 size-8 text-[var(--store-text)]" aria-hidden />}
            {images.length > 1 && <span className="absolute bottom-1 right-1 rounded-full bg-black/70 px-1.5 text-[10px] font-bold text-white">+{images.length - 1}</span>}
        </div>
    );
}

function StatusBadge({ cancelled, delivered }: { cancelled: boolean; delivered: boolean }) {
    const [label, cls] = cancelled
        ? ["Cancelled", "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"]
        : delivered
            ? ["Delivered", "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"]
            : ["In transit", "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"];
    return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>{label}</span>;
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`rounded-3xl border border-[var(--store-line)] bg-[var(--store-paper)] p-6 shadow-sm ${className}`}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h2 className="px-1 pt-2 text-xs font-bold uppercase tracking-[.14em] text-[var(--store-text)]">{children}</h2>;
}

function LoadingCards() {
    return (
        <div className="space-y-4" aria-busy="true" aria-label="Loading your orders">
            {[0, 1].map((i) => (
                <div key={i} className="animate-pulse rounded-3xl border border-[var(--store-line)] bg-[var(--store-paper)] p-5">
                    <div className="flex gap-4">
                        <div className="size-16 rounded-2xl bg-[var(--store-soft)]" />
                        <div className="flex-1 space-y-2 pt-1"><div className="h-3 w-1/3 rounded bg-[var(--store-soft)]" /><div className="h-3 w-2/3 rounded bg-[var(--store-soft)]" /><div className="h-3 w-1/2 rounded bg-[var(--store-soft)]" /></div>
                    </div>
                    <div className="mt-5 h-16 rounded-2xl bg-[var(--store-soft)]" />
                </div>
            ))}
        </div>
    );
}

function HowItWorks() {
    const steps = [
        { icon: "🛍️", title: "Ordered in India", text: "We buy from the store and the seller ships it." },
        { icon: "🛃", title: "Raxaul → Birgunj", text: "Your parcel crosses the border at our hub." },
        { icon: "🏠", title: "At your door", text: "Delivered to your address anywhere in Nepal." },
    ];
    return (
        <Panel>
            <p className="text-sm font-semibold">How your parcel travels</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {steps.map((s, i) => (
                    <div key={s.title} className="flex gap-3 rounded-2xl bg-[var(--store-soft)] p-4 sm:flex-col">
                        <span className="text-2xl" aria-hidden>{s.icon}</span>
                        <div>
                            <p className="text-sm font-semibold"><span className="text-[var(--store-text)]">{i + 1}.</span> {s.title}</p>
                            <p className="mt-0.5 text-xs leading-relaxed text-[var(--store-text)]">{s.text}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Panel>
    );
}
