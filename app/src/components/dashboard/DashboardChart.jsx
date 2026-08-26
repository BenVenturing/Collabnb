import { useState } from 'react';

// datasets: { [key]: { label, unit: '$'|'', data: [{ month, value }] } }
export default function DashboardChart({ datasets, title, defaultView, bare = false }) {
  const keys = Object.keys(datasets);
  const [view, setView] = useState(defaultView || keys[0]);
  const [hoverIdx, setHoverIdx] = useState(null);
  const active = datasets[view];
  const max = Math.max(...active.data.map((d) => d.value), 1);

  return (
    <div className={bare ? undefined : 'glass-card'} style={bare ? { height: '100%' } : { padding: '1.5rem', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: title ? 'space-between' : 'flex-end', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        {title && <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--ink)', margin: 0 }}>{title}</h3>}
        <div style={{ display: 'flex', gap: '0.2rem', background: 'rgba(25,37,36,0.06)', borderRadius: '9999px', padding: '0.2rem' }}>
          {keys.map((key) => (
            <button
              key={key}
              onClick={() => { setView(key); setHoverIdx(null); }}
              style={{
                padding: '0.35rem 0.85rem', borderRadius: '9999px', border: 'none', cursor: 'pointer',
                fontSize: '0.76rem', fontWeight: 600, fontFamily: 'var(--font-body)',
                background: view === key ? 'var(--ink)' : 'transparent',
                color: view === key ? 'var(--bone)' : 'var(--slate)',
                transition: 'background 180ms, color 180ms',
              }}
            >
              {datasets[key].label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(3px, 1.1%, 10px)', height: 180 }}>
        {active.data.map((d, i) => {
          const h = Math.max((d.value / max) * 100, 3);
          const hovered = hoverIdx === i;
          return (
            <div
              key={d.month}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              {hovered && (
                <div style={{
                  position: 'absolute', bottom: `calc(${h}% + 12px)`, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--ink)', color: 'var(--bone)', padding: '0.4rem 0.7rem', borderRadius: '0.7rem',
                  fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', zIndex: 5,
                  boxShadow: '0 8px 20px rgba(25,37,36,0.25)', pointerEvents: 'none',
                }}>
                  {active.unit === '$' ? `$${d.value.toLocaleString()}` : `${d.value} ${active.label.toLowerCase()}`}
                  <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid var(--ink)' }} />
                </div>
              )}
              <div style={{
                width: '100%', maxWidth: 22, height: `${h}%`, borderRadius: '6px 6px 3px 3px',
                background: hovered ? 'var(--slate)' : 'rgba(60,87,89,0.32)',
                transition: 'height 350ms var(--ease-out-quart), background 180ms',
              }} />
              <span style={{ fontSize: '0.6rem', color: 'var(--sage)', marginTop: '0.4rem', fontWeight: 600 }}>{d.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
