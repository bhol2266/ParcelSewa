# Live image delivery fix

On 2026-10-05 (Nepal time), the live site displayed broken logos and images. Direct requests for `/logo-light.png`, `/landingPage/box4.png`, and `/festivals/dashain-artwork.png` returned HTTP 200 with image content. Their `/_next/image` URLs returned HTTP 402 with `OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED` from Vercel.

The fix replaces all Next Image imports and instances with standard HTML `img` elements, as requested by the owner. Dimensions, crop layouts, native lazy loading, and accessibility text are retained. Priority images load eagerly. No page image depends on the paid `/_next/image` endpoint.

The active brand logos, homepage hero, three shopping images, and two festival images now use precompressed WebP delivery copies. Original PNG artwork remains available. Existing small retailer logos are delivered directly as PNGs.

Verification: all 43 automated tests and the production build passed. Changed storefront and image components passed ESLint. The four existing app privacy/account pages retain the same 44 pre-existing lint errors; replacing their image elements introduced none. Local production previews loaded the assets directly in both themes and at a 390-pixel mobile viewport with no horizontal overflow. Live browser verification follows the deployment. No Vercel billing settings were changed.
