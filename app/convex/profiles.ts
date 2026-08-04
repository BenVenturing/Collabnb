import { v, ConvexError } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { requireAuthedProfile, requireOwnerOrAdmin, requireAdmin, isServerAdminEmail, canAccessAdmin, canAccessOwner } from "./lib/auth";
import { cleanPlainText, cleanOptionalUrl } from "./lib/sanitize";
import { enforceRateLimit, RATE_LIMITS } from "./lib/rateLimit";

export const countAll = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("profiles").collect();
    return all.length;
  },
});

export const getOrCreate = mutation({
  args: {
    email: v.string(),
    full_name: v.string(),
    avatar_url: v.optional(v.string()),
    is_admin: v.optional(v.boolean()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // The caller's identity anchor is Clerk's stable per-user `subject`
    // (JWT "sub" claim) — always present and verified. Email is NOT
    // currently included as a JWT claim (the deployed Clerk "convex" JWT
    // template omits it — a dashboard config gap, not fixable here), so
    // args.email is accepted as display/lookup data only, never trusted as
    // the security boundary. is_admin is likewise only ever auto-derived
    // from a JWT-*verified* email (isServerAdminEmail) — while that claim is
    // absent this bootstrap path is inert by design, which is fine since a
    // real admin's is_admin flag already persists on their row.
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) {
      throw new ConvexError("Sign in required.");
    }
    const clerkUserId = identity.subject;
    const email = args.email.toLowerCase().trim();
    const verifiedEmail = identity.email?.toLowerCase().trim();
    const isAdmin = isServerAdminEmail(verifiedEmail);

    let existing = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerk_user_id", clerkUserId))
      .unique();
    if (!existing) {
      // One-time link for a row created before clerk_user_id was tracked.
      // Only links an UNCLAIMED row (never re-links one already owned by a
      // different Clerk user) — args.email can't be cryptographically
      // verified right now, so this may only carry the link forward, never
      // grant/escalate privilege (that still requires isAdmin above, which
      // stays gated on the verified JWT email).
      const legacyMatch = await ctx.db
        .query("profiles")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      if (legacyMatch && !legacyMatch.clerk_user_id) existing = legacyMatch;
    }

    if (existing) {
      const adminPatch: Record<string, any> = { clerk_registered: true, clerk_user_id: clerkUserId };
      if (isAdmin) {
        adminPatch.is_admin = true;
        adminPatch.is_verified = true;
        adminPatch.tier = 'UGC Pro';
        adminPatch.is_founder = true;
        adminPatch.beta = true;
      }
      // Apply the signup-selected role when claiming a not-yet-registered
      // waitlist row. Established (already clerk_registered) accounts are never
      // touched here — deliberate role changes go through requestRoleSwitch.
      if (!existing.clerk_registered && !isAdmin && args.role && args.role !== existing.role) {
        adminPatch.role = args.role;
      }
      await ctx.db.patch(existing._id, adminPatch);
      return await ctx.db.get(existing._id);
    }

    await enforceRateLimit(ctx, `signup:${email}`, RATE_LIMITS.SIGNUP);

    const username = email.split('@')[0].replace(/[^a-z0-9_]/gi, '') || 'user';

    // Generate a unique referral code
    const prefix = username.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 4) || 'USER';
    let refCode = '';
    for (let i = 0; i < 10; i++) {
      const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(6, '0').slice(0, 6);
      const candidate = `${prefix}-${rand}`;
      const collision = await ctx.db.query("referral_codes").withIndex("by_code", (q) => q.eq("code", candidate)).unique();
      if (!collision) { refCode = candidate; break; }
    }

    const profileId = await ctx.db.insert("profiles", {
      email,
      full_name: cleanPlainText(args.full_name, 100) || email.split('@')[0],
      username,
      role: args.role || 'creator',
      tier: isAdmin ? 'UGC Pro' : 'waitlist',
      is_verified: isAdmin ? true : false,
      is_founder: isAdmin ? true : undefined,
      is_admin: isAdmin ? true : undefined,
      beta: isAdmin ? true : undefined,
      avatar_url: args.avatar_url ? cleanOptionalUrl(args.avatar_url, "Avatar URL") : undefined,
      referral_code: refCode || undefined,
      clerk_registered: true,
      clerk_user_id: clerkUserId,
    });

    if (refCode) {
      await ctx.db.insert("referral_codes", {
        owner_id: String(profileId),
        code: refCode,
        use_count: 0,
        max_uses: 12,
      });
    }

    return await ctx.db.get(profileId);
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

// Used by lib/auth.ts's action-context helpers (requireAdminAction,
// requireOwnerOrAdminAction) — resolves the caller by Clerk's verified
// `subject`, since the email JWT claim currently isn't populated.
export const getByClerkUserId = query({
  args: { clerk_user_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerk_user_id", args.clerk_user_id))
      .unique();
  },
});

// Persists the host's saved card after a Stripe SetupIntent Checkout session
// completes — see stripe.js createHostCardSetupSession/verifyHostCardSetupSession.
export const setHostCard = internalMutation({
  args: {
    profileId: v.string(),
    customerId: v.string(),
    paymentMethodId: v.string(),
    cardBrand: v.optional(v.string()),
    cardLast4: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const exists = await ctx.db.get(args.profileId as any);
    if (!exists) return;
    await ctx.db.patch(args.profileId as any, {
      stripe_customer_id: args.customerId,
      stripe_default_payment_method_id: args.paymentMethodId,
      stripe_card_brand: args.cardBrand,
      stripe_card_last4: args.cardLast4,
    });
  },
});

// Clears the saved-card fields after Settings > Payments & tax > Remove card
// detaches the payment method on Stripe's side (see stripe.js removeSavedCard).
export const clearHostCard = internalMutation({
  args: { profileId: v.string() },
  handler: async (ctx, args) => {
    const exists = await ctx.db.get(args.profileId as any);
    if (!exists) return;
    await ctx.db.patch(args.profileId as any, {
      stripe_default_payment_method_id: undefined,
      stripe_card_brand: undefined,
      stripe_card_last4: undefined,
    });
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("_id"), args.id))
      .unique();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("profiles").collect();
  },
});

// Host profiles a creator can send a contract to (lightweight shape).
export const getHosts = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("profiles").collect();
    return all
      .filter((p) => p.role === "host")
      .map((p) => ({
        _id: p._id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        city: p.city,
        region: p.region,
      }));
  },
});

export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("profiles").collect();
    return all.find((p) => p.username.toLowerCase() === args.username.toLowerCase()) ?? null;
  },
});

export const setFounderStatus = mutation({
  args: { profileId: v.string(), isFounder: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.profileId as any, { is_founder: args.isFounder });
  },
});

// Creator picks which payout rail they want to connect (before onboarding).
export const setPayoutMethod = mutation({
  args: { profileId: v.string(), payoutMethod: v.union(v.literal("stripe_connect"), v.literal("wise")) },
  handler: async (ctx, args) => {
    await requireOwnerOrAdmin(ctx, args.profileId);
    await ctx.db.patch(args.profileId as any, { payout_method: args.payoutMethod });
  },
});

// Called from stripe.js after creating the creator's Express connected account.
// Only defaults the active rail to Stripe if nothing is active yet — a
// creator who already has Wise active and is now also connecting Stripe as a
// second option shouldn't have their payouts silently redirected.
export const setStripeConnectAccount = internalMutation({
  args: { profileId: v.string(), accountId: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId as any);
    const patch: Record<string, unknown> = { stripe_connect_account_id: args.accountId };
    if (!profile?.payout_method) patch.payout_method = "stripe_connect";
    await ctx.db.patch(args.profileId as any, patch);
  },
});

// Called by the account.updated webhook once Stripe finishes verifying the
// connected account and enables charges/payouts on it.
export const setStripeConnectPayoutsEnabled = internalMutation({
  args: { accountId: v.string(), payoutsEnabled: v.boolean() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_stripe_connect_account", (q) => q.eq("stripe_connect_account_id", args.accountId))
      .unique();
    if (!profile) return;
    await ctx.db.patch(profile._id, { stripe_connect_payouts_enabled: args.payoutsEnabled });
  },
});

// Called once a Wise recipient account has been created for this creator.
// Same non-clobbering rule as setStripeConnectAccount — see comment there.
export const setWiseRecipient = internalMutation({
  args: { profileId: v.string(), recipientId: v.string(), currency: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId as any);
    const patch: Record<string, unknown> = { wise_recipient_id: args.recipientId, wise_recipient_currency: args.currency };
    if (!profile?.payout_method) patch.payout_method = "wise";
    await ctx.db.patch(args.profileId as any, patch);
  },
});

// Creator removes ONE connected payout rail — the other, if also connected,
// is left untouched. If the disconnected rail was the active one, the active
// method falls back to whichever rail is still connected, or clears entirely
// if neither is left.
export const disconnectPayoutMethod = mutation({
  args: { profileId: v.string(), method: v.optional(v.union(v.literal("stripe_connect"), v.literal("wise"))) },
  handler: async (ctx, args) => {
    const profile = await requireOwnerOrAdmin(ctx, args.profileId);
    // method omitted = legacy "disconnect everything" behavior, still used
    // by any caller that hasn't been updated to the dual-rail model.
    const target = args.method ?? profile.payout_method;

    const patch: Record<string, unknown> = {};
    if (target === "stripe_connect") {
      patch.stripe_connect_account_id = undefined;
      patch.stripe_connect_payouts_enabled = undefined;
    } else if (target === "wise") {
      patch.wise_recipient_id = undefined;
      patch.wise_recipient_currency = undefined;
    }

    if (profile.payout_method === target) {
      const otherStillConnected = target === "stripe_connect"
        ? !!profile.wise_recipient_id
        : !!profile.stripe_connect_account_id;
      patch.payout_method = otherStillConnected ? (target === "stripe_connect" ? "wise" : "stripe_connect") : undefined;
    }

    await ctx.db.patch(args.profileId as any, patch);
  },
});

// Switches which connected rail actually receives payouts. Requires the
// target rail to already be connected — this never starts a new onboarding,
// it only flips the pointer. Gated behind a client-side typed confirmation
// (see PayoutMethodPanel) since it changes where real money goes next.
export const setActivePayoutMethod = mutation({
  args: { profileId: v.string(), payoutMethod: v.union(v.literal("stripe_connect"), v.literal("wise")) },
  handler: async (ctx, args) => {
    const profile = await requireOwnerOrAdmin(ctx, args.profileId);
    const isConnected = args.payoutMethod === "stripe_connect"
      ? !!profile.stripe_connect_account_id
      : !!profile.wise_recipient_id;
    if (!isConnected) throw new ConvexError("Connect that payout method first.");
    await ctx.db.patch(args.profileId as any, { payout_method: args.payoutMethod });
  },
});

export const getUnverified = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return [];
    const all = await ctx.db.query("profiles").collect();
    return all.filter(p => p.is_verified !== true && p.is_rejected !== true);
  },
});

export const getRejected = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return [];
    const all = await ctx.db.query("profiles").collect();
    return all.filter(p => p.is_rejected === true);
  },
});

export const approveProfile = mutation({
  args: {
    profileId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const profile = await ctx.db.get(args.profileId as any);
    if (!profile) return;

    // Determine founder status server-side: count existing founders of the same role
    const allProfiles = await ctx.db.query("profiles").collect();
    const existingFounders = allProfiles.filter(
      (p) => p.is_founder === true && p.role === profile.role
    ).length;
    const isFounder = existingFounders < 100;

    const patch: Record<string, any> = {
      is_verified: true,
      is_founder: isFounder,
      is_rejected: undefined,
      rejection_reason: undefined,
    };
    // If referred, stamp the pending collab bonus so their profile shows the indicator
    if (profile?.referred_by && !profile.first_collab_completed) {
      patch.referral_bonus_pending = true;
    }
    await ctx.db.patch(args.profileId as any, patch);
    if (profile?.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendAccessGrantedEmail, {
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
      });
    }
  },
});

export const rejectProfile = mutation({
  args: {
    profileId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.profileId as any, {
      is_rejected: true,
      rejection_reason: args.reason,
    });
    const profile = await ctx.db.get(args.profileId as any);
    if (profile?.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendRejectionEmail, {
        email: profile.email,
        full_name: profile.full_name,
        reason: args.reason,
      });
    }
  },
});

export const requestTierChange = mutation({
  args: { profileId: v.string(), requestedTier: v.string() },
  handler: async (ctx, args) => {
    await requireOwnerOrAdmin(ctx, args.profileId);
    const profile = await ctx.db.get(args.profileId as any);
    if (!profile) return;
    await ctx.db.patch(args.profileId as any, {
      pending_tier: args.requestedTier,
      tier_change_requested_at: Date.now(),
    });
  },
});

export const approveTierChange = mutation({
  args: { profileId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const profile = await ctx.db.get(args.profileId as any);
    if (!profile?.pending_tier) return;
    await ctx.db.patch(args.profileId as any, {
      tier: profile.pending_tier,
      pending_tier: undefined,
      tier_change_requested_at: undefined,
    });
  },
});

export const declineTierChange = mutation({
  args: { profileId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.profileId as any, {
      pending_tier: undefined,
      tier_change_requested_at: undefined,
    });
  },
});

export const getTierChangeRequests = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return [];
    const all = await ctx.db.query("profiles").collect();
    return all.filter(p => p.pending_tier != null);
  },
});

export const getDetailedProfile = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return null;

    const pId = String(args.profileId);
    const monthKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"

    const [pitchCount, collabs, contracts, refCodes, refUses, allRefUses] = await Promise.all([
      ctx.db.query("pitch_counts").withIndex("by_user", (q) => q.eq("user_id", pId)).first(),
      ctx.db.query("collaborations").filter((q) => q.eq(q.field("creator_id"), pId)).collect(),
      ctx.db.query("contracts").collect().then((all) =>
        all.filter((c) => c.creator_name === profile.full_name || c.host_name === profile.full_name)
      ),
      ctx.db.query("referral_codes").filter((q) => q.eq(q.field("owner_id"), pId)).collect(),
      ctx.db.query("referral_uses").filter((q) => q.eq(q.field("used_by_id"), pId)).collect(),
      ctx.db.query("referral_uses").collect(),
    ]);

    const myRefCodes = refCodes.map((rc) => rc.code);
    const totalReferrals = allRefUses.filter((ru) => myRefCodes.includes(ru.code)).length;
    const thisMonthPitch = pitchCount?.count ?? 0;

    // Find referrer if referred_by is set
    let referrer = null;
    if (profile.referred_by) {
      referrer = await ctx.db
        .query("referral_codes")
        .withIndex("by_code", (q) => q.eq("code", profile.referred_by!))
        .unique();
    }

    return {
      profile: {
        ...profile,
        // Convex returns _id as Id type — serialize it
        _id: String(profile._id),
        _creationTime: profile._creationTime,
      },
      pitchCount: thisMonthPitch,
      collabCount: collabs.length,
      collabs,
      contracts,
      referralCodes: refCodes,
      referredBy: allRefUses.filter((ru) => ru.code === profile.referred_by),
      totalReferrals,
      referrerOwnerId: referrer?.owner_id ?? null,
      freeMonthsBalance: profile.free_months_balance ?? 0,
    };
  },
});

// Surfaces the facts an admin needs to judge a legacy yearly-plan money-back
// guarantee claim (see Terms 3.7): outreach sent and collaborations confirmed
// during the subscription term. This does not auto-approve/deny — it's a
// verification aid; the admin makes the final call (mirrors "can be verified
// by us" in the guarantee clause).
export const checkGuaranteeEligibility = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    if (!(await canAccessAdmin(ctx))) return null;
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return null;

    const pId = String(args.profileId);
    const isYearly = profile.subscription_tier === "yearly";
    const expiresAt = profile.subscription_expires_at ?? null;
    const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    // No explicit term-start field is stored — approximate it from the yearly
    // period end, since Stripe only gives us subscription_expires_at.
    const approxTermStart = expiresAt ? expiresAt - YEAR_MS : null;
    const termEnded = expiresAt ? Date.now() > expiresAt : false;

    const [pitches, contracts] = await Promise.all([
      ctx.db.query("pitches").withIndex("by_creator", (q) => q.eq("creator_id", pId)).collect(),
      ctx.db.query("contracts").withIndex("by_creator", (q) => q.eq("creator_id", pId)).collect(),
    ]);

    const inTerm = (ts) => approxTermStart != null && ts >= approxTermStart && ts <= (expiresAt ?? Infinity);

    const outreach = pitches.filter((p) => inTerm(p.created_at));
    const confirmed = contracts.filter((c) => c.creator_signed && c.host_signed && inTerm(c._creationTime));

    const reasons = [];
    if (!isYearly) reasons.push("Not on the yearly plan — guarantee only covers legacy yearly subscriptions.");
    if (!expiresAt) reasons.push("No subscription term on record.");
    else if (!termEnded) reasons.push("Subscription term hasn't ended yet — refund requests are only valid after the term ends.");
    if (expiresAt && termEnded && outreach.length === 0) reasons.push("No outreach activity found during the term.");
    if (confirmed.length > 0) reasons.push(`${confirmed.length} confirmed collaboration(s) found during the term — guarantee does not apply.`);
    if (profile.subscription_status === "cancelled") reasons.push("Subscription shows status \"cancelled\" — verify it wasn't cancelled/downgraded before the term naturally ended.");

    const eligible = isYearly && termEnded && outreach.length > 0 && confirmed.length === 0;

    return {
      subscriptionTier: profile.subscription_tier ?? null,
      subscriptionStatus: profile.subscription_status ?? null,
      subscriptionExpiresAt: expiresAt,
      approxTermStart,
      termEnded,
      eligible,
      reasons,
      outreachCount: outreach.length,
      confirmedCollabCount: confirmed.length,
      recentOutreach: outreach
        .sort((a, b) => b.created_at - a.created_at)
        .slice(0, 10)
        .map((p) => ({ listing_title: p.listing_title ?? null, created_at: p.created_at, status: p.status })),
      recentConfirmed: confirmed.map((c) => ({
        property_name: c.property_name ?? null,
        host_name: c.host_name,
        creator_signed_at: c.creator_signed_at ?? null,
        host_signed_at: c.host_signed_at ?? null,
      })),
    };
  },
});

// Server-only: called from the Stripe webhook (http.ts) and stripe.js, never
// from the client — a client-callable version would let anyone grant
// themselves an active subscription.
export const updateSubscription = internalMutation({
  args: {
    profileId: v.string(),
    subscriptionStatus: v.string(),
    subscriptionTier: v.optional(v.string()),
    subscriptionExpiresAt: v.optional(v.number()),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const exists = await ctx.db.get(args.profileId as any);
    if (!exists) return;
    const patch: Record<string, any> = {
      subscription_status: args.subscriptionStatus,
    };
    if (args.subscriptionTier !== undefined) patch.subscription_tier = args.subscriptionTier;
    if (args.subscriptionExpiresAt !== undefined) patch.subscription_expires_at = args.subscriptionExpiresAt;
    if (args.stripeCustomerId !== undefined) patch.stripe_customer_id = args.stripeCustomerId;
    // A successful subscription purchase restores full marketplace access,
    // regardless of a prior trial/limited state.
    if (args.subscriptionStatus === "active") patch.access_state = "active";
    await ctx.db.patch(args.profileId as any, patch);
  },
});

// Called by the Clerk webhook (httpActions have no ctx.db). Links an existing
// waitlist profile by email or creates a fresh profile for the new Clerk user.
export const linkOrCreateFromClerk = internalMutation({
  args: {
    email: v.string(),
    fullName: v.string(),
    username: v.string(),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) {
      const patch: Record<string, any> = {
        full_name: args.fullName,
        clerk_registered: true,
      };
      // Apply the signup-selected role only when claiming a not-yet-registered
      // waitlist row (mirrors getOrCreate). Established accounts are untouched.
      if (!existing.clerk_registered && args.role && args.role !== existing.role) {
        patch.role = args.role;
      }
      await ctx.db.patch(existing._id, patch);
      return { linked: true, profileId: existing._id };
    }

    const profileId = await ctx.db.insert("profiles", {
      full_name: args.fullName,
      username: args.username,
      email: args.email,
      role: args.role || "creator",
      tier: "active",
      bio: "",
      is_founder: false,
      clerk_registered: true,
    });
    return { created: true, profileId };
  },
});

// Used by the Stripe webhook to update subscription state via customer ID
export const updateSubscriptionByCustomerId = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    subscriptionStatus: v.string(),
    subscriptionExpiresAt: v.optional(v.number()),
    accessState: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_stripe_customer", (q) => q.eq("stripe_customer_id", args.stripeCustomerId))
      .unique();
    if (!profile) return;
    const patch: Record<string, any> = { subscription_status: args.subscriptionStatus };
    if (args.subscriptionExpiresAt !== undefined) patch.subscription_expires_at = args.subscriptionExpiresAt;
    if (args.subscriptionStatus === "active") patch.access_state = "active";
    // Explicit access_state (e.g. "limited" for a hard-cancel) always wins.
    if (args.accessState !== undefined) patch.access_state = args.accessState;
    await ctx.db.patch(profile._id, patch);
  },
});

// Returns number of paid lifetime members (excludes free founders)
export const countLifetimeMembers = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("profiles").collect();
    return all.filter(p => p.is_lifetime === true).length;
  },
});

// Called by the Stripe webhook after a successful lifetime checkout
export const grantLifetimeAccess = internalMutation({
  args: {
    profileId: v.string(),
    lifetimeTier: v.string(),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const exists = await ctx.db.get(args.profileId as any);
    if (!exists) return;
    await ctx.db.patch(args.profileId as any, {
      is_lifetime: true,
      lifetime_tier: args.lifetimeTier,
      stripe_customer_id: args.stripeCustomerId,
    });
  },
});

// Used by the monthly cron to consume one free month for creators past their first collab
export const decrementFreeMonth = internalMutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db
      .query("profiles")
      .filter((q) =>
        q.and(
          q.eq(q.field("first_collab_completed"), true),
          q.gt(q.field("free_months_balance"), 0),
          q.neq(q.field("subscription_status"), "active")
        )
      )
      .collect();
    for (const p of profiles) {
      const newBalance = (p.free_months_balance ?? 1) - 1;
      await ctx.db.patch(p._id, { free_months_balance: newBalance });
    }
  },
});

export const markFirstCollabCompleted = mutation({
  args: { profileId: v.string() },
  handler: async (ctx, args) => {
    await requireOwnerOrAdmin(ctx, args.profileId);
    await ctx.db.patch(args.profileId as any, { first_collab_completed: true });
  },
});

// Request a role switch (creator → host or host → creator). Mirrors a fresh
// signup for the target role: details are collected, the account enters the
// admin verification queue, and the role only flips when an admin approves.
// Until then the user keeps their current role and access.
export const requestRoleSwitch = mutation({
  args: {
    profileId: v.string(),
    targetRole: v.union(v.literal("host"), v.literal("creator")),
    contact_email: v.optional(v.string()),
    // host details
    business_name: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    property_type: v.optional(v.string()),
    website_url: v.optional(v.string()),
    // creator details
    instagram_handle: v.optional(v.string()),
    tiktok_handle: v.optional(v.string()),
    portfolio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOwnerOrAdmin(ctx, args.profileId);
    const profile = await ctx.db.get(args.profileId as any);
    if (!profile) throw new Error("Profile not found.");
    if (profile.role === args.targetRole) throw new Error("You already have this role.");

    const patch: Record<string, any> = {
      pending_role: args.targetRole,
      role_switch_requested_at: Date.now(),
    };
    if (args.contact_email && args.contact_email !== profile.email) {
      patch.role_switch_email = args.contact_email;
    }
    if (args.city !== undefined) patch.city = cleanPlainText(args.city, 100);
    if (args.country !== undefined) patch.country = cleanPlainText(args.country, 100);
    if (args.targetRole === "creator") {
      if (args.instagram_handle !== undefined) patch.instagram_handle = cleanPlainText(args.instagram_handle, 60);
      if (args.tiktok_handle !== undefined) patch.tiktok_handle = cleanPlainText(args.tiktok_handle, 60);
      if (args.portfolio !== undefined) patch.portfolio = cleanOptionalUrl(args.portfolio, "Portfolio URL");
    }
    await ctx.db.patch(args.profileId as any, patch);

    const detailLines = args.targetRole === "host"
      ? `Business: ${args.business_name || "—"}\nCity: ${args.city || "—"}\nProperty type: ${args.property_type || "—"}\nWebsite: ${args.website_url || "—"}`
      : `Instagram: ${args.instagram_handle || "—"}\nTikTok: ${args.tiktok_handle || "—"}\nPortfolio: ${args.portfolio || "—"}`;
    await ctx.scheduler.runAfter(0, internal.email.sendAdminNotification, {
      type: "signup",
      subject: `Role switch request (${profile.role} → ${args.targetRole}): ${profile.full_name}`,
      body: `Name: ${profile.full_name}\nAccount email: ${profile.email}\nContact email: ${args.contact_email || profile.email}\nRequested role: ${args.targetRole}\n${detailLines}\n\nExisting account requested a role switch — approve in Admin → Users to activate the new role.`,
    });
    return { pending: true };
  },
});

export const updateProfile = mutation({
  args: {
    profileId: v.string(),
    updates: v.object({
      full_name: v.optional(v.string()),
      username: v.optional(v.string()),
      bio: v.optional(v.string()),
      avatar_url: v.optional(v.string()),
      banner_url: v.optional(v.string()),
      instagram_handle: v.optional(v.string()),
      tiktok_handle: v.optional(v.string()),
      youtube_handle: v.optional(v.string()),
      portfolio: v.optional(v.string()),
      city: v.optional(v.string()),
      region: v.optional(v.string()),
      country: v.optional(v.string()),
      role: v.optional(v.string()),
      niches: v.optional(v.array(v.string())),
      profile_visible: v.optional(v.boolean()),
      show_activity_to_hosts: v.optional(v.boolean()),
      notification_prefs: v.optional(v.object({
        messages: v.optional(v.boolean()),
        contractUpdates: v.optional(v.boolean()),
        newListings: v.optional(v.boolean()),
        collabReminders: v.optional(v.boolean()),
        marketing: v.optional(v.boolean()),
      })),
      preferred_language: v.optional(v.string()),
      preferred_currency: v.optional(v.string()),
      timezone: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { profileId, updates } = args;
    await requireOwnerOrAdmin(ctx, profileId);
    const exists = await ctx.db.get(profileId as any);
    if (!exists) return;
    const cleanUpdates: Record<string, any> = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    if (cleanUpdates.full_name !== undefined) cleanUpdates.full_name = cleanPlainText(cleanUpdates.full_name, 100);
    if (cleanUpdates.username !== undefined) cleanUpdates.username = cleanPlainText(cleanUpdates.username, 30);
    if (cleanUpdates.bio !== undefined) cleanUpdates.bio = cleanPlainText(cleanUpdates.bio, 1000);
    if (cleanUpdates.instagram_handle !== undefined) cleanUpdates.instagram_handle = cleanPlainText(cleanUpdates.instagram_handle, 60);
    if (cleanUpdates.tiktok_handle !== undefined) cleanUpdates.tiktok_handle = cleanPlainText(cleanUpdates.tiktok_handle, 60);
    if (cleanUpdates.youtube_handle !== undefined) cleanUpdates.youtube_handle = cleanPlainText(cleanUpdates.youtube_handle, 60);
    if (cleanUpdates.city !== undefined) cleanUpdates.city = cleanPlainText(cleanUpdates.city, 100);
    if (cleanUpdates.region !== undefined) cleanUpdates.region = cleanPlainText(cleanUpdates.region, 100);
    if (cleanUpdates.country !== undefined) cleanUpdates.country = cleanPlainText(cleanUpdates.country, 100);
    if (cleanUpdates.portfolio !== undefined) cleanUpdates.portfolio = cleanOptionalUrl(cleanUpdates.portfolio, "Portfolio URL");
    if (cleanUpdates.avatar_url !== undefined) cleanUpdates.avatar_url = cleanOptionalUrl(cleanUpdates.avatar_url, "Avatar URL");
    if (cleanUpdates.banner_url !== undefined) cleanUpdates.banner_url = cleanOptionalUrl(cleanUpdates.banner_url, "Banner URL");
    if (cleanUpdates.preferred_language !== undefined) cleanUpdates.preferred_language = cleanPlainText(cleanUpdates.preferred_language, 40);
    if (cleanUpdates.preferred_currency !== undefined) cleanUpdates.preferred_currency = cleanPlainText(cleanUpdates.preferred_currency, 10);
    if (cleanUpdates.timezone !== undefined) cleanUpdates.timezone = cleanPlainText(cleanUpdates.timezone, 60);
    await ctx.db.patch(profileId as any, cleanUpdates);
  },
});

// ─── Settings > Privacy > Blocked people ─────────────────────────────────────
// Blocking is symmetric: sendMessage checks both directions, so it doesn't
// matter which party's list holds the entry.
export const blockUser = mutation({
  args: { profileId: v.string(), targetId: v.string() },
  handler: async (ctx, args) => {
    await requireOwnerOrAdmin(ctx, args.profileId);
    if (args.targetId === args.profileId) throw new ConvexError("You can't block yourself.");
    const target = await ctx.db.get(args.targetId as any);
    if (!target) throw new ConvexError("That user doesn't exist.");
    const profile = await ctx.db.get(args.profileId as any);
    if (!profile) return;
    const current: string[] = (profile as any).blocked_user_ids ?? [];
    if (!current.includes(args.targetId)) {
      await ctx.db.patch(args.profileId as any, { blocked_user_ids: [...current, args.targetId] });
    }
  },
});

export const unblockUser = mutation({
  args: { profileId: v.string(), targetId: v.string() },
  handler: async (ctx, args) => {
    await requireOwnerOrAdmin(ctx, args.profileId);
    const profile = await ctx.db.get(args.profileId as any);
    if (!profile) return;
    const current: string[] = (profile as any).blocked_user_ids ?? [];
    await ctx.db.patch(args.profileId as any, { blocked_user_ids: current.filter((id) => id !== args.targetId) });
  },
});

// ─── Delete profile and all related records ─────────────────────────────────
export const deleteProfile = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    await requireOwnerOrAdmin(ctx, args.profileId);
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return { deleted: false, reason: "Profile not found" };

    const pId = String(args.profileId);
    const email = profile.email;

    // Delete pitch counts
    const pitchCounts = await ctx.db.query("pitch_counts").withIndex("by_user", (q) => q.eq("user_id", pId)).collect();
    await Promise.all(pitchCounts.map((c) => ctx.db.delete(c._id)));

    // Delete collaborations
    const collabs = await ctx.db.query("collaborations").filter((q) => q.eq(q.field("creator_id"), pId)).collect();
    await Promise.all(collabs.map((c) => ctx.db.delete(c._id)));

    // Delete collections
    const collections = await ctx.db.query("collections").filter((q) => q.eq(q.field("creator_id"), pId)).collect();
    await Promise.all(collections.map((c) => ctx.db.delete(c._id)));

    // Delete referral codes owned by this user
    const refCodes = await ctx.db.query("referral_codes").filter((q) => q.eq(q.field("owner_id"), pId)).collect();
    const codeIds = refCodes.map((rc) => rc.code);
    await Promise.all(refCodes.map((rc) => ctx.db.delete(rc._id)));

    // Delete referral uses where this user was the referrer or the used_by
    const refUses = await ctx.db.query("referral_uses").filter((q) =>
      q.or(q.eq(q.field("referrer_id"), pId), q.eq(q.field("used_by_id"), pId))
    ).collect();
    await Promise.all(refUses.map((ru) => ctx.db.delete(ru._id)));

    // Delete suggestion votes by this user
    const votes = await ctx.db.query("suggestion_votes").filter((q) => q.eq(q.field("user_id"), pId)).collect();
    await Promise.all(votes.map((v) => ctx.db.delete(v._id)));

    // If the user submitted suggestions, orphan them (set submitted_by to null)
    const suggestions = await ctx.db.query("suggestions").filter((q) => q.eq(q.field("submitted_by"), pId)).collect();
    await Promise.all(suggestions.map((s) => ctx.db.patch(s._id, { submitted_by: undefined })));

    // Delete listings owned by this user (if host)
    const listings = await ctx.db.query("listings").withIndex("by_host", (q) => q.eq("host_id", pId)).collect();
    await Promise.all(listings.map((l) => ctx.db.delete(l._id)));

    // Anonymize messages from this user
    if (email) {
      const messages = await ctx.db.query("messages").collect();
      const userMessages = messages.filter((m) => m.email === email);
      await Promise.all(
        userMessages.map((m) =>
          ctx.db.patch(m._id, { name: "[deleted]", email: "[deleted]", message: "[deleted by admin]" })
        )
      );
    }

    // Finally delete the profile itself
    await ctx.db.delete(args.profileId);

    return { deleted: true, email };
  },
});

// ─── Delete account + free the Clerk user so the email can be reused ─────────
// Runs the full Convex cascade (deleteProfile), then deletes the matching Clerk
// user by email. If CLERK_SECRET_KEY is unset or Clerk errors, the Convex delete
// still succeeds — the email is simply left for manual cleanup in Clerk.
export const deleteAccount = action({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args): Promise<{ deleted: boolean; email?: string; reason?: string }> => {
    const res: { deleted: boolean; email?: string; reason?: string } =
      await ctx.runMutation(api.profiles.deleteProfile, { profileId: args.profileId });

    const key = process.env.CLERK_SECRET_KEY;
    if (key && res.deleted && res.email) {
      try {
        const listRes = await fetch(
          `https://api.clerk.com/v1/users?email_address[]=${encodeURIComponent(res.email)}`,
          { headers: { Authorization: `Bearer ${key}` } },
        );
        const users = (await listRes.json()) as Array<{ id: string }>;
        for (const u of users ?? []) {
          await fetch(`https://api.clerk.com/v1/users/${u.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${key}` },
          });
        }
      } catch (err) {
        console.error("Clerk user deletion failed for", res.email, err);
      }
    }

    return res;
  },
});

export const updateMetrics = mutation({
  args: {
    profileId: v.string(),
    instagram: v.optional(v.number()),
    tiktok: v.optional(v.number()),
    youtube: v.optional(v.number()),
    avg_views: v.optional(v.number()),
    avg_likes: v.optional(v.number()),
    avg_comments: v.optional(v.number()),
  },
  handler: async (ctx, { profileId, instagram, tiktok, youtube, avg_views, avg_likes, avg_comments }) => {
    await requireOwnerOrAdmin(ctx, profileId);
    const profile = await ctx.db.get(profileId as any);
    if (!profile) return;
    if (profile.metrics_updated_at && Date.now() - profile.metrics_updated_at < 30 * 24 * 60 * 60 * 1000) {
      throw new Error("Metrics can only be updated once every 30 days.");
    }
    const totalFollowers = (instagram ?? 0) + (tiktok ?? 0) + (youtube ?? 0);
    const er =
      avg_views && avg_views > 0
        ? parseFloat((((avg_likes ?? 0) + (avg_comments ?? 0)) / avg_views * 100).toFixed(1))
        : undefined;
    const patch: Record<string, any> = {
      metrics_instagram_followers: instagram,
      metrics_tiktok_followers: tiktok,
      metrics_youtube_subscribers: youtube,
      metrics_avg_views: avg_views,
      metrics_avg_likes: avg_likes,
      metrics_avg_comments: avg_comments,
      metrics_updated_at: Date.now(),
    };
    if (totalFollowers > 0) patch.follower_count = totalFollowers;
    if (er !== undefined) patch.engagement_rate = er;
    await ctx.db.patch(profileId as any, patch);
  },
});

export const checkMetricsReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDays     = 30 * 24 * 60 * 60 * 1000;
    const thirtySevenDays = 37 * 24 * 60 * 60 * 1000;
    const profiles = await ctx.db.query("profiles").collect();
    for (const p of profiles) {
      if (p.role !== 'creator') continue;
      if (!p.metrics_updated_at) continue;
      const age = now - p.metrics_updated_at;
      if (age < thirtyDays || age > thirtySevenDays) continue;
      await ctx.db.insert("notifications", {
        user_id: String(p._id),
        type: 'metrics_reminder',
        title: 'Time to update your metrics',
        body: 'Your audience stats are over 30 days old. Keep them fresh so hosts can find you.',
        link: '/#/profile',
        read: false,
        created_at: now,
      });
    }
  },
});

export const toggleSavedCreator = mutation({
  args: { profileId: v.id("profiles"), creatorId: v.string() },
  handler: async (ctx, { profileId, creatorId }) => {
    await requireOwnerOrAdmin(ctx, profileId);
    const profile = await ctx.db.get(profileId);
    if (!profile) return [];
    const current = profile.saved_creator_ids ?? [];
    const next = current.includes(creatorId)
      ? current.filter((id) => id !== creatorId)
      : [...current, creatorId];
    await ctx.db.patch(profileId, { saved_creator_ids: next });
    return next;
  },
});

// Creator toggles their own discoverability on/off from profile settings.
export const setProfileVisibility = mutation({
  args: { profileId: v.id("profiles"), visible: v.boolean() },
  handler: async (ctx, { profileId, visible }) => {
    await requireOwnerOrAdmin(ctx, profileId);
    await ctx.db.patch(profileId, { profile_visible: visible });
    return visible;
  },
});

function deriveCreatorTier(followers: number): string {
  if (followers >= 50000) return "Influencer";
  if (followers >= 10000) return "Micro Influencer";
  if (followers >= 5000) return "UGC Pro";
  return "UGC Beginner";
}

// Real, verified, opted-in creators for the host-facing Creators page. Shaped
// to match the mock CREATORS cards so the frontend can merge them directly.
export const listPublicCreators = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("profiles").collect();
    const creators = all.filter(
      (p) =>
        p.role === "creator" &&
        p.is_verified === true &&
        p.is_rejected !== true &&
        p.profile_visible !== false
    );

    // Completed-vs-total collab counts, used by creatorScore.js to rank
    // creators by success rate. Computed live rather than stored so it never
    // drifts from the collaborations table.
    const collabStats = await Promise.all(
      creators.map(async (p) => {
        const collabs = await ctx.db
          .query("collaborations")
          .withIndex("by_creator", (q) => q.eq("creator_id", String(p._id)))
          .collect();
        const real = collabs.filter((c) => c.is_sample !== true);
        const completed = real.filter(
          (c) => c.status === "completed" || c.status === "approved"
        ).length;
        return { total: real.length, completed };
      })
    );

    return creators
      .map((p, i) => {
        const followers = p.follower_count ?? 0;
        const platforms: string[] = [];
        if (p.instagram_handle) platforms.push("Instagram");
        if (p.tiktok_handle) platforms.push("TikTok");
        if (p.youtube_handle) platforms.push("YouTube");
        const location =
          [p.city, p.region].filter(Boolean).join(", ") || p.country || "";
        return {
          id: String(p._id),
          name: p.full_name,
          username: p.username,
          tier: p.tier || deriveCreatorTier(followers),
          avatar: p.avatar_url ?? null,
          followers,
          engagement: p.engagement_rate ?? 0,
          collab_count: p.collab_count ?? 0,
          completed_collab_count: collabStats[i].completed,
          total_collab_count: collabStats[i].total,
          location,
          city: p.city ?? null,
          region: p.region ?? null,
          country: p.country ?? null,
          lat: null,
          lng: null,
          platforms,
          niches: p.niches ?? [],
          isFounder: p.is_founder === true,
          isSample: false,
          avg_reach_30d: p.metrics_avg_views ?? followers,
          er_30d: p.engagement_rate ?? 0,
          past_collab: false,
          bio: p.bio ?? "",
          portfolioUrl: p.portfolio ?? null,
          instagram_handle: p.instagram_handle ?? null,
          tiktok_handle: p.tiktok_handle ?? null,
          youtube_handle: p.youtube_handle ?? null,
          travelCalendar: [],
          created_at: p._creationTime,
        };
      })
      .sort((a, b) => b.created_at - a.created_at);
  },
});

// ─── "Collabnb Admin" brand messaging persona ─────────────────────────────────
// A dedicated profile record that admin messages are sent from. Recipients see
// "Collabnb" + the logo as the sender. Idempotent — safe to call on every admin
// dashboard mount.
export const ensureAdminPersona = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("profiles").collect();
    const existing = all.find((p) => p.username === "collabnb");
    if (existing) return String(existing._id);
    const id = await ctx.db.insert("profiles", {
      full_name: "Collabnb",
      username: "collabnb",
      email: "admin@collabnb.com",
      role: "admin",
      tier: "Admin",
      bio: "The Collabnb team. Here to help you get the most out of the platform.",
      avatar_url: "/assets/collabnb-logo.png",
      is_admin: true,
      is_verified: true,
      is_founder: true,
      beta: true,
      profile_visible: false,
      city: "Asheville",
      region: "NC",
    });
    return String(id);
  },
});

export const getAdminPersona = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("profiles").collect();
    const p = all.find((row) => row.username === "collabnb");
    if (!p) return null;
    return {
      _id: String(p._id),
      full_name: p.full_name,
      username: p.username,
      avatar_url: p.avatar_url ?? null,
      role: p.role,
    };
  },
});

// Verified, non-rejected, non-admin users the admin can welcome via inbox.
export const listMessagable = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("profiles").collect();
    return all
      .filter(
        (p) =>
          p.is_verified === true &&
          p.is_rejected !== true &&
          p.is_admin !== true &&
          p.username !== "collabnb"
      )
      .map((p) => ({
        _id: String(p._id),
        full_name: p.full_name,
        username: p.username,
        avatar_url: p.avatar_url ?? null,
        role: p.role,
        city: p.city ?? "",
        is_founder: p.is_founder === true,
        created_at: p._creationTime,
      }))
      .sort((a, b) => a.created_at - b.created_at);
  },
});
