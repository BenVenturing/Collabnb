import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

function makeCode(username: string): string {
  const prefix = username.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 4) || "USER";
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").padEnd(6, "0").slice(0, 6);
  return `${prefix}-${rand}`;
}

export const getMyCode = query({
  args: { profileId: v.string() },
  handler: async (ctx, args) => {
    const codeDoc = await ctx.db
      .query("referral_codes")
      .withIndex("by_owner", (q) => q.eq("owner_id", args.profileId))
      .unique();
    if (!codeDoc) return null;

    const uses = await ctx.db
      .query("referral_uses")
      .withIndex("by_code", (q) => q.eq("code", codeDoc.code))
      .collect();

    return {
      code: codeDoc.code,
      use_count: codeDoc.use_count,
      max_uses: codeDoc.max_uses,
      signups_rewarded: uses.filter((u) => u.signup_bonus_awarded).length,
      collab_bonuses_earned: uses.filter((u) => u.collab_bonus_awarded).length,
    };
  },
});

export const validateCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const codeDoc = await ctx.db
      .query("referral_codes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();
    if (!codeDoc) return { valid: false, reason: "Code not found" };
    if (codeDoc.use_count >= codeDoc.max_uses) return { valid: false, reason: "Code has reached its limit" };
    return { valid: true };
  },
});

export const ensureCode = mutation({
  args: { profileId: v.string(), username: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("referral_codes")
      .withIndex("by_owner", (q) => q.eq("owner_id", args.profileId))
      .unique();
    if (existing) return existing.code;

    let code = "";
    for (let i = 0; i < 10; i++) {
      const candidate = makeCode(args.username);
      const collision = await ctx.db
        .query("referral_codes")
        .withIndex("by_code", (q) => q.eq("code", candidate))
        .unique();
      if (!collision) { code = candidate; break; }
    }
    if (!code) code = makeCode(args.username + Date.now());

    await ctx.db.insert("referral_codes", {
      owner_id: args.profileId,
      code,
      use_count: 0,
      max_uses: 12,
    });
    const profileExists = await ctx.db.get(args.profileId as any);
    if (profileExists) {
      await ctx.db.patch(args.profileId as any, { referral_code: code });
    }
    return code;
  },
});

export const applyReferralCode = mutation({
  args: { code: v.string(), newUserId: v.string() },
  handler: async (ctx, args) => {
    const upperCode = args.code.trim().toUpperCase();

    const codeDoc = await ctx.db
      .query("referral_codes")
      .withIndex("by_code", (q) => q.eq("code", upperCode))
      .unique();
    if (!codeDoc) return { success: false, reason: "Invalid code" };
    if (codeDoc.use_count >= codeDoc.max_uses) return { success: false, reason: "Code limit reached" };
    if (codeDoc.owner_id === args.newUserId) return { success: false, reason: "Cannot use your own code" };

    // Check already used by this user
    const uses = await ctx.db
      .query("referral_uses")
      .withIndex("by_user", (q) => q.eq("used_by_id", args.newUserId))
      .collect();
    if (uses.some((u) => u.code === upperCode)) return { success: false, reason: "Already used" };
    if (uses.length > 0) return { success: false, reason: "Already used a referral code" };

    // Record the use
    await ctx.db.insert("referral_uses", {
      code: upperCode,
      used_by_id: args.newUserId,
      referrer_id: codeDoc.owner_id,
      signup_bonus_awarded: true,
      collab_bonus_awarded: false,
    });

    // Increment use_count
    await ctx.db.patch(codeDoc._id, { use_count: codeDoc.use_count + 1 });

    // Mark new user as referred (guard against deleted profile)
    const newUserCheck = await ctx.db.get(args.newUserId as any);
    if (newUserCheck) {
      await ctx.db.patch(args.newUserId as any, { referred_by: codeDoc.owner_id });
    }

    // +1 free month to referrer
    const referrer = await ctx.db.get(codeDoc.owner_id as any);
    if (referrer) {
      await ctx.db.patch(referrer._id, {
        free_months_balance: (referrer.free_months_balance || 0) + 1,
      });
    }

    // +1 free month to new user
    const newUser = await ctx.db.get(args.newUserId as any);
    if (newUser) {
      await ctx.db.patch(newUser._id, {
        free_months_balance: (newUser.free_months_balance || 0) + 1,
      });
    }

    return { success: true };
  },
});

export const awardFirstCollabBonus = mutation({
  args: { creatorId: v.string() },
  handler: async (ctx, args) => {
    const uses = await ctx.db
      .query("referral_uses")
      .withIndex("by_user", (q) => q.eq("used_by_id", args.creatorId))
      .collect();
    const use = uses.find((u) => !u.collab_bonus_awarded);
    if (!use) return;

    // +1 free month to creator
    const creator = await ctx.db.get(args.creatorId as any);
    if (creator) {
      await ctx.db.patch(creator._id, {
        free_months_balance: (creator.free_months_balance || 0) + 1,
      });
    }

    // +1 free month to referrer
    const referrer = await ctx.db.get(use.referrer_id as any);
    if (referrer) {
      await ctx.db.patch(referrer._id, {
        free_months_balance: (referrer.free_months_balance || 0) + 1,
      });
    }

    await ctx.db.patch(use._id, { collab_bonus_awarded: true });
  },
});
