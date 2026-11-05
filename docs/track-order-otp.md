# Track order OTP login

> **SMS login is switched off for now** (`SMS_LOGIN = false` in `components/TrackOrderPage.tsx`): the page asks for
> the mobile number and the last payment amount on one form. Set it to `true` to bring back "Send code", with the
> payment amount as the "No SMS?" option. The OTP routes below stay in place.

Customers verify their mobile number once on `/trackOrder` with a 6-digit SMS code, then stay signed in on that
browser for `TRACK_SESSION_DAYS` (180, in `lib/track-session.ts`) through a signed, httpOnly `ps_track` cookie.

Firebase Phone Auth was tried first but Google refused to send SMS to Nepal numbers (`auth/error-code:-39`,
HTTP 503 "Error code: 39", even on the Blaze plan). Sparrow and Aakash SMS need company verification, so SMS goes
through **NepalOTP** (nepalotp.com), which generates, texts and checks the code.

## How it works

- `POST /api/track/otp/send` — only for numbers that have orders; asks NepalOTP to text a code and stores the
  returned `otp_id`. Our limits: one code per minute and 5 per day per number (NepalOTP has its own limits too).
  Codes expire after 5 minutes. The SMS reads "Your OTP is: 123456. Valid for 5 minutes. Do not share this code."
- `POST /api/track/otp/verify` — checks the code with NepalOTP (3 tries per code); a right code sets the login
  cookie. Used codes can't be reused.
- `POST /api/track/payment/verify` — the no-SMS option, "Enter your last payment amount": signs in when the amount
  is within Rs. 30 of the advance or remaining payment of any of the number's last 3 orders (by ordered date).
  Payments under Rs. 100 never count (too easy to guess), and a number gets 5 wrong amounts a day (`payDay`,
  `payTries` in its `Track OTPs` doc); a right amount resets the count.
- `GET /api/track/orders` — returns orders for the number in the signed cookie only.
- `POST /api/track/logout` — clears the cookie ("Not you? Change number").

The Firestore collection `Track OTPs` holds one doc per number: the current `otp_id`, its expiry and the send limits.
The code itself is never stored on our side.

## Setup

The NepalOTP API key and the cookie-signing `SESSION_SECRET` are at the top of `lib/track-auth.ts`.

- A `npot_live_…` key sends real SMS and needs credit in the NepalOTP wallet; with no credit, sends fail with
  `402 INSUFFICIENT_BALANCE` and the page says it couldn't send the SMS.
- A `npot_test_…` key sends nothing and the code is always `123456` (handy for testing).
- Changing `SESSION_SECRET` signs every customer out.

The Firebase Phone provider, its test number and the SMS region policy (Nepal only) are no longer used by the
site and can be left as they are or switched off.
