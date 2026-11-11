# Handoff: hotel claim links (one-click host account)

Paste this into a new Claude Code session opened in the Collabnb Website repo.

---

Continue the hotel claim-link work. Read the `hotel-claim-outreach` skill (`~/.claude/skills/hotel-claim-outreach/SKILL.md`) and the memory note `project_claim_links.md` first.

## State as of 2026-11-09 ~20:35 Lombok time

All of the following is live in production: Convex is deployed and the latest commit `6def8cc` is pushed to main, so Cloudflare auto-deploys it.

- **Code:**
  - `app/convex/claims.ts`: `createClaim` (internal), `getByToken`, `markViewed`, `magicLink` (action), `redeem`
  - `app/src/pages/ClaimListing.jsx`: the `/claim/:token` page
  - the `listing_claims` table in `schema.ts`
  - `public/_redirects` has `/claim/*`
  - `public/_headers`: `img-src` allows `https://media.collabnb.com`
- **Real claim:** `https://collabnb.com/claim/somewhere-lombok-g57sv7fg7` (Somewhere Lombok, reservations@somewherelombok.com).
  - Pending host profile `jh77p67jtb2msydvavn5j7q28s8hwk1x` and draft listing `jd721dkvxbb315r25f3zywss5h8hxwr4`.
  - **Never click the button on this link**: it logs you into the hotel's account.
- **Demo claim, for Ben to preview:** `https://collabnb.com/claim/demo-somewhere-lombok`, using email `benventuring+somewhere-demo@gmail.com`. It's safe to click, and the same account can reopen it again and again.
- **Gmail draft:** to reservations@somewherelombok.com, BCC benventuring@gmail.com, audit PDF attached, in benventuring@gmail.com drafts (draft id `r4829978272034457760`). Ben sends it himself, choosing the hellocollabnb alias in From.
- **Payload:** `outreach/somewhere-lombok-audit/claim.json`. The audit PDF is at `~/Downloads/somewhere-lombok-audit.pdf`.

## Bugs fixed today (don't reintroduce)
- Clerk `GET /v1/users?email_address[]=` ignores the filter and returns ALL users. Use `?email_address=` and also exact-match locally. `app/convex/profiles.ts:~1322` still uses the `[]` form, which is probably buggy too and worth checking.
- This Clerk instance requires `username` when creating a user. `magicLink` sends `host_<token>`.
- After the ticket sign-in, the page reloads (`window.location.reload()`) so Convex picks up the new login before `profiles.getOrCreate` runs. Otherwise it fails with "Sign in required".

## Left to verify / do
1. VERIFIED 20:36: after the demo login, wizard Step 1 is filled (title, Lombok/Indonesia, website, phone, brief, 9 photos). Still to check: steps 2 and 3 show the 3 ugcReel / 4 storyFrame / 5 photo package with the cash amount empty.
2. Test the demo in a fresh signed-out browser end to end: click, then reload, then the editor.
3. Ben has to paste the auto-mode rule (below) into `.claude/settings.local.json` himself. Auto mode blocks Claude from editing its own settings.
4. Optional: let Founding Hosts publish without a card. Today, `listings.create`/`update` require `stripe_default_payment_method_id` to publish.
5. Later: delete the demo profile, listing and Clerk user when they're no longer needed.

## Auto-mode rule for Ben to add (`.claude/settings.local.json`, top level)
```json
"autoMode": {
  "allow": [
    "$defaults",
    "In the Collabnb Website repo, `npx convex deploy` and `npx convex run claims:* --prod` are pre-approved by the user for claim-link outreach.",
    "Uploading to `collabnb-media/claims/` with `npx wrangler r2 object put` is pre-approved by the user.",
    "Committing and pushing claim-link and outreach work to main (auto-deploys collabnb.com) is pre-approved by the user."
  ]
}
```
