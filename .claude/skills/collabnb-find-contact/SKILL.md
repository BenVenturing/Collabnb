---
name: collabnb-find-contact
description: |
  Finds website, email and WhatsApp for Collabnb prospects (hotels/hosts or creators) that are missing them. Sources in order: the hotel's own website (curl, no Docker needed), then Google Maps via the local scraper kit (needs Docker), then Instagram captions. Use after an Agent-Reach import batch or against confirmed CRM prospects still missing details. Trigger on "find contact details", "enrich these", "backfill contact info", "find WhatsApp numbers", "run maps enrichment". Formerly collabnb-maps-enrich.
allowed-tools:
  - Bash(curl *)
  - Bash(python3 scripts/enrich-via-maps.py *)
  - Bash(node scripts/export-confirmed-for-enrichment.mjs *)
  - Bash(docker ps *)
  - Bash(docker compose *)
---

# Collabnb — find contact details

Fills `website`, `email` and `whatsapp` on prospects. The write step is documented
once in the **collabnb-crm-fill** skill. Use that skill; don't re-derive the write here.

## Targets

Use rows from a fresh import batch (`instagram_handle`, `display_name`, `location`).
For prospects already confirmed in the CRM, export the ones missing details:

```bash
cd app
CONVEX_URL=https://outgoing-anaconda-357.convex.cloud \
LOCAL_IMPORT_SECRET=$(npx convex env get LOCAL_IMPORT_SECRET --prod) \
node scripts/export-confirmed-for-enrichment.mjs targets.json [host]
```

## Source 1: the hotel website (default, no Docker)

1. Work out the domain. Use the row's `website` if it has one. Otherwise use the
   email domain, unless it's a free provider like gmail, yahoo or outlook.
2. Fetch the homepage and the contact page:
   ```bash
   for p in "" contact contact-us; do
     curl -sL -m 15 -A "Mozilla/5.0" "https://$DOMAIN/$p"
   done | grep -oiE '(wa\.me/|api\.whatsapp\.com/send\?phone=|whatsapp://send\?phone=)\+?[0-9]{8,15}' | sort -u
   ```
3. Normalise each match to digits only, with the country code (`62…` for Indonesia).
4. **The one-number rule:** save a WhatsApp number only when a single-property site
   shows exactly **one** distinct number.
   - If the site belongs to a group that lists many numbers (e.g. dijiwasanctuaries.com),
     skip it. Report it as "needs manual match: <hotel>, <domain>, N numbers".
   - If a single-property site shows two or more different numbers, skip it and report it the same way.
5. While the page is open, take any `mailto:` email or website URL that's missing.

## Source 2: Google Maps (only if Docker is installed and running)

Docker is **not** installed on Ben's Mac by default. Check with `docker ps` first. If that
fails, skip this source rather than trying to install Docker.

```bash
cd ~/agents/google-maps-scraper-kit && docker compose up -d
cd "<repo>/app" && python3 scripts/enrich-via-maps.py targets.json enriched.json
```

The script paces itself and saves after every row. Don't parallelise it, and don't run
it at the same time as another scrape. 20 to 50 targets take several minutes.

## Source 3: Instagram captions/bio (last resort)

If the real handle is known (`ig_handle`; to find it, see **collabnb-find-instagram**),
read the bio and recent captions with `opencli instagram user <handle> --limit 6 -f yaml`.
Do the agent-reach login check first. Apply the same one-number rule.
Never batch the `instagram_profile` scraper tool (about 15k tokens per call).

## Finish

- Write the results with **collabnb-crm-fill**. Existing values are never overwritten.
- Report: rows checked, fields found per source, the `updated` count, and the manual-match list.
