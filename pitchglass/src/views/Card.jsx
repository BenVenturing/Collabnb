import { SOURCES } from '../data.js';

export function SourceChip({ source }) {
  const s = SOURCES[source] || SOURCES.link;
  return <span className={`chip ${s.hue}`}>{s.label}</span>;
}

export function Fit({ value, why }) {
  if (value == null) return null;
  const tone = value >= 75 ? 'good' : value >= 55 ? 'ok' : 'low';
  return (
    <span className={`fit ${tone}`} title={why || 'Fit with your profile'} tabIndex={0}>
      {value}% fit
    </span>
  );
}
