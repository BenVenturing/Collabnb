# Signup flow + sample listing fixes

## Issues being fixed (from Ben's report)

1. **Signed up as host → landed as creator.** The waitlist captures role correctly, but `profiles.getOrCreate` (and `linkOrCreateFromClerk`) hardcode `role: 'creator'` for brand-new Clerk accounts, ignoring the waitlist role. There's also no role passed from the client on the Clerk-account step.
2. **Explore shows wrong host avatar on sample listings.** `ListingCard` (Explore.jsx:70-73, 250) treats sample listings as "owned" when `profile.is_founder === true`, so the founder's own avatar stands in for the host avatar. Sample listings have no `host_avatar` field at all.
3. **Explore shows only ~3-4 of 6 sample listings; 2 (Glacier Prime, Tranquil Waterfront) appear in Collabs instead.** `SAMPLE_COLLABORATIONS` (mockData.js:518) seeds Glacier + Tranquil into CollabContext → Collabs view, with `days_left` (due dates). These are the same properties as Explore samples, so they appear "missing" from Explore's featured row and duplicated in Collabs.
4. **Collabs view shows sample collabs with due dates.** Should show only the Demo Tour collab (dismissible X). Sample collabs should not be there.
5. **Nav dropdown "Sign up as Host" → goes to settings.** AppNav.jsx:866 just navigates to `/profile?settings=true` when `!isHostVerified`. Ben wants it to open the same host-signup notification/form flow as the initial waitlist signup, pre-populated with existing account data, with a "start fresh" option, keeping the same Clerk login.
6. **Settings "Sign up as Host" popup → instantly flips role to host, skips approval, lands on host dashboard.** Profile.jsx:1919-1924 calls `updateProfile({ role: 'host' })` then `navigate('/host')` with no signup/approval flow.
7. **Host dashboard shows 6 sample listings that look different from Explore's.** HostDashboard.jsx:713-716 falls back to bundled `SAMPLE_LISTINGS` from mockData (different photos/about than the live Convex samples) when the host has no Convex listings. Should show the same canonical Convex sample set as Explore.

## Decisions (confirmed with Ben)
- Collabs view: **remove sample collabs entirely**; only Demo Tour remains (with its existing dismiss X).
- "Sign up as Host" (both entry points): open the host-signup form pre-populated with current account data, with a "start fresh" option at the bottom, following the regular host signup process. Keep the same Clerk login (no new account).
- Sample listings: **dedupe to one canonical set owned by Ben Venturing, attach Ben's avatar** so Explore and Host dashboard read the same live Convex data.

---

## Implementation

### A. Fix role preservation on Clerk account creation (root cause of #1)

**`app/convex/profiles.ts` — `getOrCreate` (lines 13-78)**
- When creating a *new* profile (no existing waitlist row), default `role` to `'creator'` BUT accept an optional `role` arg so the client can pass the waitlist role through.
- Add `role: v.optional(v.string())` to args; use `args.role || 'creator'` on insert (line 56).
- When an existing waitlist profile is found, role is already preserved (no change needed there).

**`app/convex/profiles.ts` — `linkOrCreateFromClerk` (lines 334-366)**
- Same: accept optional `role` arg; existing-profile path already preserves role; new-profile path uses `args.role || 'creator'` (line 358).

**`app/src/contexts/AuthContext.jsx` — `ClerkAuthInner` (lines 128-149)**
- Read the waitlist role from `localStorage.getItem('collabnb_waitlist_role')` and pass it into `getOrCreateMutation({ ..., role })` on both the new-user and admin-upgrade calls. This is the bridge: the marketing wizard already stores the role in localStorage (`scripts/main.js:712`), but AuthContext never reads it.

### B. Fix sample listing host avatar on Explore (#2)

**`app/convex/listings.ts` — `getSamples` (lines 158-165)**
- Join each sample to its host profile and return `host_avatar` + `host_name` from the real owner profile. After the canonical-set fix (section D), all samples have `host_id` = Ben's profile id, so look up that profile and include `avatar_url` as `host_avatar`.

**`app/src/pages/Explore.jsx` — `ListingCard` (lines 65-73, 250)**
- Remove the `isOwnListing` founder-override for sample listings (lines 70-73): samples are owned by Ben, not the viewer. Use `listing.host_avatar` from the query, falling back to `SAMPLE_HOST.avatar_fallback` only when missing.
- Keep `isOwnListing` for genuine `host_id === profile._id` matches (real host viewing their own listing).

### C. Remove sample collabs from Collabs view (#3, #4)

**`app/src/lib/mockData.js` — `SAMPLE_COLLABORATIONS` (lines 518-596)**
- Remove the two `is_sample: true` entries (Glacier Prime id:1, Tranquil Waterfront id:2). Keep the archived Mountain Lodge entry (id:3, `is_active: false`) since it's a demo of the archived state — actually, per Ben's "only Demo Tour should be in collabs", remove all three sample collabs and keep only `DEMO_COLLAB`.
- Result: `SAMPLE_COLLABORATIONS` becomes `[]`.

**`app/src/contexts/CollabContext.jsx` (line 37)**
- Default `collabs` to `[]` instead of `SAMPLE_COLLABORATIONS` (or keep the constant now empty). New accounts start with no collabs; `DEMO_COLLAB` is still injected in `Collabs.jsx:258`.

**`app/src/pages/Collabs.jsx` (line 220)**
- The `base` filter already excludes dismissed samples; with no sample collabs seeded, only real Convex collabs + Demo Tour appear. No change needed beyond the mockData removal, but verify the `is_sample` dismiss path still works for any legacy localStorage entries.

**Note on localStorage migration:** existing users have `collabnb_collabs` in localStorage seeded from the old `SAMPLE_COLLABORATIONS`. Add a one-time cleanup in CollabContext that strips any collab with `is_sample === true` from stored state on load (so Ben's existing account drops Glacier + Tranquil).

### D. Canonical sample listing set + Host dashboard consistency (#7, supports #2)

**`app/convex/listings.ts` — fix `seedSampleListings` (lines 467-693)**
- The 6 sample objects here have *different* `about` text and *fewer* `gallery_images` than `seed.ts`. Align them with `seed.ts` (same full about text, same 5-image galleries, same amenities/what_you_get). This makes "sample listings I created on Benventuring" identical across sources.
- Keep `is_sample: true`, `status: 'draft'` → actually set `status: 'published'` so they show on Explore via `getSamples` (getSamples doesn't filter by status, but published is correct for the canonical set). The `cleanupSampleListings` already sets `published`.

**Run `cleanupSampleListings` after deploy** — collapses duplicate sample-titled rows to one canonical row each, owned by Ben, `is_sample + published`. This is a manual `npx convex run` step (add to manual TODOs).

**`app/src/pages/HostDashboard.jsx` (lines 712-716)**
- Stop falling back to bundled `SAMPLE_LISTINGS` from mockData. Instead, when the host has no Convex listings, fetch the global sample set (`api.listings.getSamples`) and show those, labeled as samples (the `is_sample` watermark + "Remove sample" menu item already exist in `HostListingCard`).
- This makes Host dashboard show the *same* canonical Convex samples as Explore, with Ben's avatar, deletable via the existing "Remove sample" menu action (line 481, `onRemoveSample`).
- Remove the `SAMPLE_LISTINGS` import.

### E. "Sign up as Host" flow — both entry points (#5, #6)

Ben wants: clicking "Sign up as Host" opens a host-signup form pre-populated with current account data (name, email, city from profile), with a "start fresh" option at the bottom, following the regular host signup process (calls `waitlist.signUp` with `role: 'host'` → triggers welcome email + admin notification), keeping the same Clerk login.

**New component: `HostSignupSheet`** (in `app/src/components/`)
- A bottom-sheet modal mirroring the marketing wizard's host step-3 (main.js:575-583): Property/business name + City + Country fields, pre-filled from `profile` (full_name, email, city).
- On submit: call `api.waitlist.signUp` with `{ full_name, email, role: 'host', business_name, city, country }` — but since the profile already exists by email, `waitlist.signUp` returns `alreadySignedUp: true` and won't re-insert. So instead call a new `profiles.updateProfile` to set `role: 'host'` + capture host details (business_name, city), AND fire the admin notification + welcome-host email.
- Add a `switchToHost` mutation in `app/convex/profiles.ts` that: sets `role: 'host'`, updates business_name/city, sends admin notification (`internal.email.sendAdminNotification`) + welcome-host email (`internal.email.sendWelcomeEmail`). This is the "regular host signup process" server-side, reusing existing email infrastructure.
- "Start fresh" button at the bottom: clears the pre-populated fields (empty business name/city) but keeps the logged-in identity.
- After submit: set `role: 'host'` via `updateProfile`, show the same celebration/notification popup as the initial signup (reuse the confetti + "you're on the list" pattern from WaitlistPreview or the wizard `_showWizardDone`), then navigate to `/host`.
- Keep the same Clerk session — no new login. The user's account email stays the same; only the profile role flips to host.

**`app/src/components/AppNav.jsx` (lines 856-873)**
- Replace the `navigate('/profile?settings=true')` fallback with opening `HostSignupSheet`. The `isHostVerified`/`isHost` branches stay as-is (those are for users who are already hosts).

**`app/src/pages/Profile.jsx` (lines 1919-1924)**
- Replace the instant `updateProfile({ role: 'host' }) + navigate('/host')` with opening `HostSignupSheet` (same component). The confirm sheet at 1875-1936 can be repurposed as the `HostSignupSheet` trigger, or the sheet replaces it.

### F. Explore "3 of 6 missing" — root cause

Once C (remove sample collabs) and D (canonical set) are done, all 6 samples show on Explore. The "only 3-4 visible" was because: (a) Glacier + Tranquil were rendered as collabs not listings, and (b) the featured `Trending Now` row filters `is_featured` — only 4 of 6 samples are featured. The other 2 (Lakeside Treehouse, Desert Dome) appear in "All Stays" / "Picked for You", not Trending. That's correct behavior. No separate fix needed beyond C+D; Ben will see all 6 across the Explore sections.

---

## Files to edit
1. `app/convex/profiles.ts` — getOrCreate + linkOrCreateFromClerk accept role; new `switchToHost` mutation
2. `app/src/contexts/AuthContext.jsx` — pass waitlist role to getOrCreate
3. `app/convex/listings.ts` — getSamples returns host_avatar; align seedSampleListings data with seed.ts
4. `app/src/pages/Explore.jsx` — drop founder-override for sample avatar
5. `app/src/lib/mockData.js` — empty out SAMPLE_COLLABORATIONS
6. `app/src/contexts/CollabContext.jsx` — default collabs to [], strip legacy sample collabs from localStorage
7. `app/src/pages/HostDashboard.jsx` — use Convex getSamples instead of bundled SAMPLE_LISTINGS
8. `app/src/components/HostSignupSheet.jsx` — new component
9. `app/src/components/AppNav.jsx` — open HostSignupSheet instead of navigating to settings
10. `app/src/pages/Profile.jsx` — open HostSignupSheet instead of instant role flip

## Manual steps after deploy (add to memory manual_todos)
- Run `npx convex run listings:cleanupSampleListings` to collapse duplicate samples to the canonical Ben-owned set.
- Deploy Convex: `cd app && npx convex deploy`
- Push frontend to Vercel.

## Out of scope (not changing)
- The `isHostVerified` gating logic in AppNav (only affects users who already have listings).
- The `WaitlistPreview` page (post-approval confirmation) — works fine.
- Real-host listing creation flow (already works).
