#!/usr/bin/env node
// Import a cleaned Google Maps sweep into prospects (Confirmed column, region tag).
//   node scripts/import-maps-hotels-local.mjs rows.json --region LBK [--tag YUKOLAB]
// Row shape: { handle, name, location?, country?, niche?, email?, whatsapp?, website?, ig_handle?, notes? }
// Env: CONVEX_URL, LOCAL_IMPORT_SECRET.
import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const i = args.indexOf("--region");
const regionTag = i === -1 ? undefined : args[i + 1];
const ti = args.indexOf("--tag");
const extraTags = ti === -1 ? undefined : [args[ti + 1]];
const { CONVEX_URL, LOCAL_IMPORT_SECRET: secret } = process.env;
if (!CONVEX_URL || !secret || !regionTag) { console.error("Set CONVEX_URL and LOCAL_IMPORT_SECRET, and pass --region LBK|BALI."); process.exit(1); }

const rows = JSON.parse(readFileSync(args[0], "utf8"));
const client = new ConvexHttpClient(CONVEX_URL);
const total = { inserted: 0, skipped: 0 };
for (let n = 0; n < rows.length; n += 100) {
  const r = await client.mutation("prospects:importMapsHotelsLocal", { secret, regionTag, extraTags, rows: rows.slice(n, n + 100) });
  total.inserted += r.inserted; total.skipped += r.skipped;
}
console.log(total);
