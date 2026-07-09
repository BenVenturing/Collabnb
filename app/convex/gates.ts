import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── Shared Constants ───────────────────────────────────────────────────────────
export const FOLLOWER_THRESHOLDS = {
  UGC_BEGINNER_MIN: 0,
  UGC_PRO_MIN: 0,     // UGC tracks: portfolio quality, not follower count
  MICRO_INFLUENCER_MIN: 5000,
  INFLUENCER_MIN: 25000,
} as const;

export const CREATOR_TRACKS = ["ugc", "influencer"] as const;
export const CREATOR_TIERS = ["UGC Beginner", "UGC Pro", "Micro Influencer", "Influencer"] as const;

export const ACCESS_STATES = ["pending", "trial", "active", "limited"] as const;
export const TRIAL_DURATION_DAYS = 30;
export const FOUNDER_CAP_PER_ROLE = 100;

// ─── Helpers ────────────────────────────────────────────────────────────────────
function determineCreatorTier(followers: number, track: string): string {
  if (track === "influencer") {
    if (followers >= FOLLOWER_THRESHOLDS.INFLUENCER_MIN) return "Influencer";
    if (followers >= FOLLOWER_THRESHOLDS.MICRO_INFLUENCER_MIN) return "Micro Influencer";
    return "Micro Influencer"; // minimum floor
  }
  // UGC track — default to Beginner, admin upgrades to Pro
  return "UGC Beginner";
}

// ─── Admin: Get verification queue (all unverified) ─────────────────────────────
export const getVerificationQueue = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    return profiles
      .filter((p) => p.is_verified !== true && p.is_rejected !== true)
      .map((p) => ({
        ...p,
        _id: String(p._id),
        _creationTime: p._creationTime,
        // computed access state
        admin_verification_note: p.admin_verification_note,
        interview_requested: p.interview_requested,
      }));
  },
});

// ─── Admin: Get verified profiles ──────────────────────────────────────────────
export const getVerified = query({
  args: { role: v.optional(v.string()) },
  handler: async (ctx, { role }) => {
    const profiles = await ctx.db.query("profiles").collect();
    return profiles
      .filter((p) => p.is_verified === true && (role ? p.role === role : true))
      .map((p) => ({
        _id: String(p._id),
        full_name: p.full_name,
        email: p.email,
        username: p.username,
        role: p.role,
        tier: p.tier,
        track: p.creator_track,
        is_founder: p.is_founder ?? false,
        is_verified: true,
        city: p.city,
        region: p.region,
        access_state: p.access_state,
        _creationTime: p._creationTime,
      }))
      .sort((a, b) => b._creationTime - a._creationTime);
  },
});

// ─── Admin: Approve creator (track-based) ──────────────────────────────────────
export const approveCreator = mutation({
  args: {
    profileId: v.id("profiles"),
    track: v.union(v.literal("ugc"), v.literal("influencer")),
    tier: v.optional(v.string()),
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile || profile.role !== "creator") return;

    // Count existing founders of same role
    const allProfiles = await ctx.db.query("profiles").collect();
    const existingFounders = allProfiles.filter(
      (p) => p.is_founder === true && p.role === "creator"
    ).length;
    const isFounder = existingFounders < FOUNDER_CAP_PER_ROLE;

    let tier = args.tier;
    if (!tier) {
      const totalFollowers =
        (profile.metrics_instagram_followers ?? 0) +
        (profile.metrics_tiktok_followers ?? 0) +
        (profile.metrics_youtube_subscribers ?? 0);
      tier = determineCreatorTier(totalFollowers, args.track);
    }

    const now = Date.now();
    const patch: Record<string, any> = {
      is_verified: true,
      creator_track: args.track,
      tier,
      is_founder: isFounder,
      access_state: isFounder ? "active" : "trial",
      trial_starts_at: isFounder ? undefined : now,
      trial_ends_at: isFounder ? undefined : now + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000,
      admin_verification_note: args.adminNote,
    };

    if (profile.referred_by && !profile.first_collab_completed) {
      patch.referral_bonus_pending = true;
    }

    await ctx.db.patch(args.profileId, patch);

    // Audit log
    await ctx.db.insert("admin_audit_log", {
      action: "approve_creator",
      target_type: "profile",
      target_id: String(args.profileId),
      details: `Track: ${args.track}, Tier: ${tier}, Founder: ${isFounder}`,
      created_at: now,
    });

    // Email notification
    if (profile.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendAccessGrantedEmail, {
        email: profile.email,
        full_name: profile.full_name,
        role: "creator",
      });
    }
  },
});

// ─── Admin: Approve host ────────────────────────────────────────────────────────
export const approveHost = mutation({
  args: {
    profileId: v.id("profiles"),
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile || profile.role !== "host") return;

    const allProfiles = await ctx.db.query("profiles").collect();
    const existingFounders = allProfiles.filter(
      (p) => p.is_founder === true && p.role === "host"
    ).length;
    const isFounder = existingFounders < FOUNDER_CAP_PER_ROLE;

    const now = Date.now();
    await ctx.db.patch(args.profileId, {
      is_verified: true,
      is_founder: isFounder,
      access_state: "active",
      admin_verification_note: args.adminNote,
    });

    await ctx.db.insert("admin_audit_log", {
      action: "approve_host",
      target_type: "profile",
      target_id: String(args.profileId),
      details: `Host verified, Founder: ${isFounder}`,
      created_at: now,
    });

    if (profile.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendAccessGrantedEmail, {
        email: profile.email,
        full_name: profile.full_name,
        role: "host",
      });
    }
  },
});

// ─── Admin: Reject profile ──────────────────────────────────────────────────────
export const rejectProfile = mutation({
  args: {
    profileId: v.id("profiles"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.profileId, {
      is_rejected: true,
      rejection_reason: args.reason,
      access_state: undefined,
    });

    await ctx.db.insert("admin_audit_log", {
      action: "reject_profile",
      target_type: "profile",
      target_id: String(args.profileId),
      details: args.reason || "No reason given",
      created_at: Date.now(),
    });

    const profile = await ctx.db.get(args.profileId);
    if (profile?.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendRejectionEmail, {
        email: profile.email,
        full_name: profile.full_name,
        reason: args.reason,
      });
    }
  },
});

// ─── Admin: Set admin note / request interview ──────────────────────────────────
export const setAdminNote = mutation({
  args: {
    profileId: v.id("profiles"),
    note: v.optional(v.string()),
    requestInterview: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, any> = {};
    if (args.note !== undefined) patch.admin_verification_note = args.note;
    if (args.requestInterview !== undefined) patch.interview_requested = args.requestInterview;
    await ctx.db.patch(args.profileId, patch);
  },
});

// ─── Admin: Bulk approve ────────────────────────────────────────────────────────
export const bulkApprove = mutation({
  args: {
    profileIds: v.array(v.id("profiles")),
    defaultTrack: v.optional(v.union(v.literal("ugc"), v.literal("influencer"))),
    defaultTier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    for (const pid of args.profileIds) {
      const profile = await ctx.db.get(pid);
      if (!profile) continue;
      if (profile.role === "creator") {
        await ctx.runMutation(internal.gates.approveCreator, {
          profileId: pid,
          track: args.defaultTrack ?? "ugc",
          tier: args.defaultTier,
        });
      } else {
        await ctx.runMutation(internal.gates.approveHost, { profileId: pid });
      }
    }
  },
});

// ─── Get logged-in creator's access state ────────────────────────────────────────
export const getMyAccess = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const profile = await ctx.db.get(profileId);
    if (!profile) return { state: "pending", canAccess: false };
    if (profile.is_verified !== true) return { state: "pending", canAccess: false };
    if (profile.is_rejected === true) return { state: "pending", canAccess: false };

    const state = profile.access_state ?? "active";
    const isFounder = profile.is_founder === true;
    const trialEndsAt = profile.trial_ends_at;
    const trialStartsAt = profile.trial_starts_at;
    const daysLeft = trialEndsAt ? Math.ceil((trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24)) : null;

    return {
      state,
      canAccess: state === "active" || state === "trial" || isFounder || profile.is_admin === true,
      isFounder,
      tier: profile.tier,
      track: profile.creator_track,
      trialStartsAt,
      trialEndsAt,
      daysLeft,
      role: profile.role,
      isVerified: true,
      isAdmin: profile.is_admin === true,
      subscriptionStatus: profile.subscription_status,
    };
  },
});

// ─── Check if a user can see a listing ──────────────────────────────────────────
export const canViewListing = query({
  args: { profileId: v.optional(v.id("profiles")) },
  handler: async (ctx, { profileId }) => {
    if (!profileId) return { allowed: false, state: "pending" };
    const profile = await ctx.db.get(profileId);
    if (!profile) return { allowed: false, state: "pending" };
    if (profile.is_admin) return { allowed: true, state: "active" };
    if (profile.is_verified !== true) return { allowed: false, state: "pending" };
    if (profile.role === "host") return { allowed: true, state: "active" };
    if (profile.is_founder) return { allowed: true, state: "active" };
    const state = profile.access_state ?? "active";
    if (state === "trial" || state === "active") return { allowed: true, state };
    return { allowed: false, state: "limited" };
  },
});

// ─── Internal: expire trials (called by cron) ──────────────────────────────────
export const expireTrials = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const profiles = await ctx.db.query("profiles").collect();
    const expired = profiles.filter(
      (p) =>
        p.role === "creator" &&
        p.access_state === "trial" &&
        p.trial_ends_at &&
        p.trial_ends_at <= now &&
        p.is_founder !== true &&
        p.is_admin !== true
    );
    for (const p of expired) {
      await ctx.db.patch(p._id, { access_state: "limited" });
      await ctx.db.insert("notifications", {
        user_id: String(p._id),
        type: "trial_expired",
        title: "Your trial has ended",
        body: "Subscribe to Creator Plus to continue accessing full marketplace features.",
        link: "/#/profile",
        read: false,
        created_at: now,
      });
      if (p.email) {
        await ctx.scheduler.runAfter(0, internal.emails.sendTrialEndedEmail, {
          email: p.email,
          full_name: p.full_name,
        });
      }
    }
    return { expired: expired.length };
  },
});
