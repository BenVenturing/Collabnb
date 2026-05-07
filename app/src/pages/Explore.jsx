import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SAMPLE_LISTINGS } from '../lib/mockData';
import { useAppBar } from '../contexts/AppBarContext';
import { useCollabs } from '../contexts/CollabContext';
import { WhereSearchContent, WhatSearchContent, WhenSearchContent, useAnimatedPlaceholder } from '../components/SearchDropdowns';

const PROP_FILTERS = ['All', 'Cabin', 'Villa', 'Treehouse', 'Glamping', 'Lodge', 'Estate', 'Cottage'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="#192524" style={{ width: 10, height: 10, flexShrink: 0 }}>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
    </svg>
  );
}

// ─── Listing Card ─────────────────────────────────────────────────────────────
function ListingCard({ listing, saved, onSave, delay, onNavigate }) {
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
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />

        {/* SAMPLE watermark */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem',
            color: '#192524', opacity: 0.07, transform: 'rotate(-25deg)',
            userSelect: 'none', letterSpacing: '0.25em',
          }}>SAMPLE</span>
        </div>

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.2rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)', lineHeight: 1.25, flex: 1 }}>
            {listing.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0, paddingTop: '0.1rem' }}>
            <StarIcon />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--ink)' }}>{listing.rating}</span>
          </div>
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
      </div>
    </div>
  );
}

// ─── Section Row ──────────────────────────────────────────────────────────────
function SectionRow({ title, subtitle, listings, saved, onSave, onNavigate, expanded, onToggleExpand, hidden }) {
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
  const searchRef = useRef(null);
  const whereRef = useRef(null);
  const whatRef = useRef(null);
  const whenRef = useRef(null);
  const whatPlaceholder = useAnimatedPlaceholder();

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

  // Filtered + curated rows
  const byPropType = (arr) =>
    propFilter === 'All' ? arr : arr.filter((l) => l.property_type === propFilter);

  const trending   = byPropType(SAMPLE_LISTINGS.filter((l) => l.is_featured));
  const forYou     = byPropType(SAMPLE_LISTINGS.filter((l) => ['Photography', 'UGC Video', 'Instagram Reels'].includes(l.collab_type)));
  const nearMe     = byPropType(SAMPLE_LISTINGS.filter((l) => ['NC', 'TN', 'SC', 'VA', 'GA'].some((s) => l.location.includes(s))));
  const allFiltered = byPropType(SAMPLE_LISTINGS);

  return (
    <div style={{ minHeight: '100dvh' }}>

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
                listings={SAMPLE_LISTINGS}
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
        {(whereVal || whatVal || whenVal) && (
          <div style={{ padding: '0 1.5rem 1.5rem', maxWidth: '680px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--sage)' }}>Showing results for</span>
              {whereVal && <span className="eyebrow-tag">{whereVal}</span>}
              {whatVal  && <span className="eyebrow-tag">{whatVal}</span>}
              {whenVal  && <span className="eyebrow-tag">{whenVal}</span>}
              <button
                onClick={() => { setWhereVal(''); setWhatVal(''); setWhenVal(''); }}
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
        />

        {allFiltered.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: '3rem', paddingBottom: '3rem' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✦</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
              No stays found
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--sage)', marginBottom: '1.5rem' }}>
              Try removing the property type filter.
            </p>
            <button className="btn-glass" onClick={() => setPropFilter('All')} style={{ fontSize: '0.875rem' }}>
              Show all types
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
