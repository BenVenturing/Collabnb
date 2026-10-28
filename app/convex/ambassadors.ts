import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { requireAdmin, canAccessAdmin } from "./lib/auth";
import { cleanPlainText } from "./lib/sanitize";
import { enforceRateLimit, RATE_LIMITS } from "./lib/rateLimit";

// ─── Country Ambassador program (beta) ────────────────────────────────────────
// Up to MAX_PER_COUNTRY partners per country, approved after a Zoom call.
// On approval they get a unique link
// (?amb=<slug>) tying that country + their name together. Anyone (host or
// creator — "hotels and such") who signs up through that link is tagged with
// ambassador_ref = slug for the life of their account; the ambassador then
// earns share_pct of the platform fee on every completed contract they're
// party to. The rate is set per-link by admin, not auto-tiered. Each must
// bring in quota_hosts new hosts per rolling quota_days window or the daily
// enforceQuotas cron removes them; admin can also remove anyone manually.

const DEFAULT_SHARE_PCT = 20;
const CLAWBACK_DAYS = 30;
const MAX_PER_COUNTRY = 5;
const DEFAULT_QUOTA_HOSTS = 3;
const DEFAULT_QUOTA_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

async function activeForCountry(ctx: { db: any }, country: string) {
  const rows = await ctx.db
    .query("ambassador_countries")
    .withIndex("by_country", (q: any) => q.eq("country", country))
    .collect();
  return rows.filter((r: any) => r.status === "taken");
}

// Quota-qualifying hosts: signed up through the link AND have at least one
// published, non-sample listing — a bare signup doesn't count. `_creationTime`
// on each returned row is when the host's first qualifying listing went live.
async function hostSignups(ctx: { db: any }, slug: string) {
  const rows = await ctx.db
    .query("profiles")
    .withIndex("by_ambassador_ref", (q: any) => q.eq("ambassador_ref", slug))
    .collect();
  const qualifying = [];
  for (const p of rows.filter((r: any) => r.role === "host")) {
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_host", (q: any) => q.eq("host_id", p._id))
      .collect();
    const live = listings.filter((l: any) => l.status === "published" && !l.is_sample);
    if (live.length === 0) continue;
    qualifying.push({ ...p, _creationTime: Math.min(...live.map((l: any) => l._creationTime)) });
  }
  return qualifying;
}

function quotaStatus(link: any, hosts: any[], now: number) {
  const quotaHosts = link.quota_hosts ?? DEFAULT_QUOTA_HOSTS;
  const quotaDays = link.quota_days ?? DEFAULT_QUOTA_DAYS;
  const start = link.approved_at ?? link._creationTime;
  const inWindow = hosts.filter((p: any) => p._creationTime >= now - quotaDays * DAY_MS).length;
  const graceEndsAt = start + quotaDays * DAY_MS;
  return { quotaHosts, quotaDays, inWindow, total: hosts.length, graceEndsAt, failing: now >= graceEndsAt && inWindow < quotaHosts };
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

async function uniqueSlug(ctx: { db: any }, country: string, fullName: string): Promise<string> {
  const countrySlug = slugify(country) || "country";
  const firstName = fullName.trim().split(/\s+/)[0] || "amb";
  const nameSlug = slugify(firstName) || "amb";
  let slug = `${countrySlug}-${nameSlug}`;
  let suffix = 2;
  while (
    await ctx.db.query("ambassador_countries").withIndex("by_slug", (q: any) => q.eq("slug", slug)).unique()
  ) {
    slug = `${countrySlug}-${nameSlug}-${suffix++}`;
  }
  return slug;
}

// Public: currently-represented countries, for the marketing page.
export const listCountries = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("ambassador_countries").collect();
    const byCountry = new Map<string, string[]>();
    for (const r of rows as any[]) {
      if (r.status !== "taken") continue;
      const names = byCountry.get(r.country) || [];
      names.push(r.ambassador_name ? String(r.ambassador_name).split(" ")[0] : "");
      byCountry.set(r.country, names);
    }
    return [...byCountry.entries()].map(([country, names]) => ({
      country,
      active_count: names.length,
      max: MAX_PER_COUNTRY,
      ambassador_first_names: names.filter(Boolean),
    }));
  },
});

// Public: look up one link by its slug, for the personalized "X invited you
// to join in Y" banner on join.html. Only ever returns display-safe fields
// (no email) and only for a live, active link.
export const getLinkBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("ambassador_countries")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!link || link.status !== "taken") return null;
    return {
      country: link.country,
      ambassador_first_name: link.ambassador_name ? String(link.ambassador_name).split(" ")[0] : null,
    };
  },
});

// Public: submit a Country Ambassador application from the marketing page.
export const apply = mutation({
  args: {
    country: v.string(),
    full_name: v.string(),
    email: v.string(),
    based_in: v.optional(v.string()),
    instagram_handle: v.optional(v.string()),
    tiktok_handle: v.optional(v.string()),
    youtube_handle: v.optional(v.string()),
    audience_size: v.optional(v.string()),
    content_plan: v.string(),
    connections: v.string(),
    extra: v.optional(v.string()),
    agreed_terms: v.boolean(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Please enter a valid email address.");
    await enforceRateLimit(ctx, `ambassador:${email}`, RATE_LIMITS.AMBASSADOR_APPLY);
    if (!args.agreed_terms) throw new Error("You must agree to the Ambassador Terms to apply.");
    if (args.full_name.trim().length < 2) throw new Error("Please enter your name.");
    const country = args.country.trim();
    if (country.length < 2) throw new Error("Please select a country.");
    if (args.content_plan.trim().length < 20) throw new Error("Tell us a bit more about how you'd promote Collabnb in this country.");

    const existing = await ctx.db
      .query("ambassador_applications")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    if (existing.some((a) => a.country === country && (a.status === "pending" || a.status === "interview"))) {
      throw new Error("You already have a pending application for this country.");
    }
    if ((await activeForCountry(ctx, country)).length >= MAX_PER_COUNTRY) {
      throw new Error(`${country} already has ${MAX_PER_COUNTRY} ambassadors — pick another country or check back later.`);
    }

    await ctx.db.insert("ambassador_applications", {
      country,
      full_name: cleanPlainText(args.full_name, 150),
      email,
      based_in: cleanPlainText(args.based_in, 150) || undefined,
      instagram_handle: cleanPlainText(args.instagram_handle, 60) || undefined,
      tiktok_handle: cleanPlainText(args.tiktok_handle, 60) || undefined,
      youtube_handle: cleanPlainText(args.youtube_handle, 60) || undefined,
      audience_size: cleanPlainText(args.audience_size, 100) || undefined,
      content_plan: cleanPlainText(args.content_plan, 3000),
      connections: cleanPlainText(args.connections, 3000),
      extra: cleanPlainText(args.extra, 2000) || undefined,
      agreed_terms: true,
      status: "pending",
      created_at: Date.now(),
    });

    return { success: true };
  },
});

// ─── Earning hook ─────────────────────────────────────────────────────────────
// Called from contracts.recordPaymentInternal after a platform fee lands.
// Attribution is by signup link, not geography. If host and creator signed up
// through the SAME ambassador's link, that ambassador earns their full rate
// once. If they came through two DIFFERENT ambassadors' links, the two rates
// are blended into one commission and split evenly between them — neither
// earns their full individual rate twice on one contract.
async function resolveAmbassadorLink(ctx: MutationCtx, profileId: any) {
  if (!profileId) return null;
  const profile = await ctx.db.get(profileId).catch(() => null);
  const ref = (profile as any)?.ambassador_ref;
  if (!ref) return null;
  const link = await ctx.db
    .query("ambassador_countries")
    .withIndex("by_slug", (q) => q.eq("slug", ref))
    .unique();
  return link && link.status === "taken" ? link : null;
}

export async function recordEarningForContract(ctx: MutationCtx, contract: any, feeAmount: number) {
  if (!feeAmount || feeAmount <= 0) return;
  const contractId = String(contract._id);

  const existing = await ctx.db
    .query("ambassador_earnings")
    .withIndex("by_contract", (q) => q.eq("contract_id", contractId))
    .collect();
  const alreadyRecorded = (slug: string) => existing.some((e) => e.ambassador_slug === slug);

  const insertEarning = async (link: any, sharePct: number) => {
    if (alreadyRecorded(link.slug)) return;
    const amount = Math.round(feeAmount * sharePct) / 100;
    await ctx.db.insert("ambassador_earnings", {
      ambassador_slug: link.slug,
      country: link.country,
      ambassador_name: link.ambassador_name,
      ambassador_email: link.ambassador_email,
      contract_id: contractId,
      property_name: contract.property_name || contract.location,
      fee_amount: feeAmount,
      share_pct: sharePct,
      amount,
      status: "pending",
      clawback_until: Date.now() + CLAWBACK_DAYS * 24 * 60 * 60 * 1000,
      created_at: Date.now(),
    });
  };

  const hostLink = await resolveAmbassadorLink(ctx, contract.host_id);
  const creatorLink = await resolveAmbassadorLink(ctx, contract.creator_id);

  if (hostLink && creatorLink && hostLink.slug !== creatorLink.slug) {
    // Two different ambassadors — one blended commission, split evenly.
    const blendedPct = (hostLink.share_pct + creatorLink.share_pct) / 2;
    const perAmbassadorPct = blendedPct / 2;
    await insertEarning(hostLink, perAmbassadorPct);
    await insertEarning(creatorLink, perAmbassadorPct);
    return;
  }

  const link = hostLink || creatorLink;
  if (!link) return;
  await insertEarning(link, link.share_pct);
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminListApplications = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return [];
    const apps = await ctx.db.query("ambassador_applications").collect();
    return apps.sort((a, b) => b.created_at - a.created_at);
  },
});

export const pendingApplicationCount = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return 0;
    const count = async (status: string) => (await ctx.db
      .query("ambassador_applications")
      .withIndex("by_status", (q) => q.eq("status", status))
      .collect()).length;
    return (await count("pending")) + (await count("interview"));
  },
});

export const adminReviewApplication = mutation({
  args: {
    id: v.id("ambassador_applications"),
    decision: v.union(v.literal("interview"), v.literal("approved"), v.literal("declined")),
    note: v.optional(v.string()),
    interview_at: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const app = await ctx.db.get(args.id);
    if (!app) throw new Error("Application not found");

    if (args.decision === "approved" && (await activeForCountry(ctx, app.country)).length >= MAX_PER_COUNTRY) {
      throw new Error(`${app.country} already has ${MAX_PER_COUNTRY} active ambassadors — remove one first.`);
    }

    await ctx.db.patch(args.id, {
      status: args.decision,
      admin_note: args.note ?? app.admin_note,
      reviewed_at: Date.now(),
      ...(args.interview_at !== undefined ? { interview_at: args.interview_at } : {}),
    });

    if (args.decision === "approved") {
      const slug = await uniqueSlug(ctx, app.country, app.full_name);
      await ctx.db.insert("ambassador_countries", {
        country: app.country,
        slug,
        status: "taken",
        ambassador_name: app.full_name,
        ambassador_email: app.email,
        application_id: String(args.id),
        share_pct: DEFAULT_SHARE_PCT,
        approved_at: Date.now(),
        quota_hosts: DEFAULT_QUOTA_HOSTS,
        quota_days: DEFAULT_QUOTA_DAYS,
      });
    }

    await ctx.db.insert("admin_audit_log", {
      action: `ambassador_application_${args.decision}`,
      target_type: "ambassador_application",
      target_id: String(args.id),
      details: `${app.full_name} — ${app.country}`,
      created_at: Date.now(),
    });
  },
});

export const adminListCountries = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return [];
    const countries = await ctx.db.query("ambassador_countries").collect();
    const earnings = await ctx.db.query("ambassador_earnings").collect();
    const now = Date.now();
    countries.sort((a: any, b: any) => a.country.localeCompare(b.country));
    const out = [];
    for (const c of countries as any[]) {
      const rows = earnings.filter((e: any) => e.ambassador_slug === c.slug);
      const sum = (f: (e: any) => boolean) => rows.filter(f).reduce((t: number, e: any) => t + e.amount, 0);
      out.push({
        ...c,
        quota: quotaStatus(c, await hostSignups(ctx, c.slug), now),
        stats: {
          collabs: rows.filter((e: any) => e.status !== "reversed").length,
          pending: sum((e: any) => e.status === "pending" && e.clawback_until > now),
          payable: sum((e: any) => e.status === "pending" && e.clawback_until <= now),
          paid: sum((e: any) => e.status === "paid"),
        },
      });
    }
    return out;
  },
});

export const adminUpsertCountry = mutation({
  args: {
    slug: v.string(),
    country: v.string(),
    status: v.string(),
    ambassador_name: v.optional(v.string()),
    ambassador_email: v.optional(v.string()),
    share_pct: v.number(),
    quota_hosts: v.optional(v.number()),
    quota_days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.share_pct < 0 || args.share_pct > 100) throw new Error("Share % must be between 0 and 100.");
    if (args.quota_days !== undefined && args.quota_days < 7) throw new Error("Quota window must be at least 7 days.");
    const existing = await ctx.db
      .query("ambassador_countries")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) {
      const reactivating = args.status === "taken" && existing.status !== "taken";
      if (reactivating && (await activeForCountry(ctx, args.country)).length >= MAX_PER_COUNTRY) {
        throw new Error(`${args.country} already has ${MAX_PER_COUNTRY} active ambassadors.`);
      }
      // Reactivating restarts the quota grace period.
      await ctx.db.patch(existing._id, reactivating
        ? { ...args, approved_at: Date.now(), removed_at: undefined, removed_reason: undefined }
        : args);
    } else {
      await ctx.db.insert("ambassador_countries", args);
    }
  },
});

export const adminListEarnings = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return [];
    const earnings = await ctx.db.query("ambassador_earnings").collect();
    const now = Date.now();
    return earnings
      .sort((a, b) => b.created_at - a.created_at)
      .map((e) => ({
        ...e,
        derived_status: e.status === "pending" && e.clawback_until <= now ? "payable" : e.status,
      }));
  },
});

export const adminMarkEarningsPaid = mutation({
  args: { ids: v.array(v.id("ambassador_earnings")), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let total = 0;
    for (const id of args.ids) {
      const e = await ctx.db.get(id);
      if (!e || e.status !== "pending") continue;
      await ctx.db.patch(id, { status: "paid", paid_at: Date.now(), payout_note: args.note });
      total += e.amount;
    }
    await ctx.db.insert("admin_audit_log", {
      action: "ambassador_payout",
      target_type: "ambassador_earnings",
      target_id: args.ids.map(String).join(","),
      details: `$${total.toFixed(2)}${args.note ? ` — ${args.note}` : ""}`,
      created_at: Date.now(),
    });
    return { total };
  },
});

export const adminReverseEarning = mutation({
  args: { id: v.id("ambassador_earnings") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const e = await ctx.db.get(args.id);
    if (!e || e.status === "paid") throw new Error("Paid earnings can't be reversed — handle manually.");
    await ctx.db.patch(args.id, { status: "reversed" });
  },
});

async function removeLink(ctx: MutationCtx, link: any, reason: string, actor: string) {
  await ctx.db.patch(link._id, { status: "removed", removed_at: Date.now(), removed_reason: reason });
  await ctx.db.insert("admin_audit_log", {
    action: "ambassador_removed",
    target_type: "ambassador_countries",
    target_id: link.slug,
    details: `${link.ambassador_name || link.slug} — ${link.country} — ${actor}: ${reason}`,
    created_at: Date.now(),
  });
}

export const adminRemoveAmbassador = mutation({
  args: { slug: v.string(), reason: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const link = await ctx.db
      .query("ambassador_countries")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!link) throw new Error("Ambassador not found");
    await removeLink(ctx, link, cleanPlainText(args.reason, 500) || "Removed by admin", "admin");
  },
});

// Daily cron: remove active ambassadors who missed their host quota.
export const enforceQuotas = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const links = await ctx.db.query("ambassador_countries").collect();
    for (const link of links) {
      if (link.status !== "taken") continue;
      const q = quotaStatus(link, await hostSignups(ctx, link.slug), now);
      if (q.failing) {
        await removeLink(ctx, link, `Missed quota: ${q.inWindow}/${q.quotaHosts} hosts in the last ${q.quotaDays} days`, "auto");
      }
    }
  },
});
