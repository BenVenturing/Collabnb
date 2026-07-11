import logo              from '../../../assets/collabnb-logo.png';
import CollabCostSection from './CollabCostSection';

// Standalone Collab cost calculator page. Reuses the pricing site's chrome
// (background layers, floating nav pill, footer) so it feels native, and renders
// the same CollabCostSection / PricingTool as the single source of truth.
export default function CalculatorPage() {
  return (
    <>
      {/* ── Background layers (matches marketing site) ── */}
      <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:-10, pointerEvents:'none', background:'#EFECE9' }} />
      <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:-10, pointerEvents:'none', background:'radial-gradient(ellipse 90% 60% at 50% 0%, #D1EBDB 0%, transparent 70%)' }} />
      <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:-10, pointerEvents:'none', backgroundImage:"url('../assets/bg-clouds-hazy.png')", backgroundSize:'cover', backgroundPosition:'center', opacity:0.18, mixBlendMode:'multiply', filter:'saturate(0.5) brightness(1.1)' }} />
      <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:50, pointerEvents:'none', opacity:0.03, backgroundImage:"url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence baseFrequency='0.9'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }} />

      {/* ── Floating nav pill (matches marketing site) ── */}
      <nav
        className="nav-pill glass scrolled"
        aria-label="Main navigation"
        style={{ position:'fixed', top:'1rem', left:'50%', transform:'translateX(-50%)', zIndex:40 }}
      >
        <a href="../index.html" className="nav-logo" aria-label="Collabnb home">
          <img src={logo} alt="" role="presentation" width="28" height="28" />
          <span>Collabnb</span>
        </a>
        <ul className="nav-links" role="list" style={{ display:'flex', listStyle:'none', gap:'1.25rem', margin:0, padding:0 }}>
          <li><a href="../index.html" className="text-sm font-medium no-underline" style={{ color:'var(--slate, #3C5759)' }}>Home</a></li>
          <li><a href="../how-it-works.html" className="text-sm font-medium no-underline" style={{ color:'var(--slate, #3C5759)' }}>How it works</a></li>
          <li><a href="index.html" className="text-sm font-medium no-underline" style={{ color:'var(--slate, #3C5759)' }}>Pricing</a></li>
          <li><a href="calculator.html" className="text-sm font-medium no-underline" style={{ color:'var(--ink, #192524)', fontWeight:700 }}>Calculator</a></li>
        </ul>
        <div className="flex items-center gap-3">
          <a href="../join.html" className="btn-ink text-xs py-2 px-4 whitespace-nowrap">
            Join
          </a>
        </div>
      </nav>

      <main style={{ paddingTop: '6rem', minHeight: '70vh' }}>
        <CollabCostSection />
      </main>

      {/* ── Footer ── */}
      <footer className="max-w-7xl mx-auto px-4 md:px-8 py-10 border-t border-black/[0.05]
                         flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-sage">
        <div className="flex items-center gap-2">
          <img src={logo} alt="" width="18" height="18" className="opacity-40 grayscale" />
          <span>© 2026 Collabnb. All rights reserved.</span>
        </div>
        <div className="flex gap-5">
          <a href="../index.html" className="hover:text-slate transition-colors no-underline">Home</a>
          <a href="index.html" className="hover:text-slate transition-colors no-underline">Pricing</a>
          <a href="../faq.html" className="hover:text-slate transition-colors no-underline">FAQ</a>
          <a href="mailto:hellocollabnb@gmail.com" className="hover:text-slate transition-colors no-underline">Contact</a>
        </div>
      </footer>
    </>
  );
}
