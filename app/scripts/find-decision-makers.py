#!/usr/bin/env python3
"""Finds the person who can actually say yes at each hotel — owner, GM,
marketing/PR lead — by crawling the hotel's OWN website with Scrapling
(homepage + about/team/contact/press/partner pages). Generic reservations@ /
booking@ inboxes are what our cold emails were hitting, so they're ranked
last and only used when nothing better exists.

Never touches Instagram or LinkedIn.

Usage (venv: python3 -m venv ~/.venvs/scrapling && ~/.venvs/scrapling/bin/pip install "scrapling[fetchers]"):
  node scripts/export-hosts-for-contact-scrape.mjs targets.json
  ~/.venvs/scrapling/bin/python scripts/find-decision-makers.py targets.json found.json
  node scripts/push-decision-makers-local.mjs found.json

targets.json rows: { instagram_handle, website, display_name?, location? }
found.json is rewritten after every row, and rows already in it are skipped,
so an interrupted run can just be restarted.
"""
import json
import logging
import re
import sys
import time
from urllib.parse import urljoin, urlparse

import dns.resolver
from scrapling.fetchers import DynamicFetcher, Fetcher

logging.getLogger("scrapling").setLevel(logging.ERROR)

SUBPAGE_HINTS = re.compile(r"about|team|story|our-?people|owner|founder|meet|contact|press|media|partner|collab|influencer|creator|work-with", re.I)
FORM_HINTS = re.compile(r"collab|influencer|creator|partner|press|media|work-with", re.I)
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
ROOMS_RE = re.compile(r"\b(\d{1,3})\s*(?:[- ]?(?:guest|luxury|boutique|individually[- ]designed))?\s*(?:guest\s*)?(?:rooms|suites|keys|bedrooms)\b", re.I)
WA_RE = re.compile(r"(?:wa\.me/|whatsapp\.com/send\?phone=)\+?(\d{8,15})")

ROLES = r"(Co-?Founder|Founder|Owner|Proprietor|General Manager|Managing Director|Hotel Manager|Resort Manager|Villa Manager|Marketing Manager|Marketing Director|Director of Sales(?: (?:&|and) Marketing)?|Sales (?:&|and) Marketing Manager|PR Manager|Communications Manager|Brand Manager|Host)"
NAME = r"([A-Z][a-z]+(?:[ -][A-Z][a-z]+){0,2})"
NAME_THEN_ROLE = re.compile(NAME + r"\s*(?:,|-|–|—|\||·|\(|is (?:the|our))\s*(?:the |our )?" + ROLES)
ROLE_THEN_NAME = re.compile(ROLES + r"\s*(?::|-|–|—|\|)\s*" + NAME)
RUN_BY = re.compile(r"(?:owned|run|founded|hosted|managed) by\s+" + r"([A-Z][a-z]+(?: (?:&|and) [A-Z][a-z]+)?)")
NOT_NAMES = {"The", "Our", "Hotel", "Villa", "Villas", "Resort", "Contact", "About", "Meet", "Team", "Home", "Book", "Welcome", "Your", "We", "Bali", "Lombok", "Gili", "Island", "Beach", "Spa", "Restaurant", "Story", "Message", "Sales", "Marketing", "General", "Manager", "These", "This", "That", "Their", "Each", "Every", "All", "Stay", "Guest", "Guests", "Room", "Rooms", "Suite", "Suites", "Experience", "Discover", "Explore", "Learn", "Read", "More", "View", "Call", "Email", "Phone", "Our", "Local", "Private", "Luxury", "Boutique", "Lodge", "Inn", "House", "Collection", "Group", "Family"}

ROLE_RANK = ["Owner", "Founder", "Co-Founder", "Cofounder", "Proprietor", "Managing Director", "General Manager", "Marketing", "Director of Sales", "Sales", "PR", "Communications", "Brand", "Hotel Manager", "Resort Manager", "Villa Manager", "Host"]
GOOD_LOCAL = re.compile(r"market|pr\b|press|media|partner|collab|influenc|creator|owner|founder|^gm\b|manager|director|sales|brand|comms", re.I)
BAD_LOCAL = re.compile(r"reserv|booking|book|^res\b|frontdesk|front\.desk|reception|noreply|no-reply|career|job|hr\b|account|finance|support|privacy|webmaster", re.I)
JUNK_EMAIL = re.compile(r"^(privacy|legal|dpo|gdpr|unsubscribe)@|\.(png|jpe?g|gif|webp|svg)$|sentry|wixpress|example|emailaddress|domain\.com|email\.com|yourname|@2x", re.I)


def fetch(url, browser=False):
    try:
        if browser:
            page = DynamicFetcher.fetch(url, headless=True, timeout=20000, wait=1500, retries=1, disable_resources=True)
        else:
            page = Fetcher.get(url, stealthy_headers=True, timeout=12, retries=1)
        if page.status and page.status >= 400:
            return None
        return page
    except Exception:
        return None


def links_of(page, base):
    host = urlparse(base).netloc.replace("www.", "")
    out = []
    for a in page.css("a"):
        href = a.attrib.get("href") or ""
        full = urljoin(base, href.split("#")[0])
        if urlparse(full).netloc.replace("www.", "") == host:
            out.append((full, str(a.text or "")))
    return out


_mx_cache = {}


def domain_accepts_mail(domain):
    """MX lookup (A-record fallback). Drops dead/typo domains — the source of
    the 10-15% hard bounces. Doesn't prove the mailbox exists; port 25 SMTP
    probes are blocked from most home connections."""
    if domain not in _mx_cache:
        ok = False
        for rtype in ("MX", "A"):
            try:
                dns.resolver.resolve(domain, rtype, lifetime=8)
                ok = True
                break
            except Exception:
                continue
        _mx_cache[domain] = ok
    return _mx_cache[domain]


def email_score(email, site_host):
    local, _, domain = email.lower().partition("@")
    score = 0
    if GOOD_LOCAL.search(local): score += 3
    if re.fullmatch(r"[a-z]+(\.[a-z]+)?", local) and not re.match(r"info|hello|contact|admin|enquir|stay|welcome", local): score += 2  # looks like a person
    if domain.replace("www.", "") == site_host: score += 1
    if BAD_LOCAL.search(local): score -= 4
    return score


def find_people(text):
    people = []
    for m in NAME_THEN_ROLE.finditer(text):
        people.append((m.group(1), m.group(2)))
    for m in ROLE_THEN_NAME.finditer(text):
        people.append((m.group(2), m.group(1)))
    for m in RUN_BY.finditer(text):
        people.append((m.group(1), "Owner"))
    clean = []
    for name, role in people:
        if any(w in NOT_NAMES for w in name.split()):
            continue
        clean.append((name.strip(), role.strip()))
    def rank(p):
        for i, r in enumerate(ROLE_RANK):
            if r.lower() in p[1].lower():
                return i
        return len(ROLE_RANK)
    return sorted(set(clean), key=rank)


def crawl(site, browser, max_pages):
    home = fetch(site, browser)
    if not home:
        return []
    pages = [(site, home)]
    seen = {site}
    candidates = [u for u, t in links_of(home, site) if SUBPAGE_HINTS.search(u) or SUBPAGE_HINTS.search(t)]
    for url in candidates:
        if url in seen or len(pages) >= max_pages:
            continue
        seen.add(url)
        time.sleep(1)
        p = fetch(url, browser)
        if p:
            pages.append((url, p))
    return pages


def extract(pages, site):
    emails, whatsapp, people, contact_url = set(), None, [], None
    for url, p in pages:
        html = str(p.html_content) if hasattr(p, "html_content") else str(p.body)
        text = str(p.get_all_text(separator="\n", ignore_tags=("script", "style")))
        emails.update(e.rstrip(".") for e in EMAIL_RE.findall(html) if not JUNK_EMAIL.search(e))
        if not whatsapp:
            m = WA_RE.search(html)
            if m:
                whatsapp = m.group(1)
        people.extend(find_people(text))
        if not contact_url and url != site and FORM_HINTS.search(url) and not re.search(r"login|meeting|event|wedding", url, re.I):
            contact_url = url
    return emails, whatsapp, people, contact_url


def scrape(target):
    site = target["website"].strip()
    if not site.startswith("http"):
        site = "https://" + site
    site_host = urlparse(site).netloc.replace("www.", "")
    # Plain HTTP first (fast); many boutique sites render contact details with
    # JS, so anything that comes back empty gets one pass in a real browser.
    pages = crawl(site, browser=False, max_pages=6)
    found = extract(pages, site)
    browser_used = False
    # Browser only helps when the site answered but rendered nothing useful;
    # DNS/TLS failures fail the same way in a browser, just 20x slower.
    if pages and not found[0] and not found[2]:
        browser_pages = crawl(site, browser=True, max_pages=2)
        if browser_pages:
            pages, found, browser_used = browser_pages, extract(browser_pages, site), True
    if not pages:
        return {"instagram_handle": target["instagram_handle"], "_error": "site unreachable"}
    emails, whatsapp, people, contact_url = found

    dead = sorted(e for e in emails if not domain_accepts_mail(e.lower().split("@")[1]))
    ranked = sorted((e for e in emails if e not in dead), key=lambda e: email_score(e, site_host), reverse=True)
    rooms = [int(m.group(1)) for _, p in pages for m in ROOMS_RE.finditer(str(p.get_all_text(separator=" ", ignore_tags=("script", "style")))) if 3 <= int(m.group(1)) <= 999]
    row = {"instagram_handle": target["instagram_handle"], "_pages": len(pages), "_browser": browser_used, "_emails": ranked, "_dead_emails": dead}
    if ranked and email_score(ranked[0], site_host) > -2:
        row["marketing_email"] = ranked[0].lower()
    if people:
        row["decision_maker_name"], row["decision_maker_role"] = people[0]
        row["_people"] = [f"{n} ({r})" for n, r in people[:5]]
    if rooms:
        # Highest figure that recurs, else the first: "52 rooms" in the hero text
        # beats a stray "2 rooms available" in a booking widget.
        row["room_count"] = max(set(rooms), key=lambda n: (rooms.count(n), n)) if len(rooms) > 2 else rooms[0]
    if whatsapp:
        row["whatsapp"] = whatsapp
    if contact_url:
        row["contact_url"] = contact_url
    return row


def main():
    src, dst = sys.argv[1], sys.argv[2]
    targets = json.load(open(src))
    try:
        done = json.load(open(dst))
    except (FileNotFoundError, json.JSONDecodeError):
        done = []
    done_handles = {r["instagram_handle"] for r in done}
    todo = [t for t in targets if t.get("website") and t["instagram_handle"] not in done_handles]
    print(f"{len(todo)} to scrape ({len(done_handles)} already done)")
    for i, t in enumerate(todo, 1):
        row = scrape(t)
        done.append(row)
        json.dump(done, open(dst, "w"), indent=2)
        who = f'{row.get("decision_maker_name", "-")} ({row.get("decision_maker_role", "")})' if row.get("decision_maker_name") else "no name"
        print(f"[{i}/{len(todo)}] @{t['instagram_handle']}: {who} | {row.get('marketing_email', row.get('_error', 'no email'))}")
        time.sleep(2)
    named = sum(1 for r in done if r.get("decision_maker_name"))
    emailed = sum(1 for r in done if r.get("marketing_email"))
    print(f"Done. {named} with a named decision-maker, {emailed} with a usable email, of {len(done)}.")


if __name__ == "__main__":
    main()
