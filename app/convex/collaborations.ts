import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireOwnerOrAdmin, requireAuthedProfile, canAccessOwner, getAuthedProfile } from "./lib/auth";

export const getByCreator = query({
  args: { creatorId: v.string() },
  handler: async (ctx, args) => {
    if (!(await canAccessOwner(ctx, args.creatorId))) return [];
    return await ctx.db
      .query("collaborations")
      .withIndex("by_creator", (q) => q.eq("creator_id", args.creatorId))
      .collect();
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    if (!(await getAuthedProfile(ctx))) return null;
    return await ctx.db
      .query("collaborations")
      .filter((q) => q.eq(q.field("_id"), args.id))
      .first();
  },
});

export const create = mutation({
  args: {
    listingId: v.string(),
    propertyName: v.optional(v.string()),
    location: v.optional(v.string()),
    hostName: v.optional(v.string()),
    image: v.optional(v.string()),
    creatorId: v.optional(v.string()),
    deliverables: v.optional(v.string()),
    listingDescription: v.optional(v.string()),
    pitchMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.creatorId) await requireOwnerOrAdmin(ctx, args.creatorId);
    const now = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const stages: Record<string, any> = {
      pending: { completed: true, date: now, note: "Application sent" },
      accepted: { completed: false, date: null, note: "" },
      updated: { completed: false, date: null, note: "" },
      uploaded_tagged: { completed: false, date: null, note: "" },
      closed: { completed: false, date: null, note: "" },
      archived: { completed: false, date: null, note: "" },
    };

    const collabId = await ctx.db.insert("collaborations", {
      listing_id: args.listingId,
      property_name: args.propertyName,
      location: args.location,
      host_name: args.hostName,
      image: args.image,
      status: "pending",
      status_text: "Application Sent",
      deliverables: args.deliverables,
      days_left: 30,
      is_active: true,
      current_stage: "pending",
      stages: JSON.stringify(stages),
      creator_id: args.creatorId,
      listing_description: args.listingDescription,
    });

    return collabId;
  },
});

export const markCompleted = mutation({
  args: {
    // Optional: the local collab layer (CollabContext) doesn't always hold the
    // Convex collab _id, so completion can be recorded by creatorId alone.
    id: v.optional(v.string()),
    creatorId: v.optional(v.string()),
    // Optional linked contract — schedules the host platform-fee charge on completion.
    contractId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.creatorId) await requireOwnerOrAdmin(ctx, args.creatorId);
    if (args.id) {
      await ctx.db.patch(args.id as any, {
        status: 'completed',
        status_text: 'Completed',
        is_active: false,
      });
    }

    // ── Fee record creation at completion ──────────────────────────────────
    // If a contract is linked, compute the fee and create a fee_record.
    // Founding hosts get a $0 waived entry; non-founding hosts get charged.
    let contract = null;
    if (args.contractId) {
      contract = await ctx.db.query("contracts").filter((q) => q.eq(q.field("_id"), args.contractId!)).first();
    }

    if (args.contractId && contract) {
      const cashValue = parseFloat(String(contract.payment ?? '').replace(/[^0-9.]/g, '')) || 0;

      // Check if host is a founding member
      let isFoundingHost = false;
      if (contract.host_id) {
        const host = await ctx.db.get(contract.host_id as any);
        isFoundingHost = host?.is_founder === true || host?.is_lifetime === true;
      }

      await ctx.runMutation(internal.fees.recordCompletionFee, {
        collaborationId: args.id as any,  // already checked above
        contractId: args.contractId,
        cashValue,
        isFoundingHost,
      });

      // Legacy path: queue the off-session charge for non-founding hosts with saved cards
      if (!isFoundingHost) {
        await ctx.scheduler.runAfter(0, internal.stripe.chargeContractFee, {
          contractId: args.contractId,
        });
      }
    }

    if (!args.creatorId) return;

    const profile = await ctx.db.get(args.creatorId as any);
    if (!profile) return;

    if (!profile.first_collab_completed) {
      await ctx.db.patch(profile._id, { first_collab_completed: true, referral_bonus_pending: false });

      // Award first-collab referral bonus if this creator was referred
      const uses = await ctx.db
        .query("referral_uses")
        .withIndex("by_user", (q) => q.eq("used_by_id", String(profile._id)))
        .collect();
      const use = uses.find((u) => !u.collab_bonus_awarded);
      if (use) {
        await ctx.db.patch(profile._id, {
          free_months_balance: (profile.free_months_balance || 0) + 1,
        });
        const referrer = await ctx.db.get(use.referrer_id as any);
        if (referrer) {
          await ctx.db.patch(referrer._id, {
            free_months_balance: (referrer.free_months_balance || 0) + 1,
          });
        }
        await ctx.db.patch(use._id, { collab_bonus_awarded: true });
      }
    }
  },
});

export const advanceStage = mutation({
  args: {
    id: v.string(),
    nextStage: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthedProfile(ctx);
    const collab = await ctx.db
      .query("collaborations")
      .filter((q) => q.eq(q.field("_id"), args.id))
      .first();
    if (!collab) return;

    const now = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const stages = collab.stages ? JSON.parse(collab.stages) : {};
    stages[args.nextStage] = {
      ...(stages[args.nextStage] || {}),
      completed: true,
      date: now,
    };

    await ctx.db.patch(collab._id, {
      current_stage: args.nextStage,
      stages: JSON.stringify(stages),
    });
  },
});

// One-time seed: create one sample collaboration per sample listing so the admin
// Collaboration Oversight is populated with clearly-labelled demo data. Idempotent —
// wipes existing is_sample collaborations first. Attributed to fake sample creator
// ids so they never surface in any real creator's Collabs page.
const SAMPLE_COLLAB_PLAN: Record<
  string,
  { status: string; stage: string; creator: string; dates: string; active: boolean }
> = {
  "Glacier Prime Cabin":         { status: "pending",   stage: "pending",         creator: "Maya Chen",   dates: "Feb 15–18, 2026", active: true },
  "Tranquil Waterfront Retreat": { status: "active",    stage: "accepted",        creator: "Sam Rivera",  dates: "Jan 28–31, 2026", active: true },
  "Mountain Lodge Escape":       { status: "active",    stage: "uploaded_tagged", creator: "Priya Nair",  dates: "Jan 10–13, 2026", active: true },
  "Vineyard Wine Estate":        { status: "approved",  stage: "approved",        creator: "Lena Park",   dates: "Mar 5–9, 2026",   active: true },
  "Lakeside Forest Treehouse":   { status: "completed", stage: "completed",       creator: "Marcus Webb", dates: "Apr 2–5, 2026",   active: false },
  "Desert Dome Glamping":        { status: "closed",    stage: "archived",        creator: "Nina Okafor", dates: "Dec 1–3, 2025",   active: false },
};

// One-time cleanup: remove leftover non-sample collaborations (old test rows that
// reference now-deleted listings). Leaves the seeded is_sample collaborations intact.
export const deleteNonSampleCollaborations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("collaborations").collect();
    let deleted = 0;
    for (const c of all) {
      if (!(c as any).is_sample) {
        await ctx.db.delete(c._id);
        deleted++;
      }
    }
    return { deleted };
  },
});

export const seedSampleCollaborations = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Idempotency — clear existing sample collaborations
    const existing = await ctx.db.query("collaborations").collect();
    for (const c of existing) {
      if ((c as any).is_sample) await ctx.db.delete(c._id);
    }

    const profiles = await ctx.db.query("profiles").collect();
    const ben = profiles.find(
      (p: any) => (p.email || "").toLowerCase() === "benventuring@gmail.com"
    );
    const benName = ben?.full_name || "Ben Venturing";

    const listings = await ctx.db.query("listings").collect();
    const samples = listings.filter((l: any) => l.is_sample === true);

    let created = 0;
    for (const l of samples) {
      const plan = SAMPLE_COLLAB_PLAN[l.title];
      if (!plan) continue;
      await ctx.db.insert("collaborations", {
        listing_id: String(l._id),
        property_name: l.title,
        location: l.location,
        host_name: benName,
        image: l.image,
        status: plan.status,
        status_text: plan.status,
        dates: plan.dates,
        deliverables: l.deliverables,
        is_active: plan.active,
        current_stage: plan.stage,
        creator_id: `sample-creator-${created + 1}`,
        creator_name: plan.creator,
        is_sample: true,
      });
      created++;
    }

    return { created };
  },
});
