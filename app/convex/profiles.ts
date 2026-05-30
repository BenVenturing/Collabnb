import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
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
    if (existing) return existing;

    const username = args.email.split('@')[0].replace(/[^a-z0-9_]/gi, '').toLowerCase() || 'user';
    const profileId = await ctx.db.insert("profiles", {
      email: args.email,
      full_name: args.full_name || args.email.split('@')[0],
      username,
      role: 'creator',
      tier: args.is_admin ? 'UGC Pro' : 'waitlist',
      is_verified: args.is_admin ? true : false,
      is_founder: args.is_admin ? true : undefined,
      beta: args.is_admin ? true : undefined,
      avatar_url: args.avatar_url,
    });
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
    isFounder: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.profileId as any, {
      is_verified: true,
      is_founder: args.isFounder,
    });
    const profile = await ctx.db.get(args.profileId as any);
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

export const updateSubscription = mutation({
  args: {
    profileId: v.string(),
    subscriptionStatus: v.string(),
    subscriptionTier: v.optional(v.string()),
    subscriptionExpiresAt: v.optional(v.number()),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, any> = {
      subscription_status: args.subscriptionStatus,
    };
    if (args.subscriptionTier !== undefined) patch.subscription_tier = args.subscriptionTier;
    if (args.subscriptionExpiresAt !== undefined) patch.subscription_expires_at = args.subscriptionExpiresAt;
    if (args.stripeCustomerId !== undefined) patch.stripe_customer_id = args.stripeCustomerId;
    await ctx.db.patch(args.profileId as any, patch);
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
      instagram_handle: v.optional(v.string()),
      tiktok_handle: v.optional(v.string()),
      youtube_handle: v.optional(v.string()),
      portfolio: v.optional(v.string()),
      city: v.optional(v.string()),
      region: v.optional(v.string()),
      role: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { profileId, updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(profileId as any, cleanUpdates);
  },
});
