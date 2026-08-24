import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateRange } from '../lib/dateUtils';

// ─── persistence ──────────────────────────────────────────────────────────────
const CAL_KEY = '@collabnb_travel_calendar_v1';
const lsGet = () => { try { return JSON.parse(localStorage.getItem(CAL_KEY) || '[]'); } catch { return []; } };
const lsSet = (v) => { try { localStorage.setItem(CAL_KEY, JSON.stringify(v)); } catch {} };

const MAX_TRIPS = 6;
const TRIP_COLORS = ['#4A9B7F', '#5b7fd4', '#c0785e', '#9b7bb8', '#c4963a', '#3C5759'];
const tripBg     = (hex) => hex + '28';
const tripBorder = (hex) => hex + '90';

// ─── date helpers ─────────────────────────────────────────────────────────────
function toISO(d) { return d.toISOString().slice(0, 10); }
function fromISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function sameDay(a, b) { return a && b && toISO(a) === toISO(b); }
function inRange(d, lo, hi) { return d >= lo && d <= hi; }
function minD(a, b) { return a < b ? a : b; }
function maxD(a, b) { return a > b ? a : b; }
function genId() { return `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }
function fmt(s, e) { return formatDateRange(s, e); }

// ─── inline SVG icons (no lucide dependency issues) ───────────────────────────
const ChevL  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevR  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>;
const IcoX   = ({ size = 12 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoPin = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcoPen = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoLock = () => <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IcoPlus = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;

// ─── DayCell ──────────────────────────────────────────────────────────────────
function DayCell({ day, date, trips, selRange, viewerRole, onMouseDown, onMouseEnter, isEditable, hoverMode }) {
  const { t } = useTranslation('travelCalendar');
  const [showTip, setShowTip] = useState(false);
  if (!day) return <div />;

  const showCity   = viewerRole === 'host' || viewerRole === 'self';
  const visTrips   = viewerRole === 'creator' ? [] : trips;
  const matchTrip  = visTrips.find(t => inRange(date, fromISO(t.startDate), fromISO(t.endDate)));

  const inSel      = selRange && inRange(date, selRange.start, selRange.end);
  const isSelStart = inSel && sameDay(date, selRange.start);
  const isSelEnd   = inSel && sameDay(date, selRange.end);
  const isTripS    = matchTrip && sameDay(date, fromISO(matchTrip.startDate));
  const isTripE    = matchTrip && sameDay(date, fromISO(matchTrip.endDate));

  // Background + radius
  let bg = 'transparent', radius = '6px', color = 'var(--ink)', fontWeight = 400;
  if (inSel) {
    bg = 'rgba(60,87,89,0.16)';
    radius = (isSelStart && isSelEnd) ? '8px' : isSelStart ? '8px 0 0 8px' : isSelEnd ? '0 8px 8px 0' : '0';
  } else if (matchTrip) {
    bg = tripBg(matchTrip.color);
    color = matchTrip.color;
    fontWeight = 600;
    radius = (isTripS && isTripE) ? '8px' : isTripS ? '8px 0 0 8px' : isTripE ? '0 8px 8px 0' : '0';
  }

  return (
    <div
      onMouseDown={() => isEditable && onMouseDown(date)}
      onMouseEnter={() => onMouseEnter(date)}
      onMouseOver={() => matchTrip && setShowTip(true)}
      onMouseOut={() => setShowTip(false)}
      style={{
        position: 'relative', padding: '5px 2px', textAlign: 'center',
        fontSize: 12, fontFamily: 'var(--font-body)', fontWeight, color,
        background: bg, borderRadius: radius,
        cursor: isEditable ? (hoverMode ? 'crosshair' : 'pointer') : 'default',
        userSelect: 'none', transition: 'background 60ms', minWidth: 0,
      }}
    >
      {day}
      {showTip && matchTrip && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(25,37,36,0.92)', backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)', color: '#EFECE9',
          fontSize: 11, fontWeight: 500, padding: '6px 10px',
          borderRadius: '0.625rem', whiteSpace: 'nowrap', zIndex: 50,
          pointerEvents: 'none', boxShadow: '0 4px 14px rgba(25,37,36,0.25)',
          lineHeight: 1.5, textAlign: 'left',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>
            {matchTrip.country}{showCity && matchTrip.city ? `, ${matchTrip.city}` : ''}
          </div>
          <div style={{ color: 'rgba(239,236,233,0.7)', fontSize: 10 }}>
            {fmt(matchTrip.startDate, matchTrip.endDate)}
          </div>
          {matchTrip.note && (
            <div style={{ color: 'rgba(209,235,219,0.85)', fontSize: 10, marginTop: 3 }}>
              "{matchTrip.note}"
            </div>
          )}
          {!showCity && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'rgba(239,236,233,0.5)', fontSize: 9, marginTop: 3 }}>
              <IcoLock /> {t('cityPrivate')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MonthGrid ────────────────────────────────────────────────────────────────
function MonthGrid(props) {
  const { t } = useTranslation('travelCalendar');
  const MONTHS = t('months', { returnObjects: true });
  const DAY_ABBR = t('dayAbbr', { returnObjects: true });
  const { year, month, ...rest } = props;
  const daysInMonth   = new Date(year, month + 1, 0).getDate();
  const firstDayOfWk  = new Date(year, month, 1).getDay();
  const cells = [...Array(firstDayOfWk).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div>
      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--ink)', textAlign: 'center', margin: '0 0 10px' }}>
        {MONTHS[month]} {year}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
        {DAY_ABBR.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'var(--sage)', padding: '3px 0', letterSpacing: '0.05em' }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          const date = day ? new Date(year, month, day) : null;
          return <DayCell key={i} day={day} date={date} {...rest} />;
        })}
      </div>
    </div>
  );
}

// ─── TripModal ────────────────────────────────────────────────────────────────
function TripModal({ form, onSave, onCancel }) {
  const { t } = useTranslation('travelCalendar');
  const [country, setCountry] = useState(form.country);
  const [city,    setCity]    = useState(form.city);
  const [note,    setNote]    = useState(form.note);
  const countryRef = useRef(null);
  const isEdit = !!form.editId;

  useEffect(() => { countryRef.current?.focus(); }, []);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  const rangeLabel = fmt(toISO(form.range.start), toISO(form.range.end));
  const canSave = country.trim() && city.trim();

  const inp = {
    width: '100%', padding: '10px 13px', borderRadius: '0.875rem',
    border: '1.5px solid rgba(25,37,36,0.12)',
    background: 'rgba(255,255,255,0.88)',
    fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 150ms',
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(25,37,36,0.38)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <style>{`
        @keyframes tcModalIn {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(243,240,237,0.97)',
          backdropFilter: 'blur(28px) saturate(140%)',
          WebkitBackdropFilter: 'blur(28px) saturate(140%)',
          borderRadius: '1.75rem',
          border: '1px solid rgba(255,255,255,0.82)',
          boxShadow: '0 24px 56px -12px rgba(25,37,36,0.22), inset 0 1px 0 rgba(255,255,255,0.7)',
          padding: '24px 28px',
          width: '100%', maxWidth: 380,
          animation: 'tcModalIn 200ms cubic-bezier(0.16,1,0.3,1) forwards',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--ink)', margin: 0 }}>
              {isEdit ? t('modal.editTrip') : t('modal.addTrip')}
            </h3>
            <p style={{ fontSize: 11, color: 'var(--sage)', margin: '4px 0 0' }}>{rangeLabel}</p>
          </div>
          <button
            onClick={onCancel}
            style={{ background: 'rgba(25,37,36,0.07)', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 150ms', flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(25,37,36,0.13)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(25,37,36,0.07)'; }}
          >
            <IcoX size={13} />
          </button>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate)', marginBottom: 6 }}>
              {t('modal.country')} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input ref={countryRef} value={country} onChange={(e) => setCountry(e.target.value)}
              placeholder={t('modal.countryPlaceholder')} style={inp}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.3)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.12)'; }}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--slate)', marginBottom: 6 }}>
              {t('modal.city')} <span style={{ color: '#ef4444' }}>*</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 9999, background: 'rgba(25,37,36,0.06)', fontSize: 9, fontWeight: 600, color: 'var(--sage)' }}>
                <IcoLock /> {t('modal.privateToOthers')}
              </span>
            </label>
            <input value={city} onChange={(e) => setCity(e.target.value)}
              placeholder={t('modal.cityPlaceholder')} style={inp}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.3)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.12)'; }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate)', marginBottom: 6 }}>
              {t('modal.tripNote')} <span style={{ fontWeight: 500, color: 'var(--sage)' }}>{t('modal.optional')}</span>
            </label>
            <input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={t('modal.notePlaceholder')} style={inp}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.3)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(25,37,36,0.12)'; }}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '10px 0', borderRadius: 9999,
            border: '1.5px solid rgba(25,37,36,0.12)', background: 'transparent',
            fontSize: 12, fontWeight: 700, color: 'var(--slate)', cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>
            {t('modal.cancel')}
          </button>
          <button
            onClick={() => canSave && onSave({ country: country.trim(), city: city.trim(), note: note.trim() })}
            disabled={!canSave}
            style={{
              flex: 2, padding: '10px 0', borderRadius: 9999, border: 'none',
              background: canSave ? 'var(--ink)' : 'rgba(25,37,36,0.1)',
              fontSize: 12, fontWeight: 700,
              color: canSave ? 'var(--bone)' : 'var(--sage)',
              cursor: canSave ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-body)', transition: 'background 150ms',
            }}
          >
            {isEdit ? t('modal.saveChanges') : t('modal.saveTrip')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
// viewerRole: 'self' | 'host' | 'creator'
export default function TravelCalendar({ viewerRole = 'self' }) {
  const { t } = useTranslation('travelCalendar');
  const today    = new Date();
  const isEditable = viewerRole === 'self';

  const [trips, setTrips] = useState(() => lsGet());
  const [firstMonth, setFirstMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  // ── Selection state machine ─────────────────────────────────────────────────
  // null → { mode: 'dragging'|'hover', anchor: Date, preview: Date }
  //
  // 'dragging': mousedown held — anchor fixed, preview follows mouse
  //   • mouseup with no move → transition to 'hover'
  //   • mouseup with move    → open form
  //
  // 'hover': clicked once — anchor fixed, preview follows mouse
  //   • second mousedown    → open form with [anchor, hovered date]
  //   • Escape              → cancel
  const [_sel, _setSel] = useState(null);
  const selRef = useRef(null);                  // always in sync (no async lag)
  const setSel = useCallback((val) => {
    const next = typeof val === 'function' ? val(selRef.current) : val;
    selRef.current = next;
    _setSel(next);
  }, []);
  const sel = _sel; // for rendering

  const didMoveRef = useRef(false);

  // ── Form state ──────────────────────────────────────────────────────────────
  // null | { range: {start,end}, editId: null|string, country, city, note }
  const [form, setForm] = useState(null);

  // Derived selection range (normalized start ≤ end)
  const selRange = sel
    ? { start: minD(sel.anchor, sel.preview), end: maxD(sel.anchor, sel.preview) }
    : null;

  // Month nav
  const y1 = firstMonth.getFullYear(), m1 = firstMonth.getMonth();
  const y2 = m1 === 11 ? y1 + 1 : y1, m2 = m1 === 11 ? 0 : m1 + 1;
  const prevMonth = () => setFirstMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setFirstMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  // ── Global mouseup: commit drag or enter hover ──────────────────────────────
  useEffect(() => {
    function onUp() {
      const s = selRef.current;
      if (!s || s.mode !== 'dragging') return;
      if (didMoveRef.current) {
        // Multi-day drag → open form
        const start = minD(s.anchor, s.preview), end = maxD(s.anchor, s.preview);
        setSel(null);
        setForm({ range: { start, end }, editId: null, country: '', city: '', note: '' });
      } else {
        // Single click → enter hover mode
        setSel({ mode: 'hover', anchor: s.anchor, preview: s.anchor });
      }
    }
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [setSel]);

  // ── Escape cancels active selection ────────────────────────────────────────
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && selRef.current && !form) setSel(null); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [form, setSel]);

  // ── Day interaction handlers ────────────────────────────────────────────────
  const handleMouseDown = useCallback((date) => {
    if (!isEditable) return;
    const s = selRef.current;

    if (s?.mode === 'hover') {
      // Second mousedown in hover mode → commit selection with current preview
      const start = minD(s.anchor, s.preview), end = maxD(s.anchor, s.preview);
      setSel(null);
      setForm({ range: { start, end }, editId: null, country: '', city: '', note: '' });
      return;
    }

    if (trips.length >= MAX_TRIPS) return;
    didMoveRef.current = false;
    setSel({ mode: 'dragging', anchor: date, preview: date });
  }, [isEditable, trips.length, setSel]);

  const handleMouseEnter = useCallback((date) => {
    setSel(s => {
      if (!s) return s;
      if (s.mode === 'dragging' && !sameDay(date, s.anchor)) didMoveRef.current = true;
      return (s.mode === 'dragging' || s.mode === 'hover') ? { ...s, preview: date } : s;
    });
  }, [setSel]);

  // ── Add trip button: anchor to today and enter hover mode ──────────────────
  const handleAddBtnClick = useCallback(() => {
    if (sel?.mode === 'hover') { setSel(null); return; }
    if (trips.length >= MAX_TRIPS) return;
    setSel({ mode: 'hover', anchor: today, preview: today });
  }, [sel, trips.length, today, setSel]);

  // ── Save / edit / delete ────────────────────────────────────────────────────
  function saveTrip({ country, city, note }) {
    if (!form) return;
    let updated;
    if (form.editId) {
      updated = trips.map(t => t.id === form.editId ? { ...t, country, city, note } : t);
    } else {
      const color = TRIP_COLORS[trips.length % TRIP_COLORS.length];
      updated = [...trips, {
        id: genId(),
        startDate: toISO(form.range.start),
        endDate:   toISO(form.range.end),
        country, city, note, color,
      }];
    }
    setTrips(updated); lsSet(updated); setForm(null);
  }

  function deleteTrip(id) {
    const updated = trips.filter(t => t.id !== id);
    setTrips(updated); lsSet(updated);
  }

  function startEdit(trip) {
    setForm({
      range: { start: fromISO(trip.startDate), end: fromISO(trip.endDate) },
      editId: trip.id,
      country: trip.country,
      city: trip.city,
      note: trip.note || '',
    });
  }

  const atMax      = trips.length >= MAX_TRIPS;
  const hoverMode  = sel?.mode === 'hover';
  const showCity   = viewerRole === 'host' || viewerRole === 'self';

  const gridShared = {
    trips, selRange, viewerRole,
    onMouseDown: handleMouseDown,
    onMouseEnter: handleMouseEnter,
    isEditable, hoverMode,
  };

  return (
    <div style={{ userSelect: 'none' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.125rem', color: 'var(--ink)', margin: 0 }}>
            {t('header.title')}
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--sage)', margin: '3px 0 0' }}>
            {isEditable
              ? hoverMode
                ? t('header.hoverToExtend')
                : atMax
                ? t('header.atMax', { max: MAX_TRIPS })
                : t('header.clickAndDrag')
              : viewerRole === 'host'
              ? t('header.hostView')
              : t('header.privateView')}
          </p>
        </div>

        {isEditable && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {trips.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--sage)' }}>
                {trips.length}/{MAX_TRIPS}
              </span>
            )}
            <button
              onClick={handleAddBtnClick}
              disabled={atMax && !hoverMode}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 9999,
                background: hoverMode ? 'rgba(25,37,36,0.08)' : atMax ? 'rgba(25,37,36,0.06)' : 'var(--ink)',
                color: hoverMode ? 'var(--slate)' : atMax ? 'var(--sage)' : 'var(--bone)',
                border: hoverMode ? '1px solid rgba(25,37,36,0.12)' : 'none',
                cursor: atMax && !hoverMode ? 'not-allowed' : 'pointer',
                fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-body)',
                transition: 'background 150ms',
              }}
            >
              {hoverMode ? (
                <><IcoX size={10} /> {t('addTripButton.cancel')}</>
              ) : (
                <><IcoPlus /> {t('addTripButton.addTrip')}</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Month navigation ── */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={prevMonth} style={navBtn}><ChevL /></button>
        <div style={{ flex: 1 }} />
        <button onClick={nextMonth} style={navBtn}><ChevR /></button>
      </div>

      {/* ── Two-month grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.5rem', marginBottom: 16,
      }}>
        <MonthGrid year={y1} month={m1} {...gridShared} />
        <MonthGrid year={y2} month={m2} {...gridShared} />
      </div>

      {/* ── Hover-mode range hint bar ── */}
      {hoverMode && sel && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px', marginBottom: 12,
          background: 'rgba(74,155,127,0.1)', border: '1px solid rgba(74,155,127,0.28)',
          borderRadius: '0.75rem',
        }}>
          <p style={{ fontSize: 12, color: '#2d6a4f', fontWeight: 600, margin: 0 }}>
            {sameDay(sel.anchor, sel.preview)
              ? t('hoverHint.extend')
              : t('hoverHint.confirm', { range: fmt(toISO(minD(sel.anchor, sel.preview)), toISO(maxD(sel.anchor, sel.preview))) })
            }
          </p>
          <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', color: '#2d6a4f', opacity: 0.6 }}>
            <IcoX />
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {trips.length === 0 && isEditable && !hoverMode && (
        <div style={{
          textAlign: 'center', padding: '1.5rem',
          background: 'rgba(255,255,255,0.5)', borderRadius: '1rem',
          border: '1.5px dashed rgba(25,37,36,0.1)', marginBottom: 14,
        }}>
          <p style={{ fontSize: 13, color: 'var(--sage)', margin: 0 }}>
            {t('empty.editable', { max: MAX_TRIPS })}
          </p>
        </div>
      )}
      {trips.length === 0 && !isEditable && viewerRole !== 'creator' && (
        <p style={{ fontSize: 13, color: 'var(--sage)', textAlign: 'center', marginBottom: 14 }}>
          {t('empty.readonly')}
        </p>
      )}

      {/* ── Trip list ── */}
      {trips.length > 0 && viewerRole !== 'creator' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {trips.map(trip => (
            <div key={trip.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 13px',
              background: tripBg(trip.color), border: `1px solid ${tripBorder(trip.color)}`,
              borderRadius: '0.875rem',
            }}>
              <span style={{ color: trip.color, flexShrink: 0, display: 'flex' }}><IcoPin /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                  {trip.country}{showCity && trip.city ? `, ${trip.city}` : ''}
                </span>
                <span style={{ fontSize: 11, color: 'var(--sage)', marginLeft: 8 }}>
                  {fmt(trip.startDate, trip.endDate)}
                </span>
                {trip.note && (
                  <span style={{ fontSize: 11, color: 'var(--slate)', display: 'block', marginTop: 1 }}>"{trip.note}"</span>
                )}
                {!showCity && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--sage)', marginLeft: 4 }}>
                    <IcoLock /> {t('tripList.cityHidden')}
                  </span>
                )}
              </div>
              {isEditable && (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => startEdit(trip)}
                    title={t('tripList.editTitle')}
                    style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(25,37,36,0.1)', background: 'rgba(255,255,255,0.75)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 150ms' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.75)'; }}
                  >
                    <IcoPen />
                  </button>
                  <button
                    onClick={() => deleteTrip(trip.id)}
                    title={t('tripList.deleteTitle')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, borderRadius: '50%', display: 'flex', opacity: 0.55, transition: 'opacity 150ms' }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.55'; }}
                  >
                    <IcoX />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Form modal ── */}
      {form && <TripModal form={form} onSave={saveTrip} onCancel={() => setForm(null)} />}
    </div>
  );
}

const navBtn = {
  width: 28, height: 28, borderRadius: '50%',
  background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.85)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', boxShadow: '0 2px 8px rgba(25,37,36,0.07)',
  color: 'var(--slate)',
};
