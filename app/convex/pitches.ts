import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const checkAndIncrement = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const monthKey = currentMonthKey();
    const existing = await ctx.db
      .query("pitch_counts")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .first();

    if (!existing) {
      await ctx.db.insert("pitch_counts", { user_id: userId, month_key: monthKey, count: 1 });
      return { allowed: true, count: 1 };
    }

    if (existing.month_key !== monthKey) {
      await ctx.db.patch(existing._id, { month_key: monthKey, count: 1 });
      return { allowed: true, count: 1 };
    }

    if (existing.count >= 10) {
      return { allowed: false, count: existing.count };
    }

    const count = existing.count + 1;
    await ctx.db.patch(existing._id, { count });
    return { allowed: true, count };
  },
});

export const getCount = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const monthKey = currentMonthKey();
    const existing = await ctx.db
      .query("pitch_counts")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .first();

    if (!existing || existing.month_key !== monthKey) return 0;
    return existing.count;
  },
});

export const create = mutation({
  args: {
    listingId: v.string(),
    creatorId: v.string(),
    creatorName: v.string(),
    creatorUsername: v.optional(v.string()),
    creatorAvatar: v.optional(v.string()),
    creatorTier: v.optional(v.string()),
    creatorFollowers: v.optional(v.number()),
    creatorEngagement: v.optional(v.number()),
    creatorPlatforms: v.optional(v.array(v.string())),
    message: v.string(),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Fetch listing to get host_id and title
    const listing = await ctx.db
      .query("listings")
      .filter((q) => q.eq(q.field("_id"), args.listingId))
      .first();

    // Check for duplicate (same creator + listing)
    const existing = await ctx.db
      .query("pitches")
      .withIndex("by_listing", (q) => q.eq("listing_id", args.listingId))
      .filter((q) => q.eq(q.field("creator_id"), args.creatorId))
      .first();
    if (existing) return existing._id;

    const id = await ctx.db.insert("pitches", {
      listing_id: args.listingId,
      listing_title: listing?.title,
      host_id: listing?.host_id ?? undefined,
      creator_id: args.creatorId,
      creator_name: args.creatorName,
      creator_username: args.creatorUsername,
      creator_avatar: args.creatorAvatar,
      creator_tier: args.creatorTier,
      creator_followers: args.creatorFollowers,
      creator_engagement: args.creatorEngagement,
      creator_platforms: args.creatorPlatforms,
      message: args.message,
      status: "pending",
      type: args.type ?? "application",
      created_at: Date.now(),
    });
    return id;
  },
});

export const getByHost = query({
  args: { hostId: v.string() },
  handler: async (ctx, { hostId }) => {
    return ctx.db
      .query("pitches")
      .withIndex("by_host", (q) => q.eq("host_id", hostId))
      .order("desc")
      .collect();
  },
});

export const getByListing = query({
  args: { listingId: v.string() },
  handler: async (ctx, { listingId }) => {
    return ctx.db
      .query("pitches")
      .withIndex("by_listing", (q) => q.eq("listing_id", listingId))
      .order("desc")
      .collect();
  },
});

export const getByCreator = query({
  args: { creatorId: v.string() },
  handler: async (ctx, { creatorId }) => {
    return ctx.db
      .query("pitches")
      .withIndex("by_creator", (q) => q.eq("creator_id", creatorId))
      .order("desc")
      .collect();
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("pitches"),
    status: v.string(),
    hostNote: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, hostNote }) => {
    const updates: Record<string, unknown> = { status };
    if (hostNote !== undefined) updates.host_note = hostNote;
    await ctx.db.patch(id, updates);
  },
});
