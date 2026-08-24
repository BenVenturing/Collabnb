const fs = require('fs');
const [,, file, ns] = process.argv;
const jsonPath = `src/i18n/locales/en/${ns}.json`;
if (!fs.existsSync(jsonPath)) { console.log(`MISSING JSON: ${jsonPath}`); process.exit(1); }
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const src = fs.readFileSync(file, 'utf8');
function getPath(obj, keyPath) {
  return keyPath.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}
const keys = new Set();
const re = /\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g;
let m;
while ((m = re.exec(src))) keys.add(m[1]);
const missing = [...keys].filter((k) => {
  const v = getPath(json, k);
  if (v !== undefined) return false;
  const parts = k.split('.');
  const last = parts.pop();
  const parent = getPath(json, parts.join('.')) || json;
  return !(parent && (parent[`${last}_one`] !== undefined || parent[`${last}_other`] !== undefined));
});
console.log(`${file} [${ns}] - ${keys.size} keys used, ${missing.length} missing:`, missing);
