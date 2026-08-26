import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuthedProfile, getAuthedProfile, canAccessAdmin } from "./lib/auth";

// Unfiltered across all users — not called from the client today, but must
// stay admin-gated since it has no per-user scoping args to check against.
export const getByUser = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return [];
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
    // Real party linkage so threadMessages.sendMessage/getByThread can
    // authorize this thread (see resolveThreadParties) — required for the
    // composer to actually work, not just cosmetic.
    participantId: v.optional(v.string()),
    threadKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuthedProfile(ctx);
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
      owner_id: String(profile._id),
      participant_id: args.participantId,
      thread_key: args.threadKey,
    });
  },
});

export const updateTag = mutation({
  args: {
    id: v.string(),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthedProfile(ctx);
    await ctx.db.patch(args.id as any, { tag: args.tag });
  },
});

// Real (non-admin-persona) threads someone else started with me directly —
// e.g. a creator messaging a host before applying — that I haven't already
// picked up locally. Mirrors adminThreads.getMineAsUser's merge pattern.
export const getIncomingForMe = query({
  args: {},
  handler: async (ctx) => {
    const profile = await getAuthedProfile(ctx);
    if (!profile) return [];
    const myId = String(profile._id);
    const rows = await ctx.db
      .query("threads")
      .withIndex("by_participant", (q) => q.eq("participant_id", myId))
      .collect();
    const incoming = rows.filter((r) => r.tag !== "Collabnb" && r.tag !== "Admin" && r.owner_id !== myId);

    return Promise.all(
      incoming.map(async (r) => {
        const key = r.thread_key as string;
        const other = r.owner_id ? await ctx.db.get(r.owner_id as any) : null;
        const msgs = await ctx.db
          .query("thread_messages")
          .withIndex("by_thread", (q) => q.eq("thread_key", key))
          .order("desc")
          .take(1);
        const last = msgs[0];
        const myReadAt = r.participant_read_at ?? 0;
        return {
          id: key,
          thread_key: key,
          listing_title: r.listing_title,
          host_name: (other as any)?.full_name ?? r.host_name,
          host_avatar: (other as any)?.avatar_url ?? r.host_avatar ?? null,
          tag: r.tag,
          last_message: last?.text ?? r.last_message ?? "",
          timestamp: last?.created_at
            ? new Date(last.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "New",
          unread: last && last.sender_id === r.owner_id && last.created_at > myReadAt ? 1 : 0,
          is_founder: (other as any)?.is_founder === true,
        };
      })
    );
  },
});

// Generic "I opened this thread" stamp — works for any thread where the
// caller is owner_id or participant_id (participant side of admin-persona
// threads included; the persona-impersonation owner side still uses
// adminThreads.markRead since owner_id there is the shared persona, not the
// signed-in admin's own profile id).
export const markReadByMe = mutation({
  args: { threadKey: v.string() },
  handler: async (ctx, { threadKey }) => {
    const profile = await getAuthedProfile(ctx);
    if (!profile) return false;
    const myId = String(profile._id);
    const row = await ctx.db
      .query("threads")
      .filter((q) => q.eq(q.field("thread_key"), threadKey))
      .first();
    if (!row) return false;
    if (row.owner_id === myId) {
      await ctx.db.patch(row._id, { owner_read_at: Date.now() });
      return true;
    }
    if (row.participant_id === myId) {
      await ctx.db.patch(row._id, { participant_read_at: Date.now() });
      return true;
    }
    return false;
  },
});
