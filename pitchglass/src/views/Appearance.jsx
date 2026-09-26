import { useRef, useState } from 'react';
import { THEME_PRESETS } from '../data.js';

const KEYS = ['c1', 'c2', 'c3'];
const SIZE = 260;
const R = SIZE / 2;

function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: s * 100, l: l * 100 };
}

function hslToHex({ h, s, l }) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return '#' + [f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export default function Appearance({ theme, setTheme }) {
  const [active, setActive] = useState('c1');
  const wheel = useRef(null);
  const dragging = useRef(null);

  const pick = (e, key) => {
    const box = wheel.current.getBoundingClientRect();
    const x = e.clientX - box.left - R;
    const y = e.clientY - box.top - R;
    const h = (Math.atan2(y, x) * 180) / Math.PI;
    const s = Math.min(Math.hypot(x, y) / R, 1) * 100;
    const { l } = hexToHsl(theme[key]);
    setTheme({ ...theme, [key]: hslToHex({ h: (h + 360) % 360, s, l: Math.max(35, Math.min(l, 70)) }) });
  };

  const down = (e, key) => {
    e.preventDefault();
    const k = key || active;
    setActive(k);
    dragging.current = k;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pick(e, k);
  };
  const move = (e) => dragging.current && pick(e, dragging.current);
  const up = () => (dragging.current = null);

  const setLight = (l) => setTheme({ ...theme, [active]: hslToHex({ ...hexToHsl(theme[active]), l: Number(l) }) });

  return (
    <section className="stack">
      <div className="glass appearance">
        <div
          ref={wheel}
          className="wheel"
          onPointerDown={(e) => down(e)}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          role="application"
          aria-label="Color wheel — drag the numbered handles"
        >
          {KEYS.map((k, i) => {
            const { h, s } = hexToHsl(theme[k]);
            const rad = (h * Math.PI) / 180;
            const d = (s / 100) * R;
            return (
              <span
                key={k}
                className={`handle ${active === k ? 'on' : ''}`}
                style={{ left: R + d * Math.cos(rad), top: R + d * Math.sin(rad), background: theme[k] }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  down(e, k);
                }}
                onPointerMove={move}
                onPointerUp={up}
              >
                {i + 1}
              </span>
            );
          })}
        </div>

        <div className="stack">
          <div>
            <h2>Your three colors</h2>
            <p className="muted small">They mix into the glowing background. Pick one, drag its handle on the wheel.</p>
          </div>
          <div className="swatches">
            {KEYS.map((k, i) => (
              <button key={k} className={`swatch ${active === k ? 'on' : ''}`} onClick={() => setActive(k)}>
                <i style={{ background: theme[k] }} />
                <span>
                  Color {i + 1}
                  <br />
                  <code>{theme[k]}</code>
                </span>
              </button>
            ))}
          </div>
          <label>
            <span>Brightness · color {KEYS.indexOf(active) + 1}</span>
            <input className="light" type="range" min="30" max="75" value={Math.round(hexToHsl(theme[active]).l)} onChange={(e) => setLight(e.target.value)} />
          </label>
          <label>
            <span>Exact value · color {KEYS.indexOf(active) + 1}</span>
            <input className="plain" type="color" value={theme[active]} onChange={(e) => setTheme({ ...theme, [active]: e.target.value })} />
          </label>
          <div>
            <p className="muted small" style={{ marginBottom: 8 }}>Presets</p>
            <div className="presets">
              {THEME_PRESETS.map((p) => (
                <button key={p.name} className="preset" onClick={() => setTheme({ c1: p.c1, c2: p.c2, c3: p.c3 })}>
                  <span>
                    <b style={{ background: p.c1 }} />
                    <b style={{ background: p.c2 }} />
                    <b style={{ background: p.c3 }} />
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
