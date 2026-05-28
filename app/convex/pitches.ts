import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const checkAndIncrement = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const monthKey = currentMonthKey();
    const existing = await ctx.db
      .query("pitch_counts")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .first();

    if (!existing) {
      await ctx.db.insert("pitch_counts", { user_id: userId, month_key: monthKey, count: 1 });
      return { allowed: true, count: 1 };
    }

    if (existing.month_key !== monthKey) {
      await ctx.db.patch(existing._id, { month_key: monthKey, count: 1 });
      return { allowed: true, count: 1 };
    }

    if (existing.count >= 10) {
      return { allowed: false, count: existing.count };
    }

    const count = existing.count + 1;
    await ctx.db.patch(existing._id, { count });
    return { allowed: true, count };
  },
});

export const getCount = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const monthKey = currentMonthKey();
    const existing = await ctx.db
      .query("pitch_counts")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .first();

    if (!existing || existing.month_key !== monthKey) return 0;
    return existing.count;
  },
});
