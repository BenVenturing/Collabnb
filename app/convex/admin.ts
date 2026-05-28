import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ─── Analytics ────────────────────────────────────────────────────────────────
export const getAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const [profiles, listings, collabs, pitchCounts] = await Promise.all([
      ctx.db.query("profiles").collect(),
      ctx.db.query("listings").collect(),
      ctx.db.query("collaborations").collect(),
      ctx.db.query("pitch_counts").collect(),
    ]);

    // ── User stats ──────────────────────────────────────────────────────────
    const creators = profiles.filter((p) => p.role === "creator");
    const hosts    = profiles.filter((p) => p.role === "host");
    const verified = profiles.filter((p) => p.is_verified === true);
    const pending  = profiles.filter((p) => p.is_verified !== true && p.is_rejected !== true);

    const founderCreators = creators.filter((p) => p.is_founder === true).length;
    const founderHosts    = hosts.filter((p) => p.is_founder === true).length;

    // ── Monthly signups — last 6 months ────────────────────────────────────
    const monthlySignups = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const yr  = d.getFullYear();
      const mo  = d.getMonth();
      const count = profiles.filter((p) => {
        const pd = new Date(p._creationTime);
        return pd.getFullYear() === yr && pd.getMonth() === mo;
      }).length;
      monthlySignups.push({
        label: d.toLocaleDateString("en-US", { month: "short" }),
        value: count,
      });
    }

    // ── Collab stats ────────────────────────────────────────────────────────
    const approvedCollabs  = collabs.filter((c) =>
      c.status === "approved" || c.current_stage === "approved"
    ).length;
    const completedCollabs = collabs.filter((c) =>
      c.status === "completed" || c.current_stage === "completed"
    ).length;
    const totalPitches = pitchCounts.reduce((s, pc) => s + pc.count, 0);

    // ── Top 5 listings by collab count ─────────────────────────────────────
    const collobByListing: Record<string, number> = {};
    collabs.forEach((c) => {
      if (c.listing_id) collobByListing[c.listing_id] = (collobByListing[c.listing_id] || 0) + 1;
    });
    const topListings = listings
      .map((l) => ({ label: l.title, value: collobByListing[l._id as string] || 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // ── Top 5 creators by pitch volume ─────────────────────────────────────
    const pitchByUser: Record<string, number> = {};
    pitchCounts.forEach((pc) => {
      pitchByUser[pc.user_id] = (pitchByUser[pc.user_id] || 0) + pc.count;
    });
    const topCreators = Object.entries(pitchByUser)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([userId, count]) => {
        const p = profiles.find((pr) => (pr._id as string) === userId);
        return { label: p?.username || p?.full_name || userId.slice(0, 8), value: count };
      });

    return {
      totalUsers: profiles.length,
      creators: creators.length,
      hosts: hosts.length,
      verified: verified.length,
      pending: pending.length,
      founderCreators,
      founderHosts,
      monthlySignups,
      totalListings: listings.length,
      publishedListings: listings.filter((l) => !l.status || l.status === "published").length,
      totalCollabs: collabs.length,
      approvedCollabs,
      completedCollabs,
      totalPitches,
      topListings,
      topCreators,
    };
  },
});

// ─── Settings ─────────────────────────────────────────────────────────────────
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("admin_settings").collect();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },
});

export const setSetting = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("admin_settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      await ctx.db.insert("admin_settings", { key: args.key, value: args.value });
    }
  },
});

export const getMaintenanceMode = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("admin_settings")
      .withIndex("by_key", (q) => q.eq("key", "maintenance_mode"))
      .first();
    return row?.value === "true";
  },
});
