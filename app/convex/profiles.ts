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
