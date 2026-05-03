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

  const usernameEl = document.getElementById('creator-username');
  usernameEl.textContent = profile.username ? `@${profile.username}` : '';

  const badgesEl = document.getElementById('creator-badges');
  let badgeHtml = '';
  if (profile.tier) badgeHtml += badge('tier', TIER_LABELS[profile.tier] || profile.tier);
  if (profile.is_founder) badgeHtml += badge('founder', '⭐ Founding Creator');
  if (profile.beta) badgeHtml += badge('beta', '🧪 Beta Tester');
  badgesEl.innerHTML = badgeHtml;

  const rows = [];
  if (profile.portfolio) {
    const display = profile.portfolio.replace(/^https?:\/\//, '');
    rows.push(profileRow('🔗', 'Portfolio', `<a href="${profile.portfolio}" target="_blank" rel="noopener">${display}</a>`));
  }
  const collabsText = COLLABS_LABELS[profile.recent_collabs];
  if (collabsText) rows.push(profileRow('🤝', 'Recent Collabs', collabsText));
  rows.push(profileRow('📅', 'Member Since', formatDate(profile.created_at)));

  document.getElementById('creator-body').innerHTML = rows.join('');
  document.getElementById('creator-profile').hidden = false;
}

function renderHostProfile(profile) {
  const initials = getInitials(profile.business_name || profile.full_name);
  document.getElementById('host-initials').textContent = initials;
  document.getElementById('host-name').textContent = profile.business_name || profile.full_name || 'Host';

  const locationEl = document.getElementById('host-location');
  const loc = [profile.city, profile.region].filter(Boolean).join(', ');
  locationEl.textContent = loc ? `📍 ${loc}` : '';

  const badgesEl = document.getElementById('host-badges');
  let badgeHtml = '';
  if (profile.property_type) badgeHtml += badge('property', profile.property_type);
  if (profile.is_founder) badgeHtml += badge('founder', '⭐ Founding Host');
  if (profile.beta) badgeHtml += badge('beta', '🧪 Beta Tester');
  badgesEl.innerHTML = badgeHtml;

  const rows = [];
  if (profile.full_name && profile.full_name !== profile.business_name) {
    rows.push(profileRow('👤', 'Host Name', profile.full_name));
  }
  if (loc) rows.push(profileRow('🌍', 'Location', loc));
  rows.push(profileRow('📅', 'Member Since', formatDate(profile.created_at)));

  document.getElementById('host-body').innerHTML = rows.join('');
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
