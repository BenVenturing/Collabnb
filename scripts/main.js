/* ============================================================
   Collabnb — Main JavaScript
   ============================================================ */

import { getProfileCounts, waitlistSignUp, updateWaitlistProfile } from './convex.js';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;
let signedUpName = '';
let _hasJoinedWaitlist = !!localStorage.getItem('collabnb_waitlist_email');

/* ── Lazy Clerk instance (shared across initNavAuth, submitForm, login) ── */
let _clerkPromise = null;
async function getClerk() {
  if (!_clerkPromise) {
    _clerkPromise = (async () => {
      const { Clerk } = await import('@clerk/clerk-js');
      const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
      if (!key) return null;
      const clerk = new Clerk(key);
      await clerk.load();
      return clerk;
    })();
  }
  return _clerkPromise;
}

/* ── Clerk error to user-friendly message ── */
function getClerkErrorMessage(err) {
  const code = err.errors?.[0]?.code;
  if (code === 'form_identifier_not_found' || code === 'form_password_incorrect') {
    return 'Wrong email or password. Try again.';
  }
  if (code === 'form_not_verified') {
    return 'Please confirm your email first. Check your inbox.';
  }
  return err.errors?.[0]?.longMessage || err.message || 'Something went wrong. Please try again.';
}

/* --- Reveal on scroll (IntersectionObserver) --- */
let revealObserver = null;
if (window.innerWidth <= 768) {
  // On mobile: show everything immediately, no threshold-gating
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
} else {
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        revealObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

/* --- Nav: scroll opacity + active link --- */
const navPill = document.querySelector('.nav-pill');
if (navPill) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) navPill.classList.add('scrolled');
    else navPill.classList.remove('scrolled');
  }, { passive: true });
}

// Mark active nav link
const currentPath = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(a => {
  const href = a.getAttribute('href').split('/').pop() || 'index.html';
  if (href === currentPath || (currentPath === '' && href === 'index.html')) {
    a.classList.add('active');
  }
});

/* --- Hamburger nav (mobile & desktop) --- */
const hamburger = document.querySelector('.nav-hamburger');
const navOverlay = document.querySelector('.nav-overlay');

if (hamburger) {
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isMobile = window.innerWidth <= 768;
    const isOpen = hamburger.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', isOpen);

    if (isMobile && navOverlay) {
      navOverlay.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    } else if (navPill) {
      navPill.classList.toggle('inline-open', isOpen);
    }
  });

  if (navOverlay) {
    navOverlay.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navOverlay.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  if (navPill) {
    navPill.querySelectorAll('.nav-links a').forEach(a => {
      a.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navPill.classList.remove('inline-open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Close inline menu when clicking outside
  document.addEventListener('click', (e) => {
    if (navPill && navPill.classList.contains('inline-open') && !navPill.contains(e.target)) {
      hamburger.classList.remove('open');
      navPill.classList.remove('inline-open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });

  // Handle orientation change — close mobile overlay when rotating to landscape
  let _orientationLocked = false;
  window.addEventListener('resize', () => {
    if (_orientationLocked) return;
    if (hamburger?.classList.contains('open') && window.innerWidth > 768) {
      _orientationLocked = true;
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      if (navOverlay) navOverlay.classList.remove('open');
      document.body.style.overflow = '';
      setTimeout(() => { _orientationLocked = false; }, 500);
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (navOverlay && navOverlay.classList.contains('open')) {
        hamburger.classList.remove('open');
        navOverlay.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
      if (navPill && navPill.classList.contains('inline-open')) {
        hamburger.classList.remove('open');
        navPill.classList.remove('inline-open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    }
  });
}

/* --- Counter animation --- */
function runCount(el, target, duration = 2000) {
  if (!el) return;
  // On mobile: just show the final number, no animation
  if (window.innerWidth <= 768) { el.textContent = target; return; }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 4); // ease-out-quart
    el.textContent = Math.floor(eased * target);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}

async function initCounters() {
  let creators = 0;
  let hosts = 0;

  async function fetchCounts() {
    try {
      const counts = await getProfileCounts();
      creators = counts.creators;
      hosts = counts.hosts;
      updateUI();
    } catch (err) {
      console.warn('Could not fetch live counts:', err);
    }
  }

  function updateUI() {
    const creatorEl = document.querySelector('#count-creators');
    const hostEl = document.querySelector('#count-hosts');
    const creatorBar = document.querySelector('#bar-creators');
    const hostBar = document.querySelector('#bar-hosts');
    const creatorMini = document.querySelectorAll('.count-creators-mini');
    const hostMini = document.querySelectorAll('.count-hosts-mini');

    if (creatorEl) runCount(creatorEl, creators);
    if (hostEl) runCount(hostEl, hosts);

    if (creatorBar) {
      setTimeout(() => { creatorBar.style.width = `${Math.min(100, (creators / 100) * 100)}%`; }, 200);
    }
    if (hostBar) {
      setTimeout(() => { hostBar.style.width = `${Math.min(100, (hosts / 100) * 100)}%`; }, 200);
    }

    // Mini counters on join/home pages
    creatorMini.forEach(el => el.textContent = creators);
    hostMini.forEach(el => el.textContent = hosts);

    // Update "Spots Remaining" indicators
    const spotsLeftMini = document.querySelector('#spots-left-mini');
    const roleLabelMini = document.querySelector('#role-label-mini');
    if (spotsLeftMini && roleLabelMini) {
      const activeBtn = document.querySelector('.role-btn.active');
      const role = activeBtn ? activeBtn.dataset.role : 'creator';
      const count = role === 'creator' ? creators : hosts;
      spotsLeftMini.textContent = Math.max(0, 100 - count);
      roleLabelMini.textContent = role;
    }

    // Update combined tally if it exists
    const combinedTally = document.querySelector('#combined-tally');
    if (combinedTally) {
      combinedTally.textContent = `Joined by ${creators} creators & ${hosts} hosts`;
    }

    // Update live caption
    const liveCaption = document.querySelector('#live-caption');
    if (liveCaption) {
      const total = creators + hosts;
      liveCaption.textContent = `${total} members Joined · ${Math.max(0, 200 - total)} Founding spots remaining`;
    }
  }

  // Initial fetch
  await fetchCounts();

  // Poll every 30 seconds for updates
  setInterval(fetchCounts, 30000);
}

// Run counters logic
const counterSection = document.querySelector('.counters-grid');
const hasMini = document.querySelector('.count-creators-mini');

if (counterSection || hasMini) {
  if (hasMini) {
    // Mini counter is above the fold — fetch immediately so it's never stale
    initCounters();
  } else {
    // No mini counter — animate big grid counters when scrolled into view
    const cObs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        initCounters();
        cObs.disconnect();
      }
    }, { threshold: 0.1 });
    cObs.observe(counterSection);
  }
}

/* --- Countdown timer --- */
function initCountdown() {
  const els = document.querySelectorAll('[data-countdown]');
  if (!els.length) return;

  const target = new Date('2026-07-01T00:00:00+07:00');

  function update() {
    const now = new Date();
    const diff = target - now;
    if (diff <= 0) {
      els.forEach(el => el.textContent = '0');
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const d = document.querySelector('[data-countdown="days"]');
    const h = document.querySelector('[data-countdown="hours"]');
    const m = document.querySelector('[data-countdown="mins"]');
    const s = document.querySelector('[data-countdown="secs"]');

    if (d) d.textContent = days;
    if (h) h.textContent = String(hours).padStart(2, '0');
    if (m) m.textContent = String(mins).padStart(2, '0');
    if (s) s.textContent = String(secs).padStart(2, '0');
  }
  update();
  setInterval(update, 1000);
}
initCountdown();

/* --- FAQ Accordion --- */
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');

    // Close all
    document.querySelectorAll('.faq-item.open').forEach(el => {
      el.classList.remove('open');
      el.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });

    // Open clicked if was closed
    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });

  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      btn.click();
    }
  });
});

/* --- 3-Step Application Wizard --- */
let currentRole = 'creator';
let _wizardProfileId = null;
let _wizardEmail = '';
let _wizardName = '';

function _stepDots(active) {
  return [1, 2, 3].map((n, i) => {
    const done = n < active, cur = n === active;
    const bg = done ? 'var(--mint)' : cur ? 'var(--ink)' : 'rgba(255,255,255,0.4)';
    const fg = done ? 'var(--ink)' : cur ? 'var(--bone)' : 'var(--sage)';
    const bd = done ? 'var(--mint)' : cur ? 'var(--ink)' : 'var(--hairline)';
    return `<div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:600;background:${bg};color:${fg};border:1px solid ${bd};transition:all 300ms;">${done ? '✓' : n}</div>${i < 2 ? '<div style="width:24px;height:2px;background:var(--hairline);border-radius:1px;"></div>' : ''}`;
  }).join('');
}

function _stepBar(active) {
  return `<div style="display:flex;align-items:center;justify-content:center;gap:0.4rem;margin-bottom:0.5rem;">${_stepDots(active)}</div><p style="text-align:center;font-size:0.72rem;color:var(--sage);margin-bottom:1.25rem;">Step ${active} of 3</p>`;
}

function _updatePageDots(active) {
  document.querySelectorAll('#page-step-indicator .step-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i + 1 === active);
    dot.classList.toggle('done', i + 1 < active);
  });
}

async function openModal() {
  const overlay = document.querySelector('#modal-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  _wizardProfileId = null;
  const roleSection = document.getElementById('modal-role-section');

  if (_hasJoinedWaitlist) {
    _wizardEmail = localStorage.getItem('collabnb_waitlist_email') || '';
    _wizardName  = localStorage.getItem('collabnb_waitlist_name')  || '';
    currentRole  = localStorage.getItem('collabnb_waitlist_role')  || currentRole;
    if (roleSection) roleSection.style.display = 'none';
    showWizardStep(2);
    return;
  }

  _wizardEmail = '';
  _wizardName  = '';
  if (roleSection) roleSection.style.display = '';
  // Reset referral code section visibility for step 1
  const refSection = document.getElementById('referral-code-section');
  if (refSection) refSection.style.display = '';
  // Sync page-level role selection into modal
  const activePageBtn = document.querySelector('#page-role-creator.active, #page-role-host.active');
  if (activePageBtn) {
    const pageRole = activePageBtn.id.includes('creator') ? 'creator' : 'host';
    currentRole = pageRole;
    document.querySelectorAll('.role-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.role === pageRole);
    });
  }
  showWizardStep(1);
}

function showWizardStep(step) {
  const area = document.querySelector('#clerk-sign-up-area');
  if (!area) return;
  _updatePageDots(step);
  const titleEl = document.getElementById('modal-title');
  const subtitleEl = document.getElementById('modal-subtitle');

  if (step === 1) {
    if (titleEl) titleEl.textContent = `Claim your ${currentRole} spot`;
    if (subtitleEl) subtitleEl.style.display = '';
    const savedName  = localStorage.getItem('collabnb_waitlist_name')  || '';
    const savedEmail = localStorage.getItem('collabnb_waitlist_email') || '';
    area.innerHTML = `
      <form id="wl-step1" style="display:flex;flex-direction:column;gap:1rem;">
        <div class="form-group">
          <label class="form-label" for="wl-name">Full name</label>
          <input class="form-input" type="text" id="wl-name" placeholder="Jane Smith" autocomplete="name" required value="${savedName.replace(/"/g,'&quot;')}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="wl-email">Email address</label>
          <input class="form-input" type="email" id="wl-email" placeholder="jane@example.com" autocomplete="email" required value="${savedEmail.replace(/"/g,'&quot;')}" />
        </div>
        <label style="display:flex;align-items:flex-start;gap:0.625rem;cursor:pointer;padding:0.75rem;background:rgba(255,255,255,0.5);border:1px solid rgba(208,213,206,0.7);border-radius:0.875rem;">
          <input type="checkbox" id="wl-consent" style="margin-top:2px;flex-shrink:0;accent-color:var(--slate,#3C5759);width:15px;height:15px;" />
          <span style="font-size:0.82rem;color:var(--slate,#3C5759);line-height:1.45;">I'm cool with the occasional helpful email — no spam, no daily newsletters, just the good stuff. Pinky promise 🤙</span>
        </label>
        <button type="submit" id="wl-submit" class="btn-primary" style="width:100%;cursor:pointer;">Save my spot →</button>
        <div id="wl-error" style="display:none;color:#e74c3c;font-size:0.8125rem;text-align:center;"></div>
      </form>`;
    document.getElementById('wl-step1')?.addEventListener('submit', handleStep1Submit);

  } else if (step === 2) {
    if (titleEl) titleEl.textContent = 'Tell us about yourself';
    if (subtitleEl) subtitleEl.style.display = 'none';
    // Hide the role & referral sections on step 2 (user already joined)
    const roleSection = document.getElementById('modal-role-section');
    if (roleSection) roleSection.style.display = 'none';
    const refSection = document.getElementById('referral-code-section');
    if (refSection) refSection.style.display = 'none';
    const firstName = _wizardName.split(' ')[0];
    const fields = currentRole === 'creator' ? `
      <div class="form-group">
        <label class="form-label" for="wl-instagram">Instagram handle <span style="color:#92400E;font-weight:700;">(required)</span></label>
        <input class="form-input" type="text" id="wl-instagram" placeholder="@yourhandle" required />
      </div>
      <div class="form-group">
        <label class="form-label" for="wl-tiktok">TikTok handle <span style="color:var(--sage);font-weight:400;">(optional)</span></label>
        <input class="form-input" type="text" id="wl-tiktok" placeholder="@yourhandle" />
      </div>
      <div class="form-group">
        <label class="form-label" for="wl-portfolio">Website / Portfolio <span style="color:var(--sage);font-weight:400;">(optional)</span></label>
        <input class="form-input" type="text" id="wl-portfolio" placeholder="https://yourportfolio.com" />
      </div>` : `
      <div class="form-group">
        <label class="form-label" for="wl-business">Property or business name</label>
        <input class="form-input" type="text" id="wl-business" placeholder="Moss &amp; Pine Cabin" />
      </div>
      <div class="form-group">
        <label class="form-label" for="wl-city">City</label>
        <input class="form-input" type="text" id="wl-city" placeholder="Asheville" />
      </div>`;
    area.innerHTML = `
      ${_stepBar(2)}
      <p style="font-size:0.875rem;color:var(--sage);margin-bottom:1.25rem;text-align:center;">Your spot is saved, <strong style="color:var(--ink);">${firstName}</strong>! These details help match you with the right collabs.</p>
      <form id="wl-step2" style="display:flex;flex-direction:column;gap:1rem;">
        <div class="form-group">
          <label class="form-label" for="wl-country">Home country <span style="color:var(--sage);font-weight:400;">(optional)</span></label>
          <input class="form-input" type="text" id="wl-country" placeholder="United States" />
        </div>
        ${fields}
        <button type="submit" class="btn-primary" style="width:100%;cursor:pointer;">Continue →</button>
        ${currentRole !== 'creator' ? '<button type="button" id="wl-skip2" style="background:none;border:none;color:var(--sage);font-size:0.8rem;cursor:pointer;padding:0.25rem 0;">Skip for now</button>' : ''}
        <div id="wl-error2" style="display:none;color:#e74c3c;font-size:0.8125rem;text-align:center;"></div>
      </form>`;
    document.getElementById('wl-step2')?.addEventListener('submit', handleStep2Submit);
    document.getElementById('wl-skip2')?.addEventListener('click', () => showWizardStep(3));

  } else if (step === 3) {
    if (titleEl) titleEl.textContent = 'Create your account';
    if (subtitleEl) subtitleEl.style.display = 'none';
    // Hide the role section and referral code section on step 3 (Clerk mounts here)
    const roleSection = document.getElementById('modal-role-section');
    if (roleSection) roleSection.style.display = 'none';
    const refSection = document.getElementById('referral-code-section');
    if (refSection) refSection.style.display = 'none';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) { _showWizardDone(); return; }

    // Expand the modal card so Clerk's component never needs to scroll internally
    const card = document.querySelector('.modal-card');
    if (card) card.classList.add('clerk-active');

    area.innerHTML = `
      ${_stepBar(3)}
      <div style="text-align:center;margin-bottom:1.25rem;">
        <div style="width:52px;height:52px;border-radius:50%;background:var(--mint);display:flex;align-items:center;justify-content:center;margin:0 auto 0.875rem;">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" style="width:22px;height:22px;"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <p style="color:var(--sage);font-size:.8125rem;line-height:1.5;">Sign in or create a password to access your profile and explore the platform.</p>
      </div>
      <div id="wl-clerk-mount"></div>
      <button id="wl-skip3" style="background:none;border:none;color:var(--sage);font-size:0.8rem;cursor:pointer;width:100%;padding:0.75rem 0 0.25rem;">I'll do this later</button>`;
    document.getElementById('wl-skip3')?.addEventListener('click', closeModal);
    getClerk().then((clerk) => {
      if (!clerk) { _showWizardDone(); return; }
      const mountEl = document.getElementById('wl-clerk-mount');
      if (!mountEl) return;
      // Prevent browser autofill from using saved credentials
      mountEl.setAttribute('autocomplete', 'off');
      // Store the name for the celebration screen when OAuth redirects back
      try { localStorage.setItem('collabnb_signup_name', _wizardName || ''); } catch {}
      try { localStorage.setItem('collabnb_new_signup', '1'); } catch {}
      // Use absolute URLs — Clerk requires these to be listed in dashboard → Redirects
      const origin = window.location.origin;
      const returnUrl = `${origin}/join.html?celebrate=1`;
      const appUrl = `${origin}/app/`;
      try {
        clerk.mountSignUp(mountEl, {
          afterSignUpUrl: returnUrl,
          afterSignInUrl: appUrl,
          signUpUrl: `${origin}/join.html`,
          appearance: {
            variables: {
              colorPrimary: '#192524',
              colorBackground: '#ffffff',
              colorText: '#192524',
              colorTextSecondary: '#3C5759',
              colorInputBackground: '#f9f9f7',
              colorInputText: '#192524',
              colorNeutral: '#3C5759',
              colorDanger: '#dc2626',
              borderRadius: '12px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '0.9375rem',
            },
            elements: {
              card: 'box-shadow:none!important;border:none!important;padding:0!important;background:transparent!important;',
              cardBox: 'box-shadow:none!important;',
              header: 'display:none!important;',
              logoBox: 'display:none!important;',
              footer: 'background:#ffffff!important;background-color:#ffffff!important;',
              footerPages: 'background:#ffffff!important;',
              footerAction: 'background:#ffffff!important;',
            },
          },
        });
      } catch (err) {
        console.warn('Clerk mountSignUp failed:', err);
        mountEl.innerHTML = `<div style="text-align:center;padding:1rem;">
          <p style="color:var(--sage);font-size:0.875rem;margin-bottom:1.25rem;">Could not load sign-up. Click below to continue.</p>
          <a href="${appUrl}" class="btn-primary" style="display:inline-block;text-decoration:none;padding:0.75rem 1.5rem;">Open App →</a>
        </div>`;
      }
    }).catch(_showWizardDone);
  }
}

function _showWizardDone(userName) {
  const area = document.querySelector('#clerk-sign-up-area');
  const titleEl = document.getElementById('modal-title');
  const subtitleEl = document.getElementById('modal-subtitle');
  const roleSection = document.getElementById('modal-role-section');
  const refSection = document.getElementById('referral-code-section');
  if (titleEl) titleEl.textContent = '';
  if (subtitleEl) subtitleEl.style.display = 'none';
  if (roleSection) roleSection.style.display = 'none';
  if (refSection) refSection.style.display = 'none';
  if (!area) return;

  const firstName = (userName || '').split(' ')[0] || 'friend';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const appUrl_ = isLocalhost ? 'http://localhost:5174/#/profile' : '/app/#/profile';

  const COLLABNB_QUOTE = 'Where creators and boutique stays collab.';

  area.innerHTML = `
    <div style="text-align:center;padding:0.5rem 0 1rem;">
      <!-- Checkmark circle -->
      <div style="width:64px;height:64px;border-radius:50%;background:var(--mint);display:flex;align-items:center;justify-content:center;margin:0 auto 0.5rem;">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" style="width:28px;height:28px;"><path d="M20 6L9 17l-5-5"/></svg>
      </div>

      <!-- Typewriter quote -->
      <p id="cw-quote" style="font-family:var(--font-display);font-weight:700;font-size:1.05rem;color:var(--ink);margin:1rem auto 0.75rem;min-height:1.5em;">&nbsp;</p>

      <!-- Subtitle -->
      <p id="cw-subtitle" style="color:var(--sage);font-size:0.8125rem;line-height:1.55;margin:0 0 1.25rem;display:none;">We're building out the rest of your profile.</p>

      <!-- Verification pending banner -->
      <div id="cw-verify" style="display:none;background:rgba(255,251,230,0.9);border:1px solid rgba(212,168,67,0.3);border-radius:0.875rem;padding:0.875rem 1rem;margin-bottom:1.375rem;text-align:left;">
        <p style="font-family:var(--font-body);font-size:0.8125rem;font-weight:700;color:#92400E;margin:0 0 0.2rem;">⏳ Verification pending</p>
        <p style="font-family:var(--font-body);font-size:0.78rem;color:#78350F;line-height:1.55;margin:0;">The Collabnb team will review your account before you can apply or publish. You'll get an email once you're approved — usually within 1–2 business days.</p>
      </div>

      <!-- Continue button -->
      <a id="cw-btn" href="${appUrl_}" class="btn-primary" style="display:none;text-decoration:none;padding:0.875rem;font-size:0.9375rem;text-align:center;">Continue to your profile →</a>
    </div>`;

  // Launch confetti
  launchConfetti();

  // Typewriter effect on the Collabnb quote
  const quoteEl = document.getElementById('cw-quote');
  let idx = 0;
  function typeChar() {
    if (idx < COLLABNB_QUOTE.length) {
      quoteEl.textContent = COLLABNB_QUOTE.slice(0, idx + 1);
      // Add blinking cursor
      if (idx < COLLABNB_QUOTE.length - 1) {
        quoteEl.innerHTML = COLLABNB_QUOTE.slice(0, idx + 1) + '<span class="cw-cursor">|</span>';
      } else {
        quoteEl.innerHTML = COLLABNB_QUOTE + '<span class="cw-cursor">|</span>';
      }
      idx++;
      setTimeout(typeChar, 30 + Math.random() * 25);
    } else {
      // Typewriter done — show the cursor blink a few times then fade it
      setTimeout(() => {
        if (quoteEl) quoteEl.textContent = COLLABNB_QUOTE;
        // Show subtitle
        const subEl = document.getElementById('cw-subtitle');
        if (subEl) subEl.style.display = 'block';
        // Then show verification banner
        setTimeout(() => {
          const verifyEl = document.getElementById('cw-verify');
          if (verifyEl) verifyEl.style.display = 'block';
          // Then show button
          setTimeout(() => {
            const btnEl = document.getElementById('cw-btn');
            if (btnEl) btnEl.style.display = 'block';
          }, 400);
        }, 500);
      }, 800);
    }
  }
  typeChar();
}

async function handleStep1Submit(e) {
  e.preventDefault();
  const btn = document.getElementById('wl-submit');
  const errorEl = document.getElementById('wl-error');
  const name = document.getElementById('wl-name')?.value?.trim();
  const email = document.getElementById('wl-email')?.value?.trim();
  if (!name || !email) {
    if (errorEl) { errorEl.textContent = 'Please enter your name and email.'; errorEl.style.display = 'block'; }
    return;
  }
  if (errorEl) errorEl.style.display = 'none';
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  try {
    const result = await waitlistSignUp({ full_name: name, email, role: currentRole });
    _wizardProfileId = result?.profileId || null;
    _wizardEmail = email;
    _wizardName = name;
    localStorage.setItem('collabnb_waitlist_name', name);
    localStorage.setItem('collabnb_waitlist_email', email);
    launchConfetti();
    initCounters();
    _hasJoinedWaitlist = true;
    localStorage.setItem('collabnb_waitlist_role', currentRole);
    updatePageAfterWaitlistJoin(currentRole);
    showReferralCodeReveal();
  } catch (err) {
    console.error('Step 1 error:', err);
    if (errorEl) { errorEl.textContent = 'Something went wrong. Please try again.'; errorEl.style.display = 'block'; }
    if (btn) { btn.disabled = false; btn.textContent = 'Save my spot →'; }
  }
}

function showReferralCodeReveal() {
  const area = document.querySelector('#clerk-sign-up-area');
  if (!area) { showWizardStep(2); return; }
  const titleEl  = document.getElementById('modal-title');
  const subtitleEl = document.getElementById('modal-subtitle');
  if (titleEl)    titleEl.textContent = "You're on the list! 🎉";
  if (subtitleEl) subtitleEl.style.display = 'none';

  const firstName = _wizardName.split(' ')[0] || 'friend';
  const prefix = _wizardName.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 4) || 'USER';

  function genCode() {
    const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(6, '0').slice(0, 6);
    return `${prefix}-${rand}`;
  }

  let code = localStorage.getItem('collabnb_referral_preview') || genCode();
  localStorage.setItem('collabnb_referral_preview', code);

  function render(c) {
    area.innerHTML = `
      <div style="text-align:center;padding:0.25rem 0;">
        <p style="font-size:0.875rem;color:var(--slate);line-height:1.6;margin-bottom:1.375rem;">
          Hey <strong>${firstName}</strong>! Here's your personal referral code to share with friends.<br>
          <span style="color:var(--sage);font-size:0.8125rem;">You both get a free month when they join. 🙌</span>
        </p>
        <div style="display:flex;align-items:center;justify-content:center;gap:0.75rem;background:rgba(255,255,255,0.65);border:1.5px solid rgba(208,213,206,0.9);border-radius:1rem;padding:0.875rem 1.25rem;margin-bottom:0.5rem;">
          <span id="rev-code" style="font-family:monospace;font-size:1.25rem;font-weight:800;color:var(--ink);letter-spacing:0.12em;">${c}</span>
          <button id="rev-copy" style="background:var(--ink);color:#fff;border:none;border-radius:7px;padding:0.3rem 0.75rem;font-size:0.75rem;font-weight:700;cursor:pointer;font-family:inherit;flex-shrink:0;">Copy</button>
        </div>
        <button id="rev-regen" style="background:none;border:none;color:var(--sage);font-size:0.78rem;cursor:pointer;padding:0.2rem 0;font-family:inherit;text-decoration:underline;text-underline-offset:2px;">↺ Regenerate</button>
        <div style="margin-top:1.75rem;">
          <button id="rev-continue" class="btn-primary" style="width:100%;cursor:pointer;">Continue setting up →</button>
        </div>
      </div>`;

    let copied = false;
    document.getElementById('rev-copy')?.addEventListener('click', (ev) => {
      if (copied) return;
      navigator.clipboard.writeText(c).catch(() => {});
      copied = true;
      ev.currentTarget.textContent = '✓ Copied!';
      setTimeout(() => { copied = false; if (ev.currentTarget) ev.currentTarget.textContent = 'Copy'; }, 2500);
    });

    document.getElementById('rev-regen')?.addEventListener('click', () => {
      const newCode = genCode();
      localStorage.setItem('collabnb_referral_preview', newCode);
      render(newCode);
    });

    document.getElementById('rev-continue')?.addEventListener('click', () => showWizardStep(2));
  }

  render(code);
}

async function handleStep2Submit(e) {
  e.preventDefault();
  const errorEl = document.getElementById('wl-error2');
  // Validate Instagram is required for creators
  if (currentRole === 'creator') {
    const instagramVal = document.getElementById('wl-instagram')?.value?.trim();
    if (!instagramVal) {
      if (errorEl) { errorEl.textContent = 'Please provide your Instagram handle — it helps properties match with you.'; errorEl.style.display = 'block'; }
      const btn = e.target.querySelector('[type="submit"]');
      if (btn) { btn.disabled = false; btn.textContent = 'Continue →'; }
      return;
    }
  }
  const btn = e.target.querySelector('[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  if (errorEl) errorEl.style.display = 'none';
  try {
    if (_wizardProfileId) {
      const countryVal = document.getElementById('wl-country')?.value?.trim();
      const raw = currentRole === 'creator'
        ? { instagram_handle: document.getElementById('wl-instagram')?.value?.trim(), tiktok_handle: document.getElementById('wl-tiktok')?.value?.trim(), portfolio: document.getElementById('wl-portfolio')?.value?.trim(), country: countryVal }
        : { city: document.getElementById('wl-city')?.value?.trim(), country: countryVal };
      const updates = Object.fromEntries(Object.entries(raw).filter(([, v]) => v));
      if (Object.keys(updates).length) await updateWaitlistProfile(_wizardProfileId, updates);
    }
  } catch { /* non-critical — still advance */ }
  showWizardStep(3);
}

function closeModal() {
  const overlay = document.querySelector('#modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  // Reset clerk-active expansion so next open starts at normal size
  const card = overlay.querySelector('.modal-card');
  if (card) card.classList.remove('clerk-active');
  const trigger = document.querySelector('.btn-open-modal');
  if (trigger) trigger.focus();
}

function updatePageAfterWaitlistJoin(role) {
  const joinCta = document.getElementById('join-cta');
  if (joinCta) joinCta.textContent = 'Continue setting up →';
  const pageToggle = document.querySelector('.join-hero .role-toggle');
  if (pageToggle) {
    const wrapper = pageToggle.closest('.reveal') || pageToggle.parentElement;
    if (wrapper) wrapper.style.display = 'none';
  }
  const miniCounter = document.querySelector('.join-mini-counter');
  if (miniCounter) miniCounter.style.display = 'none';
  // Hide the page-level "Have a referral code?" section
  const pageRefSection = document.getElementById('referral-code-section');
  if (pageRefSection) pageRefSection.style.display = 'none';
}

function switchRole(role) {
  currentRole = role;
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.role === role);
  });

  // Update mini counter label on join page
  const miniLabel = document.querySelector('.join-mini-counter');
  if (miniLabel) {
    const cCount = document.querySelector('.count-creators-mini');
    const hCount = document.querySelector('.count-hosts-mini');
    const count = role === 'creator' ? parseInt(cCount?.textContent || '0') : parseInt(hCount?.textContent || '0');
    miniLabel.innerHTML = `<strong>${Math.max(0, 100 - count)} / 100</strong> ${role} spots remaining`;
  }

  // Keep CTA button text in sync with selected role (only after waitlist join)
  const joinCta = document.getElementById('join-cta');
  if (joinCta && _hasJoinedWaitlist) joinCta.textContent = 'Continue setting up →';

  // Update modal title if modal is open on step 1
  const titleEl = document.getElementById('modal-title');
  if (titleEl && document.querySelector('#modal-overlay.open')) {
    titleEl.textContent = `Finalize your ${role} profile`;
  }
}

/* --- Login Modal --- */
let _clerkLoginMounted = false;
let _signInUnsubscribe = null;

function openLoginModal() {
  const overlay = document.querySelector('#login-modal-overlay');
  if (!overlay) return;

  // Close the wizard modal if open
  const wizardOverlay = document.querySelector('#modal-overlay');
  if (wizardOverlay?.classList.contains('open')) closeModal();

  const mountEl = document.getElementById('clerk-login-mount');

  // Show loading state immediately (before Clerk JS loads)
  if (mountEl) {
    mountEl.innerHTML = `<div style="text-align:center;padding:1.5rem;">
      <div style="width:28px;height:28px;border-radius:50%;border:2.5px solid var(--stone);border-top-color:var(--slate);animation:spin 0.8s linear infinite;margin:0 auto 0.75rem;"></div>
      <p style="color:var(--sage);font-size:0.8125rem;">Loading sign-in…</p>
    </div>`;
  }

  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Hide the nav pill
  const nav = document.querySelector('.nav-pill');
  if (nav) nav.style.display = 'none';

  // Mount Clerk sign-in component (with Google OAuth etc.)
  getClerk().then((clerk) => {
    if (!clerk) {
      if (mountEl) {
        mountEl.innerHTML = `<div style="text-align:center;padding:1rem;">
          <p style="color:var(--sage);font-size:0.875rem;margin-bottom:1.25rem;">Sign in is not available right now.</p>
          <a href="/login.html" class="btn-primary" style="display:inline-block;text-decoration:none;padding:0.75rem 1.5rem;">Go to Login →</a>
        </div>`;
      }
      return;
    }
    // Already signed in — skip the modal and go straight to the app
    if (clerk.user) {
      closeLoginModal();
      const email = clerk.user.primaryEmailAddress?.emailAddress || '';
      const isAdmin = ADMIN_EMAIL && email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      window.location.href = isAdmin ? '/app/#/admin' : '/app/#/explore';
      return;
    }
    if (!mountEl) return;
    // Reset mount area (clears loading state from above)
    mountEl.innerHTML = '';
    mountEl.setAttribute('autocomplete', 'off');
    _clerkLoginMounted = false;
    // Tear down any previous listener
    if (_signInUnsubscribe) { _signInUnsubscribe(); _signInUnsubscribe = null; }
    // Handle post-sign-in routing (email/password path — OAuth goes via sso-callback)
    _signInUnsubscribe = clerk.addListener(({ user }) => {
      if (user) {
        if (_signInUnsubscribe) { _signInUnsubscribe(); _signInUnsubscribe = null; }
        closeLoginModal();
        const signedInEmail = user.primaryEmailAddress?.emailAddress || '';
        const toAdmin = ADMIN_EMAIL && signedInEmail && signedInEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        window.location.href = toAdmin ? '/app/#/admin' : '/app/#/explore';
      }
    });
    try {
      clerk.mountSignIn(mountEl, {
        signUpUrl: `${window.location.origin}/join.html`,
        appearance: {
          variables: {
            colorPrimary: '#3C5759',
            colorBackground: 'transparent',
            colorText: '#192524',
            colorTextSecondary: '#3C5759',
            colorInputBackground: '#ffffff',
            colorInputText: '#192524',
            borderRadius: '12px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '0.9375rem',
          },
        },
      });
      _clerkLoginMounted = true;
    } catch (e) {
      console.warn('Clerk mountSignIn failed:', e);
      mountEl.innerHTML = `<div style="text-align:center;padding:1rem;">
        <p style="color:var(--sage);font-size:0.875rem;margin-bottom:1.25rem;">Could not load sign-in. Try again or use the login page.</p>
        <a href="/login.html" class="btn-primary" style="display:inline-block;text-decoration:none;padding:0.75rem 1.5rem;">Go to Login →</a>
      </div>`;
    }
  }).catch((err) => {
    console.warn('Clerk load failed:', err);
    if (mountEl) {
      mountEl.innerHTML = `<div style="text-align:center;padding:1rem;">
        <p style="color:var(--sage);font-size:0.875rem;">Sign-in temporarily unavailable.</p>
        <p style="font-size:0.75rem;color:var(--stone);">Please try again later or use the <a href="/login.html" style="color:var(--slate);">login page</a>.</p>
      </div>`;
    }
  });
}

function closeLoginModal() {
  const overlay = document.querySelector('#login-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (_signInUnsubscribe) { _signInUnsubscribe(); _signInUnsubscribe = null; }

  // Show the nav pill again
  const nav = document.querySelector('.nav-pill');
  if (nav) nav.style.display = '';
}

function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;pointer-events:none;';
  document.body.appendChild(canvas);

  const dpr = window.devicePixelRatio || 1;
  const cw = window.innerWidth;
  const ch = window.innerHeight;
  canvas.width = cw * dpr;
  canvas.height = ch * dpr;
  canvas.style.width = cw + 'px';
  canvas.style.height = ch + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const colors = ['#4ecdc4', '#a8e6cf', '#ffd93d', '#ff8c94', '#c8b8ff', '#ffffff', '#7ee8a2'];
  const pieces = Array.from({ length: 160 }, () => ({
    x: Math.random() * cw,
    y: -20 - Math.random() * ch * 0.6,
    r: 5 + Math.random() * 6,
    dx: (Math.random() - 0.5) * 2.5,
    dy: 3 + Math.random() * 5,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.18,
    color: colors[Math.floor(Math.random() * colors.length)],
    rect: Math.random() > 0.4,
  }));

  let start = null;
  const duration = 5000;

  function draw(ts) {
    if (!start) start = ts;
    const elapsed = ts - start;
    const progress = elapsed / duration;
    const alpha = progress > 0.6 ? 1 - (progress - 0.6) / 0.4 : 1;

    ctx.clearRect(0, 0, cw, ch);
    ctx.globalAlpha = alpha;

    pieces.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      if (p.rect) {
        ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.r * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      p.x += p.dx;
      p.y += p.dy;
      p.angle += p.spin;

      if (p.y > ch + 20) {
        p.y = -20;
        p.x = Math.random() * cw;
      }
    });

    if (elapsed < duration) {
      requestAnimationFrame(draw);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(draw);
}

// Copy to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('#btn-copy');
    if (btn) {
      const origHTML = btn.innerHTML;
      btn.innerHTML = 'Copied!';
      setTimeout(() => { btn.innerHTML = origHTML; }, 2000);
    }
  }).catch(() => {});
}

/* --- Listing card stack --- */
function initListingStack() {
  const stack = document.getElementById('listing-stack');
  if (!stack) return;

  const LISTINGS = [
    {
      photo: 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&auto=format&fit=crop',
      name: 'Glacier Prime Cabin',
      chips: ['Lake Tahoe, CA', 'Micro', '4 deliverables', '3-night stay'],
      message: "Hey! I'd love to host you at Glacier Prime Cabin for a 3-night stay — looking for 4 Reels + 1 TikTok.",
    },
    {
      photo: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&auto=format&fit=crop',
      name: 'Mountain View Lodge',
      chips: ['Aspen, CO', 'Influencer', '3 deliverables', '2-night stay'],
      message: "Mountain View Lodge has an opening next month — interested in a 2-night content collab?",
    },
    {
      photo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop',
      name: 'Sable House',
      chips: ['Lisbon, Portugal', 'UGC Pro', '6 deliverables', '4-night stay'],
      message: "Sable House is looking for creators who love architecture and culture. Is that you?",
    },
  ];

  let typingTimer = null;

  const cards = LISTINGS.map((listing, i) => {
    const el = document.createElement('div');
    el.className = `lcard pos-${i}`;
    el.dataset.index = i;
    el.innerHTML = `
      <div class="lcard-photo">
        <img src="${listing.photo}" alt="${listing.name}" loading="${i === 0 ? 'eager' : 'lazy'}" />
        <div class="lcard-photo-overlay"></div>
      </div>
      <div class="lcard-inner">
        <p class="hero-card-message">&ldquo;<span class="lcard-typing"></span><span class="lcard-cursor">|</span>&rdquo;</p>
        <div class="hero-card-listing">
          <div class="hero-card-listing-title">${listing.name}</div>
          <div class="hero-card-listing-meta">
            ${listing.chips.map(c => `<span class="hero-card-chip-meta">${c}</span>`).join('')}
          </div>
        </div>
        <div class="hero-card-input">Reply to the host…</div>
        <div class="hero-card-chips">
          <button class="hero-card-chip">Accept the collab</button>
          <button class="hero-card-chip">See more photos</button>
          <button class="hero-card-chip">Ask a question</button>
        </div>
      </div>
    `;
    stack.appendChild(el);
    return el;
  });

  const isMobileStack = window.innerWidth <= 640;

  function getFront() { return cards.find(c => c.classList.contains('pos-0')); }

  function startTyping(index) {
    clearTimeout(typingTimer);
    const front = getFront();
    if (!front) return;
    const el = front.querySelector('.lcard-typing');
    if (!el) return;
    const msg = LISTINGS[index].message;
    // Mobile: show full message instantly so card content is never empty
    if (isMobileStack) {
      el.textContent = msg;
      const cursor = front.querySelector('.lcard-cursor');
      if (cursor) cursor.style.display = 'none';
      return;
    }
    el.textContent = '';
    let i = 0;
    function tick() {
      if (i < msg.length) {
        el.textContent += msg[i++];
        typingTimer = setTimeout(tick, 26 + Math.random() * 18);
      }
    }
    setTimeout(tick, 350);
  }

  function rotate() {
    const front = getFront();
    if (!front) return;

    front.classList.add('is-flipping');

    // Mobile fade takes 400ms; desktop flip takes 380ms
    setTimeout(() => {
      front.style.transition = 'none';
      front.classList.remove('is-flipping', 'pos-0');
      front.classList.add('pos-2');
      const typing = front.querySelector('.lcard-typing');
      if (typing) typing.textContent = '';
      front.getBoundingClientRect();
      front.style.transition = '';

      cards.forEach(card => {
        if (card === front) return;
        if (card.classList.contains('pos-1')) {
          card.classList.replace('pos-1', 'pos-0');
        } else if (card.classList.contains('pos-2')) {
          card.classList.replace('pos-2', 'pos-1');
        }
      });

      const newFront = getFront();
      if (newFront) startTyping(parseInt(newFront.dataset.index));
    }, isMobileStack ? 400 : 380);
  }

  startTyping(0);
  // On mobile: keep the card static — no rotation interval
  if (!isMobileStack) setInterval(rotate, 4200);
}

/* --- Mockup Carousel (About Page) --- */
function initMockupCarousel() {
  if (window.innerWidth <= 768) return; // static on mobile
  const carousel = document.getElementById('mockup-carousel');
  if (!carousel) return;
  
  const images = carousel.querySelectorAll('.carousel-img');
  if (images.length === 0) return;
  
  let currentIndex = 0;
  
  setInterval(() => {
    images[currentIndex].classList.remove('active');
    currentIndex = (currentIndex + 1) % images.length;
    images[currentIndex].classList.add('active');
  }, 4000);
}

// Wire everything up on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initListingStack();
  initMockupCarousel();

  // If already joined, update page button and hide role toggle immediately
  if (_hasJoinedWaitlist) {
    const savedRole = localStorage.getItem('collabnb_waitlist_role') || 'creator';
    updatePageAfterWaitlistJoin(savedRole);
  }

  // Modal open buttons
  document.querySelectorAll('.btn-open-modal').forEach(btn => {
    btn.addEventListener('click', openModal);
  });

  // Modal close
  const closeBtn = document.querySelector('#modal-close');
  if (closeBtn) closeBtn.addEventListener('click', () => closeModal());  

  // Re-init reveal observer after DOM is ready (catches any missed elements — desktop only)
  if (revealObserver) {
    document.querySelectorAll('.reveal:not(.in)').forEach(el => revealObserver.observe(el));
  }

  // Close on overlay backdrop click
  const overlay = document.querySelector('#modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  // Escape closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (overlay && overlay.classList.contains('open')) {
        closeModal();
      }
      if (loginOverlay && loginOverlay.classList.contains('open')) {
        closeLoginModal();
      }
      // Close legal modals
      document.querySelectorAll('.legal-modal-overlay.open').forEach(o => {
        const type = o.id.replace('-modal-overlay', '');
        closeLegalModal(type);
      });
    }
  });

  // Handle URL parameters (e.g. ?join=true)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('join') === 'true') {
    openModal();
  }

  // Role toggle (kept for Clerk sign-up role selection)
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => switchRole(btn.dataset.role));
  });

  // Login trigger buttons
  document.querySelectorAll('[data-login-trigger]').forEach(btn => {
    btn.addEventListener('click', openLoginModal);
  });

  // Login modal close button
  const loginCloseBtn = document.querySelector('#login-modal-close');
  if (loginCloseBtn) loginCloseBtn.addEventListener('click', closeLoginModal);

  // Login modal backdrop click — also close when clicking outside Clerk component
  const loginOverlay = document.querySelector('#login-modal-overlay');
  if (loginOverlay) {
    loginOverlay.addEventListener('click', (e) => {
      if (e.target === loginOverlay) closeLoginModal();
    });
  }

  // Login link in wizard modal -> open login modal
  const loginLink = document.querySelector('#modal-login-link');
  if (loginLink) {
    loginLink.addEventListener('click', (e) => {
      e.preventDefault();
      openLoginModal();
    });
  }

  // Copy share link
  const copyBtn = document.querySelector('#btn-copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => copyToClipboard('https://collabnb.vercel.app/index.html'));
  }

  // mailto share
  const mailBtn = document.querySelector('#btn-mail');
  if (mailBtn) {
    mailBtn.addEventListener('click', () => {
      const name = signedUpName || 'a friend';
      const subject = encodeURIComponent('You have to see this — Collabnb');
      const body = encodeURIComponent(
        `Hey!\n\nI just joined the Collabnb waitlist — it's a new platform where creators book stays at boutique hotels and BnBs in exchange for content. First 100 creators and hosts get lifetime access, no commissions ever.\n\nThought you'd love it. Grab your spot before they fill up:\nhttps://collabnb.vercel.app/index.html\n\n— ${name}\n\nQuestions? Reach the team: hellocollabnb@gmail.com`
      );
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    });
  }

  // Swap nav CTA to "My Profile" for confirmed users
  initNavAuth();
});

function initWaitlistReturnBanner() {
  const waitlistEmail = localStorage.getItem('collabnb_waitlist_email');
  if (!waitlistEmail) return;
  // Don't show on join.html itself (they're mid-flow)
  if (window.location.pathname.endsWith('join.html')) return;

  const firstName = (localStorage.getItem('collabnb_waitlist_name') || '').split(' ')[0];
  const greeting  = firstName ? `Hey ${firstName}!` : 'Welcome back!';

  const banner = document.createElement('div');
  banner.id = 'wl-return-banner';
  banner.style.cssText = [
    'position:fixed', 'bottom:1.5rem', 'left:50%', 'transform:translateX(-50%)',
    'z-index:300', 'display:flex', 'align-items:center', 'gap:0.75rem',
    'background:var(--ink,#192524)', 'color:#fff', 'border-radius:9999px',
    'padding:0.625rem 0.75rem 0.625rem 1.25rem',
    'box-shadow:0 4px 24px rgba(25,37,36,0.28)',
    'font-family:var(--font-body,sans-serif)', 'font-size:0.875rem',
    'white-space:nowrap', 'max-width:calc(100vw - 2rem)',
    'animation:wl-banner-in 0.4s cubic-bezier(0.16,1,0.3,1) both',
  ].join(';');

  const style = document.createElement('style');
  style.textContent = '@keyframes wl-banner-in{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
  document.head.appendChild(style);

  const continueBtn = document.createElement('a');
  continueBtn.href = '/join.html';
  continueBtn.textContent = 'Finish creating your account →';
  continueBtn.style.cssText = 'background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);color:#fff;padding:0.375rem 0.875rem;border-radius:9999px;cursor:pointer;font-size:0.8rem;font-weight:600;text-decoration:none;white-space:nowrap;';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Dismiss');
  closeBtn.style.cssText = 'background:none;border:none;color:rgba(255,255,255,0.55);cursor:pointer;padding:0.25rem 0.375rem;font-size:1.1rem;line-height:1;flex-shrink:0;';
  closeBtn.addEventListener('click', () => banner.remove());

  const text = document.createElement('span');
  text.textContent = `${greeting} You're on the waitlist — `;

  banner.appendChild(text);
  banner.appendChild(continueBtn);
  banner.appendChild(closeBtn);
  document.body.appendChild(banner);
}

async function initNavAuth() {
  try {
    const clerk = await getClerk();
    if (!clerk?.user) {
      initWaitlistReturnBanner();
      return;
    }
    // Signed in — clear any pending waitlist re-engagement data
    localStorage.removeItem('collabnb_waitlist_name');
    localStorage.removeItem('collabnb_waitlist_email');

    const firstName = clerk.user.fullName?.split(' ')[0];
    const label = firstName ? `${firstName}'s Profile` : 'My Profile';

    // Hide the Login button — user is already signed in
    document.querySelectorAll('.btn-login').forEach(btn => btn.style.display = 'none');

    // Nav pill CTA
    const navCta = document.querySelector('.nav-pill .btn-primary');
    if (navCta) {
      navCta.textContent = label;
      navCta.href = '/profile.html';
      navCta.removeAttribute('data-modal');
    }

    // Mobile overlay CTA
    const overlayCta = document.querySelector('.nav-overlay .btn-primary');
    if (overlayCta) {
      overlayCta.textContent = label;
      overlayCta.href = '/profile.html';
      overlayCta.removeAttribute('data-modal');
    }

    // Replace page-body "Join the Waitlist" buttons with profile links
    document.querySelectorAll('.btn-open-modal').forEach(btn => {
      if (!btn.classList.contains('btn-primary')) return;

      // Clone to nuke any existing event listeners (openModal, etc.)
      const clone = document.createElement('a');
      clone.className = btn.className.replace('btn-open-modal', '');
      clone.textContent = label;
      clone.href = '/profile.html';

      // Copy inline styles
      if (btn.getAttribute('style')) {
        clone.setAttribute('style', btn.getAttribute('style'));
      }

      btn.parentNode.replaceChild(clone, btn);
    });

    // Post-OAuth / post-signup celebration on join.html
    // Fires when Clerk redirects back with ?celebrate=1 OR when SSO callback URL is join.html
    const onJoinPage = window.location.pathname.endsWith('join.html') || window.location.pathname.endsWith('/join');
    const urlParams = new URLSearchParams(window.location.search);
    const isCelebrate = urlParams.get('celebrate') === '1';
    const isNewSignupFlag = localStorage.getItem('collabnb_new_signup') === '1';
    if (onJoinPage && (isCelebrate || isNewSignupFlag)) {
      // Get the name saved before OAuth redirect (localStorage survives cross-origin)
      const savedName = localStorage.getItem('collabnb_signup_name') || '';
      localStorage.removeItem('collabnb_signup_name');
      localStorage.removeItem('collabnb_new_signup');
      const name = savedName || clerk.user?.fullName || clerk.user?.firstName || '';
      // Clean URL param
      window.history.replaceState({}, '', window.location.pathname);
      // Open the modal with celebration screen
      const overlay = document.querySelector('#modal-overlay');
      if (overlay && !overlay.classList.contains('open')) {
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        setTimeout(() => _showWizardDone(name), 100);
      } else {
        _showWizardDone(name);
      }
    }
  } catch (_) {
    // silently fail — nav stays as default
  }
}

/* ─── Legal Modals (TOS / Privacy) ─── */

function openLegalModal(type) {
  const overlay = document.querySelector(`#${type}-modal-overlay`);
  if (!overlay) return;
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  const scrollBox = overlay.querySelector('[data-legal-scroll]');
  if (scrollBox) {
    scrollBox.scrollTop = 0;
    startLegalAutoScroll(scrollBox);
  }

  const focusable = overlay.querySelectorAll('button, a[href]');
  if (focusable.length) focusable[0].focus();
}

function closeLegalModal(type) {
  const overlay = document.querySelector(`#${type}-modal-overlay`);
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  stopLegalAutoScroll(type);

  const trigger = document.querySelector(`[data-open-legal="${type}"]`);
  if (trigger) trigger.focus();
}

// Auto-scroll
const legalScrollState = {};

function startLegalAutoScroll(container) {
  const type = container.getAttribute('data-legal-scroll');
  if (!type) return;

  // Stop any existing scroll for this type
  stopLegalAutoScroll(type);

  let paused = false;
  let raf = null;

  const indicator = document.querySelector(`[data-legal-indicator="${type}"]`);

  function frame() {
    if (!paused) {
      container.scrollTop += 0.7;
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  const onEnter = () => {
    paused = true;
    if (indicator) indicator.textContent = 'Scrolling paused';
  };
  const onLeave = () => {
    paused = false;
    if (indicator) indicator.textContent = 'Scroll to continue reading';
  };

  container.addEventListener('mouseenter', onEnter);
  container.addEventListener('mouseleave', onLeave);

  // Show indicator until user scrolls manually
  const showIndicator = () => {
    if (indicator) indicator.classList.add('visible');
    container.removeEventListener('scroll', showIndicator);
  };
  container.addEventListener('scroll', showIndicator, { once: true });
  // Show it after a short delay if no scroll yet
  setTimeout(showIndicator, 1500);

  legalScrollState[type] = { raf, paused, onEnter, onLeave, container };
}

function stopLegalAutoScroll(type) {
  const state = legalScrollState[type];
  if (!state) return;
  if (state.raf) cancelAnimationFrame(state.raf);
  state.container.removeEventListener('mouseenter', state.onEnter);
  state.container.removeEventListener('mouseleave', state.onLeave);
  delete legalScrollState[type];
}

// Wire legal modal triggers on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  // Open triggers
  document.querySelectorAll('[data-open-legal]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      openLegalModal(link.getAttribute('data-open-legal'));
    });
  });

  // Close triggers
  document.querySelectorAll('[data-close-legal]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeLegalModal(btn.getAttribute('data-close-legal'));
    });
  });

  // Close on overlay backdrop click
  document.querySelectorAll('.legal-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        const type = overlay.id.replace('-modal-overlay', '');
        closeLegalModal(type);
      }
    });
  });

  // Escape closes legal modals (added to existing Escape handler logic)
  // This check runs alongside the existing Escape handler
});

