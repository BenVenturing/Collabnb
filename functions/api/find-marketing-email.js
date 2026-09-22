// Cloudflare Pages Function port of api/find-marketing-email.py.
// Ported because Cloudflare Workers has no Python runtime — this is a
// straight fetch+regex port with the same scoring rules, no dependencies
// on either side. See api/find-marketing-email.py for the original
// history/rationale (Scrapling → stdlib, kept here as stdlib → fetch).
//
// Auth: shared secret, same value in both places —
//   Cloudflare: wrangler pages secret put SCRAPE_SHARED_SECRET
//   Convex:     npx convex env set SCRAPE_SHARED_SECRET <same value>

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
    + '(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const MAX_BYTES = 2_000_000; // contact pages are small; cap like the Python version did

async function fetchHtml(url) {
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  while (received < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
  }
  reader.cancel().catch(() => {});
  const buf = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    buf.set(chunk.subarray(0, Math.min(chunk.length, received - offset)), offset);
    offset += chunk.length;
  }
  return new TextDecoder('utf-8').decode(buf);
}

const EMAIL_RE = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
const CONTACT_LINK_KEYWORDS = ['contact', 'press', 'media', 'partnership', 'marketing', 'about'];

// Higher score = more likely to be the real marketing/press contact rather
// than a generic reservations/support inbox.
const SCORE_KEYWORDS = [
  { keywords: ['marketing', 'partnership', 'collab', 'press', 'media', 'pr@'], score: 100 },
  { keywords: ['info@', 'hello@', 'contact@'], score: 40 },
];

function scoreEmail(address) {
  const lower = address.toLowerCase();
  for (const { keywords, score } of SCORE_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return score;
  }
  return 10;
}

function extractEmails(html) {
  const found = new Set(html.match(EMAIL_RE) || []);
  return [...found].sort((a, b) => scoreEmail(b) - scoreEmail(a));
}

function findContactLinks(baseUrl, html) {
  const hrefRe = /href=["']([^"']+)["']/g;
  const out = [];
  let m;
  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1];
    if (CONTACT_LINK_KEYWORDS.some((k) => href.toLowerCase().includes(k))) {
      try {
        out.push(new URL(href, baseUrl).toString());
      } catch {
        // ignore malformed hrefs
      }
    }
  }
  return [...new Set(out)].slice(0, 3);
}

// WhatsApp deep links (wa.me/1234567890 or api.whatsapp.com/send?phone=...)
// are the strongest signal — the number's already in the exact format a
// wa.me link needs. tel: links come next (dialer-formatted, needs cleanup).
// Plain-text phone numbers are the noisiest source (false positives from
// prices, dates, zip codes) so they're only used when nothing else matched.
const WHATSAPP_LINK_RE = /(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\d{7,15})/gi;
const TEL_LINK_RE = /href=["']tel:([+\d()\-.\s]{7,20})["']/gi;
const PHONE_TEXT_RE = /(?<!\d)(\+?\d[\d\s().-]{6,17}\d)(?!\d)/g;

function normalizePhone(raw) {
  return raw.replace(/\D/g, '');
}

function extractPhones(html) {
  const ranked = [];
  for (const m of html.matchAll(WHATSAPP_LINK_RE)) {
    ranked.push([0, m[1]]);
  }
  for (const m of html.matchAll(TEL_LINK_RE)) {
    const digits = normalizePhone(m[1]);
    if (digits.length >= 7 && digits.length <= 15) ranked.push([1, digits]);
  }
  if (!ranked.some(([rank]) => rank === 0)) {
    for (const m of html.matchAll(PHONE_TEXT_RE)) {
      const digits = normalizePhone(m[1]);
      if (digits.length >= 8 && digits.length <= 15) ranked.push([2, digits]);
    }
  }
  const seen = new Set();
  const ordered = [];
  for (const [, digits] of ranked.sort((a, b) => a[0] - b[0])) {
    if (!seen.has(digits)) {
      seen.add(digits);
      ordered.push(digits);
    }
  }
  return ordered.slice(0, 5);
}

async function bestContactFor(url) {
  const html = await fetchHtml(url);
  let emails = extractEmails(html);
  let phones = extractPhones(html);

  if (!emails.length || !phones.length) {
    for (const link of findContactLinks(url, html)) {
      let subHtml;
      try {
        subHtml = await fetchHtml(link);
      } catch {
        continue;
      }
      if (!emails.length) emails = extractEmails(subHtml);
      if (!phones.length) phones = extractPhones(subHtml);
      if (emails.length && phones.length) break;
    }
  }

  return {
    email: emails[0] || null,
    candidates: emails.slice(0, 5),
    phone: phones[0] || null,
    phone_candidates: phones,
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const expectedSecret = env.SCRAPE_SHARED_SECRET || '';
  const authHeader = request.headers.get('Authorization') || '';
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const url = body?.url;
  if (!url) {
    return Response.json({ error: 'missing url' }, { status: 400 });
  }

  try {
    return Response.json(await bestContactFor(url));
  } catch (err) {
    // Never a hard failure for the caller — Convex falls back to the
    // bio email (or nothing) either way.
    return Response.json({ email: null, phone: null, error: String(err) });
  }
}
