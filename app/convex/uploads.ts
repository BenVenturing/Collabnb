import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAuthedProfile } from "./lib/auth";

// Adjustable upload limits. generateUploadUrl hands the client a direct PUT
// URL to Convex storage — the file bytes never pass through our mutation
// code, so type/size can't be enforced at upload time. finalizeUpload is the
// actual gate: it runs after the browser's upload completes and before the
// storageId is ever attached to a profile/listing, checking the real stored
// metadata (not the client-reported filename/mimetype) and deleting anything
// that doesn't pass.
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuthedProfile(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Call this immediately after a raw browser upload completes, before using
// the storageId anywhere — validates the file Convex actually stored
// (content type + size), deletes it if it fails, and returns its public URL
// only when it passes. Convex-generated storage IDs are random/opaque, so no
// separate filename-sanitization step is needed — nothing user-supplied
// (like the original filename) is ever used as a path or stored value.
// Errors are ConvexError, not plain Error: Convex redacts plain Error messages
// on the client in production (generic "Server Error"), which hides the actual
// reason a photo was rejected.
export const finalizeUpload = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    await requireAuthedProfile(ctx);
    // A dropped connection mid-upload can hand back a truncated/garbage
    // storageId; db.system.get throws a *plain* Error on a malformed ID, which
    // Convex redacts to "Server Error" on the client — catch it so the host
    // sees something they can act on.
    let meta;
    try {
      meta = await ctx.db.system.get("_storage", storageId as any);
    } catch {
      throw new ConvexError("That photo didn't finish uploading — please try adding it again.");
    }
    if (!meta) throw new ConvexError("Upload not found.");
    if (!meta.contentType || !ALLOWED_IMAGE_TYPES.includes(meta.contentType)) {
      await ctx.storage.delete(storageId as any);
      // HEIC/HEIF is the iPhone camera default and can't be displayed by most
      // browsers, so it's rejected rather than allowed through as a broken image.
      const isHeic = /heic|heif/i.test(meta.contentType || "");
      throw new ConvexError(
        isHeic
          ? "This photo is in Apple's HEIC format, which browsers can't display. On your iPhone: Settings → Camera → Formats → Most Compatible, or export the photo as JPEG."
          : `Only JPEG, PNG, WEBP, or GIF images are allowed (this file is ${meta.contentType || "an unknown type"}).`
      );
    }
    if (meta.size > MAX_IMAGE_BYTES) {
      await ctx.storage.delete(storageId as any);
      const mb = (n: number) => (n / (1024 * 1024)).toFixed(1);
      throw new ConvexError(
        `Image must be under ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB — this one is ${mb(meta.size)}MB.`
      );
    }
    return await ctx.storage.getUrl(storageId as any);
  },
});

export const getImageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getImageUrls = query({
  args: { storageIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    return await Promise.all(
      args.storageIds.map(async (id) => {
        if (id.startsWith("http")) return id;
        try { return await ctx.storage.getUrl(id); } catch { return null; }
      })
    );
  },
});

export const getStorageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
