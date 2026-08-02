import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireOwnerOrAdmin, canAccessOwner } from "./lib/auth";

export const getForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    if (!(await canAccessOwner(ctx, userId))) return [];
    return ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .order("desc")
      .take(30);
  },
});

export const getUnreadCount = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    if (!(await canAccessOwner(ctx, userId))) return 0;
    const all = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .collect();
    return all.filter((n) => !n.read).length;
  },
});

export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, { id }) => {
    const notif = await ctx.db.get(id);
    if (!notif) return;
    await requireOwnerOrAdmin(ctx, notif.user_id);
    await ctx.db.patch(id, { read: true });
  },
});

export const markAllRead = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    await requireOwnerOrAdmin(ctx, userId);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .collect();
    await Promise.all(
      unread.filter((n) => !n.read).map((n) => ctx.db.patch(n._id, { read: true }))
    );
  },
});

export const clearAll = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    await requireOwnerOrAdmin(ctx, userId);
    const all = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .collect();
    await Promise.all(all.map((n) => ctx.db.delete(n._id)));
  },
});

export const create = internalMutation({
  args: {
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    body: v.optional(v.string()),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      user_id: args.userId,
      type: args.type,
      title: args.title,
      body: args.body,
      link: args.link,
      read: false,
      created_at: Date.now(),
    });
  },
});
