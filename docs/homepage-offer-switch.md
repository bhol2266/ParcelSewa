# Homepage offer switch

The **Homepage offer ad** switch appears below the shortcut tiles in `/admin` after the existing admin login is unlocked. Green / **Shown** displays the Dashain & Tihar banner on the homepage; **Hidden** removes it. Saving is confirmed before the switch changes state, and failures leave the previous state in place.

The setting is stored in Firestore at `siteSettings/homepage` as the boolean `homepageOfferVisible`, alongside `updatedAt`. An absent setting defaults to shown. The offers page and shopping category cards are unaffected.

The homepage reads the setting through the uncached `/api/homepage-offer` endpoint when it loads. It waits for the saved value to avoid flashing a hidden banner. If the setting cannot be read, the optional banner stays hidden. A refreshed page or new visit picks up the latest setting.

The endpoint exposes only the visibility boolean publicly. Writes require the existing admin cookie, a same-site request, and a boolean value. It does not change Firebase access rules or the site's existing login.

Validation: the production build, 43 existing automated tests, and targeted lint checks passed. Browser testing verified hiding, showing, persistence after refreshing the admin page, and the corresponding fresh homepage. API checks rejected unauthenticated updates (401), cross-origin updates (403), invalid values (400), and malformed JSON (400). The original shown state was restored after testing.
