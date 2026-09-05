import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin, requireOwnerOrAdmin, canAccessAdmin, canAccessOwner } from "./lib/auth";

// ─── Shared Constants ───────────────────────────────────────────────────────────
export const FOLLOWER_THRESHOLDS = {
  UGC_BEGINNER_MIN: 0,     // UGC Beginner tier spans 0–5K followers
  UGC_PRO_MIN: 5000,       // UGC Pro tier spans 5K–10K followers
  MICRO_INFLUENCER_MIN: 10000,  // Micro Influencer tier spans 10K–50K followers
  INFLUENCER_MIN: 50000,  // Influencer tier is 50K+ followers
} as const;

export const CREATOR_TRACKS = ["ugc", "influencer"] as const;
export const CREATOR_TIERS = ["UGC Beginner", "UGC Pro", "Micro Influencer", "Influencer"] as const;

export const ACCESS_STATES = ["pending", "trial", "active", "limited"] as const;
export const TRIAL_DURATION_DAYS = 30;
// A referred signup (profile.referred_by set) gets this longer trial instead
// of the standard one — see referrals.applyReferralCode.
export const REFERRED_TRIAL_DURATION_DAYS = 45;
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
    if (!(await canAccessAdmin(ctx))) return [];
    const profiles = await ctx.db.query("profiles").collect();
    return profiles
      .filter((p) => (p.is_verified !== true || p.pending_role) && p.is_rejected !== true)
      .map((p) => ({
        ...p,
        _id: String(p._id),
        _creationTime: p._creationTime,
        // role switchers surface under the role they're applying for
        role: p.pending_role ?? p.role,
        is_role_switch: !!p.pending_role,
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
    if (!(await canAccessAdmin(ctx))) return [];
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
    await requireAdmin(ctx);
    const profile = await ctx.db.get(args.profileId);
    if (!profile || (profile.role !== "creator" && profile.pending_role !== "creator")) return;
    const isRoleSwitch = profile.pending_role === "creator";

    const totalFollowers =
      (profile.metrics_instagram_followers ?? 0) +
      (profile.metrics_tiktok_followers ?? 0) +
      (profile.metrics_youtube_subscribers ?? 0);

    if (args.track === "ugc" && totalFollowers < FOLLOWER_THRESHOLDS.UGC_BEGINNER_MIN) {
      throw new Error(
        `UGC applicants need at least ${FOLLOWER_THRESHOLDS.UGC_BEGINNER_MIN.toLocaleString()} combined followers (this profile has ${totalFollowers.toLocaleString()}).`
      );
    }

    // Count existing founders of same role. Two concurrent approvals both read
    // this count before either patches, but Convex's OCC serializes conflicting
    // mutations on overlapping read/write sets (the "profiles" table here) and
    // retries the loser — so the cap can't be oversold by a race, without needing
    // a separate atomic counter document.
    const allProfiles = await ctx.db.query("profiles").collect();
    const existingFounders = allProfiles.filter(
      (p) => p.is_founder === true && p.role === "creator"
    ).length;
    const isFounder = existingFounders < FOUNDER_CAP_PER_ROLE;

    let tier = args.tier;
    if (!tier) {
      tier = determineCreatorTier(totalFollowers, args.track);
    }

    const now = Date.now();
    const trialDays = profile.referred_by ? REFERRED_TRIAL_DURATION_DAYS : TRIAL_DURATION_DAYS;
    const patch: Record<string, any> = {
      is_verified: true,
      creator_verified: true,
      creator_track: args.track,
      tier,
      is_founder: isFounder,
      is_rejected: undefined,
      rejection_reason: undefined,
      access_state: isFounder ? "active" : "trial",
      trial_starts_at: isFounder ? undefined : now,
      trial_ends_at: isFounder ? undefined : now + trialDays * 24 * 60 * 60 * 1000,
      admin_verification_note: args.adminNote,
    };
    // Approving a role switch is what actually flips the role
    if (isRoleSwitch) {
      patch.role = "creator";
      patch.pending_role = undefined;
      patch.role_switch_requested_at = undefined;
      patch.role_switch_email = undefined;
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
    await requireAdmin(ctx);
    const profile = await ctx.db.get(args.profileId);
    if (!profile || (profile.role !== "host" && profile.pending_role !== "host")) return;
    const isRoleSwitch = profile.pending_role === "host";

    // Race-safe via Convex OCC — see approveCreator above.
    const allProfiles = await ctx.db.query("profiles").collect();
    const existingFounders = allProfiles.filter(
      (p) => p.is_founder === true && p.role === "host"
    ).length;
    const isFounder = existingFounders < FOUNDER_CAP_PER_ROLE;

    const now = Date.now();
    const patch: Record<string, any> = {
      is_verified: true,
      host_verified: true,
      is_founder: isFounder,
      access_state: "active",
      admin_verification_note: args.adminNote,
      is_rejected: undefined,
      rejection_reason: undefined,
    };
    // Approving a role switch is what actually flips the role
    if (isRoleSwitch) {
      patch.role = "host";
      patch.pending_role = undefined;
      patch.role_switch_requested_at = undefined;
      patch.role_switch_email = undefined;
    }
    await ctx.db.patch(args.profileId, patch);

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
    await requireAdmin(ctx);
    const existing = await ctx.db.get(args.profileId);
    // Rejecting a role-switch request only cancels the request — the account
    // keeps its current role and access untouched
    if (existing?.pending_role && existing.is_verified === true) {
      await ctx.db.patch(args.profileId, {
        pending_role: undefined,
        role_switch_requested_at: undefined,
        role_switch_email: undefined,
      });
      await ctx.db.insert("admin_audit_log", {
        action: "reject_role_switch",
        target_type: "profile",
        target_id: String(args.profileId),
        details: args.reason || "No reason given",
        created_at: Date.now(),
      });
      return;
    }
    await ctx.db.patch(args.profileId, {
      is_rejected: true,
      rejection_reason: args.reason,
      access_state: undefined,
      pending_role: undefined,
      role_switch_requested_at: undefined,
      role_switch_email: undefined,
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

// ─── Admin: Nudge an email-only signup to finish creating their account ─────────
export const nudgeFinishSignup = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    await requireAdmin(ctx);
    const profile = await ctx.db.get(profileId);
    if (!profile) return { ok: false, reason: "not_found" };
    if (!profile.email) return { ok: false, reason: "no_email" };

    await ctx.scheduler.runAfter(0, internal.emails.sendFinishSignupEmail, {
      email: profile.email,
      full_name: profile.full_name,
    });

    await ctx.db.insert("admin_audit_log", {
      action: "finish_signup_nudge",
      target_type: "profile",
      target_id: String(profileId),
      details: profile.full_name,
      created_at: Date.now(),
    });

    return { ok: true };
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
    await requireAdmin(ctx);
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
    await requireAdmin(ctx);
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
    if (!(await canAccessOwner(ctx, profileId))) return { state: "pending", canAccess: false };
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
    if (!(await canAccessOwner(ctx, profileId))) return { allowed: false, state: "pending" };
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

// ─── Internal: remind creators whose trial ends within 3 days (called by cron) ──
export const remindExpiringTrials = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const soon = now + 3 * 24 * 60 * 60 * 1000;
    const profiles = await ctx.db.query("profiles").collect();
    const ending = profiles.filter(
      (p) =>
        p.role === "creator" &&
        p.access_state === "trial" &&
        p.trial_ends_at &&
        p.trial_ends_at > now &&
        p.trial_ends_at <= soon &&
        p.trial_reminder_sent !== true &&
        p.is_founder !== true &&
        p.is_admin !== true
    );
    for (const p of ending) {
      await ctx.db.patch(p._id, { trial_reminder_sent: true });
      if (p.email) {
        const daysLeft = Math.max(1, Math.ceil((p.trial_ends_at! - now) / (24 * 60 * 60 * 1000)));
        await ctx.scheduler.runAfter(0, internal.emails.sendTrialEndingEmail, {
          email: p.email,
          full_name: p.full_name,
          daysLeft,
        });
      }
    }
    return { reminded: ending.length };
  },
});

// ─── Internal test utility: backdate a profile's trial to simulate expiry ──────
export const forceTrialExpiry = internalMutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const day = 24 * 60 * 60 * 1000;
    await ctx.db.patch(profileId, {
      access_state: "limited",
      trial_starts_at: Date.now() - (TRIAL_DURATION_DAYS + 1) * day,
      trial_ends_at: Date.now() - day,
    });
    return await ctx.db.get(profileId);
  },
});
