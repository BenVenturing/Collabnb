import { v } from "convex/values";
import { query, mutation, action, internalAction, internalMutation, internalQuery } from "./_generated/server";
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

// Mirrors NICHE_KEYWORDS in app/src/lib/matchScore.js (client lib can't be
// imported into Convex). Keys drive the niche dropdown in Discovery.
export const NICHE_SEARCH_TERMS: Record<string, string[]> = {
  'travel': ['travel', 'wanderlust', 'getaway'],
  'cabins & stays': ['cabin', 'cozy', 'lodge'],
  'mountain': ['mountain', 'alpine', 'hiking'],
  'beach': ['beach', 'ocean', 'island'],
  'coastal': ['coastal', 'sea', 'waterfront'],
  'outdoors': ['outdoor', 'nature', 'wilderness'],
  'adventure': ['adventure', 'hiking', 'explore'],
  'lifestyle': ['lifestyle', 'cozy', 'slow living'],
  'food & dining': ['food', 'culinary', 'vineyard'],
  'fashion': ['fashion', 'style', 'boutique'],
  'fitness': ['fitness', 'yoga', 'active'],
  'wellness': ['wellness', 'spa', 'retreat'],
  'photography': ['photo', 'scenic', 'sunset'],
  'tech': ['tech', 'smart', 'modern'],
  'city life': ['city', 'urban', 'rooftop'],
  'eco & sustainable': ['eco', 'sustainable', 'off-grid'],
  'luxury': ['luxury', 'villa', 'upscale'],
  'design': ['design', 'interior', 'architecture'],
};

function apifyToken(): string {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error(
      "APIFY_API_TOKEN is not set. Get one at apify.com, then run: npx convex env set APIFY_API_TOKEN apify_api_..."
    );
  }
  return token;
}

// Run an Apify actor synchronously and return its dataset items.
async function apifyRun(actorId: string, input: Record<string, any>): Promise<any[]> {
  const token = apifyToken();
  const res = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => String(res.status));
    throw new Error(`Apify request failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return await res.json();
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

// Log-scale follower reach: ~30 @ 1k, ~55 @ 10k, ~80 @ 100k, 100 @ 1M+.
function reachScore(followers?: number): number {
  if (!followers || followers < 100) return 5;
  return Math.min(100, Math.round((Math.log10(followers) - 2) * 25));
}

// Avg video views relative to follower count: a 0.30+ ratio is excellent.
function viewsScore(avgViews: number, followers?: number): number {
  if (!avgViews) return 0;
  if (!followers) return 30;
  const ratio = avgViews / followers;
  return Math.min(100, Math.round((ratio / 0.3) * 100));
}

// Metrics half of the quality score: engagement rate + posting cadence.
function metricQuality(posts: any[], followers?: number): number {
  if (!posts.length) return 0;
  let engagement = 30;
  if (followers) {
    const avgInteractions =
      posts.reduce((s, p) => s + (p.likes ?? 0) + (p.comments ?? 0), 0) / posts.length;
    const rate = avgInteractions / followers; // 3%+ is strong
    engagement = Math.min(100, Math.round((rate / 0.03) * 100));
  }
  let cadence = 30;
  const times = posts.map((p) => p.taken_at).filter(Boolean) as number[];
  if (times.length >= 2) {
    const spanDays = (Math.max(...times) - Math.min(...times)) / 86_400_000;
    const perWeek = ((times.length - 1) / Math.max(spanDays, 1)) * 7; // 2+/week is strong
    cadence = Math.min(100, Math.round((perWeek / 2) * 100));
  }
  return Math.round(engagement * 0.7 + cadence * 0.3);
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

    // Best recent post (by views, then likes) — set by profile enrichment.
    const bestPost = (p.recent_posts || [])
      .slice()
      .sort((a: any, b: any) => ((b.views ?? b.likes ?? 0) - (a.views ?? a.likes ?? 0)))[0];

    const who = [
      `Instagram handle: @${p.instagram_handle}`,
      p.display_name && `Name: ${p.display_name}`,
      p.follower_count && `Followers: ${p.follower_count}`,
      p.niche && `Niche: ${p.niche}`,
      p.location && `Location: ${p.location}`,
      p.bio && `Bio: ${p.bio}`,
      bestPost && `Their recent ${bestPost.type} post${bestPost.views ? ` (${bestPost.views.toLocaleString()} views)` : ""}: "${bestPost.caption.slice(0, 200)}"`,
    ].filter(Boolean).join("\n");

    const pitch = p.kind === "creator"
      ? "Invite them to join Collabnb as a travel creator — they pitch boutique stays and trade content for nights, with contracts and payments handled on the platform."
      : "Invite them to list their boutique stay on Collabnb — vetted UGC creators trade content for nights, giving them a stream of marketing content without an agency.";

    const postInstruction = bestPost
      ? "Open with a specific, genuine reference to the recent post quoted below — react to it like a real follower would, then pivot to the invite."
      : "If the facts are thin, keep the opener general (their niche, location, or vibe).";

    const raw = await llmChat([
      { role: "system", content: "You write short Instagram DMs for Ben, the founder of Collabnb (collabnb.com) — a creator-first hospitality marketing platform connecting boutique properties with vetted creators for professional campaigns. Sound like a real person typing on their phone: warm, specific, zero marketing-speak. Never use 'elevate', 'unlock', 'leverage', 'seamless', 'game-changer', or exclamation marks back to back. Output ONLY the DM text itself — no introduction line, no quotes around it, no commentary." },
      { role: "user", content: `Write ONE Instagram DM (max 450 characters, 2-3 short paragraphs, no hashtags, at most one emoji). Personalize ONLY with the profile facts below — never invent posts, photos, or details they haven't shared. ${postInstruction} ${pitch} End with a soft ask and the link collabnb.com/join.\n\n${who}` },
    ], 250);

    // Strip a leaked "Here is..." preamble line and wrapping quotes.
    let dmDraft = raw.trim();
    const lines = dmDraft.split("\n");
    if (lines.length > 1 && /^(here('s| is)|sure|below is)/i.test(lines[0]) && lines[0].length < 90) {
      dmDraft = lines.slice(1).join("\n").trim();
    }
    dmDraft = dmDraft.replace(/^["'“”]+|["'“”]+$/g, "").slice(0, 900);
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
    const limit = Math.min(args.limit ?? 50, 200);
    const items = await apifyRun("apify~instagram-search-scraper", {
      search: args.searchQuery,
      searchType: "user",
      resultsLimit: limit,
    });

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

// ─── Enrichment & scoring ─────────────────────────────────────────────────────

export const getByHandles = internalQuery({
  args: { handles: v.array(v.string()) },
  handler: async (ctx, { handles }) => {
    const docs = [];
    for (const h of handles) {
      const doc = await ctx.db
        .query("prospects")
        .withIndex("by_handle", (q) => q.eq("instagram_handle", h))
        .first();
      if (doc) docs.push(doc);
    }
    return docs;
  },
});

export const saveEnrichment = internalMutation({
  args: {
    id: v.id("prospects"),
    score: v.number(),
    scoreReach: v.number(),
    scoreViews: v.number(),
    scoreQuality: v.number(),
    avgVideoViews: v.optional(v.number()),
    engagementRate: v.optional(v.number()),
    followerCount: v.optional(v.number()),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    displayName: v.optional(v.string()),
    recentPosts: v.optional(v.array(v.object({
      caption: v.string(),
      type: v.string(),
      views: v.optional(v.number()),
      likes: v.optional(v.number()),
      comments: v.optional(v.number()),
      url: v.optional(v.string()),
      taken_at: v.optional(v.number()),
    }))),
  },
  handler: async (ctx, { id, ...f }) => {
    const patch: Record<string, any> = {
      score: f.score,
      score_reach: f.scoreReach,
      score_views: f.scoreViews,
      score_quality: f.scoreQuality,
      enriched_at: Date.now(),
    };
    if (f.avgVideoViews !== undefined) patch.avg_video_views = f.avgVideoViews;
    if (f.engagementRate !== undefined) patch.engagement_rate = f.engagementRate;
    if (f.followerCount !== undefined) {
      patch.follower_count = f.followerCount;
      patch.tier = tierFromFollowers(f.followerCount);
    }
    if (f.bio !== undefined) patch.bio = f.bio;
    if (f.avatarUrl !== undefined) patch.avatar_url = f.avatarUrl;
    if (f.displayName !== undefined) patch.display_name = f.displayName;
    if (f.recentPosts !== undefined) patch.recent_posts = f.recentPosts;
    await ctx.db.patch(id, patch);
  },
});

// Scrape recent posts for a batch of prospects (one Apify run for all handles),
// compute reach/views/quality sub-scores, and save. Returns enriched count.
async function enrichBatch(ctx: any, prospects: any[]): Promise<number> {
  if (!prospects.length) return 0;
  const items = await apifyRun("apify~instagram-profile-scraper", {
    usernames: prospects.map((p) => p.instagram_handle),
  });
  const byUsername = new Map<string, any>();
  for (const it of items) {
    if (it?.username) byUsername.set(String(it.username).toLowerCase(), it);
  }

  let enriched = 0;
  for (const p of prospects) {
    const it = byUsername.get(p.instagram_handle);
    if (!it) continue;

    const followers = typeof it.followersCount === "number" ? it.followersCount : p.follower_count;
    const posts = (Array.isArray(it.latestPosts) ? it.latestPosts : [])
      .map((post: any) => ({
        caption: String(post.caption || "").slice(0, 300),
        type: /video/i.test(String(post.type || "")) ? "video"
          : /sidecar|carousel/i.test(String(post.type || "")) ? "carousel" : "image",
        views: typeof post.videoViewCount === "number" ? post.videoViewCount
          : typeof post.videoPlayCount === "number" ? post.videoPlayCount : undefined,
        likes: typeof post.likesCount === "number" ? post.likesCount : undefined,
        comments: typeof post.commentsCount === "number" ? post.commentsCount : undefined,
        url: post.url ? String(post.url) : undefined,
        taken_at: post.timestamp ? new Date(post.timestamp).getTime() : undefined,
      }));

    const videos = posts.filter((post: any) => post.type === "video" && post.views);
    const avgViews = videos.length
      ? Math.round(videos.reduce((s: number, post: any) => s + post.views, 0) / videos.length)
      : 0;

    const sReach = reachScore(followers);
    const sViews = viewsScore(avgViews, followers);
    const sMetric = metricQuality(posts, followers);

    // LLM half of the quality score: caption craft + boutique-stay brand fit.
    let sLlm = sMetric;
    try {
      const captions = posts.slice(0, 5).map((post: any, i: number) => `${i + 1}. ${post.caption || "(no caption)"}`).join("\n");
      const raw = await llmChat([
        { role: "system", content: "You evaluate Instagram creators for Collabnb, a platform matching travel/lifestyle creators with boutique stays. Reply with ONLY a JSON object, no prose." },
        { role: "user", content: `Rate this creator 0-100 on content quality and fit for promoting boutique stays (caption craft, storytelling, aesthetic signals, travel/lifestyle relevance). Reply as {"quality": <number>, "reason": "<max 12 words>"}.\n\nBio: ${it.biography || p.bio || "(none)"}\nFollowers: ${followers ?? "?"}\nAvg video views: ${avgViews || "?"}\n\nRecent captions:\n${captions || "(none)"}` },
      ], 120);
      const m = raw.match(/"quality"\s*:\s*(\d{1,3})/);
      if (m) sLlm = Math.min(100, parseInt(m[1], 10));
    } catch {
      // LLM unavailable — metrics-only quality
    }
    const sQuality = Math.round(sMetric * 0.5 + sLlm * 0.5);
    const score = Math.round(sViews * 0.35 + sQuality * 0.35 + sReach * 0.3);

    const avgEngagement = posts.length && followers
      ? posts.reduce((s: number, post: any) => s + (post.likes ?? 0) + (post.comments ?? 0), 0) / posts.length / followers
      : undefined;

    const topPosts = [...posts]
      .sort((a: any, b: any) => ((b.views ?? b.likes ?? 0) - (a.views ?? a.likes ?? 0)))
      .slice(0, 5);

    await ctx.runMutation(internal.prospects.saveEnrichment, {
      id: p._id,
      score,
      scoreReach: sReach,
      scoreViews: sViews,
      scoreQuality: sQuality,
      avgVideoViews: avgViews || undefined,
      engagementRate: avgEngagement !== undefined ? Math.round(avgEngagement * 10000) / 100 : undefined,
      followerCount: followers,
      bio: it.biography ? String(it.biography).slice(0, 500) : undefined,
      avatarUrl: it.profilePicUrl ? String(it.profilePicUrl) : undefined,
      displayName: it.fullName ? String(it.fullName) : undefined,
      recentPosts: topPosts,
    });
    enriched++;
  }
  return enriched;
}

// Analyze one prospect's profile on demand (the "Analyze profile" button).
export const enrichProspect = action({
  args: { id: v.id("prospects") },
  handler: async (ctx, { id }): Promise<{ enriched: boolean }> => {
    const p: any = await ctx.runQuery(internal.prospects.getById, { id });
    if (!p) throw new Error("Prospect not found");
    const n = await enrichBatch(ctx, [p]);
    if (n === 0) throw new Error(`Could not fetch @${p.instagram_handle} — the profile may be private or renamed`);
    return { enriched: true };
  },
});

// Shared flow: search Instagram for a niche (+ optional location), import new
// creators, enrich the top N by follower count, return the ranked results.
async function discoverAndScore(
  ctx: any,
  opts: { niche: string; location?: string; importLimit?: number; enrichTop?: number }
): Promise<{ imported: number; fetched: number; ranked: any[] }> {
  const keywords = NICHE_SEARCH_TERMS[opts.niche] || [opts.niche];
  const searchQuery = [keywords[0], "creator", opts.location].filter(Boolean).join(" ");
  const limit = Math.min(opts.importLimit ?? 30, 100);

  const items = await apifyRun("apify~instagram-search-scraper", {
    search: searchQuery,
    searchType: "user",
    resultsLimit: limit,
  });

  const rows = items
    .filter((it) => it?.username)
    .map((it) => ({
      kind: "creator",
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
      location: opts.location || undefined,
      niche: opts.niche,
      source: "niche-search",
    }));

  const { inserted } = await ctx.runMutation(internal.prospects.bulkInsert, { rows });

  const handles = rows.map((r) => r.instagram_handle.replace(/^@/, "").trim().toLowerCase());
  const docs: any[] = await ctx.runQuery(internal.prospects.getByHandles, { handles });
  const top = docs
    .filter((d) => d.kind === "creator")
    .sort((a, b) => (b.follower_count ?? 0) - (a.follower_count ?? 0))
    .slice(0, opts.enrichTop ?? 10);

  await enrichBatch(ctx, top);

  const refreshed: any[] = await ctx.runQuery(internal.prospects.getByHandles, {
    handles: top.map((d) => d.instagram_handle),
  });
  const ranked = refreshed.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return { imported: inserted, fetched: items.length, ranked };
}

// Niche search from the Discovery tab: import + score, return ranked top 10.
export const searchCreators = action({
  args: {
    niche: v.string(),
    location: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ imported: number; fetched: number; ranked: any[] }> => {
    return await discoverAndScore(ctx, {
      niche: args.niche,
      location: args.location,
      importLimit: args.limit,
      enrichTop: 10,
    });
  },
});

// Daily cron: auto-discover creators for the admin-configured location/niche.
// Config lives in admin_settings under 'discovery_auto' as JSON:
//   { enabled: boolean, location: string, niche: string, perDay: number }
export const runDailyDiscovery = internalAction({
  args: {},
  handler: async (ctx): Promise<{ ran: boolean; imported?: number }> => {
    const settings: Record<string, string> = await ctx.runQuery(api.admin.getSettings, {});
    let cfg: any = null;
    try { cfg = JSON.parse(settings.discovery_auto || "null"); } catch { /* bad JSON = off */ }
    if (!cfg?.enabled || !cfg?.niche) return { ran: false };
    const { imported } = await discoverAndScore(ctx, {
      niche: cfg.niche,
      location: cfg.location || undefined,
      importLimit: 30,
      enrichTop: Math.min(cfg.perDay ?? 10, 20),
    });
    return { ran: true, imported };
  },
});
