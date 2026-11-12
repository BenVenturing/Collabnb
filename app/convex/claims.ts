import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { requireAuthedProfile } from "./lib/auth";
import { computeLoadTier } from "./lib/compensationPoints";

const MAGIC_LINK_DAYS = 45;

function listingFields(p: any, c: { hotel_name: string }) {
  const deliverables = Array.isArray(p.deliverables) ? p.deliverables : undefined;
  return {
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
    deliverables,
    deliverable_load: deliverables ? computeLoadTier(deliverables) || undefined : undefined,
    complexity: "standard",
    status: "draft",
  };
}

// Admin-only (run via `npx convex run claims:createClaim`), so internal.
// With `email` + `host`, pre-creates a pending host profile owning the draft
// listing, so the hotel lands in a ready account via the magic link.
export const deleteClaim = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const c = await ctx.db.query("listing_claims").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (c) await ctx.db.delete(c._id);
    return !!c;
  },
});

export const createClaim = internalMutation({
  args: {
    hotel_name: v.string(),
    email: v.optional(v.string()),
    prefill: v.any(),
    preview: v.optional(v.any()),
    token: v.optional(v.string()),
    host: v.optional(v.object({
      full_name: v.string(),
      username: v.string(),
      avatar_url: v.optional(v.string()),
      instagram_handle: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { token: given, host, ...args }) => {
    const slug = args.hotel_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
    const rand = Array.from(crypto.getRandomValues(new Uint8Array(9)))
      .map((b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32])
      .join("");
    const token = given || `${slug}-${rand}`;
    const existingClaim = await ctx.db.query("listing_claims").withIndex("by_token", (q) => q.eq("token", token)).unique();

    let profile_id: string | undefined;
    let listing_id: string | undefined;
    if (host && args.email) {
      const email = args.email.toLowerCase().trim();
      const existing = await ctx.db.query("profiles").withIndex("by_email", (q) => q.eq("email", email)).unique();
      if (existing) {
        profile_id = String(existing._id);
        if (existing.is_admin !== true) {
          await ctx.db.patch(existing._id, {
            is_verified: true,
            is_founder: true,
            tier: !existing.tier || existing.tier === "waitlist" ? "Founding Host" : existing.tier,
            is_rejected: undefined,
            rejection_reason: undefined,
            ...(host.avatar_url ? { avatar_url: host.avatar_url } : {}),
          });
        }
      } else {
        profile_id = String(await ctx.db.insert("profiles", {
          email,
          full_name: host.full_name,
          username: host.username,
          role: "host",
          tier: "Founding Host",
          is_verified: true,
          is_founder: true,
          avatar_url: host.avatar_url,
          instagram_handle: host.instagram_handle,
          bio: "",
          highlight_opt_in: true,
        }));
      }
      const fields = { ...listingFields(args.prefill || {}, args), host_id: profile_id, host_name: host.full_name } as any;
      const prior: any = existingClaim?.listing_id ? await ctx.db.get(existingClaim.listing_id as any) : null;
      let id: any;
      if (prior && prior.status === "draft") {
        await ctx.db.replace(prior._id, fields);
        id = prior._id;
      } else {
        id = await ctx.db.insert("listings", fields);
      }
      listing_id = String(id);
      await ctx.scheduler.runAfter(0, internal.geocode.geocodeListing, { listingId: id });
    }

    const doc = { ...args, token, status: "open", created_at: Date.now(), profile_id, listing_id, clerk_user_id: existingClaim?.clerk_user_id };
    if (existingClaim) await ctx.db.replace(existingClaim._id, doc);
    else await ctx.db.insert("listing_claims", doc);
    return { token, profile_id, listing_id };
  },
});

export const statusByProfile = query({
  args: {},
  handler: async (ctx) => {
    const me = await ctx.auth.getUserIdentity();
    if (!me) return [];
    const claims = await ctx.db.query("listing_claims").collect();
    return claims
      .filter((c) => c.profile_id)
      .map((c) => ({ profile_id: c.profile_id, opened: !!c.first_viewed_at, claimed: c.status === "claimed" }));
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const c = await ctx.db.query("listing_claims").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (!c) return null;
    return {
      hotel_name: c.hotel_name, email: c.email, prefill: c.prefill, preview: c.preview, status: c.status,
      has_account: !!c.profile_id,
    };
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

export const _getClaim = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) =>
    await ctx.db.query("listing_claims").withIndex("by_token", (q) => q.eq("token", token)).unique(),
});

export const _setClerkUser = internalMutation({
  args: { token: v.string(), clerk_user_id: v.string() },
  handler: async (ctx, { token, clerk_user_id }) => {
    const c = await ctx.db.query("listing_claims").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (c) await ctx.db.patch(c._id, { clerk_user_id });
  },
});

// One-click login for a pre-created claim account. Only ever issues a
// sign-in ticket for a Clerk user this flow created itself — if the email
// already has its own Clerk account, the hotel signs in normally instead.
export const magicLink = action({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<{ ticket?: string; mode: "ticket" | "signin" | "signup" }> => {
    const c: any = await ctx.runQuery(internal.claims._getClaim, { token });
    if (!c) throw new ConvexError("This link is no longer valid.");
    if (!c.email || !c.profile_id) return { mode: "signup" };
    if (Date.now() - c.created_at > MAGIC_LINK_DAYS * 86400000) return { mode: "signin" };
    const key = process.env.CLERK_SECRET_KEY;
    if (!key) return { mode: "signup" };
    const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

    let userId: string | undefined = c.clerk_user_id;
    if (!userId) {
      const email = String(c.email).toLowerCase();
      const found = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`, { headers });
      if (!found.ok) {
        console.error("magicLink: Clerk user lookup failed", found.status);
        return { mode: "signin" };
      }
      const list = await found.json();
      const match = Array.isArray(list) && list.some((u: any) =>
        (u.email_addresses || []).some((e: any) => String(e.email_address).toLowerCase() === email));
      if (match) return { mode: "signin" };
      const created = await fetch("https://api.clerk.com/v1/users", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email_address: [c.email],
          username: `host_${token}`.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 60),
          skip_password_requirement: true,
          first_name: c.hotel_name,
          unsafe_metadata: { role: "host" },
        }),
      });
      if (!created.ok) {
        console.error("Clerk create user failed", created.status, await created.text().catch(() => ""));
        return { mode: "signup" };
      }
      userId = (await created.json()).id as string;
      await ctx.runMutation(internal.claims._setClerkUser, { token, clerk_user_id: userId });
    }

    const t = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
      method: "POST",
      headers,
      body: JSON.stringify({ user_id: userId, expires_in_seconds: 600 }),
    });
    if (!t.ok) {
      console.error("Clerk sign-in token failed", t.status, await t.text().catch(() => ""));
      return { mode: "signin" };
    }
    return { mode: "ticket", ticket: (await t.json()).token };
  },
});

export const redeem = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const profile: any = await requireAuthedProfile(ctx);
    const c = await ctx.db.query("listing_claims").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (!c) throw new ConvexError("This link is no longer valid.");

    if (c.email && String(profile.email || "").toLowerCase().trim() !== String(c.email).toLowerCase().trim()) {
      throw new ConvexError(`This link is for ${c.email}. Sign out and open it again.`);
    }

    const me = String(profile._id);
    const existing: any = c.listing_id ? await ctx.db.get(c.listing_id as any) : null;

    if (c.status === "claimed") {
      if (c.claimed_by === me && existing) return { listingId: c.listing_id!, listing: existing };
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

    let listingId: any;
    if (existing) {
      // Pre-created draft: hand it to whoever claims (normally the same profile).
      if (String(existing.host_id) !== me) await ctx.db.patch(existing._id, { host_id: me, host_name: profile.full_name });
      listingId = existing._id;
    } else {
      listingId = await ctx.db.insert("listings", { ...listingFields(c.prefill || {}, c), host_id: me, host_name: profile.full_name } as any);
      await ctx.scheduler.runAfter(0, internal.geocode.geocodeListing, { listingId });
    }

    await ctx.db.patch(c._id, { status: "claimed", claimed_by: me, claimed_at: Date.now(), listing_id: String(listingId) });
    await ctx.scheduler.runAfter(0, internal.email.sendAdminNotification, {
      type: "signup",
      subject: `🎉 ${c.hotel_name} claimed their Collabnb listing`,
      body: `${profile.full_name} (${profile.email}) claimed ${c.hotel_name}. Draft listing: ${listingId}`,
    });

    return { listingId: String(listingId), listing: await ctx.db.get(listingId) };
  },
});

// Cold outreach via Resend (DKIM/SPF on collabnb.com), so links stay direct and
// images are hosted. Run: npx convex run claims:sendOutreach --prod '{...}'
export const sendOutreach = internalAction({
  args: { to: v.string(), subject: v.string(), html: v.string(), text: v.string(), bcc: v.optional(v.string()), hotel_name: v.optional(v.string()) },
  handler: async (ctx, { to, subject, html, text, bcc = "benventuring@gmail.com", hotel_name }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new ConvexError("RESEND_API_KEY not set");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Benjamin at Collabnb <hello@collabnb.com>",
        reply_to: "hellocollabnb@gmail.com",
        to: [to],
        ...(bcc && bcc.toLowerCase() !== to.toLowerCase() ? { bcc: [bcc] } : {}),
        subject,
        html,
        text,
      }),
    });
    const body = await res.text();
    if (!res.ok) throw new ConvexError(`Resend ${res.status}: ${body}`);
    await ctx.runMutation(internal.prospects.markAuditSent, { email: to, hotel_name: hotel_name || "" });
    return body;
  },
});
