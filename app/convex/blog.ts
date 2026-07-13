import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { STYLE_GUIDE } from "./styleGuide";
import { buildResearchBrief, fetchHeadlines } from "./blogResearch";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
    + "-" + Date.now().toString(36);
}

function readingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

// Title Case for post titles — capitalize major words, keep short joining words lower
// (unless first/last). Deterministic backstop so titles are never left uncapitalized.
function toTitleCase(title: string): string {
  const small = new Set([
    "a","an","and","as","at","but","by","for","from","in","into","nor","of",
    "on","onto","or","over","per","the","to","up","via","vs","with","yet",
  ]);
  const words = title.trim().split(/\s+/);
  return words
    .map((word, i) => {
      const lower = word.toLowerCase();
      const isEdge = i === 0 || i === words.length - 1;
      if (!isEdge && small.has(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("blog_posts")
      .withIndex("by_generated")
      .order("desc")
      .collect();
  },
});

export const getDrafts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("blog_posts")
      .withIndex("by_status", (q) => q.eq("status", "draft"))
      .order("desc")
      .collect();
  },
});

export const getPublished = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 20 }) => {
    const posts = await ctx.db
      .query("blog_posts")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .collect();
    return posts.slice(0, limit);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("blog_posts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

export const getById = query({
  args: { id: v.id("blog_posts") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const updatePost = mutation({
  args: {
    id: v.id("blog_posts"),
    title: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    pull_quote: v.optional(v.string()),
    instagram_embed_url: v.optional(v.string()),
    seo_description: v.optional(v.string()),
    // Image fields (hero + 3 inline) — swappable from the editor
    hero_image_url: v.optional(v.string()),
    hero_image_alt: v.optional(v.string()),
    hero_image_credit: v.optional(v.string()),
    hero_image_credit_url: v.optional(v.string()),
    inline_image_1_url: v.optional(v.string()),
    inline_image_1_alt: v.optional(v.string()),
    inline_image_1_credit: v.optional(v.string()),
    inline_image_2_url: v.optional(v.string()),
    inline_image_2_alt: v.optional(v.string()),
    inline_image_2_credit: v.optional(v.string()),
    inline_image_3_url: v.optional(v.string()),
    inline_image_3_alt: v.optional(v.string()),
    inline_image_3_credit: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const updates: Record<string, unknown> = {};
    if (fields.title !== undefined) {
      updates.title = fields.title;
      // Re-slugging a published post would break its live URL — drafts only.
      const existing = await ctx.db.get(id);
      if (existing && existing.status !== "published") {
        updates.slug = slugify(fields.title);
      }
    }
    if (fields.content !== undefined) {
      updates.content = fields.content;
      updates.reading_time = readingTime(fields.content);
    }
    if (fields.excerpt !== undefined) updates.excerpt = fields.excerpt;
    if (fields.tags !== undefined) updates.tags = fields.tags;
    if (fields.category !== undefined) updates.category = fields.category;
    if (fields.pull_quote !== undefined) updates.pull_quote = fields.pull_quote;
    if (fields.instagram_embed_url !== undefined) updates.instagram_embed_url = fields.instagram_embed_url;
    if (fields.seo_description !== undefined) updates.seo_description = fields.seo_description;
    // Patch any image field that was provided
    const imageKeys = [
      "hero_image_url", "hero_image_alt", "hero_image_credit", "hero_image_credit_url",
      "inline_image_1_url", "inline_image_1_alt", "inline_image_1_credit",
      "inline_image_2_url", "inline_image_2_alt", "inline_image_2_credit",
      "inline_image_3_url", "inline_image_3_alt", "inline_image_3_credit",
    ] as const;
    for (const k of imageKeys) {
      if ((fields as any)[k] !== undefined) updates[k] = (fields as any)[k];
    }
    await ctx.db.patch(id, updates);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("blog_posts"),
    status: v.string(), // 'published' | 'rejected' | 'draft'
  },
  handler: async (ctx, { id, status }) => {
    const updates: Record<string, unknown> = { status };
    if (status === "published") updates.published_at = Date.now();
    await ctx.db.patch(id, updates);
  },
});

export const deletePost = mutation({
  args: { id: v.id("blog_posts") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// Blank draft for writing a post by hand in the admin editor.
export const createBlankPost = mutation({
  args: {},
  handler: async (ctx) => {
    const title = "Untitled post";
    const id = await ctx.db.insert("blog_posts", {
      title,
      slug: slugify(title),
      excerpt: "",
      content: [
        "<p>Start with a scene — a place, a person, a decision.</p>",
        "<h2>First section</h2>",
        "<p></p>",
        "%%INLINE_IMAGE_1%%",
        "<h2>Second section</h2>",
        "<p></p>",
        "%%PULL_QUOTE%%",
        "%%INLINE_IMAGE_2%%",
        "<h2>Third section</h2>",
        "<p></p>",
        "%%INLINE_IMAGE_3%%",
      ].join("\n"),
      category: "industry",
      tags: [],
      author: "Ben Venturing",
      sources: [],
      seo_description: "",
      reading_time: 1,
      status: "draft",
      generated_at: Date.now(),
    });
    return id;
  },
});

// ─── Internal: create post from generated data ────────────────────────────────

export const createGeneratedPost = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
    pull_quote: v.optional(v.string()),
    author: v.optional(v.string()),
    hero_image_url: v.optional(v.string()),
    hero_image_alt: v.optional(v.string()),
    hero_image_credit: v.optional(v.string()),
    hero_image_credit_url: v.optional(v.string()),
    inline_image_1_url: v.optional(v.string()),
    inline_image_1_alt: v.optional(v.string()),
    inline_image_1_credit: v.optional(v.string()),
    inline_image_2_url: v.optional(v.string()),
    inline_image_2_alt: v.optional(v.string()),
    inline_image_2_credit: v.optional(v.string()),
    inline_image_3_url: v.optional(v.string()),
    inline_image_3_alt: v.optional(v.string()),
    inline_image_3_credit: v.optional(v.string()),
    sources: v.array(v.string()),
    seo_description: v.string(),
    reading_time: v.number(),
    is_stats_post: v.optional(v.boolean()),
    topic: v.optional(v.string()),
    review_notes: v.optional(v.string()),
    review_score: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("blog_posts", {
      ...args,
      status: "draft",
      generated_at: Date.now(),
    });
  },
});

// Overwrite a draft's written fields after regeneration. Images are untouched
// on purpose — regenerate keeps the photos the editor already chose.
export const applyRegenerated = mutation({
  args: {
    id: v.id("blog_posts"),
    title: v.string(),
    excerpt: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    pull_quote: v.optional(v.string()),
    sources: v.array(v.string()),
    seo_description: v.string(),
    topic: v.optional(v.string()),
    review_notes: v.optional(v.string()),
    review_score: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const post = await ctx.db.get(id);
    if (!post) throw new Error("Post not found");
    if (post.status === "published") throw new Error("Unpublish the post before regenerating it.");
    await ctx.db.patch(id, {
      ...fields,
      slug: slugify(fields.title),
      reading_time: readingTime(fields.content),
      generated_at: Date.now(),
    });
  },
});

// ─── Platform stats helper (used by stats posts) ──────────────────────────────

export const getPlatformStats = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    const creators = profiles.filter((p) => p.role === "creator").length;
    const hosts = profiles.filter((p) => p.role === "host").length;
    const pitches = await ctx.db.query("pitches").collect();
    const approved = pitches.filter((p) => p.status === "approved" || p.status === "completed").length;
    const listings = await ctx.db.query("listings").filter((q) => q.eq(q.field("is_sample"), false)).collect();
    return { creators, hosts, totalUsers: profiles.length, approvedCollabs: approved, activeListings: listings.length };
  },
});

// ─── Action: generate a blog post via LLM + web research + Unsplash ──────────
//
// Convex environment variables:
//   NVIDIA_API_KEY       — primary writer (build.nvidia.com)          [required*]
//   DEEPSEEK_API_KEY     — fallback writer (platform.deepseek.com)    [optional]
//   OPENROUTER_API_KEY   — fallback writer (openrouter.ai)            [optional]
//   SGAI_API_KEY         — ScrapeGraphAI web research                 [optional]
//   FIRECRAWL_API_KEY    — Firecrawl web research (used if no SGAI)   [optional]
//   UNSPLASH_ACCESS_KEY  — photos (unsplash.com/developers)           [required]
// *At least one writer key must be set; NVIDIA is preferred.
// ─────────────────────────────────────────────────────────────────────────────

type ChatMessage = { role: string; content: string };

// OpenAI-compatible chat call. Providers are tried in order: NVIDIA (primary),
// DeepSeek, OpenRouter — the first one with a configured key wins; if it
// errors, the next configured provider is tried.
export async function llmChat(messages: ChatMessage[], maxTokens = 2048): Promise<string> {
  const providers = [
    // meta/llama-3.3-70b-instruct requests hang server-side on NVIDIA since
    // 2026-07-03 (accepted, never answered). Nemotron is a reasoning model, so
    // /no_think is required or the tokens all land in reasoning_content.
    {
      name: "NVIDIA",
      key: process.env.NVIDIA_API_KEY,
      url: "https://integrate.api.nvidia.com/v1/chat/completions",
      model: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
      noThink: true,
    },
    {
      name: "DeepSeek",
      key: process.env.DEEPSEEK_API_KEY,
      url: "https://api.deepseek.com/chat/completions",
      model: "deepseek-chat",
    },
    {
      name: "OpenRouter",
      key: process.env.OPENROUTER_API_KEY,
      url: "https://openrouter.ai/api/v1/chat/completions",
      model: "meta-llama/llama-3.3-70b-instruct",
    },
  ].filter((p) => !!p.key);

  if (providers.length === 0) {
    throw new Error(
      "No writer API key set. Set NVIDIA_API_KEY (preferred), DEEPSEEK_API_KEY, or OPENROUTER_API_KEY in the Convex environment."
    );
  }

  let lastError: Error | null = null;
  // Two passes: NVIDIA serverless intermittently drops requests (503 worker
  // limits / connection resets), so each provider gets one retry.
  for (const provider of [...providers, ...providers]) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    const sent = (provider as any).noThink
      ? messages[0]?.role === "system"
        ? [{ ...messages[0], content: `/no_think\n${messages[0].content}` }, ...messages.slice(1)]
        : [{ role: "system", content: "/no_think" }, ...messages]
      : messages;
    try {
      const res = await fetch(provider.url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${provider.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: provider.model,
          messages: sent,
          max_tokens: maxTokens,
          temperature: 0.7,
          stream: false,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.text().catch(() => res.status.toString());
        throw new Error(`${provider.name} API error ${res.status}: ${err.slice(0, 200)}`);
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";
      if (!content) throw new Error(`${provider.name} returned an empty response`);
      return content;
    } catch (err: any) {
      console.log(`llmChat ${provider.name}/${provider.model} failed: ${err?.name}: ${err?.message}`);
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error("All LLM providers failed");
}

// ─── Deterministic lint against the style guide ───────────────────────────────

const BANNED_PHRASES = [
  "evolving landscape", "ever-evolving", "navigate the world of", "navigate the landscape",
  "in today's fast-paced world", "the realm of", "tapestry", "embark",
  "elevate", "unlock", "unleash", "harness", "leverage", "supercharge", "revolutionize",
  "capitalize on", "boost your bookings",
  "stunning", "breathtaking", "vibrant", "seamless", "game-changer", "must-have", "cutting-edge",
  "treasure trove", "canvas waiting to be painted", "weave into the fabric", "testament to",
  "at the end of the day", "when it comes to", "look no further", "it's worth noting",
  "needless to say", "delve", "dive into",
  "in summary", "in conclusion", "to summarize", "all in all", "in essence",
  "join collabnb today", "discover how", "don't miss out",
];

type LintResult = { violations: string[]; structural: string[] };

function lintPost(title: string, html: string): LintResult {
  const violations: string[] = [];
  const structural: string[] = [];
  const text = (title + " " + html.replace(/<[^>]+>/g, " ")).toLowerCase();

  for (const phrase of BANNED_PHRASES) {
    if (text.includes(phrase)) violations.push(`Banned phrase: "${phrase}"`);
  }

  if (/\b(I|we|us|my|me|ours?)\b/.test(html.replace(/<[^>]+>/g, " "))) {
    violations.push("First-person pronoun found — the Journal writes in strict third person");
  }

  const firstTag = html.match(/<(h2|p)[\s>]/i)?.[1]?.toLowerCase();
  if (firstTag !== "p") structural.push("Post must open with a <p> hook paragraph before the first <h2>");

  const markerCount = (html.match(/%%INLINE_IMAGE_[123]%%/g) || []).length;
  if (markerCount !== 3) structural.push(`Expected 3 inline image markers, found ${markerCount}`);

  if (!html.includes("%%PULL_QUOTE%%")) structural.push("Missing %%PULL_QUOTE%% marker (belongs mid-article, after section 2)");

  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
  if (h2s.length < 3) structural.push(`Expected at least 3 <h2> sections, found ${h2s.length}`);
  for (const h of h2s) {
    const words = h.split(/\s+/).filter(Boolean);
    const capitalized = words.filter((w) => /^[A-Z]/.test(w)).length;
    if (words.length >= 3 && capitalized > Math.ceil(words.length / 2)) {
      violations.push(`Heading looks Title Case (must be sentence case): "${h}"`);
    }
  }

  return { violations, structural };
}

// ─── DeepSeek editorial review pass ────────────────────────────────────────────
// Reviews the NVIDIA draft against the style guide and research brief, returns
// a corrected revision plus notes. Skipped silently when no DEEPSEEK_API_KEY.
async function deepseekReview(
  title: string,
  html: string,
  researchContext: string,
  lintNotes: string[]
): Promise<{ html: string; notes: string; score: number } | null> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "deepseek-chat",
        response_format: { type: "json_object" },
        max_tokens: 4000,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: "You are the copy chief of The Collabnb Journal. You review drafts against the style guide with a light hand: fix violations, keep the writer's voice, never expand length.",
          },
          {
            role: "user",
            content: `STYLE GUIDE:\n${STYLE_GUIDE}\n\nRESEARCH BRIEF (the only permitted source of statistics):\n${researchContext || "(none — the post must not contain specific statistics)"}\n\nDRAFT TITLE: ${title}\n\nDRAFT HTML:\n${html}\n\nAutomated lint already flagged:\n${lintNotes.length ? lintNotes.map((n) => `- ${n}`).join("\n") : "- nothing"}\n\nTasks:\n1. Fix every banned phrase, first-person slip, Title Case heading, and any statistic not present in the research brief (rewrite qualitatively or attribute it correctly).\n2. Keep the HTML structure and all %%INLINE_IMAGE_n%% / %%PULL_QUOTE%% markers exactly where they are. Only h2/p/ul/li/strong/em/a tags.\n3. Keep length within ±10%.\n\nRespond with JSON: {"score": <1-10 quality after your fixes>, "notes": ["short note per change or concern, max 8"], "revised_html": "<the corrected full HTML>"}`,
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`DeepSeek review error ${res.status}`);
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    const revised = typeof parsed.revised_html === "string" ? parsed.revised_html.trim() : "";
    const markersIntact =
      (revised.match(/%%INLINE_IMAGE_[123]%%/g) || []).length === (html.match(/%%INLINE_IMAGE_[123]%%/g) || []).length &&
      revised.includes("%%PULL_QUOTE%%") === html.includes("%%PULL_QUOTE%%");
    const notes = Array.isArray(parsed.notes) ? parsed.notes.filter((n: unknown) => typeof n === "string").slice(0, 8) : [];
    return {
      html: revised.length > 400 && markersIntact ? revised : html,
      notes: notes.join("\n"),
      score: typeof parsed.score === "number" ? Math.max(1, Math.min(10, parsed.score)) : 5,
    };
  } catch (err: any) {
    console.log(`deepseekReview failed: ${err?.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Action: search Unsplash for editor photo swaps ───────────────────────────
export const searchUnsplash = action({
  args: { query: v.string(), bw: v.optional(v.boolean()) },
  handler: async (_ctx, { query, bw = true }) => {
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!unsplashKey) throw new Error("Missing UNSPLASH_ACCESS_KEY in Convex env.");
    const q = encodeURIComponent(query.trim() || "boutique hotel editorial");
    const color = bw ? "&color=black_and_white" : "";
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${q}&per_page=12&orientation=landscape${color}&content_filter=high`,
      { headers: { Authorization: `Client-ID ${unsplashKey}` } }
    );
    if (!res.ok) {
      throw new Error(res.status === 403 ? "Unsplash rate limit reached — try again shortly." : "Unsplash search failed.");
    }
    const data = await res.json();
    return (data.results || []).map((p: any) => ({
      thumb: p.urls?.small as string,
      url: p.urls?.regular as string,
      alt: (p.alt_description || query) as string,
      credit: p.user?.name as string,
      creditUrl: `https://unsplash.com/@${p.user?.username}?utm_source=collabnb&utm_medium=referral` as string,
      downloadLocation: p.links?.download_location as string,
    }));
  },
});

// Fallback rotation for the daily cron when the LLM topic pick fails.
const TOPIC_POOL = [
  "how boutique hosts should brief UGC creators before a content-for-stay collab",
  "what a creator's media kit should include when pitching boutique stays",
  "pricing a content-for-stay deal: nights, deliverables, and usage rights",
  "why boutique hotels win on Instagram while chains win on search",
  "how creators can turn one stay into a month of content",
  "usage rights explained for hosts licensing creator content",
  "the shoulder-season playbook: filling quiet weeks with creator collabs",
  "red flags hosts should watch for when vetting creator pitches",
  "how micro-creators out-convert big influencers for boutique bookings",
  "building a repeatable UGC pipeline for a small property",
  "what makes hotel content actually convert: hooks, pacing, and proof",
  "from DMs to contracts: professionalizing creator outreach",
  "how boutique hosts should measure the ROI of a creator collab",
  "the difference between UGC, influencer posts, and brand content for stays",
  "how creators should scout properties that fit their audience",
  "negotiating deliverables: what a host can reasonably ask for one night",
];

async function pickFreshTopic(ctx: any, headlines: { title: string; source: string }[]): Promise<string> {
  const recent: any[] = await ctx.runQuery(api.blog.getAll, {});
  const recentTitles = recent.slice(0, 12).map((p: any) => p.title).filter(Boolean).join("; ");
  const news = headlines.slice(0, 12).map((h) => `- [${h.source}] ${h.title}`).join("\n");
  try {
    const raw = await llmChat([
      { role: "system", content: "You are a content strategist for Collabnb — a creator-first hospitality marketing platform connecting boutique properties with vetted creators for professional content campaigns. Be specific, never generic." },
      { role: "user", content: `Industry headlines this week:\n${news || "(none available)"}\n\nRecent Collabnb Journal posts (do NOT overlap with these): ${recentTitles || "none yet"}.\n\nSuggest ONE fresh, specific blog post topic for boutique hosts or UGC travel creators that reacts to what the industry is talking about this week. Return only the topic itself as a single lowercase phrase, no quotes, no commentary.` },
    ], 100);
    const topic = raw.trim().split("\n")[0].replace(/^["'\-\s]+|["'\s]+$/g, "");
    if (topic.length >= 20 && topic.length <= 200) return topic;
  } catch {
    // fall through to the rotation pool
  }
  const day = Math.floor(Date.now() / 86_400_000);
  return TOPIC_POOL[day % TOPIC_POOL.length];
}

// Parse the writer model's structured response into post fields.
function parseWriterOutput(raw: string) {
  const extract = (key: string) => {
    const match = raw.match(new RegExp(`${key}\\**:\\**\\s*(.+)`));
    if (!match) return "";
    return match[1].trim()
      .replace(/^[*\[\s]+|[*\]\s]+$/g, "")
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "");
  };
  const contentMatch = raw.match(/CONTENT\**:\**\s*([\s\S]+)/);
  return {
    title: toTitleCase(extract("TITLE")),
    excerpt: extract("EXCERPT"),
    seoDesc: extract("SEO_DESC"),
    tags: extract("TAGS").split(",").map((t) => t.trim()).filter(Boolean),
    pullQuote: extract("PULL_QUOTE"),
    imgHero: extract("IMAGE_QUERY_HERO"),
    img1: extract("IMAGE_QUERY_1"),
    img2: extract("IMAGE_QUERY_2"),
    img3: extract("IMAGE_QUERY_3"),
    content: contentMatch ? contentMatch[1].trim().replace(/^\*+\s*/, "").replace(/```html?|```/g, "").trim() : "",
  };
}

// Write → structural lint (one retry) → DeepSeek review. Shared by generatePost
// and regeneratePost. `direction` is an optional human note steering the angle.
async function composePost(topic: string, research: string, briefContext: string, direction?: string) {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const writePrompt = `You are the editorial voice of The Collabnb Journal. Today is ${today}.

Below is the Journal's style guide. Follow every rule in it — narrative arc, HTML skeleton, voice, banned words, citation rules.

<style_guide>
${STYLE_GUIDE}
</style_guide>

RESEARCH BRIEF — the ONLY permitted source of statistics. Attribute every number to its publication; if a fact is not in this brief, do not state it as a statistic:
<research>
${research}
</research>

Write one post on this topic: ${topic}
${direction ? `\nEDITOR'S DIRECTION — the human editor asked for this specific angle. Follow it closely while keeping the Journal's structure and narrative flow:\n${direction}\n` : ""}
Respond with EXACTLY this format, no extra commentary:
TITLE: [60 chars max, Title Case, editorial — states a specific idea, not a topic area]
EXCERPT: [one conversational sentence, under 120 chars — renders as the deck under the title]
SEO_DESC: [155 chars max, human-sounding]
TAGS: [3-5 lowercase comma-separated, specific]
PULL_QUOTE: [the single most resonant sentence from the post, lightly polished]
IMAGE_QUERY_HERO: [black and white editorial photo subject matching the hook scene — 5-7 words]
IMAGE_QUERY_1: [black and white editorial — 5-7 words, a DIFFERENT subject than hero]
IMAGE_QUERY_2: [black and white editorial — 5-7 words, a DIFFERENT subject than above]
IMAGE_QUERY_3: [black and white editorial — 5-7 words, a DIFFERENT subject than above]
CONTENT:
[the full HTML following the style guide skeleton, with %%INLINE_IMAGE_1%%, %%INLINE_IMAGE_2%%, %%INLINE_IMAGE_3%% and %%PULL_QUOTE%% markers in place]`;

  const writerSystem = "You are an editorial writer for a boutique travel publication. Follow the output format exactly. Place image and pull-quote markers exactly where the style guide's skeleton specifies.";
  let raw = await llmChat([
    { role: "system", content: writerSystem },
    { role: "user", content: writePrompt },
  ], 3500);
  console.log(`composePost write ok — ${raw.length} chars`);

  let parsed = parseWriterOutput(raw);

  // One structural retry — markers and skeleton are non-negotiable.
  let lint = parsed.title && parsed.content
    ? lintPost(parsed.title, parsed.content)
    : { violations: [], structural: ["Writer returned incomplete output"] };
  if (lint.structural.length > 0) {
    console.log(`composePost structural retry — ${lint.structural.join("; ")}`);
    raw = await llmChat([
      { role: "system", content: writerSystem },
      { role: "user", content: `${writePrompt}\n\nYour previous attempt failed these structural requirements — fix ALL of them this time:\n${lint.structural.map((s) => `- ${s}`).join("\n")}` },
    ], 3500);
    const retryParsed = parseWriterOutput(raw);
    if (retryParsed.title && retryParsed.content) {
      const retryLint = lintPost(retryParsed.title, retryParsed.content);
      if (retryLint.structural.length <= lint.structural.length) {
        parsed = retryParsed;
        lint = retryLint;
      }
    }
  }

  const { title, excerpt, seoDesc, tags, pullQuote, imgHero, img1, img2, img3 } = parsed;
  let content = parsed.content;
  if (!title || !content) {
    throw new Error("The writer model returned incomplete post data — try again");
  }

  const review = await deepseekReview(title, content, briefContext, [...lint.violations, ...lint.structural]);
  if (review) content = review.html;
  const finalLint = lintPost(title, content);
  const reviewNotes = [
    review ? `DeepSeek review — score ${review.score}/10` : "DeepSeek review skipped (no key or error) — lint only",
    review?.notes || "",
    finalLint.violations.length ? `Remaining lint flags:\n${finalLint.violations.map((v) => `- ${v}`).join("\n")}` : "",
    finalLint.structural.length ? `Structural flags:\n${finalLint.structural.map((v) => `- ${v}`).join("\n")}` : "",
  ].filter(Boolean).join("\n");

  return { title, excerpt, seoDesc, tags, pullQuote, imgHero, img1, img2, img3, content, reviewNotes, reviewScore: review?.score };
}

export const generatePost = action({
  args: {
    isStatsPost: v.optional(v.boolean()),
    topicHint: v.optional(v.string()),
  },
  handler: async (ctx, { isStatsPost = false, topicHint }) => {
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!unsplashKey) {
      throw new Error("Missing UNSPLASH_ACCESS_KEY in Convex env.");
    }

    // ── 1. Research phase — real headlines + scraped articles + stats ────────
    // No LLM "research brief" pass anymore: the writer only sees genuinely
    // scraped material, so it cannot launder invented facts through research.
    let statsContext = "";
    if (isStatsPost) {
      const stats: any = await ctx.runQuery(api.blog.getPlatformStats_internal, {});
      statsContext = `\n\nCOLLABNB PLATFORM STATS (cite freely, attribute to Collabnb): ${stats.creators} creators, ${stats.hosts} hosts, ${stats.approvedCollabs} completed collabs, ${stats.activeListings} active listings.`;
    }

    const headlines = await fetchHeadlines();
    const topic = topicHint || (await pickFreshTopic(ctx, headlines));
    console.log(`generatePost step 1 ok — topic: ${topic.slice(0, 80)}`);

    const brief = await buildResearchBrief(topic, headlines);
    console.log(`generatePost research ok — ${brief.sources.length} sources, ${brief.context.length} chars`);
    const research =
      (brief.context || "(No live research available for this run — write qualitatively and use NO specific statistics.)") +
      statsContext;

    // ── 2. Write, lint, and review ────────────────────────────────────────────
    const category = isStatsPost ? "stats" : (
      topic.toLowerCase().includes("host") ? "hosts" :
      topic.toLowerCase().includes("creator") ? "creators" : "industry"
    );

    const { title, excerpt, seoDesc, tags, pullQuote, imgHero, img1, img2, img3, content, reviewNotes, reviewScore } =
      await composePost(topic, research, brief.context);

    console.log(`generatePost review ok — score ${reviewScore ?? "n/a"}`);

    // ── 4. Fetch images from Unsplash (B&W filter) ────────────────────────────
    async function fetchUnsplashImage(query: string, fallback: string) {
      try {
        let photo: any = null;
        // Model-written queries can be too specific for the B&W filter — retry
        // with the generic fallback before giving up.
        for (const attempt of [query || fallback, fallback]) {
          const res = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(attempt)}&per_page=3&orientation=landscape&color=black_and_white&content_filter=high`,
            { headers: { "Authorization": `Client-ID ${unsplashKey}` } }
          );
          if (!res.ok) continue;
          const data = await res.json();
          photo = data.results?.[0];
          if (photo) break;
        }
        if (!photo) return null;
        await fetch(photo.links?.download_location, {
          headers: { "Authorization": `Client-ID ${unsplashKey}` }
        }).catch(() => {});
        return {
          url:     photo.urls?.regular as string,
          alt:     (photo.alt_description || query) as string,
          credit:  photo.user?.name as string,
          creditUrl: `https://unsplash.com/@${photo.user?.username}?utm_source=collabnb&utm_medium=referral` as string,
        };
      } catch { return null; }
    }

    const [hero, inline1, inline2, inline3] = await Promise.all([
      fetchUnsplashImage(imgHero, "black and white boutique hotel minimal"),
      fetchUnsplashImage(img1,    "black and white travel editorial minimal"),
      fetchUnsplashImage(img2,    "black and white hospitality interior minimal"),
      fetchUnsplashImage(img3,    "black and white creator photographer travel"),
    ]);

    // ── 5. Store as draft ─────────────────────────────────────────────────────
    const slug = slugify(title);
    const postId = await ctx.runMutation(api.blog.createGeneratedPost, {
      title,
      slug,
      excerpt,
      content,
      category,
      tags,
      pull_quote: pullQuote || undefined,
      author: "Ben Venturing",
      hero_image_url:      hero?.url,
      hero_image_alt:      hero?.alt,
      hero_image_credit:   hero?.credit,
      hero_image_credit_url: hero?.creditUrl,
      inline_image_1_url:    inline1?.url,
      inline_image_1_alt:    inline1?.alt,
      inline_image_1_credit: inline1?.credit,
      inline_image_2_url:    inline2?.url,
      inline_image_2_alt:    inline2?.alt,
      inline_image_2_credit: inline2?.credit,
      inline_image_3_url:    inline3?.url,
      inline_image_3_alt:    inline3?.alt,
      inline_image_3_credit: inline3?.credit,
      sources: brief.sources,
      seo_description: seoDesc,
      reading_time: readingTime(content),
      is_stats_post: isStatsPost,
      topic,
      review_notes: reviewNotes,
      review_score: reviewScore,
    });

    return { postId, title, slug };
  },
});

// ─── Action: regenerate an existing draft in place ────────────────────────────
// Re-runs research + writing on the same post, keeping its photos. `direction`
// is the editor's steering note ("same flow, but focus on X").
export const regeneratePost = action({
  args: {
    id: v.id("blog_posts"),
    direction: v.optional(v.string()),
  },
  handler: async (ctx, { id, direction }) => {
    const post: any = await ctx.runQuery(api.blog.getById, { id });
    if (!post) throw new Error("Post not found");
    if (post.status === "published") throw new Error("Unpublish the post before regenerating it.");

    const baseTopic = post.topic || post.title || "boutique hospitality and creator collaborations";
    const topic = direction
      ? `${baseTopic} — refocused by the editor: ${direction.slice(0, 300)}`
      : baseTopic;
    console.log(`regeneratePost topic: ${topic.slice(0, 100)}`);

    const brief = await buildResearchBrief(topic);
    console.log(`regeneratePost research ok — ${brief.sources.length} sources, ${brief.context.length} chars`);
    const research =
      brief.context || "(No live research available for this run — write qualitatively and use NO specific statistics.)";

    const composed = await composePost(topic, research, brief.context, direction);
    console.log(`regeneratePost review ok — score ${composed.reviewScore ?? "n/a"}`);

    await ctx.runMutation(api.blog.applyRegenerated, {
      id,
      title: composed.title,
      excerpt: composed.excerpt,
      content: composed.content,
      tags: composed.tags,
      pull_quote: composed.pullQuote || undefined,
      sources: brief.sources,
      seo_description: composed.seoDesc,
      topic,
      review_notes: composed.reviewNotes,
      review_score: composed.reviewScore,
    });

    return { postId: id, title: composed.title };
  },
});

// ─── Action: suggest topic ideas via NVIDIA ───────────────────────────────────

export const suggestTopics = action({
  args: {},
  handler: async (): Promise<string[]> => {
    let content = "";
    try {
      const headlines = await fetchHeadlines();
      const news = headlines.slice(0, 12).map((h) => `- [${h.source}] ${h.title}`).join("\n");
      content = await llmChat([
        { role: "system", content: "You are a content strategist for Collabnb — a creator-first hospitality marketing platform connecting boutique properties with vetted creators for professional content campaigns. Be creative and specific." },
        { role: "user", content: `Industry headlines this week:\n${news || "(none available)"}\n\nGive me exactly 8 fresh, specific blog post topic ideas for The Collabnb Journal — at least half should react to the headlines above. Mix topics for boutique hosts and UGC creators. Return ONLY a valid JSON array of 8 strings, nothing else. Example: ["topic one", "topic two"]` },
      ], 400);
    } catch {
      return [];
    }
    const match = content.match(/\[[\s\S]*?\]/);
    if (!match) return [];
    try {
      const parsed = JSON.parse(match[0]);
      return Array.isArray(parsed) ? parsed.filter((t: unknown) => typeof t === "string") : [];
    } catch { return []; }
  },
});

// Internal version of getPlatformStats for use in actions
export const getPlatformStats_internal = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    const creators = profiles.filter((p) => p.role === "creator").length;
    const hosts = profiles.filter((p) => p.role === "host").length;
    const pitches = await ctx.db.query("pitches").collect();
    const approved = pitches.filter((p) => p.status === "approved" || p.status === "completed").length;
    const listings = await ctx.db.query("listings").filter((q) => q.eq(q.field("is_sample"), false)).collect();
    return { creators, hosts, totalUsers: profiles.length, approvedCollabs: approved, activeListings: listings.length };
  },
});
