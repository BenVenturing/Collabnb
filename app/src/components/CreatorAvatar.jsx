import { useState } from 'react';

// HAZY palette — bg / text pairs for initials fallback
const PALETTE = [
  { bg: '#D1EBDB', color: '#1a5c3a' },
  { bg: '#C8B8FF', color: '#3d2a8a' },
  { bg: '#FFD6A5', color: '#7a3e0a' },
  { bg: '#B8E0FF', color: '#1a3d6b' },
  { bg: '#FFB3C6', color: '#7a1a36' },
  { bg: '#D4F1E8', color: '#0f5132' },
  { bg: '#FFF3CD', color: '#7a5a04' },
  { bg: '#E8D5F5', color: '#5a1a8a' },
];

function nameHash(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return h % PALETTE.length;
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || '?').toUpperCase();
}

/**
 * CreatorAvatar — renders a creator's photo; falls back to initials in a
 * HAZY-palette circle if the image URL is missing or fails to load.
 *
 * Props:
 *   src       string | null | undefined  — avatar URL
 *   name      string                     — creator name (for initials + color)
 *   size      number                     — diameter in px (default 44)
 *   style     object                     — extra styles on the wrapper
 *   onClick   function                   — optional click handler
 *   title     string                     — tooltip
 */
export default function CreatorAvatar({ src, name = '', size = 44, style = {}, onClick, title }) {
  const [failed, setFailed] = useState(false);

  const showFallback = !src || failed;
  const { bg, color } = PALETTE[nameHash(name)];
  const initials = getInitials(name);
  const fontSize = Math.round(size * 0.36);

  const base = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };

  if (showFallback) {
    return (
      <div style={{ ...base, background: bg }} onClick={onClick} title={title || name}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize, color, lineHeight: 1, userSelect: 'none' }}>
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div style={{ ...base, background: bg }} onClick={onClick} title={title || name}>
      <img
        src={src}
        alt={name}
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  );
}
