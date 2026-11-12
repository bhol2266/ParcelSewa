// Shared by the admin pages: the same cookie unlocks the orders page and the stats page.
export const ADMIN_PASSWORD = "Ssss55551!";
export const ADMIN_COOKIE = "admin_access";

// The Ankush page has its own password and its own cookie. (It used to share "admin_access" with a different value,
// so unlocking one page locked the other.) The admin password opens it too.
export const ANKUSH_PASSWORD = "5555";
export const ANKUSH_COOKIE = "ankush_access";

// The activity logs page has its own password, asked again in every new browser session.
export const LOGS_PASSWORD = "Ssss55551!";
export const LOGS_COOKIE = "logs_access";
