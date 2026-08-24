import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import CreatorAvatar from './CreatorAvatar';

// Reusable grain texture (matches .bg-grain in index.css)
const GRAIN_BG = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence baseFrequency='0.9'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const TIER_COLORS = {
  'UGC Beginner':     { bg: 'rgba(209,235,219,0.6)',  color: 'var(--ink)'  },
  'UGC Pro':          { bg: 'rgba(60,87,89,0.12)',    color: '#3C5759'     },
  'Micro Influencer': { bg: 'rgba(123,104,200,0.12)', color: '#5b4db8'     },
  'Influencer':       { bg: 'rgba(212,168,67,0.15)',  color: '#b45309'     },
};

function fmtNum(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const MONTH_SHORT_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
function fmtDate(iso, t) {
  if (!iso) return '';
  const [, m, d] = iso.split('-').map(Number);
  return `${t(`monthsShort.${MONTH_SHORT_KEYS[m - 1]}`)} ${d}`;
}

// ─── Stat cell ────────────────────────────────────────────────────────────────
function Stat({ value, label }) {
  return (
    <div style={{ padding: '13px 0', background: 'rgba(255,255,255,0.78)', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--sage)', marginTop: 3, letterSpacing: '0.02em' }}>{label}</div>
    </div>
  );
}

// ─── Icon helpers (inline SVG, no lucide dep) ─────────────────────────────────
const IconMessage = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconHome = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IconExternal = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);
const IconActivity = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconStar = () => (
  <svg viewBox="0 0 16 16" fill="white" width="9" height="9">
    <path d="M8 1.5l1.67 3.38 3.73.54-2.7 2.63.64 3.72L8 9.77l-3.34 1.76.64-3.72L2.6 5.42l3.73-.54z"/>
  </svg>
);

// ─── ProfilePopupCard ─────────────────────────────────────────────────────────
// Props:
//   person          — { name, username, avatar, location, tier, followers, engagement,
//                       collab_count, bio, platforms, niches, isFounder, past_collab,
//                       portfolioUrl, travelCalendar: [{ id, startDate, endDate, city, country, note }] }
//   onClose         — () => void
//   onMessage       — () => void
//   onViewListing   — () => void  (optional)
//   onViewPastCollabs — () => void  (optional)
export default function ProfilePopupCard({ person, onClose, onMessage, onViewListing, onViewPastCollabs }) {
  const tc = TIER_COLORS[person.tier] || TIER_COLORS['UGC Beginner'];
  const { t } = useTranslation('profilePopupCard');

  // ESC to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Upcoming trips (future only, up to 4)
  const upcomingTrips = (person.travelCalendar || [])
    .filter(trip => new Date(trip.endDate) >= new Date())
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .slice(0, 4);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(25,37,36,0.30)',
        backdropFilter: 'blur(9px)', WebkitBackdropFilter: 'blur(9px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%', maxWidth: 480,
          maxHeight: '88dvh',
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(28px) saturate(140%)',
          WebkitBackdropFilter: 'blur(28px) saturate(140%)',
          borderRadius: '1.75rem',
          border: '1.5px solid rgba(255,255,255,0.92)',
          boxShadow: '0 28px 90px rgba(25,37,36,0.22), 0 0 0 1px rgba(25,37,36,0.05)',
          animation: 'profilePopupEnter 300ms cubic-bezier(0.25,1,0.5,1) both',
          overflow: 'hidden',
        }}
      >

        {/* ── Close ──────────────────────────────────────────────────────────── */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 15, right: 15, zIndex: 20,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(25,37,36,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(25,37,36,0.10)',
            transition: 'background 150ms, transform 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'scale(1.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.88)'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="#3C5759" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Inner scroll wrapper. The OUTER card holds the border-radius +
            overflow:hidden so it clips this scroller's content to the
            rounded corners at every scroll position. This scroller itself
            must stay rectangular — putting border-radius on the same
            element as overflow:auto lets WebKit paint content past the
            corner in mid-scroll. */}
        <div style={{
          maxHeight: '100%', overflowY: 'auto', scrollbarWidth: 'none',
        }}>

        {/* ── Hero header ───────────────────────────────────────────────────── */}
        <div style={{
          position: 'relative',
          height: 128,
          background: 'linear-gradient(150deg, #D1EBDB 0%, #E6EFE7 45%, #EFECE9 100%)',
          borderRadius: '1.75rem 1.75rem 0 0',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {/* dot-grid texture */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(25,37,36,0.08) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
            backgroundPosition: '8px 8px',
            pointerEvents: 'none',
          }} />
          {/* noise grain */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: GRAIN_BG,
            opacity: 0.05,
            pointerEvents: 'none',
          }} />
          {/* top-center radial highlight */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 70% 90% at 50% -10%, rgba(255,255,255,0.55) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* ── Avatar (straddles header + body) ─────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: -52 }}>
          <div style={{ position: 'relative' }}>
            <CreatorAvatar
              src={person.avatar} name={person.name} size={100}
              style={{ border: '4px solid rgba(255,255,255,0.98)', boxShadow: '0 4px 22px rgba(25,37,36,0.15)' }}
            />

            {/* Past collab green check */}
            {person.past_collab && (
              <div title={t('pastCollabNotice')} style={{
                position: 'absolute', bottom: 3, right: 3,
                width: 24, height: 24, borderRadius: '50%',
                background: '#4A9B7F', border: '2.5px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(74,155,127,0.38)',
              }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}

            {/* Founder gold star */}
            {person.isFounder && (
              <div title={t('founderTitle')} style={{
                position: 'absolute', top: 3, right: -5,
                width: 22, height: 22, borderRadius: '50%',
                background: 'linear-gradient(135deg, #D4A843, #B8922A)',
                border: '2.5px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(212,168,67,0.55)',
              }}>
                <IconStar />
              </div>
            )}
          </div>
        </div>

        {/* ── Identity ─────────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', padding: '10px 28px 0' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--ink)', lineHeight: 1.2 }}>
            {person.name}
          </div>
          {person.username && (
            <div style={{ fontSize: 13, color: 'var(--sage)', marginTop: 3 }}>@{person.username}</div>
          )}
          <div style={{ fontSize: 12, color: 'var(--sage)', marginTop: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--sage)', flexShrink: 0 }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            {person.location}
          </div>
          {person.tier && (
            <div style={{ marginTop: 10 }}>
              <span style={{ display: 'inline-block', padding: '4px 15px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: tc.bg, color: tc.color, letterSpacing: '0.01em' }}>
                {person.tier}
              </span>
            </div>
          )}
        </div>

        {/* ── Stats ────────────────────────────────────────────────────────── */}
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1, background: 'rgba(25,37,36,0.06)', borderRadius: '0.875rem', overflow: 'hidden',
          }}>
            <Stat value={fmtNum(person.followers)} label={t('followers')} />
            <Stat value={person.engagement != null ? `${person.engagement}%` : '—'} label={t('engRate')} />
            <Stat value={person.collab_count ?? '—'} label={t('collabs')} />
          </div>
        </div>

        {/* ── Bio ──────────────────────────────────────────────────────────── */}
        {person.bio && (
          <div style={{ padding: '14px 24px 0' }}>
            <p style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.68, margin: 0 }}>{person.bio}</p>
          </div>
        )}

        {/* ── Platforms + Niches ───────────────────────────────────────────── */}
        {(person.platforms?.length > 0 || person.niches?.length > 0) && (
          <div style={{ padding: '14px 24px 0', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {person.platforms?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sage)', minWidth: 60, flexShrink: 0 }}>{t('platforms')}</span>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {person.platforms.map(p => (
                    <span key={p} style={{ padding: '3px 11px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: 'rgba(60,87,89,0.09)', color: 'var(--ink)' }}>{p}</span>
                  ))}
                </div>
              </div>
            )}
            {person.niches?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sage)', minWidth: 60, flexShrink: 0 }}>{t('niches')}</span>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {person.niches.map(n => (
                    <span key={n} style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 600, background: 'var(--bone)', color: 'var(--slate)' }}>{n}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Upcoming trips ───────────────────────────────────────────────── */}
        {upcomingTrips.length > 0 && (
          <div style={{ margin: '14px 24px 0', padding: '14px 16px', borderRadius: '1rem', background: 'rgba(209,235,219,0.22)', border: '1px solid rgba(209,235,219,0.65)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 11 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--slate)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 11, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('upcomingTrips')}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingTrips.map(trip => (
                <div key={trip.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--slate)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>
                    {trip.city}{trip.country && trip.country !== 'USA' ? `, ${trip.country}` : ''}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--sage)', flexShrink: 0 }}>
                    {fmtDate(trip.startDate, t)}–{fmtDate(trip.endDate, t)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Past collab notice ───────────────────────────────────────────── */}
        {person.past_collab && (
          <div style={{ margin: '12px 24px 0', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: '0.75rem', background: 'rgba(74,155,127,0.07)', border: '1px solid rgba(74,155,127,0.22)' }}>
            <svg width="13" height="13" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#2d7d5e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#2d7d5e' }}>{t('pastCollabNotice')}</span>
          </div>
        )}

        {/* ── Divider ──────────────────────────────────────────────────────── */}
        <div style={{ margin: '18px 24px 0', height: 1, background: 'rgba(25,37,36,0.07)' }} />

        {/* ── Action footer ────────────────────────────────────────────────── */}
        <div style={{ padding: '16px 24px 24px', display: 'flex', gap: 8, alignItems: 'center' }}>

          {/* Icon-only secondary buttons */}
          {person.portfolioUrl && (
            <IconBtn title={t('viewPortfolio')} onClick={() => window.open(person.portfolioUrl, '_blank')}>
              <IconExternal />
            </IconBtn>
          )}
          {onViewListing && (
            <IconBtn title={t('viewListing')} onClick={onViewListing}>
              <IconHome />
            </IconBtn>
          )}
          {onViewPastCollabs && (
            <IconBtn title={t('pastCollabs')} onClick={onViewPastCollabs}>
              <IconActivity />
            </IconBtn>
          )}

          {/* Primary: Message */}
          <button
            onClick={onMessage}
            style={{
              flex: 1, minWidth: 0, padding: '12px 0',
              borderRadius: 9999,
              background: 'var(--ink)', color: 'var(--bone)',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'opacity 150ms, transform 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.87'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1';    e.currentTarget.style.transform = 'translateY(0)';     }}
          >
            <IconMessage />
            {t('messageCreator', { name: person.name?.split(' ')[0] })}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable icon button ─────────────────────────────────────────────────────
function IconBtn({ title, onClick, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 42, height: 42, borderRadius: 9999, flexShrink: 0,
        border: '1.5px solid rgba(25,37,36,0.11)',
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: 'var(--slate)',
        transition: 'background 150ms, transform 150ms, border-color 150ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.95)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.borderColor = 'rgba(25,37,36,0.2)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.55)'; e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.borderColor = 'rgba(25,37,36,0.11)'; }}
    >
      {children}
    </button>
  );
}
