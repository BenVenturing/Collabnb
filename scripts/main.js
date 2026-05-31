/* ============================================================
   Collabnb — Main JavaScript
   ============================================================ */

import { getProfileCounts, waitlistSignUp, updateWaitlistProfile } from './convex.js';

let signedUpName = '';

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
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

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
  _wizardEmail = '';
  _wizardName = '';
  const roleSection = document.getElementById('modal-role-section');
  if (roleSection) roleSection.style.display = '';
  showWizardStep(1);
}

function showWizardStep(step) {
  const area = document.querySelector('#clerk-sign-up-area');
  if (!area) return;
  _updatePageDots(step);
  const titleEl = document.getElementById('modal-title');
  const subtitleEl = document.getElementById('modal-subtitle');

  if (step === 1) {
    if (titleEl) titleEl.textContent = `Finalize your ${currentRole} profile`;
    if (subtitleEl) subtitleEl.style.display = '';
    area.innerHTML = `
      <form id="wl-step1" style="display:flex;flex-direction:column;gap:1rem;">
        <div class="form-group">
          <label class="form-label" for="wl-name">Full name</label>
          <input class="form-input" type="text" id="wl-name" placeholder="Jane Smith" autocomplete="name" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="wl-email">Email address</label>
          <input class="form-input" type="email" id="wl-email" placeholder="jane@example.com" autocomplete="email" required />
        </div>
        <button type="submit" id="wl-submit" class="btn-primary" style="width:100%;cursor:pointer;">Save my spot →</button>
        <div id="wl-error" style="display:none;color:#e74c3c;font-size:0.8125rem;text-align:center;"></div>
      </form>`;
    document.getElementById('wl-step1')?.addEventListener('submit', handleStep1Submit);

  } else if (step === 2) {
    if (titleEl) titleEl.textContent = 'Tell us about yourself';
    if (subtitleEl) subtitleEl.style.display = 'none';
    const firstName = _wizardName.split(' ')[0];
    const fields = currentRole === 'creator' ? `
      <div class="form-group">
        <label class="form-label" for="wl-instagram">Instagram handle <span style="color:var(--sage);font-weight:400;">(optional)</span></label>
        <input class="form-input" type="text" id="wl-instagram" placeholder="@yourhandle" />
      </div>
      <div class="form-group">
        <label class="form-label" for="wl-tiktok">TikTok handle <span style="color:var(--sage);font-weight:400;">(optional)</span></label>
        <input class="form-input" type="text" id="wl-tiktok" placeholder="@yourhandle" />
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
        ${fields}
        <button type="submit" class="btn-primary" style="width:100%;cursor:pointer;">Continue →</button>
        <button type="button" id="wl-skip2" style="background:none;border:none;color:var(--sage);font-size:0.8rem;cursor:pointer;padding:0.25rem 0;">Skip for now</button>
        <div id="wl-error2" style="display:none;color:#e74c3c;font-size:0.8125rem;text-align:center;"></div>
      </form>`;
    document.getElementById('wl-step2')?.addEventListener('submit', handleStep2Submit);
    document.getElementById('wl-skip2')?.addEventListener('click', () => showWizardStep(3));

  } else if (step === 3) {
    if (titleEl) titleEl.textContent = 'Create your account';
    if (subtitleEl) subtitleEl.style.display = 'none';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) { _showWizardDone(); return; }
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
      clerk.mountSignUp(mountEl, { afterSignUpUrl: '/#/profile' });
    }).catch(_showWizardDone);
  }
}

function _showWizardDone() {
  const area = document.querySelector('#clerk-sign-up-area');
  const titleEl = document.getElementById('modal-title');
  if (titleEl) titleEl.textContent = "You're on the list!";
  if (!area) return;
  area.innerHTML = `
    <div style="text-align:center;padding:0.5rem 0 1rem;">
      <div style="width:64px;height:64px;border-radius:50%;background:var(--mint);display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" style="width:28px;height:28px;"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
      <p style="color:var(--sage);font-size:.875rem;line-height:1.6;margin-bottom:1.5rem;">We'll be in touch before July 1. Set up your profile to get the full experience.</p>
      <a href="/login.html" class="btn-primary" style="display:inline-block;text-decoration:none;padding:0.75rem 1.75rem;font-size:0.9375rem;">Enter Collabnb →</a>
    </div>`;
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
    const roleSection = document.getElementById('modal-role-section');
    if (roleSection) roleSection.style.display = 'none';
    launchConfetti();
    initCounters();
    showWizardStep(2);
  } catch (err) {
    console.error('Step 1 error:', err);
    if (errorEl) { errorEl.textContent = 'Something went wrong. Please try again.'; errorEl.style.display = 'block'; }
    if (btn) { btn.disabled = false; btn.textContent = 'Save my spot →'; }
  }
}

async function handleStep2Submit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  try {
    if (_wizardProfileId) {
      const raw = currentRole === 'creator'
        ? { instagram_handle: document.getElementById('wl-instagram')?.value?.trim(), tiktok_handle: document.getElementById('wl-tiktok')?.value?.trim() }
        : { city: document.getElementById('wl-city')?.value?.trim() };
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
  const trigger = document.querySelector('.btn-open-modal');
  if (trigger) trigger.focus();
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

  // Keep CTA button text in sync with selected role
  const joinCta = document.getElementById('join-cta');
  if (joinCta) joinCta.textContent = `Finalize your ${role} profile →`;

  // Update modal title if modal is open on step 1
  const titleEl = document.getElementById('modal-title');
  if (titleEl && document.querySelector('#modal-overlay.open')) {
    titleEl.textContent = `Finalize your ${role} profile`;
  }
}

/* --- Login Modal --- */
function openLoginModal() {
  const overlay = document.querySelector('#login-modal-overlay');
  if (!overlay) return;

  // Close the wizard modal if open
  const wizardOverlay = document.querySelector('#modal-overlay');
  if (wizardOverlay?.classList.contains('open')) closeModal();

  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Hide the nav pill
  const nav = document.querySelector('.nav-pill');
  if (nav) nav.style.display = 'none';

  // Focus first input
  const emailInput = document.querySelector('#login-modal-email');
  if (emailInput) emailInput.focus();
}

function closeLoginModal() {
  const overlay = document.querySelector('#login-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  // Show the nav pill again
  const nav = document.querySelector('.nav-pill');
  if (nav) nav.style.display = '';

  // Reset form
  const form = document.querySelector('#login-modal-form');
  if (form) form.reset();
  const errorEl = document.querySelector('#login-modal-error');
  if (errorEl) {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }
  const submitBtn = document.querySelector('#login-modal-submit');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
  }
}

function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;pointer-events:none;';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#4ecdc4', '#a8e6cf', '#ffd93d', '#ff8c94', '#c8b8ff', '#ffffff', '#7ee8a2'];
  const pieces = Array.from({ length: 160 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.6,
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

    ctx.clearRect(0, 0, canvas.width, canvas.height);
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

      if (p.y > canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
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

  function getFront() { return cards.find(c => c.classList.contains('pos-0')); }

  function startTyping(index) {
    clearTimeout(typingTimer);
    const front = getFront();
    if (!front) return;
    const el = front.querySelector('.lcard-typing');
    if (!el) return;
    el.textContent = '';
    const msg = LISTINGS[index].message;
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

    setTimeout(() => {
      // Snap old front to pos-2 without transition
      front.style.transition = 'none';
      front.classList.remove('is-flipping', 'pos-0');
      front.classList.add('pos-2');
      const typing = front.querySelector('.lcard-typing');
      if (typing) typing.textContent = '';
      front.getBoundingClientRect(); // force reflow
      front.style.transition = '';

      // Slide remaining cards forward (with transition)
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
    }, 380);
  }

  startTyping(0);
  setInterval(rotate, 4200);
}

/* --- Mockup Carousel (About Page) --- */
function initMockupCarousel() {
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

  // Modal open buttons
  document.querySelectorAll('.btn-open-modal').forEach(btn => {
    btn.addEventListener('click', openModal);
  });

  // Modal close
  const closeBtn = document.querySelector('#modal-close');
  if (closeBtn) closeBtn.addEventListener('click', () => closeModal());  

  // Re-init reveal observer after DOM is ready (catches any missed elements)
  document.querySelectorAll('.reveal:not(.in)').forEach(el => revealObserver.observe(el));

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

  // Login modal backdrop click
  const loginOverlay = document.querySelector('#login-modal-overlay');
  if (loginOverlay) {
    loginOverlay.addEventListener('click', (e) => {
      if (e.target === loginOverlay) closeLoginModal();
    });
  }

  // Login modal form submit
  const loginFormEl = document.querySelector('#login-modal-form');
  if (loginFormEl) {
    loginFormEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailEl = document.querySelector('#login-modal-email');
      const passwordEl = document.querySelector('#login-modal-password');
      const errorEl = document.querySelector('#login-modal-error');
      const submitBtn = document.querySelector('#login-modal-submit');

      const email = emailEl?.value?.trim();
      const password = passwordEl?.value;

      if (!email || !password) {
        if (errorEl) {
          errorEl.textContent = 'Please enter your email and password.';
          errorEl.style.display = 'block';
        }
        return;
      }

      if (errorEl) errorEl.style.display = 'none';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in…';
      }

      try {
        const clerk = await getClerk();
        if (!clerk) throw new Error('Clerk not configured');

        const signInAttempt = await clerk.client.signIn.create({
          identifier: email,
          password: password,
        });

        if (signInAttempt.status !== 'complete') {
          throw new Error(`Additional authentication required (status: ${signInAttempt.status}).`);
        }

        // Success — redirect to profile
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        window.location.href = isLocalhost ? 'http://localhost:5174/#/profile' : '/profile.html';

      } catch (err) {
        const msg = getClerkErrorMessage(err);
        if (errorEl) {
          errorEl.textContent = msg;
          errorEl.style.display = 'block';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In';
        }
      }
    });
  }

  // ── Password visibility toggle (modal) ──────────────────────────────
  const modalPasswordToggle = document.querySelector('#login-modal-password-toggle');
  const modalPasswordInput = document.querySelector('#login-modal-password');
  const modalPasswordEye = document.querySelector('#login-modal-password-eye');
  modalPasswordToggle?.addEventListener('click', () => {
    if (!modalPasswordInput) return;
    const isPassword = modalPasswordInput.type === 'password';
    modalPasswordInput.type = isPassword ? 'text' : 'password';
    modalPasswordToggle.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    if (modalPasswordEye) {
      modalPasswordEye.innerHTML = isPassword
        ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
        : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
  });

  // ── Forgot password (modal) ─────────────────────────────────────────
  const modalForgotBtn = document.querySelector('#login-modal-forgot');
  const modalEmailEl = document.querySelector('#login-modal-email');
  const modalErrorEl = document.querySelector('#login-modal-error');
  modalForgotBtn?.addEventListener('click', async () => {
    const email = modalEmailEl?.value?.trim();
    if (!email) {
      if (modalErrorEl) {
        modalErrorEl.textContent = 'Enter your email address first.';
        modalErrorEl.style.display = 'block';
      }
      return;
    }
    modalForgotBtn.disabled = true;
    modalForgotBtn.textContent = 'Sending…';
    try {
      const clerk = await getClerk();
      if (!clerk) throw new Error('Clerk not configured');
      await clerk.client.signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      modalForgotBtn.textContent = 'Check your inbox';
      if (modalErrorEl) { modalErrorEl.textContent = ''; modalErrorEl.style.display = 'none'; }
    } catch (err) {
      const msg = getClerkErrorMessage(err) || 'Could not send reset email. Try again.';
      if (modalErrorEl) { modalErrorEl.textContent = msg; modalErrorEl.style.display = 'block'; }
      modalForgotBtn.disabled = false;
      modalForgotBtn.textContent = 'Forgot password?';
    }
  });

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

async function initNavAuth() {
  try {
    const clerk = await getClerk();
    if (!clerk?.user) return;

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

