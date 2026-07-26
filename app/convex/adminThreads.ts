import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Admin-brand inbox: threads owned by the "Collabnb" persona (username 'collabnb').
// Each thread is a 1:1 conversation with a single user (participant_id), keyed
// "admin_<participantId>" in thread_messages. Self-contained — does not touch
// the user-facing CollabContext/threads layer.

async function getPersonaId(ctx: any): Promise<string | null> {
  const all = await ctx.db.query("profiles").collect();
  const p = all.find((row: any) => row.username === "collabnb");
  return p ? String(p._id) : null;
}

function threadKeyFor(participantId: string) {
  return `admin_${participantId}`;
}

// List all admin threads, newest-last-message first, with participant profile +
// last message preview + unread count (messages from the participant that the
// admin hasn't opened).
export const list = query({
  args: {},
  handler: async (ctx) => {
    const personaId = await getPersonaId(ctx);
    if (!personaId) return [];
    const rows = await ctx.db
      .query("threads")
      .withIndex("by_owner", (q) => q.eq("owner_id", personaId))
      .collect();

    const participantIds = [...new Set(rows.map((r: any) => r.participant_id).filter(Boolean))];
    const participants = await Promise.all(
      participantIds.map((id: string) => ctx.db.get(id as any))
    );
    const pMap = new Map<string, any>();
    participants.forEach((p) => { if (p) pMap.set(String(p._id), p); });

    const enriched = await Promise.all(
      rows.map(async (r: any) => {
        const key = r.thread_key || threadKeyFor(r.participant_id);
        const msgs = await ctx.db
          .query("thread_messages")
          .withIndex("by_thread", (q) => q.eq("thread_key", key))
          .order("desc")
          .take(1);
        const last = msgs[0];
        const unread = await ctx.db
          .query("thread_messages")
          .withIndex("by_thread", (q) => q.eq("thread_key", key))
          .filter((q: any) => q.eq(q.field("sender_id"), r.participant_id))
          .collect();
        const p = r.participant_id ? pMap.get(r.participant_id) : null;
        return {
          _id: String(r._id),
          thread_key: key,
          participant_id: r.participant_id,
          participant_name: p?.full_name ?? r.host_name,
          participant_username: p?.username ?? "",
          participant_avatar: p?.avatar_url ?? r.host_avatar ?? null,
          participant_role: p?.role ?? "",
          is_founder: p?.is_founder === true,
          last_message: last?.text ?? r.last_message ?? "",
          last_at: last?.created_at ?? r._creationTime,
          last_sender_id: last?.sender_id ?? null,
          unread: unread.length,
          _creationTime: r._creationTime,
        };
      })
    );

    return enriched.sort((a, b) => (b.last_at ?? 0) - (a.last_at ?? 0));
  },
});

// Total unread across all admin threads — for the top-bar badge.
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const personaId = await getPersonaId(ctx);
    if (!personaId) return 0;
    const rows = await ctx.db
      .query("threads")
      .withIndex("by_owner", (q) => q.eq("owner_id", personaId))
      .collect();
    let total = 0;
    for (const r of rows) {
      const key = r.thread_key || threadKeyFor(r.participant_id);
      const incoming = await ctx.db
        .query("thread_messages")
        .withIndex("by_thread", (q) => q.eq("thread_key", key))
        .filter((q: any) => q.eq(q.field("sender_id"), r.participant_id))
        .collect();
      total += incoming.length;
    }
    return total;
  },
});

// Create (or return) an admin thread with a given user. Idempotent per user.
export const startWithUser = mutation({
  args: { participantId: v.string(), asPersonaId: v.string() },
  handler: async (ctx, { participantId, asPersonaId }) => {
    // Only the verified persona may own admin threads.
    const persona = await ctx.db.get(asPersonaId as any);
    if (!persona || persona.username !== "collabnb") {
      throw new Error("Not authorized to start admin threads.");
    }
    const key = threadKeyFor(participantId);
    const existing = await ctx.db
      .query("threads")
      .withIndex("by_owner", (q) => q.eq("owner_id", asPersonaId))
      .filter((q: any) => q.eq(q.field("participant_id"), participantId))
      .first();
    if (existing) return { threadId: String(existing._id), threadKey: key };

    const participant = await ctx.db.get(participantId as any);
    const id = await ctx.db.insert("threads", {
      listing_title: "Welcome",
      host_name: participant?.full_name ?? "User",
      host_avatar: participant?.avatar_url ?? undefined,
      tag: "Admin",
      last_message: "",
      timestamp: "Just now",
      unread: 0,
      owner_id: asPersonaId,
      participant_id: participantId,
      thread_key: key,
    });
    return { threadId: String(id), threadKey: key };
  },
});

// Mark a thread's incoming messages as read (currently a no-op marker — unread
// is computed live from thread_messages, so "read" is implied once the admin
// opens the thread. Kept as a hook for future server-side read receipts.)
export const markRead = mutation({
  args: { threadKey: v.string() },
  handler: async (ctx, { threadKey }) => {
    // Intentionally empty: unread is derived, not stored, for admin threads.
    return true;
  },
});
