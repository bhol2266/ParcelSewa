# Track order OTP login

Customers verify their mobile number once on `/trackOrder` with Firebase Phone Auth. Firebase keeps them
signed in on that browser, and `/api/track/orders` asks for a new OTP once the sign-in is older than
`TRACK_SESSION_DAYS` (180, in `lib/track-session.ts`).

## Firebase console setup (project `parcel-sewa`, done 2026-11-05)

- Authentication → Sign-in method → **Phone: enabled**.
- Plan: **Spark (free)**. Firebase caps sent SMS at **10 per day** on this plan, so there is no SMS bill.
  More than 10 codes a day needs a billing account (Blaze) at about $0.23 per SMS to Nepal.
- Settings → Authorized domains: `parcelsewa.com`, `www.parcelsewa.com` (plus the defaults, incl. `localhost`).
- Settings → SMS region policy: **Allow Nepal (NP) only**.

## Testing without sending SMS

Fictional test number set in Phone → Phone numbers for testing. It never sends an SMS and doesn't use the
daily quota:

| Number | Code |
| --- | --- |
| +977 9800000000 | 123456 |

It has no orders, so it shows "No orders found" after signing in.
