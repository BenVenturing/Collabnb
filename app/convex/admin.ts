import { v } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";

// ─── Analytics ────────────────────────────────────────────────────────────────
export const getAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const [profiles, listings, collabs, pitchCounts] = await Promise.all([
      ctx.db.query("profiles").collect(),
      ctx.db.query("listings").collect(),
      ctx.db.query("collaborations").collect(),
      ctx.db.query("pitch_counts").collect(),
    ]);

    // ── User stats ──────────────────────────────────────────────────────────
    const creators = profiles.filter((p) => p.role === "creator");
    const hosts    = profiles.filter((p) => p.role === "host");
    const verified = profiles.filter((p) => p.is_verified === true);
    const pending  = profiles.filter((p) => p.is_verified !== true && p.is_rejected !== true);

    const founderCreators = creators.filter((p) => p.is_founder === true).length;
    const founderHosts    = hosts.filter((p) => p.is_founder === true).length;

    // ── Monthly signups — last 6 months ────────────────────────────────────
    const monthlySignups = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const yr  = d.getFullYear();
      const mo  = d.getMonth();
      const count = profiles.filter((p) => {
        const pd = new Date(p._creationTime);
        return pd.getFullYear() === yr && pd.getMonth() === mo;
      }).length;
      monthlySignups.push({
        label: d.toLocaleDateString("en-US", { month: "short" }),
        value: count,
      });
    }

    // ── Collab stats ────────────────────────────────────────────────────────
    const approvedCollabs  = collabs.filter((c) =>
      c.status === "approved" || c.current_stage === "approved"
    ).length;
    const completedCollabs = collabs.filter((c) =>
      c.status === "completed" || c.current_stage === "completed"
    ).length;
    const totalPitches = pitchCounts.reduce((s, pc) => s + pc.count, 0);

    // ── Top 5 listings by collab count ─────────────────────────────────────
    const collobByListing: Record<string, number> = {};
    collabs.forEach((c) => {
      if (c.listing_id) collobByListing[c.listing_id] = (collobByListing[c.listing_id] || 0) + 1;
    });
    const topListings = listings
      .map((l) => ({ label: l.title, value: collobByListing[l._id as string] || 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // ── Top 5 creators by pitch volume ─────────────────────────────────────
    const pitchByUser: Record<string, number> = {};
    pitchCounts.forEach((pc) => {
      pitchByUser[pc.user_id] = (pitchByUser[pc.user_id] || 0) + pc.count;
    });
    const topCreators = Object.entries(pitchByUser)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([userId, count]) => {
        const p = profiles.find((pr) => (pr._id as string) === userId);
        return { label: p?.username || p?.full_name || userId.slice(0, 8), value: count };
      });

    return {
      totalUsers: profiles.length,
      creators: creators.length,
      hosts: hosts.length,
      verified: verified.length,
      pending: pending.length,
      founderCreators,
      founderHosts,
      monthlySignups,
      totalListings: listings.length,
      publishedListings: listings.filter((l) => !l.status || l.status === "published").length,
      totalCollabs: collabs.length,
      approvedCollabs,
      completedCollabs,
      totalPitches,
      topListings,
      topCreators,
    };
  },
});

// ─── Settings ─────────────────────────────────────────────────────────────────
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("admin_settings").collect();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },
});

export const setSetting = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("admin_settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      await ctx.db.insert("admin_settings", { key: args.key, value: args.value });
    }
  },
});

export const getMaintenanceMode = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("admin_settings")
      .withIndex("by_key", (q) => q.eq("key", "maintenance_mode"))
      .first();
    return row?.value === "true";
  },
});

// ─── Founder Counts (live from Convex, replaces localStorage) ────────────────
export const getFounderCounts = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    const founders = profiles.filter((p) => p.is_founder === true);
    return {
      creator: founders.filter((p) => p.role === "creator").length,
      host: founders.filter((p) => p.role === "host").length,
    };
  },
});

// ─── Founder Tracker ──────────────────────────────────────────────────────────
export const getFounders = query({
  args: {},
  handler: async (ctx) => {
    const [profiles, collabs] = await Promise.all([
      ctx.db.query("profiles").collect(),
      ctx.db.query("collaborations").collect(),
    ]);

    const founders = profiles.filter((p) => p.is_founder === true);

    return founders.map((p) => {
      const pId = p._id as string;
      const myCollabs   = collabs.filter((c) => c.creator_id === pId);
      const completed   = myCollabs.filter(
        (c) => c.status === "completed" || c.current_stage === "completed"
      );
      const goneLive = p.first_collab_completed === true || completed.length > 0;
      return {
        _id: p._id,
        full_name: p.full_name,
        username: p.username,
        email: p.email,
        role: p.role,
        city: p.city,
        region: p.region,
        is_verified: p.is_verified || false,
        collabCount: myCollabs.length,
        completedCount: completed.length,
        goneLive,
        _creationTime: p._creationTime,
      };
    });
  },
});

// ─── Broadcast email list ─────────────────────────────────────────────────────
export const getEmailList = query({
  args: { audience: v.string() },
  handler: async (ctx, { audience }) => {
    const profiles = await ctx.db.query("profiles").collect();

    let pool = profiles.filter((p) => p.is_verified === true);
    if (audience === "creators") pool = pool.filter((p) => p.role === "creator");
    else if (audience === "hosts")    pool = pool.filter((p) => p.role === "host");
    else if (audience === "founders") pool = pool.filter((p) => p.is_founder === true);

    return pool
      .filter((p) => !!p.email)
      .map((p) => ({ email: p.email as string, full_name: p.full_name, role: p.role }));
  },
});

// ─── Pitch & Engagement Analytics ─────────────────────────────────────────────
export const getPitchAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const [pitchCounts, profiles] = await Promise.all([
      ctx.db.query("pitch_counts").collect(),
      ctx.db.query("profiles").collect(),
    ]);

    const thisMonth = new Date().toISOString().slice(0, 7);
    const thisMonthPitches = pitchCounts.filter((pc) => pc.month_key === thisMonth);
    const totalThisMonth = thisMonthPitches.reduce((s, pc) => s + pc.count, 0);
    const activeCreators = thisMonthPitches.length;

    // Creators at or near limit
    const atLimit = thisMonthPitches.filter((pc) => pc.count >= 10);
    const nearLimit = thisMonthPitches.filter((pc) => pc.count >= 7 && pc.count < 10);

    const creatorLookup = Object.fromEntries(profiles.map((p) => [String(p._id), p]));

    // Monthly pitch trend — last 6 months
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const mk = d.toISOString().slice(0, 7);
      const count = pitchCounts.filter((pc) => pc.month_key === mk).reduce((s, pc) => s + pc.count, 0);
      monthlyTrend.push({
        label: d.toLocaleDateString("en-US", { month: "short" }),
        value: count,
      });
    }

    // Top 10 creators by pitch volume this month
    const topPitchers = thisMonthPitches
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((pc) => {
        const p = creatorLookup[pc.user_id];
        return {
          userId: pc.user_id,
          name: p?.full_name || p?.username || pc.user_id.slice(0, 8),
          count: pc.count,
        };
      });

    return {
      totalThisMonth,
      activeCreators,
      atLimit: atLimit.map((pc) => ({
        userId: pc.user_id,
        name: creatorLookup[pc.user_id]?.full_name || pc.user_id.slice(0, 8),
        count: pc.count,
      })),
      nearLimit: nearLimit.map((pc) => ({
        userId: pc.user_id,
        name: creatorLookup[pc.user_id]?.full_name || pc.user_id.slice(0, 8),
        count: pc.count,
      })),
      monthlyTrend,
      topPitchers,
    };
  },
});

// ─── Geographic Distribution ──────────────────────────────────────────────────
export const getGeographicDistribution = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();

    const countries: Record<string, number> = {};
    const cities: Record<string, { count: number; country: string }> = {};
    const countryRoles: Record<string, { creators: number; hosts: number }> = {};

    profiles.forEach((p) => {
      if (p.country) {
        countries[p.country] = (countries[p.country] || 0) + 1;
        if (!countryRoles[p.country]) countryRoles[p.country] = { creators: 0, hosts: 0 };
        if (p.role === "creator") countryRoles[p.country].creators++;
        else if (p.role === "host") countryRoles[p.country].hosts++;
      }
      if (p.city) {
        const key = p.country ? `${p.city}, ${p.country}` : p.city;
        if (!cities[key]) cities[key] = { count: 0, country: p.country || "Unknown" };
        cities[key].count++;
      }
    });

    return {
      totalCountries: Object.keys(countries).length,
      totalCities: Object.keys(cities).length,
      topCountries: Object.entries(countries)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([country, count]) => ({
          country,
          count,
          creators: countryRoles[country]?.creators || 0,
          hosts: countryRoles[country]?.hosts || 0,
        })),
      topCities: Object.entries(cities)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 10)
        .map(([city, data]) => ({ city, count: data.count })),
    };
  },
});

// ─── Admin Listings ───────────────────────────────────────────────────────────
export const getAdminListings = query({
  args: {},
  handler: async (ctx) => {
    const [listings, collabs] = await Promise.all([
      ctx.db.query("listings").collect(),
      ctx.db.query("collaborations").collect(),
    ]);

    const collabCounts: Record<string, number> = {};
    collabs.forEach((c) => {
      if (c.listing_id) collabCounts[c.listing_id] = (collabCounts[c.listing_id] || 0) + 1;
    });

    return listings
      .map((l) => ({
        _id: l._id,
        _creationTime: l._creationTime,
        title: l.title,
        subtitle: l.subtitle,
        location: l.location,
        location_city: l.location_city,
        location_country: l.location_country,
        property_type: l.property_type,
        host_name: l.host_name,
        host_id: l.host_id,
        is_featured: l.is_featured ?? false,
        status: l.status || "draft",
        compensation_type: l.compensation_type,
        cash_amount: l.cash_amount,
        collab_type: l.collab_type,
        creator_tier: l.creator_tier,
        collaboratorCount: collabCounts[l._id as string] || 0,
        image: l.image,
        rating: l.rating,
        review_count: l.review_count,
      }))
      .sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0));
  },
});

// ─── Toggle listing featured status ───────────────────────────────────────────
export const toggleFeatured = mutation({
  args: { listingId: v.id("listings"), featured: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.listingId, { is_featured: args.featured });
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// Funnel Analytics
// ═══════════════════════════════════════════════════════════════════════════
export const getFunnelAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const [profiles, collabs] = await Promise.all([
      ctx.db.query("profiles").collect(),
      ctx.db.query("collaborations").collect(),
    ]);

    const total = profiles.length;
    const verified = profiles.filter((p) => p.is_verified === true);
    const waitlist = profiles.filter((p) => p.tier === "waitlist");
    const waitlistWithAcc = waitlist.filter((p) => p.clerk_registered === true);
    const activated = verified.filter((p) => p.first_collab_completed === true);

    let totalDaysToVerify = 0;
    let verifyCount = 0;
    verified.forEach((p) => {
      const userCollabs = collabs.filter((c) => c.creator_id === String(p._id));
      if (userCollabs.length > 0 && p._creationTime) {
        const first = userCollabs.sort((a, b) => (a._creationTime ?? 0) - (b._creationTime ?? 0))[0];
        if (first._creationTime) {
          totalDaysToVerify += (first._creationTime - p._creationTime) / (1000 * 60 * 60 * 24);
          verifyCount++;
        }
      }
    });

    return {
      totalUsers: total,
      waitlistSignups: waitlist.length,
      waitlistWithAccount: waitlistWithAcc.length,
      verifiedCount: verified.length,
      activatedCount: activated.length,
      conversionToVerified: total > 0 ? Math.round((verified.length / total) * 100) : 0,
      conversionToActivated: verified.length > 0 ? Math.round((activated.length / verified.length) * 100) : 0,
      avgDaysToVerify: verifyCount > 0 ? Math.round(totalDaysToVerify / verifyCount) : null,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// Referral Analytics
// ═══════════════════════════════════════════════════════════════════════════
export const getReferralAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const [profiles, refCodes, refUses] = await Promise.all([
      ctx.db.query("profiles").collect(),
      ctx.db.query("referral_codes").collect(),
      ctx.db.query("referral_uses").collect(),
    ]);

    const profileLookup = Object.fromEntries(profiles.map((p) => [String(p._id), p]));
    const usageByOwner: Record<string, number> = {};
    refCodes.forEach((rc) => {
      const uses = refUses.filter((ru) => ru.code === rc.code).length;
      usageByOwner[rc.owner_id] = (usageByOwner[rc.owner_id] || 0) + uses;
    });

    return {
      totalCodes: refCodes.length,
      totalReferrals: refUses.length,
      totalFreeMonthsGiven: refUses.filter((ru) => ru.signup_bonus_awarded).length,
      collabBonusesGiven: refUses.filter((ru) => ru.collab_bonus_awarded).length,
      uniqueReferrers: Object.keys(usageByOwner).length,
      topReferrers: Object.entries(usageByOwner)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([ownerId, count]) => ({
          name: profileLookup[ownerId]?.full_name || ownerId.slice(0, 8),
          count,
        })),
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// Admin Audit Log
// ═══════════════════════════════════════════════════════════════════════════
export const getAuditLog = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("admin_audit_log").order("desc").take(100);
  },
});

export const addAuditEntry = mutation({
  args: { action: v.string(), targetType: v.string(), targetId: v.string(), details: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.insert("admin_audit_log", {
      action: args.action,
      target_type: args.targetType,
      target_id: args.targetId,
      details: args.details || "",
      created_at: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// Broadcast History
// ═══════════════════════════════════════════════════════════════════════════
export const saveBroadcast = mutation({
  args: { audience: v.string(), subject: v.string(), recipientCount: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.insert("broadcasts", {
      audience: args.audience,
      subject: args.subject,
      recipient_count: args.recipientCount,
      sent_at: Date.now(),
    });
  },
});

export const getBroadcasts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("broadcasts").order("desc").take(50);
  },
});

export const saveBroadcastInternal = internalMutation({
  args: { audience: v.string(), subject: v.string(), recipientCount: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.insert("broadcasts", {
      audience: args.audience,
      subject: args.subject,
      recipient_count: args.recipientCount,
      sent_at: Date.now(),
    });
  },
});

// ─── Broadcast via Resend ─────────────────────────────────────────────────────
export const broadcastSend = action({
  args: { audience: v.string(), subject: v.string(), body: v.string() },
  handler: async (ctx, { audience, subject, body }) => {
    const recipients: { email: string; full_name: string; role: string }[] =
      await ctx.runQuery(api.admin.getEmailList, { audience });
    if (!recipients.length) return { sent: 0 };

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not configured in Convex environment.");

    const FROM = "Collabnb <hello@collabnb.com>";
    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F7F5F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E8E4DF;">
        <tr><td style="background:linear-gradient(135deg,#192524,#2d4a3e);padding:28px 40px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Collabnb</div>
        </td></tr>
        <tr><td style="padding:36px 40px;font-size:15px;color:#3C5759;line-height:1.7;">
          ${body.replace(/\n/g, "<br>")}
        </td></tr>
        <tr><td style="padding:20px 40px;background:#F7F5F2;border-top:1px solid #E8E4DF;text-align:center;font-size:12px;color:#959D90;">
          © 2026 Collabnb · <a href="https://collabnb.com" style="color:#2dd4bf;text-decoration:none;">collabnb.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    let sent = 0;
    for (const r of recipients) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from: FROM, to: [r.email], subject, html: htmlBody, text: body }),
        });
        if (res.ok) sent++;
      } catch {}
    }

    await ctx.runMutation(internal.admin.saveBroadcastInternal, {
      audience,
      subject,
      recipientCount: sent,
    });

    return { sent };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// Search All Profiles (for admin search/export)
// ═══════════════════════════════════════════════════════════════════════════
export const searchAllProfiles = query({
  args: { query: v.string(), role: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    let profiles = await ctx.db.query("profiles").collect();
    const q = args.query.toLowerCase();
    profiles = profiles.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.username?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q)
    );
    if (args.role && args.role !== "all") {
      profiles = profiles.filter((p) => p.role === args.role);
    }
    return profiles.slice(0, args.limit || 50).map((p) => ({
      _id: p._id,
      full_name: p.full_name,
      email: p.email,
      username: p.username,
      role: p.role,
      tier: p.tier,
      is_verified: p.is_verified,
      city: p.city,
      _creationTime: p._creationTime,
    }));
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// Bulk Verification
// ═══════════════════════════════════════════════════════════════════════════
export const bulkApproveProfiles = mutation({
  args: { profileIds: v.array(v.id("profiles")), isFounder: v.boolean() },
  handler: async (ctx, args) => {
    for (const profileId of args.profileIds) {
      const profile = await ctx.db.get(profileId);
      if (!profile) continue;
      const patch: Record<string, any> = { is_verified: true, is_founder: args.isFounder };
      if (profile.referred_by && !profile.first_collab_completed) {
        patch.referral_bonus_pending = true;
      }
      await ctx.db.patch(profileId, patch);
      if (profile.email) {
        await ctx.scheduler.runAfter(0, internal.emails.sendAccessGrantedEmail, {
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
        });
      }
    }
  },
});

export const bulkRejectProfiles = mutation({
  args: { profileIds: v.array(v.id("profiles")), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    for (const profileId of args.profileIds) {
      const profile = await ctx.db.get(profileId);
      if (!profile) continue;
      await ctx.db.patch(profileId, { is_rejected: true, rejection_reason: args.reason });
      if (profile.email) {
        await ctx.scheduler.runAfter(0, internal.emails.sendRejectionEmail, {
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
        });
      }
    }
  },
});

export const getAllCollabs = query({
  args: {},
  handler: async (ctx) => {
    const collabs = await ctx.db.query("collaborations").collect();
    return collabs.sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0));
  },
});
