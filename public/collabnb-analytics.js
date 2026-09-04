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
        '.cnb-cookie{position:fixed;left:.85rem;bottom:.85rem;z-index:99998;max-width:258px;' +
        'background:#F7F5F2;border:1px solid rgba(25,37,36,.1);border-radius:12px;' +
        'box-shadow:0 6px 22px rgba(25,37,36,.13);padding:11px 13px;' +
        "font-family:'Satoshi',-apple-system,system-ui,sans-serif;color:#192524;" +
        'animation:cnbCookieIn .5s cubic-bezier(.16,1,.3,1) both}' +
        '@keyframes cnbCookieIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}' +
        '.cnb-cookie__row{display:flex;gap:8px;align-items:center}' +
        '.cnb-cookie__ic{flex:0 0 auto;color:#3C5759;display:flex}' +
        '.cnb-cookie h4{margin:0;font-size:.82rem;font-weight:700;letter-spacing:-.01em}' +
        '.cnb-cookie p{margin:5px 0 0;font-size:.72rem;line-height:1.4;color:#3C5759}' +
        '.cnb-cookie__more{margin-top:7px;padding-top:7px;font-size:.7rem;line-height:1.45;' +
        'border-top:1px solid rgba(25,37,36,.08);display:none}' +
        '.cnb-cookie.is-open .cnb-cookie__more{display:block}' +
        '.cnb-cookie a{color:#192524;font-weight:600;text-decoration:underline;text-underline-offset:2px}' +
        '.cnb-cookie__act{display:flex;gap:8px;align-items:center;margin-top:9px;justify-content:space-between}' +
        '.cnb-cookie__link{border:0;background:none;cursor:pointer;font:inherit;font-size:.72rem;' +
        'font-weight:600;color:#3C5759;padding:0;text-decoration:underline;text-underline-offset:2px}' +
        '.cnb-cookie__btn{border:0;cursor:pointer;font:inherit;font-size:.72rem;font-weight:700;' +
        'padding:5px 14px;border-radius:99px;background:#192524;color:#F7F5F2;transition:transform .15s}' +
        '.cnb-cookie__btn:hover{transform:translateY(-1px)}';
      document.head.appendChild(style);
      var box = document.createElement('div');
      box.className = 'cnb-cookie';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', 'Cookie notice');
      box.innerHTML =
        '<div class="cnb-cookie__row"><span class="cnb-cookie__ic">' + COOKIE_SVG + '</span>' +
          '<h4>We use cookies</h4></div>' +
        '<p>First-party cookies to understand how Collabnb is used — so we can make it better.</p>' +
        '<div class="cnb-cookie__more">We use one cookie to remember your session and record which pages ' +
          'you visit, what you click, how long you stay, and where you leave. <strong>No ads. No selling ' +
          'your data. No third-party ad networks.</strong> Clear cookies anytime in your browser and ' +
          'Collabnb still works. <a href="/faq.html#cookies">More in the FAQ</a>.</div>' +
        '<div class="cnb-cookie__act">' +
          '<button class="cnb-cookie__link" type="button" data-toggle>Review</button>' +
          '<button class="cnb-cookie__btn" type="button" data-ack>Got it</button>' +
        '</div>';
      var autoTimer;
      var closed = false;
      function close() {
        if (closed) return;
        closed = true;
        clearTimeout(autoTimer);
        try { localStorage.setItem('cnb_cookie_ack', '1'); } catch (e) {}
        box.style.opacity = '0'; box.style.transform = 'translateY(12px)';
        box.style.transition = 'all .3s'; setTimeout(function () { box.remove(); }, 320);
        if (window.__cnbMusicSettle) window.__cnbMusicSettle();
      }
      box.querySelector('[data-toggle]').addEventListener('click', function () {
        clearTimeout(autoTimer); // engaged — cancel the auto-dismiss
        var open = box.classList.toggle('is-open');
        this.textContent = open ? 'Less' : 'Review';
      });
      box.querySelector('[data-ack]').addEventListener('click', close);
      // If it's just ignored (no interaction), fade it out after 10s.
      box.addEventListener('mouseenter', function () { clearTimeout(autoTimer); });
      autoTimer = setTimeout(close, 10000);
      document.body.appendChild(box);
    };
    if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  }

  // ── Background music widget (bottom-left, liquid glass) ──────────────────
  // Same track ids/order as the app's BackgroundMusicPlayer.jsx, same
  // localStorage keys — same origin, so a preference set here carries into
  // the logged-in app and back. Skipped on the auth-redirect pages.
  (function () {
    if (location.pathname === '/login.html' || location.pathname === '/sso-callback.html') return;

    var MUTE_KEY = 'collabnb_music_muted';
    var DISMISS_KEY = 'collabnb_music_dismissed';
    var TRACK_KEY = 'collabnb_music_track';
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    var TRACKS = [
      { id: 'undertow', title: 'Undertow', artist: 'Scott Buckley', src: '/audio/undertow.mp3', creditUrl: 'https://soundcloud.com/scottbuckley' },
      { id: 'rising-dawn', title: 'Rising Dawn', artist: 'Ethereal 88', src: '/audio/rising-dawn.mp3', creditUrl: 'https://ethereal88.bandcamp.com' },
      { id: 'sun-and-clouds', title: 'Sun And Clouds', artist: '| e s c p', src: '/audio/sun-and-clouds.mp3', creditUrl: 'https://www.escp.space' },
      { id: 'sunshine-day', title: 'Sunshine Day', artist: 'Mixaund', src: '/audio/sunshine-day.mp3', creditUrl: 'https://mixaund.bandcamp.com' },
      { id: 'island-breeze', title: 'Island Breeze', artist: 'Surf House Productions', src: '/audio/island-breeze.mp3', creditUrl: 'https://surf-house-productions.bandcamp.com' },
      { id: 'summer-car-ride', title: 'Summer Car Ride', artist: '| e s c p', src: '/audio/summer-car-ride.mp3', creditUrl: 'https://www.escp.space' },
    ];

    var SPEAKER_ON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17.5 8.5a5 5 0 0 1 0 7M20.5 6a9 9 0 0 1 0 12"/></svg>';
    var SPEAKER_OFF = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 5M22 9l-5 5"/></svg>';
    var NEXT_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4l10 8-10 8V4z"/><path d="M19 5v14"/></svg>';
    var CLOSE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';

    var trackIndex = (function () {
      var saved = parseInt(localStorage.getItem(TRACK_KEY), 10);
      return (saved >= 0 && saved < TRACKS.length) ? saved : 0;
    })();
    var muted = localStorage.getItem(MUTE_KEY) === '1';
    var playing = false;
    var needsGesture = false;
    var expanded = false;
    var wasPlayingBeforeHide = false;

    function mount() {
      var style = document.createElement('style');
      style.textContent =
        '@keyframes cnbMpEq0{0%,100%{height:3px}50%{height:10px}}' +
        '@keyframes cnbMpEq1{0%,100%{height:6px}50%{height:2px}}' +
        '@keyframes cnbMpEq2{0%,100%{height:4px}50%{height:9px}}' +
        '@keyframes cnbMpPulse{0%,100%{box-shadow:0 0 0 0 rgba(25,37,36,.14)}50%{box-shadow:0 0 0 7px rgba(25,37,36,0)}}' +
        '@keyframes cnbMpSheen{0%{transform:translateX(-55%);opacity:0}5%{opacity:.85}22%{transform:translateX(55%);opacity:0}100%{transform:translateX(55%);opacity:0}}' +
        '.cnb-mp-wrap{position:fixed;left:.85rem;z-index:99997;font-family:"Satoshi",-apple-system,system-ui,sans-serif;transition:bottom .4s cubic-bezier(.16,1,.3,1)}' +
        '.cnb-mp-glass{position:relative;overflow:hidden;background-color:rgba(255,255,255,.40);' +
        'background-image:radial-gradient(circle at 30% 15%,rgba(255,255,255,.95),rgba(255,255,255,0) 46%);' +
        '-webkit-backdrop-filter:blur(28px) saturate(180%) brightness(1.08);backdrop-filter:blur(28px) saturate(180%) brightness(1.08);' +
        'border:1px solid rgba(255,255,255,.7);' +
        'box-shadow:inset 0 1.5px 0 rgba(255,255,255,.95),inset 0 -1px 0 rgba(25,37,36,.06),inset 0 0 0 1px rgba(255,255,255,.10),0 10px 28px -10px rgba(25,37,36,.30)}' +
        '.cnb-mp-glass::before{content:"";position:absolute;inset:-50% -70%;' +
        'background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,.55) 49%,rgba(255,255,255,.05) 56%,transparent 66%);' +
        'animation:cnbMpSheen 7s ease-in-out infinite;pointer-events:none}' +
        '.cnb-mp-icon{width:2.75rem;height:2.75rem;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#192524;cursor:pointer;transition:transform .2s cubic-bezier(.16,1,.3,1)}' +
        '.cnb-mp-icon:active{transform:scale(.93)}' +
        '.cnb-mp-icon.needs-gesture{animation:cnbMpPulse 2.2s ease-in-out infinite}' +
        '.cnb-mp-panel{position:absolute;bottom:calc(100% + .6rem);left:0;display:flex;align-items:center;gap:.6rem;' +
        'border-radius:9999px;padding:.45rem .9rem .45rem .55rem;white-space:nowrap;opacity:0;transform:translateY(6px) scale(.96);' +
        'pointer-events:none;transition:opacity .2s cubic-bezier(.16,1,.3,1),transform .2s cubic-bezier(.16,1,.3,1);transform-origin:bottom left}' +
        '.cnb-mp-panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}' +
        '.cnb-mp-credit{font-size:.72rem;font-weight:500;color:#192524;text-decoration:none;max-width:9.5rem;overflow:hidden;text-overflow:ellipsis;display:inline-block;vertical-align:middle}' +
        '.cnb-mp-btn{display:flex;align-items:center;justify-content:center;width:1.9rem;height:1.9rem;border-radius:50%;background:none;border:0;cursor:pointer;color:#192524;flex-shrink:0;padding:0;transition:background .15s,transform .15s}' +
        '.cnb-mp-btn:hover{background:rgba(25,37,36,.07)}.cnb-mp-btn:active{transform:scale(.9)}' +
        '.cnb-mp-btn.dismiss{color:#959D90}' +
        '.cnb-mp-eq{display:inline-flex;align-items:flex-end;gap:2px;height:10px}' +
        '.cnb-mp-eq span{width:2.5px;border-radius:2px;background:currentColor;height:3px}' +
        '.cnb-mp-eq.animate span:nth-child(1){animation:cnbMpEq0 .75s ease-in-out infinite}' +
        '.cnb-mp-eq.animate span:nth-child(2){animation:cnbMpEq1 .9s ease-in-out infinite}' +
        '.cnb-mp-eq.animate span:nth-child(3){animation:cnbMpEq2 1.05s ease-in-out infinite}';
      document.head.appendChild(style);

      var wrap = document.createElement('div');
      wrap.className = 'cnb-mp-wrap';
      wrap.style.bottom = (localStorage.getItem('cnb_cookie_ack') === '1') ? '.85rem' : 'calc(.85rem + 200px)';

      var panel = document.createElement('div');
      panel.className = 'cnb-mp-panel cnb-mp-glass';
      var credit = document.createElement('a');
      credit.className = 'cnb-mp-credit';
      credit.target = '_blank'; credit.rel = 'noopener noreferrer';
      credit.addEventListener('click', function (e) { e.stopPropagation(); });
      var nextBtn = document.createElement('button');
      nextBtn.className = 'cnb-mp-btn'; nextBtn.type = 'button';
      nextBtn.setAttribute('aria-label', 'Next track'); nextBtn.innerHTML = NEXT_ICON;
      var muteBtn = document.createElement('button');
      muteBtn.className = 'cnb-mp-btn'; muteBtn.type = 'button';
      var dismissBtn = document.createElement('button');
      dismissBtn.className = 'cnb-mp-btn dismiss'; dismissBtn.type = 'button';
      dismissBtn.setAttribute('aria-label', 'Turn off background music'); dismissBtn.innerHTML = CLOSE_ICON;
      panel.appendChild(credit); panel.appendChild(nextBtn); panel.appendChild(muteBtn); panel.appendChild(dismissBtn);

      var icon = document.createElement('button');
      icon.className = 'cnb-mp-icon cnb-mp-glass'; icon.type = 'button';

      var audio = document.createElement('audio');
      audio.preload = 'none';

      wrap.appendChild(panel);
      wrap.appendChild(icon);
      wrap.appendChild(audio);
      document.body.appendChild(wrap);

      function track() { return TRACKS[trackIndex]; }
      function render() {
        var t = track();
        credit.href = t.creditUrl;
        var label = t.title + ' — ' + t.artist;
        credit.textContent = label; credit.title = label;
        muteBtn.innerHTML = muted ? SPEAKER_OFF : SPEAKER_ON;
        muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
        icon.classList.toggle('needs-gesture', needsGesture);
        var showEq = playing && !muted;
        icon.innerHTML = showEq
          ? '<span class="cnb-mp-eq animate"><span></span><span></span><span></span></span>'
          : (muted || !playing ? SPEAKER_OFF : SPEAKER_ON);
        icon.setAttribute('aria-label', (playing && !muted) ? 'Pause background music' : 'Play background music');
        panel.classList.toggle('open', expanded);
      }

      var collapseTimer;
      function setExpanded(v) {
        expanded = v;
        render();
        clearTimeout(collapseTimer);
        if (v) collapseTimer = setTimeout(function () { expanded = false; render(); }, 6000);
      }
      document.addEventListener('mousedown', function (e) {
        if (expanded && !wrap.contains(e.target)) { expanded = false; render(); }
      });

      icon.addEventListener('click', function () {
        if (needsGesture) {
          audio.muted = false;
          audio.play().then(function () {
            playing = true; muted = false; needsGesture = false;
            try { localStorage.setItem(MUTE_KEY, '0'); } catch (e) {}
            render();
          }).catch(function () {});
        } else if (!playing) {
          audio.play().then(function () { playing = true; render(); }).catch(function () {});
        }
        setExpanded(!expanded);
      });

      nextBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        trackIndex = (trackIndex + 1) % TRACKS.length;
        try { localStorage.setItem(TRACK_KEY, String(trackIndex)); } catch (err) {}
        audio.src = track().src; audio.load();
        if (playing) audio.play().catch(function () {});
        render();
      });

      muteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        muted = !muted;
        audio.muted = muted;
        needsGesture = false;
        try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (err) {}
        if (!muted && !playing) { audio.play().then(function () { playing = true; render(); }).catch(function () {}); }
        render();
      });

      dismissBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        audio.pause();
        try { localStorage.setItem(DISMISS_KEY, '1'); } catch (err) {}
        wrap.remove();
      });

      // Only make sound while this tab is the one you're looking at.
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          wasPlayingBeforeHide = !audio.paused;
          if (!audio.paused) audio.pause();
        } else if (wasPlayingBeforeHide) {
          audio.play().catch(function () {});
        }
      });

      // Settle down to the true corner once the cookie notice closes.
      window.__cnbMusicSettle = function () { wrap.style.bottom = '.85rem'; };

      // Best-effort autoplay: try with sound, fall back to muted, fall back to idle.
      audio.volume = 0.35; audio.loop = true; audio.src = track().src;
      var wantsSound = !muted;
      audio.muted = !wantsSound;
      audio.play().then(function () {
        playing = true; needsGesture = false; render();
      }).catch(function () {
        audio.muted = true;
        audio.play().then(function () {
          playing = true; muted = true; needsGesture = wantsSound; render();
        }).catch(function () {
          playing = false; needsGesture = true; render();
        });
      });

      render();
    }

    if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  })();
})();
