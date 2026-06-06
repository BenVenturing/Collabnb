import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getByUser = query({
  args: { creatorId: v.string() },
  handler: async (ctx, { creatorId }) => {
    return await ctx.db
      .query("collections")
      .withIndex("by_creator", (q) => q.eq("creator_id", creatorId))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    creatorId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("collections", {
      name: args.name,
      listing_ids: [],
      creator_id: args.creatorId,
    });
  },
});

export const toggleSave = mutation({
  args: {
    collectionId: v.string(),
    listingId: v.string(),
  },
  handler: async (ctx, args) => {
    const collection = await ctx.db
      .query("collections")
      .filter((q) => q.eq(q.field("_id"), args.collectionId))
      .first();
    if (!collection) return;

    const ids = collection.listing_ids;
    const idx = ids.indexOf(args.listingId);
    const updatedIds = idx >= 0
      ? ids.filter((id) => id !== args.listingId)
      : [...ids, args.listingId];

    await ctx.db.patch(collection._id, { listing_ids: updatedIds });
  },
});

export const rename = mutation({
  args: {
    id: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id as any, { name: args.name });
  },
});

export const deleteCollection = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id as any);
  },
});

export const moveToListing = mutation({
  args: {
    listingId: v.string(),
    targetCollectionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Remove from all collections
    const all = await ctx.db.query("collections").collect();
    for (const col of all) {
      const idx = col.listing_ids.indexOf(args.listingId);
      if (idx >= 0) {
        await ctx.db.patch(col._id, {
          listing_ids: col.listing_ids.filter((id) => id !== args.listingId),
        });
      }
    }
    // Add to target
    const targetCollection = await ctx.db
      .query("collections")
      .filter((q) => q.eq(q.field("_id"), args.targetCollectionId))
      .first();
    if (targetCollection) {
      await ctx.db.patch(targetCollection._id, {
        listing_ids: [...targetCollection.listing_ids, args.listingId],
      });
    }
  },
});
