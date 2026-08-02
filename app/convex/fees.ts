// ═══════════════════════════════════════════════════════════════════════════════
// Fee calculation — one pure, testable function
// ═══════════════════════════════════════════════════════════════════════════════

export interface FeeInput {
  /** Cash-only contract value (e.g., $300 cash from a $300 cash + $400 stay hybrid) */
  cashValue: number;
  /** Whether the host is a Founding Member (fees waived for life) */
  isFoundingHost?: boolean;
}

export interface FeeResult {
  fee: number;
  basis: number;          // the cashValue used for calculation
  method: 'flat' | 'percent' | 'waived';
  contractValue: number;  // same as cashValue
}

/**
 * Pure fee calculation. Single source of truth — change thresholds here and
 * every caller (charges, invoices, billing display) picks them up.
 *
 * Rules:
 * - Founding hosts → $0 waived (no fee ever)
 * - Under $500 cash value → $20 flat fee
 * - $500+ cash value → 5% of cash value (replaces flat fee; never both)
 * - Hybrid collabs: stay value is excluded (cash-only basis)
 *
 * Tests: see fees.test.ts
 */
export function computeFee(input: FeeInput): FeeResult {
  const { cashValue, isFoundingHost } = input;
  const safeCash = Math.max(0, Math.round(cashValue * 100) / 100); // round to cents

  if (isFoundingHost) {
    return { fee: 0, basis: safeCash, method: 'waived', contractValue: safeCash };
  }

  if (safeCash < 500) {
    return { fee: 20, basis: safeCash, method: 'flat', contractValue: safeCash };
  }

  // 5% of cash value
  const fee = Math.round(safeCash * 0.05 * 100) / 100;
  return { fee, basis: safeCash, method: 'percent', contractValue: safeCash };
}

// ─── Fee records table CRUD ─────────────────────────────────────────────────────

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { canAccessOwner } from "./lib/auth";

/**
 * Record a fee in the fee_records table.
 * Called at collab completion: creates the record, and for non-founding hosts,
 * schedules the Stripe charge.
 *
 * Founding hosts get a $0 waived record for their billing ledger.
 */
export const recordCompletionFee = internalMutation({
  args: {
    collaborationId: v.id("collaborations"),
    contractId: v.optional(v.string()),
    cashValue: v.number(),
    isFoundingHost: v.boolean(),
  },
  handler: async (ctx, args) => {
    const result = computeFee({
      cashValue: args.cashValue,
      isFoundingHost: args.isFoundingHost,
    });

    await ctx.db.insert("fee_records", {
      collaboration_id: String(args.collaborationId),
      contract_id: args.contractId ?? null,
      amount: result.fee,
      basis: result.basis,
      method: result.method,
      contract_value: result.contractValue,
      status: args.isFoundingHost ? "waived" : "pending",
      created_at: Date.now(),
    });

    // For non-founding hosts with a saved card, schedule the charge.
    if (!args.isFoundingHost && args.contractId) {
      await ctx.scheduler.runAfter(0, internal.stripe.chargeContractFee, {
        contractId: args.contractId,
      });
    }

    return result;
  },
});

// ─── Get billing records for a host ─────────────────────────────────────────────
// Scoped to the host by joining fee_records → collaborations → listings.host_id.
// (collaborations has no host_id; the only reliable host link is listing_id.)
export const getBilling = query({
  args: { hostId: v.string() },
  handler: async (ctx, { hostId }) => {
    if (!(await canAccessOwner(ctx, hostId))) return [];
    const [listings, collabs, fees] = await Promise.all([
      ctx.db
        .query("listings")
        .withIndex("by_host", (q) => q.eq("host_id", hostId))
        .collect(),
      ctx.db.query("collaborations").collect(),
      ctx.db.query("fee_records").collect(),
    ]);

    const hostListingIds = new Set(listings.map((l) => String(l._id)));
    const hostCollabIds = new Set(
      collabs
        .filter((c) => hostListingIds.has(String(c.listing_id)))
        .map((c) => String(c._id))
    );

    const hostFees = fees.filter((f) => hostCollabIds.has(f.collaboration_id));

    return hostFees
      .map((f) => {
        const collab = collabs.find((c) => String(c._id) === f.collaboration_id);
        return {
          ...f,
          _id: String(f._id),
          collabTitle: collab?.property_name ?? "Unknown stay",
          collabDate: collab?.dates ?? "",
          creatorName: collab?.creator_name ?? collab?.creator_id ?? "",
          collabId: f.collaboration_id,
        };
      })
      .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
  },
});

// ─── Mark a fee as paid (called by chargeContractFee on success) ─────────────────
export const markFeePaid = internalMutation({
  args: {
    collaborationId: v.string(),
    paymentIntentId: v.string(),
    amountPaid: v.number(),
  },
  handler: async (ctx, args) => {
    const feeRecords = await ctx.db.query("fee_records").collect();
    const record = feeRecords.find((r) => r.collaboration_id === args.collaborationId);
    if (!record) return;
    await ctx.db.patch(record._id, {
      status: "paid",
      paid_at: Date.now(),
      payment_intent_id: args.paymentIntentId,
      amount_paid: args.amountPaid,
    });
  },
});

// ─── Mark a fee as failed (called by chargeContractFee on failure) ──────────────
export const markFeeFailed = internalMutation({
  args: { collaborationId: v.string() },
  handler: async (ctx, args) => {
    const feeRecords = await ctx.db.query("fee_records").collect();
    const record = feeRecords.find((r) => r.collaboration_id === args.collaborationId);
    if (!record) return;
    await ctx.db.patch(record._id, { status: "failed" });
  },
});


// ═══════════════════════════════════════════════════════════════════════════════
// Affiliate hook (STUB) — TODO: full referral program
// ═══════════════════════════════════════════════════════════════════════════════
//
// Extension point: when a new subscription payment succeeds, check if the
// subscriber has a non-zero free_months_balance. If they do, consume one
// free month instead of charging Stripe.
//
// Reference: profiles.referral_code uses the initials-plus-random convention
// defined in profiles.ts (e.g., "JANE-A1B2C3"). Free months are incremented
// by the referral system in collaborations.ts and decremented monthly by
// profiles.decrementFreeMonth.
//
// To wire subscription credit:
//   1. In the Stripe webhook (checkout.session.completed with mode=subscription),
//      look up the profile by stripe_customer_id.
//   2. If profile.free_months_balance > 0, skip creating the Stripe subscription
//      charge for the first month and decrement free_months_balance instead.
//   3. Fall through to the normal Stripe charge for subsequent months.
//
// This ensures the referral bonus ("+1 free month per referred friend who
// completes their first collab") is consumed before real payments start.
