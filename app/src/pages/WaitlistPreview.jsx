import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SAMPLE_LISTINGS, IMG_FALLBACK } from '../lib/mockData';

// ─── Canvas confetti ──────────────────────────────────────────────────────────
function Confetti() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const COLORS = ['#4ecdc4','#7ecfc4','#ffd93d','#ff6b6b','#a8e6cf','#c7f0db','#ffffff','#d1ebdb','#f7c59f'];
    const particles = Array.from({ length: 220 }, (_, i) => ({
      x: Math.random() * W,
      y: -20 - Math.random() * 300,
      w: Math.random() * 9 + 4,
      h: Math.random() * 5 + 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx: (Math.random() - 0.5) * 2.5,
      vy: Math.random() * 3.5 + 1.5,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.12,
      opacity: 1,
      delay: i * 3,
    }));

    let frame;
    let tick = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      tick++;
      let alive = false;

      particles.forEach(p => {
        if (tick < p.delay) { alive = true; return; }
        p.x += p.vx + Math.sin(tick * 0.02 + p.delay) * 0.4;
        p.y += p.vy;
        p.angle += p.spin;
        if (p.y > H * 0.65) p.opacity = Math.max(0, p.opacity - 0.018);
        if (p.opacity <= 0) return;
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      if (alive) frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 9999,
      }}
    />
  );
}

// ─── Blurred/locked listing card ─────────────────────────────────────────────
function LockedCard({ listing }) {
  return (
    <div style={{
      borderRadius: '1.5rem',
      overflow: 'hidden',
      background: '#fff',
      boxShadow: '0 2px 16px rgba(25,37,36,0.08)',
      userSelect: 'none',
      position: 'relative',
    }}>
      {/* Image with blur */}
      <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden' }}>
        <img
          src={listing.image || IMG_FALLBACK}
          alt=""
          role="presentation"
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            filter: 'blur(6px)',
            transform: 'scale(1.08)',
          }}
        />
        {/* Dark overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(25,37,36,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1.5px solid rgba(255,255,255,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
        </div>
        {/* Property type pill */}
        {listing.property_type && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.8)',
            padding: '3px 10px', borderRadius: 999,
            fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em',
            filter: 'none', // pill stays sharp
          }}>
            {listing.property_type}
          </div>
        )}
      </div>

      {/* Text area — slightly blurred */}
      <div style={{ padding: '1rem 1.1rem 1.25rem', filter: 'blur(3px)' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)', margin: 0, marginBottom: '0.2rem' }}>
          {listing.title}
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--sage)', margin: 0, marginBottom: '0.6rem' }}>
          {listing.location}
        </p>
        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate)', margin: 0 }}>
          {listing.compensation}
        </p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function WaitlistPreview() {
  const { profile, signOut } = useAuth();
  const previewListings = SAMPLE_LISTINGS.slice(0, 6);

  return (
    <>
      <Confetti />

      {/* ── HAZY background ───────────────────────────────────────────────── */}
      <div aria-hidden="true" className="bg-layers bg-base" />
      <div aria-hidden="true" className="bg-layers bg-gradient" />
      <div aria-hidden="true" className="bg-layers bg-clouds" />
      <div aria-hidden="true" className="bg-grain" />

      {/* ── Minimal header ────────────────────────────────────────────────── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/assets/collabnb-logo.png" alt="Collabnb" width="28" height="28" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--ink)' }}>
            Collabnb
          </span>
        </div>
        <button
          onClick={signOut}
          style={{
            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(209,235,219,0.6)',
            borderRadius: 999, padding: '0.4rem 1rem',
            fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate)',
            cursor: 'pointer', transition: 'background 0.15s',
          }}
        >
          Sign out
        </button>
      </header>

      {/* ── Page content ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 10,
        minHeight: '100dvh',
        paddingTop: '6rem',
        paddingBottom: '5rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem 2rem', maxWidth: 520 }}>
          {/* Checkmark circle */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #c7f0db, #a8e6cf)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: '0 8px 32px rgba(78,205,196,0.25)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#192524" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
            color: 'var(--ink)', margin: 0, marginBottom: '0.75rem',
            lineHeight: 1.15,
          }}>
            You're on the list!
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--slate)', lineHeight: 1.65, margin: 0 }}>
            Welcome to Collabnb{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}. Your application is being reviewed — we'll email you at{' '}
            <strong style={{ color: 'var(--ink)' }}>{profile?.email || 'your inbox'}</strong> once you're approved.
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--sage)', marginTop: '0.75rem' }}>
            Usually within 1–2 business days.
          </p>
        </div>

        {/* Divider */}
        <div style={{
          width: '100%', maxWidth: 760,
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: '0 1.5rem', marginBottom: '1.75rem',
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--stone)' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sage)', whiteSpace: 'nowrap' }}>
            A sneak peek of what's waiting for you
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--stone)' }} />
        </div>

        {/* Locked listing grid */}
        <div style={{
          width: '100%', maxWidth: 960,
          padding: '0 1.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1.25rem',
        }}>
          {previewListings.map(listing => (
            <LockedCard key={listing.id} listing={listing} />
          ))}
        </div>

        {/* Bottom status card */}
        <div style={{
          marginTop: '3rem',
          background: 'rgba(255,255,255,0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(209,235,219,0.7)',
          borderRadius: '1.5rem',
          padding: '1.75rem 2rem',
          maxWidth: 480, width: 'calc(100% - 3rem)',
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              background: 'rgba(78,205,196,0.15)', color: '#2d7a6a',
              padding: '0.25rem 0.75rem', borderRadius: 999,
              fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ecdc4', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
              REVIEW IN PROGRESS
            </span>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate)', lineHeight: 1.65, margin: 0 }}>
            Once approved, you'll unlock full access to browse, apply to collabs, and message hosts. Full listings go live <strong>July 1st</strong>.
          </p>
        </div>

      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </>
  );
}
