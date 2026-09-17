import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { requireAdmin, requireAdminAction, canAccessAdmin } from "./lib/auth";
import { BASE_URL } from "./emailCopy";

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
    signupUrl: v.optional(v.string()),
    tier2Message: v.optional(v.string()),
    tier3Message: v.optional(v.string()),
    tier4Message: v.optional(v.string()),
  },
  handler: async (ctx, { postId, keywords, matchMode, dmMessage, publicReply, signupUrl, tier2Message, tier3Message, tier4Message }) => {
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
      signup_url: signupUrl?.trim() || undefined,
      tier2_message: tier2Message?.trim() || undefined,
      tier3_message: tier3Message?.trim() || undefined,
      tier4_message: tier4Message?.trim() || undefined,
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
    signupUrl: v.optional(v.string()),
    tier2Message: v.optional(v.string()),
    tier3Message: v.optional(v.string()),
    tier4Message: v.optional(v.string()),
  },
  handler: async (ctx, { id, postId, keywords, matchMode, dmMessage, publicReply, active, signupUrl, tier2Message, tier3Message, tier4Message }) => {
    await requireAdmin(ctx);
    const patch: Record<string, any> = {};
    if (postId !== undefined) patch.post_id = postId || undefined;
    if (keywords !== undefined) patch.keywords = keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
    if (matchMode !== undefined) patch.match_mode = matchMode;
    if (dmMessage !== undefined) patch.dm_message = dmMessage.trim();
    if (publicReply !== undefined) patch.public_reply = publicReply.trim() || undefined;
    if (active !== undefined) patch.active = active;
    if (signupUrl !== undefined) patch.signup_url = signupUrl.trim() || undefined;
    if (tier2Message !== undefined) patch.tier2_message = tier2Message.trim() || undefined;
    if (tier3Message !== undefined) patch.tier3_message = tier3Message.trim() || undefined;
    if (tier4Message !== undefined) patch.tier4_message = tier4Message.trim() || undefined;
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
    refToken: v.optional(v.string()),
    recipientIgsid: v.optional(v.string()),
  },
  handler: async (ctx, { ruleId, commentId, postId, commenterUsername, commentText, status, error, refToken, recipientIgsid }) => {
    await ctx.db.insert("autoreply_log", {
      rule_id: ruleId,
      comment_id: commentId,
      post_id: postId,
      commenter_username: commenterUsername,
      comment_text: commentText,
      status,
      error,
      created_at: Date.now(),
      ref_token: refToken,
      recipient_igsid: recipientIgsid,
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

// Returns the IG-scoped recipient id (igsid) from the Send API response, when
// present — needed to DM this person again later for the follow-up tiers,
// since a private reply can only ever be addressed by comment_id once.
async function sendPrivateReply(commentId: string, message: string): Promise<{ igsid?: string }> {
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
  const data = await res.json().catch(() => ({}) as any);
  return { igsid: data?.recipient_id ? String(data.recipient_id) : undefined };
}

// Follow-up tiers 2-4 message a previously-established recipient by their
// igsid rather than by comment_id (Meta only allows the comment_id form once).
async function sendDirectMessage(igsid: string, message: string): Promise<void> {
  const token = process.env.META_ACCESS_TOKEN;
  const igId = process.env.IG_BUSINESS_ACCOUNT_ID;
  if (!token || !igId) throw new Error("Instagram is not connected (META_ACCESS_TOKEN / IG_BUSINESS_ACCOUNT_ID).");
  const res = await fetch(`https://graph.facebook.com/v21.0/${igId}/messages?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: igsid }, message: { text: message } }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Follow-up DM failed (${res.status}): ${detail.slice(0, 300)}`);
  }
}

function makeRefToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// A ref_token is only worth minting if some message in the sequence actually
// uses {{link}} — checked across all four tiers, not just the Tier 1 message,
// so a token generated now is still there if a later tier needs it.
function ruleNeedsRefToken(rule: { dm_message: string; tier2_message?: string; tier3_message?: string; tier4_message?: string }): boolean {
  return [rule.dm_message, rule.tier2_message, rule.tier3_message, rule.tier4_message].some((m) => m?.includes("{{link}}"));
}

// Substitutes {{link}} in a rule's message with a per-recipient tracked
// redirect (autoreply_log's ref_token) — clicking it both logs the click
// (Tier 3 gate) and tags the destination with ?igref=<token> so a completed
// signup can be attributed back to this DM (see profiles.getOrCreate).
function renderMessage(message: string, refToken: string | undefined): string {
  if (!refToken || !message.includes("{{link}}")) return message;
  const site = process.env.CONVEX_SITE_URL;
  if (!site) return message;
  return message.replaceAll("{{link}}", `${site}/go/${refToken}`);
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

    const refToken = ruleNeedsRefToken(rule) ? makeRefToken() : undefined;
    try {
      const { igsid } = await sendPrivateReply(commentId, renderMessage(rule.dm_message, refToken));
      if (rule.public_reply) await sendPublicReply(commentId, rule.public_reply);
      await ctx.runMutation(internal.autoreply.writeLog, {
        ruleId: rule._id, commentId, postId, commenterUsername, commentText, status: "sent",
        refToken, recipientIgsid: igsid,
      });
    } catch (e: any) {
      await ctx.runMutation(internal.autoreply.writeLog, {
        ruleId: rule._id, commentId, postId, commenterUsername, commentText,
        status: "failed", error: e?.message?.slice(0, 300) || "Unknown error",
        refToken,
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

    // Reuse the entry's existing ref_token (if any) rather than minting a new
    // one — a fresh token would orphan any click/signup already tied to it.
    const refToken = entry.ref_token || (ruleNeedsRefToken(rule) ? makeRefToken() : undefined);
    try {
      const { igsid } = await sendPrivateReply(entry.comment_id, renderMessage(rule.dm_message, refToken));
      if (rule.public_reply) await sendPublicReply(entry.comment_id, rule.public_reply);
      await ctx.runMutation(internal.autoreply.writeLog, {
        ruleId: rule._id, commentId: entry.comment_id, postId: entry.post_id,
        commenterUsername: entry.commenter_username, commentText: entry.comment_text, status: "sent",
        refToken, recipientIgsid: igsid || entry.recipient_igsid,
      });
      return { ok: true };
    } catch (e: any) {
      await ctx.runMutation(internal.autoreply.writeLog, {
        ruleId: rule._id, commentId: entry.comment_id, postId: entry.post_id,
        commenterUsername: entry.commenter_username, commentText: entry.comment_text,
        status: "failed", error: e?.message?.slice(0, 300) || "Unknown error",
        refToken,
      });
      throw e;
    }
  },
});

// ─── Follow-up tiers 2-4 ────────────────────────────────────────────────────

export const markLinkClicked = internalMutation({
  args: { refToken: v.string() },
  handler: async (ctx, { refToken }): Promise<string> => {
    const entry = await ctx.db.query("autoreply_log").withIndex("by_ref_token", (q) => q.eq("ref_token", refToken)).unique();
    const fallback = `${BASE_URL}/join.html`;
    if (!entry) return fallback;
    if (!entry.link_clicked_at) await ctx.db.patch(entry._id, { link_clicked_at: Date.now() });
    const rule = entry.rule_id ? await ctx.db.get(entry.rule_id) : null;
    const signupUrl = rule?.signup_url || fallback;
    return `${signupUrl}${signupUrl.includes("?") ? "&" : "?"}igref=${refToken}`;
  },
});

const TIER2_DELAY_MS = 24 * 60 * 60 * 1000;
const TIER3_DELAY_MS = 60 * 60 * 60 * 1000; // ~60h, the middle of the 48-72h window

export const getFollowUpCandidatesInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 10 * 24 * 60 * 60 * 1000; // ignore anything older than 10 days
    const entries = await ctx.db.query("autoreply_log").collect();
    const candidates = entries.filter(
      (e) => e.status === "sent" && e.ref_token && e.recipient_igsid && !e.signed_up_at && e.created_at >= cutoff
    );
    const rules = new Map<string, any>();
    const out: any[] = [];
    for (const e of candidates) {
      if (!e.rule_id) continue;
      const key = String(e.rule_id);
      if (!rules.has(key)) rules.set(key, await ctx.db.get(e.rule_id));
      const rule = rules.get(key);
      if (rule) out.push({ entry: e, rule });
    }
    return out;
  },
});

export const markTierSentInternal = internalMutation({
  args: { id: v.id("autoreply_log"), tier: v.union(v.literal(2), v.literal(3), v.literal(4)) },
  handler: async (ctx, { id, tier }) => {
    const field = tier === 2 ? "tier2_sent_at" : tier === 3 ? "tier3_sent_at" : "tier4_sent_at";
    const patch: Record<string, number> = { [field]: Date.now() };
    await ctx.db.patch(id, patch);
  },
});

// Cron-driven (see crons.ts) — sends the no-click nudge (~24h) and the
// clicked-but-no-signup nudge (~48-72h). Tier 4 (welcome + follow-ask) is
// event-driven instead, fired from profiles.getOrCreate on signup.
export const checkFollowUps = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const candidates: any[] = await ctx.runQuery(internal.autoreply.getFollowUpCandidatesInternal, {});
    for (const { entry, rule } of candidates) {
      try {
        if (!entry.tier2_sent_at && !entry.link_clicked_at && rule.tier2_message && now - entry.created_at >= TIER2_DELAY_MS) {
          await sendDirectMessage(entry.recipient_igsid, renderMessage(rule.tier2_message, entry.ref_token));
          await ctx.runMutation(internal.autoreply.markTierSentInternal, { id: entry._id, tier: 2 });
        } else if (entry.link_clicked_at && !entry.tier3_sent_at && rule.tier3_message && now - entry.link_clicked_at >= TIER3_DELAY_MS) {
          await sendDirectMessage(entry.recipient_igsid, renderMessage(rule.tier3_message, entry.ref_token));
          await ctx.runMutation(internal.autoreply.markTierSentInternal, { id: entry._id, tier: 3 });
        }
      } catch {
        // Best-effort — a failed follow-up just gets retried on the next cron tick.
      }
    }
  },
});

// Fired from profiles.getOrCreate once a brand-new profile carries an
// igdm_ref tying it back to a DM recipient — sends the Tier 4 welcome +
// follow-ask, if the rule has one configured.
export const sendTier4 = internalAction({
  args: { logId: v.id("autoreply_log") },
  handler: async (ctx, { logId }) => {
    const entry: any = await ctx.runQuery(internal.autoreply.getLogEntryInternal, { id: logId });
    if (!entry || entry.tier4_sent_at || !entry.recipient_igsid || !entry.rule_id) return;
    const rule: any = await ctx.runQuery(internal.autoreply.getRuleInternal, { id: entry.rule_id });
    if (!rule?.tier4_message) return;
    try {
      await sendDirectMessage(entry.recipient_igsid, renderMessage(rule.tier4_message, entry.ref_token));
      await ctx.runMutation(internal.autoreply.markTierSentInternal, { id: entry._id, tier: 4 });
    } catch {
      // Best-effort welcome message — signup itself already succeeded.
    }
  },
});

export const getRuleInternal = internalQuery({
  args: { id: v.id("autoreply_rules") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});
