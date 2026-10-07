// ─── Stay alerts ──────────────────────────────────────────────────────────────
// Creator-defined saved searches: "when a stay like this goes live, tell me."
// Each alert is a named filter set; matching lives in lib/stayAlertMatch.ts so
// the preview count a creator sees while building an alert and the fan-out when
// a listing publishes can never drift apart.
//
// Delivery, per the product decision:
//   • in-app notification + wallet/Expo push → instantly on publish (spots fill
//     fast, so speed is the whole value)
//   • email → batched into one weekly digest, unless the creator ticked
//     "email me immediately" on that specific alert
// The master kill switch is profiles.notification_prefs.newListings; alerts only
// narrow what gets through it. Individual alerts can also be paused.
import { v, ConvexError } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireOwnerOrAdmin, canAccessOwner } from "./lib/auth";
import { enforceRateLimit, RATE_LIMITS } from "./lib/rateLimit";
import { DELIVERABLE_LABELS, DELIVERABLE_TYPES } from "./lib/compensationPoints";
import { listingMatchesAlert, isAlertableListing, describeAlert } from "./lib/stayAlertMatch";

export const MAX_ALERTS_PER_USER = 5;
// Hard cap on the digest so one quiet week followed by a bulk import doesn't
// produce a 60-listing email. Overflow is surfaced as a count in the UI.
const MAX_DIGEST_LISTINGS = 8;

const filterArgs = {
  name: v.string(),
  countries: v.optional(v.array(v.string())),
  deliverable_types: v.optional(v.array(v.string())),
  min_cash: v.optional(v.number()),
  compensation_types: v.optional(v.array(v.string())),
  min_nights: v.optional(v.number()),
  travel_start: v.optional(v.string()),
  travel_end: v.optional(v.string()),
  instant_email: v.optional(v.boolean()),
};

// ─── Display helpers (shared by notifications + both email templates) ────────

function compLine(l: any): string {
  const cash = typeof l.cash_amount === "number" && l.cash_amount > 0 ? `$${Math.round(l.cash_amount)}` : null;
  const nights = typeof l.nights === "number" && l.nights > 0 ? `${l.nights} ${l.nights === 1 ? "night" : "nights"}` : null;
  if (nights && cash) return `${nights}, stay + ${cash} cash`;
  if (cash) return `${cash} cash`;
  if (nights) return `${nights} stay`;
  return l.compensation || "See listing for compensation";
}

function deliverablesLine(l: any): string {
  const d = l.deliverables;
  if (Array.isArray(d) && d.length > 0) {
    return "You'd deliver: " + d
      .map((i: any) => `${i.quantity}× ${(DELIVERABLE_LABELS as any)[i.type] || i.type}`)
      .join(", ");
  }
  if (typeof d === "string" && d.trim()) return `You'd deliver: ${d}`;
  return "Deliverables listed on the stay page";
}

function datesLine(l: any): string {
  const ranges = Array.isArray(l.date_ranges) ? l.date_ranges : [];
  if (ranges.length > 0) {
    return "Available: " + ranges.map((r: any) => `${r.startDate} → ${r.endDate}`).join(", ");
  }
  if (l.collab_start && l.collab_end) return `Available: ${l.collab_start} → ${l.collab_end}`;
  if (l.dates_available) return `Available: ${l.dates_available}`;
  return "Dates flexible — ask the host";
}

function locationLine(l: any): string {
  return [l.location_city, l.location_country].filter(Boolean).join(", ") || l.location || "";
}

// ─── Creator-facing queries ──────────────────────────────────────────────────

export const listForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    if (!(await canAccessOwner(ctx, userId))) return [];
    return ctx.db
      .query("stay_alerts")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .collect();
  },
});

// Powers the "N live stays match this right now" counter in the alert editor.
// Deliberately read-only and send-free: creating an alert never emails or
// pushes a backfill, it just shows what's already there (and warns, by showing
// 0, when the filters are too narrow to ever fire).
export const previewMatches = query({
  args: {
    countries: v.optional(v.array(v.string())),
    deliverable_types: v.optional(v.array(v.string())),
    min_cash: v.optional(v.number()),
    compensation_types: v.optional(v.array(v.string())),
    min_nights: v.optional(v.number()),
    travel_start: v.optional(v.string()),
    travel_end: v.optional(v.string()),
  },
  handler: async (ctx, filters) => {
    const all = await ctx.db.query("listings").collect();
    const matches = all.filter((l: any) => isAlertableListing(l) && listingMatchesAlert(l, filters));
    return {
      count: matches.length,
      samples: matches.slice(0, 6).map((l: any) => ({
        _id: l._id,
        title: l.title,
        location: locationLine(l),
        image: l.image,
        compLine: compLine(l),
      })),
    };
  },
});

// ─── Creator-facing mutations ────────────────────────────────────────────────

export const save = mutation({
  args: { userId: v.string(), id: v.optional(v.id("stay_alerts")), ...filterArgs },
  handler: async (ctx, { userId, id, ...fields }) => {
    await requireOwnerOrAdmin(ctx, userId);
    await enforceRateLimit(ctx, `stayAlert:${userId}`, RATE_LIMITS.STAY_ALERT_WRITE);

    const name = fields.name.trim().slice(0, 60);
    if (!name) throw new ConvexError("Give your alert a name so you can tell it apart from the others.");
    const bad = (fields.deliverable_types || []).filter((d) => !DELIVERABLE_TYPES.includes(d));
    if (bad.length) throw new ConvexError(`Unknown deliverable type: ${bad.join(", ")}`);
    const badComp = (fields.compensation_types || []).filter((c) => c !== "paid" && c !== "hybrid");
    if (badComp.length) throw new ConvexError(`Unknown compensation type: ${badComp.join(", ")}`);
    if (fields.travel_start && fields.travel_end && fields.travel_start > fields.travel_end) {
      throw new ConvexError("Your travel window ends before it starts.");
    }

    if (id) {
      const existing = await ctx.db.get(id);
      if (!existing) throw new ConvexError("That alert no longer exists.");
      await requireOwnerOrAdmin(ctx, existing.user_id);
      await ctx.db.patch(id, { ...fields, name });
      return id;
    }

    const mine = await ctx.db
      .query("stay_alerts")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .collect();
    if (mine.length >= MAX_ALERTS_PER_USER) {
      throw new ConvexError(`You can have up to ${MAX_ALERTS_PER_USER} stay alerts — edit or delete one to add another.`);
    }
    return ctx.db.insert("stay_alerts", {
      ...fields,
      name,
      user_id: userId,
      paused: false,
      match_count: 0,
      created_at: Date.now(),
    });
  },
});

export const setPaused = mutation({
  args: { id: v.id("stay_alerts"), paused: v.boolean() },
  handler: async (ctx, { id, paused }) => {
    const alert = await ctx.db.get(id);
    if (!alert) return;
    await requireOwnerOrAdmin(ctx, alert.user_id);
    await ctx.db.patch(id, { paused });
  },
});

export const remove = mutation({
  args: { id: v.id("stay_alerts") },
  handler: async (ctx, { id }) => {
    const alert = await ctx.db.get(id);
    if (!alert) return;
    await requireOwnerOrAdmin(ctx, alert.user_id);
    await ctx.db.delete(id);
  },
});

// ─── Fan-out when a listing goes live ────────────────────────────────────────
// Scheduled from listings.create/update the first time a listing reaches
// "published". listings.stay_alerts_notified_at makes this idempotent, so a
// listing pulled back to draft and re-published never re-notifies anyone.
export const notifyForListing = internalMutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const listing: any = await ctx.db.get(listingId);
    if (!listing || !isAlertableListing(listing)) return;
    if (listing.stay_alerts_notified_at) return;
    await ctx.db.patch(listingId, { stay_alerts_notified_at: Date.now() });

    const alerts = await ctx.db.query("stay_alerts").collect();
    const loc = locationLine(listing);
    const comp = compLine(listing);
    const deliv = deliverablesLine(listing);
    const dates = datesLine(listing);

    for (const alert of alerts) {
      if (alert.paused === true) continue;
      if (!listingMatchesAlert(listing, alert)) continue;

      const profile: any = await ctx.db.get(alert.user_id as any);
      if (!profile) continue;
      // The host who published it is never alerted about their own listing.
      if (String(profile._id) === String(listing.host_id)) continue;
      // Master switch. Default-off: newListings starts false in the UI, and the
      // alert editor turns it on when a creator saves their first alert.
      if (profile.notification_prefs?.newListings !== true) continue;

      await ctx.db.patch(alert._id, {
        last_matched_at: Date.now(),
        match_count: (alert.match_count || 0) + 1,
        ...(alert.instant_email === true
          ? {}
          : { pending_listing_ids: [...(alert.pending_listing_ids || []), String(listingId)] }),
      });

      // In-app + wallet + Expo push, instantly — notifications.create fans out
      // to every channel the creator has linked.
      await ctx.scheduler.runAfter(0, internal.notifications.create, {
        userId: String(profile._id),
        type: "stay_alert",
        title: `New stay matches "${alert.name}"`,
        body: `${listing.title} — ${loc} · ${comp}`,
        link: `/listing/${String(listingId)}`,
      });

      if (alert.instant_email === true && profile.email) {
        await ctx.scheduler.runAfter(0, internal.emails.sendStayAlertMatchEmail, {
          email: profile.email,
          fullName: profile.full_name || "",
          alertName: alert.name,
          alertSummary: describeAlert(alert, DELIVERABLE_LABELS as any),
          listingId: String(listingId),
          listingTitle: listing.title,
          listingLocation: loc,
          listingImage: listing.image,
          compLine: comp,
          deliverablesLine: deliv,
          datesLine: dates,
        });
      }
    }
  },
});

// ─── Weekly digest (cron) ────────────────────────────────────────────────────
// One email per creator covering every alert that matched during the week, so
// someone with three alerts gets one email and not three.
export const sendWeeklyDigests = internalMutation({
  args: {},
  handler: async (ctx) => {
    const alerts = await ctx.db.query("stay_alerts").collect();
    const byUser = new Map<string, { alertNames: string[]; listingIds: string[] }>();

    for (const alert of alerts) {
      const pending = alert.pending_listing_ids || [];
      if (pending.length === 0) continue;
      // Always clear, even if the send is skipped below — a creator who turned
      // alerts off shouldn't get last month's backlog when they turn them on.
      await ctx.db.patch(alert._id, { pending_listing_ids: [], last_digest_at: Date.now() });
      if (alert.paused === true) continue;

      const entry = byUser.get(alert.user_id) || { alertNames: [], listingIds: [] };
      entry.alertNames.push(alert.name);
      for (const id of pending) if (!entry.listingIds.includes(id)) entry.listingIds.push(id);
      byUser.set(alert.user_id, entry);
    }

    for (const [userId, entry] of byUser) {
      const profile: any = await ctx.db.get(userId as any);
      if (!profile?.email) continue;
      if (profile.notification_prefs?.newListings !== true) continue;

      const matches: any[] = [];
      for (const id of entry.listingIds.slice(0, MAX_DIGEST_LISTINGS)) {
        const l: any = await ctx.db.get(id as any);
        // Skip anything unpublished or filled since it matched — a dead link in
        // a digest reads as a broken product.
        if (!l || !isAlertableListing(l)) continue;
        matches.push({
          listingId: String(l._id),
          title: l.title,
          location: locationLine(l),
          image: l.image,
          compLine: compLine(l),
          deliverablesLine: deliverablesLine(l),
        });
      }
      if (matches.length === 0) continue;

      await ctx.scheduler.runAfter(0, internal.emails.sendStayAlertDigestEmail, {
        email: profile.email,
        fullName: profile.full_name || "",
        alertNames: entry.alertNames,
        matches,
      });
    }
  },
});
