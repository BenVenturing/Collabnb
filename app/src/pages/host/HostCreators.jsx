import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, MessageSquare, Check, X,
  Sparkles, ExternalLink, MapPin, Calendar, ChevronRight, ChevronLeft, Trash2,
  SlidersHorizontal,
} from 'lucide-react';
import SkeletonCard from '../../components/SkeletonCard';
import { cache, cacheKey } from '../../lib/cache';
import ProfilePopupCard from '../../components/ProfilePopupCard';
import CreatorAvatar from '../../components/CreatorAvatar';
import CreatorCard from '../../components/CreatorCard';

// ─── Constants ────────────────────────────────────────────────────────────────
const LOCATION_CONSENT_KEY = '@collabnb_location_consent_v1';
const HOST_LOCATION = { city: 'San Francisco', state: 'CA', country: 'USA', lat: 37.7749, lng: -122.4194 };
const MAX_NEARBY_MILES = 50;
const NEARBY_SECTION_LIMIT = 6;

// ─── Distance helpers ─────────────────────────────────────────────────────────
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function isNearHost(creator) {
  if (creator.lat != null && creator.lng != null) {
    return haversineDistance(HOST_LOCATION.lat, HOST_LOCATION.lng, creator.lat, creator.lng) <= MAX_NEARBY_MILES;
  }
  return creator.location?.toLowerCase().includes(HOST_LOCATION.city.toLowerCase()) || false;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function fmtDate(isoStr) {
  if (!isoStr) return '';
  const [, m, d] = isoStr.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[m - 1]} ${d}`;
}

function tripsOverlapWithHost(creator, startIso, endIso) {
  if (!creator.travelCalendar?.length) return false;
  const rangeStart = new Date(startIso);
  const rangeEnd   = new Date(endIso);
  return creator.travelCalendar.some(entry => {
    const es = new Date(entry.startDate);
    const ee = new Date(entry.endDate);
    return es <= rangeEnd && ee >= rangeStart &&
      entry.city?.toLowerCase().includes(HOST_LOCATION.city.toLowerCase());
  });
}

function getVisitingBadge(creator, startIso, endIso) {
  if (!startIso || !endIso || !creator.travelCalendar?.length) return null;
  const rangeStart = new Date(startIso);
  const rangeEnd   = new Date(endIso);
  const trip = creator.travelCalendar.find(entry => {
    const es = new Date(entry.startDate);
    const ee = new Date(entry.endDate);
    return es <= rangeEnd && ee >= rangeStart &&
      entry.city?.toLowerCase().includes(HOST_LOCATION.city.toLowerCase());
  });
  if (!trip) return null;
  return `Visiting ${trip.city} · ${fmtDate(trip.startDate)}–${fmtDate(trip.endDate)}`;
}

// ─── Mock creator pool ────────────────────────────────────────────────────────
const CREATORS = [
  {
    id: 'c1', name: 'Priya Nair', username: 'priya.wanders', tier: 'Micro Influencer',
    avatar: 'https://i.pravatar.cc/80?img=47', followers: 84200, engagement: 9.4, collab_count: 18,
    location: 'San Francisco, CA', lat: 37.7749, lng: -122.4194,
    platforms: ['Instagram', 'TikTok'], niches: ['Travel', 'Cabins', 'Mountain'],
    isFounder: true, isSample: true, avg_reach_30d: 24600, er_30d: 7.8, past_collab: false,
    bio: 'Mountain stays and city escapes — documenting authentic travel moments that inspire.',
    portfolioUrl: 'https://priya.wanders.co', travelCalendar: [],
  },
  {
    id: 'c2', name: 'Maya Chen', username: 'mayachen.travel', tier: 'Influencer',
    avatar: 'https://i.pravatar.cc/80?img=5', followers: 218000, engagement: 6.8, collab_count: 47,
    location: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437,
    platforms: ['Instagram', 'YouTube'], niches: ['Luxury', 'Coastal', 'Villa'],
    isFounder: true, isSample: true, avg_reach_30d: 58200, er_30d: 5.4, past_collab: true,
    bio: 'Luxury hospitality creator. Editorial-quality content for boutique properties.',
    portfolioUrl: 'https://mayachen.travel',
    travelCalendar: [
      { id: 'tc2a', startDate: '2026-05-15', endDate: '2026-05-22', country: 'USA', city: 'San Francisco', note: 'Bay Area content tour' },
      { id: 'tc2b', startDate: '2026-06-01', endDate: '2026-06-10', country: 'Italy', city: 'Amalfi' },
    ],
  },
  {
    id: 'c3', name: 'Sam Kowalski', username: 'sam.kowalski', tier: 'UGC Pro',
    avatar: 'https://i.pravatar.cc/80?img=59', followers: 58300, engagement: 8.9, collab_count: 23,
    location: 'Miami, FL', lat: 25.7617, lng: -80.1918,
    platforms: ['Instagram', 'TikTok'], niches: ['Coastal', 'Ocean', 'Lifestyle'],
    isFounder: true, isSample: true, avg_reach_30d: 18900, er_30d: 7.2, past_collab: true,
    bio: 'Coastal and ocean lifestyle content. My last villa collab drove 140k in direct bookings.',
    portfolioUrl: null,
    travelCalendar: [
      { id: 'tc3a', startDate: '2026-05-20', endDate: '2026-05-30', country: 'USA', city: 'San Francisco', note: 'West coast trip' },
    ],
  },
  {
    id: 'c4', name: 'Lena Park', username: 'lena.explores', tier: 'UGC Pro',
    avatar: 'https://i.pravatar.cc/80?img=32', followers: 31500, engagement: 12.1, collab_count: 31,
    location: 'Portland, OR', lat: 45.5051, lng: -122.6750,
    platforms: ['TikTok', 'Instagram'], niches: ['Adventure', 'Cabin', 'Nature'],
    isFounder: false, isSample: true, avg_reach_30d: 14200, er_30d: 10.8, past_collab: false,
    bio: 'Off-the-beaten-path travel and adventure stays. Fast turnaround, high engagement.',
    portfolioUrl: 'https://lena.explores.io',
    travelCalendar: [
      { id: 'tc4a', startDate: '2026-05-18', endDate: '2026-05-25', country: 'USA', city: 'San Francisco', note: 'Heading down the coast' },
    ],
  },
  {
    id: 'c5', name: 'Nina Okafor', username: 'ninaokafor', tier: 'Micro Influencer',
    avatar: 'https://i.pravatar.cc/80?img=44', followers: 67100, engagement: 10.5, collab_count: 14,
    location: 'Chicago, IL', lat: 41.8781, lng: -87.6298,
    platforms: ['Instagram', 'TikTok'], niches: ['Design', 'Boutique', 'Urban'],
    isFounder: true, isSample: true, avg_reach_30d: 22400, er_30d: 8.9, past_collab: false,
    bio: 'Boutique properties and design-forward spaces. Strong storytelling focus.',
    portfolioUrl: null, travelCalendar: [],
  },
  {
    id: 'c6', name: 'Jordan Ellis', username: 'jordanellis.co', tier: 'UGC Beginner',
    avatar: 'https://i.pravatar.cc/80?img=11', followers: 12400, engagement: 14.2, collab_count: 4,
    location: 'Oakland, CA', lat: 37.8044, lng: -122.2711,
    platforms: ['TikTok'], niches: ['Eco', 'Sustainable', 'Design'],
    isFounder: false, isSample: true, avg_reach_30d: 8800, er_30d: 12.6, past_collab: false,
    bio: 'Sustainable travel and eco-design creator. Rapidly growing audience, very high ER.',
    portfolioUrl: 'https://jordanellis.co', travelCalendar: [],
  },
  {
    id: 'c7', name: 'Ava Torres', username: 'ava.offshore', tier: 'Micro Influencer',
    avatar: 'https://i.pravatar.cc/80?img=21', followers: 43900, engagement: 7.3, collab_count: 9,
    location: 'Berkeley, CA', lat: 37.8716, lng: -122.2727,
    platforms: ['Instagram'], niches: ['Water', 'Boats', 'Coastal'],
    isFounder: false, isSample: true, avg_reach_30d: 13700, er_30d: 5.8, past_collab: false,
    bio: 'Water-based travel content. Floating homes, boats, and coastal adventures.',
    portfolioUrl: null, travelCalendar: [],
  },
  {
    id: 'c8', name: 'Kai Yamamoto', username: 'kai.wilderness', tier: 'UGC Beginner',
    avatar: 'https://i.pravatar.cc/80?img=68', followers: 9200, engagement: 18.7, collab_count: 2,
    location: 'Asheville, NC', lat: 35.5951, lng: -82.5515,
    platforms: ['TikTok'], niches: ['Nature', 'Treehouse', 'Wellness'],
    isFounder: false, isSample: true, avg_reach_30d: 6100, er_30d: 16.4, past_collab: false,
    bio: 'Off-grid nature experiences and wellness retreats. Tiny audience, extraordinary ER.',
    portfolioUrl: null, travelCalendar: [],
  },
  {
    id: 'c9', name: 'Isabelle Laurent', username: 'isabelle.unpack', tier: 'Influencer',
    avatar: 'https://i.pravatar.cc/80?img=16', followers: 342000, engagement: 5.2, collab_count: 62,
    location: 'New York, NY', lat: 40.7128, lng: -74.0060,
    platforms: ['Instagram', 'YouTube', 'TikTok'], niches: ['Luxury', 'Fashion', 'City'],
    isFounder: true, isSample: true, avg_reach_30d: 87300, er_30d: 4.1, past_collab: false,
    bio: 'Luxury travel and fashion crossover. High-end hospitality and editorial content.',
    portfolioUrl: 'https://isabelle.unpack.co',
    travelCalendar: [
      { id: 'tc9a', startDate: '2026-06-10', endDate: '2026-06-20', country: 'USA', city: 'San Francisco', note: 'West Coast luxury tour' },
    ],
  },
];

const TIER_COLORS = {
  'UGC Beginner':     { bg: 'rgba(209,235,219,0.6)', color: 'var(--ink)'  },
  'UGC Pro':          { bg: 'rgba(60,87,89,0.12)',   color: '#3C5759'     },
  'Micro Influencer': { bg: 'rgba(123,104,200,0.12)',color: '#5b4db8'     },
  'Influencer':       { bg: 'rgba(212,168,67,0.15)', color: '#b45309'     },
};

const TIER_DEFS = {
  'UGC Beginner':     '< 5K followers — New creators building their portfolio',
  'UGC Pro':          '5K–20K followers — Content creators, not influencer reach',
  'Micro Influencer': '5K–50K followers — Influencer-style content, engaged audience',
  'Influencer':       '50K+ followers — Broad reach, established audience',
};

const TIERS = ['All', 'UGC Beginner', 'UGC Pro', 'Micro Influencer', 'Influencer'];

function fmtFollowers(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000)    return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
const SAVED_KEY        = '@collabnb_swipe_saved_v1';
const DEPRIO_KEY       = '@collabnb_swipe_deprioritized_v1';
const HIST_KEY         = '@collabnb_swipe_history_v1';
const HIDDEN_SAMPLE_KEY = '@collabnb_hidden_sample_creators_v1';
function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

// ─── Location consent modal ───────────────────────────────────────────────────
function LocationConsentModal({ onAllow, onDisable }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(25,37,36,0.55)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '1.5rem',
        border: '1.5px solid rgba(255,255,255,0.9)',
        boxShadow: '0 24px 80px rgba(25,37,36,0.22)',
        padding: '28px 24px 24px',
        width: '100%', maxWidth: 380,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📍</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--ink)', margin: '0 0 10px' }}>
            Location access
          </h2>
          <p style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.65, margin: 0 }}>
            Collabnb uses your location to suggest nearby creators and stays. You can disable this anytime in Settings.{' '}
            <strong>Your exact location is never shared with other users.</strong>
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={onAllow} style={{
            padding: '12px 0', borderRadius: 9999,
            background: 'var(--ink)', color: 'var(--bone)',
            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
            border: 'none', cursor: 'pointer',
          }}>
            Allow
          </button>
          <button onClick={onDisable} style={{
            padding: '12px 0', borderRadius: 9999,
            background: 'transparent', color: 'var(--slate)',
            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
            border: '1.5px solid rgba(25,37,36,0.12)', cursor: 'pointer',
          }}>
            Disable Location
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Nearby creators section ──────────────────────────────────────────────────
function NearbyCreatorsSection({ creators, onSeeAll, onMessage }) {
  const [hiddenIds, setHiddenIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HIDDEN_SAMPLE_KEY) || '[]'); } catch { return []; }
  });
  const scrollRef = useRef(null);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function hideCreator(id) {
    const next = [...hiddenIds, id];
    setHiddenIds(next);
    try { localStorage.setItem(HIDDEN_SAMPLE_KEY, JSON.stringify(next)); } catch {}
  }

  const visible = creators.filter(c => !hiddenIds.includes(c.id));
  if (visible.length === 0) return null;
  const shown   = visible.slice(0, NEARBY_SECTION_LIMIT);
  const hasMore = visible.length > NEARBY_SECTION_LIMIT;

  function syncArrows() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    syncArrows();
    el.addEventListener('scroll', syncArrows, { passive: true });
    return () => el.removeEventListener('scroll', syncArrows);
  }, [shown.length]);

  const CARD_STRIDE = 200; // card width + gap

  return (
    <div style={{ marginBottom: '2.25rem' }}>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(209,235,219,0.65)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <MapPin size={13} color="#3C5759" />
            </div>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: 17, color: 'var(--ink)', lineHeight: 1.2,
            }}>
              Creators Near You
            </span>
            <span style={{
              padding: '2px 9px', borderRadius: 9999,
              fontSize: 10, fontWeight: 700,
              background: 'rgba(209,235,219,0.75)', color: 'var(--ink)',
              fontFamily: 'var(--font-body)',
            }}>
              {HOST_LOCATION.city}, {HOST_LOCATION.state}
            </span>
          </div>
          <p style={{
            fontSize: 11.5, color: 'var(--sage)', margin: '4px 0 0 36px',
            fontFamily: 'var(--font-body)',
          }}>
            Based on creator profiles in your metro area
          </p>
        </div>
        {hasMore && (
          <button onClick={onSeeAll} style={{
            display: 'flex', alignItems: 'center', gap: 2,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 700, color: 'var(--sage)',
            fontFamily: 'var(--font-body)', flexShrink: 0, marginTop: 6,
          }}>
            See All <ChevronRight size={11} />
          </button>
        )}
      </div>

      {/* Scroll strip with arrow buttons */}
      <div style={{ position: 'relative' }}>

        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => { scrollRef.current?.scrollBy({ left: -CARD_STRIDE, behavior: 'smooth' }); }}
            aria-label="Scroll left"
            style={{
              position: 'absolute', left: -14, top: '50%', transform: 'translateY(-50%)',
              zIndex: 5, width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(12px) saturate(140%)',
              border: '1px solid rgba(255,255,255,0.8)',
              boxShadow: '0 4px 14px rgba(25,37,36,0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={15} color="var(--ink)" />
          </button>
        )}

        {/* Cards row */}
        <div
          ref={scrollRef}
          style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            overflowX: 'auto', paddingBottom: 8, paddingTop: 4,
            scrollbarWidth: 'none', msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            scrollSnapType: 'x mandatory',
          }}
        >
          {shown.map(c => (
            <CreatorCard
              key={c.id}
              creator={c}
              narrow
              onHide={hideCreator}
              onMessage={onMessage}
            />
          ))}
        </div>

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => { scrollRef.current?.scrollBy({ left: CARD_STRIDE, behavior: 'smooth' }); }}
            aria-label="Scroll right"
            style={{
              position: 'absolute', right: -14, top: '50%', transform: 'translateY(-50%)',
              zIndex: 5, width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(12px) saturate(140%)',
              border: '1px solid rgba(255,255,255,0.8)',
              boxShadow: '0 4px 14px rgba(25,37,36,0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronRight size={15} color="var(--ink)" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Date range picker ────────────────────────────────────────────────────────
function DateRangePicker({ dateStart, dateEnd, onApply, onClear }) {
  const [open,     setOpen]     = useState(false);
  const [tmpStart, setTmpStart] = useState(dateStart || '');
  const [tmpEnd,   setTmpEnd]   = useState(dateEnd   || '');
  const containerRef = useRef(null);
  const isActive = !!(dateStart && dateEnd);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const dateInputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '0.625rem',
    border: '1.5px solid rgba(25,37,36,0.12)', background: 'var(--bone)',
    fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink)',
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0.4rem 0.875rem', borderRadius: 9999,
          fontSize: '0.78rem', fontWeight: 600,
          background: isActive ? 'rgba(60,87,89,0.12)' : 'rgba(255,255,255,0.65)',
          color: isActive ? '#3C5759' : 'var(--slate)',
          border: `1px solid ${isActive ? 'rgba(60,87,89,0.3)' : 'rgba(25,37,36,0.12)'}`,
          backdropFilter: 'blur(12px)', cursor: 'pointer',
          transition: 'all 180ms var(--ease-out-quart)',
          fontFamily: 'var(--font-body)',
        }}
      >
        <Calendar size={11} />
        {isActive ? `${fmtDate(dateStart)} – ${fmtDate(dateEnd)}` : 'Find creators traveling during…'}
      </button>
      {isActive && (
        <button
          onClick={() => { onClear(); setTmpStart(''); setTmpEnd(''); }}
          style={{
            width: 20, height: 20, borderRadius: '50%',
            background: 'rgba(25,37,36,0.08)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <X size={9} color="var(--slate)" />
        </button>
      )}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0,
          zIndex: 50, width: 280,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1.5px solid rgba(255,255,255,0.85)',
          borderRadius: '1rem',
          boxShadow: '0 8px 32px rgba(25,37,36,0.14)',
          padding: '1rem',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Travel dates to {HOST_LOCATION.city}
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--sage)', marginBottom: 4 }}>From</label>
              <input type="date" value={tmpStart} onChange={e => setTmpStart(e.target.value)} style={dateInputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--sage)', marginBottom: 4 }}>To</label>
              <input type="date" value={tmpEnd} min={tmpStart} onChange={e => setTmpEnd(e.target.value)} style={dateInputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => { onClear(); setTmpStart(''); setTmpEnd(''); setOpen(false); }}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 9999,
                border: '1.5px solid rgba(25,37,36,0.12)', background: 'transparent',
                fontSize: 11, fontWeight: 700, color: 'var(--slate)', cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Clear
            </button>
            <button
              onClick={() => { if (tmpStart && tmpEnd) { onApply(tmpStart, tmpEnd); setOpen(false); } }}
              disabled={!tmpStart || !tmpEnd}
              style={{
                flex: 2, padding: '8px 0', borderRadius: 9999, border: 'none',
                background: tmpStart && tmpEnd ? 'var(--ink)' : 'rgba(25,37,36,0.1)',
                fontSize: 11, fontWeight: 700,
                color: tmpStart && tmpEnd ? 'var(--bone)' : 'var(--sage)',
                cursor: tmpStart && tmpEnd ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-body)',
              }}
            >
              Show creators
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SwipeCardLarge — minimal, travel-focused ─────────────────────────────────
function SwipeCardLarge({ creator, exitDir, onClick }) {
  const [entered, setEntered] = useState(false);
  const t = TIER_COLORS[creator.tier] || TIER_COLORS['UGC Beginner'];

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const dynamicStyle = !entered
    ? { opacity: 0, transform: 'translateY(36px) scale(0.97)' }
    : exitDir === 'left'  ? { opacity: 0, transform: 'translateX(-140%) rotate(-15deg)' }
    : exitDir === 'right' ? { opacity: 0, transform: 'translateX(140%) rotate(15deg)' }
    : exitDir === 'up'    ? { opacity: 0, transform: 'translateY(-120%) scale(0.88)' }
    : { opacity: 1, transform: 'translateY(0) scale(1)' };

  const upcomingTrips = (creator.travelCalendar || [])
    .filter(trip => new Date(trip.endDate) >= new Date())
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .slice(0, 3);

  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute', inset: 0, borderRadius: '1.5rem',
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: '1.5px solid rgba(255,255,255,0.85)',
        boxShadow: '0 20px 60px rgba(25,37,36,0.16)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 340ms cubic-bezier(0.25,1,0.5,1), opacity 300ms ease',
        userSelect: 'none',
        display: 'flex', flexDirection: 'column',
        ...dynamicStyle,
      }}
    >
      {/* Gradient header band */}
      <div style={{
        height: 84, flexShrink: 0,
        background: 'linear-gradient(150deg, #D1EBDB 0%, #E6EFE7 45%, #EFECE9 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(25,37,36,0.07) 1px, transparent 1px)',
          backgroundSize: '14px 14px', backgroundPosition: '7px 7px',
          pointerEvents: 'none',
        }} />
        {/* Sample Creator badge top-left */}
        {creator.isSample && (
          <div style={{ position: 'absolute', top: 14, left: 16 }}>
            <span style={{ padding: '3px 9px', borderRadius: 9999, fontSize: 9, fontWeight: 700, background: 'rgba(149,157,144,0.22)', color: '#959D90', letterSpacing: '0.02em' }}>
              Sample Creator
            </span>
          </div>
        )}
        {/* Tier badge top-right */}
        <div style={{ position: 'absolute', top: 14, right: 16 }}>
          <span style={{ padding: '4px 12px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: t.bg, color: t.color, boxShadow: '0 1px 6px rgba(25,37,36,0.08)' }}>
            {creator.tier}
          </span>
        </div>
        {/* Avatar anchored bottom-left */}
        <div style={{ position: 'absolute', bottom: -26, left: 22 }}>
          <div style={{
            width: 54, height: 54, borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.97)',
            overflow: 'hidden', background: 'var(--mint)',
            boxShadow: '0 3px 14px rgba(25,37,36,0.12)',
          }}>
            <CreatorAvatar src={creator.avatar} name={creator.name} size={54} style={{ border: 'none' }} />
          </div>
          {creator.past_collab && (
            <div title="Past collab" style={{
              position: 'absolute', bottom: 1, right: -2, width: 18, height: 18,
              borderRadius: '50%', background: '#4A9B7F', border: '2px solid #fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Check size={9} color="#fff" />
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '34px 22px 14px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Name + location */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--ink)' }}>{creator.name}</span>
            {creator.isFounder && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 9999, background: 'rgba(25,37,36,0.07)', border: '1px solid rgba(25,37,36,0.1)', fontSize: 9, fontWeight: 700, color: 'var(--ink)' }}>
                <Sparkles size={8} />Founder
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--sage)', marginTop: 3 }}>
            @{creator.username} · 📍 {creator.location}
          </div>
        </div>

        {/* Destinations / collab section */}
        <div style={{
          padding: '12px 14px', borderRadius: '0.875rem', marginBottom: 14,
          background: upcomingTrips.length > 0 ? 'rgba(209,235,219,0.22)' : 'var(--bone)',
          border: `1px solid ${upcomingTrips.length > 0 ? 'rgba(209,235,219,0.6)' : 'rgba(25,37,36,0.07)'}`,
        }}>
          {upcomingTrips.length > 0 ? (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                ✈  Heading to
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {upcomingTrips.map(trip => (
                  <div key={trip.id} style={{
                    padding: '8px 13px', borderRadius: '0.625rem',
                    background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.9)',
                    boxShadow: '0 1px 6px rgba(25,37,36,0.06)',
                  }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{trip.city}</div>
                    <div style={{ fontSize: 10, color: 'var(--sage)', marginTop: 2 }}>{fmtDate(trip.startDate)}–{fmtDate(trip.endDate)}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Open to collabs in
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {creator.niches.slice(0, 4).map(n => (
                  <span key={n} style={{ padding: '5px 12px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.82)', color: 'var(--slate)', border: '1px solid rgba(25,37,36,0.08)' }}>{n}</span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Stats — 2-col */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 1, background: 'rgba(25,37,36,0.06)', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: 12,
        }}>
          {[
            { label: 'Followers', value: fmtFollowers(creator.followers) },
            { label: 'Eng. Rate', value: `${creator.engagement}%`        },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '11px 0', background: 'rgba(255,255,255,0.78)', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 10, color: 'var(--sage)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Platforms */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {creator.platforms.map(p => (
            <span key={p} style={{ padding: '4px 11px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: 'rgba(60,87,89,0.09)', color: 'var(--ink)' }}>{p}</span>
          ))}
        </div>
      </div>

      {/* Footer hint */}
      <div style={{
        padding: '10px 22px', borderTop: '1px solid rgba(25,37,36,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.55)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, color: 'var(--sage)', fontWeight: 500 }}>← skip · save → · ↑ message</span>
        <span style={{ fontSize: 10, color: 'var(--sage)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
          Full profile
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </span>
      </div>
    </div>
  );
}


// ─── Saved contact row ────────────────────────────────────────────────────────
function SavedContactRow({ creator, onMessage }) {
  const t = TIER_COLORS[creator.tier] || TIER_COLORS['UGC Beginner'];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      background: 'rgba(255,255,255,0.8)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.85)',
      borderRadius: '1rem', boxShadow: '0 2px 10px rgba(25,37,36,0.05)',
    }}>
      <CreatorAvatar src={creator.avatar} name={creator.name} size={44}
        style={{ border: '2px solid rgba(25,37,36,0.06)' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{creator.name}</div>
        <div style={{ fontSize: 11, color: 'var(--sage)', marginTop: 1 }}>@{creator.username} · {creator.location}</div>
        <span style={{ display: 'inline-block', marginTop: 4, padding: '2px 8px', borderRadius: 9999, fontSize: 9, fontWeight: 700, background: t.bg, color: t.color }}>{creator.tier}</span>
      </div>
      <button
        onClick={() => onMessage(creator)}
        style={{
          padding: '7px 14px', borderRadius: 9999, fontSize: 11, fontWeight: 700,
          background: 'var(--ink)', color: 'var(--bone)',
          border: 'none', cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 5,
        }}
      >
        <MessageSquare size={11} />Message
      </button>
    </div>
  );
}

// ─── View toggle pill ─────────────────────────────────────────────────────────
function ViewToggle({ mode, onChange }) {
  return (
    <div style={{
      display: 'inline-flex',
      background: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.85)',
      borderRadius: 9999, padding: 3,
      boxShadow: '0 2px 10px rgba(25,37,36,0.07)',
    }}>
      {[
        { value: 'grid',  label: '⊞  Grid View'  },
        { value: 'swipe', label: '✦  Swipe View' },
      ].map(({ value, label }) => (
        <button key={value} onClick={() => onChange(value)} style={{
          padding: '6px 20px', borderRadius: 9999,
          fontSize: 12, fontWeight: 700,
          background: mode === value ? 'var(--ink)' : 'transparent',
          color: mode === value ? 'var(--bone)' : 'var(--slate)',
          border: 'none', cursor: 'pointer',
          transition: 'all 200ms var(--ease-out-quart)',
          fontFamily: 'var(--font-body)',
        }}>
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Swipe view ───────────────────────────────────────────────────────────────
function SwipeView({ creators }) {
  const navigate = useNavigate();

  const [savedIds,     setSavedIds]     = useState(() => lsGet(SAVED_KEY));
  const [deprioIds,    setDeprioIds]    = useState(() => lsGet(DEPRIO_KEY));
  const [swipeHistory, setSwipeHistory] = useState(() => lsGet(HIST_KEY));

  const [deck] = useState(() => {
    const prevDeprio = new Set(lsGet(DEPRIO_KEY));
    return [
      ...creators.filter(c => !prevDeprio.has(c.id)),
      ...creators.filter(c => prevDeprio.has(c.id)),
    ];
  });

  const [deckIdx,     setDeckIdx]     = useState(0);
  const [exitDir,     setExitDir]     = useState(null);
  const [showModal,   setShowModal]   = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const currentCreator = deck[deckIdx] || null;
  const canUndo = swipeHistory.length > 0 && deckIdx > 0;

  function goToInbox(creator) {
    navigate(`/inbox?creatorName=${encodeURIComponent(creator.name)}&creatorAvatar=${encodeURIComponent(creator.avatar)}`);
  }

  const handleSwipe = useCallback((dir) => {
    if (isAnimating || !currentCreator) return;
    setIsAnimating(true);
    setExitDir(dir);
    setShowModal(false);

    setTimeout(() => {
      if (dir === 'right') {
        const next = [...savedIds, currentCreator.id];
        setSavedIds(next); lsSet(SAVED_KEY, next);
      } else if (dir === 'left') {
        const next = [...deprioIds, currentCreator.id];
        setDeprioIds(next); lsSet(DEPRIO_KEY, next);
      } else if (dir === 'up') {
        goToInbox(currentCreator);
      }
      const nextHist = [...swipeHistory, { id: currentCreator.id, action: dir }];
      setSwipeHistory(nextHist); lsSet(HIST_KEY, nextHist);
      setDeckIdx(i => i + 1);
      setExitDir(null);
      setIsAnimating(false);
    }, 340);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnimating, currentCreator, savedIds, deprioIds, swipeHistory]);

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const last = swipeHistory[swipeHistory.length - 1];
    const nextHist = swipeHistory.slice(0, -1);
    setSwipeHistory(nextHist); lsSet(HIST_KEY, nextHist);
    if (last.action === 'right') {
      const next = savedIds.filter(id => id !== last.id);
      setSavedIds(next); lsSet(SAVED_KEY, next);
    } else if (last.action === 'left') {
      const next = deprioIds.filter(id => id !== last.id);
      setDeprioIds(next); lsSet(DEPRIO_KEY, next);
    }
    setDeckIdx(i => i - 1);
  }, [canUndo, swipeHistory, savedIds, deprioIds]);

  const swipeRef = useRef(handleSwipe);
  const undoRef  = useRef(handleUndo);
  const modalRef = useRef(setShowModal);
  useEffect(() => { swipeRef.current = handleSwipe; }, [handleSwipe]);
  useEffect(() => { undoRef.current  = handleUndo;  }, [handleUndo]);

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); swipeRef.current('left');  }
      if (e.key === 'ArrowRight') { e.preventDefault(); swipeRef.current('right'); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); swipeRef.current('up');    }
      if (e.key === ' ')          { e.preventDefault(); modalRef.current(m => !m); }
      if (e.key === 'z' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); undoRef.current(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const savedCreators = creators.filter(c => savedIds.includes(c.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '0.25rem' }}>
      <p style={{ fontSize: 12, color: 'var(--sage)', marginBottom: 14, fontWeight: 500 }}>
        {currentCreator ? `${deckIdx + 1} of ${deck.length} creators` : `All ${deck.length} creators reviewed`}
      </p>

      <div style={{ position: 'relative', width: '100%', maxWidth: 400, height: 520 }}>
        {currentCreator ? (
          <SwipeCardLarge key={deckIdx} creator={currentCreator} exitDir={exitDir}
            onClick={() => !isAnimating && setShowModal(true)} />
        ) : (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '1.5rem',
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            border: '1.5px solid rgba(255,255,255,0.85)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <div style={{ fontSize: 44 }}>✓</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--ink)' }}>All caught up!</div>
            <p style={{ fontSize: 13, color: 'var(--sage)', textAlign: 'center', maxWidth: 220, margin: 0, lineHeight: 1.5 }}>
              You've reviewed all {deck.length} creators. Undo to revisit any.
            </p>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { key: '←', label: 'De-prioritize' },
          { key: '→', label: 'Save' },
          { key: '↑', label: 'Message' },
          { key: 'Space', label: 'Expand' },
        ].map(({ key, label }) => (
          <span key={key} style={{ fontSize: 11, color: 'var(--sage)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <kbd style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(25,37,36,0.12)', fontSize: 10, fontFamily: 'monospace' }}>{key}</kbd>
            {label}
          </span>
        ))}
      </div>

      {savedCreators.length > 0 && (
        <div style={{ width: '100%', maxWidth: 500, marginTop: 44 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 16 }}>❤️</span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ink)', margin: 0 }}>Saved Contacts</h3>
            <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: 'rgba(236,72,153,0.1)', color: '#be185d' }}>
              {savedCreators.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {savedCreators.map(c => (
              <SavedContactRow key={c.id} creator={c} onMessage={(creator) => goToInbox(creator)} />
            ))}
          </div>
        </div>
      )}

      {showModal && currentCreator && (
        <ProfilePopupCard
          person={currentCreator}
          onClose={() => setShowModal(false)}
          onMessage={() => { setShowModal(false); goToInbox(currentCreator); }}
          onViewPastCollabs={currentCreator.past_collab ? () => { setShowModal(false); navigate('/collabs'); } : undefined}
        />
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HostCreators() {
  const navigate = useNavigate();

  const [locationConsent,  setLocationConsent]  = useState(() => {
    try { return localStorage.getItem(LOCATION_CONSENT_KEY); } catch { return null; }
  });
  const [creatorsLoading,  setCreatorsLoading]  = useState(true);
  const [viewMode,         setViewMode]         = useState('grid');
  const [query,            setQuery]            = useState('');
  const [tierFilter,       setTierFilter]       = useState('All');
  const [platformFilter,   setPlatformFilter]   = useState([]);
  const [sortBy,           setSortBy]           = useState('followers');
  const [showPast,         setShowPast]         = useState(false);
  const [nearbyOnly,       setNearbyOnly]       = useState(false);
  const [dateStart,        setDateStart]        = useState('');
  const [dateEnd,          setDateEnd]          = useState('');
  const [hiddenSampleIds,  setHiddenSampleIds]  = useState(() => {
    try { return JSON.parse(localStorage.getItem(HIDDEN_SAMPLE_KEY) || '[]'); } catch { return []; }
  });
  const [filtersOpen,      setFiltersOpen]      = useState(false);
  const [tmpDateStart,     setTmpDateStart]     = useState('');
  const [tmpDateEnd,       setTmpDateEnd]       = useState('');

  const gridRef   = useRef(null);
  const filterRef = useRef(null);

  useEffect(() => {
    if (!filtersOpen) return;
    const handler = e => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFiltersOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filtersOpen]);

  useEffect(() => {
    const t = setTimeout(() => setCreatorsLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  function handleLocationAllow() {
    try { localStorage.setItem(LOCATION_CONSENT_KEY, 'allowed'); } catch {}
    setLocationConsent('allowed');
  }
  function handleLocationDisable() {
    try { localStorage.setItem(LOCATION_CONSENT_KEY, 'disabled'); } catch {}
    setLocationConsent('disabled');
  }

  function handleMessage(creator) {
    navigate(`/inbox?creatorName=${encodeURIComponent(creator.name)}&creatorAvatar=${encodeURIComponent(creator.avatar)}`);
  }

  function hideGridCreator(id) {
    const next = [...hiddenSampleIds, id];
    setHiddenSampleIds(next);
    try { localStorage.setItem(HIDDEN_SAMPLE_KEY, JSON.stringify(next)); } catch {}
  }

  function handleSeeAllNearby() {
    setNearbyOnly(true);
    setTimeout(() => gridRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  function clearAllFilters() {
    setTierFilter('All');
    setPlatformFilter([]);
    setSortBy('followers');
    setShowPast(false);
    setNearbyOnly(false);
    setDateStart('');
    setDateEnd('');
    setTmpDateStart('');
    setTmpDateEnd('');
  }

  const activeFilterCount = [
    tierFilter !== 'All',
    platformFilter.length > 0,
    sortBy !== 'followers',
    showPast,
    nearbyOnly,
    !!(dateStart && dateEnd),
  ].filter(Boolean).length;

  const nearbyCreators = CREATORS.filter(c => isNearHost(c));

  // Cache key derived from all active filter params
  const filterParams = { query, tierFilter, platformFilter, sortBy, showPast, nearbyOnly, dateStart, dateEnd };
  const searchCacheKey = cacheKey('creator_search', filterParams);

  const computeFiltered = () => {
    let base = CREATORS.filter((c) => {
      if (showPast && !c.past_collab) return false;
      if (tierFilter !== 'All' && c.tier !== tierFilter) return false;
      if (platformFilter.length > 0 && !platformFilter.every(p => c.platforms.includes(p))) return false;
      if (nearbyOnly && !isNearHost(c)) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.username.toLowerCase().includes(q) ||
          c.niches.some(n => n.toLowerCase().includes(q)) ||
          c.location.toLowerCase().includes(q) ||
          c.platforms.some(p => p.toLowerCase().includes(q))
        );
      }
      return true;
    });
    if (dateStart && dateEnd) {
      base = base.filter(c => isNearHost(c) || tripsOverlapWithHost(c, dateStart, dateEnd));
    }
    if (sortBy === 'followers') base = [...base].sort((a, b) => b.followers - a.followers);
    else if (sortBy === 'engagement') base = [...base].sort((a, b) => b.engagement - a.engagement);
    else if (sortBy === 'collabs') base = [...base].sort((a, b) => b.collab_count - a.collab_count);
    return base;
  };

  // Return cached result for this exact filter combo, or compute + cache it
  const filtered = (() => {
    const hit = cache.get(searchCacheKey);
    if (hit) return hit.filter(c => !hiddenSampleIds.includes(c.id));
    const result = computeFiltered();
    cache.set(searchCacheKey, result, 5);
    return result.filter(c => !hiddenSampleIds.includes(c.id));
  })();

  return (
    <div style={{ minHeight: '100dvh' }}>

      {/* One-time location consent modal */}
      {locationConsent === null && (
        <LocationConsentModal onAllow={handleLocationAllow} onDisable={handleLocationDisable} />
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.6rem,4vw,2rem)', color: 'var(--ink)', margin: 0, lineHeight: 1.1 }}>
            Creators
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--sage)', marginTop: '0.25rem' }}>
            Discover creators who've collaborated with properties like yours
          </p>
        </div>

        {/* ── Toolbar: search · filters dropdown · view toggle ── */}
        <div ref={gridRef} style={{ display: 'flex', gap: 10, marginBottom: '1.5rem', alignItems: 'center' }}>

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            flex: '1 1 160px', maxWidth: 320,
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.85)',
            borderRadius: 9999, padding: '0.5rem 1rem',
            boxShadow: '0 2px 10px rgba(25,37,36,0.06)',
          }}>
            <Search size={14} color="var(--sage)" style={{ flexShrink: 0 }} />
            <input
              type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, niche, platform…"
              style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink)', width: '100%' }}
            />
          </div>

          {/* Filters dropdown */}
          <div style={{ position: 'relative' }} ref={filterRef}>
            <button
              onClick={() => setFiltersOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '0.5rem 1.1rem', borderRadius: 9999,
                fontSize: '0.82rem', fontWeight: 700,
                background: filtersOpen || activeFilterCount > 0 ? 'var(--ink)' : 'rgba(255,255,255,0.78)',
                color: filtersOpen || activeFilterCount > 0 ? 'var(--bone)' : 'var(--slate)',
                border: '1px solid',
                borderColor: filtersOpen || activeFilterCount > 0 ? 'var(--ink)' : 'rgba(25,37,36,0.12)',
                backdropFilter: 'blur(16px)', cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(25,37,36,0.06)',
                transition: 'all 180ms var(--ease-out-quart)',
                fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
              }}
            >
              <SlidersHorizontal size={13} />
              Filters
              {activeFilterCount > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.22)', color: 'var(--bone)',
                  fontSize: 10, fontWeight: 800, lineHeight: 1, flexShrink: 0,
                }}>
                  {activeFilterCount}
                </span>
              )}
            </button>

            {filtersOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                zIndex: 200, width: 320,
                background: 'rgba(255,255,255,0.62)',
                backdropFilter: 'blur(32px) saturate(1.6)', WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
                border: '1px solid rgba(255,255,255,0.82)',
                borderRadius: '1.375rem',
                boxShadow: '0 8px 40px rgba(25,37,36,0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
                padding: '1.25rem',
              }}>

                {/* Creators Near You — accent green */}
                <div style={{ marginBottom: 18 }}>
                  <button
                    onClick={() => setNearbyOnly(v => !v)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '11px 14px', borderRadius: '0.875rem',
                      background: nearbyOnly ? 'rgba(60,140,106,0.15)' : 'rgba(60,140,106,0.07)',
                      border: `1.5px solid ${nearbyOnly ? 'rgba(60,140,106,0.4)' : 'rgba(60,140,106,0.2)'}`,
                      cursor: 'pointer', transition: 'all 180ms',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MapPin size={14} color="#3C8C6A" />
                      <div>
                        <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#3C8C6A' }}>Creators Near You</span>
                        <span style={{ display: 'block', fontSize: 10, color: 'rgba(60,140,106,0.7)', marginTop: 1 }}>Within {MAX_NEARBY_MILES} miles</span>
                      </div>
                    </div>
                    <div style={{
                      width: 36, height: 20, borderRadius: 9999,
                      background: nearbyOnly ? '#3C8C6A' : 'rgba(60,140,106,0.2)',
                      position: 'relative', transition: 'background 200ms', flexShrink: 0,
                    }}>
                      <div style={{
                        position: 'absolute', top: 2, left: nearbyOnly ? 18 : 2,
                        width: 16, height: 16, borderRadius: '50%',
                        background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                        transition: 'left 200ms',
                      }} />
                    </div>
                  </button>
                </div>

                {/* Creator Type */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--sage)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Creator Type
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {TIERS.map(t => (
                      <button key={t} onClick={() => setTierFilter(t)} style={{
                        padding: '5px 12px', borderRadius: 9999,
                        fontSize: '0.75rem', fontWeight: 600,
                        background: tierFilter === t ? 'var(--ink)' : 'rgba(255,255,255,0.5)',
                        color: tierFilter === t ? 'var(--bone)' : 'var(--slate)',
                        border: `1px solid ${tierFilter === t ? 'var(--ink)' : 'rgba(255,255,255,0.7)'}`,
                        cursor: 'pointer', transition: 'all 150ms', fontFamily: 'var(--font-body)',
                      }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platforms */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--sage)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Platforms
                  </p>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {['Instagram', 'TikTok', 'YouTube'].map(p => {
                      const active = platformFilter.includes(p);
                      return (
                        <button key={p} onClick={() => setPlatformFilter(prev =>
                          prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
                        )} style={{
                          padding: '5px 12px', borderRadius: 9999,
                          fontSize: '0.75rem', fontWeight: 600,
                          background: active ? 'rgba(25,37,36,0.12)' : 'rgba(255,255,255,0.5)',
                          color: active ? 'var(--ink)' : 'var(--slate)',
                          border: `1px solid ${active ? 'rgba(25,37,36,0.25)' : 'rgba(255,255,255,0.7)'}`,
                          cursor: 'pointer', transition: 'all 150ms', fontFamily: 'var(--font-body)',
                        }}>
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sort By */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--sage)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Sort By
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {[
                      { v: 'followers', l: 'Most Followers' },
                      { v: 'engagement', l: 'Highest Engagement' },
                      { v: 'collabs', l: 'Most Collabs' },
                    ].map(({ v, l }) => (
                      <button key={v} onClick={() => setSortBy(v)} style={{
                        padding: '5px 12px', borderRadius: 9999,
                        fontSize: '0.75rem', fontWeight: 600,
                        background: sortBy === v ? 'var(--ink)' : 'rgba(255,255,255,0.5)',
                        color: sortBy === v ? 'var(--bone)' : 'var(--slate)',
                        border: `1px solid ${sortBy === v ? 'var(--ink)' : 'rgba(255,255,255,0.7)'}`,
                        cursor: 'pointer', transition: 'all 150ms', fontFamily: 'var(--font-body)',
                      }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Other */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--sage)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Other
                  </p>
                  <button onClick={() => setShowPast(v => !v)} style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 14px', borderRadius: '0.75rem',
                    fontSize: '0.78rem', fontWeight: 600,
                    background: showPast ? 'rgba(74,155,127,0.15)' : 'rgba(255,255,255,0.5)',
                    color: showPast ? '#2d7d5e' : 'var(--slate)',
                    border: `1px solid ${showPast ? 'rgba(74,155,127,0.35)' : 'rgba(255,255,255,0.7)'}`,
                    cursor: 'pointer', transition: 'all 150ms', fontFamily: 'var(--font-body)',
                  }}>
                    <Check size={12} />Past Collabs Only
                  </button>
                </div>

                {/* Traveling During */}
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--sage)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={9} />Traveling During
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--sage)', marginBottom: 4 }}>From</label>
                      <input type="date" value={tmpDateStart} onChange={e => setTmpDateStart(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '0.625rem', border: '1px solid rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--sage)', marginBottom: 4 }}>To</label>
                      <input type="date" value={tmpDateEnd} min={tmpDateStart} onChange={e => setTmpDateEnd(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '0.625rem', border: '1px solid rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  {tmpDateStart && tmpDateEnd && (
                    <button
                      onClick={() => { setDateStart(tmpDateStart); setDateEnd(tmpDateEnd); setFiltersOpen(false); }}
                      style={{
                        width: '100%', padding: '8px 0', borderRadius: 9999, border: 'none',
                        background: 'var(--ink)', fontSize: 11, fontWeight: 700, color: 'var(--bone)',
                        cursor: 'pointer', fontFamily: 'var(--font-body)',
                      }}
                    >
                      Show creators traveling to {HOST_LOCATION.city}
                    </button>
                  )}
                  {dateStart && dateEnd && (
                    <p style={{ fontSize: 10, color: 'var(--sage)', margin: '6px 0 0', textAlign: 'center' }}>
                      Trips {fmtDate(dateStart)}–{fmtDate(dateEnd)}
                      <button onClick={() => { setDateStart(''); setDateEnd(''); setTmpDateStart(''); setTmpDateEnd(''); }} style={{ marginLeft: 6, fontSize: 10, color: 'var(--sage)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--font-body)', padding: 0 }}>clear</button>
                    </p>
                  )}
                </div>

                {/* Clear All */}
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    style={{
                      width: '100%', padding: '9px 0', borderRadius: 9999,
                      border: '1px solid rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.45)',
                      fontSize: 12, fontWeight: 700, color: 'var(--slate)', cursor: 'pointer',
                      fontFamily: 'var(--font-body)', transition: 'all 150ms',
                    }}
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* View toggle */}
          <div style={{ marginLeft: 'auto' }}>
            <ViewToggle mode={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {viewMode === 'grid' ? (
          <>
            {/* ── Nearby section (only if consent given) ── */}
            {locationConsent === 'allowed' && (
              <NearbyCreatorsSection
                creators={nearbyCreators}
                onSeeAll={handleSeeAllNearby}
                onMessage={handleMessage}
              />
            )}

            {/* ── Results count ── */}
            {!creatorsLoading && (
              <p style={{ fontSize: '0.78rem', color: 'var(--sage)', marginBottom: '1.25rem' }}>
                {filtered.length} creator{filtered.length !== 1 ? 's' : ''}{nearbyOnly ? ' nearby' : ''}
              </p>
            )}

            {/* ── Grid ── */}
            {creatorsLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} variant="creator" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{
                background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)',
                border: '1.5px solid rgba(255,255,255,0.7)', borderRadius: '1.25rem',
                padding: '3rem', textAlign: 'center',
              }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.4rem' }}>
                  No creators found
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--sage)', margin: 0 }}>
                  {dateStart && dateEnd
                    ? `No creators are visiting ${HOST_LOCATION.city} during those dates. Try a different range.`
                    : 'Try adjusting your search or filters.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {filtered.map((c, i) => (
                  <CreatorCard
                    key={c.id} creator={c} delay={i * 45}
                    onMessage={handleMessage}
                    onHide={c.isSample ? hideGridCreator : undefined}
                    visitingBadge={!isNearHost(c) && dateStart && dateEnd ? getVisitingBadge(c, dateStart, dateEnd) : null}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <SwipeView creators={CREATORS} />
        )}
      </div>

    </div>
  );
}
