import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SAMPLE_HOST, IMG_FALLBACK } from '../lib/mockData';
import ProfilePopupCard from '../components/ProfilePopupCard';
import { formatDateRange } from '../lib/dateUtils';
import { useAppBar } from '../contexts/AppBarContext';
import { useCollabs } from '../contexts/CollabContext';
import { useAuth } from '../contexts/AuthContext';
import { useAccessGate, PendingApprovalScreen, LimitedAccessScreen, TrialBanner } from '../components/AccessGate';
import { WhereSearchContent, WhatSearchContent, WhenSearchContent, useAnimatedPlaceholder } from '../components/SearchDropdowns';
import SkeletonCard from '../components/SkeletonCard';
import PricingTool from '../components/PricingTool';
import { cache } from '../lib/cache';
import { buildCreatorContext, scoreListings, MATCH_BADGE_THRESHOLD, FOR_YOU_MIN_SCORE, NEAR_ME_MIN_LOCATION } from '../lib/matchScore';

const EXPLORE_CACHE_KEY = 'explore_listings_all';
const HIDDEN_SAMPLE_LISTINGS_KEY = '@collabnb_hidden_sample_listings_v1';

const PROP_FILTERS = ['All', 'Cabin', 'Villa', 'Treehouse', 'Glamping', 'Lodge', 'Estate', 'Cottage'];

// ─── Convex listing normalizer ────────────────────────────────────────────────
function normalizeConvexListing(l) {
  const images = l.gallery_images?.length ? l.gallery_images : (l.image ? [l.image] : []);

  let compensation = l.compensation || '';
  if (!compensation) {
    if (l.compensation_type === 'paid') compensation = `$${l.cash_amount || '?'} cash`;
    else if (l.compensation_type === 'hybrid') compensation = `$${l.cash_amount || '?'} + stay`;
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

  return {
    ...l,
    id: String(l._id),
    image: images[0] || '',
    gallery_images: images,
    compensation,
    deliverables,
    collab_type: l.collab_type || l.deliverable_load || 'Collab',
    about: l.about || l.collaboration_brief || '',
    dates_available: (l.date_ranges?.length
      ? l.date_ranges.map((r) => formatDateRange(r.startDate, r.endDate)).join(' · ')
      : l.dates_available || (l.collab_start && l.collab_end ? formatDateRange(l.collab_start, l.collab_end) : '')),
    due_days: l.due_days ?? l.turnaround_days,
    amenities: l.amenities || [],
    what_you_get: l.what_you_get || [],
    requirements: l.requirements || [],
    _isSample: l.is_sample === true,
  };
}

// ─── Listing Card ─────────────────────────────────────────────────────────────
function ListingCard({ listing, saved, onSave, delay, onNavigate, onHostClick, onHide }) {
  const { profile } = useAuth();
  const [rippling, setRippling] = useState(false);
  const isSample = listing._isSample === true;

  const handleSave = (e) => {
    e.stopPropagation();
    setRippling(true);
    setTimeout(() => setRippling(false), 650);
    onSave(listing.id);
  };

  return (
    <div
      className="listing-card reveal-up"
      onClick={onNavigate}
      style={{ width: 260, maxWidth: '100%', animationDelay: `${delay}ms`, opacity: 0, cursor: 'pointer' }}
    >
      {/* Photo */}
      <div style={{ position: 'relative', height: 176, overflow: 'hidden' }}>
        <img
          src={listing.image}
          alt={listing.title}
          loading="lazy"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMG_FALLBACK; }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: listing._redacted ? 'blur(20px) brightness(0.7)' : 'none' }}
        />

        {/* Redacted overlay — unapproved / limited creators */}
        {listing._redacted && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(37,36,32,0.20)', backdropFilter: 'blur(2px)', pointerEvents: 'none',
          }}>
            <div style={{ textAlign: 'center', color: '#fff', padding: '0 1rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 24, height: 24, margin: '0 auto 0.375rem', opacity: 0.7 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <p style={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.7, margin: 0, lineHeight: 1.3 }}>Apply to view</p>
            </div>
          </div>
        )}

        {/* SAMPLE LISTING watermark — demo listings only */}
        {isSample && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {[18, 50, 82].map((top, i) => (
              <div key={i} style={{
                position: 'absolute', top: `${top}%`, left: '50%',
                transform: 'translateX(-50%) rotate(-35deg)',
                fontFamily: 'var(--font-display)', fontWeight: 900,
                fontSize: '0.8rem', color: 'rgba(255,255,255,0.15)',
                letterSpacing: '0.3em', whiteSpace: 'nowrap', userSelect: 'none',
                textShadow: 'none',
              }}>
                SAMPLE LISTING
              </div>
            ))}
          </div>
        )}

        {/* Featured badge */}
        {listing.is_featured && (
          <span className="eyebrow-tag" style={{
            position: 'absolute', top: '0.75rem', left: '0.75rem',
            fontSize: '0.58rem', padding: '0.25rem 0.55rem',
          }}>
            Featured
          </span>
        )}

        {/* Match badge — strong matches only */}
        {typeof listing._match === 'number' && listing._match >= MATCH_BADGE_THRESHOLD && (
          <span
            title={listing._matchReasons?.join(' · ') || 'Matched to your profile'}
            style={{
              position: 'absolute', bottom: '0.6rem', left: '0.75rem',
              padding: '0.25rem 0.55rem', borderRadius: '9999px',
              fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.02em',
              color: 'var(--ink)', background: 'rgba(209,235,219,0.92)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(25,37,36,0.12)',
            }}
          >
            {listing._match}% match
          </span>
        )}

        {/* Trash — dismiss sample listing (top-right), only on samples */}
        {isSample && onHide && (
          <button
            onClick={(e) => { e.stopPropagation(); onHide(listing.id); }}
            title="Hide this sample listing"
            style={{
              position: 'absolute', top: '0.75rem', right: '0.75rem',
              width: '2rem', height: '2rem', borderRadius: '50%',
              background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer',
              transition: 'transform 200ms var(--ease-out-quart), color 150ms',
              boxShadow: '0 2px 8px rgba(25,37,36,0.1)', color: '#959D90',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.color = '#dc2626'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = '#959D90'; }}
          >
            <Trash2 size={13} />
          </button>
        )}

        {/* Save heart */}
        <button
          onClick={handleSave}
          style={{
            position: 'absolute', top: '0.75rem', right: isSample ? '3rem' : '0.75rem',
            width: '2rem', height: '2rem', borderRadius: '50%',
            background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer', overflow: 'hidden',
            transition: 'transform 200ms var(--ease-out-quart)',
            boxShadow: '0 2px 8px rgba(25,37,36,0.1)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {rippling && (
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(25,37,36,0.15)',
              animation: 'ripple-heart 650ms var(--ease-out-expo) forwards',
              pointerEvents: 'none',
            }} />
          )}
          <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, position: 'relative', zIndex: 1,
            transition: 'fill 250ms ease',
          }}
            fill={saved ? '#192524' : 'none'}
            stroke="#192524" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

      {/* Info */}
      <div style={{ padding: '0.875rem 1rem 1rem' }}>
        <div style={{ marginBottom: '0.2rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)', lineHeight: 1.25, filter: listing._redacted ? 'blur(6px)' : 'none', userSelect: listing._redacted ? 'none' : 'auto' }}>
            {listing.title}
          </p>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--sage)', marginBottom: '0.6rem', filter: listing._redacted ? 'blur(5px)' : 'none', userSelect: listing._redacted ? 'none' : 'auto' }}>{listing.location}</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>{listing.compensation}</p>
            <p style={{ fontSize: '0.67rem', color: 'var(--sage)', marginTop: '0.15rem' }}>{listing.deliverables}</p>
            {listing.dates_available && (
              <p style={{ fontSize: '0.67rem', color: 'var(--sage)', marginTop: '0.15rem' }}>{listing.dates_available}</p>
            )}
          </div>
          <span className="chip" style={{ fontSize: '0.62rem', padding: '0.2rem 0.5rem', flexShrink: 0 }}>
            {listing.collab_type}
          </span>
        </div>

        {/* Host byline */}
        {onHostClick && (
          <div
            onClick={e => { e.stopPropagation(); onHostClick(); }}
            title="View host profile"
            style={{
              marginTop: '0.625rem', paddingTop: '0.5rem',
              borderTop: '1px solid rgba(25,37,36,0.06)',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              cursor: 'pointer', transition: 'opacity 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.65'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <div style={{ width: 18, height: 18, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(25,37,36,0.07)', background: 'var(--mint)' }}>
              <img src={listing.host_avatar || profile?.avatar_url || SAMPLE_HOST.avatar_fallback} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <span style={{ fontSize: '0.67rem', color: 'var(--sage)' }}>
              by <span style={{ fontWeight: 600, color: 'var(--slate)' }}>{listing.host_name || SAMPLE_HOST.name}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Ghost listing card (shown when no live listings yet) ────────────────────
function GhostListingCard() {
  return (
    <div
      style={{
        width: 260, maxWidth: '100%', borderRadius: '1rem', overflow: 'hidden',
        background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(25,37,36,0.06)',
        filter: 'blur(1.5px)', opacity: 0.5, pointerEvents: 'none', flexShrink: 0,
      }}
    >
      <div style={{ height: 176, background: 'linear-gradient(135deg, #E2E6E4 0%, #C8CEC9 100%)' }} />
      <div style={{ padding: '0.875rem 1rem 1rem' }}>
        <div style={{ height: '11px', background: '#D0D5CE', borderRadius: '6px', marginBottom: '0.4rem', width: '72%' }} />
        <div style={{ height: '9px', background: '#DDE1DF', borderRadius: '6px', marginBottom: '0.75rem', width: '44%' }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ height: '10px', background: '#D0D5CE', borderRadius: '6px', marginBottom: '0.25rem', width: '90px' }} />
            <div style={{ height: '8px', background: '#DDE1DF', borderRadius: '6px', width: '60px' }} />
          </div>
          <div style={{ height: '20px', background: '#D0D5CE', borderRadius: '9999px', width: '56px' }} />
        </div>
      </div>
    </div>
  );
}

// ─── Ghost section (full-width overlay with coming soon message) ───────────────
function GhostSection() {
  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={{ padding: '0 1.5rem', marginBottom: '1rem' }}>
        <div style={{ height: '18px', background: '#D0D5CE', borderRadius: '8px', width: '160px', marginBottom: '0.4rem' }} />
        <div style={{ height: '11px', background: '#E2E6E4', borderRadius: '6px', width: '240px' }} />
      </div>
      <div
        className="snap-row no-scrollbar"
        style={{ padding: '0 1.5rem 0.5rem', position: 'relative' }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <GhostListingCard key={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Section Row ──────────────────────────────────────────────────────────────
function SectionRow({ title, subtitle, listings, saved, onSave, onNavigate, expanded, onToggleExpand, hidden, onHostClick, onHide }) {
  if (!listings.length || hidden) return null;
  return (
    <div style={{ marginBottom: expanded ? '3rem' : '2.5rem' }}>
      <div style={{ padding: '0 1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--ink)', margin: 0 }}>
            {title}
          </h2>
          <button
            onClick={onToggleExpand}
            style={{
              fontSize: '0.68rem', fontWeight: 500, color: 'var(--sage)',
              background: 'none', border: 'none', cursor: 'pointer',
              textDecoration: 'underline', textDecorationColor: 'rgba(60,87,89,0.25)',
              fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', padding: 0,
            }}
          >
            {expanded ? 'show less' : 'see all'}
          </button>
        </div>
        {subtitle && <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: '0.1rem 0 0' }}>{subtitle}</p>}
      </div>
      {expanded ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1rem',
          padding: '0 1.5rem 0.5rem',
          justifyItems: 'center',
        }}>
          {listings.map((l, i) => (
            <ListingCard
              key={l.id}
              listing={l}
              saved={saved.has(l.id)}
              onSave={onSave}
              delay={i * 55}
              onNavigate={() => onNavigate(l.id)}
              onHostClick={onHostClick}
              onHide={onHide}
            />
          ))}
        </div>
      ) : (
        <div className="snap-row no-scrollbar" style={{ padding: '0 1.5rem 0.5rem' }}>
          {listings.map((l, i) => (
            <ListingCard
              key={l.id}
              listing={l}
              saved={saved.has(l.id)}
              onSave={onSave}
              delay={i * 55}
              onNavigate={() => onNavigate(l.id)}
              onHostClick={onHostClick}
              onHide={onHide}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Search dropdown wrapper ──────────────────────────────────────────────────
function Dropdown({ children, align = 'left', width }) {
  return (
    <div
      className="glass-card"
      style={{
        position: 'absolute',
        top: 'calc(100% + 0.625rem)',
        [align === 'right' ? 'right' : 'left']: align === 'center' ? '50%' : 0,
        transform: align === 'center' ? 'translateX(-50%)' : undefined,
        width: width || '100%',
        zIndex: 30,
        padding: '1rem',
        animation: 'fadeUp 180ms var(--ease-out-expo) forwards',
        background: 'rgb(248,246,243)',
        backdropFilter: 'blur(32px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.5)',
      }}
    >
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Explore() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { compactSearch, setCompactSearch } = useAppBar();
  const [activeField, setActiveField] = useState(null); // 'where' | 'what' | 'when'
  const [whereVal,    setWhereVal]    = useState('');
  const [whatVal,     setWhatVal]     = useState('');
  const [whatQuery,   setWhatQuery]   = useState('');
  const [whenVal,     setWhenVal]     = useState('');
  const [propFilter,  setPropFilter]  = useState('All');
  const [expandedSection, setExpandedSection] = useState(null); // null | section title
  const { savedIds, toggleSave } = useCollabs();
  const [popupHost, setPopupHost] = useState(null);
  const [pricingToolOpen, setPricingToolOpen] = useState(false);
  const searchRef = useRef(null);

  const hostAvatar = profile?.avatar_url || SAMPLE_HOST.avatar_fallback;
  const sampleHostPerson = {
    name:         SAMPLE_HOST.name,
    username:     SAMPLE_HOST.username,
    avatar:       hostAvatar,
    location:     'Asheville, NC',
    bio:          SAMPLE_HOST.bio,
    tier:         null,
    followers:    null,
    engagement:   null,
    collab_count: SAMPLE_HOST.review_count,
    platforms:    [],
    niches:       [],
    isFounder:    true,
    past_collab:  false,
    portfolioUrl: null,
    travelCalendar: [],
  };
  const whereRef = useRef(null);
  const whatRef = useRef(null);
  const whenRef = useRef(null);
  const whatPlaceholder = useAnimatedPlaceholder();

  // Debounced search values (300ms)
  const [debouncedWhere, setDebouncedWhere] = useState('');
  const [debouncedWhat,  setDebouncedWhat]  = useState('');

  // When whatVal changes (from clicking filter chips), sync to search input
  useEffect(() => {
    if (whatVal) setWhatQuery(whatVal);
  }, [whatVal]);

  // Sliding mint pill position
  const [pillPos, setPillPos] = useState({ left: 0, width: 0 });
  useEffect(() => {
    if (!activeField) return;
    const refs = { where: whereRef, what: whatRef, when: whenRef };
    const el = refs[activeField]?.current;
    const bar = searchRef.current?.querySelector('.search-bar');
    if (el && bar) {
      const barRect = bar.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setPillPos({ left: elRect.left - barRect.left, width: elRect.width });
    }
  }, [activeField]);

  const goToListing = (id) => navigate(`/listing/${id}`);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedWhere(whereVal), 300);
    return () => clearTimeout(t);
  }, [whereVal]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedWhat(whatQuery), 300);
    return () => clearTimeout(t);
  }, [whatQuery]);

  // Outside-click closes dropdowns
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setActiveField(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sync compact search with scroll threshold
  useEffect(() => {
    const onScroll = () => setCompactSearch(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); setCompactSearch(false); };
  }, [setCompactSearch]);

  // ── Data source: real Convex listings + global sample listings ───────────────
  const convexRaw  = useQuery(api.listings.getAll, profile?._id ? { viewerId: String(profile._id) } : {}) ?? null;       // real (excludes is_sample)
  const samplesRaw = useQuery(api.listings.getSamples) ?? null;   // global sample listings
  const myCollabs  = useQuery(
    api.collaborations.getByCreator,
    profile?._id ? { creatorId: String(profile._id) } : 'skip'
  ) ?? [];

  // Per-device hidden sample listing ids
  const [hiddenSampleIds, setHiddenSampleIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HIDDEN_SAMPLE_LISTINGS_KEY) || '[]'); }
    catch { return []; }
  });
  const hideListing = (id) => {
    setHiddenSampleIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try { localStorage.setItem(HIDDEN_SAMPLE_LISTINGS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const convexActive = convexRaw
    ? convexRaw
        .filter((l) => l.status === 'published' || l.status === 'active')
        .map(normalizeConvexListing)
    : null; // null = still loading

  // Sample listings come from Convex only (no bundled mock fallback).
  // Filter out any the user has dismissed on this device.
  const sampleActive = (samplesRaw || [])
    .map((l) => ({ ...normalizeConvexListing(l), _isSample: true }))
    .filter((l) => !hiddenSampleIds.includes(l.id));

  // Client-side cache: seed display instantly on repeat visits, update when fresh data arrives
  const cachedListings = cache.get(EXPLORE_CACHE_KEY);
  useEffect(() => {
    if (convexActive?.length) {
      cache.set(EXPLORE_CACHE_KEY, convexActive, 5);
    }
  }, [convexRaw]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real listings (live or cached)
  const realActive = convexActive?.length
    ? convexActive
    : (cachedListings?.length ? cachedListings : []);

  // convexLoaded: true once Convex responds (even with 0 results)
  const convexLoaded = convexActive !== null;
  // showGhost: nothing real and no samples to show
  const showGhost = convexLoaded && realActive.length === 0 && sampleActive.length === 0;

  // Everyone sees the sample listings alongside any real listings
  const allListings = [...realActive, ...sampleActive];
  const isLoading = convexRaw === null && samplesRaw === null && !cachedListings;

  function toISODate(v) {
    if (!v) return '';
    if (typeof v === 'string') return v.slice(0, 10);
    if (typeof v === 'number') return new Date(v).toISOString().slice(0, 10);
    return '';
  }

  function applySearch(arr) {
    return arr.filter((l) => {
      if (debouncedWhere) {
        const q = debouncedWhere.toLowerCase();
        const haystack = [l.location, l.location_city, l.location_country]
          .filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (debouncedWhat) {
        const q = debouncedWhat.toLowerCase();
        const haystack = [l.title, l.about, l.collab_type, l.deliverables, ...(l.vibe_tags || [])]
          .filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (whenVal && !whenVal.startsWith('Flexible:')) {
        const parts = whenVal.split(' → ');
        const fStart = parts[0].trim();
        const fEnd = (parts[1] || parts[0]).trim();
        const ranges = l.date_ranges?.length
          ? l.date_ranges.map((r) => [toISODate(r.startDate), toISODate(r.endDate)])
          : [[toISODate(l.collab_start), toISODate(l.collab_end)]];
        const overlaps = ranges.some(([lStart, lEnd]) =>
          lStart && lEnd && lStart <= fEnd && lEnd >= fStart
        );
        if (!overlaps) return false;
      }
      return true;
    });
  }

  const byPropType = (arr) =>
    propFilter === 'All' ? arr : arr.filter((l) => l.property_type === propFilter);

  const searchFiltered = isLoading ? [] : applySearch(allListings);

  const nearLocationLabel = (whereVal || debouncedWhere || profile?.city || '').split(',')[0].trim() || 'You';

  // Human-friendly WHEN display ("Aug 11–20" instead of "2026-08-11 → 2026-08-20")
  const whenDisplay = whenVal
    ? whenVal.startsWith('Flexible:')
      ? whenVal.replace('Flexible: ', '')
      : formatDateRange(...whenVal.split(' → '))
    : '';

  // ── Personalized ranking — see /explore-algorithm.md ─────────────────────────
  const creatorCtx = buildCreatorContext({
    profile,
    collaborations: myCollabs,
    savedListings: allListings.filter((l) => savedIds.has(l.id)),
    allListings,
  });
  const scored = scoreListings(searchFiltered, creatorCtx);

  // ── Access gate: show pending/limited screens for creators ─────────────
  const access = useAccessGate();
  if (!access.loading) {
    if (!access.canAccess && access.role === 'creator' && !access.isAdmin) {
      if (access.state === 'pending') return <PendingApprovalScreen />;
      if (access.state === 'limited') return <LimitedAccessScreen />;
    }
  }

  const trending    = byPropType(scored.filter((l) => l.is_featured));
  const forYou      = byPropType(
    scored
      .filter((l) => l._match >= FOR_YOU_MIN_SCORE)
      .sort((a, b) => b._match - a._match || (b.rating ?? 0) - (a.rating ?? 0))
  );
  const nearMe      = byPropType(
    scored
      .filter((l) => l._matchParts.location >= NEAR_ME_MIN_LOCATION)
      .sort((a, b) => b._matchParts.location - a._matchParts.location || b._match - a._match)
  );
  const allFiltered = byPropType(scored);

  const forYouSubtitle = profile?.niches?.length
    ? `Matched to your ${profile.niches.slice(0, 2).join(' & ')} niches`
    : 'Matched to your profile and collab history';

  return (
    <div>

      {/* ── Trial countdown banner ─────────── */}
      {!access.loading && access.state === 'trial' && access.daysLeft !== null && (
        <TrialBanner daysLeft={access.daysLeft} />
      )}

      {/* ── Search header — hidden instantly once nav goes compact ─────────── */}
      <div style={{
        display: compactSearch ? 'none' : undefined,
        position: 'relative',
        zIndex: 100,
        background: 'transparent',
        padding: '1rem 1.5rem 0',
      }}>

        {/* Page glaze while a search dropdown is open */}
        {activeField && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1,
            background: 'rgba(25,37,36,0.10)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            animation: 'fadeIn 200ms ease forwards',
          }} />
        )}

        {/* Search bar */}
        <div ref={searchRef} style={{ maxWidth: '680px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div className="search-bar" style={{ position: 'relative' }}>

            {/* Sliding mint-green pill overlay */}
            {activeField && (
              <div style={{
                position: 'absolute', top: '4px', left: pillPos.left, width: pillPos.width,
                height: 'calc(100% - 8px)',
                background: 'rgba(209,235,219,0.7)',
                borderRadius: '9999px',
                transition: 'left 280ms cubic-bezier(0.16,1,0.3,1), width 280ms cubic-bezier(0.16,1,0.3,1)',
                pointerEvents: 'none', zIndex: 0,
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.6), 0 2px 8px rgba(74,155,127,0.12)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
              }} />
            )}

            {/* Where — typeable input with live suggestions */}
            <div
              ref={whereRef}
              className="search-field"
              style={{
                flex: whereVal ? undefined : 1,
                cursor: 'text', position: 'relative', zIndex: 1,
              }}
              onClick={() => { if (activeField !== 'where') setActiveField('where'); }}
            >
              <label>Where</label>
              <input
                type="text"
                value={whereVal}
                onChange={(e) => { setWhereVal(e.target.value); if (activeField !== 'where') setActiveField('where'); }}
                onFocus={() => setActiveField('where')}
                placeholder="Search destinations"
                className="search-value"
                style={{
                  border: 'none', outline: 'none', background: 'transparent',
                  width: '100%', fontFamily: 'var(--font-body)',
                  color: whereVal ? 'var(--ink)' : 'var(--sage)',
                  fontSize: '0.82rem', fontWeight: whereVal ? 600 : 400,
                  padding: 0, minWidth: 0,
                }}
              />
            </div>

            {/* What — typeable with animated placeholder */}
            <div
              ref={whatRef}
              className="search-field"
              style={{ cursor: 'text', position: 'relative', zIndex: 1 }}
              onClick={() => { if (activeField !== 'what') setActiveField('what'); }}
            >
              <label>What</label>
              <input
                type="text"
                value={whatQuery}
                onChange={(e) => { setWhatQuery(e.target.value); if (activeField !== 'what') setActiveField('what'); }}
                onFocus={() => setActiveField('what')}
                placeholder={whatPlaceholder}
                style={{
                  border: 'none', outline: 'none', background: 'transparent',
                  width: '100%', fontFamily: 'var(--font-body)',
                  color: whatVal ? 'var(--ink)' : 'var(--sage)',
                  fontSize: '0.82rem', fontWeight: whatVal ? 600 : 400,
                  padding: 0, minWidth: 0,
                }}
              />
            </div>

            {/* When */}
            <div
              ref={whenRef}
              className="search-field"
              style={{ flex: '0.75', position: 'relative', zIndex: 1 }}
              onClick={() => setActiveField(activeField === 'when' ? null : 'when')}
            >
              <label>When</label>
              <span className="search-value" style={{ color: whenVal ? 'var(--ink)' : undefined, fontWeight: whenVal ? 600 : undefined }}>
                {whenDisplay || 'Any time'}
              </span>
            </div>

            {/* Search button */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '0.375rem', flexShrink: 0 }}>
              <button
                className="btn-primary"
                style={{ padding: '0', width: '2.5rem', height: '2.5rem', borderRadius: '9999px' }}
                onClick={() => setActiveField(null)}
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" style={{ width: 15, height: 15 }}>
                  <circle cx="8.5" cy="8.5" r="5.25"/>
                  <line x1="13.25" y1="13.25" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {activeField === 'where' && (
            <Dropdown width="380px">
              <WhereSearchContent
                whereVal={whereVal}
                setWhereVal={setWhereVal}
                onClose={() => setActiveField(null)}
                listings={allListings}
              />
            </Dropdown>
          )}

          {/* ── What dropdown (collab type + deliverables) ─────────────────────── */}
          {activeField === 'what' && (
            <Dropdown>
              <WhatSearchContent
                whatVal={whatVal}
                setWhatVal={setWhatVal}
                onClose={() => setActiveField(null)}
                typeQuery={whatQuery}
              />
            </Dropdown>
          )}

          {/* ── When dropdown (date range picker) ──────────────────────────────── */}
          {activeField === 'when' && (
            <Dropdown align="right" width="460px">
              <WhenSearchContent
                whenVal={whenVal}
                setWhenVal={setWhenVal}
                onClose={() => setActiveField(null)}
              />
            </Dropdown>
          )}
        </div>

        {/* ── Property type chips ──────────────────────────────────────────── */}
        <div style={{ maxWidth: '680px', margin: '0.75rem auto 0', overflow: 'hidden' }}>
          <div
            className="no-scrollbar"
            style={{
              display: 'flex', gap: '0.5rem', overflowX: 'auto',
              paddingBottom: '0.875rem', justifyContent: 'center',
            }}
          >
            {PROP_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setPropFilter(f)}
                className={`chip ${propFilter === f ? 'active' : ''}`}
                style={{ flexShrink: 0 }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Listing rows ─────────────────────────────────────────────────────── */}
      <div style={{ paddingTop: '2.25rem', paddingBottom: '4rem' }}>

        {isLoading ? (
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ padding: '0 1.5rem', marginBottom: '1rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '0.1rem' }}>
                Loading stays...
              </h2>
            </div>
            <div className="snap-row no-scrollbar" style={{ padding: '0 1.5rem 0.5rem' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        ) : showGhost ? (
          <div style={{ position: 'relative' }}>
            <GhostSection />
            <GhostSection />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(to bottom, rgba(239,236,233,0) 0%, rgba(239,236,233,0.7) 40%, rgba(239,236,233,0.85) 100%)',
              padding: '2rem',
              pointerEvents: 'none',
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.8)',
                borderRadius: '1.25rem', padding: '1.5rem 2rem',
                textAlign: 'center', maxWidth: '340px',
                boxShadow: '0 8px 32px rgba(25,37,36,0.1)',
                pointerEvents: 'auto',
              }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)', margin: '0 0 0.4rem' }}>
                  Listings coming soon
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--sage)', lineHeight: 1.5, margin: 0 }}>
                  We're curating the best stays for launch on July 15th. Save your favorites and you'll be notified first.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <SectionRow
              title="Trending Now"
              subtitle="Top picks this week"
              listings={trending}
              saved={savedIds}
              onSave={toggleSave}
              onNavigate={goToListing}
              expanded={expandedSection === 'Trending Now'}
              onToggleExpand={() => setExpandedSection(expandedSection === 'Trending Now' ? null : 'Trending Now')}
              hidden={expandedSection !== null && expandedSection !== 'Trending Now'}
              onHostClick={() => setPopupHost(sampleHostPerson)}
              onHide={hideListing}
            />

            <SectionRow
              title="Picked for You"
              subtitle={forYouSubtitle}
              listings={forYou}
              saved={savedIds}
              onSave={toggleSave}
              onNavigate={goToListing}
              expanded={expandedSection === 'Picked for You'}
              onToggleExpand={() => setExpandedSection(expandedSection === 'Picked for You' ? null : 'Picked for You')}
              hidden={expandedSection !== null && expandedSection !== 'Picked for You'}
              onHostClick={() => setPopupHost(sampleHostPerson)}
              onHide={hideListing}
            />

            <SectionRow
              title={`Near ${nearLocationLabel}`}
              subtitle="Based on your profile location and past collabs"
              listings={nearMe}
              saved={savedIds}
              onSave={toggleSave}
              onNavigate={goToListing}
              expanded={expandedSection === 'Near'}
              onToggleExpand={() => setExpandedSection(expandedSection === 'Near' ? null : 'Near')}
              hidden={expandedSection !== null && expandedSection !== 'Near'}
              onHostClick={() => setPopupHost(sampleHostPerson)}
              onHide={hideListing}
            />

            <SectionRow
              title="All Stays"
              subtitle={`${allFiltered.length} collabs available now`}
              listings={allFiltered}
              saved={savedIds}
              onSave={toggleSave}
              onNavigate={goToListing}
              expanded={expandedSection === 'All Stays'}
              onToggleExpand={() => setExpandedSection(expandedSection === 'All Stays' ? null : 'All Stays')}
              hidden={expandedSection !== null && expandedSection !== 'All Stays'}
              onHostClick={() => setPopupHost(sampleHostPerson)}
              onHide={hideListing}
            />

            {allFiltered.length === 0 && (
              <div style={{ textAlign: 'center', paddingTop: '3rem', paddingBottom: '3rem' }}>
                <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✦</p>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
                  {(debouncedWhere || debouncedWhat || whenVal) ? 'No listings match your search' : 'No stays found'}
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--sage)', marginBottom: '1.5rem' }}>
                  {(debouncedWhere || debouncedWhat || whenVal)
                    ? 'Try adjusting your filters or clearing the search.'
                    : 'Try removing the property type filter.'}
                </p>
                {(debouncedWhere || debouncedWhat || whenVal) ? (
                  <button className="btn-glass" onClick={() => { setWhereVal(''); setWhatVal(''); setWhatQuery(''); setWhenVal(''); }} style={{ fontSize: '0.875rem' }}>
                    Clear search
                  </button>
                ) : (
                  <button className="btn-glass" onClick={() => setPropFilter('All')} style={{ fontSize: '0.875rem' }}>
                    Show all types
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {popupHost && (
        <ProfilePopupCard
          person={popupHost}
          onClose={() => setPopupHost(null)}
          onMessage={() => { setPopupHost(null); navigate('/inbox'); }}
        />
      )}

      {/* ── Pricing sandbox — floating entry point (FAQ-bubble pattern) ─────── */}
      <button
        onClick={() => setPricingToolOpen(true)}
        aria-label="What does a collab cost?"
        title="What does a collab cost?"
        style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 200,
          width: 48, height: 48, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.75)',
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(25,37,36,0.04), 0 4px 20px rgba(25,37,36,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'transform 200ms cubic-bezier(0.16,1,0.3,1)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <span style={{ fontFamily: 'var(--font-blog-display)', fontWeight: 600, fontSize: '1.3rem', color: 'var(--ink)' }}>$</span>
      </button>

      {pricingToolOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setPricingToolOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(25,37,36,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
        >
          <div style={{ width: '100%', maxWidth: 560, maxHeight: '88dvh', overflowY: 'auto', position: 'relative' }}>
            <button
              onClick={() => setPricingToolOpen(false)}
              aria-label="Close"
              style={{
                position: 'absolute', top: 14, right: 14, zIndex: 1,
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: 'rgba(25,37,36,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--slate)" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <PricingTool mode="sandbox" />
          </div>
        </div>
      )}
    </div>
  );
}
