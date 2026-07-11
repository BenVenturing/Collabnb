import PricingTool, { PointsHelpButton } from '../../../app/src/components/PricingTool';

// Reuses the exact same PricingTool the app mounts on Explore + listing forms,
// so pricing logic stays a single source of truth. Anchored at #calculator for
// the marketing site's "More → Collab cost calculator" link.
export default function CollabCostSection() {
  return (
    <section
      id="calculator"
      style={{ maxWidth: 640, margin: '0 auto', padding: '3.5rem 1.25rem 1rem', scrollMarginTop: '6rem' }}
    >
      <p style={{
        textAlign: 'center', fontFamily: "'Cabinet Grotesk', ui-sans-serif, sans-serif",
        textTransform: 'uppercase', letterSpacing: '0.18em', fontSize: '0.7rem', fontWeight: 600,
        color: 'var(--sage, #959D90)', margin: '0 0 1.25rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
      }}>
        Collab cost calculator
        <span className="beta-pill">Beta</span>
      </p>
      <div style={{ position: 'relative' }}>
        {/* Mint glow in the Collabnb palette, blooming behind the glass panel */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: '-12% -8% -8%', zIndex: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 70% at 50% 20%, var(--mint, #D1EBDB) 0%, transparent 70%)',
          filter: 'blur(8px)', opacity: 0.85,
        }} />
        <div className="glass rounded-glass" style={{ position: 'relative', zIndex: 1, padding: '1.25rem' }}>
          <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 2 }}>
            <PointsHelpButton />
          </div>
          <PricingTool mode="sandbox" />
        </div>
      </div>
    </section>
  );
}
