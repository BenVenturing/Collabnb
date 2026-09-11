// Scans the root marketing site (static multi-page HTML, not a module graph,
// so knip doesn't apply here) for:
//   1. asset files under assets/ and public/ that no source file references
//   2. root-level .html files missing from vite.config.js's build input
//      (i.e. not built into dist/, so not served in production)
// Report only — never deletes anything. Run with:
//   node scripts/audit-marketing-assets.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const EXCLUDE_DIRS = new Set([
  "node_modules", "dist", "dev-dist", ".git", ".vercel", ".vite", ".claude",
  ".agents", "Collabnb App May 10th",
]);

const ASSET_DIRS = ["assets", "public", "pricing/src", "pricing/public"];
const ASSET_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico",
  ".mp3", ".mp4", ".woff", ".woff2", ".ttf",
]);
const CORPUS_EXT = new Set([
  ".html", ".css", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".xml", ".webmanifest",
]);
// Domain/search-console verification files: referenced only by the external
// service hitting the URL directly, never linked from within the site.
const VERIFICATION_NAME = /^google[0-9a-f]+$|^[0-9a-f-]{20,}$/i;
const ALWAYS_SKIP = new Set(["robots.txt", "sitemap.xml", "site.webmanifest", ".DS_Store"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (EXCLUDE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const allFiles = walk(root);

// ── Build the text corpus (everything a reference could live in) ──────────
let corpus = "";
for (const f of allFiles) {
  if (CORPUS_EXT.has(extname(f)) && basename(f) !== "package-lock.json" && basename(f) !== "skills-lock.json") {
    try { corpus += readFileSync(f, "utf8") + "\n"; } catch {}
  }
}

// ── 1. Orphaned assets ─────────────────────────────────────────────────────
const orphans = [];
const skippedVerification = [];
for (const dir of ASSET_DIRS) {
  const abs = join(root, dir);
  try { statSync(abs); } catch { continue; }
  for (const f of walk(abs)) {
    const name = basename(f);
    if (!ASSET_EXT.has(extname(f).toLowerCase())) continue;
    if (ALWAYS_SKIP.has(name)) continue;
    const stem = name.replace(extname(name), "");
    if (VERIFICATION_NAME.test(stem)) { skippedVerification.push(relative(root, f)); continue; }
    if (!corpus.includes(name)) orphans.push(relative(root, f));
  }
}

// ── 2. HTML pages not in the Vite build input ──────────────────────────────
const viteConfig = readFileSync(join(root, "vite.config.js"), "utf8");
const rootHtmlFiles = readdirSync(root).filter((f) => f.endsWith(".html"));
const unbuiltPages = rootHtmlFiles.filter((f) => !viteConfig.includes(`'${f}'`) && !viteConfig.includes(`"${f}"`));
// publicDir ('public/') is copied to dist verbatim regardless of build input,
// so a root file shadowed by an identical name in public/ is dead weight
// (the public/ copy is what actually ships), not a missing page.
const deadDuplicates = unbuiltPages.filter((f) => { try { statSync(join(root, "public", f)); return true; } catch { return false; } });
const missingPages = unbuiltPages.filter((f) => !deadDuplicates.includes(f));

// ── Report ───────────────────────────────────────────────────────────────
console.log(`Unreferenced assets (${orphans.length})`);
for (const f of orphans) console.log(`  ${f}`);
console.log(`\nHTML pages not in vite.config.js build input, not served (${missingPages.length})`);
for (const f of missingPages) console.log(`  ${f}`);
console.log(`\nRoot HTML files shadowed by an identical name in public/ — the public/ copy ships, this root copy is dead (${deadDuplicates.length})`);
for (const f of deadDuplicates) console.log(`  ${f}`);
if (skippedVerification.length) {
  console.log(`\nSkipped as verification/meta files (not flagged): ${skippedVerification.join(", ")}`);
}
