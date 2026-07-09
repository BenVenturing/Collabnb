import { useState, useEffect } from 'react';
import { ConvexClient } from 'convex/browser';
import logo              from '../../../assets/collabnb-logo.png';
import HeroSection     from './HeroSection';
import PricingCards    from './PricingCards';
import TierLadder      from './TierLadder';
import ValueSection    from './ValueSection';
import ClaritySection  from './ClaritySection';
import CollabCostSection from './CollabCostSection';
import FAQSection      from './FAQSection';
import TermsNote       from './TermsNote';

const CREATOR_CAP  = 100;
const HOST_CAP     = 100;
const LAUNCH_DATE  = new Date('2026-07-15T00:00:00+07:00');
const CONVEX_URL   = import.meta.env.VITE_CONVEX_URL;
const APP_URL = import.meta.env.VITE_APP_URL || '/';
// Below this, the marketplace isn't populated enough to look credible —
// mirrors the threshold used on the How it works page.
const MARKETPLACE_LISTINGS_THRESHOLD = 10;

export default function PricingPage() {
  const [founderCreatorCount, setFounderCreatorCount] = useState(0);
  const [founderHostCount,    setFounderHostCount]    = useState(0);
  const [lifetimeCount,       setLifetimeCount]       = useState(0);
  const [creatorCount,        setCreatorCount]        = useState(0);
  const [hostCount,           setHostCount]           = useState(0);
  const [marketplaceStats,    setMarketplaceStats]    = useState(null);

  const isUnlocked = new Date() >= LAUNCH_DATE;

  useEffect(() => {
    if (!CONVEX_URL) return;
    const client = new ConvexClient(CONVEX_URL);
    let cancelled = false;

    async function fetchCounts() {
      try {
        const profiles = await client.query('profiles:getAll');
        if (cancelled) return;
        setCreatorCount(profiles.filter(p => p.role === 'creator').length);
        setHostCount(profiles.filter(p => p.role === 'host').length);
        setLifetimeCount(profiles.filter(p => p.is_lifetime === true).length);
        // Founding members are those with is_founder=true
        setFounderCreatorCount(profiles.filter(p => p.is_founder === true && p.role === 'creator').length);
        setFounderHostCount(profiles.filter(p => p.is_founder === true && p.role === 'host').length);
      } catch (err) {
        console.warn('Pricing count fetch failed:', err);
      }
      try {
        const stats = await client.query('marketplaceStats:getStats');
        if (!cancelled) setMarketplaceStats(stats);
      } catch (err) {
        console.warn('Marketplace stats fetch failed:', err);
      }
    }

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => { cancelled = true; clearInterval(interval); client.close(); };
  }, []);

  const creatorSpotsRemaining = Math.max(0, CREATOR_CAP - founderCreatorCount);
  const hostSpotsRemaining    = Math.max(0, HOST_CAP - founderHostCount);
  const isFoundingFull = creatorSpotsRemaining <= 0 || hostSpotsRemaining <= 0;
  const spotsRemaining = Math.min(creatorSpotsRemaining, hostSpotsRemaining);

  function handleClaim() { window.location.href = '../join.html'; }
  function handleSubscribe(tier) { window.location.href = `${APP_URL}profile?subscribe=${tier}`; }
  function handleClaimLifetime() { window.location.href = `${APP_URL}profile?lifetime=claim`; }



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
          <li><a href="../about.html" className="text-sm font-medium no-underline" style={{ color:'var(--slate, #3C5759)' }}>About</a></li>
          <li><a href="../how-it-works.html" className="text-sm font-medium no-underline" style={{ color:'var(--slate, #3C5759)' }}>How it works</a></li>
          <li><a href="../faq.html" className="text-sm font-medium no-underline" style={{ color:'var(--slate, #3C5759)' }}>FAQ</a></li>
          <li><a href="index.html" className="text-sm font-medium no-underline" style={{ color:'var(--ink, #192524)', fontWeight:700 }}>Pricing</a></li>
        </ul>
        <div className="flex items-center gap-3">
          <span className="text-[0.65rem] uppercase tracking-widest text-sage font-medium bg-black/[0.04] px-2.5 py-1.5 rounded-full whitespace-nowrap">
            {founderCreatorCount}/100 · {founderHostCount}/100
          </span>
          <a href="../join.html" className="btn-ink text-xs py-2 px-4 whitespace-nowrap">
            Join
          </a>
        </div>
      </nav>

      <main style={{ paddingTop: '5rem' }}>
        <HeroSection
          spotsRemaining={spotsRemaining}
          isFoundingFull={isFoundingFull}
          founderCreatorCount={founderCreatorCount}
          founderHostCount={founderHostCount}
          marketplaceStats={marketplaceStats}
          marketplaceThreshold={MARKETPLACE_LISTINGS_THRESHOLD}
        />
        <PricingCards
          isFoundingFull={isFoundingFull}
          creatorSpotsRemaining={creatorSpotsRemaining}
          hostSpotsRemaining={hostSpotsRemaining}
          lifetimeCount={lifetimeCount}
          onClaim={handleClaim}
          onClaimLifetime={handleClaimLifetime}
          isUnlocked={isUnlocked}
          onSubscribe={handleSubscribe}
        />
        {/* TierLadder is now shown inline in the center card once founding is full */}
        {!isFoundingFull && <TierLadder />}
        <ValueSection />
        <ClaritySection />
        <CollabCostSection />
        <FAQSection />
        <TermsNote />
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
          <a href="../about.html" className="hover:text-slate transition-colors no-underline">About</a>
          <a href="../faq.html" className="hover:text-slate transition-colors no-underline">FAQ</a>
          <a href="mailto:hellocollabnb@gmail.com" className="hover:text-slate transition-colors no-underline">Contact</a>
        </div>
      </footer>
    </>
  );
}
