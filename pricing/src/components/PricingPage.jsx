import { useState, useEffect } from 'react';
import HeroSection     from './HeroSection';
import PricingCards    from './PricingCards';
import TierLadder      from './TierLadder';
import ValueSection    from './ValueSection';
import ClaritySection  from './ClaritySection';
import FAQSection      from './FAQSection';
import TermsNote       from './TermsNote';
import { supabase }    from '../../../scripts/supabase';

const FOUNDING_TOTAL = 100;

export default function PricingPage() {
  const [creatorCount, setCreatorCount] = useState(0);
  const [hostCount, setHostCount] = useState(0);

  // Fetch live counts from Supabase
  useEffect(() => {
    // Initial fetch
    Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'creator'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'host')
    ]).then(([cRes, hRes]) => {
      if (cRes.count != null) setCreatorCount(cRes.count);
      if (hRes.count != null) setHostCount(hRes.count);
    });

    // Real-time subscription
    const channel = supabase
      .channel('pricing-sync')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'profiles' }, 
        (payload) => {
          if (payload.new.role === 'creator') setCreatorCount(prev => prev + 1);
          if (payload.new.role === 'host') setHostCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const spotsRemaining = Math.max(0, FOUNDING_TOTAL - creatorCount);
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
          <img src="/assets/collabnb-logo.png" alt="" width="28" height="28" />
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
        <span>© 2026 Collabnb. All rights reserved.</span>
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
