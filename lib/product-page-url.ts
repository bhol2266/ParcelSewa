// The product's own page for links that point somewhere else in a store, so price and picture lookups read the page
// that actually shows the product. Safe in the browser and on the server.

/**
 * Myntra: the long address a customer shares (…/tights/blissclub/<name>/25856156, or …/25856156/buy for the
 * checkout) often shows "Page not found", while myntra.com/<product number> always opens the product page with its
 * photos and current price. Other links are returned unchanged.
 */
export function productPageUrl(link: string): string {
  try {
    const url = new URL(link.trim());
    if (/(^|\.)myntra\.com$/i.test(url.hostname)) {
      const id = url.pathname.match(/\/(\d{6,10})(?:\/buy)?\/?$/)?.[1]
        ?? url.searchParams.get("productId") ?? url.searchParams.get("pid");
      if (id && /^\d{6,10}$/.test(id)) return `https://www.myntra.com/${id}`;
    }
  } catch {
    // Not a link: leave it for the caller to report.
  }
  return link;
}
