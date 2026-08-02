import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { llmChat } from "./blog";
import { requireAdmin, requireAdminAction, canAccessAdmin } from "./lib/auth";

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
    if (!(await canAccessAdmin(ctx))) return [];
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
    if (!(await canAccessAdmin(ctx))) return 0;
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
    await requireAdmin(ctx);
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
    await requireAdmin(ctx);
    // Intentionally empty: unread is derived, not stored, for admin threads.
    return true;
  },
});

// AI-draft an admin message to a specific user via the writer LLM (NVIDIA chain).
// `prompt` is Ben's short intent ("welcome them", "ask about their niche"); the
// model expands it into a full message body. The signature is added client-side,
// so the draft must NOT include a sign-off.
export const draftMessage = action({
  args: { recipientId: v.string(), prompt: v.optional(v.string()) },
  handler: async (ctx, { recipientId, prompt }): Promise<string> => {
    await requireAdminAction(ctx, api.profiles.getByEmail);
    const p: any = await ctx.runQuery(api.profiles.getById, { id: recipientId });
    const firstName = (p?.full_name || "there").split(" ")[0];

    const who = [
      p?.full_name && `Name: ${p.full_name}`,
      p?.role && `Role: ${p.role}`,
      [p?.city, p?.region].filter(Boolean).join(", ") && `Location: ${[p?.city, p?.region].filter(Boolean).join(", ")}`,
      p?.tier && `Tier: ${p.tier}`,
      Array.isArray(p?.niches) && p.niches.length && `Niches: ${p.niches.join(", ")}`,
      p?.bio && `Bio: ${p.bio}`,
      p?.clerk_registered === false && `Note: they signed up with email but haven't finished creating their login yet.`,
    ].filter(Boolean).join("\n");

    const intent = (prompt || "").trim() || "Warmly welcome them to Collabnb and invite them to reach out with any questions.";

    const raw = await llmChat([
      { role: "system", content: "You write short, warm in-app messages on behalf of the Collabnb team (collabnb.com) — a creator-first hospitality platform connecting boutique stays with vetted creators. Sound like a real, friendly person on the team: natural, specific, zero marketing-speak. Never use 'elevate', 'unlock', 'leverage', 'seamless', or back-to-back exclamation marks. Do NOT include any greeting line beyond the person's first name, and do NOT include a sign-off or signature (that is added separately). Output ONLY the message body text — no quotes, no preamble, no commentary." },
      { role: "user", content: `Write ONE message (2-4 short sentences, at most one emoji) to send to this user. Base it on Ben's intent below and personalize only with the facts given — never invent details.\n\nBen's intent: ${intent}\n\nUser facts:\n${who || "(no extra details)"}\n\nStart with "Hi ${firstName}," on its own line.` },
    ], 300);

    let out = raw.trim();
    const lines = out.split("\n");
    if (lines.length > 1 && /^(here('s| is)|sure|below is)/i.test(lines[0]) && lines[0].length < 90) {
      out = lines.slice(1).join("\n").trim();
    }
    return out.replace(/^["'“”]+|["'“”]+$/g, "").slice(0, 1200);
  },
});
