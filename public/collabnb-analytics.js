/*
 * Collabnb first-party analytics — marketing site (static HTML).
 * Zero dependencies. Tracks pageviews, clicks, first-click, scroll depth,
 * dwell time and exit page, plus first-touch UTM / referrer attribution.
 * Batches events and POSTs them to the Convex /track HTTP action. The app
 * (React) reuses the same session cookie + endpoint so funnels stitch across
 * the marketing site and the logged-in app.
 *
 * Also renders the small cookie-notice card (bottom-left).
 */
(function () {
  'use strict';
  if (window.__cnbAnalytics) return;
  window.__cnbAnalytics = true;

  var ENDPOINT = window.COLLABNB_TRACK_URL || 'https://outgoing-anaconda-357.convex.site/track';
  var SURFACE = 'marketing';

  // ── Session cookie (shared across .collabnb.com so the app sees it too) ──
  function cookieDomain() {
    var h = location.hostname;
    if (h === 'localhost' || /^[0-9.]+$/.test(h)) return null;
    var parts = h.split('.');
    return parts.length >= 2 ? '.' + parts.slice(-2).join('.') : h;
  }
  function getCookie(name) {
    var m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
    return m ? decodeURIComponent(m[1]) : null;
  }
  function setCookie(name, value, days) {
    var d = cookieDomain();
    var exp = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + exp +
      '; path=/; samesite=lax' + (d ? '; domain=' + d : '');
  }
  var sid = getCookie('cnb_sid');
  var isNewSession = false;
  if (!sid) {
    sid = 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    isNewSession = true;
  }
  setCookie('cnb_sid', sid, 365); // refresh sliding 1-year window

  // ── First-touch attribution ──
  function deriveSource(ref, utmSource) {
    if (utmSource) return utmSource;
    if (!ref) return 'direct';
    try {
      var host = new URL(ref).hostname.replace(/^www\./, '');
      if (host.indexOf(location.hostname) !== -1) return null; // internal
      var map = [['google', 'google'], ['instagram', 'instagram'], ['tiktok', 'tiktok'],
        ['facebook', 'facebook'], ['fb.', 'facebook'], ['youtube', 'youtube'], ['youtu.be', 'youtube'],
        ['t.co', 'twitter'], ['twitter', 'twitter'], ['x.com', 'twitter'], ['linkedin', 'linkedin'],
        ['bing', 'bing'], ['reddit', 'reddit'], ['pinterest', 'pinterest']];
      for (var i = 0; i < map.length; i++) if (host.indexOf(map[i][0]) !== -1) return map[i][1];
      return host;
    } catch (e) { return 'other'; }
  }
  function device() {
    var ua = navigator.userAgent;
    if (/iPad|Tablet/i.test(ua)) return 'tablet';
    if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
    return 'desktop';
  }
  var params = new URLSearchParams(location.search);
  var utm = {
    utmSource: params.get('utm_source') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
    utmTerm: params.get('utm_term') || undefined,
    utmContent: params.get('utm_content') || undefined,
  };
  var meta = {
    landingPage: location.pathname,
    referrer: document.referrer || undefined,
    source: deriveSource(document.referrer, utm.utmSource) || undefined,
    device: device(),
    utmSource: utm.utmSource, utmMedium: utm.utmMedium, utmCampaign: utm.utmCampaign,
    utmTerm: utm.utmTerm, utmContent: utm.utmContent,
  };
  // Persist first-touch so the app can attribute even after the query string is gone.
  if (isNewSession) { try { setCookie('cnb_ftouch', JSON.stringify(meta), 365); } catch (e) {} }

  // ── Event queue + flush ──
  var queue = [];
  var metaSent = false;
  function send(useBeacon) {
    if (!queue.length) return;
    var batch = queue.splice(0, queue.length);
    var body = JSON.stringify({
      sessionId: sid, surface: SURFACE,
      meta: metaSent ? undefined : meta,
      events: batch,
    });
    metaSent = true;
    try {
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' }));
      } else {
        fetch(ENDPOINT, { method: 'POST', body: body, keepalive: true, headers: { 'Content-Type': 'text/plain' } });
      }
    } catch (e) {}
  }
  function push(ev) { ev.ts = Date.now(); queue.push(ev); if (queue.length >= 12) send(false); }
  setInterval(function () { send(false); }, 5000);

  // ── Pageview + dwell ──
  var pageEnter = Date.now();
  push({ type: 'pageview', path: location.pathname });

  // ── Clicks ──
  function clickLabel(el) {
    var t = el.closest('[data-track]');
    if (t && t.getAttribute('data-track')) return t.getAttribute('data-track').slice(0, 60);
    var a = el.closest('a, button, [role="button"]');
    if (!a) return null;
    var text = (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim();
    if (a.tagName === 'A' && a.getAttribute('href')) {
      try {
        var u = new URL(a.href, location.href);
        var dest = (u.origin === location.origin ? u.pathname : u.hostname + u.pathname);
        return (text ? text + ' → ' : '') + dest;
      } catch (e) {}
    }
    return text ? text.slice(0, 60) : (a.tagName.toLowerCase());
  }
  document.addEventListener('click', function (e) {
    var label = clickLabel(e.target);
    if (label) push({ type: 'click', path: location.pathname, target: label });
  }, true);

  // ── Scroll depth ──
  var maxScroll = 0;
  function scrollPct() {
    var h = document.documentElement;
    var scrollable = h.scrollHeight - h.clientHeight;
    if (scrollable <= 0) return 100;
    return Math.min(100, Math.round((h.scrollTop || window.scrollY) / scrollable * 100));
  }
  var scrollTick;
  window.addEventListener('scroll', function () {
    if (scrollTick) return;
    scrollTick = setTimeout(function () {
      scrollTick = null;
      var p = scrollPct();
      if (p > maxScroll + 4) { maxScroll = p; push({ type: 'scroll', path: location.pathname, scrollPct: p }); }
    }, 400);
  }, { passive: true });

  // ── Exit ──
  function flushExit() {
    push({ type: 'exit', path: location.pathname, dwellMs: Date.now() - pageEnter, scrollPct: maxScroll });
    send(true);
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flushExit(); });
  window.addEventListener('pagehide', flushExit);

  // ── Cookie notice card ──────────────────────────────────────────────────
  // Cookie glyph — matches the platform's line-icon style (1.6 stroke, currentColor).
  var COOKIE_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5z"/><circle cx="8.5" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="13" cy="14.5" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r=".8" fill="currentColor" stroke="none"/><circle cx="15" cy="10.5" r=".8" fill="currentColor" stroke="none"/></svg>';
  if (localStorage.getItem('cnb_cookie_ack') !== '1') {
    var mount = function () {
      var style = document.createElement('style');
      style.textContent =
        '.cnb-cookie{position:fixed;left:1rem;bottom:1rem;z-index:99998;max-width:320px;' +
        'background:#F7F5F2;border:1px solid rgba(25,37,36,.1);border-radius:14px;' +
        'box-shadow:0 8px 30px rgba(25,37,36,.14);padding:14px 16px;' +
        "font-family:'Satoshi',-apple-system,system-ui,sans-serif;color:#192524;" +
        'animation:cnbCookieIn .5s cubic-bezier(.16,1,.3,1) both}' +
        '@keyframes cnbCookieIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}' +
        '.cnb-cookie__row{display:flex;gap:10px;align-items:flex-start}' +
        '.cnb-cookie__ic{flex:0 0 auto;color:#3C5759;margin-top:1px}' +
        '.cnb-cookie h4{margin:0 0 3px;font-size:.9rem;font-weight:700;letter-spacing:-.01em}' +
        '.cnb-cookie p{margin:0;font-size:.78rem;line-height:1.45;color:#3C5759}' +
        '.cnb-cookie a{color:#192524;font-weight:600;text-decoration:underline;text-underline-offset:2px}' +
        '.cnb-cookie__act{display:flex;gap:8px;align-items:center;margin-top:11px;justify-content:flex-end}' +
        '.cnb-cookie__btn{border:0;cursor:pointer;font:inherit;font-size:.78rem;font-weight:700;' +
        'padding:7px 16px;border-radius:99px;background:#192524;color:#F7F5F2;transition:transform .15s}' +
        '.cnb-cookie__btn:hover{transform:translateY(-1px)}';
      document.head.appendChild(style);
      var box = document.createElement('div');
      box.className = 'cnb-cookie';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', 'Cookie notice');
      box.innerHTML =
        '<div class="cnb-cookie__row">' +
          '<span class="cnb-cookie__ic">' + COOKIE_SVG + '</span>' +
          '<div><h4>We use cookies</h4><p>We use first-party cookies to see how Collabnb is used ' +
          'so we can make it better. No ads, no selling your data. ' +
          '<a href="/faq.html#cookies">Learn more</a>.</p></div>' +
        '</div>' +
        '<div class="cnb-cookie__act"><button class="cnb-cookie__btn" type="button">Got it</button></div>';
      box.querySelector('button').addEventListener('click', function () {
        localStorage.setItem('cnb_cookie_ack', '1');
        box.style.opacity = '0'; box.style.transform = 'translateY(14px)';
        box.style.transition = 'all .3s'; setTimeout(function () { box.remove(); }, 320);
      });
      document.body.appendChild(box);
    };
    if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  }
})();
