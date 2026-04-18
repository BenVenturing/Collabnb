/* ============================================================
   Collabnb — Main JavaScript
   ============================================================ */

import { supabase } from './supabase.js';

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

/* --- Hamburger nav (mobile) --- */
const hamburger = document.querySelector('.nav-hamburger');
const navOverlay = document.querySelector('.nav-overlay');

if (hamburger && navOverlay) {
  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('open');
    navOverlay.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  navOverlay.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navOverlay.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navOverlay.classList.contains('open')) {
      hamburger.classList.remove('open');
      navOverlay.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
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

  try {
    const res = await fetch('/api/counts', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      creators = data.creators || 0;
      hosts = data.hosts || 0;
    }
  } catch (err) {
    console.warn('Could not fetch live counts:', err);
  }

  const creatorEl = document.querySelector('#count-creators');
  const hostEl = document.querySelector('#count-hosts');
  const creatorBar = document.querySelector('#bar-creators');
  const hostBar = document.querySelector('#bar-hosts');
  const creatorMini = document.querySelector('.count-creators-mini');
  const hostMini = document.querySelector('.count-hosts-mini');

  if (creatorEl) runCount(creatorEl, creators);
  if (hostEl) runCount(hostEl, hosts);

  if (creatorBar) {
    setTimeout(() => { creatorBar.style.width = `${Math.min(100, (creators / 100) * 100)}%`; }, 200);
  }
  if (hostBar) {
    setTimeout(() => { hostBar.style.width = `${Math.min(100, (hosts / 100) * 100)}%`; }, 200);
  }

  // Mini counters on join page
  if (creatorMini) creatorMini.textContent = creators;
  if (hostMini) hostMini.textContent = hosts;
}

// Only run counters when elements are visible
const counterSection = document.querySelector('.counters-grid');
if (counterSection) {
  const cObs = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      initCounters();
      cObs.disconnect();
    }
  }, { threshold: 0.3 });
  cObs.observe(counterSection);
} else {
  // join page mini counters
  if (document.querySelector('.count-creators-mini')) initCounters();
}

/* --- Countdown timer --- */
function initCountdown() {
  const els = document.querySelectorAll('[data-countdown]');
  if (!els.length) return;

  const target = new Date('2026-06-01T00:00:00+07:00');

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

/* --- Modal Wizard --- */
let currentStep = 1;
let currentRole = 'creator';
const CREATOR_STEPS = 4;
const HOST_STEPS = 3;

function getMaxSteps() {
  return currentRole === 'creator' ? CREATOR_STEPS : HOST_STEPS;
}

function openModal() {
  const overlay = document.querySelector('#modal-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Focus trap setup
  const focusable = overlay.querySelectorAll('button, input, select, a[href], [tabindex]:not([tabindex="-1"])');
  if (focusable.length) focusable[0].focus();

  currentStep = 1;
  showStep(1);
  updateProgress();
}

function closeModal() {
  const overlay = document.querySelector('#modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  // Return focus to trigger
  const trigger = document.querySelector('.btn-open-modal');
  if (trigger) trigger.focus();
}

function showStep(n) {
  const role = currentRole;
  document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
  // Find step matching role OR 'both'; prefer role-specific match
  let step = document.querySelector(`[data-step="${n}"][data-role="${role}"]`);
  if (!step) step = document.querySelector(`[data-step="${n}"][data-role="both"]`);
  if (step) step.classList.add('active');

  updateStepDots(n);
  currentStep = n;
  updateProgress();
}

function updateProgress() {
  const bar = document.querySelector('.modal-progress-fill');
  if (!bar) return;
  const max = getMaxSteps();
  bar.style.width = `${((currentStep - 1) / max) * 100}%`;
}

function updateStepDots(active) {
  document.querySelectorAll('.step-dot').forEach((dot, i) => {
    const n = i + 1;
    dot.classList.remove('active', 'done');
    if (n < active) dot.classList.add('done');
    else if (n === active) dot.classList.add('active');
  });
}

function nextStep() {
  const max = getMaxSteps();
  if (currentStep < max) {
    showStep(currentStep + 1);
  } else {
    submitForm();
  }
}

function prevStep() {
  if (currentStep > 1) showStep(currentStep - 1);
}

function switchRole(role) {
  currentRole = role;
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.role === role);
  });

  // Update step dots count
  const dotsContainer = document.querySelector('.step-indicator');
  if (dotsContainer) {
    const max = getMaxSteps();
    dotsContainer.innerHTML = '';
    for (let i = 1; i <= max; i++) {
      if (i > 1) {
        const line = document.createElement('div');
        line.className = 'step-line';
        dotsContainer.appendChild(line);
      }
      const dot = document.createElement('div');
      dot.className = 'step-dot' + (i === 1 ? ' active' : '');
      dot.textContent = i;
      dotsContainer.appendChild(dot);
    }
  }

  // Update mini counter label
  const miniLabel = document.querySelector('.join-mini-counter');
  if (miniLabel) {
    const el = miniLabel.querySelector(role === 'creator' ? '.count-creators-mini' : '.count-hosts-mini');
    const count = el ? el.textContent : '0';
    miniLabel.innerHTML = `<strong>${100 - parseInt(count)} / 100</strong> ${role === 'creator' ? 'creator' : 'host'} spots remaining`;
  }

  showStep(1);
}

async function handleLogin() {
  const email = prompt('Enter your email:');
  const password = prompt('Enter your password:');
  if (!email || !password) return;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) alert(error.message);
  else {
    alert('Welcome back!');
    closeModal();
    window.location.reload();
  }
}

async function submitForm() {
  const submitBtn = document.querySelector('.btn-next:last-of-type');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Joining...';
  }

  try {
    const data = {};
    if (currentRole === 'creator') {
      data.email = document.querySelector('#c-email')?.value;
      data.password = document.querySelector('#c-password')?.value;
      data.full_name = document.querySelector('#c-name')?.value;
      data.username = document.querySelector('#c-instagram')?.value || document.querySelector('#c-tiktok')?.value;
      data.tier = document.querySelector('#c-tier')?.value;
      data.recent_collabs = document.querySelector('#c-collabs')?.value;
      data.portfolio = document.querySelector('#c-portfolio')?.value;
      data.beta = document.querySelector('#c-beta')?.checked;
    } else {
      data.email = document.querySelector('#h-email')?.value;
      data.password = document.querySelector('#h-password')?.value;
      data.full_name = document.querySelector('#h-name')?.value;
      data.business_name = document.querySelector('#h-business')?.value;
      data.property_type = document.querySelector('#h-type')?.value;
      data.city = document.querySelector('#h-city')?.value;
      data.region = document.querySelector('#h-region')?.value;
      data.beta = document.querySelector('#h-beta')?.checked;
    }

    // Sign up via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          role: currentRole,
          username: data.username || data.business_name
        }
      }
    });

    if (authError) throw authError;

    // Show success state
    const successEl = document.querySelector('#wizard-success');
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
    if (successEl) {
      successEl.classList.add('active');
      const bar = document.querySelector('.modal-progress-fill');
      if (bar) bar.style.width = '100%';

      // Update success message based on role
      const successTitle = successEl.querySelector('h3');
      const successDesc = successEl.querySelector('p');
      if (currentRole === 'creator') {
        if (successTitle) successTitle.textContent = "You're on the list, creator.";
        if (successDesc) successDesc.textContent = "We've sent a verification link to your email. Check your inbox to confirm your spot for lifetime access.";
      } else {
        if (successTitle) successTitle.textContent = "You're on the list, host.";
        if (successDesc) successDesc.textContent = "We've sent a verification link to your email. Confirm your email to secure early access for your property.";
      }
    }

  } catch (err) {
    console.error('Signup error:', err);
    alert('Oops! Something went wrong: ' + err.message);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Join the Waitlist';
    }
  }
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
  }).catch(() => {
    // Fallback for non-secure contexts
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

// Wire everything up on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
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

  // Escape closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) {
      closeModal();
    }
  });

  // Handle URL parameters (e.g. ?join=true)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('join') === 'true') {
    openModal();
  }

  // Next/back buttons
  document.querySelectorAll('.btn-next').forEach(btn => {
    btn.addEventListener('click', nextStep);
  });
  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', prevStep);
  });

  // Role toggle
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => switchRole(btn.dataset.role));
  });

  // Login link
  const loginLink = document.querySelector('#modal-login-link');
  if (loginLink) {
    loginLink.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogin();
    });
  }

  // Copy share link
  const copyBtn = document.querySelector('#btn-copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => copyToClipboard('https://collabnb.co'));
  }

  // mailto share
  const mailBtn = document.querySelector('#btn-mail');
  if (mailBtn) {
    mailBtn.addEventListener('click', () => {
      window.location.href = 'mailto:?subject=Join%20Collabnb&body=I%20just%20joined%20the%20Collabnb%20waitlist%20%E2%80%94%20a%20collab%20marketplace%20for%20creators%20and%20boutique%20stays.%20Check%20it%20out%3A%20https%3A%2F%2Fcollabnb.co';
    });
  }
});
