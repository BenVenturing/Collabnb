// Check the actual build output without contacting production or writing user data.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { JSDOM } from 'jsdom';
import { gzipSync } from 'node:zlib';

const root = resolve('dist');
const origin = 'https://www.collabnb.com';
const errors = [];
const pages = [];
for (const folder of [root, join(root, 'pricing')]) {
  if (!existsSync(folder)) throw new Error('Build output missing. Run npm run build first.');
  for (const name of readdirSync(folder)) {
    if (name.endsWith('.html')) pages.push(join(folder, name));
  }
}
const redirects = readFileSync(join(root, '_redirects'), 'utf8').split('\n')
  .filter((line) => line.trim() && !line.startsWith('#'))
  .map((line) => line.trim().split(/\s+/)[0]);
const matches = (pattern, path) => new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*')}$`).test(path);
function resolves(path) {
  const local = resolve(root, `.${decodeURIComponent(path)}`);
  if (!local.startsWith(`${root}/`) && local !== root) return false;
  if ([local, `${local}.html`, join(local, 'index.html')].some((p) => existsSync(p) && statSync(p).isFile())) return true;
  if (redirects.some((pattern) => matches(pattern, path))) return existsSync(join(root, 'app/index.html'));
  // These public pages are rendered by Cloudflare Pages Functions.
  return ['/blog', '/sitemap-blog.xml'].includes(path)
    && existsSync(resolve('functions', `${path.slice(1)}.js`));
}

let references = 0;
for (const file of pages) {
  const name = relative(root, file);
  const url = new URL(name, `${origin}/`);
  const dom = new JSDOM(readFileSync(file, 'utf8'), { url: url.href });
  const { document } = dom.window;
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical && new URL(canonical.href).origin !== origin) errors.push(`${name}: canonical must use ${origin}`);
  for (const el of document.querySelectorAll('a[href], script[src], link[href], img[src], video[src], audio[src], source[src]')) {
    const raw = el.getAttribute('href') ?? el.getAttribute('src');
    if (!raw || raw.startsWith('#') || /^(mailto:|tel:|javascript:|data:|blob:)/i.test(raw)) continue;
    const target = new URL(raw, url);
    if (![origin, 'https://collabnb.com'].includes(target.origin)) continue;
    references++;
    if (!resolves(target.pathname)) errors.push(`${name}: missing local destination ${raw}`);
  }
  dom.window.close();
}
const sitemap = new JSDOM(readFileSync(join(root, 'sitemap.xml'), 'utf8'), { contentType: 'text/xml' });
for (const el of sitemap.window.document.querySelectorAll('loc')) {
  const url = new URL(el.textContent);
  if (url.origin !== origin || !resolves(url.pathname)) errors.push(`sitemap.xml: invalid canonical destination ${url.href}`);
}
sitemap.window.close();
if (!readFileSync(join(root, 'robots.txt'), 'utf8').includes(`Sitemap: ${origin}/sitemap.xml`)) {
  errors.push('robots.txt: missing canonical sitemap URL');
}
if (!existsSync(join(root, 'app/index.html'))) errors.push('App build missing');

// Follow static imports, excluding features fetched after user interaction.
// These budgets catch Mapbox or the full translation registry being accidentally
// pulled back into the marketing pages' initial module graphs.
const manifest = JSON.parse(readFileSync(join(root, '.vite/manifest.json'), 'utf8'));
function staticModules(entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  if (!manifest[entry]) throw new Error(`Missing build entry: ${entry}`);
  seen.add(entry);
  for (const dependency of manifest[entry].imports || []) staticModules(dependency, seen);
  return seen;
}
for (const [entry, limit] of [['how-it-works.html', 200_000], ['pricing/calculator.html', 300_000]]) {
  const modules = staticModules(entry);
  const files = [...modules].map((key) => manifest[key].file).filter((file) => file.endsWith('.js'));
  const buffers = files.map((file) => readFileSync(join(root, file)));
  const bytes = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
  const gzipBytes = buffers.reduce((sum, buffer) => sum + gzipSync(buffer).length, 0);
  console.log(`${entry}: static JS ${(bytes / 1000).toFixed(1)} kB (${(gzipBytes / 1000).toFixed(1)} kB gzip); budget ${limit / 1000} kB`);
  if (bytes > limit) errors.push(`${entry}: initial static JS exceeds ${limit / 1000} kB budget`);
  if (entry === 'how-it-works.html' && modules.has('scripts/globe-map.js')) {
    errors.push('Mapbox must remain a dynamic import, loaded when the map is opened');
  }
}
if (errors.length) {
  console.error([...new Set(errors)].join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Passed: ${pages.length} built HTML pages, ${references} local references, app output, canonical hosts, sitemap and robots.`);
}
