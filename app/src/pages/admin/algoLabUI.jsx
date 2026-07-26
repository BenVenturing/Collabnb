// Shared presentational atoms for the admin Algorithm Lab panels
// (AlgorithmLab.jsx for listings, CreatorAlgorithmLab.jsx for creators).
import { useState } from 'react';

export const INK   = '#192524';
export const SLATE = '#3C5759';
export const SAGE  = '#959D90';
export const MINT  = '#D1EBDB';

export function AvatarBubble({ profile }) {
  const [failed, setFailed] = useState(false);
  const url = profile.avatar_url ?? profile.avatar;
  const usable = !failed && url && (url.startsWith('http') || url.startsWith('data:'));
  return (
    <span style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: MINT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: SLATE }}>
      {usable
        ? <img src={url} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (profile.full_name || profile.name || profile.username || '?')[0].toUpperCase()}
    </span>
  );
}

export function Chip({ bg = 'rgba(25,37,36,0.06)', color = SLATE, children, title }) {
  return (
    <span title={title} style={{ fontSize: '0.66rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 99, background: bg, color, display: 'inline-block', lineHeight: 1.6, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

export function Card({ children, style }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.85)', borderRadius: '1rem', padding: '1.1rem 1.25rem', ...style }}>
      {children}
    </div>
  );
}

export function SectionLabel({ children }) {
  return <p style={{ fontSize: '0.68rem', fontWeight: 700, color: SAGE, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.5rem' }}>{children}</p>;
}

export function PartBar({ label, value, weight }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={`${label}: ${Math.round(value * 100)}% of its ${Math.round(weight * 100)}-point share`}>
      <span style={{ fontSize: '0.6rem', color: SAGE, width: 34, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'rgba(25,37,36,0.07)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(value * 100)}%`, height: '100%', borderRadius: 99, background: value >= 0.7 ? '#4A9B7F' : value >= 0.45 ? '#8FBCA8' : '#C9CFC6' }} />
      </div>
      <span style={{ fontSize: '0.6rem', color: SLATE, width: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        +{Math.round(value * weight * 100)} pts
      </span>
    </div>
  );
}
