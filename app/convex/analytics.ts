import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, canAccessAdmin } from "./lib/auth";

// ─── Ingestion ──────────────────────────────────────────────────────────────
// Called only from the /track HTTP action (see http.ts). One call carries a
// batch of events for a single session plus first-touch metadata. Rolls the
// batch up onto the session row so the admin dashboard reads mostly pre-
// aggregated data rather than scanning every raw event.

const SIGNUP_HINTS = ["join", "login", "sign up", "signup", "sign-up", "get started", "getstarted", "apply"];
const looksLikeSignup = (s?: string) =>
  !!s && SIGNUP_HINTS.some((h) => s.toLowerCase().includes(h));

export const ingest = internalMutation({
  args: {
    sessionId: v.string(),
    surface: v.optional(v.string()),
    userId: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    meta: v.optional(
      v.object({
        landingPage: v.optional(v.string()),
        referrer: v.optional(v.string()),
        source: v.optional(v.string()),
        device: v.optional(v.string()),
        utmSource: v.optional(v.string()),
        utmMedium: v.optional(v.string()),
        utmCampaign: v.optional(v.string()),
        utmTerm: v.optional(v.string()),
        utmContent: v.optional(v.string()),
      })
    ),
    events: v.array(
      v.object({
        type: v.string(),
        path: v.optional(v.string()),
        target: v.optional(v.string()),
        ts: v.number(),
        dwellMs: v.optional(v.number()),
        scrollPct: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, { sessionId, surface, userId, userEmail, meta, events }) => {
    if (!sessionId || events.length === 0) return;

    const now = Date.now();

    // Roll the batch up into deltas.
    let pv = 0;
    let clicks = 0;
    let lastPath: string | undefined;
    let lastTs = 0;
    let firstClick: string | undefined;
    let clickedSignup = false;
    let maxScroll = 0;
    for (const e of events) {
      if (e.ts > lastTs) { lastTs = e.ts; if (e.path) lastPath = e.path; }
      if (e.type === "pageview") pv++;
      if (e.type === "click") {
        clicks++;
        if (!firstClick && e.target) firstClick = e.target;
        if (looksLikeSignup(e.target) || looksLikeSignup(e.path)) clickedSignup = true;
      }
      if (typeof e.scrollPct === "number") maxScroll = Math.max(maxScroll, e.scrollPct);
    }

    const existing = await ctx.db
      .query("analyticsSessions")
      .withIndex("by_session", (q) => q.eq("session_id", sessionId))
      .unique();

    if (!existing) {
      await ctx.db.insert("analyticsSessions", {
        session_id: sessionId,
        first_seen: now,
        last_seen: now,
        surface,
        landing_page: meta?.landingPage ?? lastPath,
        last_path: lastPath,
        referrer: meta?.referrer,
        source: meta?.source,
        utm_source: meta?.utmSource,
        utm_medium: meta?.utmMedium,
        utm_campaign: meta?.utmCampaign,
        utm_term: meta?.utmTerm,
        utm_content: meta?.utmContent,
        device: meta?.device,
        user_id: userId,
        user_email: userEmail,
        first_click: firstClick,
        clicked_signup: clickedSignup,
        pageviews: pv,
        clicks,
        max_scroll: maxScroll,
        duration_ms: 0,
      });
    } else {
      await ctx.db.patch(existing._id, {
        last_seen: now,
        surface: surface ?? existing.surface,
        last_path: lastPath ?? existing.last_path,
        // First-touch fields only fill if empty.
        referrer: existing.referrer ?? meta?.referrer,
        source: existing.source ?? meta?.source,
        utm_source: existing.utm_source ?? meta?.utmSource,
        utm_medium: existing.utm_medium ?? meta?.utmMedium,
        utm_campaign: existing.utm_campaign ?? meta?.utmCampaign,
        utm_term: existing.utm_term ?? meta?.utmTerm,
        utm_content: existing.utm_content ?? meta?.utmContent,
        device: existing.device ?? meta?.device,
        user_id: userId ?? existing.user_id,
        user_email: userEmail ?? existing.user_email,
        first_click: existing.first_click ?? firstClick,
        clicked_signup: existing.clicked_signup || clickedSignup,
        pageviews: (existing.pageviews ?? 0) + pv,
        clicks: (existing.clicks ?? 0) + clicks,
        max_scroll: Math.max(existing.max_scroll ?? 0, maxScroll),
        duration_ms: Math.max(0, now - existing.first_seen),
      });
    }

    for (const e of events) {
      await ctx.db.insert("analyticsEvents", {
        session_id: sessionId,
        type: e.type,
        path: e.path,
        target: e.target,
        ts: e.ts,
        dwell_ms: e.dwellMs,
        scroll_pct: e.scrollPct,
        surface,
        user_id: userId,
      });
    }
  },
});

// ─── Admin dashboard query ────────────────────────────────────────────────────
// Aggregates the last N days. Session-level metrics come from the rolled-up
// session rows (cheap); page/click/dwell breakdowns scan a bounded slice of
// recent events.

function topN(map: Map<string, number>, n: number) {
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

export const getMarketingAnalytics = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    if (!(await canAccessAdmin(ctx))) return {};
    const window = days ?? 30;
    const cutoff = Date.now() - window * 24 * 60 * 60 * 1000;

    const sessions = await ctx.db
      .query("analyticsSessions")
      .withIndex("by_first_seen", (q) => q.gte("first_seen", cutoff))
      .collect();

    const totalSessions = sessions.length;
    let totalPageviews = 0;
    let totalDuration = 0;
    let bounces = 0; // single-pageview sessions
    const sources = new Map<string, number>();
    const campaigns = new Map<string, number>();
    const devices = new Map<string, number>();
    const landings = new Map<string, number>();
    const exits = new Map<string, number>();
    const firstClicks = new Map<string, number>();
    const referrers = new Map<string, number>();
    const scrollBuckets = new Map<string, number>(); // for marketing landing depth

    // Funnel
    let clickedSignup = 0;
    const signedUpUsers = new Set<string>();
    const verifiedUsers = new Set<string>();

    for (const s of sessions) {
      totalPageviews += s.pageviews ?? 0;
      totalDuration += s.duration_ms ?? 0;
      if ((s.pageviews ?? 0) <= 1) bounces++;
      const bump = (m: Map<string, number>, k?: string) => k && m.set(k, (m.get(k) ?? 0) + 1);
      bump(sources, s.source || "direct");
      bump(campaigns, s.utm_campaign);
      bump(devices, s.device || "unknown");
      bump(landings, s.landing_page);
      bump(exits, s.last_path);
      bump(firstClicks, s.first_click);
      if (s.referrer) bump(referrers, s.referrer);

      if (typeof s.max_scroll === "number" && s.surface === "marketing") {
        const b = s.max_scroll >= 90 ? "90–100%" : s.max_scroll >= 75 ? "75–90%"
          : s.max_scroll >= 50 ? "50–75%" : s.max_scroll >= 25 ? "25–50%" : "0–25%";
        scrollBuckets.set(b, (scrollBuckets.get(b) ?? 0) + 1);
      }

      if (s.clicked_signup) clickedSignup++;
      if (s.user_id) {
        signedUpUsers.add(s.user_id);
        const id = ctx.db.normalizeId("profiles", s.user_id);
        if (id) {
          const p = await ctx.db.get(id);
          if (p && (p as any).is_verified) verifiedUsers.add(s.user_id);
        }
      }
    }

    // Bounded scan of recent events for page/click/dwell breakdowns.
    const recentEvents = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_ts", (q) => q.gte("ts", cutoff))
      .order("desc")
      .take(8000);

    const pageViews = new Map<string, number>();
    const clickTargets = new Map<string, number>();
    const dwellSum = new Map<string, number>();
    const dwellCount = new Map<string, number>();
    for (const e of recentEvents) {
      if (e.type === "pageview" && e.path) pageViews.set(e.path, (pageViews.get(e.path) ?? 0) + 1);
      if (e.type === "click" && e.target) clickTargets.set(e.target, (clickTargets.get(e.target) ?? 0) + 1);
      if (typeof e.dwell_ms === "number" && e.path && e.dwell_ms > 0) {
        dwellSum.set(e.path, (dwellSum.get(e.path) ?? 0) + e.dwell_ms);
        dwellCount.set(e.path, (dwellCount.get(e.path) ?? 0) + 1);
      }
    }
    const avgDwell = [...dwellSum.entries()]
      .map(([label, sum]) => ({ label, value: Math.round(sum / (dwellCount.get(label) || 1) / 1000) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return {
      windowDays: window,
      totalSessions,
      totalPageviews,
      avgPagesPerSession: totalSessions ? +(totalPageviews / totalSessions).toFixed(1) : 0,
      avgDurationSec: totalSessions ? Math.round(totalDuration / totalSessions / 1000) : 0,
      bounceRate: totalSessions ? Math.round((bounces / totalSessions) * 100) : 0,
      sources: topN(sources, 8),
      campaigns: topN(campaigns, 8),
      devices: topN(devices, 5),
      referrers: topN(referrers, 8),
      topLandingPages: topN(landings, 8),
      topExitPages: topN(exits, 8),
      topPages: topN(pageViews, 10),
      firstClicks: topN(firstClicks, 8),
      topClicks: topN(clickTargets, 10),
      avgDwell,
      scrollDepth: ["0–25%", "25–50%", "50–75%", "75–90%", "90–100%"]
        .map((label) => ({ label, value: scrollBuckets.get(label) ?? 0 })),
      funnel: {
        visitors: totalSessions,
        clickedSignup,
        signedUp: signedUpUsers.size,
        verified: verifiedUsers.size,
      },
    };
  },
});
