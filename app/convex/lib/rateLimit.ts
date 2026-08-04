// Simple sliding-window rate limiting backed by the `rateLimits` table.
// Every limit lives here as one adjustable constant — change the numbers,
// not the call sites.
//
// IMPORTANT CAVEAT: Convex mutations don't receive the caller's IP address
// (only httpAction handlers do, via request headers) — these are regular
// mutations, not httpActions, so true per-IP limiting isn't available
// without a bigger architecture change. For authenticated actions we key by
// the caller's verified profile ID (from ctx.auth — spoofproof). For
// pre-account flows (signup, waitlist, contact form) there's no verified
// identity yet, so we key by the submitted email address instead. That's
// weaker than per-IP (a determined abuser can rotate emails) but it stops
// the common case — repeated submissions from the same address — and is the
// strongest signal actually available to a plain mutation.

export const RATE_LIMITS = {
  SIGNUP: { max: 5, windowMs: 60 * 60 * 1000 },              // profiles.getOrCreate / waitlist.signUp — 5/hour per email
  AMBASSADOR_APPLY: { max: 3, windowMs: 60 * 60 * 1000 },     // ambassadors.apply — 3/hour per email
  CONTACT_MESSAGE: { max: 5, windowMs: 60 * 60 * 1000 },      // messages.submitMessage (contact form) — 5/hour per email
  THREAD_MESSAGE: { max: 30, windowMs: 60 * 60 * 1000 },      // threadMessages.sendMessage — 30/hour per user
  LISTING_WRITE: { max: 10, windowMs: 24 * 60 * 60 * 1000 },  // listings.create/update — 10/day per host
  REPORT: { max: 10, windowMs: 24 * 60 * 60 * 1000 },         // reports.submitReport — 10/day per user
  PITCH: { max: 20, windowMs: 24 * 60 * 60 * 1000 },          // pitches.create backstop — 20/day per user (pitch_counts already caps at 10/month; this only guards the direct-mutation-call path that skips it)
  CRASH_REPORT: { max: 20, windowMs: 60 * 60 * 1000 },        // crashReports.submitCrashReport — 20/hour per caller, mainly to cap a crash-loop rather than deter abuse
  AI_DRAFT: { max: 20, windowMs: 60 * 60 * 1000 },            // aiAssistant.draftReply — 20/hour per user, caps Collabnb's NVIDIA spend per user and guards a runaway loop burning a connected personal key
} as const;

type Limit = { max: number; windowMs: number };

type RateLimitCtx = {
  db: {
    query: (table: "rateLimits") => any;
    insert: (table: "rateLimits", doc: { key: string; count: number; windowStart: number }) => Promise<any>;
    patch: (id: any, patch: Record<string, any>) => Promise<any>;
  };
};

// Throws if `key` has exceeded `limit` within the current window; otherwise
// records the attempt. Call this BEFORE performing the sensitive action.
export async function enforceRateLimit(ctx: RateLimitCtx, key: string, limit: Limit): Promise<void> {
  const now = Date.now();
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key" as any, (q: any) => q.eq("key", key))
    .unique();

  if (!existing) {
    await ctx.db.insert("rateLimits", { key, count: 1, windowStart: now });
    return;
  }

  if (now - existing.windowStart > limit.windowMs) {
    await ctx.db.patch(existing._id, { count: 1, windowStart: now });
    return;
  }

  if (existing.count >= limit.max) {
    throw new Error("Too many requests — please try again later.");
  }

  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}
