import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOwnerOrAdmin, requireAdmin, canAccessOwner } from "./lib/auth";
import { enforceRateLimit, RATE_LIMITS } from "./lib/rateLimit";

export const MAX_WISHLIST_ITEMS = 20;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const listForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    if (!(await canAccessOwner(ctx, userId))) return [];
    return ctx.db.query("creator_wishlist").withIndex("by_user", (q) => q.eq("user_id", userId)).collect();
  },
});

export const add = mutation({
  args: { userId: v.string(), kind: v.string(), name: v.string(), place: v.optional(v.string()) },
  handler: async (ctx, { userId, kind, name, place }) => {
    await requireOwnerOrAdmin(ctx, userId);
    await enforceRateLimit(ctx, `wishlist:${userId}`, RATE_LIMITS.WISHLIST_WRITE);
    if (kind !== "hotel" && kind !== "location") throw new ConvexError("Pick a hotel or a destination.");
    const clean = name.trim().slice(0, 80);
    if (norm(clean).length < 2) throw new ConvexError(kind === "hotel" ? "Type the hotel's name." : "Type a destination.");
    const key = `${kind}:${norm(clean)}`;
    const mine = await ctx.db.query("creator_wishlist").withIndex("by_user", (q) => q.eq("user_id", userId)).collect();
    if (mine.some((w) => w.key === key)) throw new ConvexError("That's already on your wishlist.");
    if (mine.length >= MAX_WISHLIST_ITEMS) throw new ConvexError(`Your wishlist holds up to ${MAX_WISHLIST_ITEMS} places. Remove one to add another.`);
    return ctx.db.insert("creator_wishlist", {
      user_id: userId,
      kind,
      name: clean,
      place: kind === "hotel" ? place?.trim().slice(0, 80) || undefined : undefined,
      key,
      created_at: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("creator_wishlist") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (!row) return;
    await requireOwnerOrAdmin(ctx, row.user_id);
    await ctx.db.delete(id);
  },
});

export const adminDemand = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("creator_wishlist").collect();
    const groups = new Map<string, { key: string; kind: string; name: string; place?: string; count: number; latest: number }>();
    for (const r of rows) {
      const g = groups.get(r.key) || { key: r.key, kind: r.kind, name: r.name, place: r.place, count: 0, latest: 0 };
      g.count++;
      g.latest = Math.max(g.latest, r.created_at);
      if (!g.place && r.place) g.place = r.place;
      groups.set(r.key, g);
    }
    return [...groups.values()].sort((a, b) => b.count - a.count || b.latest - a.latest);
  },
});
