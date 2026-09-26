import { useState } from 'react';
import { ThinkingOrb } from 'thinking-orbs';

const STATES = ['working', 'searching', 'solving', 'listening', 'connecting', 'weaving', 'composing', 'breathing', 'shaping'];
const SIZES = [64, 32, 20];

export default function OrbPreview() {
  const [dark, setDark] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: dark ? '#1c2430' : '#faf8f4', color: dark ? '#fff' : '#1c2430', padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>thinking-orbs preview</h1>
        <button
          onClick={() => setDark((d) => !d)}
          style={{ padding: '0.4rem 0.9rem', borderRadius: 999, border: '1px solid currentColor', fontSize: '0.8rem' }}
        >
          {dark ? 'Switch to light bg' : 'Switch to dark bg'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1.5rem' }}>
        {STATES.map((state) => (
          <div key={state} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <ThinkingOrb state={state} size={64} theme={dark ? 'dark' : 'light'} />
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{state}</span>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginTop: '2.5rem', marginBottom: '1rem' }}>Sizes ("composing")</h2>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2rem' }}>
        {SIZES.map((size) => (
          <div key={size} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <ThinkingOrb state="composing" size={size} theme={dark ? 'dark' : 'light'} />
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{size}px</span>
          </div>
        ))}
      </div>
    </div>
  );
}
