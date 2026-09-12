"""Vercel Python function — finds a hotel's real marketing/press contact
email by fetching its actual website (Scrapling) instead of trusting
whatever address happens to be in an Instagram bio.

Convex (Node) can't run Python directly, so this bridges the two: the
Convex action in app/convex/prospects.ts (findMarketingEmail) POSTs a
website URL here and gets back the best-scoring address it can find.

Auth: shared secret, same value in both places —
  Vercel:  vercel env add SCRAPE_SHARED_SECRET production
  Convex:  npx convex env set SCRAPE_SHARED_SECRET <same value>
"""

from http.server import BaseHTTPRequestHandler
import json
import os
import re
from urllib.parse import urljoin

from scrapling.fetchers import Fetcher

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


def best_email_for(url: str) -> tuple[str | None, list[str]]:
    page = Fetcher.get(url, stealthy_headers=True, timeout=15)
    html = getattr(page, "body", None) or getattr(page, "html_content", None) or str(page)
    candidates = extract_emails(html)
    if candidates:
        return candidates[0], candidates[:5]

    for link in find_contact_links(url, html):
        try:
            sub_page = Fetcher.get(link, stealthy_headers=True, timeout=15)
            sub_html = getattr(sub_page, "body", None) or getattr(sub_page, "html_content", None) or str(sub_page)
            sub_candidates = extract_emails(sub_html)
            if sub_candidates:
                return sub_candidates[0], sub_candidates[:5]
        except Exception:
            continue

    return None, []


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
            best, candidates = best_email_for(url)
            self._json(200, {"email": best, "candidates": candidates})
        except Exception as e:
            # Never a hard failure for the caller — Convex falls back to the
            # bio email (or nothing) either way.
            self._json(200, {"email": None, "error": str(e)})
