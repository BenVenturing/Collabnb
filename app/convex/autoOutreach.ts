import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { hikerGet, findMarketingContact } from "./prospects";
import { llmChat } from "./blog";
import { detectChain, outreachRank } from "./lib/chains";

// Daily automated hotel outreach: named-person email with a real IG audit page
// (collabnb.com/audit/<token>) + one-click pre-filled claim link, a 4-day
// follow-up, and a DM nudge drafted into the CRM for Ben to send by hand.
// Config lives in admin_settings "auto_outreach" (see setConfig).

const CONFIG_KEY = "auto_outreach";
const LOGO = "https://media.collabnb.com/claims/somewhere-lombok/email/logo.png";
const REPLY_TO = "hellocollabnb@gmail.com";
const FALLBACK_FROM = "Benjamin at Collabnb <hello@collabnb.com>";
const FALLBACK_MAX = 20; // shared transactional domain: keep cold volume low
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
  const max = process.env.OUTREACH_FROM ? cfg.max : Math.min(cfg.max, FALLBACK_MAX);
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
      if ((p.outreach_log || []).some((e: any) => e.type === "email_sent") || p.brief_sent_at || p.instant_launch_sent_at || p.contacted_at) return false;
      if ((p.tags || []).some((t: string) => t.startsWith("contacted") || t.startsWith("auto"))) return false;
      stats.fresh++;
      if (!realHandle(p) && !p.website) return false;
      stats.withHandle++;
      if (!validEmail(p.marketing_email) && !validEmail(p.email) && !p.website) return false;
      stats.withEmail++;
      if (detectChain(p)) return false;
      stats.independent++;
      return true;
    });
    stats.eligible = eligible.length;
    eligible.sort((a, b) => outreachRank(b) + (b.score ?? 0) / 100 - (outreachRank(a) + (a.score ?? 0) / 100));
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
    const { ids, stats } = await ctx.runQuery(internal.autoOutreach.pool, { limit: Math.ceil(remaining * 1.6) });
    const summary = { enabled: cfg.enabled, cap, sentToday: peek.sentToday, scheduling: ids.length, pool: stats, from: process.env.OUTREACH_FROM || FALLBACK_FROM };
    if (dryRun || (!cfg.enabled && force === undefined) || !remaining) return summary;
    // Spread sends over ~4 hours so they don't land as one burst.
    const spread = (4 * 3600_000) / Math.max(1, ids.length);
    ids.forEach((id: any, i: number) => {
      ctx.scheduler.runAfter(Math.round(i * spread + Math.random() * 60_000), internal.autoOutreach.processOne, { id, cap });
    });
    return summary;
  },
});

// ─── Instagram audit ─────────────────────────────────────────────────────────
type Post = { likes: number; comments: number; views?: number; video: boolean; at?: number; image?: string; code?: string; caption: string };

function mediaImage(m: any): string | undefined {
  const r = m.resources?.[0];
  return m.thumbnail_url || m.image_versions2?.candidates?.[0]?.url || r?.thumbnail_url || r?.image_versions2?.candidates?.[0]?.url;
}

async function fetchIg(handle: string) {
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
    if (!j?.name || !text.includes(j.name) || j.name.split(" ").length > 4) return null;
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

function emailParts(o: { greeting: string; hotel: string; teaser: string; auditUrl: string; claimUrl: string; photos: number }) {
  const text = `${o.greeting}

I'm Benjamin, founder of Collabnb. I ran a quick audit of ${o.hotel}'s Instagram, and one number stood out: ${o.teaser}.

The full audit is here (free, no signup):
${o.auditUrl}

We also set up a Collabnb listing for you: ${o.photos ? `${o.photos} photos from your feed, ` : ""}your location and a creator brief built around the gaps in the audit. All that's left is setting what you'd pay creators on top of the stay and publishing. It takes under 5 minutes, with no password or signup form.

Open your draft listing:
${o.claimUrl}

It's free for Founding Hosts, nothing goes live until you publish, and pre-vetted creators are already on Collabnb.

Warmly,
Benjamin
Founder, Collabnb
WhatsApp +1 623-221-2170`;

  const p = (s: string) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2a24">${s}</p>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f3" bgcolor="#f4f6f3">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f6f3" style="background:#f4f6f3"><tr><td align="center" style="padding:28px 12px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;font-family:Helvetica,Arial,sans-serif">
<tr><td style="padding:0 0 20px"><img src="${LOGO}" width="120" alt="Collabnb" style="display:block"></td></tr>
<tr><td bgcolor="#ffffff" style="background:#ffffff;border-radius:14px;padding:28px 26px">
${p(esc(o.greeting))}
${p(`I'm Benjamin, founder of Collabnb. I ran a quick audit of ${esc(o.hotel)}'s Instagram, and one number stood out:`)}
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px"><tr><td bgcolor="#e8f4ec" style="background:#e8f4ec;border-radius:10px;padding:14px 16px;font-size:16px;font-weight:bold;color:#1f2a24">${esc(o.teaser.charAt(0).toUpperCase() + o.teaser.slice(1))}</td></tr></table>
${p(`<a href="${o.auditUrl}" style="color:#3f6b52;font-weight:bold">Read the full audit</a> (free, no signup).`)}
${p(`We also set up a Collabnb listing for you: ${o.photos ? `${o.photos} photos from your feed, ` : ""}your location and a creator brief built around the gaps in the audit. All that's left is setting what you'd pay creators on top of the stay and publishing. It takes under 5 minutes, with no password or signup form.`)}
<table cellpadding="0" cellspacing="0" style="margin:4px 0 20px"><tr><td bgcolor="#3f6b52" style="background:#3f6b52;border-radius:999px;padding:13px 26px"><a href="${o.claimUrl}" style="text-decoration:none"><font color="#ffffff" style="color:#ffffff;font-size:15px;font-weight:bold">Open your draft listing</font></a></td></tr></table>
${p("It's free for Founding Hosts, nothing goes live until you publish, and pre-vetted creators are already on Collabnb.")}
${p("Warmly,<br>Benjamin<br>Founder, Collabnb<br>WhatsApp +1 623-221-2170")}
</td></tr>
<tr><td align="center" style="padding:22px 0 0;font-size:12px;color:#6b7a70"><img src="${LOGO}" width="80" alt="Collabnb" style="display:block;margin:0 auto 8px">Collabnb · Lombok, Indonesia</td></tr>
</table></td></tr></table></body></html>`;
  return { text, html };
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

// ─── Per-hotel pipeline ──────────────────────────────────────────────────────
export const processOne = internalAction({
  args: { id: v.id("prospects"), cap: v.optional(v.number()), preview: v.optional(v.boolean()) },
  handler: async (ctx, { id, cap, preview }): Promise<any> => {
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

    const hotel = String(p.display_name || ig.fullName || handle).replace(/\s*[|·•-]\s.*$/, "").trim().slice(0, 80);
    const dm = p.decision_maker_name ? { name: p.decision_maker_name, role: p.decision_maker_role || "" } : await findDecisionMaker(website);
    const first = dm?.name?.split(" ")[0];
    const greeting = first ? `Hi ${first},` : `Hi ${hotel} team,`;

    const audit = buildAudit(ig);
    const copy = await draftListingCopy(hotel, p, ig);
    const subject = `${hotel}: ${audit.teaser}`;

    if (preview) {
      const { text } = emailParts({ greeting, hotel, teaser: audit.teaser, auditUrl: "https://collabnb.com/audit/<token>", claimUrl: "https://collabnb.com/claim/<token>?go=1", photos: Math.min(8, ig.posts.filter((x) => x.image).length) });
      return { hotel, handle, email, decisionMaker: dm, subject, text, audit, copy };
    }

    const photos = (await Promise.all(ig.posts.filter((x) => x.image).slice(0, 8).map((x) => rehost(ctx, x.image)))).filter(Boolean) as string[];
    const avatar = await rehost(ctx, ig.avatar);
    const username = (handle.replace(/[^a-z0-9_]/g, "") || "host").slice(0, 30);

    const { token } = await ctx.runMutation(internal.claims.createClaim, {
      hotel_name: hotel,
      email,
      host: { full_name: hotel, username, avatar_url: avatar, instagram_handle: handle },
      preview: { avatar_url: avatar, instagram_handle: handle },
      prefill: {
        title: hotel,
        location_city: copy.city || ig.city || p.location || undefined,
        location_country: copy.country || p.country || undefined,
        property_url: website,
        contact_phone: phone,
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
    const claimUrl = `https://collabnb.com/claim/${token}?go=1`;
    const auditUrl = `https://collabnb.com/audit/${token}`;
    await ctx.runMutation(internal.autoOutreach.saveAudit, {
      token,
      audit: { ...audit, hotel, handle, avatar, photos: photos.slice(0, 6), ideas: copy.ideas, subject, greeting, created_at: Date.now() },
    });

    const settings: Record<string, string> = await ctx.runQuery(internal.admin.getSettingsInternal, {});
    const { html, text } = emailParts({ greeting, hotel, teaser: audit.teaser, auditUrl, claimUrl, photos: photos.length });
    try {
      await sendEmail(email, subject, html, text, readConfig(settings).bcc);
    } catch (e: any) {
      return skip(`send failed: ${String(e?.message || e).slice(0, 120)}`);
    }

    const nudge = `Hi${first ? ` ${first}` : ""}! I just sent ${first ? "you" : `the ${hotel} team`} a quick Instagram audit at ${email}. Short version: ${audit.teaser}. I also built ${hotel} a ready-to-publish Collabnb listing (link's in the email). Happy to walk you through it here.`;
    await ctx.runMutation(internal.autoOutreach.markSent, {
      id, token, email, nudge,
      dmName: dm?.name, dmRole: dm?.role, phone,
      nudgeDate: new Date(Date.now() + 2 * DAY).toISOString().slice(0, 10),
    });
    await ctx.scheduler.runAfter(4 * DAY, internal.autoOutreach.followUp, { id, token });
    return { sent: true, hotel, token };
  },
});

export const followUp = internalAction({
  args: { id: v.id("prospects"), token: v.string() },
  handler: async (ctx, { id, token }) => {
    const p: any = await ctx.runQuery(internal.prospects.getById, { id });
    const claim: any = await ctx.runQuery(internal.claims._getClaim, { token });
    if (!p || !claim || claim.status === "claimed" || p.replied_at || !["emailed", "contacted"].includes(p.status)) return { skipped: true };
    const a = claim.audit || {};
    const greeting = a.greeting || "Hi there,";
    const claimUrl = `https://collabnb.com/claim/${token}?go=1`;
    const auditUrl = `https://collabnb.com/audit/${token}`;
    const text = `${greeting}

Just bumping this in case it got buried. ${claim.hotel_name}'s Collabnb listing is still saved as a draft:
${claimUrl}

If creator stays aren't a fit right now, the audit is yours to keep:
${auditUrl}

Benjamin`;
    const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2a24">${esc(text).replace(/\n/g, "<br>").replace(claimUrl, `<a href="${claimUrl}">${claimUrl}</a>`).replace(auditUrl, `<a href="${auditUrl}">${auditUrl}</a>`)}</div>`;
    const settings: Record<string, string> = await ctx.runQuery(internal.admin.getSettingsInternal, {});
    await sendEmail(claim.email, `Re: ${a.subject || `${claim.hotel_name}'s Collabnb listing`}`, html, text, readConfig(settings).bcc);
    await ctx.runMutation(internal.autoOutreach.logFollowUp, { id });
    return { sent: true };
  },
});

// ─── Writes ──────────────────────────────────────────────────────────────────
export const saveAudit = internalMutation({
  args: { token: v.string(), audit: v.any() },
  handler: async (ctx, { token, audit }) => {
    const c = await ctx.db.query("listing_claims").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (c) await ctx.db.patch(c._id, { audit });
  },
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

export const logFollowUp = internalMutation({
  args: { id: v.id("prospects") },
  handler: async (ctx, { id }) => {
    const p: any = await ctx.db.get(id);
    if (p) await ctx.db.patch(id, { outreach_log: [...(p.outreach_log || []), { at: Date.now(), type: "email_sent", note: "auto-followup" }] });
  },
});

// ─── Public audit page data (collabnb.com/audit/:token) ──────────────────────
export const getAudit = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const c: any = await ctx.db.query("listing_claims").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (!c?.audit) return null;
    const { greeting, subject, ...audit } = c.audit;
    return { hotel_name: c.hotel_name, claimed: c.status === "claimed", audit };
  },
});
