import { useState, useEffect } from 'react';
import ConfettiCanvas  from './ConfettiCanvas';
import SuccessModal    from './SuccessModal';
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
  const [slotsUsed,    setSlotsUsed]    = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [user,         setUser]         = useState(null);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch live creator count from Supabase
  useEffect(() => {
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'creator')
      .then(({ count }) => {
        if (count != null) setSlotsUsed(count);
      });
  }, []);

  const spotsRemaining = Math.max(0, FOUNDING_TOTAL - slotsUsed);
  const isFoundingFull  = spotsRemaining <= 0;

  function handleClaim() {
    if (!user) {
      // Redirect to signup modal on main site
      window.location.href = '../index.html?join=true';
      return;
    }
    setShowConfetti(true);
    setShowModal(true);
    setTimeout(() => setShowConfetti(false), 4000);
  }

  function handleCloseModal() {
    setShowModal(false);
  }

  return (
    <>
      {/* ── Background layers (mirrors main site HAZY theme) ── */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: -10,
        background: '#EFECE9',
      }} />
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: -9,
        background: 'radial-gradient(ellipse 110% 55% at 55% -5%, #D1EBDB 0%, transparent 70%)',
      }} />
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: -8,
        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Cfilter id=\'g\'%3E%3CfeTurbulence baseFrequency=\'0.75\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3CfeColorMatrix type=\'saturate\' values=\'0\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23g)\' opacity=\'0.3\'/%3E%3C/svg%3E")',
        opacity: 0.08,
        pointerEvents: 'none',
      }} />

      <ConfettiCanvas active={showConfetti} />
      <SuccessModal open={showModal} onClose={handleCloseModal} />

      {/* ── Nav link back to main site ── */}
      <header className="max-w-7xl mx-auto px-4 md:px-8 pt-6 flex items-center justify-between">
        <a
          href="../index.html"
          className="flex items-center gap-2 text-ink no-underline hover:opacity-60 transition-opacity"
        >
          <img src="/assets/collabnb-logo.png" alt="" width="28" height="28" />
          <span className="font-display font-bold text-base tracking-tight">Collabnb</span>
        </a>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-sage font-medium hidden sm:block">{user.email}</span>
              <button 
                onClick={() => supabase.auth.signOut()}
                className="btn-glass text-xs py-2 px-4"
              >
                Sign out
              </button>
            </div>
          ) : (
            <a href="../join.html" className="btn-ink text-sm py-2.5 px-5">
              Join the Waitlist
            </a>
          )}
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
