import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

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
      updates.slug = slugify(fields.title);
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("blog_posts", {
      ...args,
      status: "draft",
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

// Real web research via ScrapeGraphAI (preferred) or Firecrawl. Returns source
// URLs plus condensed page content to ground the post in real, current data.
// Degrades to empty (pure-LLM research) when neither key is configured.
async function webResearch(topic: string): Promise<{ context: string; sources: string[] }> {
  const sgaiKey = process.env.SGAI_API_KEY;
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;

  if (sgaiKey) {
    try {
      const res = await fetch("https://api.scrapegraphai.com/v1/searchscraper", {
        method: "POST",
        headers: { "SGAI-APIKEY": sgaiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          user_prompt: `Find current data, statistics, and real examples about: ${topic}. Focus on hospitality, UGC creators, and content-for-stay partnerships.`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const sources: string[] = Array.isArray(data.reference_urls) ? data.reference_urls.slice(0, 6) : [];
        const context = typeof data.result === "string" ? data.result : JSON.stringify(data.result ?? "");
        if (context) return { context: context.slice(0, 4000), sources };
      }
    } catch {
      // fall through to Firecrawl / pure-LLM
    }
  }

  if (firecrawlKey) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: { "Authorization": `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: topic,
          limit: 5,
          scrapeOptions: { formats: ["markdown"] },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const results: any[] = data.data || [];
        const sources = results.map((r) => r.url).filter(Boolean).slice(0, 6);
        const context = results
          .map((r) => `SOURCE: ${r.url}\n${String(r.markdown || r.description || "").slice(0, 800)}`)
          .join("\n\n")
          .slice(0, 4000);
        if (context) return { context, sources };
      }
    } catch {
      // fall through to pure-LLM
    }
  }

  return { context: "", sources: [] };
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

async function pickFreshTopic(ctx: any): Promise<string> {
  const recent: any[] = await ctx.runQuery(api.blog.getAll, {});
  const recentTitles = recent.slice(0, 12).map((p: any) => p.title).filter(Boolean).join("; ");
  try {
    const raw = await llmChat([
      { role: "system", content: "You are a content strategist for Collabnb — a marketplace connecting boutique hotel/Airbnb hosts with UGC travel creators for content-for-stay partnerships. Be specific, never generic." },
      { role: "user", content: `Recent Collabnb Journal posts: ${recentTitles || "none yet"}.\n\nSuggest ONE fresh, specific blog post topic that does NOT overlap with any of those. Return only the topic itself as a single lowercase phrase, no quotes, no commentary.` },
    ], 100);
    const topic = raw.trim().split("\n")[0].replace(/^["'\-\s]+|["'\s]+$/g, "");
    if (topic.length >= 20 && topic.length <= 200) return topic;
  } catch {
    // fall through to the rotation pool
  }
  const day = Math.floor(Date.now() / 86_400_000);
  return TOPIC_POOL[day % TOPIC_POOL.length];
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

    // ── 1. Research phase ─────────────────────────────────────────────────────
    let statsContext = "";
    if (isStatsPost) {
      const stats: any = await ctx.runQuery(api.blog.getPlatformStats_internal, {});
      statsContext = `Platform stats: ${stats.creators} creators, ${stats.hosts} hosts, ${stats.approvedCollabs} completed collabs, ${stats.activeListings} active listings.`;
    }

    const topic = topicHint || (await pickFreshTopic(ctx));
    console.log(`generatePost step 1 ok — topic: ${topic.slice(0, 80)}`);

    // Real web research when ScrapeGraphAI / Firecrawl keys are configured;
    // otherwise the LLM research brief runs on its own knowledge.
    const web = await webResearch(topic);
    console.log(`generatePost webResearch ok — ${web.sources.length} sources`);
    const webContext = web.context
      ? `\n\nLive web research (cite these facts where relevant, do not invent beyond them):\n${web.context}`
      : "";

    const researchPrompt = isStatsPost
      ? `You are a content strategist for Collabnb, a marketplace connecting boutique hotel/Airbnb hosts with UGC travel creators. ${statsContext}

Produce a detailed research brief covering: UGC marketing trends in hospitality (2024-2025), creator-driven booking statistics, what's working for boutique properties vs chains. Include specific data points and real-world examples.${webContext}`
      : `You are a content strategist for Collabnb, a marketplace connecting boutique hotel/Airbnb hosts with UGC travel creators for content-for-stay partnerships.

Produce a detailed research brief on: ${topic}. Cover: key trends and data (2024-2025), real-world examples of creator-property collaborations, what boutique hosts and UGC creators each need from partnerships, actionable insights. Be concrete — include specific examples, data points where known, and avoid vague generalities.${webContext}`;

    const research = await llmChat([
      { role: "system", content: "You are an expert content strategist specializing in travel, hospitality, and the creator economy. Produce detailed, concrete research briefs — name real properties, real campaigns, real data points." },
      { role: "user", content: researchPrompt },
    ], 1500);
    console.log(`generatePost research ok — ${research.length} chars`);

    // ── 2. Write the post ─────────────────────────────────────────────────────
    const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const category = isStatsPost ? "stats" : (
      topic.toLowerCase().includes("host") ? "hosts" :
      topic.toLowerCase().includes("creator") ? "creators" : "industry"
    );

    const writePrompt = `You are the editorial voice of The Collabnb Journal — a blog for people who run boutique stays and UGC travel creators who partner with them for content-for-stay collabs.

Voice model: think Cereal Magazine meets Morning Brew. Curious, observational, direct. Never corporate. Never "Discover how" or "Unlock the power of." Write from a perspective grounded in real travel — notice specific things, name real places, be precise.

Perspective — STRICT: Write in the third person at all times. Never use first person — no "I", "we", "me", "my", "us", "our", or "ours" anywhere. This is not a personal account and the author has not personally stayed anywhere; do not invent personal experiences or opinions framed as lived. Write it as an editorial overview, analysis, or highlight ABOUT boutique hotels and small luxury stays in general — observing the category, not narrating a personal trip. Anything that reads as a personal diary entry is wrong.

Based on this research:
${research}

Write a blog post (700–900 words). Structure:
1. Opening paragraph — 2-3 sentences, scene-setting or observation. NO statistics here.
2. Three body sections, each ~150 words, each starting with an <h2> in sentence case (not title case, no question marks, under 7 words).
   — After section 1, place the marker: %%INLINE_IMAGE_1%%
   — After section 2, place the marker: %%INLINE_IMAGE_2%%
   — After section 3, place the marker: %%INLINE_IMAGE_3%%
3. A synthesis section (~150 words), no image.
4. One pull quote — pick the single most resonant sentence from the post. Make it slightly more poetic without changing its meaning.
5. Closing paragraph (2-3 sentences) — ties back to Collabnb without being salesy.
6. Subtle CTA: one italicized line, e.g. <em>Collabnb is open for early access — <a href="https://collabnb.com/join">collabnb.com/join</a></em>

HTML rules: use ONLY h2, p, ul, li, strong, em, a tags. NO h1. NO html/body wrapper. NO markdown.

Anti-patterns to avoid:
- Never open with a statistic
- Never use "Discover how" / "Unlock" / "Boost your bookings"
- Never end with "Join Collabnb today!"
- No generic listicles without specific examples
- No title case in section headers (the TITLE is Title Case; h2 headers stay sentence case)
- Today: ${today}

Banned words and phrases — NEVER use these or close variants. They read as low-quality AI filler, not editorial writing:
- Summary/conclusion crutches: "in summary", "in conclusion", "to summarize", "as a final thought", "at the end of the day", "all in all", "in essence", "ultimately" (as a paragraph opener)
- Empathy/filler verbs: "sympathize", "empathize", "resonate with", "speaks to"
- AI tells: "delve", "dive into", "navigate the world of", "navigate the landscape", "tapestry", "realm", "elevate", "embark", "unleash", "unlock", "harness", "leverage", "seamless", "game-changer", "testament to", "in today's fast-paced world", "when it comes to", "look no further", "the world of", "it's worth noting", "needless to say"
- Hype adjectives stacked for effect: "stunning", "breathtaking", "must-have", "ultimate guide"
Write plainly and concretely instead. If a sentence only works with one of these words, rewrite the sentence.

Respond with EXACTLY this format, no extra commentary:
TITLE: [60 chars max, Title Case — capitalize the first word and every major word (e.g. "Why Small Luxury Stays Win on Trust"); editorial, not SEO-stuffed]
EXCERPT: [one sentence, under 120 chars, conversational]
SEO_DESC: [155 chars, search-optimized but human]
TAGS: [3-5 lowercase comma-separated]
PULL_QUOTE: [the one most resonant sentence from the post]
IMAGE_QUERY_HERO: [black and white boutique hotel editorial subject — 5-7 words]
IMAGE_QUERY_1: [black and white travel editorial — 5-7 words, different from hero]
IMAGE_QUERY_2: [black and white hospitality editorial — 5-7 words, different from above]
IMAGE_QUERY_3: [black and white creator travel editorial — 5-7 words, different from above]
CONTENT:
[your full HTML here, with %%INLINE_IMAGE_1%%, %%INLINE_IMAGE_2%%, %%INLINE_IMAGE_3%% markers in place]`;

    const raw = await llmChat([
      { role: "system", content: "You are an editorial writer for a boutique travel publication. Follow the output format exactly. Place image markers exactly where specified." },
      { role: "user", content: writePrompt },
    ], 3000);
    console.log(`generatePost write ok — ${raw.length} chars`);

    // Models sometimes bold the format labels (**TITLE:** ...) — strip the
    // markdown asterisks and bracket wrappers from label lines and values.
    const extract = (key: string) => {
      const match = raw.match(new RegExp(`${key}\\**:\\**\\s*(.+)`));
      return match ? match[1].trim().replace(/^[*\[\s]+|[*\]\s]+$/g, "") : "";
    };
    const contentMatch = raw.match(/CONTENT\**:\**\s*([\s\S]+)/);

    const title      = toTitleCase(extract("TITLE"));
    const excerpt    = extract("EXCERPT");
    const seoDesc    = extract("SEO_DESC");
    const tagsRaw    = extract("TAGS");
    const pullQuote  = extract("PULL_QUOTE");
    const imgHero    = extract("IMAGE_QUERY_HERO");
    const img1       = extract("IMAGE_QUERY_1");
    const img2       = extract("IMAGE_QUERY_2");
    const img3       = extract("IMAGE_QUERY_3");
    const content    = contentMatch ? contentMatch[1].trim().replace(/^\*+\s*/, "") : raw;
    const tags       = tagsRaw.split(",").map((t: string) => t.trim()).filter(Boolean);

    if (!title || !content) {
      throw new Error("The writer model returned incomplete post data — try again");
    }

    // ── 3. Fetch images from Unsplash (B&W filter) ────────────────────────────
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

    // ── 4. Store as draft ─────────────────────────────────────────────────────
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
      sources: web.sources,
      seo_description: seoDesc,
      reading_time: readingTime(content),
      is_stats_post: isStatsPost,
    });

    return { postId, title, slug };
  },
});

// ─── Action: suggest topic ideas via NVIDIA ───────────────────────────────────

export const suggestTopics = action({
  args: {},
  handler: async (): Promise<string[]> => {
    let content = "";
    try {
      content = await llmChat([
        { role: "system", content: "You are a content strategist for Collabnb — a marketplace connecting boutique hotel/Airbnb hosts with UGC travel creators for content-for-stay partnerships. Be creative and specific." },
        { role: "user", content: 'Give me exactly 8 fresh, specific blog post topic ideas for The Collabnb Journal. Mix topics for boutique hosts and UGC creators. Return ONLY a valid JSON array of 8 strings, nothing else. Example: ["topic one", "topic two"]' },
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
