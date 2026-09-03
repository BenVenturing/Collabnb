import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SAMPLE_HOST, IMG_FALLBACK } from '../lib/mockData';
import ProfilePopupCard from '../components/ProfilePopupCard';
import { formatDateRange } from '../lib/dateUtils';
import { useAppBar } from '../contexts/AppBarContext';
import { useCollabs } from '../contexts/CollabContext';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAccessGate, PendingApprovalScreen, LimitedAccessScreen, TrialBanner } from '../components/AccessGate';
import { WhereSearchContent, WhatSearchContent, WhenSearchContent, useAnimatedPlaceholder } from '../components/SearchDropdowns';
import SkeletonCard from '../components/SkeletonCard';
import SampleWatermark from '../components/SampleWatermark';
import CollabMap, { MapPopup } from '../components/map/CollabMap';
import PricingTool, { PointsHelpButton } from '../components/PricingTool';
import { cache } from '../lib/cache';
import { buildCreatorContext, scoreListings, MATCH_BADGE_THRESHOLD, FOR_YOU_MIN_SCORE, NEAR_ME_MIN_LOCATION } from '../lib/matchScore';

const EXPLORE_CACHE_KEY = 'explore_listings_all';
const HIDDEN_SAMPLE_LISTINGS_KEY = '@collabnb_hidden_sample_listings_v1';

const PROP_FILTERS = ['All', 'Cabin', 'Villa', 'Treehouse', 'Glamping', 'Lodge', 'Estate', 'Cottage'];

// Short pin/price label from a listing's compensation. Redacted (trial-ended)
// listings still show the cash value — it's the hook that drives the upsell.
function pinLabel(l) {
  const cash = l.cash_amount;
  if (typeof cash === 'number' && cash > 0) {
    return cash >= 1000 ? `$${(cash / 1000).toFixed(cash % 1000 ? 1 : 0)}k` : `$${cash}`;
  }
  const m = String(l.compensation || '').match(/\$([\d,]+)/);
  if (m) return `$${m[1]}`;
  return l.collab_type || '·';
}

// Blurred, non-interactive wrapper shown over the search dropdowns when a
// trial-ended creator is locked out — real suggestions stay visible but obscured,
// with a subscribe CTA. Drives the upsell without handing over the data.
function LockedDropdown({ children, onSubscribe }) {
  const { t } = useTranslation('explore');
  return (
    <div style={{ position: 'relative', minHeight: 180 }}>
      <div aria-hidden style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.85 }}>
        {children}
      </div>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '0.55rem', padding: '1.5rem',
        textAlign: 'center', background: 'rgba(247,246,242,0.5)',
        backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', borderRadius: '1rem',
      }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(209,235,219,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--slate)" strokeWidth="1.6" style={{ width: 18, height: 18 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ink)', fontSize: '0.95rem', margin: 0 }}>{t('locked.heading')}</p>
        <p style={{ fontSize: '0.78rem', color: 'var(--sage)', margin: 0, maxWidth: 240, lineHeight: 1.4 }}>{t('locked.body')}</p>
        <button
          onClick={onSubscribe}
          style={{ marginTop: '0.25rem', padding: '0.55rem 1.1rem', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--ink)', color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '0.82rem' }}
        >
          {t('subscribeUnlock')}
        </button>
      </div>
    </div>
  );
}

// ─── Convex listing normalizer ────────────────────────────────────────────────
function normalizeConvexListing(l, t) {
  const images = l.gallery_images?.length ? l.gallery_images : (l.image ? [l.image] : []);

  let compensation = l.compensation || '';
  if (!compensation) {
    if (l.compensation_type === 'paid') compensation = t('compensation.paid', { cash: l.cash_amount || '?' });
    else if (l.compensation_type === 'hybrid') compensation = t('compensation.hybrid', { cash: l.cash_amount || '?' });
    else compensation = t('compensation.seeListing');
  }

  let deliverables = typeof l.deliverables === 'string' ? l.deliverables : '';
  if (!deliverables && l.deliverables_list?.length) {
    const parts = l.deliverables_list.slice(0, 2).map((d) => `${d.quantity}× ${d.type}`);
    deliverables = parts.join(', ');
    if (l.deliverables_list.length > 2) deliverables += t('deliverables.more', { count: l.deliverables_list.length - 2 });
  } else if (!deliverables && l.deliverable_count) {
    deliverables = t('deliverables.count', { count: l.deliverable_count });
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
// Also reused by the host dashboard's in-place browse view (browseOnly hides
// the creator-only save action; click-through still works whenever onNavigate
// is passed, so a host can open the read-only listing detail page)
export function ListingCard({ listing, saved, onSave, delay, onNavigate, onHostClick, browseOnly = false }) {
  const { profile } = useAuth();
  const { t } = useTranslation('explore');
  const [rippling, setRippling] = useState(false);
  const isSample = listing._isSample === true;
  // Viewer's avatar may only stand in for the host's when the viewer owns the listing
  const isOwnListing = !!profile && (
    listing.host_id && String(listing.host_id) === String(profile._id)
  );

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
      style={{ width: 260, maxWidth: '100%', animationDelay: `${delay}ms`, opacity: 0, cursor: onNavigate ? 'pointer' : 'default' }}
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
              <p style={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.7, margin: 0, lineHeight: 1.3 }}>{t('card.applyToView')}</p>
            </div>
          </div>
        )}

        {/* Sample listing watermark — demo listings only */}
        {isSample && <SampleWatermark />}

        {/* Featured badge */}
        {listing.is_featured && (
          <span className="eyebrow-tag" style={{
            position: 'absolute', top: '0.75rem', left: '0.75rem',
            fontSize: '0.58rem', padding: '0.25rem 0.55rem',
          }}>
            {t('card.featured')}
          </span>
        )}

        {/* Match badge — strong matches only */}
        {typeof listing._match === 'number' && listing._match >= MATCH_BADGE_THRESHOLD && (
          <span
            title={listing._matchReasons?.join(' · ') || t('card.matchFallback')}
            style={{
              position: 'absolute', bottom: '0.6rem', left: '0.75rem',
              padding: '0.25rem 0.55rem', borderRadius: '9999px',
              fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.02em',
              color: 'var(--ink)', background: 'rgba(209,235,219,0.92)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(25,37,36,0.12)',
            }}
          >
            {t('card.matchPercent', { match: listing._match })}
          </span>
        )}

        {/* Save heart */}
        {!browseOnly && (
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
        )}
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
            title={t('card.viewHost')}
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
              <img src={listing.host_avatar || (isOwnListing ? profile.avatar_url : null) || SAMPLE_HOST.avatar_fallback} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <span style={{ fontSize: '0.67rem', color: 'var(--sage)' }}>
              {t('card.byHost')} <span style={{ fontWeight: 600, color: 'var(--slate)' }}>{listing.host_name || SAMPLE_HOST.name}</span>
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
  const { t } = useTranslation('explore');
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
            {expanded ? t('section.showLess') : t('section.seeAll')}
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
function Dropdown({ children, align = 'left', width, narrow = false }) {
  // On phones the fixed pixel widths (380/460px) overflow the viewport, so the
  // panel is centred on the search bar and clamped to the screen instead.
  const narrowStyle = narrow ? {
    left: '50%', right: 'auto', transform: 'translateX(-50%)',
    width: 'calc(100vw - 1.5rem)', maxWidth: 'calc(100vw - 1.5rem)',
    maxHeight: '70dvh', overflowY: 'auto',
  } : null;
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
        ...narrowStyle,
      }}
    >
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Explore() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('explore');
  const { profile } = useAuth();
  const { compactSearch, setCompactSearch, mapDestination, setMapAreaDisplay, setMapView } = useAppBar();
  const [activeField, setActiveField] = useState(null); // 'where' | 'what' | 'when'
  const [whereVal,    setWhereVal]    = useState('');
  const [whatVal,     setWhatVal]     = useState('');
  const [whatQuery,   setWhatQuery]   = useState('');
  const [whenVal,     setWhenVal]     = useState('');
  const [propFilter,  setPropFilter]  = useState('All');
  const propFilterLabels = {
    All: t('propertyTypes.all'),
    Cabin: t('propertyTypes.cabin'),
    Villa: t('propertyTypes.villa'),
    Treehouse: t('propertyTypes.treehouse'),
    Glamping: t('propertyTypes.glamping'),
    Lodge: t('propertyTypes.lodge'),
    Estate: t('propertyTypes.estate'),
    Cottage: t('propertyTypes.cottage'),
  };
  const [expandedSection, setExpandedSection] = useState(null); // null | section title
  const { savedIds, toggleSave } = useCollabs();
  const [popupHost, setPopupHost] = useState(null);
  const [pricingToolOpen, setPricingToolOpen] = useState(false);

  // ?tool=pricing — how the profile menu opens the pricing sandbox on mobile,
  // where the floating corner buttons are hidden.
  useEffect(() => {
    if (new URLSearchParams(location.search).get('tool') === 'pricing') {
      setPricingToolOpen(true);
      navigate('/explore', { replace: true });
    }
  }, [location.search, navigate]);

  const searchRef = useRef(null);
  const mapWhereRef = useRef(null);

  // ── Map view state ───────────────────────────────────────────────────────────
  const [mapOpen, setMapOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 900); // map is the primary Explore view on desktop
  const [mapExpanded, setMapExpanded] = useState(false);   // full-screen map (hides the list column)
  const [mapInstance, setMapInstance] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);        // {lng,lat} → reverse-geocoded area label
  const [mapAreaLabel, setMapAreaLabel] = useState('');
  const [activePinId, setActivePinId] = useState(null);
  const [visitedIds, setVisitedIds] = useState(() => new Set()); // pins viewed this session (reset on refresh)
  const [popupReady, setPopupReady] = useState(false);      // show the card only after the click's fly settles
  const [hoveredCardId, setHoveredCardId] = useState(null); // pin-driven: which card's pin is hovered
  const [fitKey, setFitKey] = useState(0);
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 900);
  const [isSearchingArea, setIsSearchingArea] = useState(false);
  const [areaResultMsg, setAreaResultMsg] = useState(null);
  const [areaResultIsError, setAreaResultIsError] = useState(false);

  useEffect(() => {
    const on = () => setIsNarrow(window.innerWidth < 900);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  // Selecting a pin: open it, but reveal the card only AFTER the fly-to lands
  // (fixed 720ms, just past the 700ms fly) so it positions once over the centred
  // pin and never chases it into a corner.
  const popupTimerRef = useRef(null);
  const handlePinClick = (id) => {
    setActivePinId(id);
    setVisitedIds((prev) => { const next = new Set(prev); next.add(id); return next; }); // mark viewed (mint) for the session
    setPopupReady(false);
    clearTimeout(popupTimerRef.current);
    popupTimerRef.current = setTimeout(() => setPopupReady(true), 720);
  };
  const handleMapMove = (b) => {
    setMapBounds(b);
    setMapCenter({ lng: b.centerLng, lat: b.centerLat });
    if (areaResultMsg) setAreaResultMsg(null);
  };

  const handleSearchThisArea = () => {
    if (isSearchingArea) return;
    if (areaResultMsg) {
      setAreaResultMsg(null);
      return;
    }
    setIsSearchingArea(true);
    setAreaResultMsg(null);
    if (mapAreaLabel) setMapAreaDisplay(mapAreaLabel);

    setTimeout(() => {
      setIsSearchingArea(false);
      const listingsInArea = mapListings.filter(inBounds);
      const count = listingsInArea.length;
      if (count === 0) {
        setAreaResultMsg(t('searchArea.noListings'));
        setAreaResultIsError(true);
        setTimeout(() => setAreaResultMsg(null), 4500);
      } else {
        setAreaResultMsg(t('searchArea.results', { count }));
        setAreaResultIsError(false);
        setTimeout(() => setAreaResultMsg(null), 2600);
      }
    }, 650);
  };

  // Reverse-geocode the map centre → "Homes in {area}" label (debounced).
  useEffect(() => {
    if (!mapOpen || !mapCenter) return;
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${mapCenter.lng},${mapCenter.lat}.json?access_token=${token}&types=place,region,country&limit=1`);
        const d = await r.json();
        const name = d?.features?.[0]?.place_name || d?.features?.[0]?.text || '';
        if (!cancelled) setMapAreaLabel(name);
      } catch { /* ignore */ }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [mapOpen, mapCenter]);

  // Type a destination in the nav search → fly the map there (even with 0 collabs).
  useEffect(() => {
    if (!mapOpen || !mapInstance || !mapDestination || mapDestination.trim().length < 3) return;
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(mapDestination)}.json?access_token=${token}&limit=1&types=country,region,place,locality,district`);
        const d = await r.json();
        const f = d?.features?.[0];
        if (cancelled || !f) return;
        if (Array.isArray(f.bbox) && f.bbox.length === 4) {
          mapInstance.fitBounds([[f.bbox[0], f.bbox[1]], [f.bbox[2], f.bbox[3]]], { padding: 60, maxZoom: 11, duration: 900 });
        } else if (Array.isArray(f.center)) {
          mapInstance.flyTo({ center: f.center, zoom: 9, duration: 900, essential: true });
        }
      } catch { /* ignore */ }
    }, 600);
    return () => { cancelled = true; clearTimeout(t); };
  }, [mapOpen, mapInstance, mapDestination]);

  const hostAvatar = (profile?.is_founder && profile.avatar_url) || SAMPLE_HOST.avatar_fallback;
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

  // Re-fit the map to results on open and on a new location search. (Kept above
  // the access-gate early return so hook order stays stable.)
  useEffect(() => { if (mapOpen) setFitKey((k) => k + 1); }, [mapOpen, debouncedWhere, mapExpanded]);

  // Outside-click closes dropdowns
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current?.contains(e.target)) return;
      if (mapWhereRef.current?.contains(e.target)) return;
      setActiveField(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Compact the top nav into a single bar. Forced on in map view (keeps Explore
  // uncluttered); scroll-driven in the classic list view.
  useEffect(() => {
    if (mapOpen) {
      setCompactSearch(true);
      return () => setCompactSearch(false);
    }
    const onScroll = () => setCompactSearch(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); setCompactSearch(false); };
  }, [mapOpen, setCompactSearch]);

  // Tell the nav we're in map view (hides the bell → notifications move to the profile menu).
  useEffect(() => { setMapView(mapOpen); return () => setMapView(false); }, [mapOpen, setMapView]);

  // ── Data source: real Convex listings + global sample listings ───────────────
  const convexRaw  = useQuery(api.listings.getAll, profile?._id ? { viewerId: String(profile._id) } : {}) ?? null;       // real (excludes is_sample)
  const samplesRaw = useQuery(api.listings.getSamples) ?? null;   // global sample listings
  const myCollabs  = useQuery(
    api.collaborations.getByCreator,
    profile?._id ? { creatorId: String(profile._id) } : 'skip'
  ) ?? [];

  // Per-device hidden sample listing ids (honors past dismissals)
  const [hiddenSampleIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HIDDEN_SAMPLE_LISTINGS_KEY) || '[]'); }
    catch { return []; }
  });

  const convexActive = convexRaw
    ? convexRaw
        .filter((l) => l.status === 'published' || l.status === 'active')
        .map((l) => normalizeConvexListing(l, t))
    : null; // null = still loading

  // Sample listings come from Convex only (no bundled mock fallback).
  // Filter out any the user has dismissed on this device.
  const sampleActive = (samplesRaw || [])
    .map((l) => ({ ...normalizeConvexListing(l, t), _isSample: true }))
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

  // Access state must be known before assembling listings so limited (trial-ended)
  // creators get a fully redacted set. Real listings are redacted server-side; the
  // client-injected sample listings are redacted here so they blur to match.
  const access = useAccessGate();
  const isLimited = !access.loading && access.state === 'limited' && access.role === 'creator' && !access.isAdmin && !access.isFounder;
  const { openModal: openSubModal } = useSubscription();

  // Everyone sees the sample listings alongside any real listings.
  const allListings = [...realActive, ...sampleActive].map((l) =>
    isLimited ? { ...l, _redacted: true } : l
  );
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

  function inBounds(l) {
    if (!mapBounds) return true;
    if (typeof l.lat !== 'number' || typeof l.lng !== 'number') return false;
    return l.lat >= mapBounds.south && l.lat <= mapBounds.north
        && l.lng >= mapBounds.west  && l.lng <= mapBounds.east;
  }

  const searchFiltered = isLoading ? [] : applySearch(allListings);

  const nearLocationLabel = (whereVal || debouncedWhere || profile?.city || '').split(',')[0].trim() || t('sections.nearYou');

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
  if (!access.loading) {
    if (!access.canAccess && access.role === 'creator' && !access.isAdmin) {
      if (access.state === 'pending') return <PendingApprovalScreen />;
      // 'limited' (trial expired) intentionally falls through: the server returns
      // a redacted payload, so these creators still see the map + blurred cards
      // (drives FOMO) with the upgrade banner below — instead of a hard block.
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

  // ── Map data: search/filter matches that have coordinates ────────────────────
  const mapListings = allFiltered.filter((l) => typeof l.lat === 'number' && typeof l.lng === 'number');
  const mapListInBounds = mapListings.filter(inBounds);
  const mapPoints = mapListings.map((l) => ({
    id: l.id, lat: l.lat, lng: l.lng, label: pinLabel(l), redacted: l._redacted === true,
  }));
  const activeListing = activePinId ? mapListings.find((l) => l.id === activePinId) : null;

  // Initial map framing: zoom into the most trending listings (fallback: for-you, then all).
  const focusSrc = trending.length ? trending : (forYou.length ? forYou : mapListings);
  const focusMapPoints = focusSrc
    .filter((l) => typeof l.lat === 'number' && typeof l.lng === 'number')
    .map((l) => ({ lat: l.lat, lng: l.lng }));

  const forYouSubtitle = profile?.niches?.length
    ? t('sections.pickedSubtitleNiches', { niches: profile.niches.slice(0, 2).join(' & ') })
    : t('sections.pickedSubtitleFallback');

  const openListingNewTab = (id) => window.open(`/listing/${id}`, '_blank', 'noopener');

  // Shared map element (desktop split + mobile full-screen reuse it). Only built
  // when the map is open so Mapbox never initialises otherwise.
  const collabMapNode = mapOpen ? (
    <CollabMap
      points={mapPoints}
      activeId={activePinId}
      savedIds={savedIds}
      visitedIds={visitedIds}
      onPinClick={(id) => { handlePinClick(id); const l = mapListings.find((x) => x.id === id); if (l?.location) setMapAreaDisplay(l.location); }}
      onPinHover={setHoveredCardId}
      onMoveEnd={handleMapMove}
      onReady={setMapInstance}
      onToggleExpand={isNarrow ? undefined : () => setMapExpanded((v) => !v)}
      expanded={mapExpanded}
      fitKey={fitKey}
      fitPoints={focusMapPoints}
    >
      {activeListing && popupReady && (
        <MapPopup map={mapInstance} lng={activeListing.lng} lat={activeListing.lat} onOffscreen={() => setActivePinId(null)}>
          <div style={{ position: 'relative', width: 264, background: '#fff', borderRadius: '1.25rem', filter: 'drop-shadow(0 12px 28px rgba(25,37,36,0.28))' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setActivePinId(null); }}
              aria-label={t('close')}
              style={{
                position: 'absolute', top: -10, left: -10, zIndex: 2,
                width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.6)',
                background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(25,37,36,0.2)', fontSize: 16, lineHeight: 1, color: 'var(--ink)',
              }}
            >×</button>
            <ListingCard
              listing={activeListing}
              saved={savedIds.has(activeListing.id)}
              onSave={toggleSave}
              delay={0}
              onNavigate={() => openListingNewTab(activeListing.id)}
              onHostClick={() => setPopupHost(sampleHostPerson)}
            />
          </div>
        </MapPopup>
      )}
      {/* Search-this-area button (supports 3 bouncing dots + in-place results count feedback with X close button) */}
      <button
        onClick={handleSearchThisArea}
        disabled={isSearchingArea}
        style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 7, padding: '0.6rem 1.25rem', borderRadius: 9999,
          border: areaResultMsg ? '1px solid rgba(25,37,36,0.22)' : '1px solid rgba(25,37,36,0.14)',
          background: '#fff', color: 'var(--ink)',
          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.82rem',
          cursor: isSearchingArea ? 'default' : 'pointer',
          boxShadow: '0 4px 16px rgba(25,37,36,0.28)', minWidth: 148, justifyContent: 'center',
          transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)', whiteSpace: 'nowrap',
        }}
      >
        {isSearchingArea ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: 18, padding: '0 4px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#192524', display: 'inline-block', animation: 'mapDotBounce 1.2s infinite ease-in-out 0s' }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#192524', display: 'inline-block', animation: 'mapDotBounce 1.2s infinite ease-in-out 0.2s' }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#192524', display: 'inline-block', animation: 'mapDotBounce 1.2s infinite ease-in-out 0.4s' }} />
          </div>
        ) : areaResultMsg ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" style={{ width: 14, height: 14, color: areaResultIsError ? '#d97706' : '#10b981' }}>
              <circle cx="8.5" cy="8.5" r="5.25"/><line x1="13.25" y1="13.25" x2="18" y2="18"/>
            </svg>
            <span>{areaResultMsg}</span>
            <span
              onClick={(e) => { e.stopPropagation(); setAreaResultMsg(null); }}
              title={t('searchArea.clearRefresh')}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 18, height: 18, borderRadius: '50%', background: 'rgba(25,37,36,0.08)',
                marginLeft: 4, cursor: 'pointer', fontSize: 13, lineHeight: 1, color: 'var(--ink)'
              }}
            >×</span>
          </div>
        ) : (
          <>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" style={{ width: 14, height: 14 }}><circle cx="8.5" cy="8.5" r="5.25"/><line x1="13.25" y1="13.25" x2="18" y2="18"/></svg>
            {t('searchArea.button')}
          </>
        )}
      </button>

    </CollabMap>
  ) : null;

  return (
    <div style={isLimited ? { '--banner-h': '3.5rem' } : undefined}>

      {/* ── Trial countdown banner ─────────── */}
      {!access.loading && access.state === 'trial' && access.daysLeft !== null && (
        <TrialBanner daysLeft={access.daysLeft} />
      )}

      {/* ── Limited (trial expired): prominent fixed paywall banner ─────────── */}
      {/* Fixed + high z-index so it sits above the fixed map (zIndex 40) and stays
          clickable; the map shifts down via the --banner-h var set on the wrapper. */}
      {isLimited && (
        <button
          onClick={() => openSubModal()}
          style={{
            position: 'fixed', top: '5.5rem', left: 0, right: 0, zIndex: 200,
            width: '100%', border: 'none', cursor: 'pointer',
            padding: '0.8rem 1.25rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem', flexWrap: 'wrap',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem',
            color: '#fff', background: 'linear-gradient(90deg, #192524, #2d4a3e)',
            boxShadow: '0 6px 20px rgba(25,37,36,0.30)',
          }}
        >
          <span>{t('limited.body')}</span>
          <span style={{ background: '#D1EBDB', color: '#192524', borderRadius: 999, padding: '0.35rem 1rem', fontWeight: 800, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
            {t('subscribeUnlock')}
          </span>
        </button>
      )}
      {/* Reserve space in list view; map view shifts via --banner-h instead. */}
      {isLimited && !mapOpen && <div style={{ height: '3.25rem' }} />}

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
              <label>{t('search.where')}</label>
              <input
                type="text"
                value={whereVal}
                onChange={(e) => { setWhereVal(e.target.value); if (activeField !== 'where') setActiveField('where'); }}
                onFocus={() => setActiveField('where')}
                placeholder={t('search.destinationsPlaceholder')}
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
              <label>{t('search.what')}</label>
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
              <label>{t('search.when')}</label>
              <span className="search-value" style={{ color: whenVal ? 'var(--ink)' : undefined, fontWeight: whenVal ? 600 : undefined }}>
                {whenDisplay || t('search.anyTime')}
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
            <Dropdown width="380px" narrow={isNarrow}>
              {isLimited ? (
                <LockedDropdown onSubscribe={openSubModal}>
                  <WhereSearchContent whereVal={whereVal} setWhereVal={() => {}} onClose={() => {}} listings={allListings} />
                </LockedDropdown>
              ) : (
                <WhereSearchContent
                  whereVal={whereVal}
                  setWhereVal={setWhereVal}
                  onClose={() => setActiveField(null)}
                  listings={allListings}
                />
              )}
            </Dropdown>
          )}

          {/* ── What dropdown (collab type + deliverables) ─────────────────────── */}
          {activeField === 'what' && (
            <Dropdown narrow={isNarrow}>
              {isLimited ? (
                <LockedDropdown onSubscribe={openSubModal}>
                  <WhatSearchContent whatVal={whatVal} setWhatVal={() => {}} onClose={() => {}} typeQuery={whatQuery} />
                </LockedDropdown>
              ) : (
                <WhatSearchContent
                  whatVal={whatVal}
                  setWhatVal={setWhatVal}
                  onClose={() => setActiveField(null)}
                  typeQuery={whatQuery}
                />
              )}
            </Dropdown>
          )}

          {/* ── When dropdown (date range picker) ──────────────────────────────── */}
          {activeField === 'when' && (
            <Dropdown align="right" width="460px" narrow={isNarrow}>
              {isLimited ? (
                <LockedDropdown onSubscribe={openSubModal}>
                  <WhenSearchContent whenVal={whenVal} setWhenVal={() => {}} onClose={() => {}} />
                </LockedDropdown>
              ) : (
                <WhenSearchContent
                  whenVal={whenVal}
                  setWhenVal={setWhenVal}
                  onClose={() => setActiveField(null)}
                />
              )}
            </Dropdown>
          )}
        </div>

        {/* ── Property type chips + Show map toggle ────────────────────────── */}
        <div style={{ maxWidth: '820px', margin: '0.75rem auto 0', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            className="no-scrollbar"
            style={{
              display: 'flex', gap: '0.5rem', overflowX: 'auto',
              paddingBottom: '0.875rem', justifyContent: 'center', flex: 1,
            }}
          >
            {PROP_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setPropFilter(f)}
                className={`chip ${propFilter === f ? 'active' : ''}`}
                style={{ flexShrink: 0 }}
              >
                {propFilterLabels[f]}
              </button>
            ))}
          </div>
          <button
            onClick={() => setMapOpen((o) => !o)}
            className="btn-glass"
            style={{ flexShrink: 0, marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700 }}
          >
            {mapOpen ? (
              <>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                {t('map.showList')}
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
                {t('map.showMap')}
              </>
            )}
          </button>
        </div>

      </div>

      {/* ── Listing rows ─────────────────────────────────────────────────────── */}
      <div style={{ paddingTop: '2.25rem', paddingBottom: '4rem', display: (mapOpen && !isNarrow) ? 'none' : undefined }}>

        {isLoading ? (
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ padding: '0 1.5rem', marginBottom: '1rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '0.1rem' }}>
                {t('loading.stays')}
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
                  {t('ghost.comingSoon')}
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--sage)', lineHeight: 1.5, margin: 0 }}>
                  {t('ghost.curating')}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <SectionRow
              title={t('sections.trending')}
              subtitle={t('sections.trendingSubtitle')}
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
              title={t('sections.pickedForYou')}
              subtitle={forYouSubtitle}
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
              title={t('sections.near', { place: nearLocationLabel })}
              subtitle={t('sections.nearSubtitle')}
              listings={nearMe}
              saved={savedIds}
              onSave={toggleSave}
              onNavigate={goToListing}
              expanded={expandedSection === 'Near'}
              onToggleExpand={() => setExpandedSection(expandedSection === 'Near' ? null : 'Near')}
              hidden={expandedSection !== null && expandedSection !== 'Near'}
              onHostClick={() => setPopupHost(sampleHostPerson)}
            />

            <SectionRow
              title={t('sections.allStays')}
              subtitle={t('sections.allStaysSubtitle', { count: allFiltered.length })}
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
                  {(debouncedWhere || debouncedWhat || whenVal) ? t('empty.searchHeading') : t('empty.noStays')}
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--sage)', marginBottom: '1.5rem' }}>
                  {(debouncedWhere || debouncedWhat || whenVal)
                    ? t('empty.searchBody')
                    : t('empty.filterBody')}
                </p>
                {(debouncedWhere || debouncedWhat || whenVal) ? (
                  <button className="btn-glass" onClick={() => { setWhereVal(''); setWhatVal(''); setWhatQuery(''); setWhenVal(''); }} style={{ fontSize: '0.875rem' }}>
                    {t('empty.clearSearch')}
                  </button>
                ) : (
                  <button className="btn-glass" onClick={() => setPropFilter('All')} style={{ fontSize: '0.875rem' }}>
                    {t('empty.showAllTypes')}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Map split (desktop) — primary Explore view ──────────────────────── */}
      {/* Fixed so the page itself never scrolls in map view; only the left list scrolls. */}
      {mapOpen && !isNarrow && (
        <div style={{ position: 'fixed', top: 'calc(var(--banner-h, 0rem) + 7rem)', left: 0, right: 0, bottom: 0, padding: '0 1.5rem 1rem', zIndex: 40 }}>
          <div style={{ display: 'flex', gap: '1rem', height: '100%' }}>
            {!mapExpanded && (
              <div className="no-scrollbar" style={{ flex: '0 0 clamp(320px, 46%, 620px)', overflowY: 'auto', paddingRight: '0.25rem' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)', margin: '0 0 0.9rem' }}>
                  {t('map.collabsAvailable', { count: mapListInBounds.length })}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 260px)', justifyContent: 'center', gap: '1rem' }}>
                  {mapListInBounds.map((l, i) => {
                    const lifted = hoveredCardId === l.id || activePinId === l.id;
                    return (
                      <div
                        key={l.id}
                        style={{
                          borderRadius: 18,
                          transition: 'transform 300ms var(--ease-out-quart), box-shadow 300ms var(--ease-out-quart)',
                          transform: lifted ? 'translateY(-4px)' : 'none',
                          boxShadow: lifted ? '0 8px 24px rgba(25,37,36,0.10), 0 24px 48px rgba(25,37,36,0.08)' : 'none',
                        }}
                      >
                        <ListingCard
                          listing={l}
                          saved={savedIds.has(l.id)}
                          onSave={toggleSave}
                          delay={Math.min(i * 20, 200)}
                          onNavigate={() => goToListing(l.id)}
                          onHostClick={() => setPopupHost(sampleHostPerson)}
                        />
                      </div>
                    );
                  })}
                </div>
                {mapListInBounds.length === 0 && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--sage)', textAlign: 'center', paddingTop: '2rem' }}>
                    {t('map.noCollabsArea')}
                  </p>
                )}
              </div>
            )}
            <div style={{ flex: 1, position: 'relative', borderRadius: '1.25rem', overflow: 'hidden', boxShadow: '0 8px 32px rgba(25,37,36,0.12)' }}>
              {collabMapNode}
              {/* Clean single "{t('map.showList')}" control on the map */}
              <button
                onClick={() => setMapOpen(false)}
                style={{
                  position: 'absolute', top: 12, left: 12, zIndex: 5,
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0.5rem 0.9rem', borderRadius: 9999,
                  border: '1px solid rgba(25,37,36,0.12)', background: '#fff',
                  color: 'var(--ink)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.8rem',
                  cursor: 'pointer', boxShadow: '0 3px 12px rgba(25,37,36,0.25)',
                }}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                {t('map.showList')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Map (mobile) — map on top, nearby listings docked below ─────────── */}
      {/* The map gets ~72% of the screen; the rest is a swipeable strip of the
          listings currently in view, so pins are never hidden behind a button. */}
      {mapOpen && isNarrow && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', background: 'var(--bone, #F8F6F3)' }}>
          <div style={{ flex: '1 1 auto', position: 'relative', minHeight: 0 }}>
            {collabMapNode}
            <button
              onClick={() => setMapOpen(false)}
              style={{
                position: 'absolute', top: 12, left: 12, zIndex: 5,
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0.5rem 0.9rem', borderRadius: 9999,
                border: '1px solid rgba(25,37,36,0.12)', background: '#fff',
                color: 'var(--ink)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.8rem',
                cursor: 'pointer', boxShadow: '0 3px 12px rgba(25,37,36,0.25)',
              }}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              {t('map.showList')}
            </button>
          </div>

          <div style={{
            flex: '0 0 28dvh', minHeight: 0, display: 'flex', flexDirection: 'column',
            background: 'var(--bone, #F8F6F3)',
            borderTop: '1px solid rgba(25,37,36,0.10)',
            borderRadius: '1.25rem 1.25rem 0 0',
            boxShadow: '0 -6px 24px rgba(25,37,36,0.14)',
            marginTop: '-1.25rem', position: 'relative', zIndex: 6,
            padding: '0.5rem 0 0.75rem',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(25,37,36,0.15)', margin: '0 auto 0.5rem' }} />
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--ink)', margin: '0 0 0.5rem', padding: '0 1rem' }}>
              {t('map.collabsAvailable', { count: mapListInBounds.length })}
            </p>
            {mapListInBounds.length === 0 ? (
              <p style={{ fontSize: '0.78rem', color: 'var(--sage)', padding: '0 1rem' }}>{t('map.noCollabsArea')}</p>
            ) : (
              <div className="no-scrollbar" style={{ flex: 1, minHeight: 0, display: 'flex', gap: '0.625rem', overflowX: 'auto', padding: '0 1rem', scrollSnapType: 'x mandatory' }}>
                {mapListInBounds.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => goToListing(l.id)}
                    style={{
                      flex: '0 0 auto', width: 220, scrollSnapAlign: 'start',
                      display: 'flex', alignItems: 'center', gap: '0.6rem', textAlign: 'left',
                      background: '#fff', border: activePinId === l.id ? '1.5px solid var(--ink)' : '1px solid rgba(25,37,36,0.08)',
                      borderRadius: '0.9rem', padding: '0.5rem', cursor: 'pointer',
                      boxShadow: '0 2px 10px rgba(25,37,36,0.07)',
                    }}
                  >
                    <img
                      src={l.image || IMG_FALLBACK}
                      alt=""
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMG_FALLBACK; }}
                      style={{ width: 52, height: 52, borderRadius: '0.65rem', objectFit: 'cover', flexShrink: 0, filter: l._redacted ? 'blur(6px)' : 'none' }}
                    />
                    <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {l.title}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--sage)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {l.location}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ink)' }}>{pinLabel(l)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Floating Map pill (mobile, list view) ───────────────────────────── */}
      {/* Hidden while a search dropdown is open so it can't sit over the panel. */}
      {isNarrow && !mapOpen && !activeField && (
        <button
          onClick={() => setMapOpen(true)}
          className="btn-primary"
          style={{ position: 'fixed', bottom: '5.25rem', left: '50%', transform: 'translateX(-50%)', zIndex: 200, display: 'flex', alignItems: 'center', gap: 8, borderRadius: 9999, padding: '0.7rem 1.4rem', fontWeight: 700, boxShadow: '0 6px 20px rgba(25,37,36,0.3)' }}
        >
          {t('map.label')}
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
        </button>
      )}

      {popupHost && (
        <ProfilePopupCard
          person={popupHost}
          onClose={() => setPopupHost(null)}
          onMessage={() => { setPopupHost(null); navigate('/inbox'); }}
        />
      )}

      {/* ── Floating corner stack: Contract + Pricing ───────────────────────── */}
      {/* Desktop only — on phones these live in the profile menu instead. */}
      {!mapOpen && !isNarrow && (
      <div style={{
        position: 'fixed', bottom: '5.25rem', right: '0.75rem', zIndex: 200,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
      }}>
        <button
          onClick={() => setPricingToolOpen(true)}
          aria-label={t('corner.pricingAria')}
          title={t('corner.pricingAria')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 40, padding: '0 14px', borderRadius: 9999,
            border: '1px solid rgba(255,255,255,0.75)',
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(25,37,36,0.04), 0 4px 20px rgba(25,37,36,0.12)',
            cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12.5,
            color: 'var(--ink)', transition: 'transform 200ms cubic-bezier(0.16,1,0.3,1)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <span style={{ fontFamily: 'var(--font-blog-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', lineHeight: 1 }}>$</span>
          {t('corner.pricing')}
        </button>

        <button
          onClick={() => navigate('/contract')}
          aria-label={t('corner.contractAria')}
          title={t('corner.contractAria')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 40, padding: '0 14px', borderRadius: 9999,
            border: '1px solid rgba(255,255,255,0.75)',
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(25,37,36,0.04), 0 4px 20px rgba(25,37,36,0.12)',
            cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12.5,
            color: 'var(--ink)', transition: 'transform 200ms cubic-bezier(0.16,1,0.3,1)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>
          </svg>
          {t('corner.contract')}
        </button>
      </div>
      )}

      {pricingToolOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setPricingToolOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(25,37,36,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1rem',
          }}
        >
          <div style={{ position: 'relative', width: '100%', maxWidth: 560, maxHeight: '86dvh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 2, display: 'flex', gap: 6 }}>
              <PointsHelpButton />
              <button
                onClick={() => setPricingToolOpen(false)}
                aria-label={t('close')}
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none',
                  background: 'rgba(25,37,36,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--slate)" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div style={{
              flex: 1, minHeight: 0, overflowY: 'auto', borderRadius: '1.25rem',
              boxShadow: '0 24px 50px -12px rgba(25,37,36,0.35)',
            }}>
              <PricingTool mode="sandbox" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
