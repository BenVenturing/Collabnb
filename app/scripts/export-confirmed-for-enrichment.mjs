#!/usr/bin/env node
// Pulls already-confirmed prospects (any CRM stage past 'new') that are still
// missing a website or email, shaped for enrich-via-maps.py's targets.json
// input — the "run on my already-confirmed users" entry point, as opposed to
// enriching a fresh batch straight off a search/import.
//
// Usage:
//   node scripts/export-confirmed-for-enrichment.mjs targets.json [host|creator]
//   python3 scripts/enrich-via-maps.py targets.json enriched.json
//   node scripts/enrich-prospects-local.mjs enriched.json
//
// Requires env vars:
//   CONVEX_URL           e.g. https://outgoing-anaconda-357.convex.cloud (prod)
//   LOCAL_IMPORT_SECRET  must match: npx convex env set LOCAL_IMPORT_SECRET <value>

import { ConvexHttpClient } from "convex/browser";
import { writeFileSync } from "node:fs";

const CONVEX_URL = process.env.CONVEX_URL;
const SECRET = process.env.LOCAL_IMPORT_SECRET;

if (!CONVEX_URL || !SECRET) {
  console.error("Set CONVEX_URL and LOCAL_IMPORT_SECRET in your environment first (see comments at the top of this file).");
  process.exit(1);
}

const outPath = process.argv[2] || "targets.json";
const kind = process.argv[3];

const client = new ConvexHttpClient(CONVEX_URL);
const rows = await client.query("prospects:getConfirmedForEnrichmentLocal", { secret: SECRET, kind });
writeFileSync(outPath, JSON.stringify(rows, null, 2));
console.log(`Wrote ${rows.length} confirmed-but-missing-contact targets to ${outPath}`);
