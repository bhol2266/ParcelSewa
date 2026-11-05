// Customers enter an OTP once on /trackOrder; after this many days the server asks for a new one.
export const TRACK_SESSION_DAYS = 180;

// Turns the { __date: ms } values from /api/track/orders back into Dates (order-tracking reads Dates or Timestamps).
export function reviveDates<T>(value: T): T {
    if (Array.isArray(value)) return value.map(reviveDates) as T;
    if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        if (typeof record.__date === "number" && Object.keys(record).length === 1) return new Date(record.__date) as T;
        return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, reviveDates(v)])) as T;
    }
    return value;
}
