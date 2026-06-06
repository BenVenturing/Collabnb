# Collabnb — Parallel Task Instructions

Each task below is self-contained. Pick 2–3 per chat session.
Working directory for all tasks: `/Users/macbookair/Documents/Claude/Projects/Collabnb Website/`

---

## ✅ DONE — Account under review banner
**Status:** Complete. Already implemented in `app/src/components/Layout.jsx`.
- `SandTimer` animated SVG component (hourglass flip + sand stream CSS keyframes)
- `PendingVerificationBanner` with noise texture overlay, gradient, inset box-shadow
- Minimize-to-pill behavior (scrolls user back to top on click)
- Shown when `profile.tier === 'waitlist' && !profile.is_verified`
No changes needed.

---

## 1. Fix collections.getByUser — only return current user's collections
**Priority:** High (privacy bug — any logged-in user sees all users' saved listings)

### What's wrong
`app/convex/collections.ts` line 4–8:
```ts
export const getByUser = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("collections").collect(); // returns EVERYONE's collections
  },
});
```

### Fix
1. Open `app/convex/collections.ts`
2. Replace `getByUser` with:
```ts
export const getByUser = query({
  args: { creatorId: v.string() },
  handler: async (ctx, { creatorId }) => {
    return await ctx.db
      .query("collections")
      .withIndex("by_creator", (q) => q.eq("creator_id", creatorId))
      .collect();
  },
});
```
(The `by_creator` index on `creator_id` already exists in schema.ts.)

3. Open `app/src/contexts/CollabContext.jsx` — find all `useQuery(api.collections.getByUser)` calls and add the `creatorId` argument. The user's ID comes from `useAuth()` → `profile?._id || profile?.id`.

4. Run `npx convex deploy` from `app/` directory.

### Notes
- The `'default'` collection is local-only (localStorage), not in Convex, so it doesn't need filtering
- Collections created via `create` mutation already stamp `creator_id` — this fix just makes reads respect it
- After fix: each user only sees their own Convex-backed collections; local `default` collection is unchanged

---

## 2. Fix pitch auto-fill — use real creator profile instead of MOCK_CREATOR
**Priority:** High (every creator's application message says "I'm Ben Venturing, 45K followers...")

### What's wrong
`app/src/pages/ListingDetail.jsx` around line 148:
The `defaultPitch` string inside `ApplyModal` uses `MOCK_CREATOR.full_name`, `MOCK_CREATOR.instagram_handle`, etc. — hardcoded mock data. The real `creatorProfile` prop is available but ignored.

### Fix
1. Open `app/src/pages/ListingDetail.jsx`
2. Find `ApplyModal` function (~line 145). The `creatorProfile` prop is already passed in.
3. Replace the `defaultPitch` string: swap every `MOCK_CREATOR.X` with `creatorProfile?.X`, with sensible fallbacks for missing fields.

Key replacements:
- `MOCK_CREATOR.full_name` → `creatorProfile?.full_name || 'I'`
- `@${MOCK_CREATOR.instagram_handle}` → the `@` + handle only if `creatorProfile?.instagram_handle` exists, else omit
- `MOCK_CREATOR.tier` → `creatorProfile?.tier || 'travel creator'`
- `Math.round(MOCK_CREATOR.follower_count / 1000)K` → only include if `creatorProfile?.follower_count` is set
- `MOCK_CREATOR.collab_count` → `creatorProfile?.collab_count || 'several'`
- `MOCK_CREATOR.engagement_rate` → only include if set

4. Also fix the success toast (~line 264): `creator: MOCK_CREATOR.full_name` → `creator: creatorProfile?.full_name || 'You'`

### Template suggestion (paste in place of old defaultPitch):
```js
const handle = creatorProfile?.instagram_handle || creatorProfile?.tiktok_handle || creatorProfile?.username;
const followerStr = creatorProfile?.follower_count >= 1000
  ? ` with ${Math.round(creatorProfile.follower_count / 1000)}K followers`
  : '';
const engagementStr = creatorProfile?.engagement_rate
  ? ` and a ${creatorProfile.engagement_rate}% engagement rate`
  : '';
const collabStr = creatorProfile?.collab_count ? `${creatorProfile.collab_count}+ collabs` : 'multiple collabs';

const defaultPitch =
`Hi! I'm ${creatorProfile?.full_name || 'a creator'}${handle ? ` (@${handle})` : ''}${followerStr ? `, a ${creatorProfile?.tier || 'travel creator'}${followerStr}` : ''}.

I'd love to collaborate on ${listing.title} in ${listing.location}.

I specialize in ${listing.collab_type || 'travel'} content and have completed ${collabStr}${engagementStr ? ` to date${engagementStr} — meaning my audience is highly active and receptive to authentic travel stories` : ''}.

I'm available during ${listing.dates_available} and can deliver ${listing.deliverables} within ${listing.due_days} days of my stay. Looking forward to creating stunning content that showcases your incredible property!

Let's make something great together.`;
```

---

## 3. Mobile nav / bottom nav polish
**Priority:** Medium

### What to do
1. Open `app/src/components/AppNav.jsx` — find the mobile hamburger/bottom nav section
2. Goals:
   - Bottom nav on mobile should show 4–5 key icons (Explore, Inbox, Collabs, Profile, Host toggle if host)
   - Active icon should be highlighted (filled icon or tinted background pill)
   - Safe area inset: add `padding-bottom: env(safe-area-inset-bottom)` so it doesn't overlap iPhone home indicator
   - No text labels needed — icons only, max 5 items
3. Check `app/src/index.css` for existing `.bottom-nav` or similar classes
4. Test at 390×844 viewport (iPhone 14 size)

### Notes
- The hamburger currently expands inline next to the avatar — keep that behavior for the top nav
- Bottom nav should be a separate `position: fixed; bottom: 0` bar, only visible on mobile (`@media (max-width: 768px)`)
- Don't add bottom nav to host pages (`/host/*`) — hosts use a sidebar layout

---

## 4. Host creators search/filtering (/host/creators)
**Priority:** Medium

### What to do
1. Open `app/src/pages/host/HostCreators.jsx`
2. There's already a `searchCacheKey` and filter state. Check what's wired vs decorative.
3. The page likely shows all creators from Convex (`api.profiles.getAll` or similar). Filtering should happen client-side on the result set.
4. Wire up these filters:
   - **Text search** — filter by `profile.full_name`, `profile.username`, `profile.city`
   - **Tier filter** — pill buttons: All / UGC Beginner / UGC Pro / Micro Influencer / Influencer
   - **Platform filter** — Instagram / TikTok / YouTube checkboxes (check `profile.instagram_handle` etc.)
5. Sort options: Most Followers / Highest Engagement / Most Recent

### Notes
- Do NOT add server-side filtering — client-side filter on the `useQuery` result is fine at this scale
- The existing filter UI (pills, inputs) may already be there but disconnected — wire the state to actual filtering logic
- Read the file carefully before touching anything — it's 1000+ lines

---

## 5. Stripe subscription end-to-end test
**Priority:** Medium (Stripe just started working — verify the flow is complete)

### What to verify
1. Open `app/src/contexts/SubscriptionContext.jsx` — find where `checkout.session.completed` updates Convex
2. Open `app/convex/stripe.ts` (or wherever the Stripe webhook handler lives) — verify it patches `profiles.subscription_status`
3. In `AuthContext.jsx`, verify `profile.subscription_status` is read and `isSubscribed` is derived correctly
4. Check that `useSubscription()` → `isSubscribed` gates the right UI (send message, apply to listing)

### Manual test checklist
- [ ] Go to Settings → Subscription → click upgrade
- [ ] Complete Stripe test checkout (use card 4242 4242 4242 4242)
- [ ] Return to app — `isSubscribed` should be `true` within 5 seconds (webhook fires)
- [ ] Verify Convex dashboard shows `subscription_status: 'active'` on your profile record
- [ ] Verify Inbox compose bar unlocks (no lock icon)
- [ ] Verify Apply Now modal doesn't block on subscription check

### If webhook is delayed
Add a manual "refresh subscription" button in Settings that re-fetches profile from Convex. Or poll `useQuery(api.profiles.getMe)` every 3s for 30s after checkout return.

---

## 6. Notifications (bell icon — no real push yet)
**Priority:** Low (pre-launch, can ship without)

### What exists
The bell icon in AppNav likely toggles a sheet or badge. No real notification delivery exists.

### What to build (in priority order)
1. **In-app notification feed** — a Convex `notifications` table:
   ```ts
   notifications: defineTable({
     user_id: v.string(),
     type: v.string(), // 'pitch_approved' | 'pitch_declined' | 'new_message' | 'host_reply'
     title: v.string(),
     body: v.optional(v.string()),
     link: v.optional(v.string()), // '#/inbox' or '#/collabs'
     read: v.boolean(),
     created_at: v.number(),
   }).index("by_user", ["user_id"])
   ```
2. **Write notifications** when pitch status changes (`pitches.ts updateStatus`) and when a message is sent (`threadMessages.ts sendMessage`)
3. **Bell badge** — `useQuery(api.notifications.getUnreadCount, { userId })` → show red dot
4. **Notification sheet** — slides down from bell, lists recent notifications, clicking marks as read + navigates
5. **Push notifications** — skip for now; in-app feed is sufficient pre-launch

---

## After any code change
Always run from `app/` directory:
```bash
npx convex deploy
```
This pushes schema + function changes to the live Convex deployment.
