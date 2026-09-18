---
name: collabnb-maps-enrich
description: |
  Backfills website/email/whatsapp onto Collabnb prospects (hosts or creators) by looking each one up on Google Maps via the local google-maps-scraper-kit — never touches Instagram, so it isn't affected by Instagram rate-limiting. Use this after an Agent-Reach Instagram search/import batch (those only return a handle + display name, no contact info), or standalone against prospects already confirmed in the CRM (status past 'new') that are still missing website/email. Trigger on "enrich these", "backfill contact info", "run maps enrichment", "find missing details from Google Maps", or "run this on my confirmed hosts/creators".
allowed-tools:
  - Bash(python3 scripts/enrich-via-maps.py *)
  - Bash(node scripts/enrich-prospects-local.mjs *)
  - Bash(node scripts/export-confirmed-for-enrichment.mjs *)
  - Bash(docker compose *)
  - Bash(docker ps *)
---

# Collabnb — Google Maps enrichment

Fills in `website` / `email` / `whatsapp` on prospects already in Convex by
searching each one on Google Maps (via a locally-running scraper kit), not
Instagram. Real businesses like hotels are reliably listed there with a real
site + phone, so this sidesteps Instagram's profile-lookup rate limiting
entirely.

Never overwrites a field that's already set — a manually-typed value always
wins.

## Two entry points

**1. Chained onto a fresh hotel/host search** (handles found via Agent-Reach's
Instagram *search* only carry handle + display name — no bio/website, since
that needs a *profile* lookup, the step that gets rate-limited). Right after
pushing a batch with `import-hosts-local.mjs`, reuse that same batch's rows
(handle + display_name + location) as `targets.json` and run enrichment on it
before moving on.

**2. Standalone, against already-confirmed prospects** — anything past the
`new` stage in the CRM (queued/emailed/contacted/replied/signed) that's still
missing website or email. Pull the target list straight from Convex:

```bash
cd app
CONVEX_URL=https://outgoing-anaconda-357.convex.cloud \
LOCAL_IMPORT_SECRET=<current secret> \
node scripts/export-confirmed-for-enrichment.mjs targets.json          # both kinds
# or: ... export-confirmed-for-enrichment.mjs targets.json host        # hosts only
```

## Running the enrichment itself (same for both entry points)

```bash
# 0. Prereq — the scraper kit must be up:
cd ~/agents/google-maps-scraper-kit && docker compose up -d
docker ps   # confirm it's running before starting a job

# 1. Resolve website/phone/email for each target:
cd "<repo>/app"
python3 scripts/enrich-via-maps.py targets.json enriched.json

# 2. Push whatever it found into Convex (skips fields already set):
CONVEX_URL=https://outgoing-anaconda-357.convex.cloud \
LOCAL_IMPORT_SECRET=<current secret> \
node scripts/enrich-prospects-local.mjs enriched.json
```

Report back how many rows it says it updated.

## Pace yourself — this is a "let it run" task, not a race

`enrich-via-maps.py` already sleeps between jobs and writes `enriched.json`
after every row (so an interrupted run isn't a lost run) — that's deliberate,
not a bug to work around. The scraper kit's own README warns that firing jobs
back-to-back risks a temporary Google IP rate-limit, and never run this
alongside another scrape job (Agent-Reach or another Maps job) at the same
time. A batch of 20-50 targets can take several minutes; that's expected —
let it finish rather than re-running it impatiently or parallelizing it.

## Before you start

- Docker Desktop must actually be running (`docker ps` — if it errors with
  "Cannot connect to the Docker daemon", start Docker Desktop first).
- Ask the user for the current `LOCAL_IMPORT_SECRET` value each time rather
  than reusing a cached one — it can rotate.
- `targets.json` rows need at minimum `instagram_handle` + `display_name`
  (used to build the Maps search query) — `location` sharpens the match but
  is optional.
