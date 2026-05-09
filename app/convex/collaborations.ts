import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getByCreator = query({
  args: { creatorId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("collaborations")
      .withIndex("by_creator", (q) => q.eq("creator_id", args.creatorId))
      .collect();
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
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

export const advanceStage = mutation({
  args: {
    id: v.string(),
    nextStage: v.string(),
  },
  handler: async (ctx, args) => {
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
