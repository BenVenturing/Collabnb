import AppNav from './AppNav';

export default function Layout({ children }) {
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
    </>
  );
}
