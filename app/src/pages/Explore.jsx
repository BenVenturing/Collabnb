import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SAMPLE_LISTINGS, SAMPLE_HOST, IMG_FALLBACK } from '../lib/mockData';
import ProfilePopupCard from '../components/ProfilePopupCard';
import { formatDateRange } from '../lib/dateUtils';
import { useAppBar } from '../contexts/AppBarContext';
import { useCollabs } from '../contexts/CollabContext';
import { WhereSearchContent, WhatSearchContent, WhenSearchContent, useAnimatedPlaceholder } from '../components/SearchDropdowns';
import SkeletonCard from '../components/SkeletonCard';
import { cache } from '../lib/cache';

const EXPLORE_CACHE_KEY = 'explore_listings_all';

const PROP_FILTERS = ['All', 'Cabin', 'Villa', 'Treehouse', 'Glamping', 'Lodge', 'Estate', 'Cottage'];

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

  return {
    ...l,
    id: String(l._id),
    image: images[0] || '',
    gallery_images: images,
    compensation,
    deliverables,
    collab_type: l.collab_type || l.deliverable_load || 'Collab',
    about: l.about || l.collaboration_brief || '',
    dates_available: l.dates_available || (l.collab_start && l.collab_end ? formatDateRange(l.collab_start, l.collab_end) : ''),
    due_days: l.due_days ?? l.turnaround_days,
    amenities: l.amenities || [],
    what_you_get: l.what_you_get || [],
    requirements: l.requirements || [],
    _isSample: l.is_sample === true,
  };
}

// ─── Listing Card ─────────────────────────────────────────────────────────────
function ListingCard({ listing, saved, onSave, delay, onNavigate, onHostClick }) {
  const [rippling, setRippling] = useState(false);

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
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />

        {/* SAMPLE watermark — demo listings only */}
        {listing._isSample !== false && (
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

        {/* Featured badge */}
        {listing.is_featured && (
          <span className="eyebrow-tag" style={{
            position: 'absolute', top: '0.75rem', left: '0.75rem',
            fontSize: '0.58rem', padding: '0.25rem 0.55rem',
          }}>
            Featured
          </span>
        )}

        {/* Save heart */}
        <button
          onClick={handleSave}
          style={{
            position: 'absolute', top: '0.75rem', right: '0.75rem',
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
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)', lineHeight: 1.25 }}>
            {listing.title}
          </p>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--sage)', marginBottom: '0.6rem' }}>{listing.location}</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>{listing.compensation}</p>
            <p style={{ fontSize: '0.67rem', color: 'var(--sage)', marginTop: '0.15rem' }}>{listing.deliverables}</p>
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
              <img src={SAMPLE_HOST.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
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
function SectionRow({ title, subtitle, listings, saved, onSave, onNavigate, expanded, onToggleExpand, hidden, onHostClick }) {
  if (!listings.length || hidden) return null;
  return (
    <div style={{ marginBottom: expanded ? '3rem' : '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 1.5rem', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '0.1rem' }}>
            {title}
          </h2>
          {subtitle && <p style={{ fontSize: '0.75rem', color: 'var(--sage)' }}>{subtitle}</p>}
        </div>
        <button
          onClick={onToggleExpand}
          style={{
            fontSize: '0.78rem', fontWeight: 500, color: 'var(--slate)',
            background: 'none', border: 'none', cursor: 'pointer',
            textDecoration: 'underline', textDecorationColor: 'rgba(60,87,89,0.3)',
            fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
          }}
        >
          {expanded ? 'Show less' : 'See all'}
        </button>
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
      }}
    >
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Explore() {
  const navigate = useNavigate();
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
  const searchRef = useRef(null);

  const sampleHostPerson = {
    name:         SAMPLE_HOST.name,
    username:     SAMPLE_HOST.username,
    avatar:       SAMPLE_HOST.avatar_url,
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
    const onScroll = () => setCompactSearch(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); setCompactSearch(false); };
  }, [setCompactSearch]);

  // ── Data source: Convex (active/published) with sample fallback ──────────────
  const convexRaw = useQuery(api.listings.getAll) ?? null;

  const convexActive = convexRaw
    ? convexRaw
        .filter((l) => l.status === 'published' || l.status === 'active')
        .map(normalizeConvexListing)
    : null; // null = still loading

  // Sample listings: respect the host's localStorage pause toggles
  const listingStatuses = (() => {
    try { return JSON.parse(localStorage.getItem('@collabnb_host_listings_local_v1') || '{}'); }
    catch { return {}; }
  })();
  const sampleActive = SAMPLE_LISTINGS
    .filter((l) => listingStatuses[l.id]?.status !== 'paused')
    .map((l) => ({ ...l, _isSample: true }));

  // Client-side cache: seed display instantly on repeat visits, update when fresh data arrives
  const cachedListings = cache.get(EXPLORE_CACHE_KEY);
  useEffect(() => {
    if (convexActive?.length) {
      cache.set(EXPLORE_CACHE_KEY, convexActive, 5);
    }
  }, [convexRaw]); // eslint-disable-line react-hooks/exhaustive-deps

  // convexLoaded: true once Convex responds (even with 0 results)
  const convexLoaded = convexActive !== null;
  // showGhost: Convex loaded but no live listings exist yet — show ghost preview
  const showGhost = convexLoaded && convexActive.length === 0 && !cachedListings?.length;

  const allListings = convexActive?.length
    ? convexActive
    : (cachedListings?.length ? cachedListings : sampleActive);
  const isLoading = convexRaw === null && !cachedListings;

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
        const lStart = toISODate(l.collab_start);
        const lEnd   = toISODate(l.collab_end);
        if (!lStart || !lEnd) return false;
        if (lStart > fEnd || lEnd < fStart) return false;
      }
      return true;
    });
  }

  const byPropType = (arr) =>
    propFilter === 'All' ? arr : arr.filter((l) => l.property_type === propFilter);

  const searchFiltered = isLoading ? [] : applySearch(allListings);

  const trending    = byPropType(searchFiltered.filter((l) => l.is_featured));
  const forYou      = byPropType(searchFiltered.filter((l) => ['Photography', 'UGC Video', 'Instagram Reels'].includes(l.collab_type)));
  const nearMe      = byPropType(searchFiltered.filter((l) => ['NC', 'TN', 'SC', 'VA', 'GA'].some((s) => l.location?.includes(s))));
  const allFiltered = byPropType(searchFiltered);

  return (
    <div>

      {/* ── Search header — hidden instantly once nav goes compact ─────────── */}
      <div style={{
        display: compactSearch ? 'none' : undefined,
        position: 'relative',
        zIndex: 100,
        background: 'rgba(239,236,233,0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(25,37,36,0.07)',
        padding: '1rem 1.5rem 0',
      }}>

        {/* Search bar */}
        <div ref={searchRef} style={{ maxWidth: '680px', margin: '0 auto', position: 'relative' }}>
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
              <span className="search-value" style={{ color: whenVal ? 'var(--ink)' : undefined }}>
                {whenVal || 'Any time'}
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

        {/* Active search result summary */}
        {(whereVal || whatVal || whenVal || propFilter !== 'All') && (
          <div style={{ padding: '0 1.5rem 1.5rem', maxWidth: '680px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--sage)' }}>Showing results for</span>
              {whereVal && <span className="eyebrow-tag">{whereVal}</span>}
              {whatVal  && <span className="eyebrow-tag">{whatVal}</span>}
              {whenVal  && <span className="eyebrow-tag">{whenVal}</span>}
              {propFilter !== 'All' && <span className="eyebrow-tag">{propFilter}</span>}
              <button
                onClick={() => { setWhereVal(''); setWhatVal(''); setWhatQuery(''); setWhenVal(''); setPropFilter('All'); }}
                style={{
                  fontSize: '0.72rem', color: 'var(--slate)', background: 'none',
                  border: 'none', cursor: 'pointer', textDecoration: 'underline',
                  textDecorationColor: 'rgba(60,87,89,0.4)', fontFamily: 'var(--font-body)',
                }}
              >
                Clear
              </button>
            </div>
          </div>
        )}

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
                  We're curating the best stays for launch on July 1st. Save your favorites and you'll be notified first.
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
            />

            <SectionRow
              title="Picked for You"
              subtitle="Matched to your UGC & Photography niche"
              listings={forYou}
              saved={savedIds}
              onSave={toggleSave}
              onNavigate={goToListing}
              expanded={expandedSection === 'Picked for You'}
              onToggleExpand={() => setExpandedSection(expandedSection === 'Picked for You' ? null : 'Picked for You')}
              hidden={expandedSection !== null && expandedSection !== 'Picked for You'}
              onHostClick={() => setPopupHost(sampleHostPerson)}
            />

            <SectionRow
              title="Near Asheville"
              subtitle="Collabs within driving distance of you"
              listings={nearMe}
              saved={savedIds}
              onSave={toggleSave}
              onNavigate={goToListing}
              expanded={expandedSection === 'Near Asheville'}
              onToggleExpand={() => setExpandedSection(expandedSection === 'Near Asheville' ? null : 'Near Asheville')}
              hidden={expandedSection !== null && expandedSection !== 'Near Asheville'}
              onHostClick={() => setPopupHost(sampleHostPerson)}
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
    </div>
  );
}
