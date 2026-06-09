import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, Users, Calendar, MessageSquare, MoreVertical, X, UserPlus, Home, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';
import { SAMPLE_LISTINGS, IMG_FALLBACK } from '../lib/mockData';
import SkeletonCard from '../components/SkeletonCard';
import { cache } from '../lib/cache';

const EXPLORE_CACHE_KEY = 'explore_listings_all';

// ─── Light glass token — matches nav bar exactly ──────────────────────────────
const GC = {
  background: 'rgba(255,255,255,0.82)',
  backdropFilter: 'blur(24px) saturate(140%)',
  WebkitBackdropFilter: 'blur(24px) saturate(140%)',
  border: '1px solid rgba(255,255,255,0.85)',
  boxShadow: '0 4px 20px rgba(25,37,36,0.08), inset 0 1px 0 rgba(255,255,255,0.7)',
  borderRadius: '1.25rem',
};

// ─── Activity dismiss — localStorage ─────────────────────────────────────────
const DISMISS_KEY = '@collabnb_dismissed_activity_v1';
function getDismissed() {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveDismissed(set) {
  try { localStorage.setItem(DISMISS_KEY, JSON.stringify([...set])); } catch {}
}

// ─── Listing status — localStorage ───────────────────────────────────────────
const LISTINGS_STATUS_KEY = '@collabnb_host_listings_local_v1';
function getListingStatuses() {
  try { return JSON.parse(localStorage.getItem(LISTINGS_STATUS_KEY) || '{}'); }
  catch { return {}; }
}
function saveListingStatuses(statuses) {
  try { localStorage.setItem(LISTINGS_STATUS_KEY, JSON.stringify(statuses)); } catch {}
}

function fmtStat(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function sparkPath(data, w, h, pad = 3) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - pad * 2) + pad;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

function MiniLineChart({ data, color, delay = 0 }) {
  const w = 88, h = 38;
  const d = sparkPath(data, w, h);
  const safeColor = color.replace('#', '');
  return (
    <svg width={w} height={h} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id={`lg-${safeColor}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${d} L${(w - 3).toFixed(1)} ${h} L3 ${h} Z`}
        fill={`url(#lg-${safeColor})`}
        style={{ animation: `chart-fade-in 0.6s ease-out ${delay}ms both` }}
      />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="300"
        style={{ animation: `chart-draw 0.7s ease-out ${delay}ms both` }}
      />
    </svg>
  );
}

function MiniBarChart({ data, color, delay = 0 }) {
  const w = 88, h = 38;
  const max = Math.max(...data);
  const bw = (w / data.length) - 2.5;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {data.map((v, i) => {
        const bh = Math.max(2, (v / max) * (h - 4));
        const x = i * (w / data.length) + 1;
        return (
          <rect
            key={i}
            x={x}
            y={h - bh}
            width={bw}
            height={bh}
            rx="2"
            fill={color}
            fillOpacity="0.75"
            style={{
              transformOrigin: `${(x + bw / 2).toFixed(1)}px ${h}px`,
              animation: `bar-grow 0.35s ease-out ${delay + i * 55}ms both`,
            }}
          />
        );
      })}
    </svg>
  );
}

function BlurredReachChart({ data, color, delay = 0 }) {
  const [tipVisible, setTipVisible] = useState(false);
  const w = 88, h = 38;
  const d = sparkPath(data, w, h);
  const safeColor = color.replace('#', '');
  return (
    <div
      style={{ position: 'relative', display: 'inline-block', cursor: 'default' }}
      onMouseEnter={() => setTipVisible(true)}
      onMouseLeave={() => setTipVisible(false)}
    >
      <div style={{ filter: 'blur(4px)', userSelect: 'none' }}>
        <svg width={w} height={h} style={{ overflow: 'visible', display: 'block' }}>
          <defs>
            <linearGradient id={`lg-blurred-${safeColor}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${d} L${(w - 3).toFixed(1)} ${h} L3 ${h} Z`}
            fill={`url(#lg-blurred-${safeColor})`}
            style={{ animation: `chart-fade-in 0.6s ease-out ${delay}ms both` }}
          />
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="300"
            style={{ animation: `chart-draw 0.7s ease-out ${delay}ms both` }}
          />
        </svg>
      </div>
      {tipVisible && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(25,37,36,0.92)',
          backdropFilter: 'blur(12px)',
          color: '#fff', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-body)',
          padding: '6px 10px', borderRadius: '0.5rem',
          whiteSpace: 'nowrap', zIndex: 10,
          lineHeight: 1.4,
          animation: 'fadeUp 140ms ease forwards',
        }}>
          Feature coming soon —<br />Instagram integration in progress.
        </div>
      )}
    </div>
  );
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const HOST_META = {
  '1': { status: 'active',  applicants: 4, confirmed: 1, completed: 0 },
  '2': { status: 'active',  applicants: 2, confirmed: 1, completed: 0 },
  '3': { status: 'paused',  applicants: 6, confirmed: 2, completed: 2 },
  '4': { status: 'draft',   applicants: 0, confirmed: 0, completed: 0 },
  '5': { status: 'active',  applicants: 3, confirmed: 0, completed: 0 },
  '6': { status: 'draft',   applicants: 0, confirmed: 0, completed: 0 },
};

const STATUS_CFG = {
  active: { label: 'Active',  bg: 'rgba(74,155,127,0.85)',  color: '#fff' },
  paused: { label: 'Paused',  bg: 'rgba(212,168,67,0.85)',  color: '#fff' },
  draft:  { label: 'Draft',   bg: 'rgba(149,157,144,0.7)',  color: '#fff' },
};

const ACTIVITY = [
  { id: 'a1', Icon: UserPlus,      iconColor: '#3C5759', bg: 'rgba(60,87,89,0.12)',   text: 'Priya Nair applied to Glacier Prime Cabin', sub: '2h ago',  cta: 'Review',  route: '/host/proposals' },
  { id: 'a2', Icon: MessageSquare, iconColor: '#7B68C8', bg: 'rgba(123,104,200,0.1)', text: 'Jordan Ellis sent you a message',            sub: '5h ago',  cta: 'Reply',   route: '/inbox' },
  { id: 'a3', Icon: Home,          iconColor: '#4A9B7F', bg: 'rgba(74,155,127,0.12)', text: "Maya Chen's stay starts in 3 days",          sub: 'July 4',  cta: 'Details', route: '/host/proposals' },
  { id: 'a4', Icon: UserPlus,      iconColor: '#3C5759', bg: 'rgba(60,87,89,0.12)',   text: 'Lena Park applied to Cliffside Villa',       sub: '1d ago',  cta: 'Review',  route: '/host/proposals' },
  { id: 'a5', Icon: CheckCircle2,  iconColor: '#D4A843', bg: 'rgba(212,168,67,0.12)', text: 'Sam Kowalski completed their collab',        sub: '2d ago',  cta: 'Rate',    route: '/host/proposals' },
];

// ─── Convex listing normalizer ────────────────────────────────────────────────
function normalizeConvexListing(l) {
  const images = l.gallery_images?.length ? l.gallery_images : (l.image ? [l.image] : []);

  let compensation = l.compensation || '';
  if (!compensation) {
    if (l.compensation_type === 'free_stay') compensation = `Free Stay · ${l.nights || '?'} nights`;
    else if (l.compensation_type === 'paid') compensation = `$${l.cash_amount || '?'} cash`;
    else if (l.compensation_type === 'hybrid') compensation = `Free Stay + $${l.cash_amount || '?'}`;
    else compensation = 'See listing';
  }

  let deliverables = l.deliverables || '';
  if (!deliverables && l.deliverables_list?.length) {
    const parts = l.deliverables_list.slice(0, 2).map((d) => `${d.quantity}× ${d.type}`);
    deliverables = parts.join(', ');
    if (l.deliverables_list.length > 2) deliverables += ` +${l.deliverables_list.length - 2} more`;
  } else if (!deliverables && l.deliverable_count) {
    deliverables = `${l.deliverable_count} deliverables`;
  }

  // Normalize 'published' → 'active' so STATUS_CFG renders correctly
  const status = l.status === 'published' ? 'active' : (l.status || 'draft');

  return {
    ...l,
    id: String(l._id),
    status,
    image: images[0] || '',
    gallery_images: images,
    compensation,
    deliverables,
    collab_type: l.collab_type || l.deliverable_load || 'Collab',
  };
}

// ─── Expanded chart modal ─────────────────────────────────────────────────────
function ExpandedChartModal({ cardKey, onClose, stats, chartData }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const CFGS = {
    collabs:  { title: 'Total Collabs',        total: fmtStat(stats.totalCollabs),   data: chartData.collabs,  color: '#4A9B7F', type: 'line' },
    creators: { title: 'Creators Worked With', total: fmtStat(stats.uniqueCreators), data: chartData.creators, color: '#3C5759', type: 'bar'  },
    content:  { title: 'Content Pieces',       total: fmtStat(stats.contentPieces),  data: chartData.content,  color: '#7B68C8', type: 'line' },
  };
  const cfg = CFGS[cardKey];
  if (!cfg) return null;

  const W = 380, H = 150, pL = 8, pR = 8, pT = 22, pB = 30;
  const iW = W - pL - pR, iH = H - pT - pB;

  const months = cfg.data.map((_, i, arr) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (arr.length - 1 - i));
    return d.toLocaleDateString('en-US', { month: 'short' });
  });

  const max = Math.max(...cfg.data);
  const min = cfg.type === 'line' ? Math.min(...cfg.data) : 0;
  const range = max - min || 1;

  const pts = cfg.data.map((v, i) => ({
    x: pL + (i / (cfg.data.length - 1)) * iW,
    y: pT + iH - ((v - min) / range) * iH,
    v,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const safeKey = cardKey;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(25,37,36,0.45)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}
    >
      <div
        style={{ ...GC, padding: '1.75rem', width: 440, maxWidth: '100%', animation: 'fadeUp 180ms ease forwards' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, marginBottom: '0.4rem' }} />
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', color: 'var(--ink)', margin: 0, lineHeight: 1 }}>{cfg.total}</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--sage)', marginTop: '0.2rem' }}>{cfg.title} · All time</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(25,37,36,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} color="var(--ink)" />
          </button>
        </div>

        {cfg.type === 'line' ? (
          <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <linearGradient id={`exp-fill-${safeKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cfg.color} stopOpacity="0.18" />
                <stop offset="100%" stopColor={cfg.color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${linePath} L${pts[pts.length-1].x.toFixed(1)} ${pT+iH} L${pts[0].x.toFixed(1)} ${pT+iH} Z`} fill={`url(#exp-fill-${safeKey})`} />
            <path d={linePath} fill="none" stroke={cfg.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((pt, i) => (
              <g key={i}>
                <rect x={pt.x - 18} y={pT - 4} width={36} height={iH + pB + 4} fill="transparent" onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)} style={{ cursor: 'crosshair' }} />
                <circle cx={pt.x} cy={pt.y} r={hoveredIdx === i ? 5 : 3} fill={cfg.color} stroke="white" strokeWidth="1.5" style={{ transition: 'r 80ms', pointerEvents: 'none' }} />
                {hoveredIdx === i && (
                  <text x={pt.x} y={pt.y - 9} textAnchor="middle" fontSize={11} fontWeight={700} fill={cfg.color} fontFamily="var(--font-body)" style={{ pointerEvents: 'none' }}>{pt.v}</text>
                )}
                <text x={pt.x} y={pT + iH + 18} textAnchor="middle" fontSize={10} fill="var(--sage)" fontFamily="var(--font-body)">{months[i]}</text>
              </g>
            ))}
          </svg>
        ) : (
          <svg width={W} height={H} style={{ display: 'block' }}>
            {cfg.data.map((v, i) => {
              const slotW = iW / cfg.data.length;
              const bw = Math.floor(slotW * 0.62);
              const bh = Math.max(3, (v / max) * iH);
              const x = pL + i * slotW + (slotW - bw) / 2;
              const y = pT + iH - bh;
              const isHov = hoveredIdx === i;
              return (
                <g key={i} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)} style={{ cursor: 'crosshair' }}>
                  <rect x={pL + i * slotW} y={pT} width={slotW} height={iH + pB} fill="transparent" />
                  <rect x={x} y={pT} width={bw} height={iH} fill="rgba(25,37,36,0.04)" rx={4} />
                  <rect x={x} y={y} width={bw} height={bh} fill={isHov ? cfg.color : `${cfg.color}bb`} rx={4} style={{ transition: 'fill 80ms' }} />
                  {isHov && <text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={cfg.color} fontFamily="var(--font-body)">{v}</text>}
                  <text x={x + bw / 2} y={pT + iH + 18} textAnchor="middle" fontSize={10} fill="var(--sage)" fontFamily="var(--font-body)">{months[i]}</text>
                </g>
              );
            })}
          </svg>
        )}

        <p style={{ fontSize: '0.7rem', color: 'var(--sage)', textAlign: 'center', marginTop: '0.875rem' }}>
          Preview data · Live tracking activates with production backend
        </p>
      </div>
    </div>
  );
}

// ─── Host Listing Card ────────────────────────────────────────────────────────
function HostListingCard({ listing, meta, delay, glowState, onToggleStatus, onDuplicate, onRemoveSample }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const status = STATUS_CFG[meta.status] || STATUS_CFG.draft;
  const isActive = meta.status === 'active';
  const pulsing = isActive && glowState === 'pulsing';
  const frozen  = isActive && glowState === 'frozen';

  return (
    <div
      className="reveal-up"
      style={{ position: 'relative', animationDelay: `${delay}ms`, opacity: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(20px) saturate(135%)',
          WebkitBackdropFilter: 'blur(20px) saturate(135%)',
          border: '1px solid rgba(255,255,255,0.85)',
          borderRadius: '1.25rem',
          overflow: 'hidden',
          cursor: 'pointer',
          transform: hovered ? 'translateY(-4px)' : 'none',
          boxShadow: frozen
            ? '0 4px 16px rgba(25,37,36,0.07), 0 0 0 2.5px rgba(209,235,219,0.7), 0 0 18px rgba(74,155,127,0.22)'
            : hovered
              ? '0 16px 48px rgba(25,37,36,0.16)'
              : '0 4px 16px rgba(25,37,36,0.07)',
          animation: pulsing ? 'listing-glow-pulse 0.67s ease-in-out 3' : undefined,
          transition: pulsing
            ? 'transform 280ms var(--ease-out-quart)'
            : 'transform 280ms var(--ease-out-quart), box-shadow 280ms var(--ease-out-quart)',
        }}
        onClick={() => navigate(`/host/listing/${listing.id}`)}
      >
        <div style={{ position: 'relative', height: 176, overflow: 'hidden' }}>
          <img
            src={listing.image}
            alt={listing.title}
            loading="lazy"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMG_FALLBACK; }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {listing.is_sample && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
              {[18, 50, 82].map((top, i) => (
                <div key={i} style={{
                  position: 'absolute', top: `${top}%`, left: '50%',
                  transform: 'translateX(-50%) rotate(-35deg)',
                  fontFamily: 'var(--font-display)', fontWeight: 900,
                  fontSize: '0.8rem', color: 'rgba(255,255,255,0.72)',
                  letterSpacing: '0.3em', whiteSpace: 'nowrap', userSelect: 'none',
                  textShadow: '0 1px 4px rgba(0,0,0,0.45)',
                }}>
                  SAMPLE · SAMPLE · SAMPLE
                </div>
              ))}
            </div>
          )}
          <span style={{
            position: 'absolute', top: '0.75rem', left: '0.75rem',
            padding: '0.25rem 0.6rem', borderRadius: 9999,
            fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.04em',
            background: status.bg, color: status.color, backdropFilter: 'blur(8px)',
          }}>
            {status.label}
          </span>
        </div>

        <div style={{ padding: '0.875rem 1rem 1rem' }}>
          <div style={{ marginBottom: '0.2rem' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)', lineHeight: 1.25 }}>
              {listing.title}
            </p>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--sage)', marginBottom: '0.6rem' }}>{listing.location}</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div>
              <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>{listing.compensation}</p>
              <p style={{ fontSize: '0.67rem', color: 'var(--sage)', marginTop: '0.15rem' }}>{listing.deliverables}</p>
            </div>
            <span className="chip" style={{ fontSize: '0.62rem', padding: '0.2rem 0.5rem', flexShrink: 0 }}>
              {listing.collab_type}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 0, background: 'rgba(25,37,36,0.04)', borderRadius: '0.625rem', padding: '0.5rem 0' }}>
            {[
              { num: meta.applicants, label: 'Applied'    },
              { num: meta.confirmed,  label: 'Confirmed'  },
              { num: meta.completed,  label: 'Done'       },
            ].map(({ num, label }, i) => (
              <div key={label} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(25,37,36,0.08)' : 'none' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)', lineHeight: 1 }}>{num}</p>
                <p style={{ fontSize: '0.62rem', color: 'var(--sage)', marginTop: '0.2rem' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3-dot menu (outside overflow:hidden card container) ── */}
      <div
        style={{
          position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 10,
          opacity: hovered || menuOpen ? 1 : 0,
          transition: 'opacity 200ms ease',
          pointerEvents: hovered || menuOpen ? 'auto' : 'none',
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((p) => !p); }}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(25,37,36,0.12)',
          }}
        >
          <MoreVertical size={14} color="var(--ink)" />
        </button>
        {menuOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0,
            background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(25,37,36,0.1)', borderRadius: '0.875rem',
            boxShadow: '0 8px 24px rgba(25,37,36,0.14)',
            minWidth: 148, zIndex: 20,
            overflow: 'hidden',
            animation: 'fadeUp 120ms ease forwards',
          }}>
            {[
              ...(listing.is_sample ? [{ label: 'Remove sample', danger: true, action: (e) => { e.stopPropagation(); onRemoveSample?.(listing); setMenuOpen(false); } }] : []),
              { label: 'Edit', action: (e) => {
                e.stopPropagation();
                const draft = {
                  title: listing.title || '',
                  location_city: listing.location_city || listing.location?.split(',')[0]?.trim() || '',
                  location_country: listing.location_country || '',
                  property_url: listing.property_url || '',
                  collaboration_brief: listing.collaboration_brief || '',
                  compensation_type: listing.compensation_type || 'free_stay',
                  nights: listing.nights || 2,
                  cash_amount: listing.cash_amount || 0,
                  creator_tier: listing.creator_tier || '',
                  deliverable_load: listing.deliverable_load || '',
                  images: listing.gallery_images || [],
                  perks: listing.perks || [],
                  vibe_tags: listing.vibe_tags || [],
                  affiliate_code: listing.affiliate_code || '',
                  affiliate_percent: listing.affiliate_percent || 0,
                  collab_start: listing.collab_start || '',
                  collab_end: listing.collab_end || '',
                  turnaround_days: listing.turnaround_days || 14,
                  deliverables_list: listing.deliverables_list || [],
                  revision_policy: listing.revision_policy || '1 round of minor revisions included. Major changes require mutual agreement.',
                  usage_rights: listing.usage_rights || 'Host receives perpetual, worldwide license for marketing use. Creator retains ownership and portfolio rights.',
                  maxOffers: listing.maxOffers || '',
                };
                localStorage.setItem('collabnb_listing_draft_v1', JSON.stringify(draft));
                const listingId = listing._id || listing.id;
                if (listingId) localStorage.setItem('collabnb_editing_listing_id_v1', String(listingId));
                navigate('/host/listings/create');
                setMenuOpen(false);
              } },
              { label: meta.status === 'paused' ? 'Unpause' : 'Pause', action: (e) => { e.stopPropagation(); if (meta.status !== 'draft') onToggleStatus(listing.id); setMenuOpen(false); }, muted: meta.status === 'draft' },
              { label: 'Duplicate', action: (e) => { e.stopPropagation(); onDuplicate(listing); setMenuOpen(false); } },
            ].map(({ label, action, muted, danger }) => (
              <button
                key={label}
                onClick={action}
                style={{
                  display: 'block', width: '100%', padding: '0.625rem 1rem',
                  textAlign: 'left', background: 'none', border: 'none',
                  cursor: muted ? 'default' : 'pointer',
                  fontSize: '0.82rem', fontWeight: 500,
                  color: danger ? '#C86868' : muted ? 'var(--sage)' : 'var(--ink)',
                  fontFamily: 'var(--font-body)', transition: 'background 120ms',
                }}
                onMouseEnter={(e) => { if (!muted) e.currentTarget.style.background = 'rgba(25,37,36,0.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function HostDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const seedSampleListingsMutation = useMutation(api.listings.seedSampleListings);
  const deleteListingMutation = useMutation(api.listings.deleteListing);

  // ── Convex: fetch only this host's listings ──────────────────────────────────
  const hostId = profile?._id || profile?.id;
  const convexHostListings = useQuery(
    api.listings.getByHost,
    hostId ? { host_id: hostId } : 'skip',
  );
  const convexPitches = useQuery(api.pitches.getByHost, hostId ? { hostId: String(hostId) } : 'skip');
  const pitchCountsByListing = useMemo(() => {
    const map = {};
    (convexPitches || []).forEach((p) => {
      const lid = String(p.listing_id);
      if (!map[lid]) map[lid] = { applicants: 0, confirmed: 0, completed: 0 };
      map[lid].applicants++;
      if (p.status === 'approved') map[lid].confirmed++;
      if (p.status === 'completed') map[lid].completed++;
    });
    return map;
  }, [convexPitches]);

  // ── Real impact stats derived from live Convex data ──────────────────────────
  const hostStats = useMemo(() => {
    const pitches = convexPitches || [];
    const listings = convexHostListings || [];
    const active = pitches.filter(p => p.status === 'approved' || p.status === 'accepted' || p.status === 'completed');
    const totalCollabs = active.length;
    const uniqueCreators = new Set(active.map(p => p.creator_id)).size;
    const estReach = active.reduce((sum, p) => sum + (p.creator_followers || 0), 0);
    const approvedListingIds = new Set(active.map(p => String(p.listing_id)));
    const contentPieces = listings
      .filter(l => !l.is_sample && approvedListingIds.has(String(l._id)))
      .reduce((sum, l) => sum + (l.deliverable_count || 0), 0);
    return { totalCollabs, uniqueCreators, contentPieces, estReach };
  }, [convexPitches, convexHostListings]);

  // ── 6-month time-series for sparklines ───────────────────────────────────────
  const hostChartData = useMemo(() => {
    const pitches = convexPitches || [];
    const MONTHS = 6;
    const now = new Date();
    const buckets = Array.from({ length: MONTHS }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth(), collabs: 0, creators: new Set(), reach: 0 };
    });
    pitches.forEach(p => {
      if (p.status !== 'approved' && p.status !== 'accepted' && p.status !== 'completed') return;
      const d = new Date(p.created_at);
      const b = buckets.find(b => b.year === d.getFullYear() && b.month === d.getMonth());
      if (!b) return;
      b.collabs++;
      b.creators.add(p.creator_id);
      b.reach += (p.creator_followers || 0);
    });
    return {
      collabs:  buckets.map(b => b.collabs),
      creators: buckets.map(b => b.creators.size),
      content:  buckets.map(b => b.collabs),
      reach:    buckets.map(b => b.reach / 1_000_000),
    };
  }, [convexPitches]);

  const [filter, setFilter] = useState('all');
  const [glowState, setGlowState] = useState('idle');
  const [expandedChart, setExpandedChart] = useState(null);
  const [dismissed, setDismissed] = useState(() => getDismissed());
  const [chartsAnimated, setChartsAnimated] = useState(false);
  const [listingStatuses, setListingStatuses] = useState(() => {
    const stored = getListingStatuses();
    const merged = {};
    // Seed mock-listing statuses from HOST_META + any stored overrides
    Object.keys(HOST_META).forEach((id) => {
      merged[id] = { ...HOST_META[id], ...(stored[id] ? { status: stored[id].status } : {}) };
    });
    // Also carry forward any stored statuses for Convex listing IDs
    Object.keys(stored).forEach((id) => {
      if (!merged[id]) merged[id] = { status: stored[id].status };
    });
    return merged;
  });
  const listingsSectionRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setChartsAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  // ── Auto-seed sample listings for first-time hosts ────────────────────────────
  const seedKeyRef = useRef(null);
  useEffect(() => {
    if (
      convexHostListings !== undefined &&
      convexHostListings.length === 0 &&
      hostId
    ) {
      const key = `@collabnb_sample_seeded_${hostId}`;
      if (!localStorage.getItem(key) && seedKeyRef.current !== key) {
        seedKeyRef.current = key;
        localStorage.setItem(key, 'true');
        seedSampleListingsMutation({
          host_id: String(hostId),
          host_name: profile?.full_name || 'Host',
        });
      }
    }
  }, [convexHostListings, hostId]);

  async function removeSampleListing(listing) {
    const id = listing._id || listing.id;
    if (!id) return;
    try { await deleteListingMutation({ id }); } catch {}
  }

  function triggerActiveGlow() {
    listingsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setGlowState('pulsing');
    setTimeout(() => setGlowState('frozen'), 2000);
  }

  function toggleListingStatus(id) {
    setListingStatuses((prev) => {
      const current = prev[id]?.status;
      if (current === 'draft') return prev;
      const next = current === 'paused' ? 'active' : 'paused';
      const updated = { ...prev, [id]: { ...prev[id], status: next } };
      saveListingStatuses(Object.fromEntries(Object.entries(updated).map(([k, v]) => [k, { status: v.status }])));
      cache.clear(EXPLORE_CACHE_KEY); // invalidate explore cache on status change
      return updated;
    });
  }

  function duplicateListing(listing) {
    const copy = {
      title: `${listing.title} (Copy)`,
      location_city: listing.location?.split(',')[0]?.trim() || '',
      location_country: '',
      compensation_type: listing.compensation_type || 'free_stay',
      nights: 2,
      cash_amount: listing.cash_amount || 0,
      creator_tier: listing.creator_tier || '',
      deliverable_load: listing.deliverable_load || '',
      images: [],
      perks: [],
      vibe_tags: [],
      affiliate_code: '',
      collab_start: '',
      collab_end: '',
      turnaround_days: 14,
      deliverables_list: [],
      revision_policy: '1 round of minor revisions included. Major changes require mutual agreement.',
      usage_rights: 'Host receives perpetual, worldwide license for marketing use. Creator retains ownership and portfolio rights.',
      maxOffers: '',
    };
    localStorage.setItem('collabnb_listing_draft_v1', JSON.stringify(copy));
    navigate('/host/listings/create');
  }

  function dismissActivity(id) {
    setDismissed((prev) => {
      const next = new Set([...prev, id]);
      saveDismissed(next);
      return next;
    });
  }

  // Use host's Convex listings when available; fall back to SAMPLE_LISTINGS for dev/demo
  const useConvex = convexHostListings !== undefined && convexHostListings.length > 0;
  const sourceListings = useConvex
    ? convexHostListings.map(normalizeConvexListing)
    : SAMPLE_LISTINGS;

  const hostListings = sourceListings.map((l) => {
    const stored   = listingStatuses[l.id];
    // Convex listings carry their own status; samples use HOST_META defaults
    const defaultStatus = useConvex
      ? (l.status || 'draft')
      : (HOST_META[l.id]?.status || 'draft');
    const realCounts = useConvex ? (pitchCountsByListing[l.id] || {}) : {};
    const meta = {
      status:     stored?.status     ?? defaultStatus,
      applicants: realCounts.applicants ?? HOST_META[l.id]?.applicants ?? 0,
      confirmed:  realCounts.confirmed  ?? HOST_META[l.id]?.confirmed  ?? 0,
      completed:  realCounts.completed  ?? HOST_META[l.id]?.completed  ?? 0,
    };
    const autoPaused = meta.status === 'active' && l.maxOffers && meta.confirmed >= l.maxOffers;
    return { ...l, meta: autoPaused ? { ...meta, status: 'paused' } : meta };
  });

  const filtered       = filter === 'all' ? hostListings : hostListings.filter((l) => l.meta.status === filter);
  const activeCount    = hostListings.filter((l) => l.meta.status === 'active').length;
  const applicantSum   = hostListings.reduce((a, l) => a + (l.meta?.applicants || 0), 0);
  const firstName      = profile?.full_name?.split(' ')[0] ?? 'there';
  const displayActivity = ACTIVITY.filter((a) => !dismissed.has(a.id));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
    <div style={{ minHeight: '100dvh' }}>
      <style>{`
        @keyframes listing-glow-pulse {
          0%   { box-shadow: 0 4px 16px rgba(25,37,36,0.07); }
          50%  { box-shadow: 0 4px 16px rgba(25,37,36,0.07), 0 0 0 5px rgba(209,235,219,0.75), 0 0 22px rgba(74,155,127,0.38); }
          100% { box-shadow: 0 4px 16px rgba(25,37,36,0.07); }
        }
        @keyframes chart-draw {
          from { stroke-dashoffset: 300; stroke-dasharray: 300; }
          to   { stroke-dashoffset: 0;   stroke-dasharray: 300; }
        }
        @keyframes chart-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes bar-grow {
          from { transform: scaleY(0); }
          to   { transform: scaleY(1); }
        }
      `}</style>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.78rem', color: 'var(--sage)', marginBottom: '0.2rem' }}>{greeting},</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', color: 'var(--ink)', margin: 0, lineHeight: 1.1 }}>
              {firstName}'s Dashboard
            </h1>
          </div>
          <button
            onClick={() => navigate('/host/listings/create')}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.25rem', fontSize: '0.875rem', flexShrink: 0 }}
          >
            <Plus size={15} />
            New listing
          </button>
        </div>

        {/* ── Stats strip ── */}
        <div style={{
          ...GC,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          marginBottom: '2.5rem',
          overflow: 'hidden',
        }}>
          {[
            { icon: MapPin,        label: 'Active Listings',  value: activeCount,  color: '#4A9B7F', action: triggerActiveGlow },
            { icon: Users,         label: 'New Applicants',   value: applicantSum, color: '#7B68C8', action: () => navigate('/host/proposals', { state: { filter: 'pending'  } }) },
            { icon: Calendar,      label: 'Upcoming Stays',   value: 3,            color: '#D4A843', action: () => navigate('/host/proposals', { state: { filter: 'approved' } }) },
            { icon: MessageSquare, label: 'Unread Messages',  value: 5,            color: '#C86868', action: () => navigate('/inbox') },
          ].map(({ icon: Icon, label, value, color, action }, i, arr) => (
            <div
              key={label}
              onClick={action}
              style={{
                padding: '1.25rem 1.5rem',
                borderRight: i < arr.length - 1 ? '1px solid rgba(25,37,36,0.07)' : 'none',
                cursor: 'pointer',
                transition: 'background 160ms',
                borderRadius: i === 0 ? '1.25rem 0 0 1.25rem' : i === arr.length - 1 ? '0 1.25rem 1.25rem 0' : undefined,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(25,37,36,0.03)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Icon size={15} color={color} strokeWidth={2} />
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--ink)', margin: '0.4rem 0 0.1rem', lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--sage)', fontFamily: 'var(--font-body)' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* ── My Listings ── */}
        <div ref={listingsSectionRef} style={{ marginBottom: '2.5rem', scrollMarginTop: '8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--ink)', margin: 0 }}>My Listings</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--sage)', marginTop: '0.15rem' }}>{hostListings.length} total</p>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {['all', 'active', 'paused', 'draft'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '0.35rem 0.875rem', borderRadius: 9999,
                    fontSize: '0.78rem', fontWeight: 600,
                    background: filter === f ? 'var(--ink)' : 'rgba(255,255,255,0.65)',
                    color: filter === f ? 'var(--bone)' : 'var(--slate)',
                    border: '1px solid', borderColor: filter === f ? 'var(--ink)' : 'rgba(25,37,36,0.12)',
                    backdropFilter: 'blur(12px)', cursor: 'pointer',
                    transition: 'all 180ms var(--ease-out-quart)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {convexHostListings === undefined ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} variant="host-listing" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ ...GC, padding: '3rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
                No {filter} listings
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--sage)' }}>
                {filter === 'all' ? 'Create your first listing to start attracting creators.' : `You have no ${filter} listings right now.`}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
              {filtered.map((listing, i) => (
                <HostListingCard key={listing.id} listing={listing} meta={listing.meta} delay={i * 55} glowState={glowState} onToggleStatus={toggleListingStatus} onDuplicate={duplicateListing} onRemoveSample={removeSampleListing} />
              ))}
            </div>
          )}
        </div>

        {/* ── Explore marketplace banner ── */}
        <div style={{ ...GC, padding: '1.5rem', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)', margin: '0 0 0.25rem' }}>Explore the marketplace</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--sage)', margin: 0 }}>Browse other properties for inspiration and see what creators are looking for.</p>
          </div>
          <button
            onClick={() => navigate('/explore')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.25rem', borderRadius: 9999,
              background: 'var(--ink)', color: 'var(--bone)',
              border: 'none', cursor: 'pointer', flexShrink: 0,
              fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font-body)',
              transition: 'opacity 150ms',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Browse listings →
          </button>
        </div>

        {/* ── Activity Feed ── */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--ink)', margin: 0 }}>Activity</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--sage)', marginTop: '0.15rem' }}>What needs your attention</p>
          </div>

          {displayActivity.length === 0 ? (
            <div style={{ ...GC, padding: '2rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--sage)', margin: 0 }}>All caught up — no new activity.</p>
            </div>
          ) : (
            <div style={{ ...GC, overflow: 'hidden' }}>
              {displayActivity.map((item, i) => (
                <div key={item.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1.25rem' }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '0.75rem', flexShrink: 0,
                      background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <item.Icon size={16} color={item.iconColor} strokeWidth={1.75} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--ink)', lineHeight: 1.35, marginBottom: '0.1rem' }}>
                        {item.text}
                      </p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--sage)' }}>{item.sub}</p>
                    </div>
                    <button
                      onClick={() => navigate(item.route)}
                      style={{
                        padding: '0.35rem 0.875rem', borderRadius: 9999,
                        background: 'rgba(25,37,36,0.06)', border: '1px solid rgba(25,37,36,0.1)',
                        color: 'var(--ink)', fontSize: '0.72rem', fontWeight: 600,
                        cursor: 'pointer', flexShrink: 0, fontFamily: 'var(--font-body)',
                        transition: 'background 140ms',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(25,37,36,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(25,37,36,0.06)'}
                    >
                      {item.cta}
                    </button>
                    <button
                      onClick={() => dismissActivity(item.id)}
                      aria-label="Dismiss"
                      style={{
                        width: 26, height: 26, borderRadius: '50%', border: 'none',
                        background: 'transparent', cursor: 'pointer', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--sage)', transition: 'background 140ms, color 140ms',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(25,37,36,0.07)'; e.currentTarget.style.color = 'var(--ink)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sage)'; }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                  {i < displayActivity.length - 1 && (
                    <div style={{ height: 1, background: 'rgba(25,37,36,0.07)', margin: '0 1.25rem' }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Impact Metrics ── */}
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--ink)', margin: 0 }}>Your Impact</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--sage)', marginTop: '0.15rem' }}>All time</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>

            {/* Total Collabs — cumulative line */}
            <div
              style={{ ...GC, padding: '1.25rem 1.5rem', cursor: 'pointer', transition: 'transform 200ms var(--ease-out-quart), box-shadow 200ms var(--ease-out-quart)' }}
              onClick={() => setExpandedChart('collabs')}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(25,37,36,0.13), inset 0 1px 0 rgba(255,255,255,0.7)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = GC.boxShadow; }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4A9B7F', marginBottom: '0.6rem' }} />
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--ink)', margin: '0 0 0.15rem', lineHeight: 1, letterSpacing: '-0.03em' }}>{fmtStat(hostStats.totalCollabs)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--sage)', fontFamily: 'var(--font-body)', marginBottom: '0.75rem' }}>Total Collabs</p>
              {chartsAnimated && <MiniLineChart data={hostChartData.collabs} color="#4A9B7F" delay={0} />}
            </div>

            {/* Creators Worked With — bar chart */}
            <div
              style={{ ...GC, padding: '1.25rem 1.5rem', cursor: 'pointer', transition: 'transform 200ms var(--ease-out-quart), box-shadow 200ms var(--ease-out-quart)' }}
              onClick={() => setExpandedChart('creators')}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(25,37,36,0.13), inset 0 1px 0 rgba(255,255,255,0.7)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = GC.boxShadow; }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3C5759', marginBottom: '0.6rem' }} />
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--ink)', margin: '0 0 0.15rem', lineHeight: 1, letterSpacing: '-0.03em' }}>{fmtStat(hostStats.uniqueCreators)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--sage)', fontFamily: 'var(--font-body)', marginBottom: '0.75rem' }}>Creators Worked With</p>
              {chartsAnimated && <MiniBarChart data={hostChartData.creators} color="#3C5759" delay={80} />}
            </div>

            {/* Content Pieces — sparkline */}
            <div
              style={{ ...GC, padding: '1.25rem 1.5rem', cursor: 'pointer', transition: 'transform 200ms var(--ease-out-quart), box-shadow 200ms var(--ease-out-quart)' }}
              onClick={() => setExpandedChart('content')}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(25,37,36,0.13), inset 0 1px 0 rgba(255,255,255,0.7)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = GC.boxShadow; }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7B68C8', marginBottom: '0.6rem' }} />
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--ink)', margin: '0 0 0.15rem', lineHeight: 1, letterSpacing: '-0.03em' }}>{fmtStat(hostStats.contentPieces)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--sage)', fontFamily: 'var(--font-body)', marginBottom: '0.75rem' }}>Content Pieces</p>
              {chartsAnimated && <MiniLineChart data={hostChartData.content} color="#7B68C8" delay={160} />}
            </div>

            {/* Est. Reach — blurred + tooltip */}
            <div style={{ ...GC, padding: '1.25rem 1.5rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D4A843', marginBottom: '0.6rem' }} />
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--ink)', margin: '0 0 0.15rem', lineHeight: 1, letterSpacing: '-0.03em' }}>{hostStats.estReach > 0 ? fmtStat(hostStats.estReach) : '—'}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--sage)', fontFamily: 'var(--font-body)', marginBottom: '0.75rem' }}>Est. Reach</p>
              {chartsAnimated && <BlurredReachChart data={hostChartData.reach} color="#D4A843" delay={240} />}
            </div>

          </div>
        </div>

      </div>
    </div>

    {expandedChart && (
      <ExpandedChartModal cardKey={expandedChart} onClose={() => setExpandedChart(null)} stats={hostStats} chartData={hostChartData} />
    )}
    </>
  );
}
