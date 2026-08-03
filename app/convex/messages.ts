import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { redactText } from "./lib/moderation";
import { requireAdmin, canAccessAdmin, isSelfEmailOrAdmin } from "./lib/auth";
import { cleanPlainText } from "./lib/sanitize";
import { enforceRateLimit, RATE_LIMITS } from "./lib/rateLimit";

export const submitMessage = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    category: v.optional(v.string()),
    message: v.string(),
    add_to_faq: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await enforceRateLimit(ctx, `contact:${args.email.toLowerCase()}`, RATE_LIMITS.CONTACT_MESSAGE);
    const cleanMessage = cleanPlainText(redactText(args.message), 5000);
    await ctx.db.insert("messages", {
      name: cleanPlainText(redactText(args.name), 100),
      email: args.email,
      category: args.category ? cleanPlainText(args.category, 50) : args.category,
      message: cleanMessage,
      is_read: false,
      is_archived: false,
      add_to_faq: args.add_to_faq,
    });

    await ctx.scheduler.runAfter(0, internal.email.sendAdminNotification, {
      type: "message",
      subject: args.add_to_faq ? `New Help Center question from ${args.name}` : `New message from ${args.name}`,
      body: `From: ${args.name} <${args.email}>\nCategory: ${args.category || "General"}\n${args.add_to_faq ? "This question is already live in the public FAQ awaiting your answer.\n" : ""}\n${cleanMessage}\n\nView in admin: https://collabnb.com/#/admin`,
    });
  },
});

// Public: questions submitted via "no FAQ match" — shown live in the Help Center,
// answered in place once an admin replies. No email/name exposed.
export const getFaqQuestions = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("messages").collect();
    return all
      .filter((m) => m.add_to_faq && !m.is_archived)
      .sort((a, b) => b._creationTime - a._creationTime)
      .map((m) => ({
        _id: m._id,
        question: m.message,
        answer: m.admin_reply || null,
        answered_at: m.admin_reply_at || null,
        _creationTime: m._creationTime,
      }));
  },
});

export const getMessages = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return [];
    const all = await ctx.db.query("messages").collect();
    return all
      .filter((m) => !m.is_archived)
      .sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const getArchivedMessages = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return [];
    const all = await ctx.db.query("messages").collect();
    return all
      .filter((m) => m.is_archived)
      .sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return 0;
    const all = await ctx.db.query("messages").collect();
    return all.filter((m) => !m.is_read && !m.is_archived).length;
  },
});

export const toggleRead = mutation({
  args: { messageId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const msg = await ctx.db.get(args.messageId as any);
    if (!msg) return;
    await ctx.db.patch(args.messageId as any, { is_read: !msg.is_read });
  },
});

export const archiveMessage = mutation({
  args: { messageId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.messageId as any, { is_archived: true, is_read: true });
  },
});

export const unarchiveMessage = mutation({
  args: { messageId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.messageId as any, { is_archived: false });
  },
});

export const addAdminReply = mutation({
  args: { messageId: v.string(), reply: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.messageId as any, {
      admin_reply: cleanPlainText(redactText(args.reply.trim()), 5000),
      admin_reply_at: Date.now(),
      is_read: true,
    });
  },
});

export const getMessagesByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    if (!(await isSelfEmailOrAdmin(ctx, args.email))) return [];
    const all = await ctx.db.query("messages").collect();
    return all
      .filter((m) => m.email.toLowerCase() === args.email.toLowerCase())
      .sort((a, b) => b._creationTime - a._creationTime);
  },
});
