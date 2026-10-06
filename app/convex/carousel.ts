// "Welcome new creators" Instagram carousel — the admin's weekly/every-5
// ritual of posting newly-approved creators. Three pieces:
//   1. listFeaturable / markFeatured — picks the newest approved-but-not-yet-
//      posted creators (with the profile data a spotlight card needs: photo,
//      handle, follower count, bio) and, once the admin has posted them,
//      excludes them from future batches.
//   2. setScreenshot — lets the admin swap in their own image per creator
//      instead of the generated card (WelcomeCarousel.jsx renders the
//      default card and rasterizes it client-side with html2canvas; this is
//      only for an explicit override).
//   3. generateCaption / generateWelcomeImage — drafts a fun caption via the
//      platform's shared LLM chain (see blog.llmChat) and a themed welcome
//      slide via Gemini image generation.
// Output is downloadable images + editable caption text — there's no
// Instagram posting integration here, the admin posts manually.
//
// An earlier version of this file tried to screenshot each creator's live
// Instagram/TikTok profile server-side (via microlink.io). Instagram serves
// a login wall to logged-out/bot traffic almost every time, so every
// captured "screenshot" was just IG's login page — useless. Removed in
// favor of a card built from data already on file (avatar_url, handle,
// metrics_instagram_followers, bio), which is both reliable and on-brand.

import { v, ConvexError } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { requireAdmin, requireAdminAction } from "./lib/auth";
import { llmChat } from "./blog";

// ─── Admin: manual image override ───────────────────────────────────────────

export const setScreenshot = mutation({
  args: { profileId: v.id("profiles"), storageId: v.string() },
  handler: async (ctx, { profileId, storageId }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(profileId, {
      welcome_screenshot_storage_id: storageId,
      welcome_screenshot_captured_at: Date.now(),
    });
  },
});

// Reads the follower count off an uploaded profile screenshot via Gemini
// vision, so the admin doesn't have to type it in by hand for the reach
// tally. Best-effort: returns null (not a thrown error) whenever it can't
// find a number, since typing it in manually still works either way.
export const estimateFollowersFromScreenshot = action({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    await requireAdminAction(ctx, internal.profiles.getByClerkUserId);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    const blob = await ctx.storage.get(storageId as any);
    if (!blob) return null;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: "This is a screenshot of a social media profile. Find the follower count shown on the page (it may read like '12.3K followers' or '1,204 Followers'). Reply with ONLY the fully expanded number and nothing else — no commas, no abbreviations (e.g. 12300, not 12.3K). If you can't find a follower count anywhere in the image, reply with exactly: 0",
              },
              { inlineData: { mimeType: blob.type || "image/jpeg", data: base64 } },
            ],
          }],
        }),
      }
    );
    if (!res.ok) return null;
    const json: any = await res.json();
    const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const match = text.replace(/,/g, "").match(/\d+/);
    const n = match ? parseInt(match[0], 10) : 0;
    return n > 0 ? n : null;
  },
});

export const clearScreenshot = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(profileId, {
      welcome_screenshot_storage_id: undefined,
      welcome_screenshot_captured_at: undefined,
    });
  },
});

// ─── Admin: pick creators for the carousel ──────────────────────────────────

export const listFeaturable = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const allProfiles = await ctx.db.query("profiles").collect();
    const creators = allProfiles
      .filter((p) => p.role === "creator" && p.creator_verified === true && p.featured_in_carousel !== true)
      .sort((a, b) => (b.creator_approved_at ?? b._creationTime) - (a.creator_approved_at ?? a._creationTime))
      .slice(0, 25);

    return Promise.all(
      creators.map(async (p) => ({
        _id: p._id,
        full_name: p.full_name,
        username: p.username,
        instagram_handle: p.instagram_handle,
        tiktok_handle: p.tiktok_handle,
        tier: p.tier,
        creator_track: p.creator_track,
        bio: p.bio,
        avatar_url: p.avatar_url,
        followers:
          p.metrics_instagram_followers || p.metrics_tiktok_followers || p.metrics_youtube_subscribers || null,
        // Admin-uploaded override only — there's no automated capture anymore.
        screenshot_url: p.welcome_screenshot_storage_id
          ? await ctx.storage.getUrl(p.welcome_screenshot_storage_id as any)
          : null,
        approved_at: p.creator_approved_at ?? p._creationTime,
      }))
    );
  },
});

export const markFeatured = mutation({
  args: { profileIds: v.array(v.id("profiles")) },
  handler: async (ctx, { profileIds }) => {
    await requireAdmin(ctx);
    const now = Date.now();
    for (const id of profileIds) {
      await ctx.db.patch(id, { featured_in_carousel: true, featured_in_carousel_at: now });
    }
  },
});

// ─── Admin: draft a caption via the platform's shared LLM chain ────────────

export const generateCaption = action({
  args: {
    creators: v.array(v.object({
      full_name: v.string(),
      handle: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { creators }) => {
    await requireAdminAction(ctx, internal.profiles.getByClerkUserId);
    if (creators.length === 0) throw new ConvexError("Pick at least one creator first.");
    const roster = creators
      .map((c) => `${c.full_name}${c.handle ? ` (@${c.handle.replace(/^@/, "")})` : ""}`)
      .join(", ");
    const reply = await llmChat(
      [
        {
          role: "system",
          content:
            "You write short, upbeat Instagram captions for Collabnb, a marketplace connecting boutique hotels with content creators. Voice: warm, a little playful, never corporate. 2-4 short sentences, a couple of well-chosen emoji (not excessive), end with a soft call-to-action inviting people to check out the new creators. No hashtags unless asked. Return only the caption text, nothing else.",
        },
        {
          role: "user",
          content: `Draft a caption welcoming these new creators who just joined Collabnb: ${roster}. Mention them naturally by first name or handle, don't just list them.`,
        },
      ],
      300
    );
    return reply.trim();
  },
});

// ─── Admin: generate the welcome slide via Gemini image generation ─────────

const DEFAULT_WELCOME_PROMPT =
  "A warm, minimal welcome graphic for an Instagram carousel, square 1:1. Soft glassmorphism card on a muted HAZY palette background — dusty teal, dusty rose, warm sand, fog white, no pure white or black. Clean modern serif headline reading 'Welcome to Collabnb' with a smaller clean sans-serif line underneath reading 'Meet our newest creators'. Airy, boutique-hotel-meets-creator-economy feel, soft natural light, subtle texture, no stock-photo people, no clutter.";

export const generateWelcomeImage = action({
  args: { prompt: v.optional(v.string()) },
  handler: async (ctx, { prompt }) => {
    await requireAdminAction(ctx, internal.profiles.getByClerkUserId);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ConvexError(
        "GEMINI_API_KEY isn't set. Add it in the Convex dashboard (Settings → Environment Variables) using a Google AI Studio key, then try again."
      );
    }
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt || DEFAULT_WELCOME_PROMPT }] }] }),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new ConvexError(`Gemini image generation failed: ${text.slice(0, 400)}`);
    }
    const json: any = await res.json();
    const parts = json?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData?.data);
    if (!imagePart) {
      throw new ConvexError("Gemini didn't return an image — try adjusting the prompt.");
    }
    const mimeType = imagePart.inlineData.mimeType || "image/png";
    const bytes = Uint8Array.from(atob(imagePart.inlineData.data), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: mimeType });
    const storageId = await ctx.storage.store(blob);
    return await ctx.storage.getUrl(storageId);
  },
});
