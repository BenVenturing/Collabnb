#!/usr/bin/env node
// Bulk-import hotels from a purchased/exported list into the prospects table.
//   node scripts/import-hotels-local.mjs hotels.json --source-tag HC --source hotelcreators [--tag-existing]
// Row shape: { handle, name, country, location, emails[], contact_url?, contacted: 'no'|'sent'|'opened'|'clicked', followup_sent, sent_at? }
// Env: CONVEX_URL, LOCAL_IMPORT_SECRET (same as import-hosts-local.mjs).
// A different vendor's list gets its own --source-tag / --source (and a legend entry in PROSPECT_TAGS).
import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i === -1 ? undefined : args[i + 1]; };
const { CONVEX_URL, LOCAL_IMPORT_SECRET: secret } = process.env;
if (!CONVEX_URL || !secret) { console.error("Set CONVEX_URL and LOCAL_IMPORT_SECRET first."); process.exit(1); }

const rows = JSON.parse(readFileSync(args[0], "utf8"));
const client = new ConvexHttpClient(CONVEX_URL);
let total = { inserted: 0, skipped: 0, taggedExisting: 0 };
for (let i = 0; i < rows.length; i += 100) {
  const r = await client.mutation("prospects:importHotelsLocal", {
    secret, sourceTag: flag("--source-tag"), source: flag("--source"),
    rows: rows.slice(i, i + 100), tagExisting: args.includes("--tag-existing") && i === 0,
  });
  for (const k in total) total[k] += r[k];
}
console.log(total);
