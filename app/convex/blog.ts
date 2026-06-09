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

// ─── Action: generate a blog post via Perplexity + Claude + Unsplash ─────────
//
// Required Convex environment variables (set via: npx convex env set KEY value):
//   PERPLEXITY_API_KEY   — from console.perplexity.ai
//   ANTHROPIC_API_KEY    — from console.anthropic.com
//   UNSPLASH_ACCESS_KEY  — from unsplash.com/developers
//
// ─────────────────────────────────────────────────────────────────────────────

export const generatePost = action({
  args: {
    isStatsPost: v.optional(v.boolean()),
    topicHint: v.optional(v.string()), // optional override topic from admin
  },
  handler: async (ctx, { isStatsPost = false, topicHint }) => {
    const perplexityKey = process.env.PERPLEXITY_API_KEY;
    const anthropicKey  = process.env.ANTHROPIC_API_KEY;
    const unsplashKey   = process.env.UNSPLASH_ACCESS_KEY;

    if (!perplexityKey || !anthropicKey || !unsplashKey) {
      throw new Error(
        "Missing API keys. Set PERPLEXITY_API_KEY, ANTHROPIC_API_KEY, and UNSPLASH_ACCESS_KEY in Convex env."
      );
    }

    // ── 1. Research via Perplexity ────────────────────────────────────────────
    let researchPrompt: string;

    if (isStatsPost) {
      const stats: any = await ctx.runQuery(api.blog.getPlatformStats_internal, {});
      researchPrompt = `
        Write a monthly platform update blog post for Collabnb (a marketplace connecting boutique hospitality hosts with UGC creators).
        Real platform stats: ${stats.creators} creators, ${stats.hosts} hosts, ${stats.approvedCollabs} completed collabs, ${stats.activeListings} active listings.
        Research recent UGC creator travel trends and boutique hospitality news from the past month to add context.
        Include relevant industry benchmarks.
      `;
    } else {
      const topic = topicHint || "latest trends in UGC creator travel collabs and boutique hospitality marketing";
      researchPrompt = `
        Research ${topic}. Find:
        1. Recent successful examples of creator-property content collaborations (2024-2025)
        2. Statistics on UGC marketing effectiveness for boutique hotels and vacation rentals
        3. What creators and hosts look for in collab partnerships
        4. Competitor approaches (Airbnb Experiences, GetYourGuide, Stay Bnb, etc.)
        Focus on actionable insights for boutique hosts and UGC travel creators.
        Cite specific examples and numbers where possible.
      `;
    }

    const perplexityRes = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${perplexityKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-large-128k-online",
        messages: [{ role: "user", content: researchPrompt }],
        return_citations: true,
        search_recency_filter: "month",
      }),
    });

    if (!perplexityRes.ok) {
      throw new Error(`Perplexity error: ${perplexityRes.status}`);
    }

    const perplexityData = await perplexityRes.json();
    const research = perplexityData.choices?.[0]?.message?.content || "";
    const sources: string[] = (perplexityData.citations || []).slice(0, 5);

    // ── 2. Write post via Claude ──────────────────────────────────────────────
    const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const category = isStatsPost ? "stats" : (
      research.toLowerCase().includes("host") ? "hosts" :
      research.toLowerCase().includes("creator") ? "creators" : "industry"
    );

    const writePrompt = `
You are the content editor for Collabnb — a marketplace where boutique hospitality hosts offer free or discounted stays to UGC creators and travel influencers in exchange for content (Reels, TikToks, photography).

Based on this research:
${research}

Write a polished, engaging blog post (650-900 words) for the Collabnb blog. Audience: boutique hotel owners, Airbnb superhosts, and UGC travel creators.

Requirements:
- Headline that is specific and compelling (not generic)
- Natural, conversational but authoritative tone — NOT corporate fluff
- 3-4 clearly structured sections with h2 headings
- At least one specific data point or real example per section
- End with a short CTA to join Collabnb's waitlist at collabnb.com/join
- Format: clean HTML using only h2, p, ul, li, strong, em, a tags
- Do NOT include h1 (that's the title), do NOT wrap in html/body tags
- Today's date for context: ${today}

Also provide (separated by |||):
TITLE: [compelling post title, 50-70 chars]
EXCERPT: [1-2 sentence summary for the blog listing, 120-160 chars]
SEO_DESC: [meta description, 150-160 chars]
TAGS: [3-5 comma-separated tags]
IMAGE_QUERY: [2-4 word Unsplash search query for hero image, e.g. "boutique hotel room" or "travel creator photography"]

Format your response exactly as:
TITLE: ...
EXCERPT: ...
SEO_DESC: ...
TAGS: ...
IMAGE_QUERY: ...
CONTENT:
[html content here]
    `;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8-20251101",
        max_tokens: 2500,
        messages: [{ role: "user", content: writePrompt }],
      }),
    });

    if (!claudeRes.ok) {
      throw new Error(`Claude error: ${claudeRes.status}`);
    }

    const claudeData = await claudeRes.json();
    const raw = claudeData.content?.[0]?.text || "";

    // Parse the structured response
    const extract = (key: string) => {
      const match = raw.match(new RegExp(`${key}:\\s*(.+)`));
      return match ? match[1].trim() : "";
    };
    const contentMatch = raw.match(/CONTENT:\s*([\s\S]+)/);

    const title       = extract("TITLE");
    const excerpt     = extract("EXCERPT");
    const seoDesc     = extract("SEO_DESC");
    const tagsRaw     = extract("TAGS");
    const imageQuery  = extract("IMAGE_QUERY");
    const content     = contentMatch ? contentMatch[1].trim() : raw;
    const tags        = tagsRaw.split(",").map((t: string) => t.trim()).filter(Boolean);

    if (!title || !content) {
      throw new Error("Claude returned incomplete post data");
    }

    // ── 3. Fetch hero image from Unsplash ─────────────────────────────────────
    let heroUrl: string | undefined;
    let heroAlt: string | undefined;
    let heroCredit: string | undefined;
    let heroCreditUrl: string | undefined;

    try {
      const query = encodeURIComponent(imageQuery || "boutique hotel travel");
      const unsplashRes = await fetch(
        `https://api.unsplash.com/search/photos?query=${query}&per_page=3&orientation=landscape&content_filter=high`,
        { headers: { "Authorization": `Client-ID ${unsplashKey}` } }
      );
      if (unsplashRes.ok) {
        const unsplashData = await unsplashRes.json();
        const photo = unsplashData.results?.[0];
        if (photo) {
          heroUrl = photo.urls?.regular;
          heroAlt = photo.alt_description || imageQuery || "Blog hero image";
          heroCredit = photo.user?.name;
          heroCreditUrl = `https://unsplash.com/@${photo.user?.username}?utm_source=collabnb&utm_medium=referral`;
          // Trigger Unsplash download event (required by their API terms)
          await fetch(photo.links?.download_location, {
            headers: { "Authorization": `Client-ID ${unsplashKey}` }
          }).catch(() => {});
        }
      }
    } catch {
      // Image is optional — continue without it
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
      sources,
      seo_description: seoDesc,
      reading_time: readingTime(content),
      is_stats_post: isStatsPost,
    });

    return { postId, title, slug };
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
