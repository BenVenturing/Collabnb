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

// Instagram Login tokens ("IG…") only work on graph.instagram.com; Page tokens ("EAA…") on graph.facebook.com.
const graphBase = (token: string) =>
  token.startsWith("IG") ? "https://graph.instagram.com/v21.0" : "https://graph.facebook.com/v21.0";

// Returns the IG-scoped recipient id (igsid) from the Send API response, when
// present — needed to DM this person again later for the follow-up tiers,
// since a private reply can only ever be addressed by comment_id once.
async function sendPrivateReply(commentId: string, message: string): Promise<{ igsid?: string }> {
  const token = process.env.META_ACCESS_TOKEN;
  const igId = process.env.IG_BUSINESS_ACCOUNT_ID;
  if (!token || !igId) throw new Error("Instagram is not connected (META_ACCESS_TOKEN / IG_BUSINESS_ACCOUNT_ID).");
  const res = await fetch(`${graphBase(token)}/${igId}/messages?access_token=${token}`, {
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
  const res = await fetch(`${graphBase(token)}/${igId}/messages?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: igsid }, message: { text: message } }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Follow-up DM failed (${res.status}): ${detail.slice(0, 300)}`);
  }
}

const SITE_URL = "https://collabnb.com";

function makeRefToken(): string {
  return Math.random().toString(36).slice(2, 8);
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
function renderMessage(message: string, refToken: string | undefined, shortPath?: string): string {
  if (!refToken || !message.includes("{{link}}")) return message;
  return message.replaceAll("{{link}}", `${SITE_URL}/${shortPath || "go"}/${refToken}`);
}

async function sendPublicReply(commentId: string, message: string): Promise<void> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error("Instagram is not connected (META_ACCESS_TOKEN).");
  const res = await fetch(`${graphBase(token)}/${commentId}/replies?access_token=${token}`, {
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
    commenterId: v.optional(v.string()),
  },
  handler: async (ctx, { commentId, postId, commentText, commenterUsername, commenterId }) => {
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
      const { igsid } = await sendPrivateReply(commentId, renderMessage(rule.dm_message, refToken, rule.short_path));
      // The DM is already delivered, so a failed public reply must not mark it failed (Retry would DM them twice).
      const replyError = rule.public_reply
        ? await sendPublicReply(commentId, rule.public_reply).then(() => undefined, (e: any) => e?.message?.slice(0, 300) || "Unknown error")
        : undefined;
      await ctx.runMutation(internal.autoreply.writeLog, {
        ruleId: rule._id, commentId, postId, commenterUsername, commentText, status: "sent",
        refToken, recipientIgsid: igsid || commenterId, error: replyError,
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
    await requireAdminAction(ctx, internal.profiles.getByClerkUserId);
    const entry: any = await ctx.runQuery(internal.autoreply.getLogEntryInternal, { id: logId });
    if (!entry || !entry.rule_id) throw new Error("Nothing to retry for this entry.");
    const rules: any[] = await ctx.runQuery(internal.autoreply.getRulesInternal, {});
    const rule = rules.find((r) => String(r._id) === String(entry.rule_id));
    if (!rule) throw new Error("The rule for this entry no longer exists.");

    // Reuse the entry's existing ref_token (if any) rather than minting a new
    // one — a fresh token would orphan any click/signup already tied to it.
    const refToken = entry.ref_token || (ruleNeedsRefToken(rule) ? makeRefToken() : undefined);
    try {
      const { igsid } = await sendPrivateReply(entry.comment_id, renderMessage(rule.dm_message, refToken, rule.short_path));
      const replyError = rule.public_reply
        ? await sendPublicReply(entry.comment_id, rule.public_reply).then(() => undefined, (e: any) => e?.message?.slice(0, 300) || "Unknown error")
        : undefined;
      await ctx.runMutation(internal.autoreply.writeLog, {
        ruleId: rule._id, commentId: entry.comment_id, postId: entry.post_id,
        commenterUsername: entry.commenter_username, commentText: entry.comment_text, status: "sent",
        refToken, recipientIgsid: igsid || entry.recipient_igsid, error: replyError,
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
    const fallback = `${SITE_URL}/join`;
    if (!entry) return fallback;
    if (!entry.link_clicked_at) await ctx.db.patch(entry._id, { link_clicked_at: Date.now() });
    const rule = entry.rule_id ? await ctx.db.get(entry.rule_id) : null;
    const signupUrl = rule?.signup_url || fallback;
    try {
      // URL keeps igref ahead of any #section, which a plain string append would swallow.
      const url = new URL(signupUrl);
      url.searchParams.set("igref", refToken);
      return url.toString();
    } catch {
      return `${fallback}?igref=${refToken}`;
    }
  },
});

const TIER2_DELAY_MS = 24 * 60 * 60 * 1000;
const TIER3_DELAY_MS = 72 * 60 * 60 * 1000;

export const getFollowUpCandidatesInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 10 * 24 * 60 * 60 * 1000; // ignore anything older than 10 days
    const entries = await ctx.db.query("autoreply_log").withIndex("by_created_at", (q) => q.gte("created_at", cutoff)).collect();
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

export const recordFollowUpErrorInternal = internalMutation({
  args: { id: v.id("autoreply_log"), error: v.string() },
  handler: async (ctx, { id, error }) => {
    await ctx.db.patch(id, { followup_error: error });
  },
});

export const markTierSentInternal = internalMutation({
  args: { id: v.id("autoreply_log"), tier: v.union(v.literal(2), v.literal(3), v.literal(4)) },
  handler: async (ctx, { id, tier }) => {
    const field = tier === 2 ? "tier2_sent_at" : tier === 3 ? "tier3_sent_at" : "tier4_sent_at";
    await ctx.db.patch(id, { [field]: Date.now(), followup_error: undefined });
  },
});

// Cron-driven (see crons.ts) — sends two follow-ups, ~24h and ~72h after the
// first DM, to anyone who hasn't signed up. Tier 4 (welcome + follow-ask) is
// event-driven instead, fired from profiles.getOrCreate on signup.
export const checkFollowUps = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const candidates: any[] = await ctx.runQuery(internal.autoreply.getFollowUpCandidatesInternal, {});
    for (const { entry, rule } of candidates) {
      try {
        const age = now - entry.created_at;
        if (!entry.tier2_sent_at && rule.tier2_message) {
          if (age < TIER2_DELAY_MS) continue;
          await sendDirectMessage(entry.recipient_igsid, renderMessage(rule.tier2_message, entry.ref_token, rule.short_path));
          await ctx.runMutation(internal.autoreply.markTierSentInternal, { id: entry._id, tier: 2 });
        } else if (!entry.tier3_sent_at && rule.tier3_message && age >= TIER3_DELAY_MS) {
          await sendDirectMessage(entry.recipient_igsid, renderMessage(rule.tier3_message, entry.ref_token, rule.short_path));
          await ctx.runMutation(internal.autoreply.markTierSentInternal, { id: entry._id, tier: 3 });
        }
      } catch (e: any) {
        await ctx.runMutation(internal.autoreply.recordFollowUpErrorInternal, {
          id: entry._id, error: e?.message?.slice(0, 300) || "Unknown error",
        });
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
      await sendDirectMessage(entry.recipient_igsid, renderMessage(rule.tier4_message, entry.ref_token, rule.short_path));
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

// ─── Keyword flows ──────────────────────────────────────────────────────────
// Whole-word match, so typos and variants are listed explicitly ("host" must not fire on "ghost").
const JOIN_URL = `${SITE_URL}/join`;
const PUBLIC_REPLY = "Stoked to hear from you! 🤙 Check your DMs for more details.";
const AUTOREPLY_FLOWS = [
  {
    keywords: ["collab", "collabs", "colab", "colabs", "collabo", "collabing", "collabnb", "collaborate", "collaborating", "collaboration", "collaborations"],
    signup_url: `${JOIN_URL}?role=creator&join=true`,
    short_path: "collab",
    public_reply: PUBLIC_REPLY,
    dm_message: "Hey! Thanks for commenting 👋 Here's the link to join Collabnb as a creator: {{link}} Browse boutique stays looking to collab with creators like you.",
    tier2_message: "Hey! Just checking you saw this 👋 Here's your creator link again in case it got buried: {{link}}",
    tier3_message: "Last nudge from us 👋 Creators get a free 30-day trial, and signing up only takes a few minutes: {{link}}",
    tier4_message: "Welcome to Collabnb 🎉 Next step: finish your profile so hosts can see your work. Follow @collabnb for new stays as they open up.",
  },
  {
    keywords: ["host", "hosts", "hosting", "hosted", "hoster", "hostess", "hotelier", "hoteliers"],
    signup_url: `${JOIN_URL}?role=host&join=true`,
    short_path: "hosts",
    public_reply: PUBLIC_REPLY,
    dm_message: "Hey! Thanks for the interest 👋 Here's the link to list your stay on Collabnb: {{link}} Connect with vetted creators who want to feature places like yours.",
    tier2_message: "Hey! Just checking you saw this 👋 Here's your host link again in case it got buried: {{link}}",
    tier3_message: "Last nudge from us 👋 It only takes a few minutes to get your stay in front of creators: {{link}}",
    tier4_message: "Welcome to Collabnb 🎉 Next step: post your first collab listing so creators can apply. Follow @collabnb for tips and updates.",
  },
  {
    keywords: ["founder", "founders", "founding", "foundr", "foundrs"],
    signup_url: `${JOIN_URL}#founding`,
    short_path: "founder",
    public_reply: PUBLIC_REPLY,
    dm_message: "Hey! The first 100 verified hosts and first 100 verified creators become Collabnb Founders: free lifetime access, a founder badge and first look at new collabs. Apply here: {{link}}",
    tier2_message: "Hey! Just checking you saw this 👋 Founder spots are limited to the first 100 hosts and 100 creators. Here's the link again: {{link}}",
    tier3_message: "Last nudge from us 👋 Founder spots go to the first 100 verified hosts and 100 verified creators: {{link}}",
    tier4_message: "Thanks for applying 🎉 Our team reviews every account before confirming Founder status. Follow @collabnb for updates.",
  },
  {
    keywords: ["referral", "referrals", "referal", "referals", "refferal", "refferals", "refer", "refers", "referred", "referring", "reffer", "ref", "invite code"],
    signup_url: `${JOIN_URL}#referral`,
    short_path: "referral",
    public_reply: PUBLIC_REPLY,
    dm_message: "Hey! Every Collabnb member gets a referral code. Friends who join with it get a 45-day free trial instead of 30. Sign up to get yours, or enter a friend's code when you join: {{link}}",
    tier2_message: "Hey! Just checking you saw this 👋 Here's the signup link again so you can get your referral code: {{link}}",
    tier3_message: "Last nudge from us 👋 Your referral code is ready as soon as you sign up: {{link}}",
    tier4_message: "Welcome to Collabnb 🎉 Your referral code is in your account, so you can share it with friends now. Follow @collabnb for updates.",
  },
  {
    keywords: ["ambassador", "ambassadors", "ambasador", "ambasadors", "ambassader", "embassador", "ambassadorship"],
    signup_url: `${SITE_URL}/ambassadors#apply`,
    short_path: "ambassador",
    public_reply: PUBLIC_REPLY,
    dm_message: "Hey! Collabnb Country Ambassadors bring hosts and creators on through their own link and earn a share of the platform fee on their collabs. Five spots per country. Apply here: {{link}}",
    tier2_message: "Hey! Just checking you saw this 👋 Here's the ambassador application again: {{link}}",
    tier3_message: "Last nudge from us 👋 If you've already applied, we'll be in touch. If not, ambassador spots are limited per country: {{link}}",
  },
  {
    keywords: ["plus", "pluss", "creatorplus", "collabnbplus"],
    signup_url: `${SITE_URL}/pricing/`,
    short_path: "plus",
    public_reply: PUBLIC_REPLY,
    dm_message: "Hey! Creator Plus keeps you applying to stays and messaging hosts after your free 30-day trial. It's $10/month or $60/year, and browsing stays free. See the plans: {{link}}",
    tier2_message: "Hey! Just checking you saw this 👋 Here are the Creator Plus plans again: {{link}}",
    tier3_message: "Last nudge from us 👋 The yearly Creator Plus plan is $60, which saves you $60 compared to paying monthly: {{link}}",
  },
];

// Safe to re-run: updates the rule holding each flow's first keyword, otherwise adds it.
// Run with: npx convex run --prod autoreply:seedFlows
export const seedFlows = internalMutation({
  args: { linksOnly: v.optional(v.boolean()) },
  handler: async (ctx, { linksOnly }) => {
    const rules = await ctx.db.query("autoreply_rules").collect();
    const result: Record<string, string> = {};
    for (const flow of AUTOREPLY_FLOWS) {
      const name = flow.keywords[0];
      const fields = { ...flow, match_mode: "word" as const, post_id: undefined };
      const existing = rules.find((r) => !r.post_id && r.keywords.includes(name));
      if (existing) {
        await ctx.db.patch(existing._id, linksOnly ? { short_path: flow.short_path } : fields);
        result[name] = "updated";
      } else {
        await ctx.db.insert("autoreply_rules", { ...fields, active: true, trigger_count: 0, created_at: Date.now() });
        result[name] = "added";
      }
    }
    return result;
  },
});
