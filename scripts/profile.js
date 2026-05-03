import { supabase } from '/scripts/supabase.js';

let profileLoaded = false;

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

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const TIER_LABELS = {
  'ugc_beginner': 'UGC Beginner',
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

function badge(cls, text) {
  return `<span class="pf-badge pf-badge--${cls}">${text}</span>`;
}

function profileRow(icon, label, value) {
  return `
    <div class="pf-row">
      <div class="pf-row-icon">${icon}</div>
      <div class="pf-row-body">
        <div class="pf-row-label">${label}</div>
        <div class="pf-row-value">${value}</div>
      </div>
    </div>`;
}

function renderCreatorProfile(profile) {
  const initials = getInitials(profile.full_name);
  document.getElementById('creator-initials').textContent = initials;
  document.getElementById('creator-name').textContent = profile.full_name || 'Creator';

  // Handle & Tier
  const handleEl = document.getElementById('creator-handle');
  handleEl.textContent = profile.instagram_handle ? `@${profile.instagram_handle.replace('@', '')}` : (profile.username ? `@${profile.username}` : '');
  
  const tierEl = document.getElementById('creator-tier-label');
  tierEl.textContent = TIER_LABELS[profile.tier] || profile.tier || 'Creator';

  // Portfolio
  const portfolioBtn = document.getElementById('creator-portfolio-btn');
  if (profile.website_url || profile.portfolio) {
    portfolioBtn.href = profile.website_url || profile.portfolio;
    portfolioBtn.hidden = false;
  } else {
    portfolioBtn.style.opacity = '0.5';
    portfolioBtn.style.pointerEvents = 'none';
  }

  // Mock stats (since they aren't in the DB yet)
  document.getElementById('stat-followers').textContent = '413K';
  document.getElementById('stat-engagement').textContent = '8.2%';
  document.getElementById('stat-collabs').textContent = COLLABS_LABELS[profile.recent_collabs]?.split(' ')[0] || '12';

  document.getElementById('creator-profile').hidden = false;
}

function renderHostProfile(profile) {
  const initials = getInitials(profile.business_name || profile.full_name);
  document.getElementById('host-initials').textContent = initials;
  document.getElementById('host-name').textContent = profile.business_name || profile.full_name || 'Host';

  // Property Type
  const typeEl = document.getElementById('host-property-label');
  typeEl.textContent = profile.property_type || 'Boutique Stay';

  // Location
  const locationEl = document.getElementById('host-location');
  const loc = [profile.city, profile.region].filter(Boolean).join(', ');
  if (loc) {
    locationEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right:4px;vertical-align:middle;"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"></path></svg> ${loc}`;
  } else {
    locationEl.textContent = 'Location not set';
  }

  // Action buttons
  // (In a real app, these would link to specific routes)

  document.getElementById('host-profile').hidden = false;
}

async function loadProfile(user) {
  if (profileLoaded) return;

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      showState('state-error');
      return;
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

  } catch (err) {
    console.error('Profile load error:', err);
    showState('state-error');
  }
}

// Auth state handler — also fires when email confirmation link is clicked
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'INITIAL_SESSION') {
    if (!session) {
      showState('state-not-authed');
    } else if (!session.user.email_confirmed_at) {
      document.getElementById('unconfirmed-email').textContent = session.user.email;
      showState('state-unconfirmed');
    } else {
      await loadProfile(session.user);
    }
  } else if (event === 'SIGNED_IN' && !profileLoaded) {
    if (session?.user?.email_confirmed_at) {
      await loadProfile(session.user);
    } else if (session?.user) {
      document.getElementById('unconfirmed-email').textContent = session.user.email;
      showState('state-unconfirmed');
    }
  }
});

// Sign out
document.getElementById('btn-signout')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = '/index.html';
});
