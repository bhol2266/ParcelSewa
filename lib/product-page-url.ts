// The product's own page for links that point somewhere else in a store, so price and picture lookups read the page
// that actually shows the product. Safe in the browser and on the server.

/**
 * Myntra's "Buy" button gives a checkout link (…/25856156/buy) whose page has no product data; the product page is
 * the same path without /buy. Other links are returned unchanged.
 */
export function productPageUrl(link: string): string {
  try {
    const url = new URL(link.trim());
    if (/(^|\.)myntra\.com$/i.test(url.hostname) && /\/\d+\/buy\/?$/i.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/buy\/?$/i, "");
      return url.href;
    }
  } catch {
    // Not a link: leave it for the caller to report.
  }
  return link;
}
