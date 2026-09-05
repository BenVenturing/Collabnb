import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { requireAdmin, canAccessAdmin } from "./lib/auth";
import { cleanPlainText } from "./lib/sanitize";
import { enforceRateLimit, RATE_LIMITS } from "./lib/rateLimit";

// ─── Country Ambassador program (beta) ────────────────────────────────────────
// One exclusive partner per country. On approval they get a unique link
// (?amb=<slug>) tying that country + their name together. Anyone (host or
// creator — "hotels and such") who signs up through that link is tagged with
// ambassador_ref = slug for the life of their account; the ambassador then
// earns share_pct of the platform fee on every completed contract they're
// party to. The rate is set per-link by admin, not auto-tiered.

const DEFAULT_SHARE_PCT = 20;
const CLAWBACK_DAYS = 30;

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
    return rows
      .filter((r: any) => r.status === "taken")
      .map((r: any) => ({
        country: r.country,
        ambassador_first_name: r.ambassador_name ? String(r.ambassador_name).split(" ")[0] : null,
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
    if (existing.some((a) => a.country === country && a.status === "pending")) {
      throw new Error("You already have a pending application for this country.");
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
// Attribution is by signup link, not geography: the host is checked first
// (an Ambassador's core pitch is bringing hotels on), falling back to the
// creator. Silent no-op when neither side signed up through a live link.
export async function recordEarningForContract(ctx: MutationCtx, contract: any, feeAmount: number) {
  if (!feeAmount || feeAmount <= 0) return;
  const contractId = String(contract._id);

  const dupe = await ctx.db
    .query("ambassador_earnings")
    .withIndex("by_contract", (q) => q.eq("contract_id", contractId))
    .first();
  if (dupe) return;

  let ref: string | undefined;
  if (contract.host_id) {
    const host = await ctx.db.get(contract.host_id as any).catch(() => null);
    ref = (host as any)?.ambassador_ref;
  }
  if (!ref && contract.creator_id) {
    const creator = await ctx.db.get(contract.creator_id as any).catch(() => null);
    ref = (creator as any)?.ambassador_ref;
  }
  if (!ref) return;

  const link = await ctx.db
    .query("ambassador_countries")
    .withIndex("by_slug", (q) => q.eq("slug", ref!))
    .unique();
  if (!link || link.status !== "taken") return;

  const amount = Math.round(feeAmount * link.share_pct) / 100;

  await ctx.db.insert("ambassador_earnings", {
    ambassador_slug: link.slug,
    country: link.country,
    ambassador_name: link.ambassador_name,
    ambassador_email: link.ambassador_email,
    contract_id: contractId,
    property_name: contract.property_name || contract.location,
    fee_amount: feeAmount,
    share_pct: link.share_pct,
    amount,
    status: "pending",
    clawback_until: Date.now() + CLAWBACK_DAYS * 24 * 60 * 60 * 1000,
    created_at: Date.now(),
  });
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

export const adminReviewApplication = mutation({
  args: {
    id: v.id("ambassador_applications"),
    decision: v.union(v.literal("approved"), v.literal("declined")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const app = await ctx.db.get(args.id);
    if (!app) throw new Error("Application not found");

    if (args.decision === "approved") {
      const existingForCountry = await ctx.db
        .query("ambassador_countries")
        .withIndex("by_country", (q) => q.eq("country", app.country))
        .collect();
      if (existingForCountry.some((r) => r.status === "taken")) {
        throw new Error(`${app.country} already has an active ambassador — deactivate them first.`);
      }
    }

    await ctx.db.patch(args.id, {
      status: args.decision,
      admin_note: args.note,
      reviewed_at: Date.now(),
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
    return countries
      .sort((a: any, b: any) => a.country.localeCompare(b.country))
      .map((c: any) => {
        const rows = earnings.filter((e: any) => e.ambassador_slug === c.slug);
        const sum = (f: (e: any) => boolean) => rows.filter(f).reduce((t: number, e: any) => t + e.amount, 0);
        return {
          ...c,
          stats: {
            collabs: rows.filter((e: any) => e.status !== "reversed").length,
            pending: sum((e: any) => e.status === "pending" && e.clawback_until > now),
            payable: sum((e: any) => e.status === "pending" && e.clawback_until <= now),
            paid: sum((e: any) => e.status === "paid"),
          },
        };
      });
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
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.share_pct < 0 || args.share_pct > 100) throw new Error("Share % must be between 0 and 100.");
    const existing = await ctx.db
      .query("ambassador_countries")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, args);
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
