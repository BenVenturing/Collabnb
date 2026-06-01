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

const CREATOR_CAP  = 100;
const HOST_CAP     = 100;
const LAUNCH_DATE  = new Date('2026-07-01T00:00:00Z');
const CONVEX_URL   = import.meta.env.VITE_CONVEX_URL;
// After July 1, clicking a paid plan redirects to the app's subscription flow.
// The app detects ?subscribe=monthly|yearly and auto-opens the payment modal.
const APP_URL = import.meta.env.VITE_APP_URL || '../app/';

export default function PricingPage() {
  const [creatorCount, setCreatorCount] = useState(0);
  const [hostCount, setHostCount]       = useState(0);

  const isUnlocked = new Date() >= LAUNCH_DATE;

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

  const creatorSpotsRemaining = Math.max(0, CREATOR_CAP - creatorCount);
  const hostSpotsRemaining    = Math.max(0, HOST_CAP - hostCount);
  // Founding is full when EITHER cap is reached
  const isFoundingFull = creatorSpotsRemaining <= 0 || hostSpotsRemaining <= 0;
  const spotsRemaining = Math.min(creatorSpotsRemaining, hostSpotsRemaining);

  function handleClaim() {
    window.location.href = '../join.html';
  }

  function handleSubscribe(tier) {
    // Redirect to the app; Clerk will prompt login if needed,
    // then the profile page auto-opens the subscription modal.
    window.location.href = `${APP_URL}#/profile?subscribe=${tier}`;
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
            {creatorCount}/100 Creators · {hostCount}/100 Hosts Joined
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
          creatorSpotsRemaining={creatorSpotsRemaining}
          hostSpotsRemaining={hostSpotsRemaining}
          onClaim={handleClaim}
          isUnlocked={isUnlocked}
          onSubscribe={handleSubscribe}
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
