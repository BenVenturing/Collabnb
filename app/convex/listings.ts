import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

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

export const getByHost = query({
  args: { host_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("listings")
      .withIndex("by_host", (q) => q.eq("host_id", args.host_id))
      .collect();
  },
});

export const search = query({
  args: {
    location: v.optional(v.string()),
    collab_type: v.optional(v.string()),
    property_type: v.optional(v.string()),
    creator_tier: v.optional(v.string()),
    is_featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let listings = await ctx.db.query("listings").collect();

    if (args.location) {
      const q = args.location.toLowerCase();
      listings = listings.filter(
        (l) =>
          l.location.toLowerCase().includes(q) ||
          l.location_full?.toLowerCase().includes(q)
      );
    }
    if (args.collab_type) {
      const q = args.collab_type.toLowerCase();
      listings = listings.filter(
        (l) => l.collab_type?.toLowerCase().includes(q)
      );
    }
    if (args.property_type) {
      const q = args.property_type.toLowerCase();
      listings = listings.filter(
        (l) => l.property_type?.toLowerCase().includes(q)
      );
    }
    if (args.creator_tier) {
      listings = listings.filter(
        (l) => l.creator_tier === args.creator_tier
      );
    }
    if (args.is_featured !== undefined) {
      listings = listings.filter((l) => l.is_featured === args.is_featured);
    }

    return listings;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    location: v.string(),
    host_id: v.optional(v.string()),
    host_name: v.optional(v.string()),
    status: v.optional(v.string()),
    location_city: v.optional(v.string()),
    location_country: v.optional(v.string()),
    property_url: v.optional(v.string()),
    collaboration_brief: v.optional(v.string()),
    compensation_type: v.optional(v.string()),
    cash_amount: v.optional(v.number()),
    nights: v.optional(v.number()),
    creator_tier: v.optional(v.string()),
    deliverable_load: v.optional(v.string()),
    image: v.optional(v.string()),
    gallery_images: v.optional(v.array(v.string())),
    perks: v.optional(v.array(v.string())),
    vibe_tags: v.optional(v.array(v.string())),
    affiliate_code: v.optional(v.string()),
    collab_start: v.optional(v.string()),
    collab_end: v.optional(v.string()),
    turnaround_days: v.optional(v.number()),
    deliverables_list: v.optional(v.array(v.object({
      type: v.string(),
      quantity: v.number(),
      description: v.string(),
    }))),
    deliverable_count: v.optional(v.number()),
    revision_policy: v.optional(v.string()),
    usage_rights: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("listings", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("listings"),
    title: v.optional(v.string()),
    location: v.optional(v.string()),
    status: v.optional(v.string()),
    location_city: v.optional(v.string()),
    location_country: v.optional(v.string()),
    property_url: v.optional(v.string()),
    collaboration_brief: v.optional(v.string()),
    compensation_type: v.optional(v.string()),
    cash_amount: v.optional(v.number()),
    nights: v.optional(v.number()),
    creator_tier: v.optional(v.string()),
    deliverable_load: v.optional(v.string()),
    image: v.optional(v.string()),
    gallery_images: v.optional(v.array(v.string())),
    perks: v.optional(v.array(v.string())),
    vibe_tags: v.optional(v.array(v.string())),
    affiliate_code: v.optional(v.string()),
    collab_start: v.optional(v.string()),
    collab_end: v.optional(v.string()),
    turnaround_days: v.optional(v.number()),
    deliverables_list: v.optional(v.array(v.object({
      type: v.string(),
      quantity: v.number(),
      description: v.string(),
    }))),
    deliverable_count: v.optional(v.number()),
    revision_policy: v.optional(v.string()),
    usage_rights: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const deleteListing = mutation({
  args: { id: v.id("listings") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
