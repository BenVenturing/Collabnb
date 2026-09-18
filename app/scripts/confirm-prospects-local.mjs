#!/usr/bin/env node
// Promotes already-imported 'new' prospects straight to the CRM's Confirmed
// column, matched by handle — the local-secret counterpart to "Build fresh
// 20" in the dashboard, for when there's no live admin login handy. Hosts
// get a drafted outreach DM (same treatment as the dashboard button);
// creators just get queued.
//
// Usage:
//   node scripts/confirm-prospects-local.mjs handles.json host
//   node scripts/confirm-prospects-local.mjs handles.json creator
//   cat handles.json | node scripts/confirm-prospects-local.mjs - host
//
// handles.json: a JSON array of instagram_handle strings, e.g.
//   ["somehotel", "anotherhotel"]
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

const kind = process.argv[3];
if (kind !== "host" && kind !== "creator") {
  console.error("Usage: node scripts/confirm-prospects-local.mjs handles.json <host|creator>");
  process.exit(1);
}

function readInput() {
  const filePath = process.argv[2];
  const raw = filePath && filePath !== "-" ? readFileSync(filePath, "utf8") : readFileSync(0, "utf8");
  const handles = JSON.parse(raw);
  if (!Array.isArray(handles)) throw new Error("Input must be a JSON array of instagram_handle strings.");
  return handles;
}

const handles = readInput();
const client = new ConvexHttpClient(CONVEX_URL);
const result = await client.action("prospects:confirmProspectsLocal", { secret: SECRET, handles, kind });
console.log(`Confirmed ${result.confirmed} of ${handles.length} (${result.skipped} skipped — already confirmed or not found).`);
