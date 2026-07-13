// Subtle on-brand watermark overlaid on sample-listing hero images —
// tiled diagonal rows of light text, like a stock-photo watermark.
const ROW_TEXT = new Array(4).fill('SAMPLE LISTING').join('   ·   ');
const ROWS = new Array(10).fill(ROW_TEXT);

export default function SampleWatermark() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '220%',
        transform: 'translate(-50%, -50%) rotate(-30deg)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.2rem',
      }}>
        {ROWS.map((text, i) => (
          <div key={i} style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.45)',
            textShadow: '0 1px 3px rgba(0,0,0,0.3)',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            userSelect: 'none',
          }}>
            {text}
          </div>
        ))}
      </div>
    </div>
  );
}
