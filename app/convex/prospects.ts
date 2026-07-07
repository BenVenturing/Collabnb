import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { llmChat } from "./blog";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tierFromFollowers(count?: number): string | undefined {
  if (count === undefined || count === null) return undefined;
  if (count < 10_000) return "nano";
  if (count < 50_000) return "micro";
  if (count < 250_000) return "mid";
  return "macro";
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getByKind = query({
  args: {
    kind: v.string(), // 'creator' | 'host'
    status: v.optional(v.string()),
    tier: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let rows = await ctx.db
      .query("prospects")
      .withIndex("by_kind_status", (q) =>
        args.status ? q.eq("kind", args.kind).eq("status", args.status) : q.eq("kind", args.kind)
      )
      .collect();
    if (args.tier) rows = rows.filter((r) => r.tier === args.tier);
    if (args.location) {
      const loc = args.location.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.location || "").toLowerCase().includes(loc) ||
          (r.country || "").toLowerCase().includes(loc)
      );
    }
    return rows.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  },
});

// Today's outreach queue: prospects queued for today (or overdue), both kinds.
export const getTodayQueue = query({
  args: {},
  handler: async (ctx) => {
    const today = todayKey();
    const rows = await ctx.db.query("prospects").collect();
    return rows
      .filter((r) => r.status === "queued" && (r.queued_for ?? today) <= today)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("prospects").collect();
    const byKind = (kind: string) => rows.filter((r) => r.kind === kind);
    const count = (list: typeof rows, status: string) =>
      list.filter((r) => r.status === status).length;
    const stats = (kind: string) => {
      const list = byKind(kind);
      return {
        total: list.length,
        new: count(list, "new"),
        queued: count(list, "queued"),
        contacted: count(list, "contacted"),
        replied: count(list, "replied"),
        signed: count(list, "signed"),
      };
    };
    const today = todayKey();
    const contactedToday = rows.filter(
      (r) => r.contacted_at && new Date(r.contacted_at).toISOString().slice(0, 10) === today
    );
    return {
      creators: stats("creator"),
      hosts: stats("host"),
      contactedToday: {
        creators: contactedToday.filter((r) => r.kind === "creator").length,
        hosts: contactedToday.filter((r) => r.kind === "host").length,
      },
    };
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const add = mutation({
  args: {
    kind: v.string(),
    instagramHandle: v.string(),
    displayName: v.optional(v.string()),
    followerCount: v.optional(v.number()),
    location: v.optional(v.string()),
    country: v.optional(v.string()),
    niche: v.optional(v.string()),
    email: v.optional(v.string()),
    bio: v.optional(v.string()),
    website: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const handle = args.instagramHandle.replace(/^@/, "").trim().toLowerCase();
    if (!handle) throw new Error("Instagram handle is required");
    const existing = await ctx.db
      .query("prospects")
      .withIndex("by_handle", (q) => q.eq("instagram_handle", handle))
      .first();
    if (existing) throw new Error(`@${handle} is already in the list`);
    return await ctx.db.insert("prospects", {
      kind: args.kind,
      instagram_handle: handle,
      display_name: args.displayName,
      follower_count: args.followerCount,
      tier: tierFromFollowers(args.followerCount),
      location: args.location,
      country: args.country,
      niche: args.niche,
      email: args.email,
      bio: args.bio,
      website: args.website,
      notes: args.notes,
      source: "manual",
      status: "new",
      created_at: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: { id: v.id("prospects"), status: v.string() },
  handler: async (ctx, { id, status }) => {
    const patch: Record<string, any> = { status };
    if (status === "contacted") patch.contacted_at = Date.now();
    if (status === "replied") patch.replied_at = Date.now();
    await ctx.db.patch(id, patch);
  },
});

export const update = mutation({
  args: {
    id: v.id("prospects"),
    displayName: v.optional(v.string()),
    followerCount: v.optional(v.number()),
    location: v.optional(v.string()),
    country: v.optional(v.string()),
    niche: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    dmDraft: v.optional(v.string()),
    score: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const patch: Record<string, any> = {};
    if (fields.displayName !== undefined) patch.display_name = fields.displayName;
    if (fields.followerCount !== undefined) {
      patch.follower_count = fields.followerCount;
      patch.tier = tierFromFollowers(fields.followerCount);
    }
    if (fields.location !== undefined) patch.location = fields.location;
    if (fields.country !== undefined) patch.country = fields.country;
    if (fields.niche !== undefined) patch.niche = fields.niche;
    if (fields.email !== undefined) patch.email = fields.email;
    if (fields.notes !== undefined) patch.notes = fields.notes;
    if (fields.dmDraft !== undefined) patch.dm_draft = fields.dmDraft;
    if (fields.score !== undefined) patch.score = fields.score;
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("prospects") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// Fill today's queue: promote the top-scored 'new' prospects to 'queued' until
// the daily target (default 20 creators + 20 hosts) is reached.
export const buildTodayQueue = mutation({
  args: { perKind: v.optional(v.number()) },
  handler: async (ctx, { perKind = 20 }) => {
    const today = todayKey();
    const all = await ctx.db.query("prospects").collect();
    let promoted = 0;
    for (const kind of ["creator", "host"]) {
      const alreadyQueued = all.filter(
        (r) => r.kind === kind && r.status === "queued" && (r.queued_for ?? today) <= today
      ).length;
      const need = Math.max(0, perKind - alreadyQueued);
      const candidates = all
        .filter((r) => r.kind === kind && r.status === "new")
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, need);
      for (const c of candidates) {
        await ctx.db.patch(c._id, { status: "queued", queued_for: today });
        promoted++;
      }
    }
    return { promoted };
  },
});

export const getById = internalQuery({
  args: { id: v.id("prospects") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

// Draft a personalized outreach DM with the writer LLM (NVIDIA chain) and save
// it on the prospect. The DM itself is still sent manually — ToS safety.
export const generateDmDraft = action({
  args: { id: v.id("prospects") },
  handler: async (ctx, { id }): Promise<string> => {
    const p: any = await ctx.runQuery(internal.prospects.getById, { id });
    if (!p) throw new Error("Prospect not found");

    const who = [
      `Instagram handle: @${p.instagram_handle}`,
      p.display_name && `Name: ${p.display_name}`,
      p.follower_count && `Followers: ${p.follower_count}`,
      p.niche && `Niche: ${p.niche}`,
      p.location && `Location: ${p.location}`,
      p.bio && `Bio: ${p.bio}`,
    ].filter(Boolean).join("\n");

    const pitch = p.kind === "creator"
      ? "Invite them to join Collabnb as a travel creator — they pitch boutique stays and trade content for nights, with contracts and payments handled on the platform."
      : "Invite them to list their boutique stay on Collabnb — vetted UGC creators trade content for nights, giving them a stream of marketing content without an agency.";

    const raw = await llmChat([
      { role: "system", content: "You write short Instagram DMs for Ben, the founder of Collabnb (collabnb.com) — a marketplace connecting boutique stays with UGC travel creators for content-for-stay collabs. Sound like a real person typing on their phone: warm, specific, zero marketing-speak. Never use 'elevate', 'unlock', 'leverage', 'seamless', 'game-changer', or exclamation marks back to back." },
      { role: "user", content: `Write ONE Instagram DM (max 450 characters, 2-3 short paragraphs, no hashtags, at most one emoji). Personalize it with a specific detail from their profile. ${pitch} End with a soft ask and the link collabnb.com/join. Return only the DM text.\n\n${who}` },
    ], 250);

    const dmDraft = raw.trim().replace(/^["']|["']$/g, "").slice(0, 900);
    await ctx.runMutation(api.prospects.update, { id, dmDraft });
    return dmDraft;
  },
});

export const bulkInsert = internalMutation({
  args: {
    rows: v.array(
      v.object({
        kind: v.string(),
        instagram_handle: v.string(),
        display_name: v.optional(v.string()),
        avatar_url: v.optional(v.string()),
        follower_count: v.optional(v.number()),
        engagement_rate: v.optional(v.number()),
        location: v.optional(v.string()),
        country: v.optional(v.string()),
        niche: v.optional(v.string()),
        email: v.optional(v.string()),
        bio: v.optional(v.string()),
        website: v.optional(v.string()),
        source: v.string(),
      })
    ),
  },
  handler: async (ctx, { rows }) => {
    let inserted = 0;
    for (const row of rows) {
      const handle = row.instagram_handle.replace(/^@/, "").trim().toLowerCase();
      if (!handle) continue;
      const existing = await ctx.db
        .query("prospects")
        .withIndex("by_handle", (q) => q.eq("instagram_handle", handle))
        .first();
      if (existing) continue;
      await ctx.db.insert("prospects", {
        ...row,
        instagram_handle: handle,
        tier: tierFromFollowers(row.follower_count),
        status: "new",
        created_at: Date.now(),
      });
      inserted++;
    }
    return { inserted };
  },
});

// ─── Actions (API-key ready) ──────────────────────────────────────────────────

// Import prospects from an Apify Instagram scraper run.
// Requires: npx convex env set APIFY_API_TOKEN apify_api_...
// Uses the Instagram Search Scraper (hashtag/location based) via the sync
// run-and-get-items endpoint, then dedupes into the prospects table.
export const importFromApify = action({
  args: {
    kind: v.string(),        // 'creator' | 'host'
    searchQuery: v.string(), // hashtag or keyword, e.g. "travelcreator" / "boutiquehotel"
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ inserted: number; fetched: number }> => {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
      throw new Error(
        "APIFY_API_TOKEN is not set. Get one at apify.com, then run: npx convex env set APIFY_API_TOKEN apify_api_..."
      );
    }

    const limit = Math.min(args.limit ?? 50, 200);
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-search-scraper/run-sync-get-dataset-items?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          search: args.searchQuery,
          searchType: "user",
          resultsLimit: limit,
        }),
      }
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => String(res.status));
      throw new Error(`Apify request failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    const items: any[] = await res.json();

    const rows = items
      .filter((it) => it?.username)
      .map((it) => ({
        kind: args.kind,
        instagram_handle: String(it.username),
        display_name: it.fullName ? String(it.fullName) : undefined,
        avatar_url: it.profilePicUrl ? String(it.profilePicUrl) : undefined,
        follower_count: typeof it.followersCount === "number" ? it.followersCount : undefined,
        bio: it.biography ? String(it.biography).slice(0, 500) : undefined,
        website: it.externalUrl ? String(it.externalUrl) : undefined,
        email:
          typeof it.biography === "string"
            ? (it.biography.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [])[0]
            : undefined,
        source: "apify",
      }));

    const { inserted } = await ctx.runMutation(internal.prospects.bulkInsert, { rows });
    return { inserted, fetched: items.length };
  },
});
