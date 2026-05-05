import AppNav from './AppNav';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on the contract page itself (it has its own back button)
  const showContractBtn = location.pathname !== '/contract';

  return (
    <>
      {/* ── HAZY background layers (exact match to website) ─────────────────── */}
      <div aria-hidden="true" className="bg-layers bg-base" />
      <div aria-hidden="true" className="bg-layers bg-gradient" />
      <div aria-hidden="true" className="bg-layers bg-clouds" />
      <div aria-hidden="true" className="bg-grain" />

      {/* ── Floating nav pill ───────────────────────────────────────────────── */}
      <AppNav />

      {/* ── Page content (padded below the floating nav) ────────────────────── */}
      <main id="main" className="relative z-10 pt-28">
        {children}
      </main>

      {/* ── Floating contract button (bottom-left) ──────────────────────────── */}
      {showContractBtn && (
        <button
          onClick={() => navigate('/contract')}
          className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl
                     bg-white/80 backdrop-blur-xl border border-white/70
                     shadow-lg hover:shadow-xl hover:bg-white/95
                     transition-all duration-200 text-ink text-sm font-semibold
                     active:scale-95"
          aria-label="Open contract builder"
          title="Contract Builder"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <span className="hidden sm:inline">Contract</span>
        </button>
      )}
    </>
  );
}
