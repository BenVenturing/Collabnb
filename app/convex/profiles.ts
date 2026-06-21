import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (existing) {
      const adminPatch: Record<string, any> = { clerk_registered: true };
      if (args.is_admin) {
        adminPatch.is_admin = true;
        adminPatch.is_verified = true;
        adminPatch.tier = 'UGC Pro';
        adminPatch.is_founder = true;
        adminPatch.beta = true;
      }
      if (!existing.clerk_registered || args.is_admin) {
        await ctx.db.patch(existing._id, adminPatch);
      }
      return await ctx.db.get(existing._id);
    }

    const username = args.email.split('@')[0].replace(/[^a-z0-9_]/gi, '').toLowerCase() || 'user';

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
      email: args.email,
      full_name: args.full_name || args.email.split('@')[0],
      username,
      role: 'creator',
      tier: args.is_admin ? 'UGC Pro' : 'waitlist',
      is_verified: args.is_admin ? true : false,
      is_founder: args.is_admin ? true : undefined,
      is_admin: args.is_admin ? true : undefined,
      beta: args.is_admin ? true : undefined,
      avatar_url: args.avatar_url,
      referral_code: refCode || undefined,
      clerk_registered: true,
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
    await ctx.db.patch(args.profileId as any, { is_founder: args.isFounder });
  },
});

export const getUnverified = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("profiles").collect();
    return all.filter(p => p.is_verified !== true && p.is_rejected !== true);
  },
});

export const getRejected = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("profiles").collect();
    return all.filter(p => p.is_rejected === true);
  },
});

export const approveProfile = mutation({
  args: {
    profileId: v.string(),
  },
  handler: async (ctx, args) => {
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

export const updateSubscription = mutation({
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
    await ctx.db.patch(args.profileId as any, patch);
  },
});

// Used by the Stripe webhook to update subscription state via customer ID
export const updateSubscriptionByCustomerId = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    subscriptionStatus: v.string(),
    subscriptionExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_stripe_customer", (q) => q.eq("stripe_customer_id", args.stripeCustomerId))
      .unique();
    if (!profile) return;
    const patch: Record<string, any> = { subscription_status: args.subscriptionStatus };
    if (args.subscriptionExpiresAt !== undefined) patch.subscription_expires_at = args.subscriptionExpiresAt;
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
    await ctx.db.patch(args.profileId as any, { first_collab_completed: true });
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
    }),
  },
  handler: async (ctx, args) => {
    const { profileId, updates } = args;
    const exists = await ctx.db.get(profileId as any);
    if (!exists) return;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(profileId as any, cleanUpdates);
  },
});

// ─── Delete profile and all related records ─────────────────────────────────
export const deleteProfile = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
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

    return { deleted: true };
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
