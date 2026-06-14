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
    hero_image_url: v.optional(v.string()),
    hero_image_alt: v.optional(v.string()),
    hero_image_credit: v.optional(v.string()),
    hero_image_credit_url: v.optional(v.string()),
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
    const nvidiaKey  = process.env.NVIDIA_API_KEY;
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

    if (!nvidiaKey || !unsplashKey) {
      throw new Error("Missing API keys. Set NVIDIA_API_KEY and UNSPLASH_ACCESS_KEY in Convex env.");
    }

    // ── 1. Research phase via NVIDIA ──────────────────────────────────────────
    let statsContext = "";
    if (isStatsPost) {
      const stats: any = await ctx.runQuery(api.blog.getPlatformStats_internal, {});
      statsContext = `Platform stats: ${stats.creators} creators, ${stats.hosts} hosts, ${stats.approvedCollabs} completed collabs, ${stats.activeListings} active listings.`;
    }

    const topic = topicHint || "UGC creator travel collabs and boutique hospitality marketing";
    const researchPrompt = isStatsPost
      ? `You are a content strategist for Collabnb, a marketplace connecting boutique hotel/Airbnb hosts with UGC travel creators for content-for-stay partnerships. ${statsContext}

Produce a detailed research brief covering: recent UGC marketing trends in hospitality (2024-2025), key statistics on creator-driven bookings, what's working for boutique properties vs large chains, and relevant industry developments. Include specific data points, percentages, and real-world examples. Be comprehensive — this brief will be used to write a blog post.`
      : `You are a content strategist for Collabnb, a marketplace connecting boutique hotel/Airbnb hosts with UGC travel creators for content-for-stay partnerships.

Produce a detailed research brief on: ${topic}. Cover: key trends and statistics (2024-2025), successful real-world examples of creator-property collaborations, what boutique hosts and UGC creators each need from partnerships, and actionable insights. Include specific data points and percentages where possible. Be comprehensive — this brief will be used to write a blog post.`;

    const research = await nvidiaChat(nvidiaKey, [
      { role: "system", content: "You are an expert content strategist specializing in travel, hospitality, and creator economy trends. Produce detailed, fact-rich research briefs." },
      { role: "user", content: researchPrompt },
    ], 1500);

    // ── 2. Write post via NVIDIA ──────────────────────────────────────────────
    const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const category = isStatsPost ? "stats" : (
      topic.toLowerCase().includes("host") ? "hosts" :
      topic.toLowerCase().includes("creator") ? "creators" : "industry"
    );

    const writePrompt = `You are the content editor for Collabnb — a marketplace where boutique hospitality hosts offer free or discounted stays to UGC creators and travel influencers in exchange for content (Reels, TikToks, photography).

Based on this research brief:
${research}

Write a polished, engaging blog post (700-950 words) for The Collabnb Journal. Audience: boutique hotel owners, Airbnb superhosts, and UGC travel creators.

Requirements:
- Compelling, specific headline (NOT generic clickbait)
- Conversational but authoritative tone — no corporate fluff
- 3-4 clearly structured sections with h2 headings
- Concrete data point or real example in each section
- Short CTA at the end pointing to <a href="https://collabnb.com/join">collabnb.com/join</a>
- HTML using ONLY: h2, p, ul, li, strong, em, a tags — NO h1, NO html/body wrapper
- Today: ${today}

Respond with EXACTLY this format (no markdown, no extra commentary):
TITLE: [your title here]
EXCERPT: [1-2 sentence teaser, 120-160 chars]
SEO_DESC: [meta description, 150-160 chars]
TAGS: [3-5 comma-separated lowercase tags]
IMAGE_QUERY: [2-4 word Unsplash search term for hero photo, e.g. boutique hotel room]
CONTENT:
[your HTML content here]`;

    const raw = await nvidiaChat(nvidiaKey, [
      { role: "system", content: "You are an expert blog writer for a travel-tech startup. Follow the output format exactly." },
      { role: "user", content: writePrompt },
    ], 2500);

    const extract = (key: string) => {
      const match = raw.match(new RegExp(`${key}:\\s*(.+)`));
      return match ? match[1].trim() : "";
    };
    const contentMatch = raw.match(/CONTENT:\s*([\s\S]+)/);

    const title      = extract("TITLE");
    const excerpt    = extract("EXCERPT");
    const seoDesc    = extract("SEO_DESC");
    const tagsRaw    = extract("TAGS");
    const imageQuery = extract("IMAGE_QUERY");
    const content    = contentMatch ? contentMatch[1].trim() : raw;
    const tags       = tagsRaw.split(",").map((t: string) => t.trim()).filter(Boolean);

    if (!title || !content) {
      throw new Error("NVIDIA returned incomplete post data — try again");
    }

    // ── 3. Fetch hero image from Unsplash ─────────────────────────────────────
    let heroUrl: string | undefined;
    let heroAlt: string | undefined;
    let heroCredit: string | undefined;
    let heroCreditUrl: string | undefined;

    try {
      const q = encodeURIComponent(imageQuery || "boutique hotel travel");
      const unsplashRes = await fetch(
        `https://api.unsplash.com/search/photos?query=${q}&per_page=3&orientation=landscape&content_filter=high`,
        { headers: { "Authorization": `Client-ID ${unsplashKey}` } }
      );
      if (unsplashRes.ok) {
        const unsplashData = await unsplashRes.json();
        const photo = unsplashData.results?.[0];
        if (photo) {
          heroUrl       = photo.urls?.regular;
          heroAlt       = photo.alt_description || imageQuery || "Blog hero image";
          heroCredit    = photo.user?.name;
          heroCreditUrl = `https://unsplash.com/@${photo.user?.username}?utm_source=collabnb&utm_medium=referral`;
          await fetch(photo.links?.download_location, {
            headers: { "Authorization": `Client-ID ${unsplashKey}` }
          }).catch(() => {});
        }
      }
    } catch {
      // Image is optional
    }

    // ── 4. Store as draft ─────────────────────────────────────────────────────
    const slug = slugify(title);
    const postId = await ctx.runMutation(api.blog.createGeneratedPost, {
      title,
      slug,
      excerpt,
      content,
      category,
      tags,
      hero_image_url: heroUrl,
      hero_image_alt: heroAlt,
      hero_image_credit: heroCredit,
      hero_image_credit_url: heroCreditUrl,
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
