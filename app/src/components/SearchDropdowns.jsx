import { useState, useEffect, useRef } from 'react';
import { DESTINATIONS, COLLAB_TYPES } from '../lib/searchData';
import { formatDate } from '../lib/dateUtils';

// ─── Animated placeholder hook (typewriter + thinking dots) ────────────────
const WHAT_PLACEHOLDERS = [
  'UGC Video', '1 deliverable', 'Instagram Reels', '3 deliverables',
  'Photography', '5 deliverables', 'TikTok', '10 deliverables',
  'YouTube Vlog', 'Blog Post', 'Full Package',
];

export function useAnimatedPlaceholder() {
  const [display, setDisplay] = useState('');
  const idxRef = useRef(0);
  const charRef = useRef(0);

  useEffect(() => {
    let timer;

    const tick = () => {
      const text = WHAT_PLACEHOLDERS[idxRef.current];

      if (charRef.current < text.length) {
        // Typing phase — add next character
        charRef.current++;
        setDisplay(text.slice(0, charRef.current));
        timer = setTimeout(tick, 65);
      } else {
        // Done typing — show up to 3 dots then advance
        const dotCount = (charRef.current - text.length + 1);
        if (dotCount <= 3) {
          setDisplay(text + ' ' + '.'.repeat(dotCount));
          charRef.current++;
          timer = setTimeout(tick, 350);
        } else {
          // Move to next word
          idxRef.current = (idxRef.current + 1) % WHAT_PLACEHOLDERS.length;
          charRef.current = 0;
          timer = setTimeout(tick, 800);
        }
      }
    };

    timer = setTimeout(tick, 200);
    return () => clearTimeout(timer);
  }, []);

  return display;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── Destination region groupings ──────────────────────────────────────────────
const REGIONS = [
  { name: 'Near You',   flag: '📍', labels: ['Asheville, NC', 'Gatlinburg, TN', 'Charleston, SC'] },
  { name: 'West Coast', flag: '🌊', labels: ['Malibu, CA', 'Lake Tahoe, CA', 'Joshua Tree, CA', 'Napa Valley, CA'] },
  { name: 'Mountain & Desert', flag: '🏔️', labels: ['Aspen, CO', 'Sedona, AZ'] },
];

// ─── Where search content (scrollable, grouped by region + nearby stays) ──────
export function WhereSearchContent({ whereVal, setWhereVal, onClose, listings = [] }) {
  const q = whereVal.toLowerCase().trim();

  // Filter regions & destinations by query
  const filteredRegions = q
    ? REGIONS.map((r) => ({
        ...r,
        dests: DESTINATIONS.filter(
          (d) => r.labels.includes(d.label) && (d.label.toLowerCase().includes(q) || d.desc.toLowerCase().includes(q))
        ),
      })).filter((r) => r.dests.length > 0)
    : REGIONS.map((r) => ({
        ...r,
        dests: DESTINATIONS.filter((d) => r.labels.includes(d.label)),
      }));

  const hasExact = DESTINATIONS.some((d) => d.label.toLowerCase() === q);

  // Nearby stays — match listings by location or title
  const nearbyStays = q
    ? listings.filter((l) => l.location.toLowerCase().includes(q) || l.title.toLowerCase().includes(q))
    : listings.slice(0, 6);

  return (
    <div style={{ maxHeight: '440px', overflowY: 'auto' }}>
      {/* Nearby Locations */}
      {filteredRegions.length > 0 && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            marginBottom: '0.625rem', position: 'sticky', top: 0,
            background: 'rgba(255,255,255,0.95)', zIndex: 1, paddingTop: '0.15rem', paddingBottom: '0.15rem',
          }}>
            <span style={{ fontSize: '1rem' }}>🇺🇸</span>
            <p style={{
              fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.14em', color: 'var(--sage)', margin: 0,
            }}>
              {q ? 'Matching Locations' : 'Nearby Locations'} — United States
            </p>
          </div>
          {filteredRegions.map((region) => (
            <div key={region.name} style={{ marginBottom: '0.625rem' }}>
              <p style={{
                fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: 'var(--slate)', marginBottom: '0.25rem',
                paddingLeft: '0.25rem',
              }}>
                {region.flag} {region.name}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {region.dests.map((d) => (
                  <button
                    key={d.label}
                    onClick={() => { setWhereVal(d.label); onClose?.(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 0.75rem', borderRadius: '0.75rem',
                      background: whereVal === d.label ? 'rgba(209,235,219,0.55)' : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'var(--font-body)',
                      transition: 'background 130ms', width: '100%',
                    }}
                    onMouseEnter={(e) => { if (whereVal !== d.label) e.currentTarget.style.background = 'rgba(209,235,219,0.35)'; }}
                    onMouseLeave={(e) => { if (whereVal !== d.label) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: '1rem', width: '1.5rem', textAlign: 'center', flexShrink: 0 }}>
                      {d.emoji}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 }}>{d.label}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--sage)', marginTop: '0.05rem' }}>{d.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Worldwide search option */}
      {q && !hasExact && (
        <button
          onClick={() => { onClose?.(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 0.75rem', borderRadius: '0.875rem',
            background: 'rgba(209,235,219,0.35)', border: '1px dashed rgba(25,37,36,0.15)',
            cursor: 'pointer', textAlign: 'left', width: '100%',
            transition: 'background 130ms', fontFamily: 'var(--font-body)',
            marginBottom: '0.75rem',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(209,235,219,0.55)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(209,235,219,0.35)'; }}
        >
          <span style={{ fontSize: '1rem' }}>🌍</span>
          <div>
            <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink)' }}>Search for "{whereVal}"</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--sage)', marginTop: '0.1rem' }}>Worldwide location — show results</p>
          </div>
        </button>
      )}

      {/* Nearby Stays */}
      {nearbyStays.length > 0 && !q && (
        <div style={{ marginTop: '0.25rem', borderTop: '1px solid rgba(25,37,36,0.06)', paddingTop: '0.75rem' }}>
          <p style={{
            fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.14em', color: 'var(--sage)', marginBottom: '0.5rem',
          }}>
            Nearby Stays
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {nearbyStays.map((l) => (
              <button
                key={l.id}
                onClick={() => { setWhereVal(l.location); onClose?.(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                  padding: '0.5rem 0.75rem', borderRadius: '0.75rem',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  textAlign: 'left', fontFamily: 'var(--font-body)',
                  transition: 'background 130ms', width: '100%',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(209,235,219,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <img
                  src={l.image}
                  alt=""
                  style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>{l.title}</p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--sage)', marginTop: '0.05rem' }}>{l.location}</p>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--sage)', flexShrink: 0 }}>
                  {l.collab_type}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!q && filteredRegions.length === 0 && nearbyStays.length === 0 && (
        <p style={{ fontSize: '0.85rem', color: 'var(--sage)', textAlign: 'center', padding: '1rem 0' }}>
          Type a destination or location
        </p>
      )}
    </div>
  );
}

// ─── What search content (clickable filters + earnings sliders) ──────────────
export function WhatSearchContent({ whatVal, setWhatVal, onClose, typeQuery = '' }) {
  const DELIVERABLE_COUNTS = ['1', '3', '5', '10', '15+'];

  // Parse current whatVal
  const parseWhat = (val) => {
    if (!val) return { type: '', deliverables: '', freeStay: false, nights: '', collabValue: '' };
    const parts = val.split(' · ');
    const type = parts.find((p) => COLLAB_TYPES.some((ct) => ct.label === p)) || '';
    const delMatch = parts.find((p) => /\d+\s*deliverable/i.test(p));
    const deliverables = delMatch ? delMatch.match(/(\d+)/)?.[1] || '' : '';
    const freeStay = parts.some((p) => p === 'Free stay');
    const nightMatch = parts.find((p) => /\d+\s*nights?/i.test(p));
    const nights = nightMatch ? nightMatch.match(/(\d+)/)?.[1] || '' : '';
    const valueMatch = parts.find((p) => p.startsWith('$'));
    const collabValue = valueMatch ? valueMatch.replace('$', '') : '';
    return { type, deliverables, freeStay, nights, collabValue };
  };

  const parsed = parseWhat(whatVal);
  const [localType, setLocalType] = useState(parsed.type);
  const [localDel, setLocalDel] = useState(parsed.deliverables);
  const [freeStay, setFreeStay] = useState(parsed.freeStay);
  const [nights, setNights] = useState(parsed.nights || '7');
  const [collabValue, setCollabValue] = useState(parsed.collabValue || '1000');

  const updateVal = (newType, newDel, newFreeStay, newNights, newValue) => {
    const parts = [];
    if (newType) parts.push(newType);
    if (newDel) parts.push(`${newDel} deliverables`);
    if (newFreeStay) parts.push('Free stay');
    if (newFreeStay && newNights) parts.push(`${newNights} nights`);
    if (!newFreeStay && newValue) parts.push(`$${newValue}`);
    setWhatVal(parts.join(' · '));
  };

  const handleType = (label) => {
    const next = localType === label ? '' : label;
    setLocalType(next);
    updateVal(next, localDel, freeStay, nights, collabValue);
  };

  const handleDel = (count) => {
    const next = localDel === count ? '' : count;
    setLocalDel(next);
    updateVal(localType, next, freeStay, nights, collabValue);
  };

  const handleFreeStayToggle = (val) => {
    setFreeStay(val);
    updateVal(localType, localDel, val, nights, collabValue);
  };

  const handleNights = (val) => {
    setNights(val);
    updateVal(localType, localDel, freeStay, val, collabValue);
  };

  const handleValue = (val) => {
    setCollabValue(val);
    updateVal(localType, localDel, freeStay, nights, val);
  };

  // Filter chips by typeQuery if provided (from the search bar input)
  const filteredTypes = typeQuery
    ? COLLAB_TYPES.filter((ct) =>
        ct.label.toLowerCase().includes(typeQuery.toLowerCase())
      )
    : COLLAB_TYPES;

  return (
    <>
      {/* Collab Type */}
      <p style={{
        fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.14em', color: 'var(--sage)', marginBottom: '0.5rem',
      }}>
        Collab Type
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1rem' }}>
        {filteredTypes.map((ct) => {
          const active = localType === ct.label;
          return (
            <button
              key={ct.label}
              onClick={() => handleType(ct.label)}
              style={{
                padding: '0.4rem 0.85rem', borderRadius: '9999px',
                border: '1px solid', cursor: 'pointer',
                borderColor: active ? 'var(--ink)' : 'rgba(25,37,36,0.12)',
                background: active ? 'var(--ink)' : 'rgba(255,255,255,0.6)',
                color: active ? 'var(--bone)' : 'var(--slate)',
                fontSize: '0.78rem', fontWeight: 500,
                transition: 'all 140ms', fontFamily: 'var(--font-body)',
              }}
            >
              {ct.label}
            </button>
          );
        })}
      </div>

      {/* Deliverables */}
      <p style={{
        fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.14em', color: 'var(--sage)', marginBottom: '0.5rem',
      }}>
        Deliverables
      </p>
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {DELIVERABLE_COUNTS.map((count) => {
          const active = localDel === count;
          return (
            <button
              key={count}
              onClick={() => handleDel(count)}
              style={{
                padding: '0.35rem 0.8rem', borderRadius: '9999px', cursor: 'pointer',
                border: '1px solid',
                borderColor: active ? 'var(--ink)' : 'rgba(25,37,36,0.12)',
                background: active ? 'var(--ink)' : 'rgba(255,255,255,0.6)',
                color: active ? 'var(--bone)' : 'var(--slate)',
                fontSize: '0.78rem', fontWeight: 500,
                transition: 'all 140ms', fontFamily: 'var(--font-body)',
              }}
            >
              {count} {count === '1' ? 'deliverable' : 'deliverables'}
            </button>
          );
        })}
      </div>

      {/* ── Earnings ────────────────────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid rgba(25,37,36,0.08)', paddingTop: '1rem',
      }}>
        <p style={{
          fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.14em', color: 'var(--sage)', marginBottom: '0.75rem',
        }}>
          Earnings
        </p>

        {/* Free stay toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {['Paid', 'Free stay'].map((opt) => {
            const active = opt === 'Free stay' ? freeStay : !freeStay;
            return (
              <button
                key={opt}
                onClick={() => handleFreeStayToggle(opt === 'Free stay')}
                style={{
                  flex: 1, padding: '0.5rem', borderRadius: '0.75rem', cursor: 'pointer',
                  border: '1px solid',
                  borderColor: active ? 'var(--ink)' : 'rgba(25,37,36,0.12)',
                  background: active ? 'var(--ink)' : 'rgba(255,255,255,0.6)',
                  color: active ? 'var(--bone)' : 'var(--slate)',
                  fontSize: '0.78rem', fontWeight: 500,
                  fontFamily: 'var(--font-body)', transition: 'all 140ms',
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {freeStay ? (
          /* Nights slider */
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--slate)' }}>Nights</p>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink)' }}>{nights}</p>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={nights}
              onChange={(e) => handleNights(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--ink)', height: '4px', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--sage)' }}>1 night</span>
              <span style={{ fontSize: '0.62rem', color: 'var(--sage)' }}>30 nights</span>
            </div>
          </div>
        ) : (
          /* Collab value slider */
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--slate)' }}>Collab Value</p>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink)' }}>${Number(collabValue).toLocaleString()}</p>
            </div>
            <input
              type="range"
              min="0"
              max="5000"
              step="100"
              value={collabValue}
              onChange={(e) => handleValue(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--ink)', height: '4px', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--sage)' }}>$0</span>
              <span style={{ fontSize: '0.62rem', color: 'var(--sage)' }}>$5,000+</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── When search content (visual calendar date picker) ──────────────────────
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function CalendarMonth({ year, month, startDate, endDate, onDayClick }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells = [];
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) cells.push(null);

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isStart = startDate === dateStr;
    const isEnd = endDate === dateStr;
    const inRange = startDate && endDate && dateStr >= startDate && dateStr <= endDate;
    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isToday = date.getTime() === today.getTime();

    cells.push({ day: d, dateStr, isStart, isEnd, inRange, isPast, isToday });
  }

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{
        fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)',
        textAlign: 'center', marginBottom: '0.5rem',
      }}>
        {MONTHS[month]} {year}
      </p>
      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
        {WEEKDAYS.map((wd) => (
          <div key={wd} style={{
            fontSize: '0.65rem', fontWeight: 700, color: 'var(--sage)',
            textAlign: 'center', padding: '0.25rem 0', textTransform: 'uppercase',
          }}>
            {wd}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e${i}`} />;

          let bg = 'transparent';
          let color = cell.isPast ? 'var(--sage)' : 'var(--ink)';
          let radius = '0';

          if (cell.isStart || cell.isEnd) {
            bg = '#4A9B7F';
            color = 'white';
            radius = cell.isStart && cell.isEnd ? '50%' : cell.isStart ? '50% 0 0 50%' : '0 50% 50% 0';
          } else if (cell.inRange) {
            bg = 'rgba(74,155,127,0.2)';
          }

          return (
            <button
              key={cell.day}
              onClick={() => !cell.isPast && onDayClick(cell.dateStr)}
              disabled={cell.isPast}
              style={{
                width: '100%', aspectRatio: '1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: bg, color,
                fontSize: '0.85rem', fontWeight: cell.isStart || cell.isEnd ? 700 : cell.isToday ? 700 : 500,
                border: cell.isToday && !cell.isStart && !cell.isEnd ? '2px solid #4A9B7F' : 'none',
                borderRadius: radius || (cell.isToday ? '50%' : '8px'),
                cursor: cell.isPast ? 'default' : 'pointer',
                fontFamily: 'var(--font-body)',
                transition: 'background 100ms',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!cell.isPast && !cell.isStart && !cell.isEnd) {
                  e.currentTarget.style.background = 'rgba(74,155,127,0.12)';
                }
              }}
              onMouseLeave={(e) => {
                if (!cell.isPast && !cell.isStart && !cell.isEnd) {
                  e.currentTarget.style.background = cell.inRange ? 'rgba(74,155,127,0.2)' : 'transparent';
                }
              }}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const DURATION_OPTIONS = ['Weekend', '1 Week', '2 Weeks', 'Month'];
const FLEX_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function WhenSearchContent({ whenVal, setWhenVal, onClose }) {
  const today = new Date();
  const [baseMonth, setBaseMonth] = useState(today.getMonth());
  const [baseYear, setBaseYear] = useState(today.getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Date mode: 'exact' | 'flexible'
  const isFlex = whenVal.startsWith('Flexible:');
  const [dateMode, setDateMode] = useState(isFlex ? 'flexible' : 'exact');
  const [flexDuration, setFlexDuration] = useState('');
  const [flexMonth, setFlexMonth] = useState('');

  // Parse existing whenVal on first render
  const parsedRef = useRef(false);
  useEffect(() => {
    if (!parsedRef.current && whenVal) {
      parsedRef.current = true;
      if (whenVal.startsWith('Flexible:')) {
        setDateMode('flexible');
        const rest = whenVal.replace('Flexible: ', '');
        const parts = rest.split(' in ');
        if (parts[0]) setFlexDuration(parts[0]);
        if (parts[1]) setFlexMonth(parts[1]);
      } else {
        const parts = whenVal.split(' → ');
        if (parts[0]) setStartDate(parts[0]);
        if (parts[1]) setEndDate(parts[1]);
      }
    }
  }, [whenVal]);

  const updateParent = (start, end) => {
    if (start && end) {
      setWhenVal(`${start} → ${end}`);
    } else if (start) {
      setWhenVal(start);
    } else {
      setWhenVal('');
    }
  };

  const handleDayClick = (dateStr) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(dateStr);
      setEndDate('');
      updateParent(dateStr, '');
    } else {
      if (dateStr < startDate) {
        setStartDate(dateStr);
        setEndDate('');
        updateParent(dateStr, '');
      } else {
        setEndDate(dateStr);
        updateParent(startDate, dateStr);
      }
    }
  };

  const isAtCurrentMonth = baseMonth === today.getMonth() && baseYear === today.getFullYear();

  const prevMonth = () => {
    if (isAtCurrentMonth) return;
    if (baseMonth === 0) {
      setBaseMonth(11);
      setBaseYear((y) => y - 1);
    } else {
      setBaseMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (baseMonth === 11) {
      setBaseMonth(0);
      setBaseYear((y) => y + 1);
    } else {
      setBaseMonth((m) => m + 1);
    }
  };

  const secondMonth = (baseMonth + 1) % 12;
  const secondYear = baseMonth === 11 ? baseYear + 1 : baseYear;

  const formatDisplay = (dateStr) => formatDate(dateStr);

  const clearDates = () => {
    setStartDate('');
    setEndDate('');
    setFlexDuration('');
    setFlexMonth('');
    setWhenVal('');
  };

  const toggleMode = () => {
    const next = dateMode === 'exact' ? 'flexible' : 'exact';
    setDateMode(next);
    if (next === 'flexible') {
      setWhenVal('');
      setStartDate('');
      setEndDate('');
    } else {
      setWhenVal('');
      setFlexDuration('');
      setFlexMonth('');
    }
  };

  const handleFlexDuration = (d) => {
    const next = flexDuration === d ? '' : d;
    setFlexDuration(next);
    if (next && flexMonth) {
      setWhenVal(`Flexible: ${next} in ${flexMonth}`);
    }
  };

  const handleFlexMonth = (m) => {
    const next = flexMonth === m ? '' : m;
    setFlexMonth(next);
    if (flexDuration && next) {
      setWhenVal(`Flexible: ${flexDuration} in ${next}`);
    }
  };

  // +/- day modifiers for exact dates
  const dayFlexLabel = (days) => {
    if (!startDate) return null;
    if (endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
      return `±${days} day — ${diffDays - 1}-${diffDays + days} nights`;
    }
    return `±${days} day`;
  };

  return (
    <>
      {/* ── Exact / Flexible toggle ────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '0.375rem',
        marginBottom: dateMode === 'exact' ? '0.875rem' : '0',
        background: 'rgba(209,235,219,0.3)',
        borderRadius: '9999px', padding: '3px',
      }}>
        {['Exact dates', 'Flexible dates'].map((opt) => {
          const active = (opt === 'Exact dates') === (dateMode === 'exact');
          return (
            <button
              key={opt}
              onClick={toggleMode}
              style={{
                flex: 1, padding: '0.45rem 0.5rem', borderRadius: '9999px',
                border: 'none', cursor: 'pointer',
                background: active ? 'white' : 'transparent',
                color: active ? 'var(--ink)' : 'var(--sage)',
                fontSize: '0.75rem', fontWeight: active ? 600 : 500,
                fontFamily: 'var(--font-body)',
                transition: 'all 180ms',
                boxShadow: active ? '0 1px 4px rgba(25,37,36,0.08)' : 'none',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* ── Exact dates mode ──────────────────────────────────────────── */}
      {dateMode === 'exact' && (
        <>
          {/* Month/Year navigation buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <button
              onClick={prevMonth}
              disabled={isAtCurrentMonth}
              style={{
                width: '1.75rem', height: '1.75rem', borderRadius: '50%',
                border: '1px solid rgba(25,37,36,0.1)', background: 'rgba(255,255,255,0.6)',
                cursor: isAtCurrentMonth ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 130ms',
                opacity: isAtCurrentMonth ? 0.3 : 1,
              }}
              onMouseEnter={(e) => { if (!isAtCurrentMonth) e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; }}
              onMouseLeave={(e) => { if (!isAtCurrentMonth) e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="#3C5759" strokeWidth="2" strokeLinecap="round" width="12" height="12">
                <polyline points="10 4 6 8 10 12"/>
              </svg>
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink)' }}>
              {MONTHS[baseMonth]} {baseYear}
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sage)' }}>
              {MONTHS[secondMonth]} {secondYear}
            </span>
            <button
              onClick={nextMonth}
              style={{
                width: '1.75rem', height: '1.75rem', borderRadius: '50%',
                border: '1px solid rgba(25,37,36,0.1)', background: 'rgba(255,255,255,0.6)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 130ms',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.9)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="#3C5759" strokeWidth="2" strokeLinecap="round" width="12" height="12">
                <polyline points="6 4 10 8 6 12"/>
              </svg>
            </button>
          </div>

          {/* Two-month calendar grid */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.625rem' }}>
            <CalendarMonth
              year={baseYear}
              month={baseMonth}
              startDate={startDate}
              endDate={endDate}
              onDayClick={handleDayClick}
            />
            <CalendarMonth
              year={secondYear}
              month={secondMonth}
              startDate={startDate}
              endDate={endDate}
              onDayClick={handleDayClick}
            />
          </div>

          {/* +/- day flexibility chips */}
          {startDate && !endDate && (
            <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.625rem' }}>
              {[1, 2].map((n) => (
                <button
                  key={n}
                  style={{
                    padding: '0.3rem 0.7rem', borderRadius: '9999px',
                    border: '1px solid rgba(25,37,36,0.1)',
                    background: 'rgba(255,255,255,0.6)',
                    color: 'var(--slate)', fontSize: '0.7rem', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                    transition: 'background 130ms',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(209,235,219,0.4)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
                >
                  +/− {n} day{ n > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          )}

          {/* Selected range display */}
          {(startDate || endDate) && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.5rem 0.75rem', borderRadius: '0.75rem',
              background: 'rgba(74,155,127,0.1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)' }}>
                  {startDate ? formatDisplay(startDate) : '?'}
                </span>
                {endDate && (
                  <>
                    <span style={{ color: 'var(--sage)', fontSize: '0.75rem' }}>→</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)' }}>
                      {formatDisplay(endDate)}
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={clearDates}
                style={{
                  fontSize: '0.72rem', color: 'var(--sage)', background: 'none',
                  border: 'none', cursor: 'pointer', textDecoration: 'underline',
                  textDecorationColor: 'rgba(149,157,144,0.4)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Clear
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Flexible dates mode ───────────────────────────────────────── */}
      {dateMode === 'flexible' && (
        <>
          {/* Duration */}
          <p style={{
            fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.14em', color: 'var(--sage)', marginBottom: '0.5rem',
            marginTop: '0.75rem',
          }}>
            How long would you want your collab to be?
          </p>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {DURATION_OPTIONS.map((d) => {
              const active = flexDuration === d;
              return (
                <button
                  key={d}
                  onClick={() => handleFlexDuration(d)}
                  style={{
                    padding: '0.4rem 0.85rem', borderRadius: '9999px',
                    border: '1px solid', cursor: 'pointer',
                    borderColor: active ? 'var(--ink)' : 'rgba(25,37,36,0.12)',
                    background: active ? 'var(--ink)' : 'rgba(255,255,255,0.6)',
                    color: active ? 'var(--bone)' : 'var(--slate)',
                    fontSize: '0.78rem', fontWeight: 500,
                    transition: 'all 140ms', fontFamily: 'var(--font-body)',
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* Month */}
          <p style={{
            fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.14em', color: 'var(--sage)', marginBottom: '0.5rem',
          }}>
            What month are you looking for?
          </p>
          <div style={{
            display: 'flex', gap: '0.375rem', flexWrap: 'wrap',
            maxHeight: '120px', overflowY: 'auto', marginBottom: '0.5rem',
          }}>
            {FLEX_MONTHS.map((m) => {
              const label = MONTHS[m - 1];
              const active = flexMonth === label;
              return (
                <button
                  key={m}
                  onClick={() => handleFlexMonth(label)}
                  style={{
                    padding: '0.4rem 0.85rem', borderRadius: '9999px',
                    border: '1px solid', cursor: 'pointer',
                    borderColor: active ? 'var(--ink)' : 'rgba(25,37,36,0.12)',
                    background: active ? 'var(--ink)' : 'rgba(255,255,255,0.6)',
                    color: active ? 'var(--bone)' : 'var(--slate)',
                    fontSize: '0.78rem', fontWeight: 500,
                    transition: 'all 140ms', fontFamily: 'var(--font-body)',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Summary */}
          {flexDuration && flexMonth && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.5rem 0.75rem', borderRadius: '0.75rem',
              background: 'rgba(74,155,127,0.1)',
            }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)' }}>
                {flexDuration} in {flexMonth}
              </span>
              <button
                onClick={clearDates}
                style={{
                  fontSize: '0.72rem', color: 'var(--sage)', background: 'none',
                  border: 'none', cursor: 'pointer', textDecoration: 'underline',
                  textDecorationColor: 'rgba(149,157,144,0.4)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Clear
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
