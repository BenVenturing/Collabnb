import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, Users, Calendar, MessageSquare, MoreVertical, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SAMPLE_LISTINGS } from '../lib/mockData';

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

// ─── Impact chart data (mock) ─────────────────────────────────────────────────
const CHART_DATA = {
  collabs:  [0, 1, 3, 5, 8, 11, 14],
  creators: [3, 4, 5, 6, 8, 5, 6],
  content:  [12, 18, 22, 30, 28, 38],
  reach:    [0.2, 0.4, 0.7, 1.1, 1.6, 2.0, 2.4],
};

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
  { id: 'a1', icon: '✦', bg: 'rgba(60,87,89,0.12)',   text: 'Priya Nair applied to Glacier Prime Cabin', sub: '2h ago',  cta: 'Review',  route: '/host/proposals' },
  { id: 'a2', icon: '💬', bg: 'rgba(123,104,200,0.1)', text: 'Jordan Ellis sent you a message',            sub: '5h ago',  cta: 'Reply',   route: '/inbox' },
  { id: 'a3', icon: '🏡', bg: 'rgba(74,155,127,0.12)', text: "Maya Chen's stay starts in 3 days",          sub: 'June 14', cta: 'Details', route: '/host/proposals' },
  { id: 'a4', icon: '✦', bg: 'rgba(60,87,89,0.12)',   text: 'Lena Park applied to Cliffside Villa',       sub: '1d ago',  cta: 'Review',  route: '/host/proposals' },
  { id: 'a5', icon: '✓', bg: 'rgba(212,168,67,0.12)', text: 'Sam Kowalski completed their collab',        sub: '2d ago',  cta: 'Rate',    route: '/host/proposals' },
];

// ─── Host Listing Card ────────────────────────────────────────────────────────
function HostListingCard({ listing, meta, delay, glowState, onToggleStatus, onDuplicate }) {
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
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
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
              { label: 'Edit',      action: (e) => { e.stopPropagation(); navigate('/host/listings/create'); setMenuOpen(false); } },
              { label: meta.status === 'paused' ? 'Unpause' : 'Pause', action: (e) => { e.stopPropagation(); if (meta.status !== 'draft') onToggleStatus(listing.id); setMenuOpen(false); }, muted: meta.status === 'draft' },
              { label: 'Duplicate', action: (e) => { e.stopPropagation(); onDuplicate(listing); setMenuOpen(false); } },
            ].map(({ label, action, muted }) => (
              <button
                key={label}
                onClick={action}
                style={{
                  display: 'block', width: '100%', padding: '0.625rem 1rem',
                  textAlign: 'left', background: 'none', border: 'none',
                  cursor: muted ? 'default' : 'pointer',
                  fontSize: '0.82rem', fontWeight: 500, color: muted ? 'var(--sage)' : 'var(--ink)',
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
  const [filter, setFilter] = useState('all');
  const [glowState, setGlowState] = useState('idle');
  const [dismissed, setDismissed] = useState(() => getDismissed());
  const [chartsAnimated, setChartsAnimated] = useState(false);
  const [listingStatuses, setListingStatuses] = useState(() => {
    const stored = getListingStatuses();
    const merged = {};
    Object.keys(HOST_META).forEach((id) => {
      merged[id] = { ...HOST_META[id], ...(stored[id] ? { status: stored[id].status } : {}) };
    });
    return merged;
  });
  const listingsSectionRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setChartsAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

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

  const hostListings = SAMPLE_LISTINGS.map((l) => {
    const meta = listingStatuses[l.id] || { status: 'draft', applicants: 0, confirmed: 0, completed: 0 };
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

          {filtered.length === 0 ? (
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
                <HostListingCard key={listing.id} listing={listing} meta={listing.meta} delay={i * 55} glowState={glowState} onToggleStatus={toggleListingStatus} onDuplicate={duplicateListing} />
              ))}
            </div>
          )}
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
                      fontSize: '0.9rem',
                    }}>
                      {item.icon}
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
            <div style={{ ...GC, padding: '1.25rem 1.5rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4A9B7F', marginBottom: '0.6rem' }} />
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--ink)', margin: '0 0 0.15rem', lineHeight: 1, letterSpacing: '-0.03em' }}>14</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--sage)', fontFamily: 'var(--font-body)', marginBottom: '0.75rem' }}>Total Collabs</p>
              {chartsAnimated && <MiniLineChart data={CHART_DATA.collabs} color="#4A9B7F" delay={0} />}
            </div>

            {/* Creators Worked With — bar chart */}
            <div style={{ ...GC, padding: '1.25rem 1.5rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3C5759', marginBottom: '0.6rem' }} />
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--ink)', margin: '0 0 0.15rem', lineHeight: 1, letterSpacing: '-0.03em' }}>31</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--sage)', fontFamily: 'var(--font-body)', marginBottom: '0.75rem' }}>Creators Worked With</p>
              {chartsAnimated && <MiniBarChart data={CHART_DATA.creators} color="#3C5759" delay={80} />}
            </div>

            {/* Content Pieces — sparkline */}
            <div style={{ ...GC, padding: '1.25rem 1.5rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7B68C8', marginBottom: '0.6rem' }} />
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--ink)', margin: '0 0 0.15rem', lineHeight: 1, letterSpacing: '-0.03em' }}>148</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--sage)', fontFamily: 'var(--font-body)', marginBottom: '0.75rem' }}>Content Pieces</p>
              {chartsAnimated && <MiniLineChart data={CHART_DATA.content} color="#7B68C8" delay={160} />}
            </div>

            {/* Est. Reach — blurred + tooltip */}
            <div style={{ ...GC, padding: '1.25rem 1.5rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D4A843', marginBottom: '0.6rem' }} />
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--ink)', margin: '0 0 0.15rem', lineHeight: 1, letterSpacing: '-0.03em' }}>2.4M</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--sage)', fontFamily: 'var(--font-body)', marginBottom: '0.75rem' }}>Est. Reach</p>
              {chartsAnimated && <BlurredReachChart data={CHART_DATA.reach} color="#D4A843" delay={240} />}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
