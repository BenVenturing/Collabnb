import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { requireAdmin, canAccessAdmin } from "./lib/auth";
import { cleanPlainText } from "./lib/sanitize";
import { enforceRateLimit, RATE_LIMITS } from "./lib/rateLimit";

// ─── Ambassador program (beta) ────────────────────────────────────────────────
// Regional partners ("Collabnb Ambassadors") earn a share of the platform fee
// on collabs completed inside their region. Regions are seeded from
// DEFAULT_REGIONS and overridden by ambassador_regions rows (matched by slug).

const TIER1_PCT = 25;
const TIER2_PCT = 50;
const TIER2_THRESHOLD = 5;           // completed collabs/month to unlock tier 2
const CLAWBACK_DAYS = 30;

export const DEFAULT_REGIONS = [
  {
    slug: "southeast-asia",
    name: "Southeast Asia",
    countries: ["Thailand", "Vietnam", "Indonesia", "Philippines", "Malaysia", "Singapore", "Cambodia"],
    status: "open",
  },
  {
    slug: "southern-europe",
    name: "Southern Europe",
    countries: ["Portugal", "Spain", "Italy", "Greece"],
    status: "open",
  },
  {
    slug: "western-europe",
    name: "Western Europe",
    countries: ["France", "Germany", "Netherlands", "Austria", "Switzerland", "United Kingdom"],
    status: "open",
  },
];

async function mergedRegions(ctx: { db: any }) {
  const rows = await ctx.db.query("ambassador_regions").collect();
  const bySlug = new Map<string, any>(rows.map((r: any) => [r.slug, r]));
  const merged = DEFAULT_REGIONS.map((d) => ({ ...d, ...(bySlug.get(d.slug) || {}) }));
  for (const r of rows) {
    if (!DEFAULT_REGIONS.some((d) => d.slug === r.slug)) merged.push(r);
  }
  return merged;
}

// Public: regions for the marketing page map + application form.
export const listRegions = query({
  args: {},
  handler: async (ctx) => {
    const regions = await mergedRegions(ctx);
    return regions.map((r: any) => ({
      slug: r.slug,
      name: r.name,
      countries: r.countries,
      status: r.status,
      ambassador_first_name: r.ambassador_name ? String(r.ambassador_name).split(" ")[0] : null,
      tier1_pct: r.tier1_pct ?? TIER1_PCT,
      tier2_pct: r.tier2_pct ?? TIER2_PCT,
      tier2_threshold: r.tier2_threshold ?? TIER2_THRESHOLD,
    }));
  },
});

// Public: submit an ambassador application from the marketing page.
export const apply = mutation({
  args: {
    region_slug: v.string(),
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
    if (args.content_plan.trim().length < 20) throw new Error("Tell us a bit more about how you'd promote Collabnb in your region.");

    const regions = await mergedRegions(ctx);
    const region = regions.find((r: any) => r.slug === args.region_slug);
    if (!region) throw new Error("Unknown region.");

    const existing = await ctx.db
      .query("ambassador_applications")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    if (existing.some((a) => a.region_slug === args.region_slug && a.status === "pending")) {
      throw new Error("You already have a pending application for this region.");
    }

    await ctx.db.insert("ambassador_applications", {
      region_slug: args.region_slug,
      region_name: region.name,
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
// Resolves the collab's country → region → assigned ambassador, then writes a
// tiered earning row. Silent no-op when no ambassador covers the region.
export async function recordEarningForContract(ctx: MutationCtx, contract: any, feeAmount: number) {
  if (!feeAmount || feeAmount <= 0) return;
  const contractId = String(contract._id);

  const dupe = await ctx.db
    .query("ambassador_earnings")
    .withIndex("by_contract", (q) => q.eq("contract_id", contractId))
    .first();
  if (dupe) return;

  // Country candidates: segments of the contract location, plus the linked
  // collab's listing country when one exists.
  const candidates = new Set<string>();
  for (const seg of String(contract.location || "").split(",")) {
    const s = seg.trim().toLowerCase();
    if (s) candidates.add(s);
  }
  const collab = await ctx.db
    .query("collaborations")
    .filter((q) => q.eq(q.field("contract_id"), contractId))
    .first();
  if (collab?.listing_id) {
    const listing = await ctx.db.get(collab.listing_id as any).catch(() => null);
    const country = (listing as any)?.location_country;
    if (country) candidates.add(String(country).trim().toLowerCase());
  }
  if (candidates.size === 0) return;

  const regions = await mergedRegions(ctx);
  const region = regions.find(
    (r: any) =>
      r.status === "taken" &&
      r.ambassador_email &&
      r.countries.some((c: string) => candidates.has(c.toLowerCase())),
  );
  if (!region) return;

  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const priorThisMonth = await ctx.db
    .query("ambassador_earnings")
    .withIndex("by_region_month", (q) => q.eq("region_slug", region.slug).eq("month_key", monthKey))
    .collect();
  const countable = priorThisMonth.filter((e) => e.status !== "reversed").length;

  const threshold = region.tier2_threshold ?? TIER2_THRESHOLD;
  const sharePct = countable + 1 > threshold ? (region.tier2_pct ?? TIER2_PCT) : (region.tier1_pct ?? TIER1_PCT);
  const amount = Math.round(feeAmount * sharePct) / 100;

  await ctx.db.insert("ambassador_earnings", {
    region_slug: region.slug,
    region_name: region.name,
    ambassador_name: region.ambassador_name,
    ambassador_email: region.ambassador_email,
    contract_id: contractId,
    property_name: contract.property_name || contract.location,
    fee_amount: feeAmount,
    share_pct: sharePct,
    amount,
    status: "pending",
    clawback_until: Date.now() + CLAWBACK_DAYS * 24 * 60 * 60 * 1000,
    month_key: monthKey,
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

    await ctx.db.patch(args.id, {
      status: args.decision,
      admin_note: args.note,
      reviewed_at: Date.now(),
    });

    if (args.decision === "approved") {
      const existing = await ctx.db
        .query("ambassador_regions")
        .withIndex("by_slug", (q) => q.eq("slug", app.region_slug))
        .first();
      const assignment = {
        status: "taken",
        ambassador_name: app.full_name,
        ambassador_email: app.email,
        application_id: String(args.id),
      };
      if (existing) {
        await ctx.db.patch(existing._id, assignment);
      } else {
        const def = DEFAULT_REGIONS.find((d) => d.slug === app.region_slug);
        await ctx.db.insert("ambassador_regions", {
          slug: app.region_slug,
          name: def?.name || app.region_name,
          countries: def?.countries || [],
          ...assignment,
        });
      }
    }

    await ctx.db.insert("admin_audit_log", {
      action: `ambassador_application_${args.decision}`,
      target_type: "ambassador_application",
      target_id: String(args.id),
      details: `${app.full_name} — ${app.region_name}`,
      created_at: Date.now(),
    });
  },
});

export const adminListRegions = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return [];
    const regions = await mergedRegions(ctx);
    const earnings = await ctx.db.query("ambassador_earnings").collect();
    return regions.map((r: any) => {
      const rows = earnings.filter((e) => e.region_slug === r.slug);
      const sum = (f: (e: any) => boolean) => rows.filter(f).reduce((t, e) => t + e.amount, 0);
      const now = Date.now();
      return {
        ...r,
        tier1_pct: r.tier1_pct ?? TIER1_PCT,
        tier2_pct: r.tier2_pct ?? TIER2_PCT,
        tier2_threshold: r.tier2_threshold ?? TIER2_THRESHOLD,
        stats: {
          collabs: rows.filter((e) => e.status !== "reversed").length,
          pending: sum((e) => e.status === "pending" && e.clawback_until > now),
          payable: sum((e) => e.status === "pending" && e.clawback_until <= now),
          paid: sum((e) => e.status === "paid"),
        },
      };
    });
  },
});

export const adminUpsertRegion = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    countries: v.array(v.string()),
    status: v.string(),
    ambassador_name: v.optional(v.string()),
    ambassador_email: v.optional(v.string()),
    tier1_pct: v.optional(v.number()),
    tier2_pct: v.optional(v.number()),
    tier2_threshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("ambassador_regions")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("ambassador_regions", args);
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
