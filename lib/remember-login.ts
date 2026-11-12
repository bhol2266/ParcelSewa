// Browser-only: remembers a page password (admin, Ankush) in a cookie so it isn't asked again.
// The cookie lasts REMEMBER_DAYS and, on the live site, covers both parcelsewa.com and www.parcelsewa.com.
import Cookies from "js-cookie";

export const REMEMBER_DAYS = 365;

export function rememberLogin(name: string, value: string) {
    const host = window.location.hostname;
    Cookies.set(name, value, {
        expires: REMEMBER_DAYS,
        path: "/",
        sameSite: "lax",
        secure: window.location.protocol === "https:",
        ...(host === "parcelsewa.com" || host.endsWith(".parcelsewa.com") ? { domain: ".parcelsewa.com" } : {}),
    });
}
