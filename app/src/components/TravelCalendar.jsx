import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, MapPin, Lock } from 'lucide-react';

// ─── localStorage ─────────────────────────────────────────────────────────────
const CAL_KEY = '@collabnb_travel_calendar_v1';
function lsGet() { try { return JSON.parse(localStorage.getItem(CAL_KEY) || '[]'); } catch { return []; } }
function lsSet(v) { try { localStorage.setItem(CAL_KEY, JSON.stringify(v)); } catch {} }

// ─── Trip color palette (cycling) ────────────────────────────────────────────
const TRIP_COLORS = ['#4A9B7F', '#5b7fd4', '#c0785e', '#9b7bb8', '#c4963a', '#3C5759'];
function tripBg(hex) { return hex + '28'; }      // ~16% opacity fill
function tripBorder(hex) { return hex + '90'; }  // ~56% opacity border

// ─── Date helpers ─────────────────────────────────────────────────────────────
function toISO(d) { return d.toISOString().slice(0, 10); }
function fromISO(s) { const [y, m, day] = s.split('-').map(Number); return new Date(y, m - 1, day); }
function sameDay(a, b) { return toISO(a) === toISO(b); }
function inRange(date, a, b) {
  const lo = a < b ? a : b;
  const hi = a < b ? b : a;
  return date >= lo && date <= hi;
}
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_ABBR = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function fmt(isoStr) {
  const d = fromISO(isoStr);
  return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}
function fmtRange(startISO, endISO) {
  return `${fmt(startISO)} – ${fmt(endISO)}`;
}

function generateId() { return `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

// ─── Day cell ─────────────────────────────────────────────────────────────────
function DayCell({ day, date, trips, selRange, isoDate, viewerRole, onMouseDown, onMouseEnter, onMouseUp, isEditable }) {
  const [showTip, setShowTip] = useState(false);

  if (!day) return <div />;

  const matchTrip = trips.find(t => {
    const s = fromISO(t.startDate), e = fromISO(t.endDate);
    return date >= s && date <= e;
  });

  const inSel = selRange && inRange(date, selRange.start, selRange.end);
  const isStart = matchTrip && sameDay(date, fromISO(matchTrip.startDate));
  const isEnd   = matchTrip && sameDay(date, fromISO(matchTrip.endDate));

  const bg = inSel
    ? 'rgba(60,87,89,0.15)'
    : matchTrip
    ? tripBg(matchTrip.color)
    : 'transparent';

  const radius = isStart && isEnd ? '8px'
    : isStart ? '8px 0 0 8px'
    : isEnd   ? '0 8px 8px 0'
    : matchTrip ? 0 : '6px';

  const showCity = viewerRole === 'host' || viewerRole === 'self';

  return (
    <div
      onMouseDown={() => isEditable && onMouseDown(date, isoDate)}
      onMouseEnter={() => onMouseEnter(date, isoDate)}
      onMouseUp={() => isEditable && onMouseUp(date, isoDate)}
      onMouseOver={() => matchTrip && setShowTip(true)}
      onMouseOut={() => setShowTip(false)}
      style={{
        position: 'relative',
        padding: '5px 2px',
        textAlign: 'center',
        fontSize: 12,
        fontFamily: 'var(--font-body)',
        fontWeight: matchTrip ? 600 : 400,
        color: matchTrip ? matchTrip.color : 'var(--ink)',
        background: bg,
        borderRadius: radius,
        cursor: isEditable ? 'pointer' : matchTrip ? 'default' : 'default',
        userSelect: 'none',
        transition: 'background 80ms ease',
        minWidth: 0,
      }}
    >
      {day}
      {/* Tooltip */}
      {showTip && matchTrip && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(25,37,36,0.92)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          color: '#EFECE9',
          fontSize: 11,
          fontWeight: 500,
          padding: '6px 10px',
          borderRadius: '0.625rem',
          whiteSpace: 'nowrap',
          zIndex: 50,
          pointerEvents: 'none',
          boxShadow: '0 4px 14px rgba(25,37,36,0.25)',
          lineHeight: 1.5,
          textAlign: 'left',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>
            {matchTrip.country}{showCity && matchTrip.city ? `, ${matchTrip.city}` : ''}
          </div>
          <div style={{ color: 'rgba(239,236,233,0.7)', fontSize: 10 }}>
            {fmtRange(matchTrip.startDate, matchTrip.endDate)}
          </div>
          {matchTrip.note && (
            <div style={{ color: 'rgba(209,235,219,0.85)', fontSize: 10, marginTop: 3 }}>
              "{matchTrip.note}"
            </div>
          )}
          {!showCity && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'rgba(239,236,233,0.5)', fontSize: 9, marginTop: 3 }}>
              <Lock size={8} />city private
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Month grid ───────────────────────────────────────────────────────────────
function MonthGrid({ year, month, trips, selRange, viewerRole, onMouseDown, onMouseEnter, onMouseUp, isEditable }) {
  const daysInM  = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInM; d++) cells.push(d);

  return (
    <div>
      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--ink)', textAlign: 'center', margin: '0 0 10px' }}>
        {MONTH_NAMES[month]} {year}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
        {DAY_ABBR.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'var(--sage)', padding: '3px 0', letterSpacing: '0.04em' }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          const date = day ? new Date(year, month, day) : null;
          const isoDate = date ? toISO(date) : null;
          return (
            <DayCell
              key={i}
              day={day}
              date={date}
              isoDate={isoDate}
              trips={trips}
              selRange={selRange}
              viewerRole={viewerRole}
              onMouseDown={onMouseDown}
              onMouseEnter={onMouseEnter}
              onMouseUp={onMouseUp}
              isEditable={isEditable}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Trip form modal ──────────────────────────────────────────────────────────
function TripFormModal({ range, onSave, onCancel }) {
  const [country, setCountry] = useState('');
  const [city,    setCity]    = useState('');
  const [note,    setNote]    = useState('');
  const countryRef = useRef(null);

  useEffect(() => { countryRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(25,37,36,0.5)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(255,255,255,0.97)',
          borderRadius: '1.25rem',
          border: '1.5px solid rgba(255,255,255,0.9)',
          boxShadow: '0 20px 60px rgba(25,37,36,0.2)',
          padding: '24px',
          width: '100%',
          maxWidth: 360,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--ink)', margin: 0 }}>
              Add Trip
            </h3>
            <p style={{ fontSize: 11, color: 'var(--sage)', margin: '3px 0 0' }}>
              {fmtRange(toISO(range.start), toISO(range.end))}
            </p>
          </div>
          <button onClick={onCancel} style={{ background: 'rgba(25,37,36,0.06)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} color="var(--ink)" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ink)', marginBottom: 5 }}>
              Country <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              ref={countryRef}
              value={country}
              onChange={e => setCountry(e.target.value)}
              placeholder="e.g. Japan"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
              City <span style={{ color: '#ef4444' }}>*</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 6, padding: '1px 6px', borderRadius: 9999, background: 'rgba(25,37,36,0.05)', fontSize: 9, fontWeight: 600, color: 'var(--sage)' }}>
                <Lock size={7} />private to other creators
              </span>
            </label>
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g. Tokyo"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ink)', marginBottom: 5 }}>
              Trip note <span style={{ color: 'var(--sage)', fontWeight: 500 }}>(optional)</span>
            </label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Open to glamping collabs"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: '10px 0', borderRadius: 9999, border: '1.5px solid rgba(25,37,36,0.12)', background: 'transparent', fontSize: 12, fontWeight: 700, color: 'var(--slate)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => { if (country && city) onSave({ country, city, note }); }}
            disabled={!country || !city}
            style={{
              flex: 2, padding: '10px 0', borderRadius: 9999, border: 'none',
              background: !country || !city ? 'rgba(25,37,36,0.12)' : 'var(--ink)',
              fontSize: 12, fontWeight: 700,
              color: !country || !city ? 'var(--sage)' : 'var(--bone)',
              cursor: !country || !city ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Save Trip
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: '0.625rem',
  border: '1.5px solid rgba(25,37,36,0.12)',
  background: 'rgba(255,255,255,0.85)',
  fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)',
  outline: 'none', boxSizing: 'border-box',
};

// ─── Main TravelCalendar component ────────────────────────────────────────────
// viewerRole: 'self' | 'host' | 'creator'
export default function TravelCalendar({ viewerRole = 'self' }) {
  const today = new Date();
  const isEditable = viewerRole === 'self';

  const [trips,       setTrips]       = useState(() => lsGet());
  const [month,       setMonth]       = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [dragging,    setDragging]    = useState(false);
  const [dragStart,   setDragStart]   = useState(null);
  const [dragEnd,     setDragEnd]     = useState(null);
  const [pendingRange, setPendingRange] = useState(null);
  const [showForm,    setShowForm]    = useState(false);

  const year = month.getFullYear();
  const mon  = month.getMonth();

  const nextMonthYear = mon === 11 ? year + 1 : year;
  const nextMon       = mon === 11 ? 0 : mon + 1;

  const selRange = dragging && dragStart && dragEnd
    ? { start: dragStart < dragEnd ? dragStart : dragEnd,
        end:   dragStart < dragEnd ? dragEnd   : dragStart }
    : null;

  // Commit drag on window mouseup
  const draggingRef = useRef(dragging);
  const dragStartRef = useRef(dragStart);
  const dragEndRef   = useRef(dragEnd);
  useEffect(() => { draggingRef.current = dragging; }, [dragging]);
  useEffect(() => { dragStartRef.current = dragStart; }, [dragStart]);
  useEffect(() => { dragEndRef.current = dragEnd; }, [dragEnd]);

  useEffect(() => {
    function onUp() {
      if (!draggingRef.current) return;
      setDragging(false);
      const s = dragStartRef.current;
      const e = dragEndRef.current || s;
      if (s) {
        setPendingRange({ start: s < e ? s : e, end: s < e ? e : s });
        setShowForm(true);
      }
      setDragStart(null);
      setDragEnd(null);
    }
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  const handleMouseDown = useCallback((date) => {
    setDragging(true);
    setDragStart(date);
    setDragEnd(date);
  }, []);

  const handleMouseEnter = useCallback((date) => {
    if (draggingRef.current) setDragEnd(date);
  }, []);

  const handleMouseUp = useCallback(() => {
    // actual commit is handled by window mouseup listener
  }, []);

  function saveTrip({ country, city, note }) {
    const color = TRIP_COLORS[trips.length % TRIP_COLORS.length];
    const newTrip = {
      id: generateId(),
      startDate: toISO(pendingRange.start),
      endDate:   toISO(pendingRange.end),
      country,
      city,
      note,
      color,
    };
    const updated = [...trips, newTrip];
    setTrips(updated);
    lsSet(updated);
    setShowForm(false);
    setPendingRange(null);
  }

  function deleteTrip(id) {
    const updated = trips.filter(t => t.id !== id);
    setTrips(updated);
    lsSet(updated);
  }

  const showCity = viewerRole === 'host' || viewerRole === 'self';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.125rem', color: 'var(--ink)', margin: 0 }}>
            Travel Calendar
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--sage)', margin: '3px 0 0' }}>
            {isEditable
              ? 'Click and drag to add a trip'
              : viewerRole === 'host'
              ? 'Upcoming creator trips — city visible to you as host'
              : 'Upcoming trips — city is private'}
          </p>
        </div>
        {isEditable && trips.length > 0 && (
          <button
            onClick={() => { setPendingRange(null); setShowForm(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 9999,
              background: 'var(--ink)', color: 'var(--bone)',
              border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              fontFamily: 'var(--font-body)',
            }}
          >
            <Plus size={11} />
            Add trip
          </button>
        )}
      </div>

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setMonth(new Date(mon === 0 ? year - 1 : year, mon === 0 ? 11 : mon - 1, 1))}
          style={navBtnStyle}
        >
          <ChevronLeft size={14} color="var(--slate)" />
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setMonth(new Date(nextMon === 11 && mon !== 10 ? nextMonthYear : nextMonthYear, nextMon === 11 && mon !== 10 ? 0 : nextMon + 1, 1))}
          style={navBtnStyle}
        >
          <ChevronRight size={14} color="var(--slate)" />
        </button>
      </div>

      {/* Two-month grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.5rem',
        marginBottom: 20,
        userSelect: 'none',
      }}>
        <MonthGrid
          year={year} month={mon}
          trips={trips} selRange={selRange}
          viewerRole={viewerRole}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseUp={handleMouseUp}
          isEditable={isEditable}
        />
        <MonthGrid
          year={nextMonthYear} month={nextMon}
          trips={trips} selRange={selRange}
          viewerRole={viewerRole}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseUp={handleMouseUp}
          isEditable={isEditable}
        />
      </div>

      {/* Empty state hint */}
      {trips.length === 0 && isEditable && (
        <div style={{
          textAlign: 'center', padding: '1.5rem',
          background: 'rgba(255,255,255,0.5)',
          borderRadius: '1rem',
          border: '1.5px dashed rgba(25,37,36,0.1)',
          marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, color: 'var(--sage)', margin: 0 }}>
            Drag across dates to add your first trip
          </p>
        </div>
      )}

      {trips.length === 0 && !isEditable && (
        <p style={{ fontSize: 13, color: 'var(--sage)', textAlign: 'center', margin: '0 0 16px' }}>
          No trips planned yet.
        </p>
      )}

      {/* Trip legend */}
      {trips.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {trips.map(t => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px',
              background: tripBg(t.color),
              border: `1px solid ${tripBorder(t.color)}`,
              borderRadius: '0.75rem',
            }}>
              <MapPin size={12} color={t.color} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                  {t.country}
                  {showCity && t.city ? `, ${t.city}` : ''}
                </span>
                <span style={{ fontSize: 11, color: 'var(--sage)', marginLeft: 8 }}>
                  {fmtRange(t.startDate, t.endDate)}
                </span>
                {t.note && (
                  <span style={{ fontSize: 11, color: 'var(--slate)', display: 'block', marginTop: 1 }}>
                    "{t.note}"
                  </span>
                )}
                {!showCity && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--sage)', marginLeft: 6 }}>
                    <Lock size={8} />city hidden
                  </span>
                )}
              </div>
              {isEditable && (
                <button
                  onClick={() => deleteTrip(t.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, borderRadius: '50%', display: 'flex', flexShrink: 0 }}
                >
                  <X size={12} color="var(--sage)" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <TripFormModal
          range={pendingRange || { start: today, end: today }}
          onSave={saveTrip}
          onCancel={() => { setShowForm(false); setPendingRange(null); }}
        />
      )}
    </div>
  );
}

const navBtnStyle = {
  width: 28, height: 28, borderRadius: '50%',
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.85)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', boxShadow: '0 2px 8px rgba(25,37,36,0.07)',
};
