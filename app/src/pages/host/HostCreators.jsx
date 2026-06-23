import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, MessageSquare, Check, X,
  MapPin, Calendar, ChevronRight, ChevronLeft,
  SlidersHorizontal,
} from 'lucide-react';
import SkeletonCard from '../../components/SkeletonCard';
import { cache, cacheKey } from '../../lib/cache';
import CreatorAvatar from '../../components/CreatorAvatar';
import CreatorCard from '../../components/CreatorCard';
import { useAppBar } from '../../contexts/AppBarContext';
import { useAuth } from '../../contexts/AuthContext';

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
    avatar: null, followers: 84200, engagement: 9.4, collab_count: 18,
    location: 'San Francisco, CA', lat: 37.7749, lng: -122.4194,
    platforms: ['Instagram', 'TikTok'], niches: ['Travel', 'Cabins', 'Mountain'],
    isFounder: true, isSample: true, avg_reach_30d: 24600, er_30d: 7.8, past_collab: false,
    bio: 'Mountain stays and city escapes — I document the kind of travel moments that actually make people stop scrolling. My content is cinematic, texture-forward, and deeply place-specific. Past collabs include boutique cabins in Big Sur, a treehouse retreat in the Catskills, and a converted barn stay in Sonoma. I shoot and edit everything myself and typically deliver within 5 days of checkout.',
    portfolioUrl: 'https://priya.wanders.co',
    travelCalendar: [
      { id: 'tc1a', startDate: '2026-07-08', endDate: '2026-07-15', country: 'USA', city: 'Austin', note: 'Texas content trip' },
      { id: 'tc1b', startDate: '2026-08-03', endDate: '2026-08-10', country: 'USA', city: 'San Francisco', note: 'Bay Area summer run' },
      { id: 'tc1c', startDate: '2026-09-14', endDate: '2026-09-20', country: 'USA', city: 'Asheville', note: 'Fall mountain content' },
    ],
  },
  {
    id: 'c2', name: 'Maya Chen', username: 'mayachen.travel', tier: 'Influencer',
    avatar: null, followers: 218000, engagement: 6.8, collab_count: 47,
    location: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437,
    platforms: ['Instagram', 'YouTube'], niches: ['Luxury', 'Coastal', 'Villa'],
    isFounder: true, isSample: true, avg_reach_30d: 58200, er_30d: 5.4, past_collab: true,
    bio: 'Luxury hospitality creator based in LA with 218K followers across Instagram and YouTube. I specialize in editorial-quality content for boutique properties — think long-form travel vlogs, moody cinematic Reels, and photography that makes a property look like a feature spread. My audience skews 28–42, high-income, heavy travel intent. I have 47 completed collabs with a zero-complaint track record and brand partnerships with Amex Travel and Soho House.',
    portfolioUrl: 'https://mayachen.travel',
    travelCalendar: [
      { id: 'tc2a', startDate: '2026-07-20', endDate: '2026-07-28', country: 'USA', city: 'San Francisco', note: 'Bay Area luxury content tour' },
      { id: 'tc2b', startDate: '2026-08-15', endDate: '2026-08-22', country: 'USA', city: 'Malibu', note: 'Coastal property shoot' },
      { id: 'tc2c', startDate: '2026-09-05', endDate: '2026-09-12', country: 'Italy', city: 'Amalfi', note: 'European luxury series' },
    ],
  },
  {
    id: 'c3', name: 'Sam Kowalski', username: 'sam.kowalski', tier: 'UGC Pro',
    avatar: null, followers: 58300, engagement: 8.9, collab_count: 23,
    location: 'Miami, FL', lat: 25.7617, lng: -80.1918,
    platforms: ['Instagram', 'TikTok'], niches: ['Coastal', 'Ocean', 'Lifestyle'],
    isFounder: true, isSample: true, avg_reach_30d: 18900, er_30d: 7.2, past_collab: true,
    bio: 'Coastal and ocean lifestyle creator out of Miami. I produce professional-grade UGC content for water-facing properties — villas, floating homes, sailboats, surf retreats. My last villa collab generated 140K in tracked direct bookings over 60 days. I deliver fast, communicate clearly, and have never missed a deadline. My TikToks routinely hit 3–5x my follower count in organic views.',
    portfolioUrl: null,
    travelCalendar: [
      { id: 'tc3a', startDate: '2026-07-12', endDate: '2026-07-19', country: 'USA', city: 'San Francisco', note: 'West coast content run' },
      { id: 'tc3b', startDate: '2026-08-25', endDate: '2026-09-01', country: 'USA', city: 'Malibu', note: 'Coastal property features' },
      { id: 'tc3c', startDate: '2026-09-22', endDate: '2026-09-28', country: 'USA', city: 'Maui', note: 'Hawaii travel series' },
    ],
  },
  {
    id: 'c4', name: 'Lena Park', username: 'lena.explores', tier: 'UGC Pro',
    avatar: null, followers: 31500, engagement: 12.1, collab_count: 31,
    location: 'Portland, OR', lat: 45.5051, lng: -122.6750,
    platforms: ['TikTok', 'Instagram'], niches: ['Adventure', 'Cabin', 'Nature'],
    isFounder: false, isSample: true, avg_reach_30d: 14200, er_30d: 10.8, past_collab: false,
    bio: 'Adventure and nature-stay creator based in Portland. I specialize in off-the-beaten-path properties — remote cabins, forest retreats, glamping spots, and wilderness lodges. My 12.1% engagement rate speaks for itself: my audience is small but deeply activated. I shoot on Sony mirrorless, turn around final content in 4 days, and always deliver more than agreed.',
    portfolioUrl: 'https://lena.explores.io',
    travelCalendar: [],
  },
  {
    id: 'c5', name: 'Nina Okafor', username: 'ninaokafor', tier: 'Micro Influencer',
    avatar: null, followers: 67100, engagement: 10.5, collab_count: 14,
    location: 'Chicago, IL', lat: 41.8781, lng: -87.6298,
    platforms: ['Instagram', 'TikTok'], niches: ['Design', 'Boutique', 'Urban'],
    isFounder: true, isSample: true, avg_reach_30d: 22400, er_30d: 8.9, past_collab: false,
    bio: 'Design-focused travel creator with a eye for boutique properties that have a story. I blend interior photography with travel storytelling — properties I feature see measurable spikes in direct inquiry traffic. My audience is predominantly design-literate women aged 25–38 in major metros. I work best with hosts who have a distinct aesthetic point of view and properties that photograph like a mood board.',
    portfolioUrl: null, travelCalendar: [],
  },
  {
    id: 'c6', name: 'Jordan Ellis', username: 'jordanellis.co', tier: 'UGC Beginner',
    avatar: null, followers: 12400, engagement: 14.2, collab_count: 4,
    location: 'Oakland, CA', lat: 37.8044, lng: -122.2711,
    platforms: ['Instagram', 'TikTok'], niches: ['Eco', 'Sustainable', 'Design'],
    isFounder: false, isSample: true, avg_reach_30d: 8800, er_30d: 12.6, past_collab: false,
    bio: 'Sustainable travel and eco-design creator based in Oakland. I\'m early in my creator journey but my engagement rate (14.2%) consistently outperforms accounts 10x my size. I focus on eco-conscious properties, natural materials, and low-impact stays. If your property leans solar, reclaimed wood, or off-grid, I\'m your person. Looking to build my collab portfolio with hosts who actually care about sustainability.',
    portfolioUrl: 'https://jordanellis.co', travelCalendar: [],
  },
  {
    id: 'c7', name: 'Ava Torres', username: 'ava.offshore', tier: 'Micro Influencer',
    avatar: null, followers: 43900, engagement: 7.3, collab_count: 9,
    location: 'Berkeley, CA', lat: 37.8716, lng: -122.2727,
    platforms: ['Instagram'], niches: ['Water', 'Boats', 'Coastal'],
    isFounder: false, isSample: true, avg_reach_30d: 13700, er_30d: 5.8, past_collab: false,
    bio: 'Water-based travel creator specializing in floating homes, houseboats, and coastal retreats. Based in the Bay Area, I have a dedicated audience of people who dream of life on the water. My content style is unhurried and atmospheric — long golden-hour shots, morning fog on the bay, the sound of water lapping. Perfect for hosts whose property has a waterfront story to tell.',
    portfolioUrl: null, travelCalendar: [],
  },
  {
    id: 'c8', name: 'Kai Yamamoto', username: 'kai.wilderness', tier: 'UGC Beginner',
    avatar: null, followers: 9200, engagement: 18.7, collab_count: 2,
    location: 'Asheville, NC', lat: 35.5951, lng: -82.5515,
    platforms: ['Instagram', 'TikTok'], niches: ['Nature', 'Treehouse', 'Wellness'],
    isFounder: false, isSample: true, avg_reach_30d: 6100, er_30d: 16.4, past_collab: false,
    bio: 'Off-grid nature and wellness creator in Asheville, NC. My account is small but my engagement rate (18.7%) is in the top 1% for my tier — my followers don\'t just like, they share and save. I specialize in treehouse stays, wellness retreats, and nature-immersion experiences. I\'m looking for my first few major collab properties to build a portfolio around. The right stay gets my full creative attention.',
    portfolioUrl: null, travelCalendar: [],
  },
  {
    id: 'c9', name: 'Isabelle Laurent', username: 'isabelle.unpack', tier: 'Influencer',
    avatar: null, followers: 342000, engagement: 5.2, collab_count: 62,
    location: 'New York, NY', lat: 40.7128, lng: -74.0060,
    platforms: ['Instagram', 'YouTube', 'TikTok'], niches: ['Luxury', 'Fashion', 'City'],
    isFounder: true, isSample: true, avg_reach_30d: 87300, er_30d: 4.1, past_collab: false,
    bio: 'Luxury travel and fashion creator with 342K followers across Instagram, YouTube, and TikTok. I sit at the intersection of hospitality and style — my audience expects beautiful properties and I deliver. I\'ve partnered with Condé Nast Traveler, Bulgari Hotels, and 62 boutique properties. I travel 8+ months a year and my content consistently generates measurable booking lift. For hosts ready to invest in premium, high-reach exposure.',
    portfolioUrl: 'https://isabelle.unpack.co',
    travelCalendar: [
      { id: 'tc9a', startDate: '2026-07-25', endDate: '2026-08-02', country: 'USA', city: 'San Francisco', note: 'West Coast luxury tour' },
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

// ─── Dual-month calendar for host travel date filter ─────────────────────────
const HOST_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const HOST_WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function MiniCalendar({ year, month, startDate, endDate, onDayClick }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isStart = startDate === dateStr;
    const isEnd = endDate === dateStr;
    const inRange = startDate && endDate && dateStr > startDate && dateStr < endDate;
    const isPast = new Date(year, month, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    cells.push({ day: d, dateStr, isStart, isEnd, inRange, isPast });
  }
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink)', textAlign: 'center', marginBottom: 8 }}>
        {HOST_MONTHS[month]} {year}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: 4 }}>
        {HOST_WEEKDAYS.map(wd => (
          <div key={wd} style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--sage)', textAlign: 'center', padding: '2px 0', textTransform: 'uppercase' }}>{wd}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e${i}`} />;
          let bg = 'transparent';
          let color = cell.isPast ? 'rgba(149,157,144,0.5)' : 'var(--ink)';
          let radius = '8px';
          if (cell.isStart || cell.isEnd) {
            bg = '#4A9B7F'; color = 'white';
            radius = cell.isStart && cell.isEnd ? '50%' : cell.isStart ? '50% 0 0 50%' : '0 50% 50% 0';
          } else if (cell.inRange) {
            bg = 'rgba(74,155,127,0.18)'; radius = '0';
          }
          return (
            <button key={cell.day} onClick={() => !cell.isPast && onDayClick(cell.dateStr)} disabled={cell.isPast}
              style={{ width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: bg, color, fontSize: '0.8rem', fontWeight: cell.isStart || cell.isEnd ? 700 : 500,
                border: 'none', borderRadius: radius, cursor: cell.isPast ? 'default' : 'pointer',
                fontFamily: 'var(--font-body)', transition: 'background 100ms' }}
              onMouseEnter={e => { if (!cell.isPast && !cell.isStart && !cell.isEnd) e.currentTarget.style.background = 'rgba(74,155,127,0.12)'; }}
              onMouseLeave={e => { if (!cell.isPast && !cell.isStart && !cell.isEnd) e.currentTarget.style.background = cell.inRange ? 'rgba(74,155,127,0.18)' : 'transparent'; }}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HostTravelDatePicker({ dateStart, dateEnd, onApply, onClear }) {
  const [open, setOpen] = useState(false);
  const [localStart, setLocalStart] = useState('');
  const [localEnd, setLocalEnd] = useState('');
  const [baseMonth, setBaseMonth] = useState(() => new Date().getMonth());
  const [baseYear, setBaseYear] = useState(() => new Date().getFullYear());
  const ref = useRef(null);
  const isActive = !!(dateStart && dateEnd);

  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  useEffect(() => { setLocalStart(dateStart || ''); }, [dateStart]);
  useEffect(() => { setLocalEnd(dateEnd || ''); }, [dateEnd]);

  const today = new Date();
  const isAtCurrent = baseMonth === today.getMonth() && baseYear === today.getFullYear();
  const secondMonth = (baseMonth + 1) % 12;
  const secondYear = baseMonth === 11 ? baseYear + 1 : baseYear;

  function prevMonth() {
    if (isAtCurrent) return;
    if (baseMonth === 0) { setBaseMonth(11); setBaseYear(y => y - 1); }
    else setBaseMonth(m => m - 1);
  }
  function nextMonth() {
    if (baseMonth === 11) { setBaseMonth(0); setBaseYear(y => y + 1); }
    else setBaseMonth(m => m + 1);
  }

  function handleDayClick(dateStr) {
    if (!localStart || (localStart && localEnd)) { setLocalStart(dateStr); setLocalEnd(''); }
    else if (dateStr < localStart) { setLocalStart(dateStr); setLocalEnd(''); }
    else setLocalEnd(dateStr);
  }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '0.5rem 1.1rem', borderRadius: 9999,
          fontSize: '0.82rem', fontWeight: 700,
          background: isActive || open ? (isActive ? 'rgba(60,87,89,0.12)' : 'var(--ink)') : 'rgba(255,255,255,0.78)',
          color: isActive ? '#3C5759' : open ? 'var(--bone)' : 'var(--slate)',
          border: `1px solid ${isActive ? 'rgba(60,87,89,0.3)' : open ? 'var(--ink)' : 'rgba(25,37,36,0.12)'}`,
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          cursor: 'pointer', boxShadow: '0 2px 10px rgba(25,37,36,0.06)',
          fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
          transition: 'all 180ms var(--ease-out-quart)',
        }}
      >
        <Calendar size={13} />
        {isActive ? `${fmtDate(dateStart)} – ${fmtDate(dateEnd)}` : 'Travel dates'}
        {isActive && (
          <span
            onClick={e => { e.stopPropagation(); onClear(); }}
            style={{ marginLeft: 2, opacity: 0.55, lineHeight: 1, fontSize: 15, fontWeight: 400, cursor: 'pointer' }}
          >×</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 200,
          width: 480,
          background: 'rgba(248,246,243,0.97)',
          backdropFilter: 'blur(32px) saturate(1.5)', WebkitBackdropFilter: 'blur(32px) saturate(1.5)',
          border: '1.5px solid rgba(255,255,255,0.9)',
          borderRadius: '1.5rem',
          boxShadow: '0 12px 48px rgba(25,37,36,0.18)',
          padding: '1.25rem 1.5rem 1rem',
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--sage)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Find creators visiting {HOST_LOCATION.city} during…
          </p>

          {/* Month navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <button onClick={prevMonth} disabled={isAtCurrent} style={{
              width: '1.75rem', height: '1.75rem', borderRadius: '50%',
              border: '1px solid rgba(25,37,36,0.1)', background: 'rgba(255,255,255,0.6)',
              cursor: isAtCurrent ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: isAtCurrent ? 0.3 : 1, transition: 'background 130ms', flexShrink: 0,
            }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="#3C5759" strokeWidth="2" strokeLinecap="round" width="12" height="12">
                <polyline points="10 4 6 8 10 12"/>
              </svg>
            </button>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink)' }}>{HOST_MONTHS[baseMonth]} {baseYear}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>{HOST_MONTHS[secondMonth]} {secondYear}</span>
            </div>
            <button onClick={nextMonth} style={{
              width: '1.75rem', height: '1.75rem', borderRadius: '50%',
              border: '1px solid rgba(25,37,36,0.1)', background: 'rgba(255,255,255,0.6)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 130ms', flexShrink: 0,
            }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="#3C5759" strokeWidth="2" strokeLinecap="round" width="12" height="12">
                <polyline points="6 4 10 8 6 12"/>
              </svg>
            </button>
          </div>

          {/* Dual calendar */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: 12 }}>
            <MiniCalendar year={baseYear} month={baseMonth} startDate={localStart} endDate={localEnd} onDayClick={handleDayClick} />
            <MiniCalendar year={secondYear} month={secondMonth} startDate={localStart} endDate={localEnd} onDayClick={handleDayClick} />
          </div>

          {/* Selected range display */}
          {(localStart || localEnd) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '0.75rem', background: 'rgba(74,155,127,0.1)', marginBottom: 10 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)' }}>
                {localStart ? fmtDate(localStart) : '?'}
                {localEnd ? ` → ${fmtDate(localEnd)}` : ''}
              </span>
              <button onClick={() => { setLocalStart(''); setLocalEnd(''); }} style={{ fontSize: '0.72rem', color: 'var(--sage)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--font-body)', padding: 0 }}>Clear</button>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { onClear(); setLocalStart(''); setLocalEnd(''); setOpen(false); }}
              style={{ flex: 1, padding: '8px 0', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.12)', background: 'transparent', fontSize: 12, fontWeight: 700, color: 'var(--slate)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
            >
              Clear
            </button>
            <button
              onClick={() => { if (localStart && localEnd) { onApply(localStart, localEnd); setOpen(false); } }}
              disabled={!localStart || !localEnd}
              style={{ flex: 2, padding: '8px 0', borderRadius: 9999, border: 'none', background: localStart && localEnd ? 'var(--ink)' : 'rgba(25,37,36,0.1)', fontSize: 12, fontWeight: 700, color: localStart && localEnd ? 'var(--bone)' : 'var(--sage)', cursor: localStart && localEnd ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)' }}
            >
              Show creators
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Swipe animation wrapper around CreatorCard ───────────────────────────────
function SwipeCardWrapper({ creator, exitDir, onMessage, onHide }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const dynStyle = !entered
    ? { opacity: 0, transform: 'translateY(28px) scale(0.97)' }
    : exitDir === 'left'  ? { opacity: 0, transform: 'translateX(-140%) rotate(-12deg)', pointerEvents: 'none' }
    : exitDir === 'right' ? { opacity: 0, transform: 'translateX(140%) rotate(12deg)',   pointerEvents: 'none' }
    : exitDir === 'up'    ? { opacity: 0, transform: 'translateY(-110%) scale(0.9)',      pointerEvents: 'none' }
    : { opacity: 1, transform: 'none' };

  return (
    <div style={{ transition: 'transform 340ms cubic-bezier(0.25,1,0.5,1), opacity 300ms ease', ...dynStyle }}>
      <CreatorCard creator={creator} onMessage={onMessage} onHide={onHide} />
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

// ─── Swipe view (immersive full-screen) ──────────────────────────────────────
function SwipeView({ creators, onBack, savedIds, onToggleSaved }) {
  const navigate = useNavigate();
  const { setHideNav } = useAppBar();

  const [deprioIds,    setDeprioIds]    = useState(() => lsGet(DEPRIO_KEY));
  const [swipeHistory, setSwipeHistory] = useState(() => lsGet(HIST_KEY));
  const [deckIdx,      setDeckIdx]      = useState(0);
  const [exitDir,      setExitDir]      = useState(null);
  const [isAnimating,  setIsAnimating]  = useState(false);
  const [swipeQuery,   setSwipeQuery]   = useState('');
  const [swipeTier,    setSwipeTier]    = useState('All');
  const [filtersOpen,  setFiltersOpen]  = useState(false);
  const filterRef   = useRef(null);
  const savedIdsRef = useRef(savedIds);
  useEffect(() => { savedIdsRef.current = savedIds; }, [savedIds]);

  // Hide nav while in swipe mode, restore on exit
  useEffect(() => {
    setHideNav(true);
    return () => setHideNav(false);
  }, [setHideNav]);

  // Close filters on outside click
  useEffect(() => {
    if (!filtersOpen) return;
    const h = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFiltersOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [filtersOpen]);

  // Reset deck position when filters change
  useEffect(() => { setDeckIdx(0); }, [swipeTier, swipeQuery]);

  const deck = useMemo(() => {
    const deprioSet = new Set(deprioIds);
    let base = creators;
    if (swipeTier !== 'All') base = base.filter(c => c.tier === swipeTier);
    if (swipeQuery.trim()) {
      const q = swipeQuery.toLowerCase();
      base = base.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q)
      );
    }
    return [
      ...base.filter(c => !deprioSet.has(c.id)),
      ...base.filter(c =>  deprioSet.has(c.id)),
    ];
  }, [creators, deprioIds, swipeTier, swipeQuery]);

  const currentCreator = deck[deckIdx] ?? null;
  const canUndo = swipeHistory.length > 0 && deckIdx > 0;

  function goToInbox(creator) {
    setHideNav(false);
    navigate(`/inbox?creatorName=${encodeURIComponent(creator.name)}&creatorAvatar=${encodeURIComponent(creator.avatar ?? '')}`);
  }

  function mutateSaved(creatorId, add) {
    const cur = savedIdsRef.current;
    if (add === cur.includes(creatorId)) return; // already in desired state
    onToggleSaved?.(creatorId);
  }

  const handleSwipe = useCallback((dir) => {
    if (isAnimating || !currentCreator) return;
    setIsAnimating(true);
    setExitDir(dir);

    setTimeout(() => {
      if (dir === 'right') {
        mutateSaved(currentCreator.id, true);
      } else if (dir === 'left') {
        const next = [...deprioIds, currentCreator.id];
        setDeprioIds(next); lsSet(DEPRIO_KEY, next);
      } else if (dir === 'up') {
        goToInbox(currentCreator);
        return;
      }
      const nextHist = [...swipeHistory, { id: currentCreator.id, action: dir }];
      setSwipeHistory(nextHist); lsSet(HIST_KEY, nextHist);
      setDeckIdx(i => i + 1);
      setExitDir(null);
      setIsAnimating(false);
    }, 340);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnimating, currentCreator, deprioIds, swipeHistory]);

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const last = swipeHistory[swipeHistory.length - 1];
    const nextHist = swipeHistory.slice(0, -1);
    setSwipeHistory(nextHist); lsSet(HIST_KEY, nextHist);
    if (last.action === 'right') {
      mutateSaved(last.id, false);
    } else if (last.action === 'left') {
      const next = deprioIds.filter(id => id !== last.id);
      setDeprioIds(next); lsSet(DEPRIO_KEY, next);
    }
    setDeckIdx(i => i - 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUndo, swipeHistory, deprioIds]);

  const swipeRef = useRef(handleSwipe);
  const undoRef  = useRef(handleUndo);
  useEffect(() => { swipeRef.current = handleSwipe; }, [handleSwipe]);
  useEffect(() => { undoRef.current  = handleUndo;  }, [handleUndo]);

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); swipeRef.current('left');  }
      if (e.key === 'ArrowRight') { e.preventDefault(); swipeRef.current('right'); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); swipeRef.current('up');    }
      if (e.key === 'z' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); undoRef.current(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const savedCreators = creators.filter(c => savedIds.includes(c.id));

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(8,13,12,0.9)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* ── Top bar ── */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '1rem 1.25rem 0.75rem',
      }}>
        {/* Back to grid */}
        <button
          onClick={onBack}
          style={{
            flexShrink: 0, width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', backdropFilter: 'blur(8px)',
            transition: 'background 150ms',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          title="Back to grid"
        >
          <ChevronLeft size={18} color="#fff" />
        </button>

        {/* Search */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.13)',
          borderRadius: 9999, padding: '0.4rem 1rem',
          backdropFilter: 'blur(12px)',
        }}>
          <Search size={13} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0 }} />
          <input
            type="text" value={swipeQuery} onChange={e => setSwipeQuery(e.target.value)}
            placeholder="Search creators…"
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.82rem', color: '#fff', width: '100%', fontFamily: 'var(--font-body)' }}
          />
          {swipeQuery && (
            <button onClick={() => setSwipeQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'rgba(255,255,255,0.35)' }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div ref={filterRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setFiltersOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0.4rem 0.875rem', borderRadius: 9999,
              fontSize: '0.78rem', fontWeight: 700,
              background: filtersOpen || swipeTier !== 'All' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.09)',
              color: '#fff', border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            <SlidersHorizontal size={12} />
            Filters
            {swipeTier !== 'All' && (
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>1</span>
            )}
          </button>
          {filtersOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 10,
              width: 240,
              background: 'rgba(18,26,25,0.97)', backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '1rem', padding: '1rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Creator Type</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {TIERS.map(t => (
                  <button key={t} onClick={() => { setSwipeTier(t); setFiltersOpen(false); }} style={{
                    padding: '4px 10px', borderRadius: 9999,
                    fontSize: '0.72rem', fontWeight: 600,
                    background: swipeTier === t ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.08)',
                    color: swipeTier === t ? 'var(--ink)' : 'rgba(255,255,255,0.65)',
                    border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Progress counter */}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', flexShrink: 0, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
          {currentCreator ? `${deckIdx + 1} / ${deck.length}` : `${deck.length} done`}
        </span>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1.25rem 2rem' }}>

        {/* Card */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: savedCreators.length > 0 ? '2rem' : 0 }}>
          <div style={{ width: '100%', maxWidth: 420 }}>
            {currentCreator ? (
              <SwipeCardWrapper
                key={`${deckIdx}-${swipeTier}-${swipeQuery}`}
                creator={currentCreator}
                exitDir={exitDir}
                onMessage={goToInbox}
              />
            ) : (
              <div style={{
                borderRadius: '1.375rem',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '3rem 2rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center',
              }}>
                <div style={{ fontSize: 44 }}>✓</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#fff' }}>All caught up!</div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', maxWidth: 220, margin: 0, lineHeight: 1.5 }}>
                  You've reviewed all {deck.length} creators. Undo to revisit any.
                </p>
              </div>
            )}

            {/* Keyboard hints */}
            {currentCreator && (
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
                {[{ key: '←', label: 'Skip' }, { key: '→', label: 'Save' }, { key: '↑', label: 'Message' }].map(({ key, label }) => (
                  <span key={key} style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <kbd style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.45)' }}>{key}</kbd>
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Saved section */}
        {savedCreators.length > 0 && (
          <div style={{ maxWidth: 420, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: 0, letterSpacing: '0.02em' }}>Saved</h3>
              <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: 'rgba(126,207,196,0.2)', color: '#7ecfc4' }}>
                {savedCreators.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {savedCreators.map(c => (
                <SavedContactRow key={c.id} creator={c} onMessage={goToInbox} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HostCreators() {
  const navigate = useNavigate();
  const { profile, toggleSavedCreator: toggleSaved } = useAuth();
  const savedCreatorIds = profile?.saved_creator_ids ?? [];

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
  const [savedOnly,        setSavedOnly]        = useState(false);
  const [dateStart,        setDateStart]        = useState('');
  const [dateEnd,          setDateEnd]          = useState('');
  const [hiddenSampleIds,  setHiddenSampleIds]  = useState(() => {
    try { return JSON.parse(localStorage.getItem(HIDDEN_SAMPLE_KEY) || '[]'); } catch { return []; }
  });
  const [filtersOpen,      setFiltersOpen]      = useState(false);

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
    setSavedOnly(false);
    setDateStart('');
    setDateEnd('');
  }

  const activeFilterCount = [
    tierFilter !== 'All',
    platformFilter.length > 0,
    showPast,
    nearbyOnly,
    savedOnly,
    !!(dateStart && dateEnd),
  ].filter(Boolean).length;

  const nearbyCreators = CREATORS.filter(c => isNearHost(c));

  const profileSavedIds = profile?.saved_creator_ids ?? [];

  // Cache key derived from all active filter params (incl. saved ids, since savedOnly depends on them)
  const filterParams = { query, tierFilter, platformFilter, sortBy, showPast, nearbyOnly, savedOnly, dateStart, dateEnd, savedIds: profileSavedIds };
  const searchCacheKey = cacheKey('creator_search', filterParams);

  const computeFiltered = () => {
    let base = CREATORS.filter((c) => {
      if (showPast && !c.past_collab) return false;
      if (tierFilter !== 'All' && c.tier !== tierFilter) return false;
      if (platformFilter.length > 0 && !platformFilter.every(p => c.platforms.includes(p))) return false;
      if (nearbyOnly && !isNearHost(c)) return false;
      if (savedOnly && !profileSavedIds.includes(c.id)) return false;
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

                {/* Saved Only */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--sage)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Saved
                  </p>
                  <button onClick={() => setSavedOnly(v => !v)} style={{
                    padding: '5px 12px', borderRadius: 9999,
                    fontSize: '0.75rem', fontWeight: 600,
                    background: savedOnly ? 'var(--ink)' : 'rgba(255,255,255,0.5)',
                    color: savedOnly ? 'var(--bone)' : 'var(--slate)',
                    border: `1px solid ${savedOnly ? 'var(--ink)' : 'rgba(255,255,255,0.7)'}`,
                    cursor: 'pointer', transition: 'all 150ms', fontFamily: 'var(--font-body)',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    {savedOnly ? '❤️' : '♡'} Saved Only
                    {profileSavedIds.length > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: savedOnly ? 'rgba(255,255,255,0.7)' : 'var(--sage)' }}>
                        ({profileSavedIds.length})
                      </span>
                    )}
                  </button>
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

          {/* Travel date filter */}
          <HostTravelDatePicker
            dateStart={dateStart}
            dateEnd={dateEnd}
            onApply={(s, e) => { setDateStart(s); setDateEnd(e); }}
            onClear={() => { setDateStart(''); setDateEnd(''); }}
          />

          {/* View toggle */}
          <div style={{ marginLeft: 'auto' }}>
            <ViewToggle mode={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {viewMode === 'grid' ? (
          <>
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
                    saved={savedCreatorIds.includes(c.id)}
                    onToggleSave={toggleSaved}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <SwipeView
            creators={CREATORS}
            onBack={() => setViewMode('grid')}
            savedIds={savedCreatorIds}
            onToggleSaved={toggleSaved}
          />
        )}
      </div>

    </div>
  );
}
