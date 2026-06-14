import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contracts").collect();
  },
});

export const getByOwner = query({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contracts")
      .withIndex("by_owner", (q) => q.eq("owner_id", args.ownerId))
      .collect();
  },
});

export const save = mutation({
  args: {
    ownerId: v.optional(v.string()),
    creatorName: v.string(),
    hostName: v.string(),
    propertyName: v.optional(v.string()),
    location: v.optional(v.string()),
    dates: v.optional(v.string()),
    deliverables: v.optional(v.string()),
    currency: v.optional(v.string()),
    payment: v.optional(v.string()),
    usageRights: v.optional(v.string()),
    status: v.string(),
    creatorSigned: v.optional(v.boolean()),
    hostSigned: v.optional(v.boolean()),
    summaryNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("contracts", {
      owner_id: args.ownerId,
      creator_name: args.creatorName,
      host_name: args.hostName,
      property_name: args.propertyName,
      location: args.location,
      dates: args.dates,
      deliverables: args.deliverables,
      currency: args.currency,
      payment: args.payment,
      usage_rights: args.usageRights,
      status: args.status,
      creator_signed: args.creatorSigned,
      host_signed: args.hostSigned,
      summary_note: args.summaryNote,
    });
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    updates: v.object({
      creator_name: v.optional(v.string()),
      host_name: v.optional(v.string()),
      property_name: v.optional(v.string()),
      location: v.optional(v.string()),
      dates: v.optional(v.string()),
      deliverables: v.optional(v.string()),
      currency: v.optional(v.string()),
      payment: v.optional(v.string()),
      usage_rights: v.optional(v.string()),
      status: v.optional(v.string()),
      creator_signed: v.optional(v.boolean()),
      host_signed: v.optional(v.boolean()),
      summary_note: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const cleanUpdates = Object.fromEntries(
      Object.entries(args.updates).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(args.id as any, cleanUpdates);
  },
});

export const recordPayment = mutation({
  args: {
    id: v.string(),
    paid: v.boolean(),
    paymentAmount: v.number(),
    stripeSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id as any, {
      paid: args.paid,
      payment_amount: args.paymentAmount,
      stripe_session_id: args.stripeSessionId,
    });
  },
});

export const markSent = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id as any, { sent_at: Date.now() });
  },
});
