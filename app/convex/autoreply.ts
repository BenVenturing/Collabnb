import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { requireAdmin, requireAdminAction, canAccessAdmin } from "./lib/auth";

// ─── Comment-keyword -> auto-DM rules ("OpenReply"-style) ──────────────────────
// Fired from the Meta webhook in http.ts. Reuses META_ACCESS_TOKEN /
// IG_BUSINESS_ACCOUNT_ID already set up for Social/Inbox — no separate
// connected-account flow. New env vars needed only for the webhook itself:
//   npx convex env set META_APP_SECRET <App Settings -> Basic -> App Secret>
//   npx convex env set META_WEBHOOK_VERIFY_TOKEN <any random string you pick>
// Then in the Meta App dashboard: Webhooks -> Instagram -> Subscribe to
// "comments" -> Callback URL = https://<your-deployment>.convex.site/meta-webhook
// -> Verify token = the same string you set above.

export const getConnectionStatus = query({
  args: {},
  handler: async () => ({
    graphApi: !!process.env.META_ACCESS_TOKEN && !!process.env.IG_BUSINESS_ACCOUNT_ID,
    webhook: !!process.env.META_APP_SECRET && !!process.env.META_WEBHOOK_VERIFY_TOKEN,
  }),
});

export const getRules = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return [];
    const rows = await ctx.db.query("autoreply_rules").collect();
    return rows.sort((a, b) => b.created_at - a.created_at);
  },
});

export const addRule = mutation({
  args: {
    postId: v.optional(v.string()),
    keywords: v.array(v.string()),
    matchMode: v.union(v.literal("contains"), v.literal("word")),
    dmMessage: v.string(),
    publicReply: v.optional(v.string()),
  },
  handler: async (ctx, { postId, keywords, matchMode, dmMessage, publicReply }) => {
    await requireAdmin(ctx);
    const cleanKeywords = keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
    if (cleanKeywords.length === 0) throw new Error("At least one keyword is required.");
    if (!dmMessage.trim()) throw new Error("The DM message can't be empty.");
    return await ctx.db.insert("autoreply_rules", {
      post_id: postId || undefined,
      keywords: cleanKeywords,
      match_mode: matchMode,
      dm_message: dmMessage.trim(),
      public_reply: publicReply?.trim() || undefined,
      active: true,
      trigger_count: 0,
      created_at: Date.now(),
    });
  },
});

export const updateRule = mutation({
  args: {
    id: v.id("autoreply_rules"),
    postId: v.optional(v.string()),
    keywords: v.optional(v.array(v.string())),
    matchMode: v.optional(v.union(v.literal("contains"), v.literal("word"))),
    dmMessage: v.optional(v.string()),
    publicReply: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, postId, keywords, matchMode, dmMessage, publicReply, active }) => {
    await requireAdmin(ctx);
    const patch: Record<string, any> = {};
    if (postId !== undefined) patch.post_id = postId || undefined;
    if (keywords !== undefined) patch.keywords = keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
    if (matchMode !== undefined) patch.match_mode = matchMode;
    if (dmMessage !== undefined) patch.dm_message = dmMessage.trim();
    if (publicReply !== undefined) patch.public_reply = publicReply.trim() || undefined;
    if (active !== undefined) patch.active = active;
    await ctx.db.patch(id, patch);
  },
});

export const removeRule = mutation({
  args: { id: v.id("autoreply_rules") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});

export const getLog = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return [];
    const rows = await ctx.db.query("autoreply_log").order("desc").take(200);
    return rows;
  },
});

// ─── Internal plumbing used by the webhook + the send/retry action ────────────

export const getRulesInternal = internalQuery({
  args: {},
  handler: async (ctx) => ctx.db.query("autoreply_rules").collect(),
});

export const wasAlreadyProcessed = internalQuery({
  args: { commentId: v.string() },
  handler: async (ctx, { commentId }) => {
    const existing = await ctx.db
      .query("autoreply_log")
      .withIndex("by_comment", (q) => q.eq("comment_id", commentId))
      .first();
    return !!existing;
  },
});

export const writeLog = internalMutation({
  args: {
    ruleId: v.optional(v.id("autoreply_rules")),
    commentId: v.string(),
    postId: v.optional(v.string()),
    commenterUsername: v.optional(v.string()),
    commentText: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed"), v.literal("no_match")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { ruleId, commentId, postId, commenterUsername, commentText, status, error }) => {
    await ctx.db.insert("autoreply_log", {
      rule_id: ruleId,
      comment_id: commentId,
      post_id: postId,
      commenter_username: commenterUsername,
      comment_text: commentText,
      status,
      error,
      created_at: Date.now(),
    });
    if (ruleId && status === "sent") {
      const rule = await ctx.db.get(ruleId);
      if (rule) await ctx.db.patch(ruleId, { trigger_count: (rule.trigger_count || 0) + 1 });
    }
  },
});

export const getLogEntryInternal = internalQuery({
  args: { id: v.id("autoreply_log") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

function matches(commentText: string, rule: { keywords: string[]; match_mode: "contains" | "word" }): boolean {
  const text = commentText.toLowerCase();
  return rule.keywords.some((kw) => {
    if (rule.match_mode === "contains") return text.includes(kw);
    // Whole-word match: keyword bounded by non-letters (or string edges).
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
  });
}

async function sendPrivateReply(commentId: string, message: string): Promise<void> {
  const token = process.env.META_ACCESS_TOKEN;
  const igId = process.env.IG_BUSINESS_ACCOUNT_ID;
  if (!token || !igId) throw new Error("Instagram is not connected (META_ACCESS_TOKEN / IG_BUSINESS_ACCOUNT_ID).");
  const res = await fetch(`https://graph.facebook.com/v21.0/${igId}/messages?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { comment_id: commentId }, message: { text: message } }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Private reply failed (${res.status}): ${detail.slice(0, 300)}`);
  }
}

async function sendPublicReply(commentId: string, message: string): Promise<void> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error("Instagram is not connected (META_ACCESS_TOKEN).");
  const res = await fetch(`https://graph.facebook.com/v21.0/${commentId}/replies?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Public reply failed (${res.status}): ${detail.slice(0, 300)}`);
  }
}

// Called from the Meta webhook (http.ts) for every incoming comment. Matches
// against active rules (post-specific first, then global), sends the private
// reply (+ optional public reply), and logs the outcome either way. No queue —
// a single synchronous attempt is plenty at solo-creator comment volume; a
// failed send just sits in the log with a Retry button (see retrySend below)
// rather than an automatic backoff/queue system.
export const processComment = internalAction({
  args: {
    commentId: v.string(),
    postId: v.optional(v.string()),
    commentText: v.string(),
    commenterUsername: v.optional(v.string()),
  },
  handler: async (ctx, { commentId, postId, commentText, commenterUsername }) => {
    const already = await ctx.runQuery(internal.autoreply.wasAlreadyProcessed, { commentId });
    if (already) return; // Meta redelivers webhook events; don't double-DM

    const rules: any[] = await ctx.runQuery(internal.autoreply.getRulesInternal, {});
    const active = rules.filter((r) => r.active);
    const rule =
      active.find((r) => r.post_id === postId && matches(commentText, r)) ||
      active.find((r) => !r.post_id && matches(commentText, r));

    if (!rule) {
      await ctx.runMutation(internal.autoreply.writeLog, {
        commentId, postId, commenterUsername, commentText, status: "no_match",
      });
      return;
    }

    try {
      await sendPrivateReply(commentId, rule.dm_message);
      if (rule.public_reply) await sendPublicReply(commentId, rule.public_reply);
      await ctx.runMutation(internal.autoreply.writeLog, {
        ruleId: rule._id, commentId, postId, commenterUsername, commentText, status: "sent",
      });
    } catch (e: any) {
      await ctx.runMutation(internal.autoreply.writeLog, {
        ruleId: rule._id, commentId, postId, commenterUsername, commentText,
        status: "failed", error: e?.message?.slice(0, 300) || "Unknown error",
      });
    }
  },
});

// Manual retry for a failed log entry, triggered from the admin UI.
export const retrySend = action({
  args: { logId: v.id("autoreply_log") },
  handler: async (ctx, { logId }): Promise<{ ok: boolean }> => {
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    const entry: any = await ctx.runQuery(internal.autoreply.getLogEntryInternal, { id: logId });
    if (!entry || !entry.rule_id) throw new Error("Nothing to retry for this entry.");
    const rules: any[] = await ctx.runQuery(internal.autoreply.getRulesInternal, {});
    const rule = rules.find((r) => String(r._id) === String(entry.rule_id));
    if (!rule) throw new Error("The rule for this entry no longer exists.");

    try {
      await sendPrivateReply(entry.comment_id, rule.dm_message);
      if (rule.public_reply) await sendPublicReply(entry.comment_id, rule.public_reply);
      await ctx.runMutation(internal.autoreply.writeLog, {
        ruleId: rule._id, commentId: entry.comment_id, postId: entry.post_id,
        commenterUsername: entry.commenter_username, commentText: entry.comment_text, status: "sent",
      });
      return { ok: true };
    } catch (e: any) {
      await ctx.runMutation(internal.autoreply.writeLog, {
        ruleId: rule._id, commentId: entry.comment_id, postId: entry.post_id,
        commenterUsername: entry.commenter_username, commentText: entry.comment_text,
        status: "failed", error: e?.message?.slice(0, 300) || "Unknown error",
      });
      throw e;
    }
  },
});
