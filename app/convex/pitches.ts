import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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
    listingTitle: v.optional(v.string()),
    hostId: v.optional(v.string()),
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
    threadKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Prevent duplicate applications (same creator + listing)
    const existing = await ctx.db
      .query("pitches")
      .withIndex("by_listing", (q) => q.eq("listing_id", args.listingId))
      .filter((q) => q.eq(q.field("creator_id"), args.creatorId))
      .first();
    if (existing) return existing._id;

    const id = await ctx.db.insert("pitches", {
      listing_id: args.listingId,
      listing_title: args.listingTitle,
      host_id: args.hostId,
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
      thread_key: args.threadKey,
    });

    // Notify host of new application
    if (args.hostId && args.hostId !== args.creatorId) {
      await ctx.runMutation(internal.notifications.create, {
        userId: args.hostId,
        type: "new_application",
        title: `New application from ${args.creatorName}`,
        body: args.message.length > 80 ? args.message.slice(0, 80) + "…" : args.message,
        link: "#/host/proposals",
      });
    }

    return id;
  },
});

export const getByHost = query({
  args: { hostId: v.string() },
  handler: async (ctx, { hostId }) => {
    // Primary: pitches that already have host_id stamped
    const byHostId = await ctx.db
      .query("pitches")
      .withIndex("by_host", (q) => q.eq("host_id", hostId))
      .order("desc")
      .collect();

    // Fallback: find pitches via the host's listings (covers seeded/imported listings
    // that were created before host_id was stamped on the listing itself)
    const hostListings = await ctx.db
      .query("listings")
      .withIndex("by_host", (q) => q.eq("host_id", hostId))
      .collect();

    if (hostListings.length === 0) return byHostId;

    const seen = new Set(byHostId.map((p) => String(p._id)));
    const extra: (typeof byHostId[0])[] = [];

    for (const listing of hostListings) {
      const pitches = await ctx.db
        .query("pitches")
        .withIndex("by_listing", (q) => q.eq("listing_id", String(listing._id)))
        .order("desc")
        .collect();
      pitches.forEach((p) => {
        if (!seen.has(String(p._id))) { seen.add(String(p._id)); extra.push(p); }
      });
    }

    return [...byHostId, ...extra].sort((a, b) => b.created_at - a.created_at);
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

    const pitch = await ctx.db.get(id);
    if (!pitch) return;

    if (status === "approved" || status === "declined") {
      const title = status === "approved"
        ? `Your application was approved!`
        : `Application update for ${pitch.listing_title || "your listing"}`;
      const body = status === "approved"
        ? `Congrats! Your pitch for "${pitch.listing_title || "a listing"}" was accepted.`
        : hostNote || "Your application wasn't selected this time.";
      await ctx.runMutation(internal.notifications.create, {
        userId: pitch.creator_id,
        type: status === "approved" ? "pitch_approved" : "pitch_declined",
        title,
        body,
        link: "#/collabs",
      });
    }
  },
});
