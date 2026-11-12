# Handoff v2: claim-link email + flow rework (2026-11-12)

Paste everything below the line into a new Claude Code session in the Collabnb Website repo.

---

Continue the hotel claim-link work. Read `outreach/HANDOFF-claim-links.md`, the `hotel-claim-outreach` skill and memory `project_claim_links.md` first. Ben tested the full Somewhere Lombok flow on 2026-11-11/12, and five problems came up. Fix them in this order, verify each one, and don't touch unrelated files. Other sessions have uncommitted work in `app/` (WizardShell, Step1Basics, HostDashboard, CookieBanner, index.css), so commit only the files you change.

## Already done (don't redo)
- Claim page photo-grid overlap: fixed, commit `c9c8ca3`, live.
- Email images hosted at `https://media.collabnb.com/claims/somewhere-lombok/email/{listing-hero.jpg,listing-2.jpg,listing-3.jpg,logo.png}`. The audit PDF is at `https://media.collabnb.com/claims/somewhere-lombok/somewhere-lombok-audit.pdf`.
- `outreach/somewhere-lombok-audit/email/email.html` uses those hosted URLs and links the audit instead of attaching it.

## 1. The email itself is broken: photos and links
What happened in Ben's test (draft `r1131695481201087047`, created with the Gmail connector using inline `cid:` attachments; Ben changed To/From in the Gmail web composer and sent it):
- The email landed in Promotions.
- **All three listing photos rendered as the Collabnb logo.** The hero and both squares showed the handshake logo, so the cid → attachment mapping is wrong (all of them resolved to the logo part).
- **Every link opened Google's "Redirect Notice" page**: the claim button, "Open your draft listing" and the audit link. Links had been rewritten to `google.com/url?q=…&ust=…`. The earlier sent test, message `1a1ca8334d1d2b09`, shows the same wrapping and dropped its inline images completely.
- Working theory: opening an API-made draft in Gmail's web composer and editing it (To/From) re-serializes the HTML, wrapping the links and breaking the inline parts. Also, the Gmail connector's `create_draft` strips any `<img>` that isn't a `cid:` attachment, so hosted images can't go in a connector draft.

Goal: a cold email that arrives with real photos and direct links, ideally in Primary. Investigate and pick the most reliable route, for example:
- (a) Send through the app's existing email infrastructure (find how Convex sends Ben's "claim viewed" email) from a collabnb.com address, using the hosted image URLs. Check the domain records first: as of 2026-11-11, `collabnb.com` had DMARC `p=quarantine` but **no SPF TXT and no MX at the root**, so check whichever sending domain or subdomain is used. Add a `claims:sendOutreach` internal action, send to a test address first, and only send to a hotel when Ben confirms.
- (b) If staying in Gmail: get the inline cid mapping right AND have Ben send without opening it in the composer, e.g. set To correctly when the draft is made, or use the connector's `send_message`, only with Ben's explicit go-ahead per send.
- Whichever route you pick, keep the email lighter for deliverability: fewer images, no attachment, a short plain-text part, and no tracking redirects.
- Verify by sending to a personal Gmail and to mail-tester.com, then report the score.

## 2. Skip the claim preview page when the email works
Today the email button goes to `/claim/:token`, which repeats the email (listing preview), and the "Open my draft listing" button is far down the page. Ben wants the email CTA to go **straight into their account**.
- Add a direct mode, e.g. `/claim/:token?go=1`. It immediately calls `claims:magicLink`, signs in with the ticket, and lands in `/host/listings/create/basics` pre-filled, with only a short loading state.
- Keep the full preview page only as the fallback, used when the email couldn't show the photos (e.g. a plain-text email link) or when the direct sign-in isn't possible (the email already has a Clerk account). Move its CTA to the top of the page as well.
- Code: `app/src/pages/ClaimListing.jsx`, `app/convex/claims.ts`.

## 3. The claim redeemed into Ben's account (critical)
Ben opened the REAL claim link (`somewhere-lombok-g57sv7fg7`) in Chrome while signed in as benventuring@gmail.com and published the listing. It ended up on **his** account, not the hotel's pending account (reservations@somewherelombok.com, profile `jh77p67jtb2msydvavn5j7q28s8hwk1x`).
- Fix: a claim must only ever redeem into the account whose email matches `claim.email`. If someone else is signed in, sign them out first (or show a "You're signed in as X, continue as <hotel email>" step that switches accounts), then run the ticket sign-in. `claims:redeem` must check server-side that the caller's email matches the claim, and reject it otherwise.
- Cleanup: Ben is deleting the listing he published. After the fix, check what state the real claim, the hotel's pending profile and the draft listing are in. Restore them by re-running `claims:createClaim --prod` with `outreach/somewhere-lombok-audit/claim.json` (same token; it replaces the claim and adds a new draft). Delete any orphan drafts, but **ask Ben before any prod write or delete**.
- Never click the button on the real link while testing. Use the demo claim `demo-somewhere-lombok` (benventuring+somewhere-demo@gmail.com) and test it in a signed-out browser AND in a browser signed in as a different user.

## 4. Payment header wording in the listing wizard
On the compensation/payment card (Step 2 Offer area), the header reads "Collabnb handles payment" + "RECOMMENDED". When the "I'll pay the creator myself" toggle is on, the header must change to "You handle payment" (and the "Recommended" tag should go). Find the component by searching for "Collabnb handles payment" in `app/src`, and update the i18n string if one is used.

## 5. Deploy + verify
- Backend: check `git status` for other sessions' `app/convex` changes, then `cd app && npx convex deploy`.
- Frontend: commit only your files and push to main (Cloudflare auto-deploys).
- Verify on collabnb.com: the demo claim direct-mode flow works signed out and signed in as another user; the payment header flips; a test email arrives with photos and direct links.
- Update the `hotel-claim-outreach` skill (the email/sending steps changed) and `project_claim_links.md`.
