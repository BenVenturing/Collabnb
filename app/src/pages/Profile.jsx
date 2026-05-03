import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import GlobeCanvas from '../components/GlobeCanvas';
import { SAMPLE_COLLABORATIONS } from '../lib/mockData';

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmtFollowers(n) {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

// ─── Inline SVG icons (Phosphor Light) ───────────────────────────────────────
const Shield = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <path d="M40,114.79V56a8,8,0,0,1,8-8H208a8,8,0,0,1,8,8v58.77c0,84.18-71.31,112.07-88,118.08C111.31,226.86,40,199,40,114.79Z"/>
    <polyline points="88 128 112 152 168 96"/>
  </svg>
);
const GlobeIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <circle cx="128" cy="128" r="96"/>
    <ellipse cx="128" cy="128" rx="40" ry="96"/>
    <line x1="32" y1="128" x2="224" y2="128"/>
    <line x1="40" y1="96"  x2="216" y2="96"/>
    <line x1="40" y1="160" x2="216" y2="160"/>
  </svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="32" y="32" width="192" height="192" rx="48"/>
    <circle cx="128" cy="128" r="40"/>
    <circle cx="180" cy="76" r="6" fill="currentColor" stroke="none"/>
  </svg>
);
const TikTokIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M168,32c0,32,24,48,48,48"/>
    <path d="M104,104v96a40,40,0,1,1-40-40h8"/>
    <path d="M168,32v128a64,64,0,0,1-64,64"/>
  </svg>
);
const YouTubeIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M222.77,73.34A24,24,0,0,0,206,56.29C192.28,52,128,52,128,52S63.72,52,50,56.29a24,24,0,0,0-16.77,17A251.74,251.74,0,0,0,28,128a251.74,251.74,0,0,0,5.23,54.66A24,24,0,0,0,50,199.71C63.72,204,128,204,128,204s64.28,0,78-4.29a24,24,0,0,0,16.77-17A251.74,251.74,0,0,0,228,128,251.74,251.74,0,0,0,222.77,73.34Z"/>
    <polygon points="108 152 156 128 108 104 108 152" fill="currentColor" stroke="none" opacity="0.7"/>
    <polygon points="108 152 156 128 108 104 108 152"/>
  </svg>
);
const ArrowOut = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <polyline points="136 32 224 32 224 120"/>
    <line x1="224" y1="32" x2="136" y2="120"/>
    <path d="M184,136v72a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8h72"/>
  </svg>
);
const ChevronR = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <polyline points="96 48 176 128 96 208"/>
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="40" y="112" width="176" height="128" rx="8"/>
    <path d="M88,112V80a40,40,0,0,1,80,0v32"/>
  </svg>
);
const BellIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M96,192a32,32,0,0,0,64,0"/>
    <path d="M56,104a72,72,0,0,1,144,0c0,35.82,8.3,56.6,14.9,68A8,8,0,0,1,208,184H48a8,8,0,0,1-6.88-12C47.71,160.6,56,139.81,56,104Z"/>
  </svg>
);
const SealCheck = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M54.46,201.54C40,195.2,28,182,28,160c0-13.35-8.27-25.37-14.16-36.77A22.07,22.07,0,0,1,28,96c0-22,15.89-37.48,28-48.16A22.07,22.07,0,0,1,76,32c13.35,0,25.37-8.27,36.77-14.16a22.07,22.07,0,0,1,26.46,0C150.63,23.73,162.65,32,176,32a22.07,22.07,0,0,1,20,15.84C208.11,58.52,224,74,224,96a22.07,22.07,0,0,1,14.16,27.23C232.27,134.63,224,146.65,224,160c0,22-15.89,37.48-28,48.16A22.07,22.07,0,0,1,176,224c-13.35,0-25.37,8.27-36.77,14.16a22.07,22.07,0,0,1-26.46,0C101.37,232.27,89.35,224,76,224a22.07,22.07,0,0,1-21.54-22.46Z"/>
    <polyline points="88 136 112 160 168 104"/>
  </svg>
);
const SwitchIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <polyline points="160 48 208 96 160 144"/>
    <line x1="48" y1="96" x2="208" y2="96"/>
    <polyline points="96 112 48 160 96 208"/>
    <line x1="208" y1="160" x2="48" y2="160"/>
  </svg>
);
const SignOutIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M112,216H48a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8h64"/>
    <polyline points="168 160 216 128 168 96"/>
    <line x1="104" y1="128" x2="216" y2="128"/>
  </svg>
);

// ─── Social link row ─────────────────────────────────────────────────────────
function SocialRow({ icon, label, value, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.875rem 1rem',
        background: 'rgba(255,255,255,0.65)',
        borderRadius: '1rem',
        border: '1px solid rgba(255,255,255,0.8)',
        transition: 'background 180ms',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.92)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.65)'}
    >
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%',
        background: 'var(--mint)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0, color: 'var(--slate)',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink)', margin: 0 }}>{label}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
      </div>
      <span style={{ color: 'var(--stone)', flexShrink: 0 }}><ArrowOut /></span>
    </a>
  );
}

// ─── Settings row ─────────────────────────────────────────────────────────────
function SettingsRow({ icon, label, sublabel, isLast, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem 1.25rem',
        borderBottom: isLast ? 'none' : '1px solid rgba(25,37,36,0.06)',
        background: 'transparent',
        transition: 'background 150ms',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(209,235,219,0.25)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%',
        background: danger ? 'rgba(239,68,68,0.08)' : 'rgba(209,235,219,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        color: danger ? '#ef4444' : 'var(--slate)',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: danger ? '#ef4444' : 'var(--ink)', margin: 0 }}>{label}</p>
        {sublabel && <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: '0.15rem 0 0' }}>{sublabel}</p>}
      </div>
      {!danger && <span style={{ color: 'var(--stone)' }}><ChevronR /></span>}
    </button>
  );
}

// ─── Past collab card ─────────────────────────────────────────────────────────
function PastCollabCard({ collab }) {
  const statusColors = {
    pending:  { bg: 'rgba(212,168,67,0.15)',  text: '#D4A843' },
    uploaded: { bg: 'rgba(74,155,210,0.15)',   text: '#4A9BD2' },
    approved: { bg: 'rgba(74,155,127,0.15)',   text: '#4A9B7F' },
  };
  const s = statusColors[collab.status] || statusColors.pending;
  const statusIcons = { pending: '🟡', uploaded: '🔵', approved: '🟢' };

  return (
    <div className="listing-card" style={{ width: '220px', flexShrink: 0 }}>
      {/* Photo */}
      <div style={{ position: 'relative', height: '140px', overflow: 'hidden', background: 'var(--stone)' }}>
        <img src={collab.image} alt={collab.property_name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(25,37,36,0.45) 0%, transparent 55%)' }} />
        {/* SAMPLE badge */}
        <span style={{
          position: 'absolute', top: '0.625rem', left: '0.625rem',
          background: 'rgba(25,37,36,0.65)', color: 'var(--bone)',
          fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', padding: '0.2rem 0.5rem', borderRadius: '4px',
        }}>SAMPLE</span>
        {/* Location */}
        <span style={{
          position: 'absolute', bottom: '0.625rem', left: '0.625rem',
          color: 'rgba(239,236,233,0.9)', fontSize: '0.7rem', fontWeight: 500,
        }}>📍 {collab.location}</span>
      </div>
      {/* Info */}
      <div style={{ padding: '0.875rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)', margin: '0 0 0.25rem', lineHeight: 1.2 }}>{collab.property_name}</p>
        <p style={{ fontSize: '0.7rem', color: 'var(--sage)', margin: '0 0 0.5rem' }}>{collab.dates}</p>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
          padding: '0.2rem 0.6rem', borderRadius: '9999px',
          background: s.bg, color: s.text,
          fontSize: '0.65rem', fontWeight: 600,
        }}>
          {statusIcons[collab.status]} {collab.status_text}
        </span>
      </div>
    </div>
  );
}

// ─── Main Profile page ────────────────────────────────────────────────────────
export default function Profile() {
  const { profile, signOut } = useAuth();
  const [bioExpanded,       setBioExpanded]       = useState(false);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);

  if (!profile) return null;

  const BIO_LIMIT  = 155;
  const bioTruncated = !bioExpanded && (profile.bio?.length ?? 0) > BIO_LIMIT;
  const portfolioHref = profile.portfolio
    ? (profile.portfolio.startsWith('http') ? profile.portfolio : `https://${profile.portfolio}`)
    : null;

  const SETTINGS = [
    { icon: <LockIcon />,   label: 'Privacy Policy',      sublabel: 'Review how your data is used'       },
    { icon: <BellIcon />,   label: 'Notifications',       sublabel: 'Manage email & push preferences'    },
    { icon: <SealCheck />,  label: 'Verification',        sublabel: 'Resubmit or check status'           },
    { icon: <SwitchIcon />, label: 'Switch to Host Mode', sublabel: 'List your property as a host',
      onClick: () => setShowSwitchConfirm(true) },
  ];

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: '5rem' }}>
      <div className="container" style={{ maxWidth: '720px' }}>

        {/* ── Profile header ───────────────────────────────────────────────── */}
        <section style={{ textAlign: 'center', paddingTop: '3rem', paddingBottom: '2rem' }}>

          {/* Founder banner */}
          {profile.is_founder && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1.25rem', borderRadius: '1rem', marginBottom: '2rem',
              background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.25)',
            }}>
              <span style={{ fontSize: '1.125rem' }}>⭐</span>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)', margin: 0 }}>Founding Member</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: 0 }}>You're among the first 100 creators on Collabnb.</p>
              </div>
            </div>
          )}

          {/* Avatar */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.25rem' }}>
            <div style={{
              width: '96px', height: '96px', borderRadius: '50%', overflow: 'hidden',
              border: '3px solid white',
              boxShadow: '0 4px 20px rgba(25,37,36,0.14)',
            }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: 'var(--slate)' }}>
                    {profile.full_name?.charAt(0) ?? '?'}
                  </span>
                </div>
              )}
            </div>
            {/* Ring */}
            <div style={{
              position: 'absolute', inset: '-6px', borderRadius: '50%',
              border: '2px solid rgba(209,235,219,0.55)', pointerEvents: 'none',
            }} />
          </div>

          {/* Name + verified */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
              {profile.full_name}
            </h2>
            <span style={{ color: 'var(--slate)' }} title="Verified creator"><Shield /></span>
          </div>

          {/* Tier badge */}
          <span className="eyebrow-tag" style={{ marginBottom: '0.5rem' }}>⭐ {profile.tier}</span>

          {/* Handle */}
          <p style={{ color: 'var(--sage)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            @{profile.username}
            {profile.city && <span style={{ color: 'var(--stone)', marginLeft: '0.5rem' }}>· {profile.city}{profile.region ? `, ${profile.region}` : ''}</span>}
          </p>

          {/* Edit button */}
          <button className="btn-glass" style={{ marginTop: '1.25rem', padding: '0.65rem 1.5rem', fontSize: '0.875rem' }}>
            Edit Profile
          </button>
        </section>

        {/* ── Stats card ───────────────────────────────────────────────────── */}
        <div className="glass" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {[
              { value: fmtFollowers(profile.follower_count), label: 'Followers' },
              { value: profile.engagement_rate ? `${profile.engagement_rate}%` : '—', label: 'Engagement' },
              { value: profile.collab_count ?? 0, label: 'Collabs' },
            ].map((stat, i) => (
              <div key={stat.label} style={{
                textAlign: 'center', padding: '0.5rem 0.75rem',
                borderRight: i < 2 ? '1px solid rgba(25,37,36,0.06)' : 'none',
              }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--ink)', margin: '0 0 0.2rem' }}>{stat.value}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: 0 }}>{stat.label}</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--sage)', marginTop: '1rem' }}>↻ Updated just now</p>
        </div>

        {/* ── Bio ──────────────────────────────────────────────────────────── */}
        {profile.bio && (
          <div style={{ marginBottom: '1.75rem' }}>
            <p style={{ color: 'var(--slate)', fontSize: '0.9375rem', lineHeight: 1.7, margin: 0 }}>
              {bioTruncated ? `${profile.bio.slice(0, BIO_LIMIT)}…` : profile.bio}
            </p>
            {(profile.bio?.length ?? 0) > BIO_LIMIT && (
              <button
                onClick={() => setBioExpanded(!bioExpanded)}
                style={{ color: 'var(--ink)', fontSize: '0.875rem', fontWeight: 600, marginTop: '0.375rem', fontFamily: 'var(--font-body)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {bioExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {/* ── Links & Socials ───────────────────────────────────────────────── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.125rem', color: 'var(--ink)', marginBottom: '1rem' }}>Links &amp; Socials</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {portfolioHref && <SocialRow icon={<GlobeIcon />} label="My Link-in-Bio" value={profile.portfolio} href={portfolioHref} />}
            {profile.instagram_handle && <SocialRow icon={<InstagramIcon />} label="Instagram" value={`@${profile.instagram_handle}`} href={`https://instagram.com/${profile.instagram_handle}`} />}
            {profile.tiktok_handle && <SocialRow icon={<TikTokIcon />} label="TikTok" value={`@${profile.tiktok_handle}`} href={`https://tiktok.com/@${profile.tiktok_handle}`} />}
            {profile.youtube_handle && <SocialRow icon={<YouTubeIcon />} label="YouTube" value={`@${profile.youtube_handle}`} href={`https://youtube.com/@${profile.youtube_handle}`} />}
          </div>
        </section>

        {/* ── Past Collabs ─────────────────────────────────────────────────── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.125rem', color: 'var(--ink)', margin: 0 }}>Past Collabs</h3>
            <button style={{ color: 'var(--slate)', fontSize: '0.875rem', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>View all →</button>
          </div>
          <div className="snap-row" style={{ paddingBottom: '0.5rem' }}>
            {SAMPLE_COLLABORATIONS.map((c) => <PastCollabCard key={c.id} collab={c} />)}
          </div>
        </section>

        {/* ── Settings ─────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.125rem', color: 'var(--ink)', marginBottom: '1rem' }}>Settings</h3>
          <div className="glass" style={{ borderRadius: '1.25rem', overflow: 'hidden', padding: 0 }}>
            {SETTINGS.map((row, i) => (
              <SettingsRow key={row.label} {...row} isLast={i === SETTINGS.length - 1} />
            ))}
          </div>
          <button
            onClick={signOut}
            style={{
              width: '100%', marginTop: '0.5rem', padding: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              color: '#ef4444', fontSize: '0.875rem', fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', transition: 'color 150ms',
            }}
          >
            <SignOutIcon /> Log Out
          </button>
        </section>

        {/* ── Globe ────────────────────────────────────────────────────────── */}
        <section style={{ textAlign: 'center', paddingBottom: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--ink)', marginBottom: '0.375rem' }}>Our Global Community</h3>
          <p style={{ color: 'var(--sage)', fontSize: '0.9rem', marginBottom: '2.5rem' }}>Creators and hosts connecting across the world</p>
          <GlobeCanvas />
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { color: '#D1EBDB', label: 'Creators' },
              { color: '#3C5759', label: 'Hosts'    },
              { color: '#D0D5CE', label: '40+ Cities' },
            ].map(({ color, label }) => (
              <span key={label} className="eyebrow-tag" style={{ gap: '0.5rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                {label}
              </span>
            ))}
          </div>
        </section>
      </div>

      {/* ── Host switch modal ─────────────────────────────────────────────── */}
      {showSwitchConfirm && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem', background: 'rgba(25,37,36,0.4)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowSwitchConfirm(false)}
        >
          <div
            className="glass"
            style={{ width: '100%', maxWidth: '400px', borderRadius: '1.5rem', padding: '2rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--ink)', marginBottom: '0.75rem' }}>Switch to Host Mode?</h4>
            <p style={{ color: 'var(--slate)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              You'll complete a short onboarding to list your property. You can switch back any time.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-glass" style={{ flex: 1 }} onClick={() => setShowSwitchConfirm(false)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => setShowSwitchConfirm(false)}>Continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
