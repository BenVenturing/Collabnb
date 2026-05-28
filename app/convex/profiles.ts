import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

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
