#!/usr/bin/env node
// Pushes website/email/whatsapp backfills onto prospects that already exist
// (matched by handle) — the companion to enrich-via-maps.py, which resolves
// that contact info through the local Google Maps scraper kit without ever
// touching Instagram. Never overwrites a field that's already set.
//
// Usage:
//   python3 scripts/enrich-via-maps.py targets.json enriched.json
//   node scripts/enrich-prospects-local.mjs enriched.json
//
// Each row: { instagram_handle, website?, email?, whatsapp? }
//
// Requires env vars:
//   CONVEX_URL           e.g. https://outgoing-anaconda-357.convex.cloud (prod)
//   LOCAL_IMPORT_SECRET  must match: npx convex env set LOCAL_IMPORT_SECRET <value>

import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "node:fs";

const CONVEX_URL = process.env.CONVEX_URL;
const SECRET = process.env.LOCAL_IMPORT_SECRET;

if (!CONVEX_URL || !SECRET) {
  console.error("Set CONVEX_URL and LOCAL_IMPORT_SECRET in your environment first (see comments at the top of this file).");
  process.exit(1);
}

function readInput() {
  const filePath = process.argv[2];
  const raw = filePath ? readFileSync(filePath, "utf8") : readFileSync(0, "utf8");
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows)) throw new Error("Input must be a JSON array of row objects.");
  return rows;
}

const rows = readInput();
const client = new ConvexHttpClient(CONVEX_URL);
const result = await client.mutation("prospects:enrichProspectLocal", { secret: SECRET, rows });
console.log(`Updated ${result.updated} of ${rows.length} rows.`);
