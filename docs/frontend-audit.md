# ParcelSewa frontend audit and refresh

Scope: public shopping site — homepage, navigation, footer, offers, about, FAQs, price calculator, order request, and returns page presentation — plus the admin quotation calculator. Mobile and both themes are included.

## Findings addressed

| Finding | Impact | Change |
| --- | --- | --- |
| Fixed header had only 50px of reserved space for a 64px header; oversized hero artwork and rigid widths made small screens awkward. | Content could collide with navigation or stretch the layout. | A consistent header offset, bounded page containers, flexible grids, and mobile navigation. |
| Homepage had different mobile/desktop workflow sections, duplicate IDs, and a mobile reference to another brand. | Confusing content and fragile anchor navigation. | One shared four-step workflow at every screen size, a semantic main landmark and proper H1. |
| Navbar linked to `/login`; footer linked to `/about` and `/terms`, but those pages did not exist. Footer copyright also linked to an internal order tool. | Broken or surprising navigation. | Removed the unavailable login link, added factual About and Terms & Conditions pages, restored the terms link in the footer and order request form, and made copyright plain text. Public order requests stay on `/order`. |
| Homepage calculator button had no handler and displayed invented quote rows. | Users could not act on the advertised calculator. | Working calculator links and a factual explanation of what goes into a quote. |
| Page copy claimed live FX and category-based calculation, while the public calculator uses a fixed rate and does not vary its formula by category. | Misleading expectations about pricing. | Accurate fixed-rate copy, item/service/shipping breakdown, explicit estimate status. Removed the unused category selector. Service tiers now follow the owner's confirmed prices. |
| FAQs differed on delivery timing, payment options, customs charges, tracking, and support details. | Customers received contradictory promises. | Shared FAQ data and one support number. Delivery, payment, and final quote details are confirmed by the team. No unverified service promises or customer statistics. |
| Form labels were not associated with inputs; the order heading and calculator text had poor contrast in dark mode. | Keyboard and dark-theme usability issues. | Associated labels, native form validation, focus indicators, accessible FAQ disclosures, and colour tokens for both themes. |
| Existing theme initialization wrote the default light preference before restoring a saved dark preference. | Possible theme flash and preference loss on reload. | Theme state reads the initialized document and synchronizes through an external store without overwriting storage at mount. |
| Order request opened WhatsApp after an asynchronous save, which can be blocked as a popup. | Customer could be left unsure how to continue. | Existing save/open workflow retained, with a saved-request message and explicit WhatsApp fallback link. No test order sent to production. |
| Social metadata described a domestic courier service and referenced missing images. | Wrong service description and broken social previews. | Metadata describes India-to-Nepal shopping and uses the existing logo as a fallback image. |

## Design and content delivered

- Consistent navy, warm orange, neutral surfaces, typography, spacing, and responsive navigation.
- A new homepage with an actionable hero, supported-store links, four ordering steps, category shopping edits, cost guidance, benefits, FAQs, and a final order/support prompt.
- Dashain–Tihar banners use custom AI artwork of Nepali festival traditions. Homepage banner links to `/offers`.
- Offers page with fashion, home, and gifting ideas; retailer links; shopping preparation guidance; and delivery/price conditions.
- About page and refreshed public calculator, order request, FAQs, footer, and returns-page presentation.
- Shopping category cards use coordinated AI artwork for festive fashion, home décor, and gifting. The five generated assets and final prompts are recorded in `docs/festival-artwork.md`.
- WhatsApp calls to action use green #25D366 and the WhatsApp icon across the active public pages and navigation.
- Admin quotation calculator is a compact calculator-only page with price and fee inputs, a breakdown, automatic copying on calculation, repeat copy with failure feedback, optional message preview, and reset. Extra guidance, the fee table, and the footer were removed from this page. Flat NPR 600, 700, and 800 are unavailable; the only flat choice is NPR 1,000. Editing inputs clears a stale result. Manual overrides remain available.
- Calculator regression coverage for conversion, revised fee boundaries, totals, admin rounding, customer messages, invalid inputs, and removed options.

## Business details needed next

1. **Festival promotion:** the owner confirmed 10% off the ParcelSewa service fee on a first order. Banners and terms specify the service-fee basis. The offer links to an order form with an optional first-order declaration, which is recorded with the request and included in the prepared WhatsApp message. Eligibility and the discounted fee are verified by the team in the quote; there is no automatic discount engine. No expiry date, minimum spend, or cap was supplied, so none is invented.
2. **Confirmed fees:** public service fees and admin defaults are flat NPR 1,000 below INR 1,500; 30% from INR 1,500 through INR 20,000 inclusive; 25% above INR 20,000. Percentage fees apply to the converted product price. Admin manual overrides remain available. Public shipping formula and fixed 1.6 conversion are retained. Admin quotes round to whole NPR and exclude courier charges, which are disclosed in every customer message.
3. **Returns policy:** existing `[X]` and `[Y]` placeholders, unsupported live-chat mentions, and payment/refund wording still need owner-approved values. Its presentation was refreshed; its contractual text was preserved.
4. **Customer proof:** add verified reviews, photos, and delivery statistics when available. Unverified counts and ratings were removed from the active homepage.
5. **Future product work:** public tracking, accounts, and automated checkout are not present. Add them only alongside their actual backend workflows. They are not advertised as available.
6. **Social preview:** a dedicated share image would improve presentation beyond the functional logo fallback.

## Validation

- Production build passed, including TypeScript and generation of 29 pages/routes.
- Targeted ESLint and TypeScript checks passed across all changed components and pages, including the admin calculator.
- All 43 automated tests passed: nine calculator regressions plus the existing 34 image and statistics tests.
- Browser checks passed for the mobile navigation and offer-page link, FAQ expansion, calculator breakdown and negative-price rejection, labelled/required form fields, and dark-mode persistence after reload. No runtime errors were reported during these checks.
- Responsive checks covered 320px, 390px, 768px, and 1440px widths without horizontal page overflow on the inspected screens.
- Final browser checks verified the public NPR 2,792 estimate for INR 1,000 / 0.5kg, admin flat fee and INR 1,500 / 20,000 tier boundaries, automatic clipboard copying, manual fee persistence, cleared stale results, and the removal of flat 600/700/800 options. Admin calculator and offers layouts had no horizontal overflow at 320px and 390px.
- All five AI images loaded, WhatsApp links showed green #25D366 with their icon, and the festival first-order checkbox appeared only for the offer link. Production pages and dark-theme reloads completed without browser errors.
- Public form checks did not submit requests to Firestore or send WhatsApp messages. Live backend submission and payment flows were not exercised.
