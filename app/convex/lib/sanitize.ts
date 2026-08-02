// Server-side text/HTML sanitization for free-text fields. Client-side
// validation is UI-only — mutations can be called directly, so every
// free-text field must be cleaned here too.

// Plain-text fields (bios, titles, messages, review comments, etc.) should
// never contain markup at all — strip every tag rather than trying to
// allow-list a safe subset.
export function cleanPlainText(text: string | undefined | null, maxLen: number): string {
  if (!text) return "";
  const noTags = text.replace(/<[^>]*>/g, "");
  const noJsUri = noTags.replace(/javascript\s*:/gi, "");
  return noJsUri.trim().slice(0, maxLen);
}

// Rich HTML fields (currently just blog post content) render via
// dangerouslySetInnerHTML — strip script/style/embed tags, inline event
// handlers, and javascript: URIs, but leave normal formatting tags intact.
export function sanitizeRichHtml(html: string | undefined | null, maxLen: number): string {
  if (!html) return "";
  let out = html
    .replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed)[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, `$1=$2#$2`);
  return out.slice(0, maxLen);
}

// Accepts only well-formed http(s) URLs — rejects javascript:, data:, etc.
export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// For optional URL fields: returns the trimmed URL if valid, throws if
// present but malformed/unsafe (so hosts/creators get a clear error instead
// of a silently stored javascript: URI).
export function cleanOptionalUrl(url: string | undefined, fieldName: string): string | undefined {
  if (url === undefined || url === "") return undefined;
  const trimmed = url.trim();
  if (!isSafeHttpUrl(trimmed)) {
    throw new Error(`${fieldName} must be a valid http(s) URL.`);
  }
  return trimmed.slice(0, 500);
}
