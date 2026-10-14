#!/usr/bin/env node
// Pushes find-decision-makers.py output into Convex. Never overwrites a field
// that's already set. Debug keys (_emails, _people, ...) stay local.
//
// Usage:
//   node scripts/push-decision-makers-local.mjs found.json
//
// Requires env vars: CONVEX_URL, LOCAL_IMPORT_SECRET (see enrich-prospects-local.mjs)

import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "node:fs";

const CONVEX_URL = process.env.CONVEX_URL;
const SECRET = process.env.LOCAL_IMPORT_SECRET;

if (!CONVEX_URL || !SECRET) {
  console.error("Set CONVEX_URL and LOCAL_IMPORT_SECRET in your environment first.");
  process.exit(1);
}

const FIELDS = ["instagram_handle", "decision_maker_name", "decision_maker_role", "marketing_email", "whatsapp", "contact_url"];
const rows = JSON.parse(readFileSync(process.argv[2] || "found.json", "utf8"))
  .filter((r) => !r._error)
  .map((r) => Object.fromEntries(FIELDS.filter((f) => r[f]).map((f) => [f, r[f]])))
  .filter((r) => Object.keys(r).length > 1);

const client = new ConvexHttpClient(CONVEX_URL);
const result = await client.mutation("prospects:enrichDecisionMakerLocal", { secret: SECRET, rows });
console.log(`Updated ${result.updated} of ${rows.length} rows with findings.`);
