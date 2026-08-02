import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthedProfile } from "./lib/auth";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuthedProfile(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getImageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getImageUrls = query({
  args: { storageIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    return await Promise.all(
      args.storageIds.map(async (id) => {
        if (id.startsWith("http")) return id;
        try { return await ctx.storage.getUrl(id); } catch { return null; }
      })
    );
  },
});

export const getStorageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
