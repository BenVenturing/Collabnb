import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { hikerGet, findMarketingContact } from "./prospects";
import { llmChat } from "./blog";
import { detectChain, outreachRank } from "./lib/chains";
import { requireAdmin } from "./lib/auth";

// Daily automated hotel outreach: named-person email with a real IG audit page
// (collabnb.com/audit/<token>) + one-click pre-filled claim link, A/B/C copy
// rotation, 3 follow-ups (day 3/7/14, stop on build click), and a DM nudge drafted into the CRM for Ben to send by hand.
// Config lives in admin_settings "auto_outreach" (see setConfig).

const CONFIG_KEY = "auto_outreach";
const LOGO = "https://media.collabnb.com/claims/somewhere-lombok/email/logo.png";
const REPLY_TO = "ben@collabnb.com";
const FALLBACK_FROM = "Benjamin at Collabnb <ben@outreach.collabnb.com>";
const VIBE_TAG_POOL = [
  "Cozy", "Luxury", "Adventure", "Minimalist", "Romantic", "Rustic", "Modern",
  "Tropical", "Boho", "Family-Friendly", "Pet-Friendly", "Remote Work", "Wellness",
  "Beachfront", "Mountain View", "Secluded", "Urban", "Historic", "Eco-Friendly",
  "Instagrammable", "Off-Grid", "Wine Country", "Desert", "Lakeside", "Treehouse",
  "Glamping", "Chef's Kitchen", "Pool Access", "Ski-In/Ski-Out", "Artsy",
];

type Config = { enabled: boolean; start: string; startCap: number; step: number; everyDays: number; max: number; bcc?: string };

const todayKey = () => new Date().toISOString().slice(0, 10);
const DAY = 86_400_000;

function readConfig(settings: Record<string, string>): Config {
  let c: any = {};
  try { c = JSON.parse(settings[CONFIG_KEY] || "{}"); } catch { /* default */ }
  return { enabled: false, start: todayKey(), startCap: 15, step: 5, everyDays: 3, max: 50, ...c };
}

function dailyCap(cfg: Config): number {
  const days = Math.max(0, Math.floor((Date.now() - Date.parse(cfg.start)) / DAY));
  const ramp = cfg.startCap + cfg.step * Math.floor(days / cfg.everyDays);
  const max = cfg.max;
  return Math.min(max, ramp);
}

const validEmail = (e?: string) => !!e && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e) && !/example|sentry|wix|domain\.com/i.test(e);
const realHandle = (p: any): string | undefined => {
  const h = p.ig_handle || (String(p.instagram_handle || "").startsWith("hc-") ? undefined : p.instagram_handle);
  return h ? String(h).replace(/^@/, "").toLowerCase() : undefined;
};
const isAutoToday = (p: any, day: string) =>
  (p.outreach_log || []).some((e: any) => e.type === "email_sent" && String(e.note || "").startsWith("auto ") && new Date(e.at).toISOString().slice(0, 10) === day);

// ─── Config ──────────────────────────────────────────────────────────────────
// npx convex run --prod autoOutreach:setConfig '{"enabled":true}'
export const setConfig = internalMutation({
  args: { enabled: v.optional(v.boolean()), startCap: v.optional(v.number()), step: v.optional(v.number()), everyDays: v.optional(v.number()), max: v.optional(v.number()), bcc: v.optional(v.string()), restartRamp: v.optional(v.boolean()) },
  handler: async (ctx, { restartRamp, ...patch }) => {
    const row = await ctx.db.query("admin_settings").withIndex("by_key", (q) => q.eq("key", CONFIG_KEY)).first();
    let cur: any = {};
    try { cur = JSON.parse(row?.value || "{}"); } catch { /* reset */ }
    const next = { ...cur, ...Object.fromEntries(Object.entries(patch).filter(([, x]) => x !== undefined)) };
    if (!next.start || restartRamp || (patch.enabled && !cur.enabled)) next.start = todayKey();
    const value = JSON.stringify(next);
    if (row) await ctx.db.patch(row._id, { value });
    else await ctx.db.insert("admin_settings", { key: CONFIG_KEY, value });
    return { ...readConfig({ [CONFIG_KEY]: value }), capToday: dailyCap(readConfig({ [CONFIG_KEY]: value })) };
  },
});

const MAX_FOLLOWERS = 25_000;
const BIG_PROPERTY = /\b(resort|resorts|casino|convention|conference cent(er|re)|shingle creek|halekulani|tower|towers|club|vacation (club|rentals?)|timeshare|condo(minium)?s?)\b/i;

// ─── Candidate pool ──────────────────────────────────────────────────────────
export const pool = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    const rows = (await ctx.db.query("prospects").withIndex("by_kind_status", (q) => q.eq("kind", "host")).collect()) as any[];
    const day = todayKey();
    const sentToday = rows.filter((p) => isAutoToday(p, day)).length;
    const stats = { hosts: rows.length, fresh: 0, withHandle: 0, withEmail: 0, independent: 0, eligible: 0 };
    const eligible = rows.filter((p) => {
      if (!["new", "queued"].includes(p.status)) return false;
      if ((p.outreach_log || []).some((e: any) => e.type === "email_sent") || p.brief_sent_at || p.instant_launch_sent_at || p.audit_pdf_sent_at || p.contacted_at) return false;
      if ((p.tags || []).some((t: string) => t.startsWith("contacted") || t.startsWith("auto"))) return false;
      stats.fresh++;
      if (!realHandle(p) && !p.website) return false;
      stats.withHandle++;
      if (!validEmail(p.marketing_email) && !validEmail(p.email) && !p.website) return false;
      stats.withEmail++;
      if (detectChain(p)) return false;
      if (BIG_PROPERTY.test(String(p.display_name || ""))) return false;
      if ((p.follower_count ?? 0) > MAX_FOLLOWERS) return false;
      stats.independent++;
      return true;
    });
    stats.eligible = eligible.length;
    const key = (p: any) => [String(p.marketing_email || p.email || "").toLowerCase(), String(realHandle(p) || "").toLowerCase()].filter(Boolean);
    const taken = new Set<string>();
    rows.filter((p) => (p.tags || []).some((t: string) => t.startsWith("auto") || t.startsWith("contacted")) || p.status === "emailed").forEach((p) => key(p).forEach((k) => taken.add(k)));
    const seen = new Set(taken);
    const unique = eligible.filter((p) => { const ks = key(p); if (ks.some((k) => seen.has(k))) return false; ks.forEach((k) => seen.add(k)); return true; });
    eligible.length = 0; eligible.push(...unique);
    // Smaller, boutique accounts first; unknown size sits in the middle.
    const sizeBonus = (p: any) => (p.follower_count == null ? 0.5 : 1 - Math.min(1, p.follower_count / MAX_FOLLOWERS));
    const rank = (p: any) => outreachRank(p) + (p.score ?? 0) / 100 + sizeBonus(p) + (realHandle(p) ? 1 : 0);
    eligible.sort((a, b) => rank(b) - rank(a));
    // Light shuffle: keep the overall order but mix within blocks of 10.
    for (let i = 0; i < eligible.length; i += 10) {
      const block = eligible.slice(i, i + 10).sort(() => Math.random() - 0.5);
      eligible.splice(i, block.length, ...block);
    }
    return { sentToday, stats, ids: eligible.slice(0, limit).map((p) => p._id) };
  },
});

export const sentTodayCount = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = (await ctx.db.query("prospects").withIndex("by_kind_status", (q) => q.eq("kind", "host").eq("status", "emailed")).collect()) as any[];
    return rows.filter((p) => isAutoToday(p, todayKey())).length;
  },
});

export const alreadyAudited = internalQuery({
  args: { email: v.string(), handle: v.string() },
  handler: async (ctx, { email, handle }) => {
    const rows = await ctx.db.query("hotel_audits").collect();
    return rows.some((r: any) => String(r.email).toLowerCase() === email.toLowerCase() || String(r.handle).toLowerCase() === handle.toLowerCase());
  },
});

export const profileExists = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) =>
    !!(await ctx.db.query("profiles").withIndex("by_email", (q) => q.eq("email", email.toLowerCase().trim())).unique()),
});

// ─── Daily entry point (cron) ────────────────────────────────────────────────
export const runDaily = internalAction({
  args: { dryRun: v.optional(v.boolean()), force: v.optional(v.number()) },
  handler: async (ctx, { dryRun, force }): Promise<any> => {
    const settings: Record<string, string> = await ctx.runQuery(internal.admin.getSettingsInternal, {});
    const cfg = readConfig(settings);
    const cap = force ?? dailyCap(cfg);
    const peek = await ctx.runQuery(internal.autoOutreach.pool, { limit: 0 });
    const remaining = Math.max(0, cap - peek.sentToday);
    const { ids, stats } = await ctx.runQuery(internal.autoOutreach.pool, { limit: Math.ceil(remaining * 3) });
    const summary = { enabled: cfg.enabled, cap, sentToday: peek.sentToday, scheduling: ids.length, pool: stats, from: process.env.OUTREACH_FROM || FALLBACK_FROM };
    if (dryRun || (!cfg.enabled && force === undefined) || !remaining) return summary;
    // One candidate every ~30s (plus jitter) so they don't land as one burst.
    const spread = 30_000;
    await Promise.all(ids.map((id: any, i: number) =>
      ctx.scheduler.runAfter(Math.round(i * spread + Math.random() * 10_000), internal.autoOutreach.processOne, { id, cap })));
    return summary;
  },
});

// ─── Instagram audit ─────────────────────────────────────────────────────────
type Post = { likes: number; comments: number; views?: number; video: boolean; at?: number; image?: string; code?: string; caption: string };

function mediaImage(m: any): string | undefined {
  const r = m.resources?.[0];
  return m.thumbnail_url || m.image_versions2?.candidates?.[0]?.url || r?.thumbnail_url || r?.image_versions2?.candidates?.[0]?.url;
}

async function fetchIgApify(handle: string) {
  const res = await fetch(`https://api.apify.com/v2/actors/apify~instagram-scraper/run-sync-get-dataset-items?token=${process.env.APIFY_TOKEN}&timeout=90`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ directUrls: [`https://www.instagram.com/${handle}/`], resultsType: "details", resultsLimit: 1, addParentData: false }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Apify ${res.status}: ${body.slice(0, 120)}`);
  const items: any[] = JSON.parse(body);
  const u = items.find((x) => x && (x.username || x.latestPosts)) || null;
  if (!u || u.private || u.error) return null;
  const posts: Post[] = (u.latestPosts || []).slice(0, 12).map((m: any) => ({
    likes: Math.max(0, Number(m.likesCount) || 0),
    comments: Math.max(0, Number(m.commentsCount) || 0),
    views: m.videoPlayCount ?? m.videoViewCount ?? undefined,
    video: m.type === "Video" || /clips/i.test(String(m.productType || "")),
    at: m.timestamp ? Date.parse(m.timestamp) || undefined : undefined,
    image: m.displayUrl,
    code: m.shortCode,
    caption: String(m.caption || "").slice(0, 280),
  }));
  return {
    followers: Number(u.followersCount || 0),
    fullName: u.fullName as string | undefined,
    bio: String(u.biography || ""),
    website: u.externalUrl as string | undefined,
    avatar: (u.profilePicUrlHD || u.profilePicUrl) as string | undefined,
    email: (u.businessEmail as string | undefined) || undefined,
    phone: (u.businessPhoneNumber as string | undefined) || undefined,
    city: (u.businessAddress?.city_name as string | undefined) || undefined,
    mediaCount: Number(u.postsCount || 0),
    posts: posts.sort((a, b) => (b.at || 0) - (a.at || 0)),
  };
}

async function fetchIg(handle: string) {
  if (process.env.APIFY_TOKEN) return fetchIgApify(handle);
  const u = await hikerGet("/v1/user/by/username", { username: handle });
  if (!u?.pk || u.is_private) return null;
  const raw = await hikerGet("/v1/user/medias", { user_id: String(u.pk), amount: 12 });
  const items: any[] = Array.isArray(raw) ? raw : raw?.items || raw?.response?.items || [];
  const posts: Post[] = items.map((m) => {
    const t = typeof m.taken_at_ts === "number" ? m.taken_at_ts * 1000 : typeof m.taken_at === "number" ? (m.taken_at > 1e12 ? m.taken_at : m.taken_at * 1000) : Date.parse(m.taken_at) || undefined;
    return {
      likes: m.like_count || 0,
      comments: m.comment_count || 0,
      views: m.play_count ?? m.view_count ?? undefined,
      video: m.media_type === 2 || /clips/i.test(String(m.product_type || "")),
      at: t,
      image: mediaImage(m),
      code: m.code,
      caption: String(m.caption_text || "").slice(0, 280),
    };
  });
  return {
    followers: Number(u.follower_count || 0),
    fullName: u.full_name as string | undefined,
    bio: String(u.biography || ""),
    website: u.external_url as string | undefined,
    avatar: (u.profile_pic_url_hd || u.profile_pic_url) as string | undefined,
    email: (u.public_email as string | undefined) || undefined,
    phone: u.public_phone_country_code && u.public_phone_number ? `${u.public_phone_country_code}${u.public_phone_number}` : undefined,
    city: u.city_name as string | undefined,
    mediaCount: Number(u.media_count || 0),
    posts: posts.sort((a, b) => (b.at || 0) - (a.at || 0)),
  };
}

function buildAudit(ig: NonNullable<Awaited<ReturnType<typeof fetchIg>>>) {
  const posts = ig.posts;
  const n = posts.length;
  const f = Math.max(1, ig.followers);
  const engs = posts.map((p) => ((p.likes + p.comments) / f) * 100);
  const eng = n ? engs.reduce((a, b) => a + b, 0) / n : 0;
  const daysSince = posts[0]?.at ? Math.floor((Date.now() - posts[0].at) / DAY) : 999;
  const last30 = posts.filter((p) => p.at && Date.now() - p.at < 30 * DAY).length;
  const reels = posts.filter((p) => p.video).length;
  const best = n ? Math.max(...engs) : 0;
  const bestX = eng > 0 ? best / eng : 0;
  const bestPost = posts[engs.indexOf(best)];
  const reelEng = reels ? posts.filter((p) => p.video).reduce((a, p) => a + (p.likes + p.comments), 0) / reels : 0;
  const imgEng = n - reels ? posts.filter((p) => !p.video).reduce((a, p) => a + (p.likes + p.comments), 0) / (n - reels) : 0;

  const findings: { title: string; detail: string; severity: "high" | "medium" | "good" }[] = [];
  if (eng < 1 && ig.followers >= 500) findings.push({ severity: "high", title: `${eng.toFixed(1)}% average engagement`, detail: `Your last ${n} posts averaged ${eng.toFixed(1)}% engagement on ${ig.followers.toLocaleString()} followers. Hospitality accounts that post creator content usually sit between 1% and 3%.` });
  else if (eng >= 3) findings.push({ severity: "good", title: `${eng.toFixed(1)}% average engagement`, detail: `Your audience is engaged. Creator content would put that engagement in front of new audiences who don't follow you yet.` });
  else findings.push({ severity: "medium", title: `${eng.toFixed(1)}% average engagement`, detail: `Your last ${n} posts averaged ${eng.toFixed(1)}% engagement on ${ig.followers.toLocaleString()} followers.` });
  if (daysSince >= 14) findings.push({ severity: daysSince >= 30 ? "high" : "medium", title: `${daysSince} days since your last post`, detail: `The algorithm favours accounts that post consistently. You posted ${last30} time${last30 === 1 ? "" : "s"} in the last 30 days.` });
  if (reels <= n * 0.25) findings.push({ severity: "high", title: `${reels} of your last ${n} posts were Reels`, detail: `Reels are how hotels reach people who don't already follow them.${reelEng && imgEng && reelEng > imgEng ? ` Yours already earn ${(reelEng / imgEng).toFixed(1)}x the interactions of your photo posts.` : ""}` });
  else if (reelEng && imgEng && reelEng > imgEng * 1.3) findings.push({ severity: "good", title: `Reels earn ${(reelEng / imgEng).toFixed(1)}x more interactions`, detail: `Your Reels clearly outperform photo posts, so more short-form video is the fastest lever.` });
  if (bestX >= 2.5 && bestPost) findings.push({ severity: "good", title: `Your best post did ${bestX.toFixed(1)}x your average`, detail: `One recent post earned ${bestX.toFixed(1)}x your average engagement. That's the kind of content creators can make on repeat.` });

  let teaser: string;
  if (eng < 1 && ig.followers >= 500) teaser = `your last ${n} posts averaged ${eng.toFixed(1)}% engagement`;
  else if (daysSince >= 21 && daysSince < 999) teaser = `no new Instagram post in ${daysSince} days`;
  else if (reels <= n * 0.25) teaser = `only ${reels} of your last ${n} posts were Reels`;
  else if (bestX >= 2) teaser = `your best recent post got ${bestX.toFixed(1)}x your average engagement`;
  else teaser = `your last ${n} posts averaged ${eng.toFixed(1)}% engagement`;

  return {
    followers: ig.followers, posts_analyzed: n, engagement: Number(eng.toFixed(2)), days_since_post: daysSince,
    posts_last_30: last30, reels, best_x: Number(bestX.toFixed(1)), best_post_url: bestPost?.code ? `https://www.instagram.com/p/${bestPost.code}/` : undefined,
    findings, teaser,
  };
}

const IG_RESERVED = new Set(["p", "reel", "reels", "explore", "accounts", "stories", "tv", "share", "instagram"]);
async function igFromWebsite(website?: string): Promise<string | undefined> {
  if (!website) return undefined;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(website.startsWith("http") ? website : `https://${website}`, { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 (Macintosh) Chrome/128 Safari/537.36" } });
    clearTimeout(t);
    const html = (await res.text()).slice(0, 600_000);
    for (const m of html.matchAll(/instagram\.com\/([A-Za-z0-9_.]{2,30})/g)) {
      const h = m[1].replace(/\.$/, "").toLowerCase();
      if (!IG_RESERVED.has(h)) return h;
    }
  } catch { /* unreachable site */ }
  return undefined;
}

// ─── Decision maker from the hotel's own site ────────────────────────────────
function htmlToText(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&amp;|&#39;|&quot;/g, " ").replace(/\s+/g, " ");
}

async function findDecisionMaker(website?: string): Promise<{ name: string; role: string } | null> {
  if (!website) return null;
  let base: URL;
  try { base = new URL(website.startsWith("http") ? website : `https://${website}`); } catch { return null; }
  let text = "";
  for (const path of ["/", "/about", "/about-us", "/our-story", "/team", "/contact"]) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(new URL(path, base).toString(), { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 (Macintosh) Chrome/128 Safari/537.36" } });
      clearTimeout(t);
      if (res.ok) text += " " + htmlToText((await res.text()).slice(0, 400_000)).slice(0, 5000);
    } catch { /* skip page */ }
    if (text.length > 16_000) break;
  }
  if (text.length < 200) return null;
  try {
    const out = await llmChat([
      { role: "system", content: "Extract one real person from hotel website text. Return JSON only." },
      { role: "user", content: `From this hotel website text, find the person most responsible for marketing decisions: marketing/PR/social media manager first, then owner/founder, then general manager. Only use a name that appears verbatim in the text. Return {"name":"Full Name","role":"Their role"} or {"name":null}.\n\n${text.slice(0, 15000)}` },
    ], 200, 30_000);
    const j = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
    if (!j?.name || !text.includes(j.name) || j.name.trim().split(/\s+/).length < 2 || j.name.split(" ").length > 4) return null;
    if (/\b(chef|sous|cook|bartender|sommelier|server|housekeep)/i.test(`${j.name} ${j.role || ""}`)) return null;
    return { name: String(j.name), role: String(j.role || "") };
  } catch { return null; }
}

// ─── Listing copy ────────────────────────────────────────────────────────────
async function draftListingCopy(hotel: string, p: any, ig: any) {
  const captions = ig.posts.slice(0, 8).map((x: Post) => x.caption).filter(Boolean).join("\n---\n");
  try {
    const out = await llmChat([
      { role: "system", content: "You write factual hotel listing copy for a creator-collab marketplace. Only use facts present in the input. Return JSON only." },
      { role: "user", content: `Hotel: ${hotel}\nLocation hint: ${p.location || ig.city || ""} ${p.country || ""}\nInstagram bio: ${ig.bio}\nRecent captions:\n${captions}\n\nReturn {"city":"","country":"","about":"2-3 sentence description","brief":"2-3 sentence creator collaboration brief built around 3 content ideas","ideas":["idea 1","idea 2","idea 3"],"perks":["up to 3 real amenities mentioned"],"vibe_tags":["up to 4 from: ${VIBE_TAG_POOL.join(", ")}"]}` },
    ], 900, 45_000);
    const j = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
    return {
      city: j.city || undefined, country: j.country || undefined,
      about: String(j.about || ""), brief: String(j.brief || ""),
      ideas: Array.isArray(j.ideas) ? j.ideas.slice(0, 3).map(String) : [],
      perks: Array.isArray(j.perks) ? j.perks.slice(0, 3).map(String) : [],
      vibe_tags: Array.isArray(j.vibe_tags) ? j.vibe_tags.filter((t: string) => VIBE_TAG_POOL.includes(t)).slice(0, 4) : [],
    };
  } catch {
    return { about: ig.bio, brief: "", ideas: [], perks: [], vibe_tags: [] as string[] };
  }
}

async function rehost(ctx: any, url?: string): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    if (blob.size < 5000) return undefined;
    const id = await ctx.storage.store(blob);
    return (await ctx.storage.getUrl(id)) || undefined;
  } catch { return undefined; }
}

// ─── Email ───────────────────────────────────────────────────────────────────
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type Variant = "A" | "B" | "C";
const VARIANTS: Variant[] = ["A", "B", "C"];
const SIGNOFF = "Warmly,\nBenjamin\nFounder, Collabnb\nWhatsApp +1 623-221-2170";

function variantSubject(v: Variant, hotel: string, teaser: string) {
  if (v === "B") return `Fresh Reels for ${hotel}, without the shoot`;
  if (v === "C") return `I put together a few notes on ${hotel}`;
  return `${hotel}: ${teaser}`;
}

// Each variant: paragraphs before the teaser box, after it, then CTA, then closing line.
// {AUDIT} marks the audit link sentence.
function variantCopy(v: Variant, hotel: string) {
  if (v === "B") return {
    lead: `Most boutique stays I talk to have the same problem: beautiful rooms, and not enough new content to show them off. I looked at ${hotel}'s Instagram and saw it there too:`,
    body: [
      `I'm Benjamin, and I run Collabnb. We match independent stays with vetted travel creators. They stay with you, then shoot Reels and photos you're free to use on your own channels. You host the room, and they handle the content.`,
      `I've put what I found in a short audit of your account. {AUDIT}`,
      `If you'd like to try it, we'll set up your listing for you from your existing feed: photos, location, and a creator brief aimed at the gaps above. It takes one click.`,
    ],
    auditLabel: "Read the audit.",
    close: "Founding Hosts join free, and you review everything before it goes live.",
  };
  if (v === "C") return {
    lead: `I spent a few minutes on ${hotel}'s Instagram this week. The quickest win I found:`,
    body: [
      `The notes are here: {AUDIT} It's free, and you don't need to sign up.`,
      `I'm Benjamin from Collabnb. We send travel creators to independent stays like yours: they stay, and you get Reels and photos to post. To make it easy, your listing is ready to build. One click pulls your best photos and location from your feed and writes the creator brief for you.`,
    ],
    auditLabel: "Read the audit.",
    close: "Free for our first hotels, and nothing is public until you say so.",
  };
  return {
    lead: `I'm Benjamin, founder of Collabnb. I ran a quick audit of ${hotel}'s Instagram, and one number stood out:`,
    body: [
      `{AUDIT} (free, no signup).`,
      `Collabnb connects boutique stays with pre-vetted creators who make Reels and photos in exchange for a stay. Your listing is one click away: we build it for you from your feed, with your best photos, your location and a creator brief built around the gaps in the audit. No password or signup form.`,
    ],
    auditLabel: "Read the full audit",
    close: "It's free for Founding Hosts, and nothing goes live until you publish.",
  };
}

function emailParts(o: { variant: Variant; greeting: string; hotel: string; teaser: string; auditUrl: string; buildUrl: string }) {
  const c = variantCopy(o.variant, o.hotel);
  const teaser = o.teaser.charAt(0).toUpperCase() + o.teaser.slice(1);
  const text = [
    o.greeting,
    `${c.lead} ${o.teaser}.`,
    ...c.body.map((b) => b.replace("{AUDIT}", `${c.auditLabel}\n${o.auditUrl}\n`)),
    `Build my listing:\n${o.buildUrl}`,
    c.close,
    SIGNOFF,
  ].join("\n\n");

  const p = (s: string) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2a24">${s}</p>`;
  const auditLink = `<a href="${o.auditUrl}" style="color:#3f6b52;font-weight:bold">${esc(c.auditLabel)}</a>`;
  const topLogo = o.variant === "A" ? `<tr><td style="padding:0 0 20px"><img src="${LOGO}" width="120" alt="Collabnb" style="display:block"></td></tr>` : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f3" bgcolor="#f4f6f3">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f6f3" style="background:#f4f6f3"><tr><td align="center" style="padding:28px 12px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;font-family:Helvetica,Arial,sans-serif">
${topLogo}
<tr><td bgcolor="#ffffff" style="background:#ffffff;border-radius:14px;padding:28px 26px">
${p(esc(o.greeting))}
${p(esc(c.lead))}
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px"><tr><td bgcolor="#e8f4ec" style="background:#e8f4ec;border-radius:10px;padding:14px 16px;font-size:16px;font-weight:bold;color:#1f2a24">${esc(teaser)}</td></tr></table>
${c.body.map((b) => p(esc(b).replace("{AUDIT}", auditLink))).join("\n")}
<table cellpadding="0" cellspacing="0" style="margin:4px 0 20px"><tr><td bgcolor="#3f6b52" style="background:#3f6b52;border-radius:999px;padding:13px 26px"><a href="${o.buildUrl}" style="text-decoration:none"><font color="#ffffff" style="color:#ffffff;font-size:15px;font-weight:bold">Build my listing</font></a></td></tr></table>
${p(esc(c.close))}
${p(esc(SIGNOFF).replace(/\n/g, "<br>"))}
</td></tr>
<tr><td align="center" style="padding:22px 0 0;font-size:12px;color:#6b7a70"><img src="${LOGO}" width="80" alt="Collabnb" style="display:block;margin:0 auto 8px">Collabnb · Lombok, Indonesia</td></tr>
</table></td></tr></table></body></html>`;
  return { text, html };
}

// Follow-ups: plain-text replies in the same thread. Each one stops once the hotel clicks Build my listing.
const FOLLOWUP_GAPS_DAYS = [3, 4, 7]; // day 3, day 7, day 14 after the first email
function followUpText(n: number, greeting: string, hotel: string, buildUrl: string, auditUrl: string) {
  if (n === 1) return `${greeting}

Quick follow-up on the audit I sent. In case it helps to picture it: a creator books one or two nights at ${hotel} on dates that suit you, posts a few Reels and stories while they're there, and you keep the photos and video for your own feed and website. You approve every creator first.

Your listing is still ready to build:
${buildUrl}

Benjamin`;
  if (n === 2) return `${greeting}

One thing I should have said more clearly: there's no fee, no contract and no minimum. You choose which creators to accept, on which dates, and you can pause your listing any time. The only cost to you is a room on a night it would otherwise be empty.

If that sounds fair, here's ${hotel}'s listing:
${buildUrl}

Benjamin`;
  return `${greeting}

I won't keep filling your inbox, so this is my last note. If creator stays aren't a priority right now, that's completely fine, and the audit is yours to keep:
${auditUrl}

If you'd like to try it later, your listing will be waiting here:
${buildUrl}

Thanks for reading,
Benjamin`;
}

async function sendEmail(to: string, subject: string, html: string, text: string, bcc?: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.OUTREACH_FROM || FALLBACK_FROM,
      reply_to: REPLY_TO,
      to: [to],
      ...(bcc && bcc.toLowerCase() !== to.toLowerCase() ? { bcc: [bcc] } : {}),
      subject, html, text,
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${body}`);
  return body;
}

function newToken(hotel: string) {
  const slug = hotel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "hotel";
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(9))).map((b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");
  return `${slug}-${rand}`;
}

// ─── Step 1, every hotel: audit + email (no claim, no account, no photos) ────
export const processOne = internalAction({
  args: { id: v.id("prospects"), cap: v.optional(v.number()), preview: v.optional(v.boolean()), variant: v.optional(v.string()) },
  handler: async (ctx, { id, cap, preview, variant: forced }): Promise<any> => {
    const p: any = await ctx.runQuery(internal.prospects.getById, { id });
    if (!p) return { skipped: "missing" };
    const skip = async (reason: string) => {
      if (!preview) await ctx.runMutation(internal.autoOutreach.markSkipped, { id, reason });
      return { skipped: reason, hotel: p.display_name };
    };
    if (!preview && cap !== undefined && (await ctx.runQuery(internal.autoOutreach.sentTodayCount, {})) >= cap) return { skipped: "cap reached" };

    const handle = realHandle(p) || (await igFromWebsite(p.website));
    if (!handle) return skip("no instagram handle");
    let ig: Awaited<ReturnType<typeof fetchIg>>;
    try { ig = await fetchIg(handle); } catch (e: any) {
      const msg = String(e?.message || e);
      if (/\b(402|429|5\d\d)\b/.test(msg)) return { skipped: `instagram provider unavailable, retry later: ${msg.slice(0, 80)}` };
      return skip(`instagram fetch failed: ${msg.slice(0, 80)}`);
    }
    if (!ig || ig.posts.length < 3 || ig.followers < 100) return skip("private, inactive or tiny instagram");
    if (ig.followers > MAX_FOLLOWERS) return skip("too large for boutique outreach");

    const website = p.website || ig.website;
    let email = validEmail(p.marketing_email) ? p.marketing_email : undefined;
    let phone = p.whatsapp;
    if (!email) {
      const found = await findMarketingContact({ ...p, website });
      email = validEmail(found.email) ? found.email : validEmail(ig.email) ? ig.email : undefined;
      phone = phone || found.phone || ig.phone;
    }
    if (!email) return skip("no email found");
    if (await ctx.runQuery(internal.autoOutreach.profileExists, { email })) return skip("email already has a Collabnb account");
    if (!preview && (await ctx.runQuery(internal.autoOutreach.alreadyAudited, { email, handle }))) return skip("same email or instagram already audited");

    const hotel = String(p.display_name || ig.fullName || handle).replace(/\s*[|·•-]\s.*$/, "").trim().slice(0, 80);
    const okName = (n?: string, r?: string) => !!n && n.trim().split(/\s+/).length >= 2 && !/\b(chef|sous|cook|bartender|sommelier|server|housekeep)/i.test(`${n} ${r || ""}`);
    const dm = okName(p.decision_maker_name, p.decision_maker_role) ? { name: p.decision_maker_name, role: p.decision_maker_role || "" } : await findDecisionMaker(website);
    const first = dm?.name?.split(" ")[0];
    const greeting = first ? `Hi ${first},` : `Hi ${hotel} team,`;
    const audit = buildAudit(ig);
    const token = newToken(hotel);
    const auditUrl = `https://collabnb.com/audit/${token}`;
    const buildUrl = `${auditUrl}?build=1`;
    const pick = (VARIANTS as string[]).includes(forced || "") ? (forced as Variant) : undefined;
    if (preview) {
      const variant = pick || "A";
      const subject = variantSubject(variant, hotel, audit.teaser);
      const { text } = emailParts({ variant, greeting, hotel, teaser: audit.teaser, auditUrl, buildUrl });
      return { hotel, handle, email, decisionMaker: dm, variant, subject, text, audit };
    }
    const variant: Variant = pick || (await ctx.runMutation(internal.autoOutreach.nextVariant, {}));
    const subject = variantSubject(variant, hotel, audit.teaser);
    const { html, text } = emailParts({ variant, greeting, hotel, teaser: audit.teaser, auditUrl, buildUrl });

    const avatar = await rehost(ctx, ig.avatar);
    await ctx.runMutation(internal.autoOutreach.createAudit, {
      token, prospect_id: id, hotel_name: hotel, email, handle,
      website, phone, city: ig.city || p.location || undefined, country: p.country || undefined,
      greeting, subject, variant,
      audit: { ...audit, hotel, handle, avatar, created_at: Date.now() },
    });

    const settings: Record<string, string> = await ctx.runQuery(internal.admin.getSettingsInternal, {});
    try {
      await sendEmail(email, subject, html, text, readConfig(settings).bcc);
    } catch (e: any) {
      return skip(`send failed: ${String(e?.message || e).slice(0, 120)}`);
    }

    const nudge = `Hi${first ? ` ${first}` : ""}! I just sent ${first ? "you" : `the ${hotel} team`} a quick Instagram audit at ${email}. Short version: ${audit.teaser}. There's also a one-click button in there that builds ${hotel} a ready-to-publish Collabnb listing from your feed. Happy to walk you through it here.`;
    await ctx.runMutation(internal.autoOutreach.markSent, {
      id, token, email, nudge,
      dmName: dm?.name, dmRole: dm?.role, phone,
      nudgeDate: new Date(Date.now() + 2 * DAY).toISOString().slice(0, 10),
    });
    await ctx.scheduler.runAfter(FOLLOWUP_GAPS_DAYS[0] * DAY, internal.autoOutreach.followUp, { id, token, n: 1 });
    return { sent: true, hotel, token, variant };
  },
});

// Old scheduled jobs (no n) count as follow-up 1. Replies don't stop the sequence (Ben's call),
// they're only noted; a click on Build my listing does.
export const followUp = internalAction({
  args: { id: v.id("prospects"), token: v.string(), n: v.optional(v.number()) },
  handler: async (ctx, { id, token, n = 1 }) => {
    const p: any = await ctx.runQuery(internal.prospects.getById, { id });
    const a: any = await ctx.runQuery(internal.autoOutreach.getAuditInternal, { token });
    if (!p || !a) return { skipped: "missing" };
    if (a.claim_token || a.build_step || a.built_at) return { skipped: "clicked build" };
    if ((a.followups_sent || 0) >= n) return { skipped: "already sent" };
    const buildUrl = `https://collabnb.com/audit/${token}?build=1`;
    const auditUrl = `https://collabnb.com/audit/${token}`;
    const text = followUpText(n, a.greeting, a.hotel_name, buildUrl, auditUrl);
    const link = (u: string) => `<a href="${u}" style="color:#3f6b52">${u}</a>`;
    const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2a24">${esc(text).split(buildUrl).join(link(buildUrl)).split(auditUrl + "<").join(link(auditUrl) + "<").replace(/\n/g, "<br>")}</div>`;
    const settings: Record<string, string> = await ctx.runQuery(internal.admin.getSettingsInternal, {});
    await sendEmail(a.email, `Re: ${a.subject}`, html, text, readConfig(settings).bcc);
    await ctx.runMutation(internal.autoOutreach.patchAudit, { token, patch: { followups_sent: n, last_followup_at: Date.now() } });
    const replied = !!p.replied_at || p.status === "replied";
    await ctx.runMutation(internal.autoOutreach.logEvent, { id, type: "email_sent", note: `auto-followup-${n}${replied ? " (already replied)" : ""}` });
    if (n < FOLLOWUP_GAPS_DAYS.length) await ctx.scheduler.runAfter(FOLLOWUP_GAPS_DAYS[n] * DAY, internal.autoOutreach.followUp, { id, token, n: n + 1 });
    return { sent: true, n, replied };
  },
});

export const nextVariant = internalMutation({
  args: {},
  handler: async (ctx): Promise<Variant> => {
    const row = await ctx.db.query("admin_settings").withIndex("by_key", (q) => q.eq("key", "auto_outreach_variant_seq")).first();
    const seq = Number(row?.value || 0);
    if (row) await ctx.db.patch(row._id, { value: String(seq + 1) });
    else await ctx.db.insert("admin_settings", { key: "auto_outreach_variant_seq", value: "1" });
    return VARIANTS[seq % VARIANTS.length];
  },
});

// ─── Step 2, only on click: build the one-click claim ────────────────────────
// Steps drive the loading screen: 1 photos, 2 listing copy, 3 account, 4 done.
export const requestBuild = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const a = await ctx.db.query("hotel_audits").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (!a) return { ok: false };
    if (a.claim_token || (a.build_step && a.build_step > 0 && !a.build_error)) return { ok: true };
    await ctx.db.patch(a._id, { build_step: 1, build_error: undefined, build_started_at: Date.now(), build_photos: [] });
    await ctx.scheduler.runAfter(0, internal.autoOutreach.buildClaim, { token });
    return { ok: true };
  },
});

export const buildClaim = internalAction({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const a: any = await ctx.runQuery(internal.autoOutreach.getAuditInternal, { token });
    if (!a || a.claim_token) return;
    const step = (patch: Record<string, any>) => ctx.runMutation(internal.autoOutreach.patchAudit, { token, patch });
    try {
      const ig = await fetchIg(a.handle);
      if (!ig) throw new Error("Instagram profile unavailable");
      const photos: string[] = [];
      for (const post of ig.posts.filter((x) => x.image && !x.video).concat(ig.posts.filter((x) => x.image && x.video)).slice(0, 10)) {
        if (photos.length >= 8) break;
        const url = await rehost(ctx, post.image);
        if (url) { photos.push(url); await step({ build_photos: [...photos] }); }
      }
      await step({ build_step: 2 });
      const copy = await draftListingCopy(a.hotel_name, { location: a.city, country: a.country }, ig);
      await step({ build_step: 3, build_ideas: copy.ideas });
      const avatar = a.audit?.avatar || (await rehost(ctx, ig.avatar));
      const username = (a.handle.replace(/[^a-z0-9_]/g, "") || "host").slice(0, 30);
      const res: any = await ctx.runMutation(internal.claims.createClaim, {
        hotel_name: a.hotel_name,
        email: a.email,
        host: { full_name: a.hotel_name, username, avatar_url: avatar, instagram_handle: a.handle },
        preview: { avatar_url: avatar, instagram_handle: a.handle },
        prefill: {
          title: a.hotel_name,
          location_city: copy.city || a.city,
          location_country: copy.country || a.country,
          property_url: a.website,
          contact_phone: a.phone,
          about: copy.about,
          collaboration_brief: copy.brief,
          gallery_images: photos,
          vibe_tags: copy.vibe_tags,
          perks: copy.perks,
          nights: 2,
          compensation_type: "hybrid",
          deliverables: [{ type: "ugcReel", quantity: 3 }, { type: "storyFrame", quantity: 4 }, { type: "photo", quantity: 5 }],
        },
      });
      await step({ build_step: 4, claim_token: res.token, built_at: Date.now() });
      await ctx.runMutation(internal.autoOutreach.markBuilt, { id: a.prospect_id, token: res.token });
      // Hot lead: tell Ben right away.
      try {
        await sendEmail(REPLY_TO, `🔥 ${a.hotel_name} just built their Collabnb listing`,
          `<p>${esc(a.hotel_name)} (@${esc(a.handle)}, ${esc(a.email)}) clicked "Build my listing" and their draft is ready.</p><p>Audit: https://collabnb.com/audit/${token}<br>Teaser: ${esc(a.audit?.teaser || "")}</p><p>Good moment for a personal WhatsApp or DM, or say "target ${esc(a.hotel_name)}" for the hand-built PDF.</p>`,
          `${a.hotel_name} (@${a.handle}, ${a.email}) clicked "Build my listing". Audit: https://collabnb.com/audit/${token}`);
      } catch { /* alert is best-effort */ }
    } catch (e: any) {
      await step({ build_error: String(e?.message || e).slice(0, 200) });
    }
  },
});

// ─── Writes ──────────────────────────────────────────────────────────────────
export const createAudit = internalMutation({
  args: {
    token: v.string(), prospect_id: v.id("prospects"), hotel_name: v.string(), email: v.string(), handle: v.string(),
    website: v.optional(v.string()), phone: v.optional(v.string()), city: v.optional(v.string()), country: v.optional(v.string()),
    greeting: v.string(), subject: v.string(), variant: v.optional(v.string()), audit: v.any(),
  },
  handler: async (ctx, a) => { await ctx.db.insert("hotel_audits", { ...a, created_at: Date.now() }); },
});

export const patchAudit = internalMutation({
  args: { token: v.string(), patch: v.any() },
  handler: async (ctx, { token, patch }) => {
    const a = await ctx.db.query("hotel_audits").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (a) await ctx.db.patch(a._id, patch);
  },
});

export const getAuditInternal = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => ctx.db.query("hotel_audits").withIndex("by_token", (q) => q.eq("token", token)).unique(),
});

export const markSent = internalMutation({
  args: { id: v.id("prospects"), token: v.string(), email: v.string(), nudge: v.string(), nudgeDate: v.string(), dmName: v.optional(v.string()), dmRole: v.optional(v.string()), phone: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const p: any = await ctx.db.get(a.id);
    if (!p) return;
    const now = Date.now();
    await ctx.db.patch(a.id, {
      status: "emailed",
      marketing_email: a.email,
      ...(a.dmName && !p.decision_maker_name ? { decision_maker_name: a.dmName, decision_maker_role: a.dmRole } : {}),
      ...(a.phone && !p.whatsapp ? { whatsapp: a.phone.replace(/\D/g, "") } : {}),
      brief_sent_at: now,
      instant_launch_sent_at: now,
      dm_draft: a.nudge,
      dm_angle: "audit-nudge",
      queued_for: a.nudgeDate,
      tags: Array.from(new Set([...(p.tags || []), "auto"])),
      outreach_log: [...(p.outreach_log || []), { at: now, type: "email_sent", note: `auto ${a.token}` }],
    });
  },
});

export const markBuilt = internalMutation({
  args: { id: v.id("prospects"), token: v.string() },
  handler: async (ctx, { id, token }) => {
    const p: any = await ctx.db.get(id);
    if (!p) return;
    await ctx.db.patch(id, {
      starred: true,
      tags: (p.tags || []).filter((t: string) => t !== "auto-built"),
      outreach_log: [...(p.outreach_log || []), { at: Date.now(), type: "claim_built", note: token }],
    });
  },
});

export const markSkipped = internalMutation({
  args: { id: v.id("prospects"), reason: v.string() },
  handler: async (ctx, { id, reason }) => {
    const p: any = await ctx.db.get(id);
    if (!p) return;
    await ctx.db.patch(id, {
      tags: Array.from(new Set([...(p.tags || []), "auto-skip"])),
      outreach_log: [...(p.outreach_log || []), { at: Date.now(), type: "auto_skipped", note: reason }],
    });
  },
});

export const logEvent = internalMutation({
  args: { id: v.id("prospects"), type: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, { id, type, note }) => {
    const p: any = await ctx.db.get(id);
    if (p) await ctx.db.patch(id, { outreach_log: [...(p.outreach_log || []), { at: Date.now(), type, note }] });
  },
});

export const markViewed = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const a = await ctx.db.query("hotel_audits").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (!a) return;
    const now = Date.now();
    await ctx.db.patch(a._id, { view_count: (a.view_count || 0) + 1, first_viewed_at: a.first_viewed_at || now, last_viewed_at: now });
  },
});

// ─── Public: audit page + build progress (collabnb.com/audit/:token) ─────────
export const getAudit = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const a: any = await ctx.db.query("hotel_audits").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (!a) return null;
    return {
      hotel_name: a.hotel_name,
      audit: a.audit,
      build: { step: a.build_step || 0, error: a.build_error, photos: a.build_photos || [], ideas: a.build_ideas || [], claim_token: a.claim_token },
    };
  },
});


// ─── Admin tracking (read-only over hotel_audits + prospect replies) ─────────
export const todayStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const settings = await ctx.db.query("admin_settings").withIndex("by_key", (q) => q.eq("key", CONFIG_KEY)).first();
    const cfg = readConfig(settings ? { [CONFIG_KEY]: settings.value } : {});
    const start = new Date(); start.setUTCHours(0, 0, 0, 0);
    const t0 = start.getTime();
    const audits = (await ctx.db.query("hotel_audits").collect()) as any[];
    const prospects = (await ctx.db.query("prospects").collect()) as any[];
    const logToday = (p: any, type: string) => (p.outreach_log || []).some((e: any) => e.type === type && e.at >= t0);
    return {
      enabled: cfg.enabled,
      cap: dailyCap(cfg),
      sent: audits.filter((a) => a.created_at >= t0).length,
      opened: audits.filter((a) => (a.first_viewed_at || 0) >= t0).length,
      replies: prospects.filter((p) => (p.replied_at || 0) >= t0).length,
      dms: prospects.filter((p) => logToday(p, "dm_sent")).length,
      claims: audits.filter((a) => (a.built_at || 0) >= t0).length,
    };
  },
});

export const adminFunnel = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const settings = await ctx.db.query("admin_settings").withIndex("by_key", (q) => q.eq("key", CONFIG_KEY)).first();
    const cfg = readConfig(settings ? { [CONFIG_KEY]: settings.value } : {});
    const audits = (await ctx.db.query("hotel_audits").collect()) as any[];
    const now = Date.now();
    const rows: any[] = [];
    for (const a of audits.sort((x, y) => y.created_at - x.created_at).slice(0, 150)) {
      const p: any = await ctx.db.get(a.prospect_id);
      rows.push({
        token: a.token, hotel: a.hotel_name, email: a.email, handle: a.handle, subject: a.subject,
        teaser: a.audit?.teaser, followers: a.audit?.followers,
        sent_at: a.created_at, viewed: a.view_count || 0, first_viewed_at: a.first_viewed_at,
        built_at: a.built_at, build_error: a.build_error, claim_token: a.claim_token,
        variant: a.variant || "A", followups: a.followups_sent || 0, last_followup_at: a.last_followup_at,
        clicked: !!(a.claim_token || a.build_step || a.built_at),
        replied: !!p?.replied_at || p?.status === "replied", status: p?.status, dm_draft: p?.dm_draft, dm_done: (p?.outreach_log || []).some((e: any) => e.type === "dm_sent"),
      });
    }
    const since = (ms: number) => audits.filter((a) => now - a.created_at < ms);
    const stat = (list: any[]) => ({ sent: list.length, viewed: list.filter((a) => a.view_count).length, built: list.filter((a) => a.built_at || a.claim_token).length });
    const days: Record<string, number> = {};
    audits.forEach((a) => { const d = new Date(a.created_at).toISOString().slice(0, 10); days[d] = (days[d] || 0) + 1; });
    return {
      enabled: cfg.enabled, capToday: dailyCap(cfg), max: cfg.max,
      today: stat(since(DAY)), week: stat(since(7 * DAY)), all: stat(audits),
      replied: rows.filter((r) => r.replied).length,
      byVariant: VARIANTS.map((v) => ({ variant: v, ...stat(audits.filter((a) => (a.variant || "A") === v)) })),
      perDay: Object.entries(days).sort().slice(-14).map(([date, n]) => ({ date, n })),
      rows,
    };
  },
});

export const adminSetEnabled = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, { enabled }) => {
    await requireAdmin(ctx);
    const row = await ctx.db.query("admin_settings").withIndex("by_key", (q) => q.eq("key", CONFIG_KEY)).first();
    let cur: any = {};
    try { cur = JSON.parse(row?.value || "{}"); } catch { /* reset */ }
    const next = { ...cur, enabled };
    if (!next.start || (enabled && !cur.enabled)) next.start = todayKey();
    const value = JSON.stringify(next);
    if (row) await ctx.db.patch(row._id, { value });
    else await ctx.db.insert("admin_settings", { key: CONFIG_KEY, value });
  },
});

// One-off: npx convex run --prod autoOutreach:tidyAutoTags
export const tidyAutoTags = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = (await ctx.db.query("prospects").withIndex("by_kind_status", (q) => q.eq("kind", "host")).collect()) as any[];
    let n = 0;
    for (const p of rows) {
      const auto = (p.tags || []).includes("auto");
      const hasBuilt = (p.tags || []).includes("auto-built");
      if (!auto && !hasBuilt) continue;
      await ctx.db.patch(p._id, {
        tags: (p.tags || []).filter((t: string) => t !== "auto-built"),
        ...(auto && !p.instant_launch_sent_at ? { instant_launch_sent_at: p.brief_sent_at || Date.now() } : {}),
      });
      n++;
    }
    return { updated: n };
  },
});
