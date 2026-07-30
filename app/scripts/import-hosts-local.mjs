#!/usr/bin/env node
// Push a batch of host-listing rows into Collabnb's prospects table (source
// "agent-reach" — or anywhere else the data came from: a local Agent-Reach
// search run by a live agent session, manual research, a CSV, etc). This
// script is provider-agnostic: it just needs a JSON array of rows.
//
// Usage:
//   node scripts/import-hosts-local.mjs rows.json
//   cat rows.json | node scripts/import-hosts-local.mjs
//
// Each row: { instagram_handle, display_name?, follower_count?, location?,
//             niche?, bio?, website?, email?, avatar_url?, country? }
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
const result = await client.mutation("prospects:importHostsLocal", { secret: SECRET, rows });
console.log(`Inserted ${result.inserted} of ${rows.length} rows into the host pool.`);
