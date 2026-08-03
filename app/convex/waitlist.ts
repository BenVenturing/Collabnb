import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin, canAccessAdmin } from "./lib/auth";
import { cleanPlainText, cleanOptionalUrl } from "./lib/sanitize";
import { enforceRateLimit, RATE_LIMITS } from "./lib/rateLimit";

export const signUp = mutation({
  args: {
    full_name: v.string(),
    email: v.string(),
    role: v.string(),
    phone_number: v.optional(v.string()),
    instagram_handle: v.optional(v.string()),
    tiktok_handle: v.optional(v.string()),
    city: v.optional(v.string()),
    region: v.optional(v.string()),
    portfolio: v.optional(v.string()),
    tier: v.optional(v.string()),
    recent_collabs: v.optional(v.string()),
    business_name: v.optional(v.string()),
    property_type: v.optional(v.string()),
    website_url: v.optional(v.string()),
    beta: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { role, email, ...rest } = args;

    // Check if already signed up
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      return { alreadySignedUp: true, profileId: existing._id };
    }

    await enforceRateLimit(ctx, `signup:${email.toLowerCase()}`, RATE_LIMITS.SIGNUP);

    // Create a waitlist profile
    const rawUsername = (args.instagram_handle || args.tiktok_handle || email.split("@")[0] || "user")
      .replace(/[^a-z0-9_]/gi, "")
      .toLowerCase() || "user";
    const profileId = await ctx.db.insert("profiles", {
      full_name: cleanPlainText(rest.full_name, 100),
      username: rawUsername,
      email: email,
      role: role,
      tier: rest.tier || "waitlist",
      bio: "",
      instagram_handle: rest.instagram_handle ? cleanPlainText(rest.instagram_handle, 60) : rest.instagram_handle,
      tiktok_handle: rest.tiktok_handle ? cleanPlainText(rest.tiktok_handle, 60) : rest.tiktok_handle,
      portfolio: rest.portfolio ? cleanOptionalUrl(rest.portfolio, "Portfolio URL") : rest.portfolio,
      city: rest.city ? cleanPlainText(rest.city, 100) : rest.city,
      region: rest.region ? cleanPlainText(rest.region, 100) : rest.region,
      is_founder: false,
      beta: rest.beta || false,
    });

    // Notify admin
    await ctx.scheduler.runAfter(0, internal.email.sendAdminNotification, {
      type: "signup",
      subject: `New ${role} waitlist signup: ${rest.full_name}`,
      body: `Name: ${rest.full_name}\nEmail: ${email}\nRole: ${role}\nCity: ${rest.city || "—"}\nInstagram: ${rest.instagram_handle ? "@" + rest.instagram_handle : "—"}\n\nView in admin: https://collabnb.com/#/admin`,
    });

    // Welcome email to the new member
    await ctx.scheduler.runAfter(0, internal.email.sendWelcomeEmail, {
      to: email,
      name: rest.full_name,
      role,
    });

    return { signedUp: true, profileId };
  },
});

export const getCounts = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    // Count real signups: waitlist submissions or verified users
    const real = profiles.filter((p) => p.tier === "waitlist" || p.is_verified === true);
    const creators = real.filter((p) => p.role === "creator").length;
    const hosts    = real.filter((p) => p.role === "host").length;
    return { creators, hosts, total: creators + hosts };
  },
});

export const getWaitlist = query({
  args: {},
  handler: async (ctx) => {
    if (!(await canAccessAdmin(ctx))) return [];
    const profiles = await ctx.db
      .query("profiles")
      .order("desc")
      .collect();
    return profiles.map((p) => ({
      _id: p._id,
      full_name: p.full_name,
      email: p.email,
      role: p.role,
      tier: p.tier || "waitlist",
      instagram_handle: p.instagram_handle,
      tiktok_handle: p.tiktok_handle,
      city: p.city,
      region: p.region,
      is_founder: p.is_founder || false,
      beta: p.beta || false,
      clerk_registered: p.clerk_registered || false,
      _creationTime: p._creationTime,
    }));
  },
});
