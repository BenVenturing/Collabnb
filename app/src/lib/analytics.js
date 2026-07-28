/*
 * Collabnb first-party analytics — the React app.
 * Shares the `cnb_sid` session cookie with the marketing site (same
 * .collabnb.com domain) and POSTs to the same Convex /track endpoint, so a
 * visitor's marketing journey and their in-app behavior are one session.
 * SPA-aware: pageviews fire on route change; dwell + exit are measured per
 * route. See public/collabnb-analytics.js for the marketing-site twin.
 */

const ENDPOINT =
  (import.meta.env.VITE_CONVEX_URL || '').replace('.convex.cloud', '.convex.site') + '/track';
const SURFACE = 'app';

function cookieDomain() {
  const h = location.hostname;
  if (h === 'localhost' || /^[0-9.]+$/.test(h)) return null;
  const parts = h.split('.');
  return parts.length >= 2 ? '.' + parts.slice(-2).join('.') : h;
}
function getCookie(name) {
  const m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
  return m ? decodeURIComponent(m[1]) : null;
}
function setCookie(name, value, days) {
  const d = cookieDomain();
  const exp = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; samesite=lax${d ? '; domain=' + d : ''}`;
}

function device() {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
  return 'desktop';
}

let sid = getCookie('cnb_sid');
if (!sid) {
  sid = 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
setCookie('cnb_sid', sid, 365);

// First-touch meta: prefer what the marketing site captured; otherwise this is
// a direct-to-app entry, so derive it here.
let meta;
try { meta = JSON.parse(getCookie('cnb_ftouch') || 'null'); } catch { meta = null; }
if (!meta) {
  meta = {
    landingPage: location.pathname,
    referrer: document.referrer || undefined,
    source: document.referrer ? undefined : 'direct',
    device: device(),
  };
}
let metaSent = false;

let userId;
let userEmail;
const queue = [];

function send(useBeacon) {
  if (!queue.length || !ENDPOINT.startsWith('http')) return;
  const events = queue.splice(0, queue.length);
  const body = JSON.stringify({
    sessionId: sid,
    surface: SURFACE,
    userId,
    userEmail,
    meta: metaSent ? undefined : meta,
    events,
  });
  metaSent = true;
  try {
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' }));
    } else {
      fetch(ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } });
    }
  } catch { /* telemetry never throws */ }
}
function push(ev) { ev.ts = Date.now(); queue.push(ev); if (queue.length >= 12) send(false); }

// ── Per-route dwell / scroll ──
let curPath = null;
let pageEnter = 0;
let maxScroll = 0;
function scrollPct() {
  const h = document.documentElement;
  const scrollable = h.scrollHeight - h.clientHeight;
  if (scrollable <= 0) return 0;
  return Math.min(100, Math.round((h.scrollTop || window.scrollY) / scrollable * 100));
}
function closeCurrentPage() {
  if (!curPath) return;
  push({ type: 'exit', path: curPath, dwellMs: Date.now() - pageEnter, scrollPct: maxScroll });
}

let started = false;
export function initAnalytics() {
  if (started) return;
  started = true;

  setInterval(() => send(false), 5000);

  document.addEventListener('click', (e) => {
    const t = e.target.closest?.('[data-track]');
    let label = t?.getAttribute('data-track');
    if (!label) {
      const a = e.target.closest?.('a, button, [role="button"]');
      if (a) {
        label = (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim();
        if (a.tagName === 'A' && a.getAttribute('href')) {
          try {
            const u = new URL(a.href, location.href);
            const dest = u.origin === location.origin ? u.pathname : u.hostname + u.pathname;
            label = (label ? label + ' → ' : '') + dest;
          } catch { /* noop */ }
        }
      }
    }
    if (label) push({ type: 'click', path: curPath || location.pathname, target: label.slice(0, 60) });
  }, true);

  let tick;
  window.addEventListener('scroll', () => {
    if (tick) return;
    tick = setTimeout(() => {
      tick = null;
      const p = scrollPct();
      if (p > maxScroll + 4) { maxScroll = p; push({ type: 'scroll', path: curPath || location.pathname, scrollPct: p }); }
    }, 400);
  }, { passive: true });

  const flush = () => { closeCurrentPage(); send(true); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);
}

export function trackPageview(path) {
  if (path === curPath) return;
  closeCurrentPage();
  curPath = path;
  pageEnter = Date.now();
  maxScroll = 0;
  push({ type: 'pageview', path });
}

export function setAnalyticsUser(id, email) {
  const changed = id && id !== userId;
  userId = id || userId;
  userEmail = email || userEmail;
  if (changed) send(false); // flush so the session row attributes to this user
}
