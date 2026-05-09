/* ============================================================
   Collabnb — Main JavaScript
   ============================================================ */

import { getProfileCounts } from './convex.js';

let signedUpName = '';

/* ── Lazy Clerk instance (shared across initNavAuth, submitForm, login) ── */
let _clerkPromise = null;
async function getClerk() {
  if (!_clerkPromise) {
    _clerkPromise = (async () => {
      const Clerk = (await import('@clerk/clerk-js')).default;
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
  // If we have a counters grid, wait for intersection, otherwise run immediately (join page)
  if (counterSection) {
    const cObs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        initCounters();
        cObs.disconnect();
      }
    }, { threshold: 0.1 });
    cObs.observe(counterSection);
  } else {
    initCounters();
  }
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
    const count = role === 'creator' ? creators : hosts;
    miniLabel.innerHTML = `<strong>${100 - count} / 100</strong> ${role === 'creator' ? 'creator' : 'host'} spots remaining`;
  }

  showStep(1);
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

async function submitForm() {
  const role = currentRole;
  const data = {};
  let submitBtn = null;

  try {
    if (role === 'creator') {
      data.email = document.querySelector('#c-email')?.value?.trim();
      data.full_name = document.querySelector('#c-name')?.value?.trim();
      data.phone_number = document.querySelector('#c-phone')?.value?.trim();
      data.username = document.querySelector('#c-instagram')?.value?.trim() || document.querySelector('#c-tiktok')?.value?.trim();
      data.instagram_handle = document.querySelector('#c-instagram')?.value?.trim();
      data.tier = document.querySelector('#c-tier')?.value;
      data.recent_collabs = document.querySelector('#c-collabs')?.value;
      data.portfolio = document.querySelector('#c-portfolio')?.value?.trim();
      data.website_url = document.querySelector('#c-portfolio')?.value?.trim();
      data.beta = document.querySelector('#c-beta')?.checked;
      data.city = document.querySelector('#c-city')?.value?.trim();
      data.region = document.querySelector('#c-country')?.value?.trim();
    } else {
      data.email = document.querySelector('#h-email')?.value?.trim();
      data.full_name = document.querySelector('#h-name')?.value?.trim();
      data.phone_number = document.querySelector('#h-phone')?.value?.trim();
      data.business_name = document.querySelector('#h-business')?.value?.trim();
      data.property_type = document.querySelector('#h-type')?.value;
      data.instagram_handle = document.querySelector('#h-instagram')?.value?.trim();
      data.website_url = document.querySelector('#h-website')?.value?.trim();
      data.city = document.querySelector('#h-city')?.value?.trim();
      data.region = document.querySelector('#h-region')?.value?.trim();
      data.beta = document.querySelector('#h-beta')?.checked;
    }

    if (!data.email || !data.full_name) {
      throw new Error('Please fill out your name and email.');
    }

    submitBtn = document.querySelector(`.wizard-step[data-role="${role}"].active .btn-next`);
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Joining...';
    }

    // Waitlist signup — use Clerk for auth
    const clerk = await getClerk();
    if (!clerk) throw new Error('Clerk not configured. Add VITE_CLERK_PUBLISHABLE_KEY to .env');

    const signUp = await clerk.client.signUp.create({
      emailAddress: data.email,
      password: crypto.randomUUID() + crypto.randomUUID(),
      unsafeMetadata: metadata,
    });

    await signUp.prepareEmailAddressVerification({
      strategy: 'email_link',
      redirectUrl: window.location.origin + '/profile.html',
    });

    signedUpName = data.full_name.split(' ')[0];

    const successEl = document.querySelector('#wizard-success');
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
    if (successEl) {
      successEl.classList.add('active');
      const bar = document.querySelector('.modal-progress-fill');
      if (bar) bar.style.width = '100%';

      const successTitle = successEl.querySelector('h3');
      const successDesc = successEl.querySelector('p');
      if (successTitle) successTitle.textContent = `You're on the list, ${signedUpName}.`;
      if (successDesc) {
        successDesc.textContent = role === 'creator'
          ? "We've sent a verification link to your email. Check your inbox to confirm your spot for lifetime access."
          : "We've sent a verification link to your email. Confirm your email to secure early access for your property.";
      }
    }

    launchConfetti();

  } catch (err) {
    console.error('Signup error:', err);
    alert('Oops! Something went wrong: ' + err.message);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Join the Waitlist';
    }
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
          throw new Error('Additional authentication required.');
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

