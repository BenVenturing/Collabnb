import { useState, useEffect } from 'react';
import CreatorAvatar from './CreatorAvatar';

const TIER_COLORS = {
  'UGC Beginner':     { bg: 'rgba(209,235,219,0.6)',  color: 'var(--ink)'  },
  'UGC Pro':          { bg: 'rgba(60,87,89,0.12)',    color: '#3C5759'     },
  'Micro Influencer': { bg: 'rgba(123,104,200,0.12)', color: '#5b4db8'     },
  'Influencer':       { bg: 'rgba(212,168,67,0.15)',  color: '#b45309'     },
};

function fmtNum(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDate(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-').map(Number);
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]} ${d}`;
}

const IconMsg = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconTrash = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const IconExt = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);
const IconPin = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconStar = () => (
  <svg viewBox="0 0 16 16" fill="white" width="9" height="9">
    <path d="M8 1.5l1.67 3.38 3.73.54-2.7 2.63.64 3.72L8 9.77l-3.34 1.76.64-3.72L2.6 5.42l3.73-.54z"/>
  </svg>
);
const IconInstagram = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/>
  </svg>
);
const IconTikTok = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"/>
    <circle cx="6" cy="18" r="3"/>
    <circle cx="18" cy="16" r="3"/>
  </svg>
);
const IconYouTube = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.47a2.78 2.78 0 0 0-1.95 1.97A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/>
  </svg>
);

const EASE = 'cubic-bezier(0.25,1,0.5,1)';
const DUR  = '360ms';

// ─── Expanded modal overlay ───────────────────────────────────────────────────
function CreatorModal({ creator, onClose, onMessage, saved, onSave }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const t = TIER_COLORS[creator.tier] || TIER_COLORS['UGC Beginner'];
  const city = creator.location?.split(',')[0] ?? creator.location ?? '';

  const upcomingTrips = (creator.travelCalendar || [])
    .filter(trip => new Date(trip.endDate) >= new Date())
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  const socialLinks = [];
  if (creator.platforms?.includes('Instagram'))
    socialLinks.push({ icon: <IconInstagram />, label: 'Instagram', url: `https://instagram.com/${creator.username}` });
  if (creator.platforms?.includes('TikTok'))
    socialLinks.push({ icon: <IconTikTok />, label: 'TikTok', url: `https://tiktok.com/@${creator.username}` });
  if (creator.platforms?.includes('YouTube'))
    socialLinks.push({ icon: <IconYouTube />, label: 'YouTube', url: `https://youtube.com/@${creator.username}` });
  if (creator.portfolioUrl)
    socialLinks.push({ icon: <IconExt />, label: 'Portfolio', url: creator.portfolioUrl });

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(25,37,36,0.5)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%', maxWidth: 680, maxHeight: '88vh', overflowY: 'auto',
          background: 'rgba(255,255,255,0.90)',
          backdropFilter: 'blur(28px) saturate(1.5)', WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
          borderRadius: '1.5rem',
          border: '1px solid rgba(255,255,255,0.88)',
          boxShadow: '0 28px 80px rgba(25,37,36,0.24), inset 0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        {/* Save heart */}
        <button
          onClick={(e) => { e.stopPropagation(); onSave(); }}
          title={saved ? 'Saved' : 'Save creator'}
          style={{
            position: 'absolute', top: 14, right: 14, zIndex: 10,
            width: 36, height: 36, borderRadius: '50%',
            background: saved ? 'rgba(74,155,127,0.12)' : 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(8px)',
            border: `1.5px solid ${saved ? 'rgba(74,155,127,0.35)' : 'rgba(25,37,36,0.1)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(25,37,36,0.1)',
            transition: 'all 200ms',
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24"
            fill={saved ? '#4A9B7F' : 'none'}
            stroke={saved ? '#4A9B7F' : '#3C5759'}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>

        {/* SAMPLE badge */}
        {creator.isSample && (
          <span style={{
            position: 'absolute', top: 14, left: 14, zIndex: 10,
            padding: '3px 10px', borderRadius: 9999,
            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
            background: 'rgba(149,157,144,0.15)', color: '#959D90',
          }}>SAMPLE</span>
        )}

        {/* Horizontal layout */}
        <div style={{ display: 'flex' }}>

          {/* LEFT — avatar column */}
          <div style={{
            width: 180, flexShrink: 0,
            padding: '48px 20px 32px 28px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            borderRight: '1px solid rgba(25,37,36,0.07)',
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 128, height: 128, borderRadius: '50%', overflow: 'hidden',
                border: '4px solid rgba(255,255,255,0.97)',
                boxShadow: '0 8px 32px rgba(25,37,36,0.18)',
              }}>
                <CreatorAvatar src={creator.avatar} name={creator.name} size={128} style={{ border: 'none', width: '100%', height: '100%' }} />
              </div>
              {creator.isFounder && (
                <div
                  title="Founder — one of the first 100 on Collabnb"
                  style={{
                    position: 'absolute', bottom: 4, right: 0,
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #D4A843, #B8922A)',
                    border: '3px solid #fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 10px rgba(212,168,67,0.55)',
                  }}
                >
                  <IconStar />
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ink)', lineHeight: 1.2 }}>
                {creator.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--sage)', marginTop: 3 }}>@{creator.username}</div>
            </div>
          </div>

          {/* RIGHT — details column */}
          <div style={{ flex: 1, padding: '28px 28px 24px 24px', minWidth: 0 }}>

            {/* Location + tier */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', borderRadius: 9999,
                background: 'rgba(25,37,36,0.05)', border: '1px solid rgba(25,37,36,0.08)',
              }}>
                <IconPin />
                <span style={{ fontSize: 11, color: 'var(--slate)' }}>{city}</span>
              </div>
              <span style={{ padding: '4px 14px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: t.bg, color: t.color }}>
                {creator.tier}
              </span>
            </div>

            {/* Bio — shown first so it's the first thing read */}
            {creator.bio && (
              <p style={{ fontSize: 13.5, color: 'var(--slate)', lineHeight: 1.7, margin: '6px 0 14px' }}>
                {creator.bio}
              </p>
            )}

            <div style={{ height: 1, background: 'rgba(25,37,36,0.07)', margin: '0 0 14px' }} />

            {/* Stats */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1, background: 'rgba(25,37,36,0.06)',
              borderRadius: '0.875rem', overflow: 'hidden',
            }}>
              {[
                { label: 'Avg. Reach', value: fmtNum(creator.avg_reach_30d ?? creator.followers) },
                { label: 'Eng. Rate',  value: `${creator.er_30d ?? creator.engagement}%`, tooltip: 'Engagement Rate — the % of followers who liked, commented, or shared posts in the last 30 days. A higher rate means a more active, loyal audience.' },
                { label: 'Collabs',    value: creator.collab_count ?? '—' },
              ].map(({ label, value, tooltip }) => (
                <div
                  key={label}
                  title={tooltip}
                  style={{
                    padding: '12px 0', background: 'rgba(255,255,255,0.78)',
                    textAlign: 'center', cursor: tooltip ? 'help' : 'default',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 10, color: 'var(--sage)', marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Platforms + Niches */}
            {(creator.platforms?.length > 0 || creator.niches?.length > 0) && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {creator.platforms?.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--sage)', minWidth: 58, flexShrink: 0 }}>Platforms</span>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {creator.platforms.map(p => (
                        <span key={p} style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: 'rgba(60,87,89,0.09)', color: 'var(--ink)' }}>{p}</span>
                      ))}
                    </div>
                  </div>
                )}
                {creator.niches?.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--sage)', minWidth: 58, flexShrink: 0 }}>Niches</span>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {creator.niches.map(n => (
                        <span key={n} style={{ padding: '3px 9px', borderRadius: 9999, fontSize: 10.5, fontWeight: 600, background: 'var(--bone)', color: 'var(--slate)' }}>{n}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upcoming Trips */}
            {upcomingTrips.length > 0 && (
              <div style={{ margin: '16px 0 0', padding: '12px 14px', borderRadius: '1rem', background: 'rgba(209,235,219,0.22)', border: '1px solid rgba(209,235,219,0.65)' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Upcoming Trips
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {upcomingTrips.map(trip => (
                    <div key={trip.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--slate)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>
                        {trip.city}{trip.country && trip.country !== 'USA' ? `, ${trip.country}` : ''}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--sage)', flexShrink: 0 }}>
                        {fmtDate(trip.startDate)}–{fmtDate(trip.endDate)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past collab notice */}
            {creator.past_collab && (
              <div style={{ margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 7, padding: '9px 12px', borderRadius: '0.75rem', background: 'rgba(74,155,127,0.07)', border: '1px solid rgba(74,155,127,0.22)' }}>
                <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#2d7d5e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#2d7d5e' }}>You've collaborated with this person before</span>
              </div>
            )}

            {/* Social links */}
            {socialLinks.length > 0 && (
              <>
                <div style={{ height: 1, background: 'rgba(25,37,36,0.07)', margin: '16px 0' }} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {socialLinks.map(({ icon, label, url }) => (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px', borderRadius: 9999,
                        fontSize: 12, fontWeight: 600, color: 'var(--ink)',
                        background: 'rgba(25,37,36,0.06)', border: '1px solid rgba(25,37,36,0.1)',
                        textDecoration: 'none', transition: 'background 150ms, transform 150ms',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(25,37,36,0.11)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(25,37,36,0.06)'; e.currentTarget.style.transform = 'none'; }}
                    >
                      {icon}{label}
                    </a>
                  ))}
                </div>
              </>
            )}

            {/* Message CTA */}
            <button
              onClick={(e) => { e.stopPropagation(); onMessage?.(creator); onClose(); }}
              style={{
                marginTop: 14, width: '100%', padding: '13px 0',
                borderRadius: 9999, background: 'var(--ink)', color: 'var(--bone)',
                fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700,
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                transition: 'opacity 150ms, transform 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.87'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
            >
              <IconMsg />Message {creator.name?.split(' ')[0]}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Chip variant ─────────────────────────────────────────────────────────────
function ChipCard({ creator, onMessage, onHide }) {
  const [hovered, setHovered] = useState(false);
  const t = TIER_COLORS[creator.tier] || TIER_COLORS['UGC Beginner'];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
        background: hovered ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(20px) saturate(135%)', WebkitBackdropFilter: 'blur(20px) saturate(135%)',
        border: '1px solid rgba(255,255,255,0.85)',
        borderRadius: '2.5rem',
        boxShadow: hovered ? '0 6px 22px rgba(25,37,36,0.10)' : '0 2px 10px rgba(25,37,36,0.06)',
        transition: `all 200ms ${EASE}`,
        cursor: 'default',
      }}
    >
      <CreatorAvatar src={creator.avatar} name={creator.name} size={36} style={{ border: '1.5px solid rgba(255,255,255,0.9)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
            {creator.name}
          </span>
          <span style={{ padding: '1px 7px', borderRadius: 9999, fontSize: 9, fontWeight: 700, background: t.bg, color: t.color, whiteSpace: 'nowrap' }}>
            {creator.tier}
          </span>
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--sage)', marginTop: 1 }}>
          @{creator.username} · {fmtNum(creator.avg_reach_30d ?? creator.followers)} reach · {creator.er_30d ?? creator.engagement}% ER
        </div>
      </div>
      {onMessage && (
        <button
          onClick={(e) => { e.stopPropagation(); onMessage(creator); }}
          style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 9999, background: 'var(--ink)', color: 'var(--bone)', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <IconMsg /> Message
        </button>
      )}
      {onHide && creator.isSample && (
        <button
          onClick={(e) => { e.stopPropagation(); onHide(creator.id); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(149,157,144,0.55)', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}
        >
          <IconTrash />
        </button>
      )}
    </div>
  );
}

// ─── Collapsed card ───────────────────────────────────────────────────────────
function FullCard({ creator, narrow = false, onMessage, onHide, visitingBadge, delay = 0 }) {
  const [open, setOpen]       = useState(false);
  const [saved, setSaved]     = useState(false);
  const [hovered, setHovered] = useState(false);
  const t    = TIER_COLORS[creator.tier] || TIER_COLORS['UGC Beginner'];
  const city = creator.location?.split(',')[0] ?? creator.location ?? '';

  return (
    <>
      {open && (
        <CreatorModal
          creator={creator}
          onClose={() => setOpen(false)}
          onMessage={onMessage}
          saved={saved}
          onSave={() => setSaved(s => !s)}
        />
      )}
      <div
        className={delay ? 'reveal-up' : undefined}
        style={delay ? { animationDelay: `${delay}ms`, opacity: 0 } : {}}
      >
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => setOpen(true)}
          style={{
            position: 'relative',
            background: hovered ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.84)',
            backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            border: '1px solid rgba(255,255,255,0.85)',
            borderRadius: '1.375rem',
            boxShadow: hovered
              ? '0 14px 36px rgba(25,37,36,0.13), inset 0 1px 0 rgba(255,255,255,0.7)'
              : '0 4px 18px rgba(25,37,36,0.07), inset 0 1px 0 rgba(255,255,255,0.6)',
            transform: hovered ? 'translateY(-3px)' : 'none',
            transition: `background ${DUR} ${EASE}, box-shadow ${DUR} ${EASE}, transform ${DUR} ${EASE}`,
            overflow: 'hidden',
            cursor: 'pointer',
            ...(narrow ? { width: 188, flexShrink: 0, scrollSnapAlign: 'start' } : {}),
          }}
        >
          {/* SAMPLE badge */}
          {creator.isSample && (
            <span style={{ position: 'absolute', top: 10, left: 10, padding: '2px 7px', borderRadius: 9999, fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', background: 'rgba(149,157,144,0.15)', color: '#959D90', lineHeight: 1.8, pointerEvents: 'none' }}>SAMPLE</span>
          )}
          {/* Trash */}
          {creator.isSample && onHide && (
            <button
              onClick={(e) => { e.stopPropagation(); onHide(creator.id); }}
              title="Hide this creator"
              style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(149,157,144,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(149,157,144,0.55)'}
            >
              <IconTrash />
            </button>
          )}

          {/* Avatar */}
          <div style={{ padding: narrow ? '14px 13px 0' : '16px 16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: narrow ? 68 : 72, height: narrow ? 68 : 72,
                  borderRadius: '50%', overflow: 'hidden',
                  border: '2.5px solid rgba(255,255,255,0.97)',
                  boxShadow: '0 3px 14px rgba(25,37,36,0.13)', flexShrink: 0,
                }}>
                  <CreatorAvatar src={creator.avatar} name={creator.name} size={narrow ? 68 : 72} style={{ border: 'none', width: '100%', height: '100%' }} />
                </div>
                {creator.isFounder && (
                  <div
                    title="Founder — one of the first 100 on Collabnb"
                    style={{
                      position: 'absolute', top: 2, right: -5,
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #D4A843, #B8922A)',
                      border: '2.5px solid #fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 10px rgba(212,168,67,0.55)',
                    }}
                  >
                    <IconStar />
                  </div>
                )}
              </div>
            </div>

            {/* Name / handle / location / tier */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: narrow ? 13 : 14, color: 'var(--ink)', lineHeight: 1.2 }}>
                {creator.name}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--sage)', marginTop: 2 }}>
                @{creator.username}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 9999, marginTop: 6, background: 'rgba(25,37,36,0.05)', border: '1px solid rgba(25,37,36,0.08)' }}>
                <IconPin />
                <span style={{ fontSize: 10, color: 'var(--slate)' }}>{city}</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 9999, fontSize: 9.5, fontWeight: 700, background: t.bg, color: t.color }}>
                  {creator.tier}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ padding: narrow ? '10px 13px 0' : '12px 16px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(25,37,36,0.06)', borderRadius: '0.625rem', overflow: 'hidden' }}>
              {[
                { label: 'Avg. Reach', value: fmtNum(creator.avg_reach_30d ?? creator.followers) },
                { label: 'Eng. Rate',  value: `${creator.er_30d ?? creator.engagement}%`, tooltip: 'Engagement Rate — % of followers who liked, commented, or shared in the last 30 days.' },
                { label: 'Collabs',    value: creator.collab_count ?? '—' },
              ].map(({ label, value, tooltip }) => (
                <div key={label} title={tooltip} style={{ padding: '9px 0', background: 'rgba(255,255,255,0.78)', textAlign: 'center', cursor: tooltip ? 'help' : 'default' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: narrow ? 12 : 13, color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 9.5, color: 'var(--sage)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform chips */}
          <div style={{ padding: narrow ? '8px 13px 0' : '10px 16px 0', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {creator.platforms?.slice(0, narrow ? 1 : 2).map(p => (
              <span key={p} style={{ padding: '3px 9px', borderRadius: 9999, fontSize: 10, fontWeight: 600, background: 'rgba(60,87,89,0.08)', color: 'var(--ink)' }}>{p}</span>
            ))}
            {visitingBadge && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 600, background: 'rgba(60,87,89,0.08)', color: 'var(--slate)' }}>
                <IconPin />{visitingBadge}
              </span>
            )}
          </div>

          {/* Message button */}
          <div style={{ padding: narrow ? '10px 13px 13px' : '10px 16px 14px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onMessage?.(creator); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '8px 0', borderRadius: '0.875rem',
                background: 'var(--ink)', color: 'var(--bone)',
                border: 'none', cursor: 'pointer',
                fontSize: 11.5, fontWeight: 600, fontFamily: 'var(--font-body)',
                transition: 'opacity 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <IconMsg />Message
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Default export ───────────────────────────────────────────────────────────
export default function CreatorCard({ creator, variant = 'card', narrow = false, onMessage, onHide, visitingBadge, delay = 0 }) {
  if (variant === 'chip') {
    return <ChipCard creator={creator} onMessage={onMessage} onHide={onHide} />;
  }
  return (
    <FullCard
      creator={creator}
      narrow={narrow}
      onMessage={onMessage}
      onHide={onHide}
      visitingBadge={visitingBadge}
      delay={delay}
    />
  );
}
