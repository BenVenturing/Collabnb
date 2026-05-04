import { supabase } from '/scripts/supabase.js';

let profileLoaded = false;

/* ── Demo fallback data (shown when Supabase isn't available) ── */
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
  ['state-loading', 'state-not-authed', 'state-unconfirmed', 'state-error', 'state-profile'].forEach(s => {
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

async function loadProfile(user) {
  if (profileLoaded) return;

  let profile = null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      profile = data;
    }
  } catch (err) {
    console.warn('Supabase profile query failed, using demo data:', err.message);
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
    const result = await supabase.auth.getSession();
    console.log('[profile] getSession result:', JSON.stringify({ hasData: !!result?.data, hasSession: !!result?.data?.session, userId: result?.data?.session?.user?.id }));
    const { data: { session } } = result;

    if (!session) {
      console.log('[profile] No session — showing not-authed');
      showState('state-not-authed');
    } else if (!session.user.email_confirmed_at) {
      console.log('[profile] Session exists but email not confirmed');
      document.getElementById('unconfirmed-email').textContent = session.user.email;
      showState('state-unconfirmed');
    } else {
      console.log('[profile] Session valid, loading profile for user:', session.user.id);
      await loadProfile(session.user);
    }
  } catch (err) {
    console.warn('[profile] Auth check failed, showing demo profile:', err.message, err.stack);
    profileLoaded = true;
    showState('state-profile');
    document.title = 'Demo Profile — Collabnb';
    document.getElementById('founder-banner').hidden = false;
    renderCreatorProfile(DEMO_CREATOR);
  }
})();

/* ── Handle subsequent auth events (SIGNED_IN, SIGNED_OUT) ── */
supabase.auth.onAuthStateChange(async (event, session) => {
  if (profileLoaded) return;

  if (event === 'SIGNED_IN') {
    if (session?.user?.email_confirmed_at) {
      await loadProfile(session.user);
    } else if (session?.user) {
      document.getElementById('unconfirmed-email').textContent = session.user.email;
      showState('state-unconfirmed');
    }
  }
});

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

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      errorEl.textContent = 'Wrong email or password. Try again.';
    } else if (error.message.includes('Email not confirmed')) {
      errorEl.textContent = 'Please confirm your email first. Check your inbox.';
    } else {
      errorEl.textContent = error.message;
    }
    errorEl.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
    return;
  }

  showState('state-loading');
}

// Wire up sign-in form
document.getElementById('btn-show-signin')?.addEventListener('click', showSigninForm);
document.getElementById('btn-back-to-waitlist')?.addEventListener('click', hideSigninForm);
document.getElementById('signin-form')?.addEventListener('submit', handleSignIn);

// Sign out
document.getElementById('btn-signout')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = '/index.html';
});
