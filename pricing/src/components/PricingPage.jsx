import { useState, useEffect } from 'react';
import { ConvexClient } from 'convex/browser';
import logo              from '../../../assets/collabnb-logo.png';
import HeroSection     from './HeroSection';
import PricingCards    from './PricingCards';
import TierLadder      from './TierLadder';
import ValueSection    from './ValueSection';
import ClaritySection  from './ClaritySection';
import FAQSection      from './FAQSection';
import TermsNote       from './TermsNote';

const FOUNDING_TOTAL = 200;
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

export default function PricingPage() {
  const [creatorCount, setCreatorCount] = useState(0);
  const [hostCount, setHostCount] = useState(0);

  // Fetch live counts from Convex
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
      } catch (err) {
        console.warn('Pricing count fetch failed:', err);
      }
    }

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      client.close();
    };
  }, []);

  const totalJoined = creatorCount + hostCount;
  const spotsRemaining = Math.max(0, FOUNDING_TOTAL - totalJoined);
  const isFoundingFull  = spotsRemaining <= 0;

  function handleClaim() {
    window.location.href = '../join.html';
  }



  return (
    <>
      {/* ... previous background layers ... */}
      
      {/* ── Nav link back to main site ── */}
      <header className="max-w-7xl mx-auto px-4 md:px-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <a
          href="../index.html"
          className="flex items-center gap-2 text-ink no-underline hover:opacity-60 transition-opacity"
        >
          <img src={logo} alt="" width="28" height="28" />
          <span className="font-display font-bold text-base tracking-tight">Collabnb</span>
        </a>
        
        <div className="flex items-center gap-4">
          <span className="text-[0.7rem] uppercase tracking-widest text-sage font-medium bg-black/[0.03] px-3 py-1.5 rounded-full">
            {creatorCount} Creators & {hostCount} Hosts Joined
          </span>
          <a href="../join.html" className="btn-ink text-sm py-2.5 px-5">
            Join the Waitlist
          </a>
        </div>
      </header>

      <main>
        <HeroSection spotsRemaining={spotsRemaining} isFoundingFull={isFoundingFull} />
        <PricingCards
          isFoundingFull={isFoundingFull}
          spotsRemaining={spotsRemaining}
          onClaim={handleClaim}
        />
        <TierLadder />
        <ValueSection />
        <ClaritySection />
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
