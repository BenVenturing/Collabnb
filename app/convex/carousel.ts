// "Welcome new creators" Instagram carousel — the admin's weekly/every-5
// ritual of posting newly-approved creators. Three pieces:
//   1. captureApprovalScreenshot — scheduled from gates.approveCreator,
//      best-effort screenshots the creator's public social profile so it's
//      ready by the time the admin builds a carousel.
//   2. listFeaturable / markFeatured — picks the newest approved-but-not-yet-
//      posted creators and, once the admin has posted them, excludes them
//      from future batches.
//   3. generateCaption / generateWelcomeImage — drafts a fun caption via the
//      platform's shared LLM chain (see blog.llmChat) and a themed welcome
//      slide via Gemini image generation.
// Output is downloadable images + editable caption text — there's no
// Instagram posting integration here, the admin posts manually.

import { v, ConvexError } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { requireAdmin, requireAdminAction } from "./lib/auth";
import { llmChat } from "./blog";

// ─── Capture (internal, scheduled from gates.approveCreator) ───────────────

export const getProfileHandles = internalQuery({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const p = await ctx.db.get(profileId);
    if (!p) return null;
    return { instagram_handle: p.instagram_handle, tiktok_handle: p.tiktok_handle };
  },
});

export const saveScreenshot = internalMutation({
  args: { profileId: v.id("profiles"), storageId: v.string() },
  handler: async (ctx, { profileId, storageId }) => {
    await ctx.db.patch(profileId, {
      welcome_screenshot_storage_id: storageId,
      welcome_screenshot_captured_at: Date.now(),
    });
  },
});

function profileUrlFor(handles: { instagram_handle?: string | null; tiktok_handle?: string | null }) {
  if (handles.instagram_handle) {
    return `https://www.instagram.com/${handles.instagram_handle.replace(/^@/, "").trim()}/`;
  }
  if (handles.tiktok_handle) {
    return `https://www.tiktok.com/@${handles.tiktok_handle.replace(/^@/, "").trim()}`;
  }
  return null;
}

// Best-effort — never throws, since this runs fire-and-forget off the
// approval path. Instagram/TikTok frequently show a login wall to
// logged-out scrapers; when that happens (or the handle's missing) the
// admin uploads a replacement screenshot manually in the carousel builder.
export const captureApprovalScreenshot = internalAction({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const handles = await ctx.runQuery(internal.carousel.getProfileHandles, { profileId });
    if (!handles) return;
    const target = profileUrlFor(handles);
    if (!target) return;

    try {
      const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(target)}&screenshot=true&meta=false&waitFor=1500`;
      const res = await fetch(apiUrl);
      if (!res.ok) return;
      const json: any = await res.json();
      const shotUrl = json?.data?.screenshot?.url;
      if (!shotUrl) return;
      const imgRes = await fetch(shotUrl);
      if (!imgRes.ok) return;
      const blob = await imgRes.blob();
      const storageId = await ctx.storage.store(blob);
      await ctx.runMutation(internal.carousel.saveScreenshot, { profileId, storageId });
    } catch {
      // swallow — see comment above
    }
  },
});

// Admin-triggered retry (e.g. the first capture hit a login wall).
export const regenerateScreenshot = action({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
    await ctx.runAction(internal.carousel.captureApprovalScreenshot, { profileId });
  },
});

// Admin manually uploading a replacement (via uploads.generateUploadUrl)
// when automated capture fails outright.
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
        avatar_url: p.avatar_url,
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
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
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
    await requireAdminAction(ctx, api.profiles.getByClerkUserId);
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
