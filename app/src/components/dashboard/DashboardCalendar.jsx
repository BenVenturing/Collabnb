import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const pad = (n) => String(n).padStart(2, '0');
const dateStr = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

// todoItems: [{ date: 'YYYY-MM-DD', ... }] — used to mark active days on whichever month is in view.
export default function DashboardCalendar({ todoItems = [], selectedDate, onSelectDate }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const activeDates = new Set(todoItems.map((t) => t.date));

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="glass-card" style={{ padding: '1.5rem', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--ink)', margin: 0 }}>
          {monthLabel}
        </h3>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <button
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            aria-label="Previous month"
            style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(25,37,36,0.12)', background: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            aria-label="Next month"
            style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(25,37,36,0.12)', background: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.15rem', marginBottom: '0.4rem' }}>
        {WEEKDAYS.map((w, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '0.62rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase' }}>{w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.15rem' }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const ds = dateStr(year, month, d);
          const isToday = isCurrentMonth && d === today.getDate();
          const isSelected = selectedDate === ds;
          const isActive = activeDates.has(ds);
          return (
            <button
              key={i}
              onClick={() => onSelectDate?.(isSelected ? null : ds)}
              style={{
                aspectRatio: '1', borderRadius: '9999px', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                fontSize: '0.74rem', fontWeight: isToday ? 800 : 600, fontFamily: 'var(--font-body)',
                background: isToday ? 'var(--ink)' : isSelected ? 'rgba(60,87,89,0.14)' : 'transparent',
                color: isToday ? 'var(--bone)' : 'var(--ink)',
                boxShadow: isSelected && !isToday ? 'inset 0 0 0 1.5px var(--slate)' : 'none',
                transition: 'background 150ms',
              }}
            >
              {d}
              {isActive && !isToday && (
                <span style={{ position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: '50%', background: 'var(--slate)' }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
