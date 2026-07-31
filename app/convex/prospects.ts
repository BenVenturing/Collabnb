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

// ─── Host outreach copy templates ──────────────────────────────────────────────
// Five fixed angles for the daily host-outreach batch. The LLM adapts the
// [Hotel Name] token + one true personalization detail per prospect — it does
// not freely rewrite these, so the approved copy/tone stays intact.
export const HOST_OUTREACH_TEMPLATES: { id: string; name: string; template: string }[] = [
  {
    id: "curiosity",
    name: "Curiosity / Pain-Point",
    template: `Hi! Quick question — how are you currently finding creators to collaborate with at [Hotel Name]? 👀

I ask because we built Collabnb specifically to solve that — vetted creators who are actively looking for stays like yours, matched to you directly instead of hours of manual searching.

We're inviting our first 100 properties in as Founding Hosts this July — free, lifetime access. Would love for you to take a look: https://www.collabnb.com/`,
  },
  {
    id: "social_proof",
    name: "Social Proof / Momentum",
    template: `Hi! We've been onboarding some incredible boutique stays onto Collabnb lately, and [Hotel Name] immediately came to mind. 🌿

We connect properties like yours with vetted content creators for paid collaborations — no more sifting through DMs hoping someone's a good fit. We're currently welcoming our first 100 Founding Hosts, completely free for life.

Take a look: https://www.collabnb.com/`,
  },
  {
    id: "compliment",
    name: "Compliment-Led / Relationship",
    template: `Hi! Just came across [Hotel Name] and had to reach out — the content coming out of your account is genuinely beautiful. ✨

I'm Benjamin, founder of Collabnb — we help properties like yours connect with creators who'd love to collaborate and help tell that story even further. We're inviting our first 100 hosts in as founding members this July, completely free.

Would love for you to check it out: https://www.collabnb.com/`,
  },
  {
    id: "data_stat",
    name: "Data / Stat-Led",
    template: `Hi! Did you know 92% of travelers trust a creator's recommendation over a traditional ad? 📊

That's exactly why we built Collabnb — connecting boutique stays like [Hotel Name] with vetted creators for paid collaborations, so you get authentic content without the guesswork. We're welcoming our first 100 Founding Hosts this July, free for life.

Here's a look: https://www.collabnb.com/`,
  },
  {
    id: "founder_story",
    name: "Founder Story / Direct",
    template: `Hi! I'm Benjamin — I've spent 8+ years living and traveling through Indonesia, and I built Collabnb after seeing how hard it is for amazing stays like [Hotel Name] to consistently find the right creators to work with.

We're inviting our first 100 properties in as Founding Hosts this July — free, lifetime access, no fees, ever.

Would love for you to take a look: https://www.collabnb.com/`,
  },
];

// ─── Scraping providers: HikerAPI (primary) or Apify (fallback) ───────────────
// HikerAPI: npx convex env set HIKERAPI_KEY <access key from hikerapi.com>
// Apify:    npx convex env set APIFY_API_TOKEN apify_api_...

const NO_KEY_MSG =
  "No Instagram API key set. Set HIKERAPI_KEY (preferred — hikerapi.com) or APIFY_API_TOKEN (apify.com): npx convex env set HIKERAPI_KEY ...";

async function hikerGet(path: string, params: Record<string, any>): Promise<any> {
  const key = process.env.HIKERAPI_KEY!;
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, val]) => val !== undefined).map(([k, val]) => [k, String(val)])
  );
  const res = await fetch(`https://api.hikerapi.com${path}?${qs}`, {
    headers: { "x-access-key": key, accept: "application/json" },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => String(res.status));
    throw new Error(`HikerAPI request failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return await res.json();
}

// Run an Apify actor synchronously and return its dataset items.
async function apifyRun(actorId: string, input: Record<string, any>): Promise<any[]> {
  const token = process.env.APIFY_API_TOKEN!;
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

const emailFromBio = (bio?: string) =>
  typeof bio === "string" ? (bio.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [])[0] : undefined;

// Normalized account shape used by import/search/enrich regardless of provider.
type IgAccount = {
  username: string;
  fullName?: string;
  avatarUrl?: string;
  followers?: number;
  bio?: string;
  website?: string;
  email?: string;
};

type IgPost = {
  caption: string;
  type: string; // 'video' | 'image' | 'carousel'
  views?: number;
  likes?: number;
  comments?: number;
  url?: string;
  taken_at?: number;
};

// HikerAPI search responses vary in wrapping — dig the user list out defensively.
function extractHikerUsers(data: any): any[] {
  if (Array.isArray(data)) return data.map((u) => u?.user ?? u);
  for (const k of ["users", "accounts", "items"]) {
    if (Array.isArray(data?.[k])) return data[k].map((u: any) => u?.user ?? u);
    if (Array.isArray(data?.response?.[k])) return data.response[k].map((u: any) => u?.user ?? u);
  }
  return [];
}

// Search Instagram accounts by keyword. Returns normalized rows.
async function searchInstagramUsers(query: string, limit: number): Promise<IgAccount[]> {
  if (process.env.HIKERAPI_KEY) {
    const data = await hikerGet("/v2/search/accounts", { query });
    return extractHikerUsers(data)
      .filter((u) => u?.username && !u.is_private)
      .slice(0, limit)
      .map((u) => ({
        username: String(u.username),
        fullName: u.full_name ? String(u.full_name) : undefined,
        avatarUrl: u.profile_pic_url ? String(u.profile_pic_url) : undefined,
        followers: typeof u.follower_count === "number" ? u.follower_count : undefined,
        bio: u.biography ? String(u.biography).slice(0, 500) : undefined,
        website: u.external_url ? String(u.external_url) : undefined,
        email: u.public_email || emailFromBio(u.biography),
      }));
  }
  if (process.env.APIFY_API_TOKEN) {
    const items = await apifyRun("apify~instagram-search-scraper", {
      search: query,
      searchType: "user",
      resultsLimit: limit,
    });
    return items
      .filter((it) => it?.username)
      .map((it) => ({
        username: String(it.username),
        fullName: it.fullName ? String(it.fullName) : undefined,
        avatarUrl: it.profilePicUrl ? String(it.profilePicUrl) : undefined,
        followers: typeof it.followersCount === "number" ? it.followersCount : undefined,
        bio: it.biography ? String(it.biography).slice(0, 500) : undefined,
        website: it.externalUrl ? String(it.externalUrl) : undefined,
        email: emailFromBio(it.biography),
      }));
  }
  throw new Error(NO_KEY_MSG);
}

function normalizeHikerPost(m: any): IgPost {
  const isVideo = m.media_type === 2 || /clips|igtv/i.test(String(m.product_type || ""));
  const takenAt =
    typeof m.taken_at_ts === "number" ? m.taken_at_ts * 1000
      : typeof m.taken_at === "number" ? (m.taken_at > 1e12 ? m.taken_at : m.taken_at * 1000)
      : m.taken_at ? Date.parse(m.taken_at) || undefined
      : undefined;
  return {
    caption: String(m.caption_text || "").slice(0, 300),
    type: isVideo ? "video" : m.media_type === 8 ? "carousel" : "image",
    views: typeof m.play_count === "number" ? m.play_count
      : typeof m.view_count === "number" ? m.view_count : undefined,
    likes: typeof m.like_count === "number" ? m.like_count : undefined,
    comments: typeof m.comment_count === "number" ? m.comment_count : undefined,
    url: m.code ? `https://www.instagram.com/p/${m.code}/` : undefined,
    taken_at: takenAt,
  };
}

// Fetch full profiles + recent posts for a batch of usernames (normalized).
async function fetchProfilesWithPosts(
  usernames: string[]
): Promise<(IgAccount & { posts: IgPost[] })[]> {
  if (process.env.HIKERAPI_KEY) {
    const out: (IgAccount & { posts: IgPost[] })[] = [];
    for (const username of usernames) {
      let u: any;
      try {
        u = await hikerGet("/v1/user/by/username", { username });
      } catch {
        continue; // renamed/banned profile — skip, don't fail the batch
      }
      if (!u?.username) continue;
      let posts: IgPost[] = [];
      if (!u.is_private && u.pk) {
        try {
          const medias = await hikerGet("/v1/user/medias", { user_id: String(u.pk), amount: 12 });
          posts = (Array.isArray(medias) ? medias : []).map(normalizeHikerPost);
        } catch { /* medias unavailable — score on profile alone */ }
      }
      out.push({
        username: String(u.username).toLowerCase(),
        fullName: u.full_name ? String(u.full_name) : undefined,
        avatarUrl: u.profile_pic_url_hd || u.profile_pic_url || undefined,
        followers: typeof u.follower_count === "number" ? u.follower_count : undefined,
        bio: u.biography ? String(u.biography).slice(0, 500) : undefined,
        website: u.external_url ? String(u.external_url) : undefined,
        email: u.public_email || emailFromBio(u.biography),
        posts,
      });
    }
    return out;
  }
  if (process.env.APIFY_API_TOKEN) {
    const items = await apifyRun("apify~instagram-profile-scraper", { usernames });
    return items
      .filter((it) => it?.username)
      .map((it) => ({
        username: String(it.username).toLowerCase(),
        fullName: it.fullName ? String(it.fullName) : undefined,
        avatarUrl: it.profilePicUrl ? String(it.profilePicUrl) : undefined,
        followers: typeof it.followersCount === "number" ? it.followersCount : undefined,
        bio: it.biography ? String(it.biography).slice(0, 500) : undefined,
        website: it.externalUrl ? String(it.externalUrl) : undefined,
        email: emailFromBio(it.biography),
        posts: (Array.isArray(it.latestPosts) ? it.latestPosts : []).map((post: any) => ({
          caption: String(post.caption || "").slice(0, 300),
          type: /video/i.test(String(post.type || "")) ? "video"
            : /sidecar|carousel/i.test(String(post.type || "")) ? "carousel" : "image",
          views: typeof post.videoViewCount === "number" ? post.videoViewCount
            : typeof post.videoPlayCount === "number" ? post.videoPlayCount : undefined,
          likes: typeof post.likesCount === "number" ? post.likesCount : undefined,
          comments: typeof post.commentsCount === "number" ? post.commentsCount : undefined,
          url: post.url ? String(post.url) : undefined,
          taken_at: post.timestamp ? new Date(post.timestamp).getTime() : undefined,
        })),
      }));
  }
  throw new Error(NO_KEY_MSG);
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

// ─── Host outreach campaign (search → select → confirm, manual send) ──────────
// Flow: import a pool of candidates (~40/day) via search → admin ticks ~20 in
// a table (auto-select top-scored, can swap in from the rest as backups) →
// Confirm drafts + locks in only the selected ones → copy/send manually →
// mark contacted → export confirmed batch as CSV for the CRM.

// Candidate pool: imported hosts not yet confirmed for outreach.
export const getHostPool = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("prospects")
      .withIndex("by_kind_status", (q) => q.eq("kind", "host").eq("status", "new"))
      .collect();
    return rows.filter((r) => !r.published).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  },
});

// Angle usage across all hosts ever drafted — keeps the rotation balanced
// regardless of which surface (single card, bulk select, pool confirm) wrote it.
export const getHostAngleCounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("prospects")
      .withIndex("by_kind_status", (q) => q.eq("kind", "host"))
      .collect();
    const counts: Record<string, number> = {};
    for (const r of rows) if (r.dm_angle) counts[r.dm_angle] = (counts[r.dm_angle] || 0) + 1;
    return counts;
  },
});

function nextAngle(counts: Record<string, number>): (typeof HOST_OUTREACH_TEMPLATES)[number] {
  const sorted = [...HOST_OUTREACH_TEMPLATES].sort((a, b) => (counts[a.id] || 0) - (counts[b.id] || 0));
  const angle = sorted[0];
  counts[angle.id] = (counts[angle.id] || 0) + 1;
  return angle;
}

// Adapts a fixed angle template to one host's real facts via the writer LLM —
// shared by the single-card generator, bulk-select generator, and pool Confirm.
async function draftHostMessage(p: any, angle: (typeof HOST_OUTREACH_TEMPLATES)[number]): Promise<string> {
  const who = [
    `Listing name: ${p.display_name || `@${p.instagram_handle}`}`,
    p.location && `Location: ${p.location}`,
    p.niche && `Type/niche: ${p.niche}`,
    p.bio && `Instagram bio: ${p.bio}`,
  ].filter(Boolean).join("\n");

  try {
    const raw = await llmChat([
      {
        role: "system",
        content:
          "You adapt a fixed outreach template for Benjamin, founder of Collabnb (collabnb.com). You do NOT rewrite the message freely — you keep its structure, sentence order, tone, emoji, and call-to-action exactly as given. Your only job: replace every '[Hotel Name]' with the real listing name, and — only if a genuine matching fact is provided below (location, niche, bio) — lightly weave ONE of those facts into an existing sentence so it reads as personalized, without adding new sentences or inventing anything not given. Output ONLY the final message text, nothing else.",
      },
      {
        role: "user",
        content: `Template to adapt:\n"""\n${angle.template}\n"""\n\nListing facts (use ONLY what's given, never invent):\n${who || "(no extra facts — just swap in the listing name)"}`,
      },
    ], 300);
    let dmDraft = raw.trim().replace(/^["'“”]+|["'“”]+$/g, "");
    const lines = dmDraft.split("\n");
    if (lines.length > 1 && /^(here('s| is)|sure|below is|adapted)/i.test(lines[0]) && lines[0].length < 90) {
      dmDraft = lines.slice(1).join("\n").trim();
    }
    return dmDraft.slice(0, 900);
  } catch {
    // Fallback: raw template with a simple name swap so a batch never
    // silently stalls if the LLM provider hiccups on one item.
    return angle.template.replace(/\[Hotel Name\]/g, p.display_name || `@${p.instagram_handle}`);
  }
}

// Draft-only save (no status change) — used by the single-card and
// bulk-select generators, which leave status progression to explicit
// Mark queued / Mark contacted clicks.
export const saveHostDraft = internalMutation({
  args: { id: v.id("prospects"), dmDraft: v.string(), dmAngle: v.string() },
  handler: async (ctx, { id, dmDraft, dmAngle }) => {
    await ctx.db.patch(id, { dm_draft: dmDraft, dm_angle: dmAngle, published: true });
  },
});

// Bulk-draft exactly the selected ids (checkbox multi-select in the classic
// Hosts panel) — same angle rotation + template adapter as the pool Confirm
// flow, but doesn't touch status/queued_for, matching manual progression.
export const generateDraftsForSelected = action({
  args: { ids: v.array(v.id("prospects")) },
  handler: async (ctx, { ids }): Promise<{ drafted: number }> => {
    const counts: Record<string, number> = await ctx.runQuery(internal.prospects.getHostAngleCounts, {});
    let drafted = 0;
    for (const id of ids) {
      const p: any = await ctx.runQuery(internal.prospects.getById, { id });
      if (!p || p.kind !== "host") continue;
      const angle = nextAngle(counts);
      const dmDraft = await draftHostMessage(p, angle);
      await ctx.runMutation(internal.prospects.saveHostDraft, { id: p._id, dmDraft, dmAngle: angle.id });
      drafted++;
    }
    return { drafted };
  },
});

// Reset a host back to a fresh pool candidate — for anything that stalled or
// fell through, short of an actual signed deal. Keeps the drafted message
// (no need to regenerate) but clears status/queue/confirmed state.
export const resetToPool = mutation({
  args: { id: v.id("prospects") },
  handler: async (ctx, { id }) => {
    const p = await ctx.db.get(id);
    if (!p) throw new Error("Prospect not found");
    if (p.status === "signed") throw new Error("Already signed — can't reset a completed deal.");
    await ctx.db.patch(id, {
      status: "new",
      queued_for: undefined,
      contacted_at: undefined,
      replied_at: undefined,
      published: false,
    });
  },
});

// Confirmed hosts (published === true), across all days — the CRM export set.
export const getConfirmedHosts = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("prospects").collect();
    return rows
      .filter((r) => r.kind === "host" && r.published)
      .sort((a, b) => (b.contacted_at ?? b.created_at) - (a.contacted_at ?? a.created_at));
  },
});

export const confirmDraft = internalMutation({
  args: { id: v.id("prospects"), dmDraft: v.string(), dmAngle: v.string() },
  handler: async (ctx, { id, dmDraft, dmAngle }) => {
    await ctx.db.patch(id, {
      dm_draft: dmDraft,
      dm_angle: dmAngle,
      status: "queued",
      queued_for: todayKey(),
      published: true,
    });
  },
});

// Confirm exactly the selected pool ids: drafts each (cycling evenly through
// the 5 fixed angles), then locks them in as today's outreach batch. Anything
// NOT selected stays in the pool untouched — the built-in "backup" list.
export const confirmHostBatch = action({
  args: { ids: v.array(v.id("prospects")) },
  handler: async (ctx, { ids }): Promise<{ confirmed: number }> => {
    let confirmed = 0;
    for (let i = 0; i < ids.length; i++) {
      const p: any = await ctx.runQuery(internal.prospects.getById, { id: ids[i] });
      if (!p || p.kind !== "host" || p.published) continue; // don't re-draft an already-sent one
      const angle = HOST_OUTREACH_TEMPLATES[i % HOST_OUTREACH_TEMPLATES.length];
      const dmDraft = await draftHostMessage(p, angle);
      await ctx.runMutation(internal.prospects.confirmDraft, { id: p._id, dmDraft, dmAngle: angle.id });
      confirmed++;
    }
    return { confirmed };
  },
});

// Secret-guarded landing pad for local import scripts (e.g. Agent-Reach runs
// driven by a local agent with your own logged-in Chrome session — that kind
// of browser automation can't run inside the hosted Convex backend, so a
// local script/session pushes its results here instead).
// Set the shared secret: npx convex env set LOCAL_IMPORT_SECRET <random string>
export const importHostsLocal = mutation({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        instagram_handle: v.string(),
        display_name: v.optional(v.string()),
        avatar_url: v.optional(v.string()),
        follower_count: v.optional(v.number()),
        location: v.optional(v.string()),
        country: v.optional(v.string()),
        niche: v.optional(v.string()),
        email: v.optional(v.string()),
        bio: v.optional(v.string()),
        website: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { secret, rows }) => {
    const expected = process.env.LOCAL_IMPORT_SECRET;
    if (!expected || secret !== expected) throw new Error("Invalid or missing import secret.");
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
        kind: "host",
        instagram_handle: handle,
        tier: tierFromFollowers(row.follower_count),
        source: "agent-reach",
        status: "new",
        created_at: Date.now(),
      });
      inserted++;
    }
    return { inserted };
  },
});

// Draft a personalized outreach DM with the writer LLM (NVIDIA chain) and save
// it on the prospect. The DM itself is still sent manually — ToS safety.
// Hosts always use the 5 fixed angle templates (angleId picks one explicitly,
// otherwise the least-used angle is auto-selected); creators keep the older
// freeform pitch below since there's no fixed-template ask for them.
export const generateDmDraft = action({
  args: { id: v.id("prospects"), angleId: v.optional(v.string()) },
  handler: async (ctx, { id, angleId }): Promise<string> => {
    const p: any = await ctx.runQuery(internal.prospects.getById, { id });
    if (!p) throw new Error("Prospect not found");

    if (p.kind === "host") {
      let angle = HOST_OUTREACH_TEMPLATES.find((a) => a.id === angleId);
      if (!angle) {
        const counts: Record<string, number> = await ctx.runQuery(internal.prospects.getHostAngleCounts, {});
        angle = nextAngle(counts);
      }
      const dmDraft = await draftHostMessage(p, angle);
      await ctx.runMutation(internal.prospects.saveHostDraft, { id, dmDraft, dmAngle: angle.id });
      return dmDraft;
    }

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

// Import prospects from an Instagram keyword/hashtag search (HikerAPI if
// HIKERAPI_KEY is set, else Apify's Instagram Search Scraper), then dedupes
// into the prospects table. Kept as "importFromApify" — the name is now a
// misnomer but it's wired into the existing Discovery UI action call.
export const importFromApify = action({
  args: {
    kind: v.string(),        // 'creator' | 'host'
    searchQuery: v.string(), // hashtag or keyword, e.g. "travelcreator" / "boutiquehotel"
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ inserted: number; fetched: number }> => {
    const limit = Math.min(args.limit ?? 50, 200);
    const accounts = await searchInstagramUsers(args.searchQuery, limit);

    const rows = accounts.map((acc) => ({
      kind: args.kind,
      instagram_handle: acc.username,
      display_name: acc.fullName,
      avatar_url: acc.avatarUrl,
      follower_count: acc.followers,
      bio: acc.bio,
      website: acc.website,
      email: acc.email,
      source: process.env.HIKERAPI_KEY ? "hikerapi" : "apify",
    }));

    const { inserted } = await ctx.runMutation(internal.prospects.bulkInsert, { rows });
    return { inserted, fetched: accounts.length };
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

// Scrape recent posts for a batch of prospects (HikerAPI or Apify), compute
// reach/views/quality sub-scores, and save. Returns enriched count.
async function enrichBatch(ctx: any, prospects: any[]): Promise<number> {
  if (!prospects.length) return 0;
  const profiles = await fetchProfilesWithPosts(prospects.map((p) => p.instagram_handle));
  const byUsername = new Map(profiles.map((pr) => [pr.username, pr]));

  let enriched = 0;
  for (const p of prospects) {
    const it = byUsername.get(p.instagram_handle);
    if (!it) continue;

    const followers = it.followers ?? p.follower_count;
    const posts = it.posts;

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
        { role: "user", content: `Rate this creator 0-100 on content quality and fit for promoting boutique stays (caption craft, storytelling, aesthetic signals, travel/lifestyle relevance). Reply as {"quality": <number>, "reason": "<max 12 words>"}.\n\nBio: ${it.bio || p.bio || "(none)"}\nFollowers: ${followers ?? "?"}\nAvg video views: ${avgViews || "?"}\n\nRecent captions:\n${captions || "(none)"}` },
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
      bio: it.bio,
      avatarUrl: it.avatarUrl,
      displayName: it.fullName,
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

  const accounts = await searchInstagramUsers(searchQuery, limit);

  const rows = accounts.map((acc) => ({
    kind: "creator",
    instagram_handle: acc.username,
    display_name: acc.fullName,
    avatar_url: acc.avatarUrl,
    follower_count: acc.followers,
    bio: acc.bio,
    website: acc.website,
    email: acc.email,
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
  return { imported: inserted, fetched: accounts.length, ranked };
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
