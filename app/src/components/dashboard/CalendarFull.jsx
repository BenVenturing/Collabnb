import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18nInstance from '../../i18n';

const pad = (n) => String(n).padStart(2, '0');
const dateStr = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

// Color-coded by stage/status — categories come from the todo item's `type`.
const STAGE_COLOR_HEX = {
  deadline:       '#b45309',
  pending_action: '#5b4db8',
  stay_date:      '#2d7d5e',
};
function stageColors() {
  const labels = i18nInstance.t('calendarFull:stageColors', { returnObjects: true });
  return Object.fromEntries(Object.keys(STAGE_COLOR_HEX).map((k) => [k, { color: STAGE_COLOR_HEX[k], label: labels[k] }]));
}

function MonthGrid({ year, month, itemsByDate, selectedDate, onSelectDate }) {
  const { t, i18n } = useTranslation('calendarFull');
  const WEEKDAYS = t('weekdays', { returnObjects: true });
  const STAGE_COLORS = stageColors();
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = first.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
  const today = new Date();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ flex: '1 1 240px', minWidth: 220 }}>
      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink)', margin: '0 0 0.6rem', textAlign: 'center' }}>{monthLabel}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.1rem', marginBottom: '0.3rem' }}>
        {WEEKDAYS.map((w, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '0.58rem', fontWeight: 700, color: 'var(--sage)' }}>{w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.1rem' }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const ds = dateStr(year, month, d);
          const isToday = year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
          const isSelected = selectedDate === ds;
          const dayItems = itemsByDate[ds] || [];
          return (
            <button
              key={i}
              onClick={() => onSelectDate(isSelected ? null : ds)}
              style={{
                aspectRatio: '1', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                background: isToday ? 'var(--ink)' : isSelected ? 'rgba(60,87,89,0.14)' : 'transparent',
                color: isToday ? 'var(--bone)' : 'var(--ink)',
                fontSize: '0.68rem', fontWeight: isToday ? 800 : 600, fontFamily: 'var(--font-body)',
                boxShadow: isSelected && !isToday ? 'inset 0 0 0 1.5px var(--slate)' : 'none',
              }}
            >
              {d}
              {dayItems.length > 0 && (
                <span style={{ display: 'flex', gap: 2 }}>
                  {dayItems.slice(0, 3).map((t, j) => (
                    <span key={j} style={{ width: 4, height: 4, borderRadius: '50%', background: isToday ? 'var(--bone)' : (STAGE_COLORS[t.type]?.color || 'var(--slate)') }} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarFull({ todoItems = [], selectedDate, onSelectDate }) {
  const { t } = useTranslation('calendarFull');
  const STAGE_COLORS = stageColors();
  const [baseDate, setBaseDate] = useState(() => { const d = new Date(); d.setDate(1); return d; });

  const itemsByDate = {};
  todoItems.forEach((t) => { (itemsByDate[t.date] ||= []).push(t); });

  const months = [0, 1, 2].map((offset) => {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
          {Object.entries(STAGE_COLORS).map(([key, { color, label }]) => (
            <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: 'var(--slate)', fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} /> {label}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <button
            onClick={() => setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1))}
            aria-label={t('previousMonth')}
            style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(25,37,36,0.12)', background: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1))}
            aria-label={t('nextMonth')}
            style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(25,37,36,0.12)', background: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {months.map(({ year, month }) => (
          <MonthGrid key={`${year}-${month}`} year={year} month={month} itemsByDate={itemsByDate} selectedDate={selectedDate} onSelectDate={onSelectDate} />
        ))}
      </div>
    </div>
  );
}
