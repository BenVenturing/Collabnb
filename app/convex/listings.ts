import { v } from "convex/values";
import { query } from "./_generated/server";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("listings").collect();
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("listings")
      .filter((q) => q.eq(q.field("_id"), args.id))
      .first();
  },
});

export const getByLocation = query({
  args: { location: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("listings")
      .withIndex("by_location", (q) => q.eq("location", args.location))
      .collect();
  },
});
