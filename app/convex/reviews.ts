import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireOwnerOrAdmin } from "./lib/auth";
import { cleanPlainText } from "./lib/sanitize";

// Mutual ratings collected while closing out a collaboration. One review per
// party per collab; the first submission also triggers the Trustpilot invite.

export const submit = mutation({
  args: {
    collabId: v.string(),
    contractId: v.optional(v.string()),
    reviewerRole: v.string(), // 'creator' | 'host'
    rating: v.number(),
    comment: v.optional(v.string()),
    reviewerId: v.optional(v.string()),
    reviewerName: v.optional(v.string()),
    revieweeName: v.optional(v.string()),
    propertyName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.reviewerId) await requireOwnerOrAdmin(ctx, args.reviewerId);
    if (args.reviewerRole !== "creator" && args.reviewerRole !== "host") {
      throw new Error("reviewerRole must be 'creator' or 'host'");
    }
    const rating = Math.round(args.rating);
    if (rating < 1 || rating > 5) throw new Error("rating must be 1–5");

    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_collab", (q) => q.eq("collab_id", args.collabId))
      .collect();
    const mine = existing.find((r) => r.reviewer_role === args.reviewerRole);

    const fields = {
      contract_id: args.contractId,
      reviewer_id: args.reviewerId,
      reviewer_name: args.reviewerName ? cleanPlainText(args.reviewerName, 150) : args.reviewerName,
      reviewee_name: args.revieweeName ? cleanPlainText(args.revieweeName, 150) : args.revieweeName,
      property_name: args.propertyName ? cleanPlainText(args.propertyName, 150) : args.propertyName,
      rating,
      comment: args.comment !== undefined ? cleanPlainText(args.comment, 2000) : args.comment,
    };

    if (mine) {
      await ctx.db.patch(mine._id, fields);
      return { updated: true };
    }

    await ctx.db.insert("reviews", {
      collab_id: args.collabId,
      reviewer_role: args.reviewerRole,
      created_at: Date.now(),
      ...fields,
    });

    // First submission → Trustpilot review invite to the reviewer.
    if (args.reviewerId) {
      const profile = await ctx.db.get(args.reviewerId as any);
      if ((profile as any)?.email) {
        await ctx.scheduler.runAfter(0, internal.emails.sendReviewRequestEmail, {
          email: (profile as any).email,
          full_name: (profile as any).full_name || args.reviewerName || "there",
          propertyLabel: args.propertyName || "your collaboration",
        });
      }
    }
    return { created: true };
  },
});

export const getForListing = query({
  args: { listingId: v.string() },
  handler: async (ctx, { listingId }) => {
    const collabs = await ctx.db
      .query("collaborations")
      .filter((q) => q.eq(q.field("listing_id"), listingId))
      .collect();
    if (collabs.length === 0) return [];

    const reviews = [];
    for (const c of collabs) {
      const rows = await ctx.db
        .query("reviews")
        .withIndex("by_collab", (q) => q.eq("collab_id", String(c._id)))
        .collect();
      for (const r of rows) {
        if (r.reviewer_role !== "creator" || !r.comment) continue;
        reviews.push({
          rating: r.rating,
          comment: r.comment,
          reviewer_name: r.reviewer_name,
          created_at: r.created_at,
        });
      }
    }
    return reviews.sort((a, b) => b.created_at - a.created_at);
  },
});

export const getForCollab = query({
  args: { collabId: v.string() },
  handler: async (ctx, { collabId }) => {
    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_collab", (q) => q.eq("collab_id", collabId))
      .collect();
    return rows.map((r) => ({
      reviewer_role: r.reviewer_role,
      rating: r.rating,
      comment: r.comment,
      reviewer_name: r.reviewer_name,
      created_at: r.created_at,
    }));
  },
});
