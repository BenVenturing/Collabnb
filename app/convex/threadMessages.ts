import { v, ConvexError } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireOwnerOrAdmin, getAuthedProfile } from "./lib/auth";
import { cleanPlainText } from "./lib/sanitize";
import { enforceRateLimit, RATE_LIMITS } from "./lib/rateLimit";

// thread_key is a predictable string (thread_<listingId>_<creatorId>), so
// reading a thread by key alone would let anyone guess their way into
// someone else's private negotiation. Resolve the real two parties from the
// pitch (or admin thread) that owns this key and check the caller is one of
// them. Both pitches and admin threads use the same "thread_<listingId>_<id>"
// / "admin_<userId>" convention, so a match in either table is authoritative.
async function resolveThreadParties(ctx: any, threadKey: string): Promise<{ a?: string; b?: string } | null> {
  const pitch = await ctx.db
    .query("pitches")
    .filter((q: any) => q.eq(q.field("thread_key"), threadKey))
    .first();
  if (pitch) return { a: pitch.host_id, b: pitch.creator_id };

  const thread = await ctx.db
    .query("threads")
    .filter((q: any) => q.eq(q.field("thread_key"), threadKey))
    .first();
  if (thread) return { a: thread.owner_id, b: thread.participant_id };

  return null;
}

export const getByThread = query({
  args: { threadKey: v.string() },
  handler: async (ctx, { threadKey }) => {
    const profile = await getAuthedProfile(ctx);
    if (!profile) return [];
    if (profile.is_admin !== true) {
      const parties = await resolveThreadParties(ctx, threadKey);
      const me = String(profile._id);
      const isParty = parties ? (parties.a === me || parties.b === me) : false;
      if (!isParty) return [];
    }
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
    if (!(await getAuthedProfile(ctx))) return 0;
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
    await requireOwnerOrAdmin(ctx, args.senderId);
    await enforceRateLimit(ctx, `message:${args.senderId}`, RATE_LIMITS.THREAD_MESSAGE);
    // Unverified accounts (pending review) can't message anyone — enforced
    // server-side so hiding the UI isn't the only barrier
    let sender: any = null;
    try { sender = await ctx.db.get(args.senderId as any); } catch { sender = null; }
    if (sender && sender.is_verified !== true && sender.is_admin !== true) {
      throw new ConvexError("Your account is pending verification. Messaging unlocks once you're approved.");
    }
    // A message can only be inserted into a thread that actually resolves to
    // a real pitch/thread relationship the sender is a party to — mirrors the
    // read-side check in getByThread. Without this, a client-side-only thread
    // (e.g. an optimistic "applied to listing" thread whose pitch creation
    // was rejected server-side, such as applying to an unpublished listing)
    // would silently accept messages that then vanish, since getByThread
    // would never be able to show them back. Fail loudly here instead.
    let resolvedParties: { a?: string; b?: string } | null = null;
    if (!sender || sender.is_admin !== true) {
      resolvedParties = await resolveThreadParties(ctx, args.threadKey);
      const isParty = resolvedParties ? (resolvedParties.a === args.senderId || resolvedParties.b === args.senderId) : false;
      if (!isParty) {
        throw new ConvexError(
          "This conversation isn't linked to a real application yet — try reapplying from the listing page."
        );
      }
    }
    // Callers (AdminInbox) may pass recipientId explicitly; otherwise derive
    // it from the thread's resolved parties — "whichever side isn't me" —
    // so notifications/emails fire for ordinary Inbox sends too, not just
    // the admin-persona composer.
    let effectiveRecipientId = args.recipientId;
    if (!effectiveRecipientId) {
      const parties = resolvedParties ?? (await resolveThreadParties(ctx, args.threadKey));
      if (parties) {
        effectiveRecipientId = parties.a === args.senderId ? parties.b : parties.a;
      }
    }
    // Blocking is symmetric (Settings > Privacy > Blocked people) — either
    // party having blocked the other is enough to stop new messages both ways.
    if (effectiveRecipientId && effectiveRecipientId !== args.senderId) {
      let recipient: any = null;
      try { recipient = await ctx.db.get(effectiveRecipientId as any); } catch { recipient = null; }
      const blockedBySender = (sender?.blocked_user_ids ?? []).includes(effectiveRecipientId);
      const blockedByRecipient = (recipient?.blocked_user_ids ?? []).includes(args.senderId);
      if (blockedBySender || blockedByRecipient) {
        throw new ConvexError("You can't message this user.");
      }
    }
    const id = await ctx.db.insert("thread_messages", {
      thread_key: args.threadKey,
      sender_id: args.senderId,
      sender_name: args.senderName,
      sender_avatar: args.senderAvatar,
      sender_role: args.senderRole,
      text: cleanPlainText(args.text, 3000),
      created_at: Date.now(),
    });

    if (effectiveRecipientId && effectiveRecipientId !== args.senderId) {
      const recipientId = effectiveRecipientId;
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
        link: `#/inbox?thread=${encodeURIComponent(args.threadKey)}`,
      });

      if (!hasPendingPing) {
        const recipient = await ctx.db.get(recipientId as any);
        // Settings > Notifications > Messages — gates the email only; the
        // in-app notification above still fires either way.
        if ((recipient as any)?.email && (recipient as any)?.notification_prefs?.messages !== false) {
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

// ─── Cron: digest of creator messages the host hasn't replied to ─────────────
//
// sendMessage above deliberately throttles its per-message email: once the
// recipient has an unread message notification they stop getting emailed
// until they read it. That keeps inboxes sane but means a host who ignores
// the first email hears nothing about every message after it. This is the
// backstop for exactly that case.
//
// There are no per-thread read receipts, so "awaiting reply" is derived the
// same way getHostUnreadCount does it — the last message in the thread came
// from the creator, i.e. the host hasn't answered.

const DAY_MS = 24 * 60 * 60 * 1000;
const REPLY_GRACE = DAY_MS;          // don't nag about a message from an hour ago
const DIGEST_INTERVAL = 3 * DAY_MS;  // at most one digest per host every 3 days

export const checkAwaitingReply = internalMutation({
  // dryRun reports who *would* be nudged without sending or marking anything —
  // the only safe way to test this against production data.
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun }) => {
    const now = Date.now();

    // Candidate threads come from both pitches (post-application) and the
    // threads table (pre-apply "message the host" conversations, which are
    // the ones most likely to be missed since no application exists yet).
    const candidates = new Map<string, { a?: string; b?: string; pitchStatus?: string }>();

    for (const p of await ctx.db.query("pitches").collect()) {
      if (!p.thread_key) continue;
      candidates.set(p.thread_key, {
        a: p.host_id,
        b: p.creator_id,
        pitchStatus: (p.status || "").toLowerCase(),
      });
    }
    for (const t of await ctx.db.query("threads").collect()) {
      if (!t.thread_key || candidates.has(t.thread_key)) continue;
      candidates.set(t.thread_key, { a: t.owner_id, b: t.participant_id });
    }

    const byHost = new Map<string, Set<string>>();
    for (const [key, parties] of candidates) {
      // admin_* are support conversations, preview_* are the sample board.
      if (key.startsWith("admin_") || key.startsWith("preview_")) continue;
      // Undecided applications are the stale-application cron's job — don't
      // email the same host twice about the same thing on the same morning.
      if (parties.pitchStatus === "pending" || parties.pitchStatus === "under_review") continue;

      const last = await ctx.db
        .query("thread_messages")
        .withIndex("by_thread", (q) => q.eq("thread_key", key))
        .order("desc")
        .take(1)
        .then((msgs) => msgs[0] ?? null);

      if (!last || last.sender_role !== "creator") continue;
      if (now - last.created_at < REPLY_GRACE) continue;

      // Whichever party isn't the creator who sent it. Require the sender to
      // actually be one of the two resolved parties first — on a thread whose
      // parties have drifted from its messages, "not the sender" would
      // otherwise resolve to an uninvolved third person and email them.
      if (parties.a !== last.sender_id && parties.b !== last.sender_id) continue;
      const hostId = parties.a === last.sender_id ? parties.b : parties.a;
      if (!hostId || hostId === last.sender_id) continue;

      const names = byHost.get(hostId) ?? new Set<string>();
      names.add(last.sender_name);
      byHost.set(hostId, names);
    }

    let hostsNudged = 0;
    const preview: any[] = [];
    for (const [hostId, nameSet] of byHost) {
      let host: any = null;
      try { host = await ctx.db.get(hostId as any); } catch { host = null; }
      if (!host) continue;
      if (host.last_reply_nudge_at && now - host.last_reply_nudge_at < DIGEST_INTERVAL) continue;

      const names = [...nameSet];
      const shown = names.slice(0, 3).join(", ");
      const creatorNames = names.length > 3 ? `${shown} and ${names.length - 3} more` : shown;
      const conversationsLabel = `${names.length} conversation${names.length === 1 ? "" : "s"}`;

      if (dryRun === true) {
        preview.push({
          host: host.email ?? String(hostId),
          conversationsLabel,
          creatorNames,
          emailWouldSend: !!host.email && host.notification_prefs?.messages !== false,
        });
        hostsNudged++;
        continue;
      }

      await ctx.runMutation(internal.notifications.create, {
        userId: hostId,
        type: "awaiting_reply",
        title: `${conversationsLabel} waiting for your reply`,
        body: creatorNames,
        link: `#/inbox`,
      });

      if (host.email && host.notification_prefs?.messages !== false) {
        await ctx.scheduler.runAfter(0, internal.emails.sendAwaitingReplyEmail, {
          hostEmail: host.email,
          hostName: host.full_name || "there",
          conversationsLabel,
          creatorNames,
        });
      }

      await ctx.db.patch(hostId as any, { last_reply_nudge_at: now });
      hostsNudged++;
    }

    return { hostsNudged, ...(dryRun === true ? { dryRun: true, preview } : {}) };
  },
});
