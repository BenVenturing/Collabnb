import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

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

    // Create a waitlist profile
    const profileId = await ctx.db.insert("profiles", {
      full_name: rest.full_name,
      username: args.instagram_handle || args.tiktok_handle || email.split("@")[0],
      email: email,
      role: role,
      tier: rest.tier || "waitlist",
      bio: "",
      instagram_handle: rest.instagram_handle,
      tiktok_handle: rest.tiktok_handle,
      portfolio: rest.portfolio,
      city: rest.city,
      region: rest.region,
      is_founder: false,
      beta: rest.beta || false,
    });

    await ctx.scheduler.runAfter(0, internal.email.sendAdminNotification, {
      type: "signup",
      subject: `New ${role} waitlist signup: ${rest.full_name}`,
      body: `Name: ${rest.full_name}\nEmail: ${email}\nRole: ${role}\nCity: ${rest.city || "—"}\nInstagram: ${rest.instagram_handle ? "@" + rest.instagram_handle : "—"}\n\nView in admin: https://collabnb.com/#/admin`,
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
      _creationTime: p._creationTime,
    }));
  },
});
