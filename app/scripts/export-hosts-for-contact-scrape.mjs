#!/usr/bin/env node
// Writes targets.json for find-decision-makers.py: every host with a website
// that still has no named decision-maker or marketing email.
//
// Usage:
//   node scripts/export-hosts-for-contact-scrape.mjs targets.json
//
// Requires env vars: CONVEX_URL, LOCAL_IMPORT_SECRET (see enrich-prospects-local.mjs)

import { ConvexHttpClient } from "convex/browser";
import { writeFileSync } from "node:fs";

const CONVEX_URL = process.env.CONVEX_URL;
const SECRET = process.env.LOCAL_IMPORT_SECRET;

if (!CONVEX_URL || !SECRET) {
  console.error("Set CONVEX_URL and LOCAL_IMPORT_SECRET in your environment first.");
  process.exit(1);
}

const out = process.argv[2] || "targets.json";
const client = new ConvexHttpClient(CONVEX_URL);
const rows = await client.query("prospects:getHostsForContactScrapeLocal", { secret: SECRET });
writeFileSync(out, JSON.stringify(rows, null, 2));
console.log(`Wrote ${rows.length} hosts to ${out}.`);
