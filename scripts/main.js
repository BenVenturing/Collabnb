/* ============================================================
   Collabnb — Main JavaScript
   ============================================================ */

import { supabase } from './supabase.js';

let signedUpName = '';

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
      const [creatorRes, hostRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'creator'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'host'),
      ]);
      creators = creatorRes.count ?? 0;
      hosts = hostRes.count ?? 0;
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

  // Real-time subscription
  if (supabase.channel) {
    supabase
      .channel('schema-db-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'profiles' }, 
        (payload) => {
          if (payload.new.role === 'creator') creators++;
          if (payload.new.role === 'host') hosts++;
          updateUI();
        }
      )
      .subscribe();
  }
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

    // Waitlist signup — no password needed, email verification handles access
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();

    const metadata = role === 'creator'
      ? {
          full_name: data.full_name,
          role,
          phone_number: data.phone_number,
          instagram_handle: data.instagram_handle,
          website_url: data.website_url,
          username: data.username,
          tier: data.tier,
          recent_collabs: data.recent_collabs,
          portfolio: data.portfolio,
          beta: data.beta || false,
          city: data.city || '',
          region: data.region || '',
        }
      : {
          full_name: data.full_name,
          role,
          phone_number: data.phone_number,
          instagram_handle: data.instagram_handle,
          website_url: data.website_url,
          username: data.business_name,
          business_name: data.business_name,
          property_type: data.property_type,
          city: data.city,
          region: data.region,
          beta: data.beta || false,
        };

    const { error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: randomPassword,
      options: {
        data: metadata,
        emailRedirectTo: window.location.origin + '/profile.html',
      }
    });

    if (authError) throw authError;

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
    copyBtn.addEventListener('click', () => copyToClipboard(window.location.origin + '/index.html'));
  }

  // mailto share
  const mailBtn = document.querySelector('#btn-mail');
  if (mailBtn) {
    mailBtn.addEventListener('click', () => {
      const name = signedUpName || 'a friend';
      const subject = encodeURIComponent('You have to see this — Collabnb');
      const body = encodeURIComponent(
        `Hey!\n\nI just joined the Collabnb waitlist — it's a new platform where creators book stays at boutique hotels and BnBs in exchange for content. First 100 creators and hosts get lifetime access, no commissions ever.\n\nThought you'd love it. Grab your spot before they fill up:\n${window.location.origin}/index.html\n\n— ${name}\n\nQuestions? Reach the team: hellocollabnb@gmail.com`
      );
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    });
  }

  // Swap nav CTA to "My Profile" for confirmed users
  initNavAuth();
});

async function initNavAuth() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email_confirmed_at) return;

    const firstName = user.user_metadata?.full_name?.split(' ')[0];
    const label = firstName ? `${firstName}'s Profile` : 'My Profile';

    const navCta     = document.querySelector('.nav-pill .btn-primary');
    const overlayCta = document.querySelector('.nav-overlay .btn-primary');

    [navCta, overlayCta].forEach(btn => {
      if (!btn) return;
      btn.textContent = label;
      btn.href = '/profile.html';
      btn.removeAttribute('data-modal');
    });
  } catch (_) {
    // silently fail — nav stays as default
  }
}
