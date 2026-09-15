#!/usr/bin/env python3
"""Backfills website/phone/email onto existing Collabnb prospects (found via
an Agent-Reach Instagram SEARCH, which only returns a handle + display name —
no bio/website, since that needs a PROFILE lookup, which is the step that got
Instagram-rate-limited) by looking each one up on Google Maps instead. Real
businesses like hotels are reliably listed there with a real website + phone,
and it never touches Instagram at all.

Requires the google-maps-scraper-kit running locally:
  https://github.com/Mahanaicoach/google-maps-scraper-kit
  cd ~/agents/google-maps-scraper-kit && docker compose up -d

Usage:
  python3 scripts/enrich-via-maps.py targets.json enriched.json
  node scripts/enrich-prospects-local.mjs enriched.json   # actually pushes to Convex

targets.json: [{ "instagram_handle": "...", "display_name": "...", "location": "..." }, ...]
(location is used as the search hint, e.g. "Costa Rica" or "Uvita, Costa Rica")

This script only talks to the local Maps scraper and writes a plain JSON
file — it deliberately does NOT push to Convex itself (hand-rolling Convex's
HTTP mutation protocol in stdlib Python is a needless way to get the request
shape subtly wrong; the existing `convex` npm client already does this
correctly, same as import-hosts-local.mjs).

One job at a time, real pause between each — the scraper kit's own README
warns that back-to-back jobs risk a temporary Google IP rate-limit. Don't
loop this aggressively or run it alongside another scrape job.
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

SCRAPER_BASE = os.environ.get("SCRAPER_BASE_URL", "http://localhost:8080")
UA = "collabnb-enrich-via-maps/1.0"

LEAD_FIELDS = ["title", "website", "phone", "emails"]


def req(method, url, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {"Content-Type": "application/json", "User-Agent": UA, **(headers or {})}
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    with urllib.request.urlopen(r, timeout=30) as resp:
        return json.loads(resp.read() or b"{}")


def create_job(query: str) -> str:
    # Field set matches scripts/scrape.py exactly — the API 422s on a partial
    # body (confirmed: omitting "name" alone is enough to fail validation).
    body = {
        "name": "enrich-via-maps",
        "keywords": [query],
        "lang": "en",
        # A generic Costa Rica centroid is enough — Maps ranks on keyword
        # relevance more than strict radius, confirmed against a real listing
        # 60km away from this point. depth=3 keeps jobs fast; raise if a
        # specific search is coming back empty.
        "lat": "9.7489", "lon": "-83.7534",
        "fast_mode": False, "zoom": 15, "radius": 50000, "depth": 3,
        "email": True, "max_time": 120_000_000_000,
    }
    data = req("POST", f"{SCRAPER_BASE}/api/v1/jobs", body)
    return data["id"] if "id" in data else data["ID"]


def poll_job(job_id: str, timeout_s: int = 90) -> bool:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        jobs = req("GET", f"{SCRAPER_BASE}/api/v1/jobs")
        job = next((j for j in jobs if j["ID"] == job_id), None)
        if job and job["Status"] == "ok":
            return True
        if job and job["Status"] not in ("pending", "working"):
            return False
        time.sleep(3)
    return False


# Wix embeds a diagnostic address like <hash>@sentry-next.wixpress.com in
# some sites' page source for its own error tracking — the scraper's email
# regex picks it up as if it were a real contact address. "user@domain.com"
# and friends are template placeholder text builders leave in unfinished
# pages. Squarespace/other builders may have similar tells; extend as needed.
BOGUS_EMAIL_DOMAINS = ("wixpress.com", "sentry.io", "sentry-next", "domain.com", "example.com", "yoursite.com")
BOGUS_EMAIL_LOCALS = ("user", "test", "email", "name", "yourname")

# A "website" that's actually a social link isn't useful to us — our own
# contact scraper (findMarketingContact) needs a real business domain to
# fetch, and there's no point routing back through Instagram/Facebook when
# the whole point of this pipeline is to avoid that.
BOGUS_WEBSITE_DOMAINS = ("instagram.com", "facebook.com", "wa.me", "linktr.ee", "linktree.com")


def is_real_email(addr: str) -> bool:
    if not addr or "@" not in addr:
        return False
    local, _, domain = addr.lower().partition("@")
    if any(d in domain for d in BOGUS_EMAIL_DOMAINS):
        return False
    if local in BOGUS_EMAIL_LOCALS:
        return False
    return True


def is_real_website(url: str) -> bool:
    return bool(url) and not any(d in url.lower() for d in BOGUS_WEBSITE_DOMAINS)


def download_result(job_id: str) -> dict | None:
    url = f"{SCRAPER_BASE}/api/v1/jobs/{job_id}/download"
    r = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(r, timeout=30) as resp:
        text = resp.read().decode("utf-8", "replace")
    lines = text.splitlines()
    if len(lines) < 2:
        return None
    import csv
    import io
    reader = csv.DictReader(io.StringIO(text))
    row = next(reader, None)
    if not row:
        return None
    candidates = [e.strip() for e in (row.get("emails") or "").split(",") if e.strip()]
    email = next((e for e in candidates if is_real_email(e)), None)
    website = row.get("website") or None
    if not is_real_website(website):
        website = None
    return {
        "website": website,
        "phone": row.get("phone") or None,
        "email": email,
    }


def main():
    if len(sys.argv) < 3:
        sys.exit("Usage: python3 scripts/enrich-via-maps.py targets.json enriched.json")
    with open(sys.argv[1]) as f:
        targets = json.load(f)
    out_path = sys.argv[2]

    results = []
    for i, t in enumerate(targets):
        query = f"{t['display_name']} {t.get('location', '')}".strip()
        print(f"[{i+1}/{len(targets)}] {query} ...", end=" ", flush=True)
        # try/finally (not a bare `continue` inside the try) so the write and
        # the rate-limit pause below always run — a "no result" continue used
        # to skip straight to the next loop iteration and bypass both.
        try:
            job_id = create_job(query)
            ok = poll_job(job_id)
            if not ok:
                print("no result (timed out or job failed)")
            else:
                data = download_result(job_id)
                if not data or not any(data.values()):
                    print("no result (empty)")
                else:
                    row = {"instagram_handle": t["instagram_handle"]}
                    if data["website"]:
                        row["website"] = data["website"]
                    if data["phone"]:
                        row["whatsapp"] = "".join(c for c in data["phone"] if c.isdigit())
                    if data["email"]:
                        row["email"] = data["email"]
                    results.append(row)
                    print(f"-> {data['website'] or '-'} | {data['phone'] or '-'} | {data['email'] or '-'}")
        except Exception as e:
            # Broad on purpose: a dropped connection (e.g. Docker Desktop
            # itself quitting mid-run, confirmed to happen once already)
            # raises http.client exceptions that aren't urllib.error.URLError
            # subclasses. One bad item should never kill the whole batch.
            print(f"error: {e}")
        # Write after every item, not just at the end — an interrupted run
        # (Ctrl-C, or asked to stop early) still leaves a usable file instead
        # of losing everything back to the last item.
        with open(out_path, "w") as f:
            json.dump(results, f, indent=2)
        # Real pause between jobs — see module docstring on rate-limit risk.
        time.sleep(5)

    print(f"Wrote {len(results)} enrichments to {out_path}")
    print(f"Push them with: node scripts/enrich-prospects-local.mjs {out_path}")


if __name__ == "__main__":
    main()
