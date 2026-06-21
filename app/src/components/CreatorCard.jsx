import { useState } from 'react';
import CreatorAvatar from './CreatorAvatar';

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
const IconCheck = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EASE = 'cubic-bezier(0.25,1,0.5,1)';
const DUR = '360ms';

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
      <CreatorAvatar
        src={creator.avatar} name={creator.name} size={36}
        style={{ border: '1.5px solid rgba(255,255,255,0.9)', flexShrink: 0 }}
      />
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

// ─── Card / Expanded variant ──────────────────────────────────────────────────
function FullCard({ creator, narrow = false, onMessage, onHide, visitingBadge, delay = 0 }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const t = TIER_COLORS[creator.tier] || TIER_COLORS['UGC Beginner'];

  const city = creator.location?.split(',')[0] ?? creator.location ?? '';

  const upcomingTrips = (creator.travelCalendar || [])
    .filter(trip => new Date(trip.endDate) >= new Date())
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .slice(0, 3);

  function toggle(e) {
    e.stopPropagation();
    setOpen(o => !o);
  }

  const avatarSize = open ? (narrow ? 88 : 96) : (narrow ? 68 : 72);

  return (
    <div
      className={delay ? 'reveal-up' : undefined}
      style={delay ? { animationDelay: `${delay}ms`, opacity: 0 } : {}}
    >
      <div
        onMouseEnter={() => !open && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          background: open
            ? 'rgba(255,255,255,0.99)'
            : hovered
            ? 'rgba(255,255,255,0.97)'
            : 'rgba(255,255,255,0.84)',
          backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          border: '1px solid rgba(255,255,255,0.85)',
          borderRadius: '1.375rem',
          boxShadow: open
            ? '0 20px 60px rgba(25,37,36,0.18), 0 0 0 1px rgba(25,37,36,0.04)'
            : hovered
            ? '0 14px 36px rgba(25,37,36,0.13), inset 0 1px 0 rgba(255,255,255,0.7)'
            : '0 4px 18px rgba(25,37,36,0.07), inset 0 1px 0 rgba(255,255,255,0.6)',
          transform: !open && hovered ? 'translateY(-3px)' : 'none',
          transition: `background ${DUR} ${EASE}, box-shadow ${DUR} ${EASE}, transform ${DUR} ${EASE}`,
          overflow: 'hidden',
          ...(narrow ? { width: 188, flexShrink: 0, scrollSnapAlign: 'start' } : {}),
        }}
      >

        {/* ── Hero banner — slides in when open ── */}
        <div style={{
          maxHeight: open ? 128 : 0,
          overflow: 'hidden',
          transition: `max-height ${DUR} ${EASE}`,
        }}>
          <div style={{ height: 128, background: 'linear-gradient(150deg, #D1EBDB 0%, #E6EFE7 45%, #EFECE9 100%)', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(25,37,36,0.08) 1px, transparent 1px)', backgroundSize: '16px 16px', backgroundPosition: '8px 8px', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN_BG, opacity: 0.05, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 90% at 50% -10%, rgba(255,255,255,0.55) 0%, transparent 70%)', pointerEvents: 'none' }} />
            {creator.isSample && (
              <span style={{ position: 'absolute', top: 12, left: 14, padding: '2px 8px', borderRadius: 9999, fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', background: 'rgba(149,157,144,0.2)', color: '#959D90', lineHeight: 1.8 }}>SAMPLE</span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              style={{ position: 'absolute', top: 11, right: 11, width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)', border: '1px solid rgba(25,37,36,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(25,37,36,0.1)', transition: 'background 150ms' }}
              onMouseEnter={e => e.currentTarget.style.background = '#fff'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.88)'}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1L7 7M7 1L1 7" stroke="#3C5759" strokeWidth="1.6" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        {/* ── Header: avatar + identity ── */}
        <div
          onClick={toggle}
          style={{ padding: narrow ? '14px 13px 0' : '16px 16px 0', cursor: 'pointer' }}
        >
          {/* Collapsed badges */}
          {!open && creator.isSample && (
            <span style={{ position: 'absolute', top: 10, left: 10, padding: '2px 7px', borderRadius: 9999, fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', background: 'rgba(149,157,144,0.15)', color: '#959D90', lineHeight: 1.8, pointerEvents: 'none' }}>SAMPLE</span>
          )}
          {!open && creator.isSample && onHide && (
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
          <div style={{
            display: 'flex', justifyContent: 'center',
            marginTop: open ? -50 : 0,
            marginBottom: 10,
            transition: `margin-top ${DUR} ${EASE}`,
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: avatarSize, height: avatarSize,
                borderRadius: '50%', overflow: 'hidden',
                border: `${open ? 4 : 2.5}px solid rgba(255,255,255,0.97)`,
                boxShadow: open ? '0 4px 22px rgba(25,37,36,0.15)' : '0 3px 14px rgba(25,37,36,0.13)',
                transition: `width ${DUR} ${EASE}, height ${DUR} ${EASE}, border-width 200ms, box-shadow ${DUR} ${EASE}`,
                flexShrink: 0,
              }}>
                <CreatorAvatar src={creator.avatar} name={creator.name} size={avatarSize} style={{ border: 'none', width: '100%', height: '100%' }} />
              </div>
              {creator.isFounder && (
                <div title="Founder — one of the first 100 on Collabnb" style={{
                  position: 'absolute', top: open ? 3 : 2, right: open ? -7 : -5,
                  width: open ? 24 : 18, height: open ? 24 : 18,
                  borderRadius: '50%', background: 'linear-gradient(135deg, #D4A843, #B8922A)',
                  border: '2.5px solid #fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 10px rgba(212,168,67,0.55)',
                  transition: `width ${DUR} ${EASE}, height ${DUR} ${EASE}`,
                }}>
                  <IconStar />
                </div>
              )}
            </div>
          </div>

          {/* Name / handle / location / tier */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: open ? 800 : 700,
              fontSize: open ? (narrow ? 17 : 20) : (narrow ? 13 : 14),
              color: 'var(--ink)', lineHeight: 1.2,
              transition: `font-size ${DUR} ${EASE}`,
            }}>
              {creator.name}
            </div>
            <div style={{ fontSize: open ? 12.5 : 10.5, color: 'var(--sage)', marginTop: 2, transition: `font-size ${DUR} ${EASE}` }}>
              @{creator.username}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 9999, marginTop: 6, background: 'rgba(25,37,36,0.05)', border: '1px solid rgba(25,37,36,0.08)' }}>
              <IconPin />
              <span style={{ fontSize: open ? 11 : 10, color: 'var(--slate)' }}>{city}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <span style={{
                display: 'inline-block',
                padding: open ? '4px 14px' : '3px 10px',
                borderRadius: 9999, fontSize: open ? 11 : 9.5, fontWeight: 700,
                background: t.bg, color: t.color,
                transition: `padding ${DUR} ${EASE}, font-size ${DUR} ${EASE}`,
              }}>
                {creator.tier}
              </span>
            </div>
          </div>
        </div>

        {/* ── Stats (always visible) ── */}
        <div
          onClick={!open ? toggle : undefined}
          style={{ padding: narrow ? '10px 13px 0' : '12px 16px 0', cursor: open ? 'default' : 'pointer' }}
        >
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1, background: 'rgba(25,37,36,0.06)',
            borderRadius: open ? '0.875rem' : '0.625rem', overflow: 'hidden',
            transition: `border-radius ${DUR} ${EASE}`,
          }}>
            {[
              { label: 'Avg. Reach', value: fmtNum(creator.avg_reach_30d ?? creator.followers) },
              { label: 'ER @ 30d',   value: `${creator.er_30d ?? creator.engagement}%` },
              { label: 'Collabs',    value: creator.collab_count ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                padding: open ? '12px 0' : '9px 0',
                background: 'rgba(255,255,255,0.78)', textAlign: 'center',
                transition: `padding ${DUR} ${EASE}`,
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontWeight: 800,
                  fontSize: open ? (narrow ? 14 : 16) : (narrow ? 12 : 13),
                  color: 'var(--ink)', lineHeight: 1,
                  transition: `font-size ${DUR} ${EASE}`,
                }}>{value}</div>
                <div style={{ fontSize: 9.5, color: 'var(--sage)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Platform chips + visiting badge (collapsed only) ── */}
        <div style={{
          maxHeight: open ? 0 : 50,
          overflow: 'hidden',
          opacity: open ? 0 : 1,
          transition: `max-height ${DUR} ${EASE}, opacity 180ms`,
          pointerEvents: open ? 'none' : 'auto',
        }}>
          <div
            onClick={toggle}
            style={{ padding: narrow ? '8px 13px 0' : '10px 16px 0', display: 'flex', gap: 5, flexWrap: 'wrap', cursor: 'pointer' }}
          >
            {creator.platforms?.slice(0, narrow ? 1 : 2).map(p => (
              <span key={p} style={{ padding: '3px 9px', borderRadius: 9999, fontSize: 10, fontWeight: 600, background: 'rgba(60,87,89,0.08)', color: 'var(--ink)' }}>{p}</span>
            ))}
            {visitingBadge && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 600, background: 'rgba(60,87,89,0.08)', color: 'var(--slate)' }}>
                <IconPin />{visitingBadge}
              </span>
            )}
          </div>
        </div>

        {/* ── Message button (collapsed only) ── */}
        <div style={{
          maxHeight: open ? 0 : 70,
          overflow: 'hidden',
          opacity: open ? 0 : 1,
          transition: `max-height ${DUR} ${EASE}, opacity 180ms`,
          pointerEvents: open ? 'none' : 'auto',
        }}>
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

        {/* ── Expanded detail content ── */}
        <div style={{
          maxHeight: open ? 700 : 0,
          overflow: 'hidden',
          transition: `max-height ${DUR} ${EASE}`,
        }}>
          <div style={{ padding: narrow ? '0 13px' : '0 16px' }}>

            {creator.bio && (
              <p style={{ fontSize: 12.5, color: 'var(--slate)', lineHeight: 1.65, margin: '14px 0 0' }}>
                {creator.bio}
              </p>
            )}

            {(creator.platforms?.length > 0 || creator.niches?.length > 0) && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {creator.platforms?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--sage)', minWidth: 55, flexShrink: 0 }}>Platforms</span>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {creator.platforms.map(p => (
                        <span key={p} style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 10.5, fontWeight: 600, background: 'rgba(60,87,89,0.09)', color: 'var(--ink)' }}>{p}</span>
                      ))}
                    </div>
                  </div>
                )}
                {creator.niches?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--sage)', minWidth: 55, flexShrink: 0 }}>Niches</span>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {creator.niches.map(n => (
                        <span key={n} style={{ padding: '3px 9px', borderRadius: 9999, fontSize: 10, fontWeight: 600, background: 'var(--bone)', color: 'var(--slate)' }}>{n}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {upcomingTrips.length > 0 && (
              <div style={{ margin: '14px 0 0', padding: '12px 14px', borderRadius: '1rem', background: 'rgba(209,235,219,0.22)', border: '1px solid rgba(209,235,219,0.65)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Upcoming Trips
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {upcomingTrips.map(trip => (
                    <div key={trip.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--slate)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>
                        {trip.city}{trip.country && trip.country !== 'USA' ? `, ${trip.country}` : ''}
                      </span>
                      <span style={{ fontSize: 10.5, color: 'var(--sage)', flexShrink: 0 }}>
                        {fmtDate(trip.startDate)}–{fmtDate(trip.endDate)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {creator.past_collab && (
              <div style={{ margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 7, padding: '9px 12px', borderRadius: '0.75rem', background: 'rgba(74,155,127,0.07)', border: '1px solid rgba(74,155,127,0.22)' }}>
                <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#2d7d5e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#2d7d5e' }}>You've collaborated with this person before</span>
              </div>
            )}
          </div>

          <div style={{ height: 1, background: 'rgba(25,37,36,0.07)', margin: '16px 0 0' }} />

          <div style={{ padding: narrow ? '12px 13px 16px' : '12px 16px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
            {creator.portfolioUrl && (
              <button
                onClick={(e) => { e.stopPropagation(); window.open(creator.portfolioUrl, '_blank'); }}
                title="View portfolio"
                style={{ width: 40, height: 40, borderRadius: 9999, flexShrink: 0, border: '1.5px solid rgba(25,37,36,0.12)', background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--slate)', transition: 'background 150ms, transform 150ms' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.55)'; e.currentTarget.style.transform = 'none'; }}
              >
                <IconExt />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onMessage?.(creator); }}
              style={{ flex: 1, padding: '11px 0', borderRadius: 9999, background: 'var(--ink)', color: 'var(--bone)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'opacity 150ms, transform 150ms' }}
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

// ─── Default export ───────────────────────────────────────────────────────────
// Props:
//   creator       — { id, name, username, avatar, tier, isFounder, past_collab, location,
//                     followers, engagement, collab_count, avg_reach_30d, er_30d,
//                     bio, platforms[], niches[], travelCalendar[], portfolioUrl, isSample }
//   variant       — 'chip' | 'card' (default)
//   narrow        — true for 188px fixed-width horizontal-scroll cards
//   onMessage     — (creator) => void
//   onHide        — (id) => void  (sample creators only)
//   visitingBadge — string | null
//   delay         — number (ms) for staggered reveal-up animation
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
