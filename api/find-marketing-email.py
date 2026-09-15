"""Vercel Python function — finds a hotel's real marketing/press contact
email (and phone/WhatsApp number) by fetching its actual website instead of
trusting whatever's in an Instagram bio.

Originally built on Scrapling, but its dependency tree (browser-automation
extras pulled in even for a plain HTTP fetch) bundles to 250MB+, over
Vercel Python's 225MB function-size cap — confirmed via a failed prod
deploy. Swapped to stdlib urllib with browser-like headers instead: same
behavior (fetch the page, extract the best-scoring contact info) with
zero extra dependencies. Revisit Scrapling only if it ships a slimmer
"requests-only" extra, or if this needs real anti-bot evasion later.

Convex (Node) can't run Python directly, so this bridges the two: the
Convex action in app/convex/prospects.ts (findMarketingEmail) POSTs a
website URL here and gets back the best-scoring email/phone it can find.

Auth: shared secret, same value in both places —
  Vercel:  vercel env add SCRAPE_SHARED_SECRET production
  Convex:  npx convex env set SCRAPE_SHARED_SECRET <same value>
"""

from http.server import BaseHTTPRequestHandler
import json
import os
import re
import urllib.request
from urllib.parse import urljoin

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def fetch_html(url: str, timeout: int = 15) -> str:
    req = urllib.request.Request(url, headers=BROWSER_HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as res:
        raw = res.read(2_000_000)  # cap read size, contact pages are small
        charset = res.headers.get_content_charset() or "utf-8"
        return raw.decode(charset, errors="ignore")


EMAIL_RE = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
CONTACT_LINK_KEYWORDS = ["contact", "press", "media", "partnership", "marketing", "about"]

# Higher score = more likely to be the real marketing/press contact rather
# than a generic reservations/support inbox.
SCORE_KEYWORDS = [
    (["marketing", "partnership", "collab", "press", "media", "pr@"], 100),
    (["info@", "hello@", "contact@"], 40),
]


def score_email(address: str) -> int:
    lower = address.lower()
    for keywords, score in SCORE_KEYWORDS:
        if any(k in lower for k in keywords):
            return score
    return 10


def extract_emails(html: str) -> list[str]:
    return sorted(set(EMAIL_RE.findall(html)), key=score_email, reverse=True)


def find_contact_links(base_url: str, html: str) -> list[str]:
    hrefs = re.findall(r'href=["\']([^"\']+)["\']', html)
    out = []
    for href in hrefs:
        if any(k in href.lower() for k in CONTACT_LINK_KEYWORDS):
            out.append(urljoin(base_url, href))
    seen = set()
    deduped = []
    for link in out:
        if link not in seen:
            seen.add(link)
            deduped.append(link)
    return deduped[:3]


# WhatsApp deep links (wa.me/1234567890 or api.whatsapp.com/send?phone=...)
# are the strongest signal — the number's already in the exact format a
# wa.me link needs. tel: links come next (dialer-formatted, needs cleanup).
# Plain-text phone numbers are the noisiest source (false positives from
# prices, dates, zip codes) so they're only used when nothing else matched.
WHATSAPP_LINK_RE = re.compile(r"(?:wa\.me/|api\.whatsapp\.com/send\?phone=)(\d{7,15})", re.I)
TEL_LINK_RE = re.compile(r'href=["\']tel:([+\d()\-.\s]{7,20})["\']', re.I)
PHONE_TEXT_RE = re.compile(r"(?<!\d)(\+?\d[\d\s().-]{6,17}\d)(?!\d)")


def normalize_phone(raw: str) -> str:
    return re.sub(r"\D", "", raw)


def extract_phones(html: str) -> list[str]:
    ranked: list[tuple[int, str]] = []
    for m in WHATSAPP_LINK_RE.finditer(html):
        ranked.append((0, m.group(1)))
    for m in TEL_LINK_RE.finditer(html):
        digits = normalize_phone(m.group(1))
        if 7 <= len(digits) <= 15:
            ranked.append((1, digits))
    if not any(rank == 0 for rank, _ in ranked):
        for m in PHONE_TEXT_RE.finditer(html):
            digits = normalize_phone(m.group(1))
            if 8 <= len(digits) <= 15:
                ranked.append((2, digits))
    seen = set()
    ordered = []
    for _, digits in sorted(ranked, key=lambda r: r[0]):
        if digits not in seen:
            seen.add(digits)
            ordered.append(digits)
    return ordered[:5]


def best_contact_for(url: str) -> dict:
    html = fetch_html(url)
    emails = extract_emails(html)
    phones = extract_phones(html)

    if not emails or not phones:
        for link in find_contact_links(url, html):
            try:
                sub_html = fetch_html(link)
            except Exception:
                continue
            if not emails:
                emails = extract_emails(sub_html)
            if not phones:
                phones = extract_phones(sub_html)
            if emails and phones:
                break

    return {
        "email": emails[0] if emails else None,
        "candidates": emails[:5],
        "phone": phones[0] if phones else None,
        "phone_candidates": phones,
    }


class handler(BaseHTTPRequestHandler):
    def _json(self, status: int, payload: dict):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        expected_secret = os.environ.get("SCRAPE_SHARED_SECRET", "")
        auth_header = self.headers.get("Authorization", "")
        if not expected_secret or auth_header != f"Bearer {expected_secret}":
            self._json(401, {"error": "unauthorized"})
            return

        length = int(self.headers.get("Content-Length", 0) or 0)
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            self._json(400, {"error": "invalid JSON body"})
            return

        url = body.get("url")
        if not url:
            self._json(400, {"error": "missing url"})
            return

        try:
            self._json(200, best_contact_for(url))
        except Exception as e:
            # Never a hard failure for the caller — Convex falls back to the
            # bio email (or nothing) either way.
            self._json(200, {"email": None, "phone": None, "error": str(e)})
