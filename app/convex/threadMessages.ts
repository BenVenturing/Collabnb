import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const getByThread = query({
  args: { threadKey: v.string() },
  handler: async (ctx, { threadKey }) => {
    return ctx.db
      .query("thread_messages")
      .withIndex("by_thread", (q) => q.eq("thread_key", threadKey))
      .order("asc")
      .collect();
  },
});

// Returns how many of the given thread_keys have a creator message as the last message
// (i.e. threads the host hasn't replied to yet — a reasonable proxy for "unread")
export const getHostUnreadCount = query({
  args: { threadKeys: v.array(v.string()) },
  handler: async (ctx, { threadKeys }) => {
    if (threadKeys.length === 0) return 0;
    const latestMessages = await Promise.all(
      threadKeys.map((key) =>
        ctx.db
          .query("thread_messages")
          .withIndex("by_thread", (q) => q.eq("thread_key", key))
          .order("desc")
          .take(1)
          .then((msgs) => msgs[0] ?? null)
      )
    );
    return latestMessages.filter((m) => m?.sender_role === "creator").length;
  },
});

export const sendMessage = mutation({
  args: {
    threadKey: v.string(),
    senderId: v.string(),
    senderName: v.string(),
    senderAvatar: v.optional(v.string()),
    senderRole: v.string(),
    text: v.string(),
    recipientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("thread_messages", {
      thread_key: args.threadKey,
      sender_id: args.senderId,
      sender_name: args.senderName,
      sender_avatar: args.senderAvatar,
      sender_role: args.senderRole,
      text: args.text,
      created_at: Date.now(),
    });

    if (args.recipientId && args.recipientId !== args.senderId) {
      const recipientId = args.recipientId;
      const notifType = args.senderRole === "host" ? "host_reply" : "new_message";

      // Throttle email: if the recipient already has an unread message notification,
      // they've been pinged and haven't looked yet — skip the email to avoid spamming
      // on every message. They get emailed again on the next message after they read.
      const existing = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("user_id", recipientId))
        .collect();
      const hasPendingPing = existing.some(
        (n) => !n.read && (n.type === "new_message" || n.type === "host_reply")
      );

      await ctx.runMutation(internal.notifications.create, {
        userId: recipientId,
        type: notifType,
        title: `New message from ${args.senderName}`,
        body: args.text.length > 80 ? args.text.slice(0, 80) + "…" : args.text,
        link: "#/inbox",
      });

      if (!hasPendingPing) {
        const recipient = await ctx.db.get(recipientId as any);
        if ((recipient as any)?.email) {
          await ctx.scheduler.runAfter(0, internal.emails.sendNewMessageEmail, {
            recipientEmail: (recipient as any).email,
            recipientName: (recipient as any).full_name || "there",
            senderName: args.senderName,
            preview: args.text,
          });
        }
      }
    }

    return id;
  },
});
