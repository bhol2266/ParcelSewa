// Commission values are stored on the order either as a percentage ("25%") or
// as a flat NPR charge ("Flat NPR 700"). Flat orders price their base as
// total - flatAmount; percentage orders divide the total back out by the rate.

/** Flat NPR amount for commissions like "Flat NPR 700", or null if not a flat rate. */
export function parseFlatCommission(commission: unknown): number | null {
    if (typeof commission !== "string") return null;
    const match = commission.match(/^Flat\s+NPR\s+(\d+)$/i);
    return match ? Number(match[1]) : null;
}
