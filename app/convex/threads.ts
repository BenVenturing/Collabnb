import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getByUser = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("threads").collect();
  },
});

export const create = mutation({
  args: {
    listingTitle: v.string(),
    hostName: v.string(),
    hostAvatar: v.optional(v.string()),
    tag: v.string(),
    lastMessage: v.string(),
    collabId: v.optional(v.string()),
    isFounder: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("threads", {
      listing_title: args.listingTitle,
      host_name: args.hostName,
      host_avatar: args.hostAvatar,
      tag: args.tag,
      last_message: args.lastMessage,
      timestamp: "Just now",
      unread: 0,
      is_founder: args.isFounder,
      collab_id: args.collabId,
    });
  },
});

export const updateTag = mutation({
  args: {
    id: v.string(),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id as any, { tag: args.tag });
  },
});
