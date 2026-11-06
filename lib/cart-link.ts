// Server-only: signed /cart links. A link names the customer's number, when it was issued and a signature, so it
// can't be changed to open someone else's cart, and it stops working CART_DAYS after it was issued.
import { timingSafeEqual } from "crypto";
import { ADMIN_PASSWORD } from "./admin-access";
import { CART_DAYS } from "./cart";
import { nepalMobile, signLink } from "./track-auth";

const CART_MS = CART_DAYS * 86_400_000;

const sign = (mobile: string, issued: string) => signLink(`cart.${mobile}.${issued}`).slice(0, 22);

function sameText(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** "/cart?9817254118&t=…&k=…" for a 10-digit Nepal number. */
export function cartPath(mobile: string, issuedAt = Date.now()) {
  const issued = issuedAt.toString(36);
  return `/cart?${mobile}&t=${issued}&k=${sign(mobile, issued)}`;
}

export type CartAccess =
  | { ok: true; mobile: string; admin: boolean; expiresAt: number | null }
  | { ok: false; reason: "missing" | "invalid" | "expired" };

type Params = Record<string, string | string[] | undefined> | URLSearchParams;
const read = (params: Params, key: string) => {
  const value = params instanceof URLSearchParams ? params.get(key) : params[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
};
const keysOf = (params: Params) => (params instanceof URLSearchParams ? [...params.keys()] : Object.keys(params));

/** Checks a cart link's query (?9817254118&t=…&k=…, or ?m=…). Admins can open any number's cart without a key. */
export function checkCartAccess(params: Params, adminCookie: string | undefined): CartAccess {
  const raw = read(params, "m") || keysOf(params).find(key => /^(\+?977)?9\d{9}$/.test(key.trim())) || "";
  const mobile = nepalMobile(raw);
  if (!mobile) return { ok: false, reason: "missing" };
  if (adminCookie === ADMIN_PASSWORD) return { ok: true, mobile, admin: true, expiresAt: null };

  const issued = read(params, "t"), key = read(params, "k");
  if (!issued || !key || !sameText(sign(mobile, issued), key)) return { ok: false, reason: "invalid" };
  const issuedAt = parseInt(issued, 36);
  if (!Number.isFinite(issuedAt) || issuedAt > Date.now() + 60_000) return { ok: false, reason: "invalid" };
  const expiresAt = issuedAt + CART_MS;
  if (Date.now() > expiresAt) return { ok: false, reason: "expired" };
  return { ok: true, mobile, admin: false, expiresAt };
}
