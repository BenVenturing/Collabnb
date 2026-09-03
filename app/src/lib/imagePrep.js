// Client-side image prep for uploads. The server gate in convex/uploads.ts
// rejects anything over MAX_IMAGE_BYTES or outside ALLOWED_IMAGE_TYPES —
// rather than making the user fix that by hand, oversized/undisplayable photos
// are decoded and re-encoded to a JPEG that fits before any bytes are sent.
//
// Keep these two constants in sync with convex/uploads.ts.
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const MAX_DIMENSION = 2400; // long edge; plenty for full-bleed listing photos
const QUALITY_STEPS = [0.85, 0.72, 0.6, 0.48];

function isHeic(file) {
  return /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

// Browsers decode HEIC only where the OS codec is available (Safari yes,
// Chrome/Firefox no), so this can legitimately fail and the caller reports it.
async function decode(file) {
  if (typeof createImageBitmap === "function") {
    return await createImageBitmap(file);
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("decode failed"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawScaled(bitmap, scale) {
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  // JPEG has no alpha — fill first so transparent PNGs don't come out black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas;
}

function toBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Returns { file } with an upload-ready File, or { error: <reason key> } where
 * reason is one of "notAnImage" | "undecodable" | "heic" | "tooLarge".
 * Files that already pass the server gate are returned untouched.
 */
export async function prepareImageForUpload(file) {
  const looksLikeImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|hei[cf]|bmp|tiff?|avif)$/i.test(file.name);
  if (!looksLikeImage) return { error: "notAnImage" };

  // Animated GIFs can't survive a canvas round-trip (only frame 1 would),
  // so they're passed through or rejected, never re-encoded.
  if (file.type === "image/gif") {
    return file.size > MAX_IMAGE_BYTES ? { error: "tooLarge" } : { file };
  }

  const typeOk = ALLOWED_IMAGE_TYPES.includes(file.type);
  if (typeOk && file.size <= MAX_IMAGE_BYTES) return { file };

  let bitmap;
  try {
    bitmap = await decode(file);
  } catch {
    return { error: isHeic(file) ? "heic" : "undecodable" };
  }

  const longEdge = Math.max(bitmap.width, bitmap.height);
  let scale = longEdge > MAX_DIMENSION ? MAX_DIMENSION / longEdge : 1;

  for (let pass = 0; pass < 3; pass++) {
    const canvas = drawScaled(bitmap, scale);
    for (const quality of QUALITY_STEPS) {
      const blob = await toBlob(canvas, quality);
      if (blob && blob.size <= MAX_IMAGE_BYTES) {
        const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
        if (bitmap.close) bitmap.close();
        return { file: new File([blob], name, { type: "image/jpeg" }) };
      }
    }
    scale *= 0.7; // still too heavy at the lowest quality — shrink and retry
  }

  if (bitmap.close) bitmap.close();
  return { error: "tooLarge" };
}
