import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const submitMessage = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    category: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      name: args.name,
      email: args.email,
      category: args.category,
      message: args.message,
      is_read: false,
      is_archived: false,
    });

    await ctx.scheduler.runAfter(0, internal.email.sendAdminNotification, {
      type: "message",
      subject: `New message from ${args.name}`,
      body: `From: ${args.name} <${args.email}>\nCategory: ${args.category || "General"}\n\n${args.message}\n\nView in admin: https://collabnb.com/#/admin`,
    });
  },
});

export const getMessages = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("messages").collect();
    return all
      .filter((m) => !m.is_archived)
      .sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const getArchivedMessages = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("messages").collect();
    return all
      .filter((m) => m.is_archived)
      .sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("messages").collect();
    return all.filter((m) => !m.is_read && !m.is_archived).length;
  },
});

export const toggleRead = mutation({
  args: { messageId: v.string() },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId as any);
    if (!msg) return;
    await ctx.db.patch(args.messageId as any, { is_read: !msg.is_read });
  },
});

export const archiveMessage = mutation({
  args: { messageId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId as any, { is_archived: true, is_read: true });
  },
});

export const unarchiveMessage = mutation({
  args: { messageId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId as any, { is_archived: false });
  },
});

export const addAdminReply = mutation({
  args: { messageId: v.string(), reply: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId as any, {
      admin_reply: args.reply.trim(),
      admin_reply_at: Date.now(),
      is_read: true,
    });
  },
});

export const getMessagesByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("messages").collect();
    return all
      .filter((m) => m.email.toLowerCase() === args.email.toLowerCase())
      .sort((a, b) => b._creationTime - a._creationTime);
  },
});
