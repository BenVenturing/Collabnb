import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const SEED_SUGGESTIONS = [
  "Integrated payment processing between hosts and creators",
  "Collaboration options between creators (creator-to-creator)",
  "Mobile app launch — July 2026",
];

export const getSuggestions = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, { userId }) => {
    const suggestions = await ctx.db.query("suggestions").collect();
    const allVotes = await ctx.db.query("suggestion_votes").collect();

    return suggestions
      .map((s) => {
        const votes = allVotes.filter((v) => v.suggestion_id === s._id);
        const upvotes = votes.filter((v) => v.vote === "up").length;
        const downvotes = votes.filter((v) => v.vote === "down").length;
        const userVote = userId
          ? (votes.find((v) => v.user_id === userId)?.vote ?? null)
          : null;
        return { ...s, upvotes, downvotes, netScore: upvotes - downvotes, userVote };
      })
      .filter((s) => s.status !== "rejected")
      .sort((a, b) => b.upvotes - a.upvotes);
  },
});

export const getAdminSuggestions = query({
  args: {},
  handler: async (ctx) => {
    const suggestions = await ctx.db.query("suggestions").collect();
    const allVotes = await ctx.db.query("suggestion_votes").collect();
    return suggestions
      .map((s) => {
        const votes = allVotes.filter((v) => v.suggestion_id === s._id);
        const upvotes = votes.filter((v) => v.vote === "up").length;
        const downvotes = votes.filter((v) => v.vote === "down").length;
        return { ...s, upvotes, downvotes, netScore: upvotes - downvotes };
      })
      .sort((a, b) => b.upvotes - a.upvotes);
  },
});

export const updateStatus = mutation({
  args: {
    suggestionId: v.id("suggestions"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.suggestionId, { status: args.status });
  },
});

export const seedSuggestions = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("suggestions").first();
    if (existing) return;
    for (const text of SEED_SUGGESTIONS) {
      await ctx.db.insert("suggestions", { text });
    }
  },
});

export const submitSuggestion = mutation({
  args: { text: v.string(), userId: v.optional(v.string()) },
  handler: async (ctx, { text, userId }) => {
    return await ctx.db.insert("suggestions", { text, submitted_by: userId });
  },
});

export const vote = mutation({
  args: {
    suggestionId: v.id("suggestions"),
    userId: v.string(),
    direction: v.literal("up"),
  },
  handler: async (ctx, { suggestionId, userId }) => {
    const existing = await ctx.db
      .query("suggestion_votes")
      .withIndex("by_user_suggestion", (q) =>
        q.eq("user_id", userId).eq("suggestion_id", suggestionId)
      )
      .first();

    if (existing) {
      // Toggle: remove vote if already upvoted
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("suggestion_votes", {
        suggestion_id: suggestionId,
        user_id: userId,
        vote: "up",
      });
    }
  },
});
