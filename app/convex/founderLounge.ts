import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuthedProfile, getAuthedProfile } from "./lib/auth";
import { cleanPlainText } from "./lib/sanitize";
import { enforceRateLimit, RATE_LIMITS } from "./lib/rateLimit";

const room = v.union(v.literal("creator"), v.literal("host"));
const ALLOWED_EMOJI = ["🔥", "🙌", "❤️", "👀", "💭"];

function canUseRoom(profile: any, r: "creator" | "host") {
  if (profile.is_admin === true) return true;
  return profile.is_founder === true && profile.role === r;
}

export const list = query({
  args: { room },
  handler: async (ctx, { room: r }) => {
    const me = await getAuthedProfile(ctx);
    if (!me || !canUseRoom(me, r)) return [];
    const posts = await ctx.db
      .query("founder_posts")
      .withIndex("by_room", (q) => q.eq("room", r))
      .order("desc")
      .take(300);
    const authorIds = [...new Set(posts.map((p) => p.author_id))];
    const authors: Record<string, any> = {};
    for (const id of authorIds) {
      const a = await ctx.db.get(id as any) as any;
      if (a) authors[id] = { name: a.full_name || a.username, avatar: a.avatar_url, founder: a.is_founder === true };
    }
    const shape = (p: any) => ({
      id: p._id,
      author_id: p.author_id,
      author: authors[p.author_id]?.name ?? "Founder",
      avatar: authors[p.author_id]?.avatar,
      founder: authors[p.author_id]?.founder ?? false,
      text: p.text,
      created_at: p.created_at,
      reactions: (p.reactions ?? []).map((x: any) => ({ e: x.emoji, n: x.user_ids.length, mine: x.user_ids.includes(String(me._id)) })),
    });
    const threads = posts.filter((p) => !p.parent_id).map(shape).reverse();
    const byId = new Map(threads.map((t: any) => [t.id, { ...t, replies: [] as any[] }]));
    for (const p of posts.filter((p) => p.parent_id).reverse()) {
      byId.get(p.parent_id as any)?.replies.push(shape(p));
    }
    return [...byId.values()];
  },
});

export const post = mutation({
  args: { room, text: v.string(), parentId: v.optional(v.id("founder_posts")) },
  handler: async (ctx, { room: r, text, parentId }) => {
    const me = await requireAuthedProfile(ctx);
    if (!canUseRoom(me, r)) throw new ConvexError("The lounge is for founding members.");
    const clean = cleanPlainText(text, 2000).trim();
    if (!clean) throw new ConvexError("Write something first.");
    if (parentId) {
      const parent = await ctx.db.get(parentId);
      if (!parent || parent.room !== r || parent.parent_id) throw new ConvexError("Thread not found.");
    }
    await enforceRateLimit(ctx, `founder_post_burst:${me._id}`, RATE_LIMITS.FOUNDER_POST_BURST);
    await enforceRateLimit(ctx, `founder_post:${me._id}`, RATE_LIMITS.FOUNDER_POST);
    const recent = await ctx.db.query("founder_posts").withIndex("by_room", (q) => q.eq("room", r)).order("desc").take(20);
    if (recent.some((p) => p.author_id === String(me._id) && p.text === clean && Date.now() - p.created_at < 10 * 60 * 1000)) {
      throw new ConvexError("You already posted that.");
    }
    return await ctx.db.insert("founder_posts", {
      room: r, author_id: String(me._id), parent_id: parentId, text: clean, created_at: Date.now(),
    });
  },
});

export const react = mutation({
  args: { postId: v.id("founder_posts"), emoji: v.string() },
  handler: async (ctx, { postId, emoji }) => {
    const me = await requireAuthedProfile(ctx);
    const p = await ctx.db.get(postId);
    if (!p || !canUseRoom(me, p.room)) throw new ConvexError("Not allowed.");
    if (!ALLOWED_EMOJI.includes(emoji)) throw new ConvexError("Unsupported reaction.");
    await enforceRateLimit(ctx, `founder_react:${me._id}`, RATE_LIMITS.FOUNDER_REACT);
    const uid = String(me._id);
    let reactions = p.reactions ?? [];
    const existing = reactions.find((x) => x.emoji === emoji);
    if (existing?.user_ids.includes(uid)) {
      reactions = reactions
        .map((x) => x.emoji === emoji ? { ...x, user_ids: x.user_ids.filter((u) => u !== uid) } : x)
        .filter((x) => x.user_ids.length > 0);
    } else if (existing) {
      reactions = reactions.map((x) => x.emoji === emoji ? { ...x, user_ids: [...x.user_ids, uid] } : x);
    } else {
      reactions = [...reactions, { emoji, user_ids: [uid] }];
    }
    await ctx.db.patch(postId, { reactions });
  },
});

export const remove = mutation({
  args: { postId: v.id("founder_posts") },
  handler: async (ctx, { postId }) => {
    const me = await requireAuthedProfile(ctx);
    const p = await ctx.db.get(postId);
    if (!p) return;
    if (p.author_id !== String(me._id) && me.is_admin !== true) throw new ConvexError("Not allowed.");
    const replies = await ctx.db.query("founder_posts").withIndex("by_parent", (q) => q.eq("parent_id", postId)).collect();
    for (const r of replies) await ctx.db.delete(r._id);
    await ctx.db.delete(postId);
  },
});
