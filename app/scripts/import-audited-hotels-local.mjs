#!/usr/bin/env node
// Pushes hotels that already have a Collabnb audit PDF into the CRM: new ones
// land in Confirmed, starred + target so they sit at the top of the board;
// existing ones keep their stage and only gain blank fields plus the notes.
//
// Usage:
//   export CONVEX_URL=https://outgoing-anaconda-357.convex.cloud
//   export LOCAL_IMPORT_SECRET=$(npx convex env get LOCAL_IMPORT_SECRET --prod)
//   node scripts/import-audited-hotels-local.mjs ../outreach/audited-hotels.json

import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "node:fs";

const CONVEX_URL = process.env.CONVEX_URL;
const SECRET = process.env.LOCAL_IMPORT_SECRET;
if (!CONVEX_URL || !SECRET) {
  console.error("Set CONVEX_URL and LOCAL_IMPORT_SECRET first (see comments at the top of this file).");
  process.exit(1);
}

const rows = JSON.parse(readFileSync(process.argv[2], "utf8"));
const client = new ConvexHttpClient(CONVEX_URL);
const result = await client.mutation("prospects:upsertAuditedHotelsLocal", { secret: SECRET, rows });
console.log(`Inserted ${result.inserted}, updated ${result.updated} of ${rows.length} hotels.`);
