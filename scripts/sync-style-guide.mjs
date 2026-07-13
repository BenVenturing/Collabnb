// Syncs BLOG_STYLE_GUIDE.md into app/convex/styleGuide.ts so Convex actions
// can embed the guide in prompts. Run after editing the markdown:
//   node scripts/sync-style-guide.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const md = readFileSync(join(root, "BLOG_STYLE_GUIDE.md"), "utf8");

const escaped = md.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

const out = `// GENERATED FILE — do not edit by hand.
// Source: BLOG_STYLE_GUIDE.md (repo root). Regenerate with:
//   node scripts/sync-style-guide.mjs

export const STYLE_GUIDE = \`${escaped}\`;
`;

writeFileSync(join(root, "app", "convex", "styleGuide.ts"), out);
console.log("Wrote app/convex/styleGuide.ts from BLOG_STYLE_GUIDE.md");
