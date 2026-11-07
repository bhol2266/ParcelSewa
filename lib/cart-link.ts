// Server-only: /cart links. A link is just the customer's number (/cart?9817254118), as the owner chose; there is no
// key, so anyone who knows a number can open that cart. Each request stays editable for CART_DAYS after it's sent
// (enforced in /api/cart). Older links that still carry &t=…&k=… keep working; those parts are ignored.
import { ADMIN_PASSWORD } from "./admin-access";
import { nepalMobile } from "./track-auth";

/** "/cart?9817254118" for a 10-digit Nepal number. */
export const cartPath = (mobile: string) => `/cart?${mobile}`;

export type CartAccess = { ok: true; mobile: string; admin: boolean } | { ok: false; reason: "missing" };

type Params = Record<string, string | string[] | undefined> | URLSearchParams;
const read = (params: Params, key: string) => {
  const value = params instanceof URLSearchParams ? params.get(key) : params[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
};
const keysOf = (params: Params) => (params instanceof URLSearchParams ? [...params.keys()] : Object.keys(params));

/** Reads the number from a cart link (?9817254118, or ?m=…). The admin cookie marks the team's view. */
export function checkCartAccess(params: Params, adminCookie: string | undefined): CartAccess {
  const raw = read(params, "m") || keysOf(params).find(key => /^(\+?977)?9\d{9}$/.test(key.trim())) || "";
  const mobile = nepalMobile(raw);
  if (!mobile) return { ok: false, reason: "missing" };
  return { ok: true, mobile, admin: adminCookie === ADMIN_PASSWORD };
}
