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
    instagram_embed_url: v.optional(v.string()),
    hero_image_url: v.optional(v.string()),
    hero_image_alt: v.optional(v.string()),
    seo_description: v.optional(v.string()),
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
    if (fields.instagram_embed_url !== undefined) updates.instagram_embed_url = fields.instagram_embed_url;
    if (fields.hero_image_url !== undefined) updates.hero_image_url = fields.hero_image_url;
    if (fields.hero_image_alt !== undefined) updates.hero_image_alt = fields.hero_image_alt;
    if (fields.seo_description !== undefined) updates.seo_description = fields.seo_description;
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

// ─── Action: generate a blog post via NVIDIA NIM + Unsplash ──────────────────
//
// Required Convex environment variables:
//   NVIDIA_API_KEY       — from build.nvidia.com
//   UNSPLASH_ACCESS_KEY  — from unsplash.com/developers
//
// ─────────────────────────────────────────────────────────────────────────────

async function nvidiaChat(apiKey: string, messages: {role: string; content: string}[], maxTokens = 2048): Promise<string> {
  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta/llama-3.3-70b-instruct",
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: false,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.status.toString());
    throw new Error(`NVIDIA API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export const generatePost = action({
  args: {
    isStatsPost: v.optional(v.boolean()),
    topicHint: v.optional(v.string()),
  },
  handler: async (ctx, { isStatsPost = false, topicHint }) => {
    const nvidiaKey   = process.env.NVIDIA_API_KEY;
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

    if (!nvidiaKey || !unsplashKey) {
      throw new Error("Missing API keys. Set NVIDIA_API_KEY and UNSPLASH_ACCESS_KEY in Convex env.");
    }

    // ── 1. Research phase ─────────────────────────────────────────────────────
    let statsContext = "";
    if (isStatsPost) {
      const stats: any = await ctx.runQuery(api.blog.getPlatformStats_internal, {});
      statsContext = `Platform stats: ${stats.creators} creators, ${stats.hosts} hosts, ${stats.approvedCollabs} completed collabs, ${stats.activeListings} active listings.`;
    }

    const topic = topicHint || "the economics of content-for-stay partnerships between boutique hosts and UGC creators";
    const researchPrompt = isStatsPost
      ? `You are a content strategist for Collabnb, a marketplace connecting boutique hotel/Airbnb hosts with UGC travel creators. ${statsContext}

Produce a detailed research brief covering: UGC marketing trends in hospitality (2024-2025), creator-driven booking statistics, what's working for boutique properties vs chains. Include specific data points and real-world examples.`
      : `You are a content strategist for Collabnb, a marketplace connecting boutique hotel/Airbnb hosts with UGC travel creators for content-for-stay partnerships.

Produce a detailed research brief on: ${topic}. Cover: key trends and data (2024-2025), real-world examples of creator-property collaborations, what boutique hosts and UGC creators each need from partnerships, actionable insights. Be concrete — include specific examples, data points where known, and avoid vague generalities.`;

    const research = await nvidiaChat(nvidiaKey, [
      { role: "system", content: "You are an expert content strategist specializing in travel, hospitality, and the creator economy. Produce detailed, concrete research briefs — name real properties, real campaigns, real data points." },
      { role: "user", content: researchPrompt },
    ], 1500);

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

    const raw = await nvidiaChat(nvidiaKey, [
      { role: "system", content: "You are an editorial writer for a boutique travel publication. Follow the output format exactly. Place image markers exactly where specified." },
      { role: "user", content: writePrompt },
    ], 3000);

    const extract = (key: string) => {
      const match = raw.match(new RegExp(`${key}:\\s*(.+)`));
      return match ? match[1].trim() : "";
    };
    const contentMatch = raw.match(/CONTENT:\s*([\s\S]+)/);

    const title      = toTitleCase(extract("TITLE"));
    const excerpt    = extract("EXCERPT");
    const seoDesc    = extract("SEO_DESC");
    const tagsRaw    = extract("TAGS");
    const pullQuote  = extract("PULL_QUOTE");
    const imgHero    = extract("IMAGE_QUERY_HERO");
    const img1       = extract("IMAGE_QUERY_1");
    const img2       = extract("IMAGE_QUERY_2");
    const img3       = extract("IMAGE_QUERY_3");
    const content    = contentMatch ? contentMatch[1].trim() : raw;
    const tags       = tagsRaw.split(",").map((t: string) => t.trim()).filter(Boolean);

    if (!title || !content) {
      throw new Error("NVIDIA returned incomplete post data — try again");
    }

    // ── 3. Fetch images from Unsplash (B&W filter) ────────────────────────────
    async function fetchUnsplashImage(query: string, fallback: string) {
      try {
        const q = encodeURIComponent(query || fallback);
        const res = await fetch(
          `https://api.unsplash.com/search/photos?query=${q}&per_page=3&orientation=landscape&color=black_and_white&content_filter=high`,
          { headers: { "Authorization": `Client-ID ${unsplashKey}` } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const photo = data.results?.[0];
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
      sources: [],
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
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) return [];
    const content = await nvidiaChat(apiKey, [
      { role: "system", content: "You are a content strategist for Collabnb — a marketplace connecting boutique hotel/Airbnb hosts with UGC travel creators for content-for-stay partnerships. Be creative and specific." },
      { role: "user", content: 'Give me exactly 8 fresh, specific blog post topic ideas for The Collabnb Journal. Mix topics for boutique hosts and UGC creators. Return ONLY a valid JSON array of 8 strings, nothing else. Example: ["topic one", "topic two"]' },
    ], 400);
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
