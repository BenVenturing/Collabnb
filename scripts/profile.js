import { getProfileByEmail } from './convex.js';

let profileLoaded = false;

/* ── Clerk instance (cached) ── */
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

/* ── Demo fallback data (shown when Clerk/Convex isn't available) ── */
const DEMO_CREATOR = {
  full_name: 'Jamie Chen',
  instagram_handle: 'jamiecreates',
  tier: 'micro',
  role: 'creator',
  city: 'Los Angeles',
  region: 'CA',
  is_founder: true,
  website_url: 'https://jamiechen.com',
  recent_collabs: '4-10',
};
const DEMO_HOST = {
  full_name: 'Moss & Pine Cabin',
  business_name: 'Moss & Pine Cabin',
  role: 'host',
  city: 'South Lake Tahoe',
  region: 'CA',
  property_type: 'Boutique Stay',
  is_founder: false,
};

function showState(id) {
  ['state-loading', 'state-not-authed', 'state-unconfirmed', 'state-set-password', 'state-error', 'state-profile'].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.hidden = s !== id;
  });
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const TIER_LABELS = {
  'ugc-beginner': 'UGC Beginner',
  'ugc_beginner': 'UGC Beginner',
  'ugc-pro':      'UGC Pro',
  'ugc_pro':      'UGC Pro',
  'micro':        'Micro Creator',
  'influencer':   'Influencer',
};

const COLLABS_LABELS = {
  '0':    'Building portfolio',
  '1-3':  '1–3 paid collabs',
  '4-10': '4–10 paid collabs',
  '10+':  '10+ paid collabs',
};

function renderCreatorProfile(profile) {
  const initials = getInitials(profile.full_name);
  document.getElementById('creator-initials').textContent = initials;
  document.getElementById('creator-name').textContent = profile.full_name || 'Creator';

  const handleEl = document.getElementById('creator-handle');
  handleEl.textContent = profile.instagram_handle ? `@${profile.instagram_handle.replace('@', '')}` : (profile.username ? `@${profile.username}` : '');

  const tierEl = document.getElementById('creator-tier-label');
  tierEl.textContent = TIER_LABELS[profile.tier] || profile.tier || 'Creator';

  const portfolioBtn = document.getElementById('creator-portfolio-btn');
  if (profile.website_url || profile.portfolio) {
    portfolioBtn.href = profile.website_url || profile.portfolio;
    portfolioBtn.hidden = false;
  } else {
    portfolioBtn.style.opacity = '0.5';
    portfolioBtn.style.pointerEvents = 'none';
  }

  document.getElementById('stat-followers').textContent = '413K';
  document.getElementById('stat-engagement').textContent = '8.2%';

  const collabKey = profile.recent_collabs;
  document.getElementById('stat-collabs').textContent = COLLABS_LABELS[collabKey]?.split(' ')[0] || '12';

  document.getElementById('creator-profile').hidden = false;
}

function renderHostProfile(profile) {
  const initials = getInitials(profile.business_name || profile.full_name);
  document.getElementById('host-initials').textContent = initials;
  document.getElementById('host-name').textContent = profile.business_name || profile.full_name || 'Host';

  const typeEl = document.getElementById('host-property-label');
  typeEl.textContent = profile.property_type || 'Boutique Stay';

  const locationEl = document.getElementById('host-location');
  const loc = [profile.city, profile.region].filter(Boolean).join(', ');
  if (loc) {
    locationEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right:4px;vertical-align:middle;"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"></path></svg> ${loc}`;
  } else {
    locationEl.textContent = 'Location not set';
  }

  document.getElementById('host-profile').hidden = false;
}

async function loadProfile(clerkUser) {
  if (profileLoaded) return;

  let profile = null;

  try {
    const email = clerkUser.primaryEmailAddress?.emailAddress;
    if (email) {
      profile = await getProfileByEmail(email);
    }
  } catch (err) {
    console.warn('Convex profile query failed, using demo data:', err.message);
  }

  // Fall back to demo data if the query failed or returned nothing
  if (!profile) {
    profile = DEMO_CREATOR;
  }

  profileLoaded = true;

  if (profile.is_founder) {
    document.getElementById('founder-banner').hidden = false;
  }

  showState('state-profile');
  document.title = `${profile.full_name?.split(' ')[0] || 'Profile'} — Collabnb`;

  if (profile.role === 'creator') {
    renderCreatorProfile(profile);
  } else {
    renderHostProfile(profile);
  }
}

/* ── Initialize profile on page load ── */
(async function initProfile() {
  try {
    console.log('[profile] initProfile started');
    const clerk = await getClerk();

    // Check if this is a fresh signup via email verification
    const isVerifiedSignup = clerk?.client?.signUp?.verifications?.emailAddress?.status === 'verified';

    if (clerk?.user) {
      // User is signed in — load Convex profile
      if (isVerifiedSignup) {
        showState('state-set-password');
      } else {
        showState('state-loading');
        await loadProfile(clerk.user);
      }
    } else if (isVerifiedSignup) {
      // Just verified email but not fully signed in yet — show set-password
      showState('state-set-password');
    } else {
      // Not signed in — show demo profile
      console.log('[profile] No valid session — showing demo profile');
      throw new Error('no session');
    }
  } catch (err) {
    console.warn('[profile] Auth check failed, showing demo profile:', err.message);
    showState('state-profile');
    document.title = 'Demo Profile — Collabnb';
    document.getElementById('founder-banner').hidden = false;
    renderCreatorProfile(DEMO_CREATOR);
  }
})();

/* ── Sign-in flow (for returning users) ── */

function showSigninForm() {
  document.getElementById('not-authed-default').hidden = true;
  document.getElementById('not-authed-signin').hidden = false;
  document.getElementById('signin-email').focus();
}

function hideSigninForm() {
  document.getElementById('not-authed-signin').hidden = true;
  document.getElementById('not-authed-default').hidden = false;
  document.getElementById('signin-error').style.display = 'none';
}

async function handleSignIn(e) {
  e.preventDefault();
  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;
  const errorEl = document.getElementById('signin-error');
  const submitBtn = document.getElementById('btn-signin-submit');

  if (!email || !password) {
    errorEl.textContent = 'Please enter your email and password.';
    errorEl.style.display = 'block';
    return;
  }

  errorEl.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in…';

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

    showState('state-loading');
  } catch (err) {
    errorEl.textContent = getClerkErrorMessage(err);
    errorEl.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
  }
}

// Wire up sign-in form
document.getElementById('btn-show-signin')?.addEventListener('click', showSigninForm);
document.getElementById('btn-back-to-waitlist')?.addEventListener('click', hideSigninForm);
document.getElementById('signin-form')?.addEventListener('submit', handleSignIn);

// Sign out
document.getElementById('btn-signout')?.addEventListener('click', async () => {
  const clerk = await getClerk();
  if (clerk) await clerk.signOut();
  window.location.href = '/index.html';
});

/* ── Set password after email verification ── */
document.getElementById('set-password-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newPwd = document.getElementById('new-password').value;
  const confirmPwd = document.getElementById('confirm-password').value;
  const errorEl = document.getElementById('set-password-error');
  const btn = document.getElementById('btn-set-password');

  if (newPwd !== confirmPwd) {
    errorEl.textContent = 'Passwords do not match.';
    errorEl.style.display = 'block';
    return;
  }

  errorEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const clerk = await getClerk();
    if (!clerk?.user) throw new Error('No user');
    await clerk.user.update({ password: newPwd });

    showState('state-loading');
    if (clerk.user) await loadProfile(clerk.user);
  } catch (err) {
    errorEl.textContent = getClerkErrorMessage(err);
    errorEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Save Password';
  }
});
