// Subtle on-brand watermark overlaid on sample-listing hero images —
// a single slightly-diagonal pill: deep forest text on a translucent light scrim.
export default function SampleWatermark() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <span style={{
        transform: 'rotate(-8deg)',
        padding: '0.32rem 1rem',
        borderRadius: 9999,
        background: 'rgba(239,236,233,0.78)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        border: '1px solid rgba(25,37,36,0.08)',
        boxShadow: '0 2px 10px rgba(25,37,36,0.10)',
        fontFamily: 'var(--font-body)',
        fontSize: '0.6rem',
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: '#192524',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}>
        Sample listing
      </span>
    </div>
  );
}
