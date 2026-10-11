import { v, ConvexError } from "convex/values";
import {
  query,
  mutation,
  action,
  internalQuery,
  internalMutation,
  internalAction,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthedProfile, requireAuthedProfile, requireAuthedProfileAction } from "./lib/auth";
import { encryptSecret, decryptSecret } from "./lib/crypto";
import { engagementTier } from "./lib/engagement";
import { enforceRateLimit, RATE_LIMITS } from "./lib/rateLimit";

// ─── Creator social connections + live portfolio ──────────────────────────────
// Creators link Instagram / TikTok (OAuth, "verified") so Collabnb can show live
// follower counts, engagement and a portfolio of posts that play straight from
// the platform. YouTube needs no login — its public Data API is read by handle
// ("unverified": we can't prove the creator owns the channel).
//
// The whole feature is dark until CREATOR_SOCIAL_ENABLED=true; the app shows
// "coming soon" meanwhile (see getStatus). Required Convex env vars:
//   CREATOR_SOCIAL_ENABLED   "true" to turn the Connect buttons on
//   CREATOR_SOCIAL_APP_URL   where OAuth callbacks send the user back, e.g. https://collabnb.com
//   IG_LOGIN_APP_ID / IG_LOGIN_APP_SECRET   "Instagram API with Instagram Login" app (NOT the Facebook app id)
//   TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET
//   YOUTUBE_API_KEY
//   AI_KEY_ENCRYPTION_SECRET (already set — reused to encrypt tokens at rest)
// OAuth redirect URIs to register: <CONVEX_SITE_URL>/creator-social/instagram/callback
// and <CONVEX_SITE_URL>/creator-social/tiktok/callback.

type Platform = "instagram" | "tiktok" | "youtube";
type OAuthPlatform = "instagram" | "tiktok";

const MAX_PORTFOLIO_ITEMS = 12;
const SAMPLE_SIZE = 12;
const DAY = 24 * 60 * 60 * 1000;
const MANUAL_SYNC_COOLDOWN = 60 * 60 * 1000;
const STATE_TTL = 10 * 60 * 1000;

const isEnabled = () => process.env.CREATOR_SOCIAL_ENABLED === "true";
const callbackUrl = (platform: OAuthPlatform) =>
  `${process.env.CONVEX_SITE_URL}/creator-social/${platform}/callback`;

interface NormalizedPost {
  external_id: string;
  caption?: string;
  media_type?: string;
  thumbnail_url?: string;
  permalink: string;
  embed_url: string;
  posted_at?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
}

interface Snapshot {
  handle?: string;
  accountId?: string;
  followers?: number;
  mediaCount?: number;
  posts: NormalizedPost[];
}

// ─── ID / URL helpers (embed + permalink are always built from these) ─────────

const ID_RE = /^[A-Za-z0-9_-]{3,64}$/;
const DIGITS_RE = /^\d{5,25}$/;

function igLinks(code: string, type: "p" | "reel" | "tv" = "p") {
  return {
    permalink: `https://www.instagram.com/${type}/${code}/`,
    embed_url: `https://www.instagram.com/${type}/${code}/embed`,
  };
}
function ttLinks(id: string, handle?: string) {
  return {
    permalink: `https://www.tiktok.com/@${handle || "_"}/video/${id}`,
    embed_url: `https://www.tiktok.com/embed/v2/${id}`,
  };
}
function ytLinks(id: string) {
  return {
    permalink: `https://www.youtube.com/watch?v=${id}`,
    embed_url: `https://www.youtube.com/embed/${id}`,
  };
}

// Parses a pasted public post link into a platform + id, or null.
export function parsePostUrl(
  raw: string
): { platform: Platform; id: string; igType?: "p" | "reel" | "tv"; handle?: string } | null {
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, "").toLowerCase();
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "instagram.com") {
    // /p/CODE, /reel/CODE, /tv/CODE, or /username/(p|reel)/CODE
    const i = parts.findIndex((s) => s === "p" || s === "reel" || s === "reels" || s === "tv");
    const code = i >= 0 ? parts[i + 1] : undefined;
    if (!code || !ID_RE.test(code)) return null;
    const t = parts[i] === "reels" ? "reel" : (parts[i] as "p" | "reel" | "tv");
    return { platform: "instagram", id: code, igType: t };
  }
  if (host === "tiktok.com") {
    const i = parts.indexOf("video");
    const id = i >= 0 ? parts[i + 1] : undefined;
    if (!id || !DIGITS_RE.test(id)) return null;
    const handle = parts[0]?.startsWith("@") ? parts[0].slice(1) : undefined;
    return { platform: "tiktok", id, handle };
  }
  if (host === "youtu.be") {
    return parts[0] && ID_RE.test(parts[0]) ? { platform: "youtube", id: parts[0] } : null;
  }
  if (host === "youtube.com" || host === "music.youtube.com") {
    const id =
      parts[0] === "watch" ? u.searchParams.get("v") : parts[0] === "shorts" || parts[0] === "embed" ? parts[1] : null;
    return id && ID_RE.test(id) ? { platform: "youtube", id } : null;
  }
  return null;
}

const clip = (s: unknown, n = 300) => (typeof s === "string" ? s.slice(0, n) : undefined);

// ─── Provider adapters ────────────────────────────────────────────────────────

const IG_GRAPH = "https://graph.instagram.com/v21.0";
const IG_POST_FIELDS = "id,caption,media_type,media_product_type,thumbnail_url,media_url,permalink,timestamp,like_count,comments_count";

function normalizeIgPost(m: any): NormalizedPost | null {
  const parsed = m?.permalink ? parsePostUrl(String(m.permalink)) : null;
  if (!parsed || parsed.platform !== "instagram") return null;
  const links = igLinks(parsed.id, parsed.igType);
  return {
    external_id: String(m.id),
    caption: clip(m.caption),
    media_type: m.media_product_type === "REELS" ? "REEL" : m.media_type,
    thumbnail_url: m.thumbnail_url || (m.media_type === "IMAGE" ? m.media_url : undefined),
    ...links,
    posted_at: m.timestamp ? new Date(m.timestamp).getTime() : undefined,
    likes: m.like_count,
    comments: m.comments_count,
  };
}

async function igViews(id: string, token: string): Promise<number | undefined> {
  try {
    const r = await fetch(`${IG_GRAPH}/${id}/insights?metric=views&access_token=${token}`);
    if (!r.ok) return undefined;
    const j = await r.json();
    return j?.data?.[0]?.values?.[0]?.value;
  } catch {
    return undefined;
  }
}

async function igSnapshot(token: string, withViews: boolean): Promise<Snapshot> {
  const me = await fetch(
    `${IG_GRAPH}/me?fields=user_id,username,followers_count,media_count&access_token=${token}`
  );
  if (!me.ok) throw new ProviderError(me.status, await me.text().catch(() => ""));
  const profile = await me.json();
  const media = await fetch(`${IG_GRAPH}/me/media?fields=${IG_POST_FIELDS}&limit=25&access_token=${token}`);
  const list = media.ok ? await media.json() : { data: [] };
  const posts = ((list.data || []) as any[]).map(normalizeIgPost).filter(Boolean) as NormalizedPost[];
  if (withViews) {
    await Promise.all(
      posts.slice(0, SAMPLE_SIZE).map(async (p) => {
        p.views = await igViews(p.external_id, token);
      })
    );
  }
  return {
    handle: profile.username,
    accountId: String(profile.user_id ?? profile.id ?? ""),
    followers: profile.followers_count,
    mediaCount: profile.media_count,
    posts,
  };
}

async function igPostsByIds(token: string, ids: string[]): Promise<NormalizedPost[]> {
  const out: NormalizedPost[] = [];
  for (const id of ids) {
    if (!DIGITS_RE.test(id)) continue;
    const r = await fetch(`${IG_GRAPH}/${id}?fields=${IG_POST_FIELDS}&access_token=${token}`);
    if (!r.ok) continue;
    const post = normalizeIgPost(await r.json());
    if (post) {
      post.views = await igViews(id, token);
      out.push(post);
    }
  }
  return out;
}

const TT_API = "https://open.tiktokapis.com/v2";
const TT_VIDEO_FIELDS =
  "id,title,cover_image_url,share_url,create_time,like_count,comment_count,share_count,view_count";

function normalizeTtVideo(vd: any, handle?: string): NormalizedPost | null {
  const id = String(vd?.id ?? "");
  if (!DIGITS_RE.test(id)) return null;
  const links = ttLinks(id, handle);
  return {
    external_id: id,
    caption: clip(vd.title),
    media_type: "VIDEO",
    thumbnail_url: vd.cover_image_url,
    embed_url: links.embed_url,
    // share_url is TikTok's own canonical link; fall back to the built one.
    permalink: typeof vd.share_url === "string" && vd.share_url.startsWith("https://") ? vd.share_url : links.permalink,
    posted_at: vd.create_time ? vd.create_time * 1000 : undefined,
    likes: vd.like_count,
    comments: vd.comment_count,
    shares: vd.share_count,
    views: vd.view_count,
  };
}

async function ttSnapshot(token: string): Promise<Snapshot> {
  const me = await fetch(
    `${TT_API}/user/info/?fields=open_id,display_name,follower_count,video_count`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!me.ok) throw new ProviderError(me.status, await me.text().catch(() => ""));
  const user = (await me.json())?.data?.user ?? {};
  const vids = await fetch(`${TT_API}/video/list/?fields=${TT_VIDEO_FIELDS}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ max_count: 20 }),
  });
  const list = vids.ok ? await vids.json() : {};
  const posts = ((list?.data?.videos || []) as any[])
    .map((x) => normalizeTtVideo(x))
    .filter(Boolean) as NormalizedPost[];
  return {
    handle: user.display_name,
    accountId: user.open_id,
    followers: user.follower_count,
    mediaCount: user.video_count,
    posts,
  };
}

async function ttPostsByIds(token: string, ids: string[]): Promise<NormalizedPost[]> {
  const clean = ids.filter((i) => DIGITS_RE.test(i)).slice(0, 20);
  if (!clean.length) return [];
  const r = await fetch(`${TT_API}/video/query/?fields=${TT_VIDEO_FIELDS}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ filters: { video_ids: clean } }),
  });
  if (!r.ok) return [];
  return (((await r.json())?.data?.videos || []) as any[])
    .map((x) => normalizeTtVideo(x))
    .filter(Boolean) as NormalizedPost[];
}

const YT_API = "https://www.googleapis.com/youtube/v3";

async function ytSnapshot(handle: string): Promise<Snapshot> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new ConvexError("YouTube sync isn't configured yet.");
  const clean = handle.replace(/^@/, "").trim();
  const ch = await fetch(
    `${YT_API}/channels?part=snippet,statistics,contentDetails&forHandle=${encodeURIComponent("@" + clean)}&key=${key}`
  );
  if (!ch.ok) throw new ProviderError(ch.status, await ch.text().catch(() => ""));
  const channel = (await ch.json())?.items?.[0];
  if (!channel) throw new ConvexError(`No YouTube channel found for @${clean}.`);
  const stats = channel.statistics ?? {};
  const uploads = channel.contentDetails?.relatedPlaylists?.uploads;

  let posts: NormalizedPost[] = [];
  if (uploads) {
    const pl = await fetch(
      `${YT_API}/playlistItems?part=contentDetails&playlistId=${uploads}&maxResults=${SAMPLE_SIZE}&key=${key}`
    );
    const ids = pl.ok
      ? (((await pl.json()).items || []) as any[]).map((i) => i.contentDetails?.videoId).filter(Boolean)
      : [];
    posts = await ytVideosByIds(ids);
  }
  return {
    handle: clean,
    accountId: channel.id,
    followers: stats.hiddenSubscriberCount ? undefined : Number(stats.subscriberCount),
    mediaCount: Number(stats.videoCount),
    posts,
  };
}

async function ytVideosByIds(ids: string[]): Promise<NormalizedPost[]> {
  const key = process.env.YOUTUBE_API_KEY;
  const clean = ids.filter((i) => ID_RE.test(i)).slice(0, 50);
  if (!key || !clean.length) return [];
  const r = await fetch(`${YT_API}/videos?part=snippet,statistics&id=${clean.join(",")}&key=${key}`);
  if (!r.ok) return [];
  return (((await r.json()).items || []) as any[]).map((it) => ({
    external_id: String(it.id),
    caption: clip(it.snippet?.title),
    media_type: "VIDEO",
    thumbnail_url: it.snippet?.thumbnails?.high?.url ?? it.snippet?.thumbnails?.medium?.url,
    ...ytLinks(String(it.id)),
    posted_at: it.snippet?.publishedAt ? new Date(it.snippet.publishedAt).getTime() : undefined,
    likes: it.statistics?.likeCount !== undefined ? Number(it.statistics.likeCount) : undefined,
    comments: it.statistics?.commentCount !== undefined ? Number(it.statistics.commentCount) : undefined,
    views: it.statistics?.viewCount !== undefined ? Number(it.statistics.viewCount) : undefined,
  }));
}

class ProviderError extends Error {
  constructor(public status: number, public detail: string) {
    super(`Provider request failed (${status})`);
  }
}

function sampleStats(posts: NormalizedPost[]) {
  const recent = [...posts]
    .sort((a, b) => (b.posted_at ?? 0) - (a.posted_at ?? 0))
    .slice(0, SAMPLE_SIZE);
  const avg = (key: "views" | "likes" | "comments") => {
    const vals = recent.map((p) => p[key]).filter((n): n is number => typeof n === "number");
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : undefined;
  };
  return {
    avg_views: avg("views"),
    avg_likes: avg("likes"),
    avg_comments: avg("comments"),
    posts_sampled: recent.length,
  };
}

// ─── Queries (owner + public) ─────────────────────────────────────────────────

// Public so the signed-out UI and the Settings card know whether to show the
// real Connect buttons or the "coming soon" state, without a code deploy.
export const getStatus = query({
  args: {},
  handler: async () => ({
    enabled: isEnabled(),
    instagram: !!(process.env.IG_LOGIN_APP_ID && process.env.IG_LOGIN_APP_SECRET),
    tiktok: !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
    youtube: !!process.env.YOUTUBE_API_KEY,
    maxPortfolioItems: MAX_PORTFOLIO_ITEMS,
  }),
});

function safeConnection(c: any) {
  return {
    _id: c._id,
    platform: c.platform,
    verified: c.verified,
    handle: c.handle ?? null,
    follower_count: c.follower_count ?? null,
    media_count: c.media_count ?? null,
    avg_views: c.avg_views ?? null,
    last_synced_at: c.last_synced_at ?? null,
    connected_at: c.connected_at,
    sync_error: c.sync_error ?? null,
    needs_reconnect: c.needs_reconnect === true,
  };
}

export const getMyConnections = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthedProfile(ctx);
    if (!me) return [];
    const rows = await ctx.db
      .query("creator_social_connections")
      .withIndex("by_profile", (q) => q.eq("profile_id", String(me._id)))
      .collect();
    return rows.map(safeConnection);
  },
});

export const getMyPortfolio = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthedProfile(ctx);
    if (!me) return [];
    const rows = await ctx.db
      .query("creator_portfolio_items")
      .withIndex("by_profile", (q) => q.eq("profile_id", String(me._id)))
      .collect();
    return rows.sort((a, b) => a.sort_order - b.sort_order);
  },
});

// Backs the portfolio + stats block on /u/:username and the creator profile.
// Whitelisted shape; unverified/rejected profiles 404 like getPublicByUsername.
export const getPublicSocial = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const wanted = username.trim();
    if (!wanted) return null;
    const idx = (u: string) =>
      ctx.db.query("profiles").withIndex("by_username", (q) => q.eq("username", u)).first();
    const p = (await idx(wanted)) ?? (await idx(wanted.toLowerCase()));
    if (!p || p.is_verified !== true || p.is_rejected === true) return null;
    if (p.role !== "creator" || p.profile_visible === false) return null;

    const pid = String(p._id);
    const [conns, items] = await Promise.all([
      ctx.db.query("creator_social_connections").withIndex("by_profile", (q) => q.eq("profile_id", pid)).collect(),
      ctx.db.query("creator_portfolio_items").withIndex("by_profile", (q) => q.eq("profile_id", pid)).collect(),
    ]);
    return {
      stats: {
        followers: p.follower_count ?? null,
        engagement_rate: p.engagement_rate ?? null,
        engagement_tier: p.engagement_tier ?? null,
        avg_views: p.metrics_avg_views ?? null,
        verified_platforms: p.metrics_verified_platforms ?? [],
        synced_at: p.metrics_synced_at ?? null,
      },
      platforms: conns.map((c) => ({
        platform: c.platform,
        handle: c.handle ?? null,
        followers: c.follower_count ?? null,
        verified: c.verified,
      })),
      portfolio: items
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((i) => ({
          id: i._id,
          platform: i.platform,
          embed_url: i.embed_url,
          permalink: i.permalink,
          thumbnail_url: i.thumbnail_url ?? null,
          caption: i.caption ?? null,
          views: i.views ?? null,
          likes: i.likes ?? null,
        })),
    };
  },
});

// ─── OAuth start ──────────────────────────────────────────────────────────────

export const startConnect = action({
  args: { platform: v.union(v.literal("instagram"), v.literal("tiktok")) },
  handler: async (ctx, { platform }): Promise<{ url: string }> => {
    if (!isEnabled()) throw new ConvexError("Account linking isn't available yet.");
    const me: any = await requireAuthedProfileAction(ctx, internal.profiles.getByClerkUserId);
    if (me.role !== "creator") throw new ConvexError("Only creators can link social accounts.");

    const state = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    await ctx.runMutation(internal.creatorSocial.saveOAuthState, {
      state,
      profileId: String(me._id),
      platform,
    });

    if (platform === "instagram") {
      const appId = process.env.IG_LOGIN_APP_ID;
      if (!appId) throw new ConvexError("Instagram linking isn't configured yet.");
      const q = new URLSearchParams({
        client_id: appId,
        redirect_uri: callbackUrl("instagram"),
        response_type: "code",
        scope: "instagram_business_basic",
        state,
      });
      return { url: `https://www.instagram.com/oauth/authorize?${q}` };
    }
    const key = process.env.TIKTOK_CLIENT_KEY;
    if (!key) throw new ConvexError("TikTok linking isn't configured yet.");
    const q = new URLSearchParams({
      client_key: key,
      scope: "user.info.basic,user.info.stats,video.list",
      response_type: "code",
      redirect_uri: callbackUrl("tiktok"),
      state,
    });
    return { url: `https://www.tiktok.com/v2/auth/authorize/?${q}` };
  },
});

export const saveOAuthState = internalMutation({
  args: {
    state: v.string(),
    profileId: v.string(),
    platform: v.union(v.literal("instagram"), v.literal("tiktok")),
  },
  handler: async (ctx, a) => {
    await ctx.db.insert("creator_social_oauth_states", {
      state: a.state,
      profile_id: a.profileId,
      platform: a.platform,
      created_at: Date.now(),
    });
  },
});

// Single use: deleted on read so a replayed callback can't re-link.
export const consumeOAuthState = internalMutation({
  args: { state: v.string() },
  handler: async (ctx, { state }) => {
    const row = await ctx.db
      .query("creator_social_oauth_states")
      .withIndex("by_state", (q) => q.eq("state", state))
      .first();
    if (!row) return null;
    await ctx.db.delete(row._id);
    if (Date.now() - row.created_at > STATE_TTL) return null;
    return { profileId: row.profile_id, platform: row.platform };
  },
});

export const purgeStaleOAuthStates = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - STATE_TTL;
    const rows = await ctx.db.query("creator_social_oauth_states").collect();
    for (const r of rows) if (r.created_at < cutoff) await ctx.db.delete(r._id);
  },
});

// ─── OAuth callback (called from http.ts) ─────────────────────────────────────

export const handleOAuthCallback = internalAction({
  args: {
    platform: v.union(v.literal("instagram"), v.literal("tiktok")),
    code: v.optional(v.string()),
    state: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { platform, code, state, error }): Promise<string> => {
    const base = (process.env.CREATOR_SOCIAL_APP_URL || "https://collabnb.com").replace(/\/$/, "");
    const back = (result: string) => `${base}/settings?social=${platform}_${result}`;

    if (!isEnabled()) return back("error");
    if (error || !code || !state) return back("denied");
    const st = await ctx.runMutation(internal.creatorSocial.consumeOAuthState, { state });
    if (!st || st.platform !== platform) return back("error");

    try {
      let accessToken: string;
      let refreshToken: string | undefined;
      let expiresAt: number | undefined;
      let refreshExpiresAt: number | undefined;

      if (platform === "instagram") {
        const short = await fetch("https://api.instagram.com/oauth/access_token", {
          method: "POST",
          body: new URLSearchParams({
            client_id: process.env.IG_LOGIN_APP_ID!,
            client_secret: process.env.IG_LOGIN_APP_SECRET!,
            grant_type: "authorization_code",
            redirect_uri: callbackUrl("instagram"),
            code: code.replace(/#_$/, ""),
          }),
        });
        if (!short.ok) throw new ProviderError(short.status, await short.text().catch(() => ""));
        const shortTok = (await short.json()).access_token;
        const long = await fetch(
          `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.IG_LOGIN_APP_SECRET}&access_token=${shortTok}`
        );
        if (!long.ok) throw new ProviderError(long.status, await long.text().catch(() => ""));
        const lj = await long.json();
        accessToken = lj.access_token;
        expiresAt = Date.now() + (lj.expires_in ?? 60 * DAY / 1000) * 1000;
      } else {
        const tok = await fetch(`${TT_API}/oauth/token/`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_key: process.env.TIKTOK_CLIENT_KEY!,
            client_secret: process.env.TIKTOK_CLIENT_SECRET!,
            code,
            grant_type: "authorization_code",
            redirect_uri: callbackUrl("tiktok"),
          }),
        });
        const tj = await tok.json();
        if (!tok.ok || !tj.access_token) throw new ProviderError(tok.status, JSON.stringify(tj).slice(0, 200));
        accessToken = tj.access_token;
        refreshToken = tj.refresh_token;
        expiresAt = Date.now() + (tj.expires_in ?? 86400) * 1000;
        refreshExpiresAt = Date.now() + (tj.refresh_expires_in ?? 365 * 86400) * 1000;
      }

      await ctx.runMutation(internal.creatorSocial.saveConnection, {
        profileId: st.profileId,
        platform,
        tokens: await sealTokens(accessToken, refreshToken),
        expiresAt,
        refreshExpiresAt,
      });
      await ctx.runAction(internal.creatorSocial.syncConnection, {
        profileId: st.profileId,
        platform,
      });
      return back("connected");
    } catch (e: any) {
      console.error(`creatorSocial ${platform} callback failed:`, e?.message, e?.detail);
      return back("error");
    }
  },
});

async function sealTokens(access: string, refresh?: string) {
  const a = await encryptSecret(access);
  const r = refresh ? await encryptSecret(refresh) : undefined;
  return {
    access_token_enc: a.ciphertext,
    access_token_iv: a.iv,
    refresh_token_enc: r?.ciphertext,
    refresh_token_iv: r?.iv,
  };
}

export const saveConnection = internalMutation({
  args: {
    profileId: v.string(),
    platform: v.union(v.literal("instagram"), v.literal("tiktok")),
    tokens: v.object({
      access_token_enc: v.string(),
      access_token_iv: v.string(),
      refresh_token_enc: v.optional(v.string()),
      refresh_token_iv: v.optional(v.string()),
    }),
    expiresAt: v.optional(v.number()),
    refreshExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    const existing = await ctx.db
      .query("creator_social_connections")
      .withIndex("by_profile_platform", (q) => q.eq("profile_id", a.profileId).eq("platform", a.platform))
      .first();
    const doc = {
      ...a.tokens,
      expires_at: a.expiresAt,
      refresh_expires_at: a.refreshExpiresAt,
      verified: true,
      needs_reconnect: false,
      sync_error: undefined,
    };
    if (existing) {
      await ctx.db.patch(existing._id, doc);
    } else {
      await ctx.db.insert("creator_social_connections", {
        profile_id: a.profileId,
        platform: a.platform,
        connected_at: Date.now(),
        ...doc,
      });
    }
  },
});

export const getConnectionInternal = internalQuery({
  args: { profileId: v.string(), platform: v.union(v.literal("instagram"), v.literal("tiktok"), v.literal("youtube")) },
  handler: async (ctx, a) =>
    await ctx.db
      .query("creator_social_connections")
      .withIndex("by_profile_platform", (q) => q.eq("profile_id", a.profileId).eq("platform", a.platform))
      .first(),
});

// ─── Token handling ───────────────────────────────────────────────────────────

// Returns a usable access token, refreshing first when it's near expiry.
// Marks the connection needs_reconnect and returns null if refresh is impossible.
async function getFreshToken(ctx: any, conn: any): Promise<string | null> {
  if (!conn.access_token_enc || !conn.access_token_iv) return null;
  const now = Date.now();

  if (conn.platform === "instagram") {
    let token = await decryptSecret(conn.access_token_enc, conn.access_token_iv);
    // Long-lived IG tokens last 60 days and refresh only once ≥24h old.
    if (conn.expires_at && conn.expires_at - now < 15 * DAY) {
      const r = await fetch(
        `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`
      );
      if (!r.ok) {
        if (conn.expires_at < now) {
          await ctx.runMutation(internal.creatorSocial.markNeedsReconnect, { connectionId: conn._id });
          return null;
        }
      } else {
        const j = await r.json();
        token = j.access_token;
        const enc = await sealTokens(token);
        await ctx.runMutation(internal.creatorSocial.updateTokens, {
          connectionId: conn._id,
          tokens: enc,
          expiresAt: now + (j.expires_in ?? 60 * DAY / 1000) * 1000,
        });
      }
    }
    return token;
  }

  // TikTok access tokens last 24h; refresh when under 6h left.
  if (!conn.expires_at || conn.expires_at - now > 6 * 60 * 60 * 1000) {
    return await decryptSecret(conn.access_token_enc, conn.access_token_iv);
  }
  if (!conn.refresh_token_enc || !conn.refresh_token_iv || (conn.refresh_expires_at && conn.refresh_expires_at < now)) {
    await ctx.runMutation(internal.creatorSocial.markNeedsReconnect, { connectionId: conn._id });
    return null;
  }
  const refresh = await decryptSecret(conn.refresh_token_enc, conn.refresh_token_iv);
  const r = await fetch(`${TT_API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refresh,
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    await ctx.runMutation(internal.creatorSocial.markNeedsReconnect, { connectionId: conn._id });
    return null;
  }
  await ctx.runMutation(internal.creatorSocial.updateTokens, {
    connectionId: conn._id,
    tokens: await sealTokens(j.access_token, j.refresh_token ?? refresh),
    expiresAt: now + (j.expires_in ?? 86400) * 1000,
    refreshExpiresAt: now + (j.refresh_expires_in ?? 365 * 86400) * 1000,
  });
  return j.access_token;
}

export const updateTokens = internalMutation({
  args: {
    connectionId: v.id("creator_social_connections"),
    tokens: v.object({
      access_token_enc: v.string(),
      access_token_iv: v.string(),
      refresh_token_enc: v.optional(v.string()),
      refresh_token_iv: v.optional(v.string()),
    }),
    expiresAt: v.optional(v.number()),
    refreshExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    const patch: Record<string, any> = { ...a.tokens, expires_at: a.expiresAt, needs_reconnect: false };
    if (a.refreshExpiresAt) patch.refresh_expires_at = a.refreshExpiresAt;
    await ctx.db.patch(a.connectionId, patch);
  },
});

export const markNeedsReconnect = internalMutation({
  args: { connectionId: v.id("creator_social_connections") },
  handler: async (ctx, { connectionId }) => {
    const c = await ctx.db.get(connectionId);
    if (!c || c.needs_reconnect) return;
    await ctx.db.patch(connectionId, { needs_reconnect: true, sync_error: "Reconnect required" });
    await ctx.db.insert("notifications", {
      user_id: c.profile_id,
      type: "social_reconnect",
      title: `Reconnect your ${c.platform === "instagram" ? "Instagram" : "TikTok"}`,
      body: "We lost access to your account. Reconnect it in Settings to keep your stats and portfolio live.",
      link: "/settings",
      read: false,
      created_at: Date.now(),
    });
  },
});

// ─── Sync ─────────────────────────────────────────────────────────────────────

async function snapshotFor(ctx: any, conn: any): Promise<Snapshot | null> {
  if (conn.platform === "youtube") return await ytSnapshot(conn.handle ?? "");
  const token = await getFreshToken(ctx, conn);
  if (!token) return null;
  return conn.platform === "instagram" ? await igSnapshot(token, true) : await ttSnapshot(token);
}

export const syncConnection = internalAction({
  args: {
    profileId: v.string(),
    platform: v.union(v.literal("instagram"), v.literal("tiktok"), v.literal("youtube")),
  },
  handler: async (ctx, { profileId, platform }): Promise<{ ok: boolean }> => {
    const conn: any = await ctx.runQuery(internal.creatorSocial.getConnectionInternal, { profileId, platform });
    if (!conn) return { ok: false };
    try {
      const snap = await snapshotFor(ctx, conn);
      if (!snap) return { ok: false };
      await ctx.runMutation(internal.creatorSocial.applySnapshot, {
        connectionId: conn._id,
        handle: snap.handle,
        accountId: snap.accountId,
        followers: snap.followers,
        mediaCount: snap.mediaCount,
        stats: sampleStats(snap.posts),
        // Refresh the cached stats/thumbnails of anything already in the portfolio.
        posts: snap.posts.map((p) => ({
          external_id: p.external_id,
          thumbnail_url: p.thumbnail_url,
          views: p.views,
          likes: p.likes,
          comments: p.comments,
        })),
      });
      return { ok: true };
    } catch (e: any) {
      const detail = e instanceof ProviderError ? `HTTP ${e.status}` : String(e?.message ?? e).slice(0, 120);
      console.error(`creatorSocial sync ${platform} failed for ${profileId}:`, detail);
      await ctx.runMutation(internal.creatorSocial.recordSyncError, { connectionId: conn._id, error: detail });
      // 401/403 from the provider means the grant is gone.
      if (e instanceof ProviderError && (e.status === 400 || e.status === 401 || e.status === 403) && platform !== "youtube") {
        await ctx.runMutation(internal.creatorSocial.markNeedsReconnect, { connectionId: conn._id });
      }
      return { ok: false };
    }
  },
});

export const recordSyncError = internalMutation({
  args: { connectionId: v.id("creator_social_connections"), error: v.string() },
  handler: async (ctx, a) => {
    await ctx.db.patch(a.connectionId, { sync_error: a.error, last_synced_at: Date.now() });
  },
});

export const applySnapshot = internalMutation({
  args: {
    connectionId: v.id("creator_social_connections"),
    handle: v.optional(v.string()),
    accountId: v.optional(v.string()),
    followers: v.optional(v.number()),
    mediaCount: v.optional(v.number()),
    stats: v.object({
      avg_views: v.optional(v.number()),
      avg_likes: v.optional(v.number()),
      avg_comments: v.optional(v.number()),
      posts_sampled: v.number(),
    }),
    posts: v.array(
      v.object({
        external_id: v.string(),
        thumbnail_url: v.optional(v.string()),
        views: v.optional(v.number()),
        likes: v.optional(v.number()),
        comments: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, a) => {
    const conn = await ctx.db.get(a.connectionId);
    if (!conn) return;
    await ctx.db.patch(a.connectionId, {
      handle: a.handle ?? conn.handle,
      account_id: a.accountId ?? conn.account_id,
      follower_count: a.followers ?? conn.follower_count,
      media_count: a.mediaCount ?? conn.media_count,
      ...a.stats,
      last_synced_at: Date.now(),
      sync_error: undefined,
      needs_reconnect: false,
    });

    const items = await ctx.db
      .query("creator_portfolio_items")
      .withIndex("by_profile", (q) => q.eq("profile_id", conn.profile_id))
      .collect();
    const fresh = new Map(a.posts.map((p) => [p.external_id, p]));
    for (const item of items) {
      if (item.platform !== conn.platform || item.source !== "connected") continue;
      const p = fresh.get(item.external_id);
      if (!p) continue;
      await ctx.db.patch(item._id, {
        thumbnail_url: p.thumbnail_url ?? item.thumbnail_url,
        views: p.views ?? item.views,
        likes: p.likes ?? item.likes,
        comments: p.comments ?? item.comments,
        synced_at: Date.now(),
      });
    }
    await recomputeMetrics(ctx, conn.profile_id);
  },
});

// Rolls every connection up into the profile's headline numbers. Manual
// entries (updateMetrics) still own any platform that isn't connected.
async function recomputeMetrics(ctx: any, profileId: string) {
  const profile: any = await ctx.db.get(profileId as any);
  if (!profile) return;
  const conns: any[] = await ctx.db
    .query("creator_social_connections")
    .withIndex("by_profile", (q: any) => q.eq("profile_id", profileId))
    .collect();

  const patch: Record<string, any> = { metrics_synced_at: Date.now() };
  const followers = {
    instagram: profile.metrics_instagram_followers,
    tiktok: profile.metrics_tiktok_followers,
    youtube: profile.metrics_youtube_subscribers,
  } as Record<Platform, number | undefined>;
  for (const c of conns) if (typeof c.follower_count === "number") followers[c.platform as Platform] = c.follower_count;
  patch.metrics_instagram_followers = followers.instagram;
  patch.metrics_tiktok_followers = followers.tiktok;
  patch.metrics_youtube_subscribers = followers.youtube;
  const total = (followers.instagram ?? 0) + (followers.tiktok ?? 0) + (followers.youtube ?? 0);
  if (total > 0) patch.follower_count = total;
  patch.metrics_verified_platforms = conns.filter((c) => c.verified && !c.needs_reconnect).map((c) => c.platform);

  let weight = 0, views = 0, likes = 0, comments = 0, viewWeight = 0;
  for (const c of conns) {
    const n = c.posts_sampled ?? 0;
    if (!n || c.avg_likes === undefined) continue;
    weight += n;
    likes += (c.avg_likes ?? 0) * n;
    comments += (c.avg_comments ?? 0) * n;
    if (c.avg_views) { views += c.avg_views * n; viewWeight += n; }
  }
  if (weight > 0) {
    const avgLikes = Math.round(likes / weight);
    const avgComments = Math.round(comments / weight);
    const avgViews = viewWeight ? Math.round(views / viewWeight) : undefined;
    patch.metrics_avg_likes = avgLikes;
    patch.metrics_avg_comments = avgComments;
    if (avgViews !== undefined) patch.metrics_avg_views = avgViews;
    const basis: "views" | "followers" = avgViews ? "views" : "followers";
    const denom = avgViews ?? total;
    if (denom > 0) {
      const er = parseFloat((((avgLikes + avgComments) / denom) * 100).toFixed(1));
      patch.engagement_rate = er;
      patch.engagement_tier = engagementTier(er, basis);
    }
  }
  await ctx.db.patch(profileId as any, patch);
}

export const recomputeProfileMetrics = internalMutation({
  args: { profileId: v.string() },
  handler: async (ctx, { profileId }) => await recomputeMetrics(ctx, profileId),
});

// Owner-triggered refresh. 1h cooldown so it can't be used to hammer the APIs.
export const syncMine = action({
  args: { platform: v.union(v.literal("instagram"), v.literal("tiktok"), v.literal("youtube")) },
  handler: async (ctx, { platform }): Promise<{ ok: boolean }> => {
    const me: any = await requireAuthedProfileAction(ctx, internal.profiles.getByClerkUserId);
    const pid = String(me._id);
    const conn: any = await ctx.runQuery(internal.creatorSocial.getConnectionInternal, { profileId: pid, platform });
    if (!conn) throw new ConvexError("not_connected");
    if (conn.last_synced_at && Date.now() - conn.last_synced_at < MANUAL_SYNC_COOLDOWN && !conn.sync_error) {
      throw new ConvexError("refresh_cooldown");
    }
    await ctx.runMutation(internal.creatorSocial.consumeLimit, { profileId: pid, kind: "refresh" });
    return await ctx.runAction(internal.creatorSocial.syncConnection, { profileId: pid, platform });
  },
});

export const consumeLimit = internalMutation({
  args: { profileId: v.string(), kind: v.union(v.literal("refresh"), v.literal("link_add")) },
  handler: async (ctx, { profileId, kind }) => {
    try {
      await enforceRateLimit(
        ctx as any,
        `social-${kind}:${profileId}`,
        kind === "refresh" ? RATE_LIMITS.SOCIAL_REFRESH : RATE_LIMITS.SOCIAL_LINK_ADD
      );
    } catch {
      throw new ConvexError(kind === "refresh" ? "refresh_daily_limit" : "link_add_daily_limit");
    }
  },
});

// YouTube has no login: link by the handle already on the profile.
export const linkYouTube = action({
  args: { handle: v.optional(v.string()) },
  handler: async (ctx, { handle }): Promise<{ ok: boolean }> => {
    const me: any = await requireAuthedProfileAction(ctx, internal.profiles.getByClerkUserId);
    if (me.role !== "creator") throw new ConvexError("Only creators can link social accounts.");
    const h = (handle ?? me.youtube_handle ?? "").replace(/^@/, "").trim();
    if (!h) throw new ConvexError("Add your YouTube handle to your profile first.");
    await ctx.runMutation(internal.creatorSocial.upsertYouTube, { profileId: String(me._id), handle: h });
    return await ctx.runAction(internal.creatorSocial.syncConnection, { profileId: String(me._id), platform: "youtube" });
  },
});

export const upsertYouTube = internalMutation({
  args: { profileId: v.string(), handle: v.string() },
  handler: async (ctx, a) => {
    const existing = await ctx.db
      .query("creator_social_connections")
      .withIndex("by_profile_platform", (q) => q.eq("profile_id", a.profileId).eq("platform", "youtube"))
      .first();
    if (existing) await ctx.db.patch(existing._id, { handle: a.handle });
    else
      await ctx.db.insert("creator_social_connections", {
        profile_id: a.profileId,
        platform: "youtube",
        verified: false,
        handle: a.handle,
        connected_at: Date.now(),
      });
  },
});

// ─── Disconnect ───────────────────────────────────────────────────────────────

export const disconnect = mutation({
  args: { platform: v.union(v.literal("instagram"), v.literal("tiktok"), v.literal("youtube")) },
  handler: async (ctx, { platform }) => {
    const me = await requireAuthedProfile(ctx);
    const pid = String(me._id);
    const conn = await ctx.db
      .query("creator_social_connections")
      .withIndex("by_profile_platform", (q) => q.eq("profile_id", pid).eq("platform", platform))
      .first();
    if (conn) await ctx.db.delete(conn._id);
    // Connected posts can no longer be refreshed, so they come down with the link.
    const items = await ctx.db
      .query("creator_portfolio_items")
      .withIndex("by_profile", (q) => q.eq("profile_id", pid))
      .collect();
    for (const i of items) if (i.platform === platform && i.source === "connected") await ctx.db.delete(i._id);
    await recomputeMetrics(ctx, pid);
  },
});

// ─── Portfolio ────────────────────────────────────────────────────────────────

// Recent posts from a connected account, for the "pick what to show" picker.
export const listMyPosts = action({
  args: { platform: v.union(v.literal("instagram"), v.literal("tiktok"), v.literal("youtube")) },
  handler: async (ctx, { platform }) => {
    const me: any = await requireAuthedProfileAction(ctx, internal.profiles.getByClerkUserId);
    const conn: any = await ctx.runQuery(internal.creatorSocial.getConnectionInternal, {
      profileId: String(me._id),
      platform,
    });
    if (!conn) throw new ConvexError("not_connected");
    const snap = platform === "youtube" ? await ytSnapshot(conn.handle ?? "") : await (async () => {
      const token = await getFreshToken(ctx, conn);
      if (!token) throw new ConvexError("Reconnect this account to load your posts.");
      return platform === "instagram" ? await igSnapshot(token, false) : await ttSnapshot(token);
    })();
    return snap.posts.map((p) => ({
      external_id: p.external_id,
      caption: p.caption ?? null,
      thumbnail_url: p.thumbnail_url ?? null,
      media_type: p.media_type ?? null,
      posted_at: p.posted_at ?? null,
      views: p.views ?? null,
      likes: p.likes ?? null,
    }));
  },
});

// Add posts chosen from a connected account. Re-fetched server-side by id so
// the client can't smuggle in an arbitrary link/embed.
export const addConnectedPosts = action({
  args: {
    platform: v.union(v.literal("instagram"), v.literal("tiktok"), v.literal("youtube")),
    externalIds: v.array(v.string()),
  },
  handler: async (ctx, { platform, externalIds }): Promise<{ added: number }> => {
    const me: any = await requireAuthedProfileAction(ctx, internal.profiles.getByClerkUserId);
    const conn: any = await ctx.runQuery(internal.creatorSocial.getConnectionInternal, {
      profileId: String(me._id),
      platform,
    });
    if (!conn) throw new ConvexError("not_connected");
    const ids = [...new Set(externalIds)].slice(0, MAX_PORTFOLIO_ITEMS);
    let posts: NormalizedPost[];
    if (platform === "youtube") posts = await ytVideosByIds(ids);
    else {
      const token = await getFreshToken(ctx, conn);
      if (!token) throw new ConvexError("Reconnect this account first.");
      posts = platform === "instagram" ? await igPostsByIds(token, ids) : await ttPostsByIds(token, ids);
    }
    return await ctx.runMutation(internal.creatorSocial.insertPortfolioItems, {
      profileId: String(me._id),
      platform,
      source: "connected",
      posts,
    });
  },
});

// Paste a public post link — works with no account linking at all.
export const addPortfolioUrl = action({
  args: { url: v.string() },
  handler: async (ctx, { url }): Promise<{ added: number }> => {
    const me: any = await requireAuthedProfileAction(ctx, internal.profiles.getByClerkUserId);
    if (me.role !== "creator") throw new ConvexError("Only creators can add portfolio posts.");
    await ctx.runMutation(internal.creatorSocial.consumeLimit, { profileId: String(me._id), kind: "link_add" });
    const parsed = parsePostUrl(url);
    if (!parsed) {
      throw new ConvexError("invalid_url");
    }

    let post: NormalizedPost;
    if (parsed.platform === "instagram") {
      post = { external_id: parsed.id, media_type: "REEL", ...igLinks(parsed.id, parsed.igType) };
    } else if (parsed.platform === "tiktok") {
      const links = ttLinks(parsed.id, parsed.handle);
      post = { external_id: parsed.id, media_type: "VIDEO", ...links };
      try {
        const o = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(links.permalink)}`);
        if (o.ok) {
          const j = await o.json();
          post.thumbnail_url = j.thumbnail_url;
          post.caption = clip(j.title);
        }
      } catch { /* thumbnail is optional */ }
    } else {
      const found = (await ytVideosByIds([parsed.id]))[0];
      post = found ?? { external_id: parsed.id, media_type: "VIDEO", thumbnail_url: `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`, ...ytLinks(parsed.id) };
    }
    return await ctx.runMutation(internal.creatorSocial.insertPortfolioItems, {
      profileId: String(me._id),
      platform: parsed.platform,
      source: "url",
      posts: [post],
    });
  },
});

export const insertPortfolioItems = internalMutation({
  args: {
    profileId: v.string(),
    platform: v.union(v.literal("instagram"), v.literal("tiktok"), v.literal("youtube")),
    source: v.union(v.literal("connected"), v.literal("url")),
    posts: v.array(
      v.object({
        external_id: v.string(),
        caption: v.optional(v.string()),
        media_type: v.optional(v.string()),
        thumbnail_url: v.optional(v.string()),
        permalink: v.string(),
        embed_url: v.string(),
        posted_at: v.optional(v.number()),
        likes: v.optional(v.number()),
        comments: v.optional(v.number()),
        shares: v.optional(v.number()),
        views: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, a) => {
    const existing = await ctx.db
      .query("creator_portfolio_items")
      .withIndex("by_profile", (q) => q.eq("profile_id", a.profileId))
      .collect();
    const have = new Set(existing.map((i) => `${i.platform}:${i.external_id}`));
    let order = existing.reduce((m, i) => Math.max(m, i.sort_order), -1) + 1;
    let added = 0;
    for (const p of a.posts) {
      if (existing.length + added >= MAX_PORTFOLIO_ITEMS) {
        if (added === 0) throw new ConvexError("portfolio_full");
        break;
      }
      if (have.has(`${a.platform}:${p.external_id}`)) continue;
      await ctx.db.insert("creator_portfolio_items", {
        profile_id: a.profileId,
        platform: a.platform,
        source: a.source,
        external_id: p.external_id,
        permalink: p.permalink,
        embed_url: p.embed_url,
        thumbnail_url: p.thumbnail_url,
        caption: p.caption,
        media_type: p.media_type,
        posted_at: p.posted_at,
        views: p.views,
        likes: p.likes,
        comments: p.comments,
        sort_order: order++,
        created_at: Date.now(),
        synced_at: a.source === "connected" ? Date.now() : undefined,
      });
      added++;
    }
    return { added };
  },
});

export const removePortfolioItem = mutation({
  args: { itemId: v.id("creator_portfolio_items") },
  handler: async (ctx, { itemId }) => {
    const me = await requireAuthedProfile(ctx);
    const item = await ctx.db.get(itemId);
    if (!item || item.profile_id !== String(me._id)) throw new ConvexError("Not found.");
    await ctx.db.delete(itemId);
  },
});

export const reorderPortfolio = mutation({
  args: { orderedIds: v.array(v.id("creator_portfolio_items")) },
  handler: async (ctx, { orderedIds }) => {
    const me = await requireAuthedProfile(ctx);
    for (let i = 0; i < orderedIds.length; i++) {
      const item = await ctx.db.get(orderedIds[i]);
      if (item && item.profile_id === String(me._id)) await ctx.db.patch(item._id, { sort_order: i });
    }
  },
});

// ─── Cron ─────────────────────────────────────────────────────────────────────

export const listConnectionsToSync = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("creator_social_connections").collect();
    return rows
      .filter((c) => !c.needs_reconnect)
      .map((c) => ({ profileId: c.profile_id, platform: c.platform }));
  },
});

export const syncAll = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!isEnabled() && !process.env.YOUTUBE_API_KEY) return;
    const list: Array<{ profileId: string; platform: Platform }> = await ctx.runQuery(
      internal.creatorSocial.listConnectionsToSync,
      {}
    );
    for (const c of list) {
      if (c.platform !== "youtube" && !isEnabled()) continue;
      try {
        await ctx.runAction(internal.creatorSocial.syncConnection, c);
      } catch (e) {
        console.error("creatorSocial.syncAll item failed", c, e);
      }
    }
  },
});
