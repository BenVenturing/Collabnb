#!/usr/bin/env bash
# Full local host-research pipeline: import raw Agent-Reach search results,
# then immediately enrich them via the local Google Maps scraper kit (real
# website/phone/email straight from each business's own Maps listing — never
# touches Instagram, so it can't trigger the profile-lookup rate limit that
# a second Agent-Reach pass would), then push that enrichment back in.
#
# Usage:
#   1. Search Instagram via Agent-Reach for a region/niche, write the hits to
#      rows.json: [{ instagram_handle, display_name, location, ... }, ...]
#      (see import-hosts-local.mjs's row schema — only instagram_handle is
#      required, but display_name + location make the Maps lookup useful)
#   2. ./scripts/research-hosts.sh rows.json
#
# Requires:
#   - The google-maps-scraper-kit running locally:
#       cd ~/agents/google-maps-scraper-kit && docker compose up -d
#   - CONVEX_URL and LOCAL_IMPORT_SECRET in your environment (see the header
#     comment in import-hosts-local.mjs for how those are set)
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 rows.json" >&2
  exit 1
fi
ROWS="$1"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENRICHED="$(mktemp -t enriched-XXXX).json"

echo "== 1/3: importing raw Agent-Reach rows =="
node "$DIR/import-hosts-local.mjs" "$ROWS"

echo "== 2/3: enriching via Google Maps (~30-60s per host — this is the slow part) =="
python3 "$DIR/enrich-via-maps.py" "$ROWS" "$ENRICHED"

echo "== 3/3: pushing website/phone/email back onto the new prospects =="
node "$DIR/enrich-prospects-local.mjs" "$ENRICHED"

echo "Done. Enrichment cache left at: $ENRICHED"
