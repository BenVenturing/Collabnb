import { v, ConvexError } from "convex/values";
import { query, mutation, action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { llmChat } from "./blog";
import { sendViaResend } from "./emailCopy";
import { renderHostWelcomeEmailHtml, DEFAULT_HOST_WELCOME_EMAIL_TEMPLATE, HOST_WELCOME_EMAIL_SUBJECT } from "./hostWelcomeEmail";
import { renderCreatorWelcomeEmailHtml, DEFAULT_CREATOR_WELCOME_EMAIL_TEMPLATE, CREATOR_WELCOME_EMAIL_SUBJECT } from "./creatorWelcomeEmail";
import { requireAdmin, requireAdminAction, canAccessAdmin } from "./lib/auth";
import { withSurfacedErrors } from "./lib/errors";

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
// Five fixed angles for the daily host-outreach batch. The LLM only swaps in
// the [Hotel Name] token — it does not freely rewrite these or add any
// location/niche/bio detail back to the host (reads as robotic mail-merge
// since it's their own property info), so the approved copy/tone stays intact.
// Deterministic — never LLM-generated — so the stats can never drift or get
// hallucinated per message. Same sourced third-party stats already used on
// the marketing site's "Why creator collabs work" section (how-it-works.html)
// — kept in sync with that page rather than a separate unsourced set, and
// deliberately not framed as Collabnb's own results, since the platform has
// no host track record yet (still onboarding its first 100 Founding Hosts).
// No parentheses around the source attribution — draftHostMessage strips
// parens from the whole message as a formatting safety net.
const HOST_STATS_BLOCK = `Why creators matter for stays like yours:
• $5.78 average return for every $1 spent on influencer marketing — Influencer Marketing Hub, 2026
• 73% of travelers say influencer recommendations have shaped a trip or booking decision — Expedia Group, 2025
• 61% of travelers now find trip inspiration on social media — Expedia Group, 2025`;

export const HOST_OUTREACH_TEMPLATES: { id: string; name: string; template: string }[] = [
  {
    id: "curiosity",
    name: "Curiosity / Pain-Point",
    template: `Hi! Quick question — how are you currently finding creators to collaborate with at [Hotel Name]? 👀

I ask because we built Collabnb specifically to solve that — vetted creators who are actively looking for stays like yours, matched to you directly instead of hours of manual searching.

{STATS}

We're inviting our first 100 properties in as Founding Hosts — free, lifetime access. Would love for you to take a look: https://www.collabnb.com/`,
  },
  {
    id: "social_proof",
    name: "Social Proof / Momentum",
    template: `Hi! I'm Benjamin, founder of Collabnb.

We've been searching for some incredible hotels, villas, and boutique stays to onboard onto the platform, and [Hotel Name] seemed like an excellent fit. 🌿

We connect properties like yours with vetted content creators for paid collaborations — no more sifting through DMs hoping someone's a good fit.

{STATS}

We're currently welcoming our first 100 Founding Hosts, completely free for life. Take a look: https://www.collabnb.com/`,
  },
  {
    id: "compliment",
    name: "Compliment-Led / Relationship",
    template: `Hi! Just came across [Hotel Name] and had to reach out — the content coming out of your account is genuinely beautiful. ✨

I'm Benjamin, founder of Collabnb — we help properties like yours connect with creators who'd love to collaborate and help tell that story even further.

{STATS}

We're inviting our first 100 hosts in as founding members, completely free. Would love for you to check it out: https://www.collabnb.com/`,
  },
  {
    id: "data_stat",
    name: "Data / Stat-Led",
    template: `Hi! Did you know 92% of travelers trust a creator's recommendation over a traditional ad? 📊

That's exactly why we built Collabnb — connecting hotels, villas, and boutique stays like [Hotel Name] with vetted creators for paid collaborations, so you get authentic content without the guesswork. We're welcoming our first 100 Founding Hosts, free for life.

Here's a look: https://www.collabnb.com/`,
  },
  {
    id: "founder_story",
    name: "Founder Story / Direct",
    template: `Hi! I'm Benjamin, founder of Collabnb — I built it after seeing how hard it is for amazing stays like [Hotel Name] to consistently find the right creators to work with.

{STATS}

We're inviting our first 100 properties in as Founding Hosts — free, lifetime access, no fees, ever. Would love for you to take a look: https://www.collabnb.com/`,
  },
];

// ─── Host outreach email sequence ──────────────────────────────────────────────
// Three-step cold email sequence, sent to a host's marketing/contact address
// (separate channel from the Instagram DM above — DMs stay manual, step 1 of
// this sequence sends automatically on Confirm, steps 2-3 are drafted here
// and wait for an explicit "Send" click, same manual-control philosophy).
export const HOST_EMAIL_SEQUENCE: { step: number; name: string; subject: string; template: string; sendDelayDays: number }[] = [
  {
    // Superseded by the branded HTML in hostWelcomeEmail.ts — runHostEmailKickoff
    // skips this entry (HOST_EMAIL_SEQUENCE.slice(1)) and builds step 1 from
    // there instead. Left here so `step` numbering/indexing for steps 2-3
    // below doesn't shift, and as a plain-text reference for the same copy.
    step: 1,
    name: "Intro",
    subject: "Inviting [Hotel Name] to Collabnb as a Founding Host",
    sendDelayDays: 0,
    template: `Hi there,

My name is Benjamin, founder of Collabnb — a platform that helps boutique hotels and stays connect with vetted content creators who are actively looking for unique places to collaborate with.

I came across [Hotel Name] and it looks like exactly the kind of property creators are searching for. We'd love to invite you to join Collabnb completely free and set up a listing where creators can discover your stay and reach out directly.

Through Collabnb, hosts can:
• Discover relevant creators without spending hours searching Instagram
• Set up collaboration listings with clear deliverables
• Manage conversations and partnerships in one place

We're currently welcoming our first 100 properties as Founding Hosts — lifetime access, no admin fees, ever.

Also, is this the best address for your marketing or partnerships team, or is there someone else we should loop in?

Thanks so much for your time — we'd love to have [Hotel Name] on board.

Benjamin
Founder, Collabnb
collabnb.com`,
  },
  {
    step: 2,
    name: "Follow-up",
    subject: "Following up — Collabnb x [Hotel Name]",
    sendDelayDays: 4,
    template: `Hi again,

Just wanted to float this back to the top of your inbox in case it got buried.

{STATS}

Collabnb makes it simple to set up a free listing and start hearing from creators directly — no cost, and it takes a few minutes.

Happy to answer any questions, or just take a look here: https://www.collabnb.com/

Benjamin
Founder, Collabnb`,
  },
  {
    step: 3,
    name: "Final nudge",
    subject: "Last note from me — Collabnb",
    sendDelayDays: 7,
    template: `Hi — totally understand if now isn't the right time.

Just wanted to leave the door open: we're still holding a spot for [Hotel Name] among our first 100 Founding Hosts (free, lifetime access), so if it's ever useful, it's here: https://www.collabnb.com/

Either way, wishing you all the best.

Benjamin
Founder, Collabnb`,
  },
];

// Creator analog of HOST_EMAIL_SEQUENCE — same shape/cadence (step 1
// superseded by the branded HTML, steps 2-3 are the real LLM-adapted
// follow-ups), [Creator Name] token instead of [Hotel Name]. No {STATS}
// block: the host stats are about why creators matter to a host, which
// doesn't make sense pitched back at a creator, and there's no equivalent
// creator-side stat on file to cite instead of fabricating one.
export const CREATOR_EMAIL_SEQUENCE: { step: number; name: string; subject: string; template: string; sendDelayDays: number }[] = [
  {
    step: 1,
    name: "Intro",
    subject: "Inviting [Creator Name] to Collabnb as a Founding Creator",
    sendDelayDays: 0,
    template: `Hi there,

My name is Benjamin, founder of Collabnb — a platform that helps content creators connect with vetted boutique hotels and stays that are actively looking to pay creators for content.

I came across [Creator Name] and it looks like exactly the kind of creator boutique stays are searching for. We'd love to invite you to join Collabnb completely free and start browsing paid collaborations.

Through Collabnb, creators can:
• Discover boutique stays without spending hours searching Instagram
• Browse paid collaboration listings with clear deliverables
• Manage conversations, partnerships, and campaigns in one place

We're currently welcoming our first 100 creators as Founding Creators — lifetime access, no admin fees, ever.

Thanks so much for your time — we'd love to have [Creator Name] on board.

Benjamin
Founder, Collabnb
collabnb.com`,
  },
  {
    step: 2,
    name: "Follow-up",
    subject: "Following up — Collabnb x [Creator Name]",
    sendDelayDays: 4,
    template: `Hi again,

Just wanted to float this back to the top of your inbox in case it got buried.

Collabnb makes it simple to browse paid collaborations with boutique stays and start hearing back directly — free to join, takes a few minutes.

Happy to answer any questions, or just take a look here: https://www.collabnb.com/

Benjamin
Founder, Collabnb`,
  },
  {
    step: 3,
    name: "Final nudge",
    subject: "Last note from me — Collabnb",
    sendDelayDays: 7,
    template: `Hi — totally understand if now isn't the right time.

Just wanted to leave the door open: we're still holding a spot for [Creator Name] among our first 100 Founding Creators (free, lifetime access), so if it's ever useful, it's here: https://www.collabnb.com/

Either way, wishing you all the best.

Benjamin
Founder, Collabnb`,
  },
];

function textToEmailHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 16px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("\n");
  return `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#1f1f1f;line-height:1.5;max-width:520px">${paragraphs}</div>`;
}

// Adapts a fixed email-sequence template to one host's real facts, same
// personalization rules as draftHostMessage (fill in the name, one honest
// detail if given, never invent facts) — just email-shaped (subject + body).
async function draftHostEmail(p: any, step: (typeof HOST_EMAIL_SEQUENCE)[number]): Promise<{ subject: string; body: string }> {
  const name = p.display_name || `@${p.instagram_handle}`;
  const who = [
    `Listing name: ${name}`,
    p.location && `Location: ${p.location}`,
    p.niche && `Type/niche: ${p.niche}`,
    p.bio && `Instagram bio: ${p.bio}`,
  ].filter(Boolean).join("\n");

  try {
    const raw = await llmChat([
      {
        role: "system",
        content:
          "You adapt a fixed cold-outreach email for Benjamin, founder of Collabnb (collabnb.com). You do NOT rewrite the email freely — keep its structure, sentence order, tone, and call-to-action exactly as given. Your job: (1) replace every '[Hotel Name]' with the real listing name; (2) if the email contains the literal marker '{STATS}', leave it completely unchanged, on its own line; (3) only if a genuine matching fact is provided below, you may add ONE short sentence stating it honestly right after the opening paragraph — never invent anything not given, skip it if no real fact is available. Formatting rules: plain text only, no markdown, no asterisks, no parentheses (rephrase instead), no commentary about what you changed. Output ONLY the final email body text, nothing else — no subject line.",
      },
      {
        role: "user",
        content: `Email to adapt:\n"""\n${step.template}\n"""\n\nListing facts — use ONLY what's given, never invent:\n${who || "none given — just swap in the listing name"}`,
      },
    ], 400, 20_000);
    let body = raw.trim().replace(/^["'“”]+|["'“”]+$/g, "");
    const lines = body.split("\n");
    if (lines.length > 1 && /^(here('s| is)|sure|below is|adapted)/i.test(lines[0]) && lines[0].length < 90) {
      body = lines.slice(1).join("\n").trim();
    }
    body = body.includes("{STATS}") ? body.replace("{STATS}", HOST_STATS_BLOCK) : body;
    body = body.replace(/\*/g, "").replace(/[()]/g, "");
    const subject = step.subject.replace(/\[Hotel Name\]/g, name);
    return { subject, body: body.slice(0, 2000) };
  } catch {
    return {
      subject: step.subject.replace(/\[Hotel Name\]/g, name),
      body: step.template.replace(/\[Hotel Name\]/g, name).replace("{STATS}", HOST_STATS_BLOCK),
    };
  }
}

// Creator analog of draftHostEmail — same adapt-don't-rewrite rules, creator
// facts instead of listing facts, [Creator Name] token.
async function draftCreatorEmail(p: any, step: { subject: string; template: string }): Promise<{ subject: string; body: string }> {
  const name = p.display_name || `@${p.instagram_handle}`;
  const who = [
    `Creator name: ${name}`,
    p.location && `Location: ${p.location}`,
    p.niche && `Niche: ${p.niche}`,
    p.bio && `Instagram bio: ${p.bio}`,
  ].filter(Boolean).join("\n");

  try {
    const raw = await llmChat([
      {
        role: "system",
        content:
          "You adapt a fixed cold-outreach email for Benjamin, founder of Collabnb (collabnb.com), sent to a content creator. You do NOT rewrite the email freely — keep its structure, sentence order, tone, and call-to-action exactly as given. Your job: (1) replace every '[Creator Name]' with the real creator's name; (2) only if a genuine matching fact is provided below, you may add ONE short sentence stating it honestly right after the opening paragraph — never invent anything not given, skip it if no real fact is available. Formatting rules: plain text only, no markdown, no asterisks, no parentheses (rephrase instead), no commentary about what you changed. Output ONLY the final email body text, nothing else — no subject line.",
      },
      {
        role: "user",
        content: `Email to adapt:\n"""\n${step.template}\n"""\n\nCreator facts — use ONLY what's given, never invent:\n${who || "none given — just swap in the creator's name"}`,
      },
    ], 400, 20_000);
    let body = raw.trim().replace(/^["'“”]+|["'“”]+$/g, "");
    const lines = body.split("\n");
    if (lines.length > 1 && /^(here('s| is)|sure|below is|adapted)/i.test(lines[0]) && lines[0].length < 90) {
      body = lines.slice(1).join("\n").trim();
    }
    body = body.replace(/\*/g, "").replace(/[()]/g, "");
    const subject = step.subject.replace(/\[Creator Name\]/g, name);
    return { subject, body: body.slice(0, 2000) };
  } catch {
    return {
      subject: step.subject.replace(/\[Creator Name\]/g, name),
      body: step.template.replace(/\[Creator Name\]/g, name),
    };
  }
}

// ─── Marketing-email discovery ─────────────────────────────────────────────────
// Looks up a host's real marketing/partnerships contact instead of whatever
// address happens to be in their Instagram bio. Calls a small Vercel Python
// function (Scrapling) that fetches the host's real website and extracts the
// best-scoring contact address. Falls through to the bio `email` field (or
// nothing) if the site can't be reached or has no listed address — this must
// never block the confirm flow.
async function findMarketingEmail(p: any): Promise<string | undefined> {
  if (p.marketing_email) return p.marketing_email;
  if (!p.website) return p.email || undefined;

  const secret = process.env.SCRAPE_SHARED_SECRET;
  const endpoint = process.env.SCRAPE_ENDPOINT_URL || "https://www.collabnb.com/api/find-marketing-email";
  if (!secret) return p.email || undefined;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Authorization": `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: p.website }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return p.email || undefined;
    const data = await res.json();
    return data.email || p.email || undefined;
  } catch {
    return p.email || undefined;
  }
}

// ─── Scraping providers: HikerAPI (primary) or Apify (fallback) ───────────────
// HikerAPI: npx convex env set HIKERAPI_KEY <access key from hikerapi.com>
// Apify:    npx convex env set APIFY_API_TOKEN apify_api_...

const NO_KEY_MSG =
  "No Instagram API key set. Set HIKERAPI_KEY (preferred — hikerapi.com) or APIFY_API_TOKEN (apify.com): npx convex env set HIKERAPI_KEY ...";

// Which Instagram source a background/automatic flow is allowed to spend
// credits on — 'agent_reach' (the default) means "don't call HikerAPI/Apify
// on your own", since Agent-Reach itself has no server-callable API: it only
// runs inside a live local agent session with the admin's own logged-in
// Chrome (see HostSearchImport's note in Discovery.jsx), so Convex can never
// invoke it directly the way it can silently retry across LLM providers.
// The real tiering this enables is: free local Agent-Reach searches stay the
// default path, and the paid tier only ever spends money when an admin
// explicitly flips this setting (or clicks a manual "Search & import"/"Run
// now" button, which always uses the paid tier regardless of this setting).
function searchProviderFor(settings: Record<string, string>, kind: "host" | "creator"): string {
  return settings[`${kind}_search_provider`] || "agent_reach";
}

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
    if (!(await canAccessAdmin(ctx))) return [];
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
    if (!(await canAccessAdmin(ctx))) return [];
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
    if (!(await canAccessAdmin(ctx))) return {};
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
    // Ready-to-confirm queue depth (status flipped to 'queued' as part of
    // today's batch) — distinct from contactedToday: DMs still go out at a
    // safe, capped daily pace, but the queue behind them can run deeper.
    const queuedToday = rows.filter((r) => r.status === "queued" && (r.queued_for ?? today) <= today);
    return {
      creators: stats("creator"),
      hosts: stats("host"),
      contactedToday: {
        creators: contactedToday.filter((r) => r.kind === "creator").length,
        hosts: contactedToday.filter((r) => r.kind === "host").length,
      },
      queuedToday: {
        creators: queuedToday.filter((r) => r.kind === "creator").length,
        hosts: queuedToday.filter((r) => r.kind === "host").length,
      },
      pendingAgentReachCreators: rows.filter(
        (r) => r.kind === "creator" && r.source === "agent-reach" && !r.enriched_at
      ).length,
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
    await requireAdmin(ctx);
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
    await requireAdmin(ctx);
    const p = await ctx.db.get(id);
    const patch: Record<string, any> = { status };
    if (status === "contacted") patch.contacted_at = Date.now();
    if (status === "replied") patch.replied_at = Date.now();
    const log = (p as any)?.outreach_log || [];
    patch.outreach_log = [...log, { at: Date.now(), type: status }];
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
    await requireAdmin(ctx);
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
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});

// Fill today's queue: promote the top-scored 'new' prospects to 'queued' until
// the daily target (default 20 creators + 20 hosts) is reached. Shared by the
// admin-triggered mutation and the cron job below, which has no identity to
// check an admin gate against.
// Superseded by buildFreshQueue below (full confirm treatment + live-search
// top-up, 50/kind) — kept only in case something still references it.
async function runBuildTodayQueue(ctx: any, perKind = 20) {
    const today = todayKey();
    const all = await ctx.db.query("prospects").collect();
    let promoted = 0;
    for (const kind of ["creator", "host"]) {
      const alreadyQueued = all.filter(
        (r: any) => r.kind === kind && r.status === "queued" && (r.queued_for ?? today) <= today
      ).length;
      const need = Math.max(0, perKind - alreadyQueued);
      const candidates = all
        .filter((r: any) => r.kind === kind && r.status === "new")
        .sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, need);
      for (const c of candidates) {
        await ctx.db.patch(c._id, { status: "queued", queued_for: today });
        promoted++;
      }
    }
    return { promoted };
}

export const buildTodayQueue = mutation({
  args: { perKind: v.optional(v.number()) },
  handler: async (ctx, { perKind = 20 }) => {
    await requireAdmin(ctx);
    return runBuildTodayQueue(ctx, perKind);
  },
});

export const countQueuedToday = internalQuery({
  args: { kind: v.string() },
  handler: async (ctx, { kind }) => {
    const today = todayKey();
    const rows = await ctx.db
      .query("prospects")
      .withIndex("by_kind_status", (q) => q.eq("kind", kind).eq("status", "queued"))
      .collect();
    return rows.filter((r) => (r.queued_for ?? today) <= today).length;
  },
});

export const getTopNewCandidates = internalQuery({
  args: { kind: v.string(), limit: v.number() },
  handler: async (ctx, { kind, limit }) => {
    const rows = await ctx.db
      .query("prospects")
      .withIndex("by_kind_status", (q) => q.eq("kind", kind).eq("status", "new"))
      .collect();
    return rows.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, limit);
  },
});

// Fresh daily confirm queue — the "Build fresh 50" button. Unlike the older
// buildTodayQueue above, promoting a prospect here means the *fuller* confirm
// treatment: hosts get a drafted DM (same as confirmHostBatch), creators get
// queued — not just a bare status flip. If the existing 'new' pool is short
// of the target AND that kind's search_provider is set to hikerapi/apify
// (not the 'agent_reach' default), tops it up with one live search first
// (using the first configured auto-search profile for that kind, on or off)
// before re-selecting the top-scored candidates. Under the agent_reach
// default it just works with whatever's already in the pool — topping up is
// then a manual "run Agent-Reach locally, then import" step instead.
//
// Deliberately does NOT send the welcome email — nothing goes to a real
// inbox without an explicit "Email"/"Email selected" click from the admin,
// so a 50-per-side daily batch (or the daily cron) never fires real sends on
// its own. Actual Instagram DM volume is likewise intentionally NOT raised
// here — it stays capped around the ~20/day safe rate documented elsewhere
// in this file. This only grows how deep the ready-to-confirm bench is.
async function runBuildFreshQueue(ctx: any, perKind = 50): Promise<{ promoted: { creators: number; hosts: number } }> {
  const settings: Record<string, string> = await ctx.runQuery(internal.admin.getSettingsInternal, {});
  const promoted = { creators: 0, hosts: 0 };

  for (const kind of ["creator", "host"] as const) {
    const alreadyQueued: number = await ctx.runQuery(internal.prospects.countQueuedToday, { kind });
    const need = Math.max(0, perKind - alreadyQueued);
    if (need === 0) continue;

    let candidates: any[] = await ctx.runQuery(internal.prospects.getTopNewCandidates, { kind, limit: need });
    if (candidates.length < need && searchProviderFor(settings, kind) !== "agent_reach") {
      let cfg: any = null;
      try { cfg = JSON.parse(settings[kind === "host" ? "host_discovery_auto" : "discovery_auto"] || "null"); } catch { /* no config yet */ }
      const profile = cfg?.profiles?.[0];
      try {
        if (kind === "host") {
          const query = profile?.query || "boutique hotel";
          const accounts = await searchInstagramUsers(query, 50);
          const rows = accounts.map((acc) => ({
            kind: "host",
            instagram_handle: acc.username,
            display_name: acc.fullName,
            avatar_url: acc.avatarUrl,
            follower_count: acc.followers,
            bio: acc.bio,
            website: acc.website,
            email: acc.email,
            source: process.env.HIKERAPI_KEY ? "hikerapi" : "apify",
          }));
          await ctx.runMutation(internal.prospects.bulkInsert, { rows });
        } else {
          await discoverAndScore(ctx, { niche: profile?.niche || "travel", location: profile?.location || undefined, target: 30, enrichTop: 20 });
        }
      } catch {
        // Top-up is best-effort — fall through with whatever was already there.
      }
      candidates = await ctx.runQuery(internal.prospects.getTopNewCandidates, { kind, limit: need });
    }
    if (candidates.length === 0) continue;

    if (kind === "host") {
      const templates = await resolveHostOutreachTemplates(ctx);
      const counts: Record<string, number> = await ctx.runQuery(internal.prospects.getHostAngleCounts, {});
      await mapWithConcurrency(candidates, 5, async (c) => {
        const angle = nextAngle(templates, counts);
        const dmDraft = await draftHostMessage(c, angle);
        await ctx.runMutation(internal.prospects.confirmDraft, { id: c._id, dmDraft, dmAngle: angle.id });
        promoted.hosts++;
      });
    } else {
      await mapWithConcurrency(candidates, 5, async (c) => {
        await ctx.runMutation(api.prospects.updateStatus, { id: c._id, status: "queued" });
        promoted.creators++;
      });
    }
  }
  return { promoted };
}

export const buildFreshQueue = action({
  args: { perKind: v.optional(v.number()) },
  handler: withSurfacedErrors(async (ctx, { perKind = 50 }) => {
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    return runBuildFreshQueue(ctx, perKind);
  }),
});

export const buildFreshQueueInternal = internalAction({
  args: { perKind: v.optional(v.number()) },
  handler: async (ctx, { perKind = 50 }) => runBuildFreshQueue(ctx, perKind),
});

// Cron-only entry point — no admin identity exists in a scheduled run.
export const buildTodayQueueInternal = internalMutation({
  args: { perKind: v.optional(v.number()) },
  handler: async (ctx, { perKind = 20 }) => runBuildTodayQueue(ctx, perKind),
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
    if (!(await canAccessAdmin(ctx))) return [];
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

// Runs `fn` over `items` with at most `limit` in flight at once — batch
// drafting used to await each host's LLM call one at a time, so a slow/dead
// provider stalled the whole confirm action for minutes on a 20-host batch.
// Capped (rather than unlimited Promise.all) to avoid tripping the writer
// API's own concurrent-request limits.
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function nextAngle(templates: typeof HOST_OUTREACH_TEMPLATES, counts: Record<string, number>): (typeof HOST_OUTREACH_TEMPLATES)[number] {
  const sorted = [...templates].sort((a, b) => (counts[a.id] || 0) - (counts[b.id] || 0));
  const angle = sorted[0];
  counts[angle.id] = (counts[angle.id] || 0) + 1;
  return angle;
}

// Admin-editable overrides for the 5 DM angle templates, stored in
// admin_settings under 'host_dm_angles' as {[angleId]: templateText} —
// same "defaults in code, admin overrides in the DB, merged at read time"
// pattern as TEMPLATE_DEFAULTS in emailCopy.ts. Any angle without an
// override just uses its hardcoded default.
async function getHostDmAngleOverrides(ctx: any): Promise<Record<string, string>> {
  const settings: Record<string, string> = await ctx.runQuery(internal.admin.getSettingsInternal, {});
  try { return JSON.parse(settings.host_dm_angles || "null") || {}; } catch { return {}; }
}

async function resolveHostOutreachTemplates(ctx: any): Promise<typeof HOST_OUTREACH_TEMPLATES> {
  const overrides = await getHostDmAngleOverrides(ctx);
  return HOST_OUTREACH_TEMPLATES.map((t) => (overrides[t.id] ? { ...t, template: overrides[t.id] } : t));
}

export const getHostDmAngles = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return [];
    const row = await ctx.db.query("admin_settings").withIndex("by_key", (q) => q.eq("key", "host_dm_angles")).first();
    let overrides: Record<string, string> = {};
    try { overrides = JSON.parse(row?.value || "null") || {}; } catch { /* bad JSON = no overrides */ }
    return HOST_OUTREACH_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      template: overrides[t.id] ?? t.template,
      isCustom: !!overrides[t.id],
    }));
  },
});

export const setHostDmAngle = mutation({
  args: { id: v.string(), template: v.string() },
  handler: async (ctx, { id, template }) => {
    await requireAdmin(ctx);
    const row = await ctx.db.query("admin_settings").withIndex("by_key", (q) => q.eq("key", "host_dm_angles")).first();
    let overrides: Record<string, string> = {};
    try { overrides = JSON.parse(row?.value || "null") || {}; } catch { /* bad JSON = start fresh */ }
    overrides[id] = template;
    const value = JSON.stringify(overrides);
    if (row) await ctx.db.patch(row._id, { value });
    else await ctx.db.insert("admin_settings", { key: "host_dm_angles", value });
  },
});

export const resetHostDmAngle = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const row = await ctx.db.query("admin_settings").withIndex("by_key", (q) => q.eq("key", "host_dm_angles")).first();
    if (!row) return;
    let overrides: Record<string, string> = {};
    try { overrides = JSON.parse(row.value || "null") || {}; } catch { return; }
    delete overrides[id];
    await ctx.db.patch(row._id, { value: JSON.stringify(overrides) });
  },
});

// Raw-HTML override for the branded welcome email — stored whole (not
// broken into fields) under admin_settings 'host_welcome_email_html', since
// Ben wanted to drop in a full replacement exported from an email builder
// rather than edit paragraphs individually. Must still contain {{HOTEL_NAME}}
// somewhere to personalize; renderHostWelcomeEmailHtml just no-ops the
// substitution if it doesn't, so a missing token degrades to un-personalized
// rather than throwing.
async function getEffectiveHostWelcomeEmailTemplate(ctx: any): Promise<string> {
  const row = await ctx.db.query("admin_settings").withIndex("by_key", (q: any) => q.eq("key", "host_welcome_email_html")).first();
  return row?.value || DEFAULT_HOST_WELCOME_EMAIL_TEMPLATE;
}

export const getHostWelcomeEmailHtml = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return null;
    const row = await ctx.db.query("admin_settings").withIndex("by_key", (q) => q.eq("key", "host_welcome_email_html")).first();
    return { template: row?.value || DEFAULT_HOST_WELCOME_EMAIL_TEMPLATE, isCustom: !!row?.value };
  },
});

export const setHostWelcomeEmailHtml = mutation({
  args: { html: v.string() },
  handler: async (ctx, { html }) => {
    await requireAdmin(ctx);
    if (!html.includes("{{HOTEL_NAME}}")) {
      throw new ConvexError("The HTML needs a {{HOTEL_NAME}} placeholder somewhere so each host gets personalized — add it wherever the listing name should appear.");
    }
    const row = await ctx.db.query("admin_settings").withIndex("by_key", (q) => q.eq("key", "host_welcome_email_html")).first();
    if (row) await ctx.db.patch(row._id, { value: html });
    else await ctx.db.insert("admin_settings", { key: "host_welcome_email_html", value: html });
  },
});

export const resetHostWelcomeEmailHtml = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const row = await ctx.db.query("admin_settings").withIndex("by_key", (q) => q.eq("key", "host_welcome_email_html")).first();
    if (row) await ctx.db.delete(row._id);
  },
});

// Creator analog of the three above — same raw-HTML-override pattern, own
// admin_settings key so the two templates are independent.
async function getEffectiveCreatorWelcomeEmailTemplate(ctx: any): Promise<string> {
  const row = await ctx.db.query("admin_settings").withIndex("by_key", (q: any) => q.eq("key", "creator_welcome_email_html")).first();
  return row?.value || DEFAULT_CREATOR_WELCOME_EMAIL_TEMPLATE;
}

export const getCreatorWelcomeEmailHtml = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return null;
    const row = await ctx.db.query("admin_settings").withIndex("by_key", (q) => q.eq("key", "creator_welcome_email_html")).first();
    return { template: row?.value || DEFAULT_CREATOR_WELCOME_EMAIL_TEMPLATE, isCustom: !!row?.value };
  },
});

export const setCreatorWelcomeEmailHtml = mutation({
  args: { html: v.string() },
  handler: async (ctx, { html }) => {
    await requireAdmin(ctx);
    if (!html.includes("{{CREATOR_NAME}}")) {
      throw new ConvexError("The HTML needs a {{CREATOR_NAME}} placeholder somewhere so each creator gets personalized — add it wherever their name should appear.");
    }
    const row = await ctx.db.query("admin_settings").withIndex("by_key", (q) => q.eq("key", "creator_welcome_email_html")).first();
    if (row) await ctx.db.patch(row._id, { value: html });
    else await ctx.db.insert("admin_settings", { key: "creator_welcome_email_html", value: html });
  },
});

export const resetCreatorWelcomeEmailHtml = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const row = await ctx.db.query("admin_settings").withIndex("by_key", (q) => q.eq("key", "creator_welcome_email_html")).first();
    if (row) await ctx.db.delete(row._id);
  },
});

// One-off real send of whatever HTML is currently in the editor (saved or
// not) to an address of the admin's choosing — lets Ben check rendering in
// an actual inbox before committing a draft with Save.
export const sendTestWelcomeEmail = action({
  args: {
    kind: v.union(v.literal("host"), v.literal("creator")),
    toEmail: v.string(),
    html: v.string(),
    sampleName: v.optional(v.string()),
  },
  handler: withSurfacedErrors(async (ctx, { kind, toEmail, html, sampleName }) => {
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not configured in Convex environment.");
    const name = sampleName?.trim() || (kind === "host" ? "Sample Hotel Name" : "Sample Creator");
    const rendered = kind === "host" ? renderHostWelcomeEmailHtml(html, name) : renderCreatorWelcomeEmailHtml(html, name);
    const subjectTemplate = kind === "host" ? HOST_WELCOME_EMAIL_SUBJECT : CREATOR_WELCOME_EMAIL_SUBJECT;
    const token = kind === "host" ? /\{\{HOTEL_NAME\}\}/g : /\{\{CREATOR_NAME\}\}/g;
    const subject = `[TEST] ${subjectTemplate.replace(token, name)}`;
    await sendViaResend(apiKey, toEmail, subject, rendered);
    return { sent: true };
  }),
});

// Follow-up (steps 2-3) template overrides — plain text, not HTML, since
// these are LLM-adapted at send time rather than sent verbatim; editing here
// changes the source template the LLM is told to adapt, same as editing
// HOST_EMAIL_SEQUENCE/CREATOR_EMAIL_SEQUENCE in code would. One JSON blob
// per kind, keyed by step number, so either step can be reset independently.
async function getEffectiveEmailSequence(ctx: any, kind: "host" | "creator") {
  const base = kind === "host" ? HOST_EMAIL_SEQUENCE : CREATOR_EMAIL_SEQUENCE;
  const key = kind === "host" ? "host_followup_templates" : "creator_followup_templates";
  const row = await ctx.db.query("admin_settings").withIndex("by_key", (q: any) => q.eq("key", key)).first();
  let overrides: Record<string, string> = {};
  try { overrides = JSON.parse(row?.value || "{}"); } catch { /* bad JSON = no overrides */ }
  return base.map((s) => (overrides[s.step] ? { ...s, template: overrides[s.step] } : s));
}

export const getFollowupTemplates = query({
  args: { kind: v.union(v.literal("host"), v.literal("creator")) },
  handler: async (ctx, { kind }) => {
    if (!(await canAccessAdmin(ctx))) return [];
    const seq = await getEffectiveEmailSequence(ctx, kind);
    const base = kind === "host" ? HOST_EMAIL_SEQUENCE : CREATOR_EMAIL_SEQUENCE;
    return seq.slice(1).map((s, i) => ({
      step: s.step,
      name: s.name,
      subject: s.subject,
      template: s.template,
      isCustom: s.template !== base[i + 1].template,
    }));
  },
});

export const setFollowupTemplate = mutation({
  args: { kind: v.union(v.literal("host"), v.literal("creator")), step: v.number(), template: v.string() },
  handler: async (ctx, { kind, step, template }) => {
    await requireAdmin(ctx);
    const nameToken = kind === "host" ? "[Hotel Name]" : "[Creator Name]";
    if (!template.includes(nameToken)) {
      throw new ConvexError(`This needs a ${nameToken} placeholder somewhere so each send gets personalized.`);
    }
    const key = kind === "host" ? "host_followup_templates" : "creator_followup_templates";
    const row = await ctx.db.query("admin_settings").withIndex("by_key", (q) => q.eq("key", key)).first();
    let overrides: Record<string, string> = {};
    try { overrides = JSON.parse(row?.value || "{}"); } catch { /* bad JSON = starting fresh */ }
    overrides[step] = template;
    if (row) await ctx.db.patch(row._id, { value: JSON.stringify(overrides) });
    else await ctx.db.insert("admin_settings", { key, value: JSON.stringify(overrides) });
  },
});

export const resetFollowupTemplate = mutation({
  args: { kind: v.union(v.literal("host"), v.literal("creator")), step: v.number() },
  handler: async (ctx, { kind, step }) => {
    await requireAdmin(ctx);
    const key = kind === "host" ? "host_followup_templates" : "creator_followup_templates";
    const row = await ctx.db.query("admin_settings").withIndex("by_key", (q) => q.eq("key", key)).first();
    if (!row) return;
    let overrides: Record<string, string> = {};
    try { overrides = JSON.parse(row.value || "{}"); } catch { return; }
    delete overrides[step];
    await ctx.db.patch(row._id, { value: JSON.stringify(overrides) });
  },
});

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
    // Short timeout: these drafts are only 350 tokens, so a live provider
    // replies in seconds. NVIDIA has repeatedly gone into a mode where it
    // hangs with no response at all (see llmChat's provider notes) instead
    // of erroring — the default 90s abort meant one dead host could stall
    // an entire confirm batch for minutes. 20s is generous for a real reply
    // but still fails fast enough to fall through to the next provider.
    const raw = await llmChat([
      {
        role: "system",
        content:
          "You adapt a fixed outreach template for Benjamin, founder of Collabnb (collabnb.com). You do NOT rewrite the message freely — you keep its structure, sentence order, tone, emoji, and call-to-action exactly as given. Your job: (1) replace every '[Hotel Name]' with the real listing name; (2) if the template contains the literal marker '{STATS}', leave it completely unchanged, on its own line — never translate, remove, or alter it. Do NOT add any new sentence or paragraph stating the host's own location, niche, or bio back to them — they already know these facts about their own property, and reciting them back reads as automated/robotic. Formatting rules, no exceptions: never use markdown or asterisks (no *bold* or bullet '*'), never use parentheses anywhere — rephrase instead, never include notes, brackets, or commentary about what you changed. Output ONLY the final message text a host would receive, nothing else.",
      },
      {
        role: "user",
        content: `Template to adapt:\n"""\n${angle.template}\n"""\n\nListing facts — use ONLY what's given, never invent:\n${who || "none given — just swap in the listing name"}`,
      },
    ], 350, 20_000);
    let dmDraft = raw.trim().replace(/^["'“”]+|["'“”]+$/g, "");
    const lines = dmDraft.split("\n");
    if (lines.length > 1 && /^(here('s| is)|sure|below is|adapted)/i.test(lines[0]) && lines[0].length < 90) {
      dmDraft = lines.slice(1).join("\n").trim();
    }
    dmDraft = dmDraft.includes("{STATS}")
      ? dmDraft.replace("{STATS}", HOST_STATS_BLOCK)
      : dmDraft.replace(
          /(https:\/\/www\.collabnb\.com\/)/,
          `${HOST_STATS_BLOCK}\n\n$1`
        );
    // Safety net on top of the prompt rules — strip any markdown/parens that
    // slipped through so a stray "*" or "(" never reaches a real DM.
    dmDraft = dmDraft.replace(/\*/g, "").replace(/[()]/g, "");
    return dmDraft.slice(0, 1100);
  } catch {
    // Fallback: raw template with a simple name swap so a batch never
    // silently stalls if the LLM provider hiccups on one item.
    return angle.template
      .replace(/\[Hotel Name\]/g, p.display_name || `@${p.instagram_handle}`)
      .replace("{STATS}", HOST_STATS_BLOCK);
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
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    const counts: Record<string, number> = await ctx.runQuery(internal.prospects.getHostAngleCounts, {});
    const templates = await resolveHostOutreachTemplates(ctx);
    const results = await mapWithConcurrency(ids, 5, async (id) => {
      const p: any = await ctx.runQuery(internal.prospects.getById, { id });
      if (!p) return false;
      if (p.kind === "host") {
        const angle = nextAngle(templates, counts);
        const dmDraft = await draftHostMessage(p, angle);
        await ctx.runMutation(internal.prospects.saveHostDraft, { id: p._id, dmDraft, dmAngle: angle.id });
      } else {
        const dmDraft = await draftCreatorMessage(p);
        await ctx.runMutation(api.prospects.update, { id: p._id, dmDraft });
      }
      return true;
    });
    return { drafted: results.filter(Boolean).length };
  },
});

// Reset a host back to a fresh pool candidate — for anything that stalled or
// fell through, short of an actual signed deal. Keeps the drafted message
// (no need to regenerate) but clears status/queue/confirmed state.
export const resetToPool = mutation({
  args: { id: v.id("prospects") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
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


export const confirmDraft = internalMutation({
  args: { id: v.id("prospects"), dmDraft: v.string(), dmAngle: v.string() },
  handler: async (ctx, { id, dmDraft, dmAngle }) => {
    const p = await ctx.db.get(id);
    const log = (p as any)?.outreach_log || [];
    await ctx.db.patch(id, {
      dm_draft: dmDraft,
      dm_angle: dmAngle,
      status: "queued",
      queued_for: todayKey(),
      published: true,
      outreach_log: [...log, { at: Date.now(), type: "confirmed" }],
    });
  },
});

// Runs after confirmDraft: finds the host's real marketing email, drafts the
// 3-step email sequence, and sends step 1 immediately (steps 2-3 wait for an
// explicit "Send" click from the admin — see sendSequenceEmail). Never throws
// — a failed lookup/send just leaves the host at the 'confirmed' stage so the
// batch confirm never fails because one host's email couldn't be found.
// Shared by the auto-kickoff (fires on Confirm) and the manual "Email"
// button (for hosts confirmed before this pipeline existed, or wherever
// auto-send didn't find an address / hit a Resend error the first time).
async function runHostEmailKickoff(ctx: any, id: any): Promise<{ sent: boolean; reason?: string }> {
  const p: any = await ctx.runQuery(internal.prospects.getById, { id });
  if (!p) return { sent: false, reason: "Prospect not found" };

  const marketingEmail = await findMarketingEmail(p);
  if (!marketingEmail) return { sent: false, reason: "No email address found — add one manually on this host, then try again" };

  // Step 1 is the branded HTML welcome email — fixed layout, so it's a
  // plain string substitution, not an LLM rewrite (which would risk
  // mangling the markup). Steps 2-3 stay the LLM-adapted plain-text
  // follow-ups. emailSequence[0].body stores the final rendered HTML
  // itself, so a retry via sendSequenceEmail can resend it verbatim.
  const name = p.display_name || `@${p.instagram_handle}`;
  const step1Template = await getEffectiveHostWelcomeEmailTemplate(ctx);
  const step1Html = renderHostWelcomeEmailHtml(step1Template, name);
  const step1Subject = HOST_WELCOME_EMAIL_SUBJECT.replace(/\{\{HOTEL_NAME\}\}/g, name);

  const followUps = await Promise.all(HOST_EMAIL_SEQUENCE.slice(1).map((step) => draftHostEmail(p, step)));
  const emailSequence = [
    { step: 1, subject: step1Subject, body: step1Html, sent_at: undefined as number | undefined },
    ...HOST_EMAIL_SEQUENCE.slice(1).map((step, i) => ({
      step: step.step,
      subject: followUps[i].subject,
      body: followUps[i].body,
      sent_at: undefined as number | undefined,
    })),
  ];

  const apiKey = process.env.RESEND_API_KEY;
  let sendError: string | undefined;
  if (apiKey) {
    try {
      await sendViaResend(apiKey, marketingEmail, emailSequence[0].subject, emailSequence[0].body);
      emailSequence[0].sent_at = Date.now();
    } catch (e: any) {
      sendError = e?.message || "Resend send failed";
    }
  } else {
    sendError = "RESEND_API_KEY not configured in Convex environment.";
  }

  await ctx.runMutation(internal.prospects.saveEmailSequence, {
    id,
    marketingEmail,
    emailSequence,
    step1Sent: !!emailSequence[0].sent_at,
  });

  return emailSequence[0].sent_at ? { sent: true } : { sent: false, reason: sendError };
}

// Manual "Email" button on a Confirmed-column card — for hosts confirmed
// before this pipeline existed (no email_sequence yet), or a retry when
// auto-send failed the first time. Throws a real error so the button can
// show why, instead of silently doing nothing.
export const sendHostEmailNow = action({
  args: { id: v.id("prospects") },
  handler: async (ctx, { id }) => {
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    const result = await runHostEmailKickoff(ctx, id);
    if (!result.sent) throw new Error(result.reason || "Could not send");
    return result;
  },
});

export const saveEmailSequence = internalMutation({
  args: {
    id: v.id("prospects"),
    marketingEmail: v.string(),
    emailSequence: v.array(v.object({
      step: v.number(),
      subject: v.string(),
      body: v.string(),
      sent_at: v.optional(v.number()),
    })),
    step1Sent: v.boolean(),
  },
  handler: async (ctx, { id, marketingEmail, emailSequence, step1Sent }) => {
    const p = await ctx.db.get(id);
    const log = (p as any)?.outreach_log || [];
    await ctx.db.patch(id, {
      marketing_email: marketingEmail,
      email_sequence: emailSequence,
      ...(step1Sent ? { status: "emailed" } : {}),
      outreach_log: step1Sent
        ? [...log, { at: Date.now(), type: "email_sent", note: `Step 1 to ${marketingEmail}` }]
        : log,
    });
  },
});

// Creator analog of runHostEmailKickoff/sendHostEmailNow above — same "an
// email goes out first" pattern, the same branded template style, and (as of
// this version) the same findMarketingEmail lookup: many creators list a
// personal site/portfolio/Linktree as their bio link, so it's worth trying
// before falling back to whatever address is directly in the bio. There's
// still no multi-step drip — just the one welcome email. Fires automatically
// right after a creator is confirmed into
// the pipeline (see the "Confirm selected" button in CreatorCrmBoard),
// best-effort so one missing address never blocks the rest of the batch; the
// "Email" button on an Emailed-eligible card in the CRM board calls the same
// action for a retry or for creators confirmed before this existed.
async function runCreatorEmailKickoff(ctx: any, id: any): Promise<{ sent: boolean; reason?: string }> {
  const p: any = await ctx.runQuery(internal.prospects.getById, { id });
  if (!p) return { sent: false, reason: "Prospect not found" };
  // Same lookup as hosts: prefer a real contact/press address scraped from
  // the creator's own site (bio link, portfolio, etc.) over whatever's in
  // their Instagram bio — falls back to the bio email if there's no
  // scrapeable website or the scrape comes up empty.
  const email = await findMarketingEmail(p);
  if (!email) return { sent: false, reason: "No email found — no address on file and no scrapeable website on record. Add one manually, then try again" };

  // Step 1 is the branded HTML welcome email (possibly admin-overridden) —
  // same plain-substitution treatment as hosts. Steps 2-3 are LLM-adapted
  // plain-text follow-ups, drafted now but left unsent for an explicit
  // "Send" click later, same as the host sequence.
  const name = p.display_name || `@${p.instagram_handle}`;
  const step1Template = await getEffectiveCreatorWelcomeEmailTemplate(ctx);
  const step1Html = renderCreatorWelcomeEmailHtml(step1Template, name);
  const step1Subject = CREATOR_WELCOME_EMAIL_SUBJECT.replace(/\{\{CREATOR_NAME\}\}/g, name);

  const sequence = await getEffectiveEmailSequence(ctx, "creator");
  const followUps = await Promise.all(sequence.slice(1).map((step) => draftCreatorEmail(p, step)));
  const emailSequence = [
    { step: 1, subject: step1Subject, body: step1Html, sent_at: undefined as number | undefined },
    ...sequence.slice(1).map((step, i) => ({
      step: step.step,
      subject: followUps[i].subject,
      body: followUps[i].body,
      sent_at: undefined as number | undefined,
    })),
  ];

  const apiKey = process.env.RESEND_API_KEY;
  let sendError: string | undefined;
  if (apiKey) {
    try {
      await sendViaResend(apiKey, email, emailSequence[0].subject, emailSequence[0].body);
      emailSequence[0].sent_at = Date.now();
    } catch (e: any) {
      sendError = e?.message || "Resend send failed";
    }
  } else {
    sendError = "RESEND_API_KEY not configured in Convex environment.";
  }

  await ctx.runMutation(internal.prospects.saveCreatorEmailSequence, {
    id, email, emailSequence, step1Sent: !!emailSequence[0].sent_at,
  });
  return emailSequence[0].sent_at ? { sent: true } : { sent: false, reason: sendError };
}

export const sendCreatorEmailNow = action({
  args: { id: v.id("prospects") },
  handler: async (ctx, { id }) => {
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    const result = await runCreatorEmailKickoff(ctx, id);
    if (!result.sent) throw new Error(result.reason || "Could not send");
    return result;
  },
});

// Scheduler-driven single sends — best-effort (never throws) since nothing
// is watching a scheduled run to report a failure to.
export const sendHostEmailScheduled = internalAction({
  args: { id: v.id("prospects") },
  handler: async (ctx, { id }) => { await runHostEmailKickoff(ctx, id).catch(() => {}); },
});
export const sendCreatorEmailScheduled = internalAction({
  args: { id: v.id("prospects") },
  handler: async (ctx, { id }) => { await runCreatorEmailKickoff(ctx, id).catch(() => {}); },
});

// Drip-sends a batch instead of firing every "Email selected" at once — a
// burst of 20-30 sends in the same second reads as a blast to receiving
// mail providers even when each one is a real, individually-relevant email.
// Spreads them 1/minute (configurable) via the Convex scheduler and returns
// immediately; the sends themselves happen over the following minutes/hours,
// each independent so one bad address never blocks the rest of the batch.
export const scheduleBulkEmail = action({
  args: {
    ids: v.array(v.id("prospects")),
    kind: v.union(v.literal("host"), v.literal("creator")),
    intervalSeconds: v.optional(v.number()),
  },
  handler: withSurfacedErrors(async (ctx, { ids, kind, intervalSeconds }) => {
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    const interval = Math.max(intervalSeconds ?? 60, 15) * 1000;
    const fn = kind === "host" ? internal.prospects.sendHostEmailScheduled : internal.prospects.sendCreatorEmailScheduled;
    for (let i = 0; i < ids.length; i++) {
      await ctx.scheduler.runAfter(i * interval, fn, { id: ids[i] });
    }
    const spanMinutes = ids.length > 1 ? Math.ceil(((ids.length - 1) * interval) / 60000) : 0;
    return { scheduled: ids.length, spanMinutes };
  }),
});

export const saveCreatorEmailSequence = internalMutation({
  args: {
    id: v.id("prospects"),
    email: v.string(),
    emailSequence: v.array(v.object({
      step: v.number(),
      subject: v.string(),
      body: v.string(),
      sent_at: v.optional(v.number()),
    })),
    step1Sent: v.boolean(),
  },
  handler: async (ctx, { id, email, emailSequence, step1Sent }) => {
    const p = await ctx.db.get(id);
    const log = (p as any)?.outreach_log || [];
    await ctx.db.patch(id, {
      marketing_email: email,
      email_sequence: emailSequence,
      ...(step1Sent ? { status: "emailed" } : {}),
      outreach_log: step1Sent
        ? [...log, { at: Date.now(), type: "email_sent", note: `Welcome email to ${email}` }]
        : log,
    });
  },
});

// Sends a not-yet-sent step (2 or 3) of the email sequence on explicit
// admin click — steps 2-3 never send on their own.
export const sendSequenceEmail = action({
  args: { id: v.id("prospects"), step: v.number() },
  handler: async (ctx, { id, step }) => {
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    const p: any = await ctx.runQuery(internal.prospects.getById, { id });
    if (!p) throw new Error("Prospect not found");
    // Both kinds prefer the marketing address scraped from their site
    // (findMarketingEmail), falling back to whatever's directly in the bio.
    const toEmail = p.marketing_email || p.email;
    if (!toEmail) throw new Error(`No email on file for this ${p.kind}`);
    const entry = (p.email_sequence || []).find((e: any) => e.step === step);
    if (!entry) throw new Error(`No drafted email for step ${step}`);
    if (entry.sent_at) throw new Error(`Step ${step} was already sent`);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not configured in Convex environment.");
    // Step 1's body is already the full rendered branded HTML (see
    // runHostEmailKickoff/runCreatorEmailKickoff) — sending it through
    // textToEmailHtml would double-wrap and mangle it. Steps 2-3 are plain
    // text needing the wrap.
    const html = step === 1 ? entry.body : textToEmailHtml(entry.body);
    await sendViaResend(apiKey, toEmail, entry.subject, html);

    const updatedSequence = p.email_sequence.map((e: any) => (e.step === step ? { ...e, sent_at: Date.now() } : e));
    await ctx.runMutation(internal.prospects.markSequenceStepSent, { id, emailSequence: updatedSequence });
  },
});

export const markSequenceStepSent = internalMutation({
  args: {
    id: v.id("prospects"),
    emailSequence: v.array(v.object({
      step: v.number(),
      subject: v.string(),
      body: v.string(),
      sent_at: v.optional(v.number()),
    })),
  },
  handler: async (ctx, { id, emailSequence }) => {
    const p = await ctx.db.get(id);
    const log = (p as any)?.outreach_log || [];
    await ctx.db.patch(id, {
      email_sequence: emailSequence,
      outreach_log: [...log, { at: Date.now(), type: "email_sent" }],
    });
  },
});

// Confirm exactly the selected pool ids: drafts each (cycling evenly through
// the 5 fixed angles), then locks them in as today's outreach batch. Anything
// NOT selected stays in the pool untouched — the built-in "backup" list.
export const confirmHostBatch = action({
  args: { ids: v.array(v.id("prospects")) },
  handler: async (ctx, { ids }): Promise<{ confirmed: number }> => {
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    const templates = await resolveHostOutreachTemplates(ctx);
    const results = await mapWithConcurrency(ids, 5, async (id, i) => {
      const p: any = await ctx.runQuery(internal.prospects.getById, { id });
      if (!p || p.kind !== "host" || p.published) return false; // don't re-draft an already-sent one
      const angle = templates[i % templates.length];
      const dmDraft = await draftHostMessage(p, angle);
      // Confirming drafts the DM but does NOT send the welcome email —
      // that's a separate, deliberate click ("Email" / "Email selected" in
      // the CRM board) per Ben's call: nothing goes to a real inbox without
      // an explicit send action.
      await ctx.runMutation(internal.prospects.confirmDraft, { id: p._id, dmDraft, dmAngle: angle.id });
      return true;
    });
    return { confirmed: results.filter(Boolean).length };
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

// Same landing pad as importHostsLocal, for creators — a local Agent-Reach
// search finds handles (free, no Apify/HikerAPI credits) but can't reliably
// pull follower counts/bio (see enrichPendingCreators below), so rows land
// unenriched/unscored until a HikerAPI/Apify pass fills that in.
export const importCreatorsLocal = mutation({
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
        kind: "creator",
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
// Creator analog of draftHostMessage — shared by the single-card generator
// and the bulk "Draft DMs for selected" action, which previously only had a
// host branch (generateDraftsForSelected silently no-op'd on every creator).
async function draftCreatorMessage(p: any): Promise<string> {
  // Real scraped data (from "Analyze profile") makes a specific compliment
  // honest — Ben has genuinely verified facts about this creator at that
  // point, unlike an un-analyzed profile where a specific claim would be
  // a guess dressed up as personal review.
  const bestPost = (p.recent_posts || [])
    .slice()
    .sort((a: any, b: any) => ((b.views ?? b.likes ?? 0) - (a.views ?? a.likes ?? 0)))[0];
  const isAnalyzed = !!p.enriched_at && !!bestPost;

  const who = [
    `Instagram handle: @${p.instagram_handle}`,
    p.display_name && `Name: ${p.display_name}`,
    p.follower_count && `Followers: ${p.follower_count}`,
    p.niche && `Niche: ${p.niche}`,
    p.location && `Location: ${p.location}`,
    p.bio && `Bio: ${p.bio}`,
    isAnalyzed && `Their recent ${bestPost.type} post${bestPost.views ? ` — ${bestPost.views.toLocaleString()} views` : ""}: "${bestPost.caption.slice(0, 200)}"`,
  ].filter(Boolean).join("\n");

  const pitch = "Invite them to join Collabnb as a travel creator — they pitch boutique stays and trade content for nights, with contracts and payments handled on the platform.";

  const complimentRule = isAnalyzed
    ? "Ben has genuinely reviewed this profile's recent post data below — open with a specific, honest reference to it (react like a real follower would), not a generic line."
    : "Ben has NOT personally reviewed this specific profile, so keep the opener honest and general — say something like \"you've done some incredible travel recently\" or \"your recent content is really spot on\", never claim to have watched a specific video or read a specific caption. It's fine to say something like \"our team came across your account\" rather than implying personal review.";

  const raw = await llmChat([
    {
      role: "system",
      content:
        `You write short Instagram DM bodies for Ben, founder of Collabnb (collabnb.com) — a creator-first hospitality marketing platform connecting boutique properties with vetted creators for professional campaigns. Sound like a real person typing on their phone: warm, zero marketing-speak. Never use 'elevate', 'unlock', 'leverage', 'seamless', 'game-changer', or exclamation marks back to back. ${complimentRule} Formatting rules, no exceptions: never use markdown or asterisks, never use parentheses anywhere — rephrase instead, never include notes or commentary about what you changed. Output ONLY the DM body text — no link, no sign-off (those are added automatically after), no introduction line, no quotes, no commentary.`,
    },
    {
      role: "user",
      content: `Write ONE Instagram DM body (max 380 characters, 2-3 short paragraphs, no hashtags, at most one emoji, no link, no sign-off). Open per the compliment rule in the system instructions, then: ${pitch} End with a soft ask — no link or sign-off, those come after.\n\n${who}`,
    },
  ], 250, 20_000);

  // Strip a leaked "Here is..." preamble line and wrapping quotes.
  let dmDraft = raw.trim();
  const lines = dmDraft.split("\n");
  if (lines.length > 1 && /^(here('s| is)|sure|below is)/i.test(lines[0]) && lines[0].length < 90) {
    dmDraft = lines.slice(1).join("\n").trim();
  }
  dmDraft = dmDraft.replace(/^["'“”]+|["'“”]+$/g, "").replace(/\*/g, "").replace(/[()]/g, "");
  // Link + sign-off are appended in code, not left to the LLM, so they're
  // always correct and consistent — never a hallucinated URL or wording.
  return `${dmDraft}\n\nhttps://www.collabnb.com/\n\nCheers,\nThe Collabnb team`.slice(0, 900);
}

export const generateDmDraft = action({
  args: { id: v.id("prospects"), angleId: v.optional(v.string()) },
  handler: withSurfacedErrors(async (ctx, { id, angleId }): Promise<string> => {
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    const p: any = await ctx.runQuery(internal.prospects.getById, { id });
    if (!p) throw new Error("Prospect not found");

    if (p.kind === "host") {
      const templates = await resolveHostOutreachTemplates(ctx);
      let angle = templates.find((a) => a.id === angleId);
      if (!angle) {
        const counts: Record<string, number> = await ctx.runQuery(internal.prospects.getHostAngleCounts, {});
        angle = nextAngle(templates, counts);
      }
      const dmDraft = await draftHostMessage(p, angle);
      await ctx.runMutation(internal.prospects.saveHostDraft, { id, dmDraft, dmAngle: angle.id });
      return dmDraft;
    }

    const dmDraft = await draftCreatorMessage(p);
    await ctx.runMutation(api.prospects.update, { id, dmDraft });
    return dmDraft;
  }),
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
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
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

// Bulk import from a CSV file the admin already has (e.g. a curated list, or
// an export from somewhere else) — the "Import" tool's other path alongside
// the live Instagram search above. Parsing happens client-side; this just
// dedupes and inserts the rows it's handed.
export const importCsvRows = action({
  args: {
    kind: v.string(), // 'creator' | 'host'
    rows: v.array(
      v.object({
        instagram_handle: v.string(),
        display_name: v.optional(v.string()),
        location: v.optional(v.string()),
        niche: v.optional(v.string()),
        follower_count: v.optional(v.number()),
        email: v.optional(v.string()),
        bio: v.optional(v.string()),
        website: v.optional(v.string()),
      })
    ),
  },
  handler: withSurfacedErrors(async (ctx, args): Promise<{ inserted: number; fetched: number }> => {
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    const rows = args.rows
      .filter((r) => r.instagram_handle?.trim())
      .map((r) => ({ ...r, kind: args.kind, source: "csv" }));
    const { inserted } = await ctx.runMutation(internal.prospects.bulkInsert, { rows });
    return { inserted, fetched: rows.length };
  }),
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
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    const p: any = await ctx.runQuery(internal.prospects.getById, { id });
    if (!p) throw new Error("Prospect not found");
    const n = await enrichBatch(ctx, [p]);
    if (n === 0) throw new Error(`Could not fetch @${p.instagram_handle} — the profile may be private or renamed`);
    return { enriched: true };
  },
});

// Bulk follow-up for the Agent-Reach import path: it finds handles for free
// but can't reliably pull follower counts/bio, so anything it lands still
// needs one HikerAPI/Apify pass here before it's scored/rankable.
export const enrichPendingCreators = action({
  args: {},
  handler: withSurfacedErrors(async (ctx): Promise<{ enriched: number; remaining: number }> => {
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    const pending: any[] = await ctx.runQuery(internal.prospects.getPendingAgentReach, {});
    const batch = pending.slice(0, 30);
    const enriched = await enrichBatch(ctx, batch);
    return { enriched, remaining: pending.length - batch.length };
  }),
});

export const getPendingAgentReach = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("prospects")
      .withIndex("by_kind_status", (q) => q.eq("kind", "creator"))
      .collect();
    return rows.filter((r) => r.source === "agent-reach" && !r.enriched_at);
  },
});

// Writes live progress for a discovery run to admin_settings, where it's
// picked up by the client's existing (already-subscribed) getSettings query
// — no separate polling/streaming mechanism needed, Convex's reactivity
// covers it for free while the triggering action is still in flight.
async function writeRunProgress(ctx: any, key: string, data: Record<string, any>) {
  await ctx.runMutation(internal.admin.setSettingInternal, {
    key: `discovery_run:${key}`,
    value: JSON.stringify({ ...data, updatedAt: Date.now() }),
  });
}

// Shared flow: search Instagram for a niche (+ optional location), import new
// creators, enrich the top N by follower count, return the ranked results.
// Tries each niche keyword synonym (with, then without, location) rather than
// just the first one — a single literal phrase like "beach creator Thailand"
// often matches nothing on Instagram's account search even when the niche
// has real results under a different synonym or without the location term.
// Stops early once `target` unique accounts are found.
async function discoverAndScore(
  ctx: any,
  opts: {
    niche: string;
    location?: string;
    target?: number;
    enrichTop?: number;
    onProgress?: (p: { found: number; attempts: number; maxAttempts: number }) => Promise<void> | void;
  }
): Promise<{ imported: number; fetched: number; ranked: any[] }> {
  const target = Math.min(opts.target ?? 30, 100);
  const perCallLimit = Math.min(Math.max(target * 2, 30), 100);
  const keywordVariants = NICHE_SEARCH_TERMS[opts.niche] || [opts.niche];
  const queries = [
    ...keywordVariants.map((kw) => [kw, "creator", opts.location].filter(Boolean).join(" ")),
    ...(opts.location ? keywordVariants.map((kw) => [kw, opts.location].filter(Boolean).join(" ")) : []),
  ];

  const seen = new Set<string>();
  const accounts: IgAccount[] = [];
  for (let i = 0; i < queries.length; i++) {
    if (opts.onProgress) await opts.onProgress({ found: accounts.length, attempts: i, maxAttempts: queries.length });
    if (accounts.length >= target) break;
    let batch: IgAccount[] = [];
    try {
      batch = await searchInstagramUsers(queries[i], perCallLimit);
    } catch {
      continue; // one bad query variant shouldn't kill the whole run
    }
    for (const acc of batch) {
      const key = acc.username.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      accounts.push(acc);
    }
  }
  if (opts.onProgress) await opts.onProgress({ found: accounts.length, attempts: queries.length, maxAttempts: queries.length });

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
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    return await discoverAndScore(ctx, {
      niche: args.niche,
      location: args.location,
      target: args.limit,
      enrichTop: 10,
    });
  },
});

// Manual override for the daily creator-discovery cron below — same
// discoverAndScore call, but for one profile on demand (the "Run now" button
// in AutoDiscoveryCard) instead of waiting for 7am UTC. Reports live progress
// to admin_settings under `discovery_run:creator:<profileId>` so the button
// can show a progress bar instead of a single blocking spinner.
export const runDiscoveryProfileNow = action({
  args: { profileId: v.string(), niche: v.string(), location: v.optional(v.string()), perDay: v.optional(v.number()) },
  handler: withSurfacedErrors(async (ctx, args): Promise<{ imported: number; fetched: number }> => {
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    const target = Math.min(args.perDay ?? 10, 20);
    const progressKey = `creator:${args.profileId}`;
    await writeRunProgress(ctx, progressKey, { status: "running", target, found: 0, attempts: 0, maxAttempts: 0 });
    try {
      const { imported, fetched } = await discoverAndScore(ctx, {
        niche: args.niche,
        location: args.location || undefined,
        target,
        enrichTop: target,
        onProgress: (p) => writeRunProgress(ctx, progressKey, { status: "running", target, ...p }),
      });
      await writeRunProgress(ctx, progressKey, { status: "done", target, found: fetched, imported });
      return { imported, fetched };
    } catch (e: any) {
      await writeRunProgress(ctx, progressKey, { status: "error", target, message: e?.message || String(e) });
      throw e;
    }
  }),
});

// Daily cron: auto-discover creators for every enabled profile in the
// admin-configured list (all run every day — no rotation). Config lives in
// admin_settings under 'discovery_auto' as JSON:
//   { profiles: [{ id, enabled, niche, location, perDay }] }
// This is the HikerAPI/Apify tier only — it costs credits, so it no-ops
// (ran: false) whenever creator_search_provider is 'agent_reach' (the
// default). The free Agent-Reach tier (search-only) runs from a local
// session and lands rows via importCreatorsLocal above; those still pass
// through here manually via enrichPendingCreators since Agent-Reach can't
// reliably pull follower/bio data.
export const runDailyDiscovery = internalAction({
  args: {},
  handler: async (ctx): Promise<{ ran: boolean; results?: { niche: string; location?: string; imported: number }[] }> => {
    const settings: Record<string, string> = await ctx.runQuery(internal.admin.getSettingsInternal, {});
    if (searchProviderFor(settings, "creator") === "agent_reach") return { ran: false };
    let cfg: any = null;
    try { cfg = JSON.parse(settings.discovery_auto || "null"); } catch { /* bad JSON = off */ }
    const profiles = (cfg?.profiles || []).filter((p: any) => p?.enabled && p?.niche);
    if (!profiles.length) return { ran: false };

    const results = [];
    for (const profile of profiles) {
      const { imported } = await discoverAndScore(ctx, {
        niche: profile.niche,
        location: profile.location || undefined,
        target: Math.min(profile.perDay ?? 10, 20),
        enrichTop: Math.min(profile.perDay ?? 10, 20),
      });
      results.push({ niche: profile.niche, location: profile.location || undefined, imported });
    }
    return { ran: true, results };
  },
});

// Daily cron: auto-search every enabled profile in the admin-configured list
// for hosts (see HostAutoDiscoveryCard in Discovery.jsx) — all run every day,
// same shape as creator discovery above. Config lives in admin_settings under
// 'host_discovery_auto' as JSON:
//   { profiles: [{ id, enabled, query, perDay }] }
export const runDailyHostDiscovery = internalAction({
  args: {},
  handler: async (ctx): Promise<{ ran: boolean; results?: { query: string; imported: number }[] }> => {
    const settings: Record<string, string> = await ctx.runQuery(internal.admin.getSettingsInternal, {});
    if (searchProviderFor(settings, "host") === "agent_reach") return { ran: false };
    let cfg: any = null;
    try { cfg = JSON.parse(settings.host_discovery_auto || "null"); } catch { /* bad JSON = off */ }
    const profiles = (cfg?.profiles || []).filter((p: any) => p?.enabled && p?.query);
    if (!profiles.length) return { ran: false };

    const results = [];
    for (const profile of profiles) {
      const limit = Math.min(profile.perDay ?? 50, 100);
      const accounts = await searchInstagramUsers(profile.query, limit);
      const rows = accounts.map((acc) => ({
        kind: "host",
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
      results.push({ query: profile.query, imported: inserted });
    }
    return { ran: true, results };
  },
});
