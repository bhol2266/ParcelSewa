# Track order OTP login

Customers verify their mobile number once on `/trackOrder` with a 6-digit SMS code, then stay signed in on that
browser for `TRACK_SESSION_DAYS` (180, in `lib/track-session.ts`) through a signed, httpOnly `ps_track` cookie.

Firebase Phone Auth was tried first but Google refused to send SMS to Nepal numbers (`auth/error-code:-39`,
even on the Blaze plan), so SMS goes through **Sparrow SMS** instead.

## How it works

- `POST /api/track/otp/send` — only for numbers that have orders; texts the code through Sparrow.
  Limits: one code per minute and 5 per day per number. Codes expire after 5 minutes.
- `POST /api/track/otp/verify` — 5 wrong tries per code; a right code sets the login cookie. Codes can't be reused.
- `GET /api/track/orders` — returns orders for the number in the signed cookie only.
- `POST /api/track/logout` — clears the cookie ("Not you? Change number").

Codes are kept in the Firestore collection `Track OTPs` (one doc per number) as a keyed hash, never in plain text.

## Setup

Fill in the three values at the top of `lib/track-auth.ts`:

| Constant | Where it comes from |
| --- | --- |
| `SPARROW_TOKEN` | Sparrow SMS dashboard → API token |
| `SPARROW_FROM` | Your approved sender identity in Sparrow |
| `SESSION_SECRET` | Any long random string. Changing it signs every customer out. |

Until all three are set, the page says "SMS login isn't set up yet" instead of sending.

The Firebase Phone provider, its test number and the SMS region policy (Nepal only) are no longer used by the
site and can be left as they are or switched off.
