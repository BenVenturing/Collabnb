import { internalMutation, mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { requireAuthedProfile } from "./lib/auth";

// Admin-only (run via `npx convex run claims:createClaim`), so internal.
export const createClaim = internalMutation({
  args: {
    hotel_name: v.string(),
    email: v.optional(v.string()),
    prefill: v.any(),
    preview: v.optional(v.any()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, { token: given, ...args }) => {
    const slug = args.hotel_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
    const rand = Array.from(crypto.getRandomValues(new Uint8Array(9)))
      .map((b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32])
      .join("");
    const token = given || `${slug}-${rand}`;
    await ctx.db.insert("listing_claims", { ...args, token, status: "open", created_at: Date.now() });
    return token;
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const c = await ctx.db.query("listing_claims").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (!c) return null;
    return { hotel_name: c.hotel_name, email: c.email, prefill: c.prefill, preview: c.preview, status: c.status };
  },
});

export const markViewed = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const c = await ctx.db.query("listing_claims").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (!c) return;
    const now = Date.now();
    await ctx.db.patch(c._id, {
      view_count: (c.view_count || 0) + 1,
      first_viewed_at: c.first_viewed_at || now,
      last_viewed_at: now,
    });
    if (!c.first_viewed_at) {
      await ctx.scheduler.runAfter(0, internal.email.sendAdminNotification, {
        type: "signup",
        subject: `👀 ${c.hotel_name} opened their claim link`,
        body: `${c.hotel_name} just opened their pre-built listing at collabnb.com/claim/${token}.`,
      });
    }
  },
});

export const redeem = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const profile: any = await requireAuthedProfile(ctx);
    const c = await ctx.db.query("listing_claims").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (!c) throw new ConvexError("This link is no longer valid.");

    if (c.status === "claimed") {
      if (c.claimed_by === String(profile._id) && c.listing_id) {
        const existing = await ctx.db.get(c.listing_id as any);
        if (existing) return { listingId: c.listing_id, listing: existing };
      }
      throw new ConvexError("This listing has already been claimed. Reply to our email and we'll sort it out.");
    }

    if (profile.is_admin !== true) {
      await ctx.db.patch(profile._id, {
        role: "host",
        is_verified: true,
        is_founder: true,
        tier: profile.tier === "waitlist" || !profile.tier ? "Founding Host" : profile.tier,
        is_rejected: undefined,
      });
    }

    const p = c.prefill || {};
    const listingId = await ctx.db.insert("listings", {
      title: String(p.title || c.hotel_name).slice(0, 120),
      location: [p.location_city, p.location_country].filter(Boolean).join(", ") || "—",
      location_city: p.location_city,
      location_country: p.location_country,
      lat: typeof p.lat === "number" ? p.lat : undefined,
      lng: typeof p.lng === "number" ? p.lng : undefined,
      property_url: p.property_url,
      contact_phone: p.contact_phone,
      collaboration_brief: p.collaboration_brief,
      about: p.about,
      property_type: p.property_type,
      rating: typeof p.rating === "number" ? p.rating : undefined,
      review_count: typeof p.review_count === "number" ? p.review_count : undefined,
      image: Array.isArray(p.gallery_images) ? p.gallery_images[0] : undefined,
      gallery_images: Array.isArray(p.gallery_images) ? p.gallery_images.slice(0, 12) : undefined,
      amenities: Array.isArray(p.amenities) ? p.amenities : undefined,
      perks: Array.isArray(p.perks) ? p.perks : undefined,
      vibe_tags: Array.isArray(p.vibe_tags) ? p.vibe_tags : undefined,
      nights: typeof p.nights === "number" ? p.nights : 2,
      compensation_type: p.compensation_type || "hybrid",
      host_id: String(profile._id),
      host_name: profile.full_name,
      status: "draft",
    });

    await ctx.db.patch(c._id, { status: "claimed", claimed_by: String(profile._id), claimed_at: Date.now(), listing_id: String(listingId) });
    await ctx.scheduler.runAfter(0, internal.geocode.geocodeListing, { listingId });
    await ctx.scheduler.runAfter(0, internal.email.sendAdminNotification, {
      type: "signup",
      subject: `🎉 ${c.hotel_name} claimed their Collabnb listing`,
      body: `${profile.full_name} (${profile.email}) claimed ${c.hotel_name}. Draft listing: ${listingId}`,
    });

    return { listingId: String(listingId), listing: await ctx.db.get(listingId) };
  },
});
