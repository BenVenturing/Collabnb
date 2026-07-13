// Layered web research for blog generation. Each layer degrades gracefully:
//   1. Curated journal RSS (free, no key)  → recent headlines + links
//   2. Jina Reader (free; JINA_API_KEY optional for higher limits)
//                                          → full text of the most relevant articles
//   3. ScrapeGraphAI (SGAI_API_KEY)        → topic search + statistics pass
//   4. Firecrawl (FIRECRAWL_API_KEY)       → search fallback when no SGAI key

export type Headline = { title: string; url: string; source: string; publishedAt: number };
export type ResearchBrief = { context: string; sources: string[]; headlines: Headline[] };

// PhocusWire and Hospitality Net serve their RSS behind Cloudflare (403 to
// server-side fetches); Google News mirrors their latest posts reliably.
const CURATED_FEEDS = [
  { source: "Skift", url: "https://skift.com/feed/" },
  { source: "Hotel Dive", url: "https://www.hoteldive.com/feeds/news/" },
  { source: "PhocusWire", url: "https://news.google.com/rss/search?q=site:phocuswire.com&hl=en-US&gl=US&ceid=US:en" },
  { source: "Hospitality Net", url: "https://news.google.com/rss/search?q=site:hospitalitynet.org&hl=en-US&gl=US&ceid=US:en" },
];

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 12_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFeed(feed: { source: string; url: string }): Promise<Headline[]> {
  try {
    const res = await fetchWithTimeout(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CollabnbJournal/1.0)" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.match(/<item[\s>][\s\S]*?<\/item>/g) || [];
    return items.slice(0, 8).flatMap((item) => {
      const title = decodeEntities(item.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || "")
        // Google News appends " - Publication" to titles
        .replace(new RegExp(`\\s+-\\s+${feed.source}$`, "i"), "");
      const url = decodeEntities(item.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1] || "");
      const pub = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/)?.[1] || "";
      const publishedAt = pub ? Date.parse(pub) || 0 : 0;
      if (!title || !url) return [];
      return [{ title, url, source: feed.source, publishedAt }];
    });
  } catch {
    return [];
  }
}

export async function fetchHeadlines(): Promise<Headline[]> {
  const all = await Promise.all(CURATED_FEEDS.map(fetchFeed));
  return all
    .flat()
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, 24);
}

// Keyword-overlap relevance — deterministic and free. The writer receives
// several articles, so precision matters less than avoiding zero hits.
function scoreHeadline(headline: Headline, topic: string): number {
  const stop = new Set(["the", "a", "an", "and", "or", "of", "for", "to", "in", "on", "with", "how", "what", "why", "should", "their", "your"]);
  const topicWords = topic.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !stop.has(w));
  const title = headline.title.toLowerCase();
  let score = 0;
  for (const w of topicWords) if (title.includes(w)) score++;
  return score;
}

// Jina Reader converts any URL (including Cloudflare-fronted and Google News
// redirect links) to markdown. Returns the resolved final URL for citations.
async function jinaRead(url: string): Promise<{ text: string; finalUrl: string } | null> {
  try {
    const headers: Record<string, string> = {};
    if (process.env.JINA_API_KEY) headers["Authorization"] = `Bearer ${process.env.JINA_API_KEY}`;
    const res = await fetchWithTimeout(`https://r.jina.ai/${url}`, { headers }, 25_000);
    if (!res.ok) return null;
    const raw = await res.text();
    const finalUrl = raw.match(/^URL Source:\s*(\S+)/m)?.[1] || url;
    const bodyIdx = raw.indexOf("Markdown Content:");
    let text = bodyIdx >= 0 ? raw.slice(bodyIdx + "Markdown Content:".length) : raw;
    // Drop link-only nav lines and images; keep prose.
    text = text
      .split("\n")
      .filter((line) => {
        const t = line.trim();
        if (!t) return false;
        if (/^!\[/.test(t)) return false;
        const stripped = t.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
        return stripped.replace(/[^a-zA-Z]/g, "").length > 30 || /\d/.test(stripped);
      })
      .join("\n");
    if (text.length < 200) return null;
    return { text: text.slice(0, 2500), finalUrl };
  } catch {
    return null;
  }
}

async function sgaiSearch(prompt: string): Promise<{ context: string; sources: string[] } | null> {
  const key = process.env.SGAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetchWithTimeout(
      "https://api.scrapegraphai.com/v1/searchscraper",
      {
        method: "POST",
        headers: { "SGAI-APIKEY": key, "Content-Type": "application/json" },
        body: JSON.stringify({ user_prompt: prompt }),
      },
      60_000
    );
    if (!res.ok) return null;
    const data = await res.json();
    const sources: string[] = Array.isArray(data.reference_urls) ? data.reference_urls.slice(0, 5) : [];
    const context = typeof data.result === "string" ? data.result : JSON.stringify(data.result ?? "");
    return context ? { context: context.slice(0, 3000), sources } : null;
  } catch {
    return null;
  }
}

async function firecrawlSearch(topic: string): Promise<{ context: string; sources: string[] } | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  try {
    const res = await fetchWithTimeout(
      "https://api.firecrawl.dev/v1/search",
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: topic, limit: 5, scrapeOptions: { formats: ["markdown"] } }),
      },
      60_000
    );
    if (!res.ok) return null;
    const data = await res.json();
    const results: any[] = data.data || [];
    const sources = results.map((r) => r.url).filter(Boolean).slice(0, 5);
    const context = results
      .map((r) => `SOURCE: ${r.url}\n${String(r.markdown || r.description || "").slice(0, 800)}`)
      .join("\n\n")
      .slice(0, 3000);
    return context ? { context, sources } : null;
  } catch {
    return null;
  }
}

export async function buildResearchBrief(topic: string, preFetched?: Headline[]): Promise<ResearchBrief> {
  const headlines = preFetched ?? (await fetchHeadlines());

  // Pull full text of the most topic-relevant articles (fall back to the two
  // freshest from different sources so the brief always has current news).
  const ranked = headlines
    .map((h) => ({ h, score: scoreHeadline(h, topic) }))
    .sort((a, b) => b.score - a.score || b.h.publishedAt - a.h.publishedAt);
  const relevant = ranked.filter((r) => r.score > 0).slice(0, 3).map((r) => r.h);
  if (relevant.length < 2) {
    for (const { h } of ranked) {
      if (relevant.length >= 2) break;
      if (!relevant.includes(h) && !relevant.some((r) => r.source === h.source)) relevant.push(h);
    }
  }

  const [articles, sgaiTopic, sgaiStats] = await Promise.all([
    Promise.all(relevant.map((h) => jinaRead(h.url))),
    sgaiSearch(
      `Find current data, real examples, and expert commentary about: ${topic}. Focus on hospitality, boutique hotels, UGC creators, and content-for-stay partnerships.`
    ),
    sgaiSearch(
      `Find recent statistics WITH SPECIFIC NUMBERS (percentages, dollar figures, growth rates, 2025-2026) about: ${topic} — hospitality industry, creator economy, influencer marketing.`
    ),
  ]);

  const firecrawl = sgaiTopic ? null : await firecrawlSearch(topic);

  const parts: string[] = [];
  const sources: string[] = [];

  if (headlines.length > 0) {
    parts.push(
      "RECENT INDUSTRY HEADLINES (this week, from Skift / PhocusWire / Hospitality Net / Hotel Dive):\n" +
        headlines.slice(0, 12).map((h) => `- [${h.source}] ${h.title}`).join("\n")
    );
  }

  articles.forEach((a, i) => {
    if (!a) return;
    const h = relevant[i];
    parts.push(`ARTICLE — "${h.title}" (${h.source}, ${a.finalUrl}):\n${a.text}`);
    sources.push(a.finalUrl);
  });

  if (sgaiTopic) {
    parts.push(`WEB SEARCH FINDINGS:\n${sgaiTopic.context}`);
    sources.push(...sgaiTopic.sources);
  }
  if (sgaiStats) {
    parts.push(`STATISTICS FOUND (cite only these numbers, with attribution):\n${sgaiStats.context}`);
    sources.push(...sgaiStats.sources);
  }
  if (firecrawl) {
    parts.push(`WEB SEARCH FINDINGS:\n${firecrawl.context}`);
    sources.push(...firecrawl.sources);
  }

  const dedupedSources = [...new Set(sources.filter((s) => s.startsWith("http") && !s.includes("news.google.com")))].slice(0, 8);

  return {
    context: parts.join("\n\n").slice(0, 9000),
    sources: dedupedSources,
    headlines,
  };
}
