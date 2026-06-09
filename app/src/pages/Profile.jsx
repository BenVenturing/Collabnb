import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

// Convex storage URL prefix; used to construct public URLs from storage IDs
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

/**
 * Resize an image file via canvas, upload the resulting JPEG blob to Convex
 * storage, and return the public URL. Falls back to a base64 data URL when
 * Convex storage is unavailable (mock/dev mode).
 */
async function uploadResizedImage(file, maxW, maxH, uploadFn, quality = 0.85) {
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => { URL.revokeObjectURL(i.src); resolve(i); };
    i.onerror = reject;
    i.src = URL.createObjectURL(file);
  });
  const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  if (uploadFn && CONVEX_URL) {
    const uploadUrl = await uploadFn();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
    const { storageId } = await res.json();
    return `${CONVEX_URL}/api/storage/${storageId}`;
  }
  // Fallback: base64 data URL (mock / local dev without Convex storage)
  return canvas.toDataURL('image/jpeg', quality);
}
import { useAuth } from '../contexts/AuthContext';
import { useCollabs } from '../contexts/CollabContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import GlobeCanvas, { countGlobeStats } from '../components/GlobeCanvas';
import LifetimeAccessModal from '../components/LifetimeAccessModal';
import TravelCalendar from '../components/TravelCalendar';
import { SAMPLE_COLLABORATIONS, SAMPLE_LISTINGS } from '../lib/mockData';
import { getPitchCount } from '../lib/pitchCount';
import { cache } from '../lib/cache';
import { reopenChecklist } from '../components/OnboardingChecklist';

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmtFollowers(n) {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

// ─── SVG icons ────────────────────────────────────────────────────────────────
const GlobeIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <circle cx="128" cy="128" r="96"/><ellipse cx="128" cy="128" rx="40" ry="96"/>
    <line x1="32" y1="128" x2="224" y2="128"/><line x1="40" y1="96" x2="216" y2="96"/><line x1="40" y1="160" x2="216" y2="160"/>
  </svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="32" y="32" width="192" height="192" rx="48"/>
    <circle cx="128" cy="128" r="40"/>
    <circle cx="180" cy="76" r="6" fill="currentColor" stroke="none"/>
  </svg>
);
const TikTokIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M168,32c0,32,24,48,48,48"/><path d="M104,104v96a40,40,0,1,1-40-40h8"/><path d="M168,32v128a64,64,0,0,1-64,64"/>
  </svg>
);
const YouTubeIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M222.77,73.34A24,24,0,0,0,206,56.29C192.28,52,128,52,128,52S63.72,52,50,56.29a24,24,0,0,0-16.77,17A251.74,251.74,0,0,0,28,128a251.74,251.74,0,0,0,5.23,54.66A24,24,0,0,0,50,199.71C63.72,204,128,204,128,204s64.28,0,78-4.29a24,24,0,0,0,16.77-17A251.74,251.74,0,0,0,228,128,251.74,251.74,0,0,0,222.77,73.34Z"/>
    <polygon points="108 152 156 128 108 104 108 152" fill="currentColor" stroke="none" opacity="0.7"/>
    <polygon points="108 152 156 128 108 104 108 152"/>
  </svg>
);
const ArrowOut = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <polyline points="136 32 224 32 224 120"/><line x1="224" y1="32" x2="136" y2="120"/>
    <path d="M184,136v72a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8h72"/>
  </svg>
);
const ChecklistIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <line x1="40" y1="60" x2="136" y2="60"/><line x1="40" y1="96" x2="184" y2="96"/><line x1="40" y1="132" x2="136" y2="132"/>
    <circle cx="192" cy="128" r="40"/>
    <polyline points="184 128 192 136 206 120" strokeWidth="16"/>
    <line x1="40" y1="168" x2="96" y2="168"/>
  </svg>
);
const ChevronR = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <polyline points="96 48 176 128 96 208"/>
  </svg>
);
const FileTextIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M200,224H56a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h96l56,56V216A8,8,0,0,1,200,224Z"/>
    <polyline points="152 32 152 88 208 88"/>
    <line x1="96" y1="128" x2="160" y2="128"/><line x1="96" y1="160" x2="160" y2="160"/><line x1="96" y1="192" x2="136" y2="192"/>
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="40" y="112" width="176" height="128" rx="8"/>
    <path d="M88,112V80a40,40,0,0,1,80,0v32"/>
  </svg>
);
const BellIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M96,192a32,32,0,0,0,64,0"/>
    <path d="M56,104a72,72,0,0,1,144,0c0,35.82,8.3,56.6,14.9,68A8,8,0,0,1,208,184H48a8,8,0,0,1-6.88-12C47.71,160.6,56,139.81,56,104Z"/>
  </svg>
);
const SealCheck = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M54.46,201.54C40,195.2,28,182,28,160c0-13.35-8.27-25.37-14.16-36.77A22.07,22.07,0,0,1,28,96c0-22,15.89-37.48,28-48.16A22.07,22.07,0,0,1,76,32c13.35,0,25.37-8.27,36.77-14.16a22.07,22.07,0,0,1,26.46,0C150.63,23.73,162.65,32,176,32a22.07,22.07,0,0,1,20,15.84C208.11,58.52,224,74,224,96a22.07,22.07,0,0,1,14.16,27.23C232.27,134.63,224,146.65,224,160c0,22-15.89,37.48-28,48.16A22.07,22.07,0,0,1,176,224c-13.35,0-25.37,8.27-36.77,14.16a22.07,22.07,0,0,1-26.46,0C101.37,232.27,89.35,224,76,224a22.07,22.07,0,0,1-21.54-22.46Z"/>
    <polyline points="88 136 112 160 168 104"/>
  </svg>
);
const SwitchIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <polyline points="160 48 208 96 160 144"/><line x1="48" y1="96" x2="208" y2="96"/>
    <polyline points="96 112 48 160 96 208"/><line x1="208" y1="160" x2="48" y2="160"/>
  </svg>
);
const SignOutIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M112,216H48a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8h64"/>
    <polyline points="168 160 216 128 168 96"/><line x1="104" y1="128" x2="216" y2="128"/>
  </svg>
);
const GearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const PencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const CreditCardIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="24" y="56" width="208" height="144" rx="16"/>
    <line x1="24" y1="104" x2="232" y2="104"/>
    <line x1="64" y1="152" x2="96" y2="152"/>
    <line x1="120" y1="152" x2="136" y2="152"/>
  </svg>
);

// ─── Tooltip wrapper ───────────────────────────────────────────────────────────
function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', cursor: 'default' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(25,37,36,0.92)', backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          color: '#EFECE9', fontSize: '0.72rem', padding: '0.5rem 0.75rem',
          borderRadius: '0.75rem', maxWidth: '260px', width: 'max-content',
          zIndex: 100, textAlign: 'center', lineHeight: 1.4, pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(25,37,36,0.25)',
        }}>
          {text}
          <span style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid rgba(25,37,36,0.92)',
          }} />
        </span>
      )}
    </span>
  );
}

// ─── Polished badges ─────────────────────────────────────────────────────────
function VerifiedBadge() {
  return (
    <Tooltip text="Verified Creator — personally audited and checked by the Collabnb team.">
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '22px', height: '22px', borderRadius: '50%',
          background: 'var(--slate)', flexShrink: 0, cursor: 'default',
          boxShadow: '0 1px 4px rgba(60,87,89,0.3)',
        }}
      >
        <svg viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="9" height="9">
          <polyline points="2 7 5.5 10.5 12 3.5" />
        </svg>
      </span>
    </Tooltip>
  );
}

function FoundingMemberBadge() {
  return (
    <Tooltip text="Founding Member — one of the first hundred to sign up for the program.">
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          padding: '0.22rem 0.7rem 0.22rem 0.5rem',
          background: 'linear-gradient(135deg, rgba(212,168,67,0.13) 0%, rgba(212,168,67,0.06) 100%)',
          border: '1px solid rgba(212,168,67,0.35)',
          borderRadius: '999px', cursor: 'default',
        }}
      >
        <svg viewBox="0 0 16 16" width="11" height="11" fill="#D4A843">
          <path d="M8 1.5l1.67 3.38 3.73.54-2.7 2.63.64 3.72L8 9.77l-3.34 1.76.64-3.72L2.6 5.42l3.73-.54z"/>
        </svg>
        <span style={{ fontSize: '0.67rem', fontWeight: 700, color: '#A87820', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Founding Member
        </span>
      </span>
    </Tooltip>
  );
}

// ─── Banner crop editor ───────────────────────────────────────────────────────
function BannerCropEditor({ file, onApply, onCancel }) {
  const imgRef   = useRef(null);
  const dragRef  = useRef(null);
  const [src, setSrc]           = useState(null);
  const [nat, setNat]           = useState({ w: 1, h: 1 });
  const [zoom, setZoom]         = useState(1);
  const [offset, setOffset]     = useState({ x: 0, y: 0 });

  const PW = Math.min(typeof window !== 'undefined' ? window.innerWidth - 80 : 700, 700);
  const PH = Math.round(PW / 3);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => setSrc(e.target.result);
    reader.readAsDataURL(file);
  }, [file]);

  function getBase(nw, nh) {
    const ca = PW / PH, ia = nw / nh;
    return ia > ca ? { w: PH * ia, h: PH } : { w: PW, h: PW / ia };
  }

  function clamp(ox, oy, z) {
    const b = getBase(nat.w, nat.h);
    const dw = b.w * z, dh = b.h * z;
    const cx0 = (PW - dw) / 2, cy0 = (PH - dh) / 2;
    return {
      x: Math.min(Math.max(ox, cx0 <= 0 ? cx0 : 0), cx0 >= 0 ? cx0 : 0),
      y: Math.min(Math.max(oy, cy0 <= 0 ? cy0 : 0), cy0 >= 0 ? cy0 : 0),
    };
  }

  function startDrag(clientX, clientY) {
    dragRef.current = { sx: clientX - offset.x, sy: clientY - offset.y };
    const move = (e) => {
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      setOffset(clamp(cx - dragRef.current.sx, cy - dragRef.current.sy, zoom));
    };
    const end = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', end); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', end); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);
  }

  function handleWheel(e) {
    e.preventDefault();
    const z = Math.min(Math.max(zoom - e.deltaY * 0.002, 1), 4);
    setZoom(z); setOffset(o => clamp(o.x, o.y, z));
  }

  function handleApply() {
    const img = imgRef.current; if (!img) return;
    const b = getBase(nat.w, nat.h);
    const dw = b.w * zoom, dh = b.h * zoom;
    const imgX = (PW - dw) / 2 + offset.x, imgY = (PH - dh) / 2 + offset.y;
    const sx = (-imgX) * (nat.w / dw), sy = (-imgY) * (nat.h / dh);
    const sw = PW * (nat.w / dw),      sh = PH * (nat.h / dh);
    const canvas = document.createElement('canvas');
    canvas.width = 900; canvas.height = 300;
    canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, 900, 300);
    onApply(canvas.toDataURL('image/jpeg', 0.78));
  }

  const b = getBase(nat.w, nat.h);
  const dw = b.w * zoom, dh = b.h * zoom;
  const imgLeft = (PW - dw) / 2 + offset.x, imgTop = (PH - dh) / 2 + offset.y;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(25,37,36,0.88)', backdropFilter: 'blur(8px)', padding: '1.5rem' }}>
      <div style={{ background: 'white', borderRadius: '1.25rem', padding: '1.5rem', maxWidth: PW + 48, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
        <h3 style={{ margin: '0 0 0.25rem', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)' }}>Position Banner Image</h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--sage)', margin: '0 0 1rem' }}>Drag to reposition · scroll or slider to zoom</p>
        <div
          style={{ width: PW, height: PH, overflow: 'hidden', borderRadius: '0.75rem', cursor: 'grab', userSelect: 'none', position: 'relative', background: '#1a2322', touchAction: 'none' }}
          onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
          onTouchStart={(e) => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY); }}
          onWheel={handleWheel}
        >
          {src && <img ref={imgRef} src={src} onLoad={(e) => { setNat({ w: e.target.naturalWidth, h: e.target.naturalHeight }); }} style={{ position: 'absolute', left: imgLeft, top: imgTop, width: dw, height: dh, maxWidth: 'none', pointerEvents: 'none', display: 'block' }} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0 1.25rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--sage)', fontWeight: 600, flexShrink: 0 }}>Zoom</span>
          <input type="range" min="1" max="4" step="0.05" value={zoom} onChange={(e) => { const z = Number(e.target.value); setZoom(z); setOffset(o => clamp(o.x, o.y, z)); }} style={{ flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn-glass" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={handleApply}>Apply</button>
        </div>
      </div>
    </div>
  );
}

// ─── Coin flip avatar ─────────────────────────────────────────────────────────
function CoinFlip({ frontSrc, backSrc, editMode, onEdit, initials = '?' }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div
      style={{ position: 'relative', width: '76px', height: '76px', perspective: '300px', cursor: editMode ? 'pointer' : 'default' }}
      onMouseEnter={() => { if (!editMode) setFlipped(true); }}
      onMouseLeave={() => { if (!editMode) setFlipped(false); }}
      onClick={() => { if (editMode) onEdit(); }}
    >
      {/* White border ring (stays still) */}
      <div style={{
        position: 'absolute', inset: '-3px', borderRadius: '50%',
        border: '3px solid white', boxShadow: '0 4px 18px rgba(25,37,36,0.24)',
        zIndex: 2, pointerEvents: 'none',
      }} />
      {/* Flipping card */}
      <div style={{
        width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        position: 'relative',
      }}>
        {/* Front — profile photo */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden',
          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
          background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-display, sans-serif)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--slate)' }}>{initials}</span>
          {frontSrc && (
            <img
              src={frontSrc}
              alt="Profile"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
        </div>
        {/* Back — listing photo */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden',
          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
        }}>
          <img src={backSrc} alt="Listing" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      </div>
      {/* Edit overlay (only in edit mode) */}
      {editMode && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%', zIndex: 3,
          background: 'rgba(25,37,36,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: 'white', fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'center', lineHeight: 1.2 }}>
            Change
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Edit field ───────────────────────────────────────────────────────────────
function EditField({ label, value, onChange, multiline, prefix }) {
  const base = {
    width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.75rem',
    background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(25,37,36,0.12)',
    fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink)',
    outline: 'none', boxSizing: 'border-box',
  };
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--sage)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </label>
      {prefix ? (
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.75)', borderRadius: '0.75rem', border: '1px solid rgba(25,37,36,0.12)', overflow: 'hidden' }}>
          <span style={{ padding: '0.625rem 0 0.625rem 0.875rem', color: 'var(--sage)', fontSize: '0.875rem', flexShrink: 0 }}>{prefix}</span>
          <input value={value} onChange={(e) => onChange(e.target.value)} style={{ ...base, background: 'transparent', border: 'none', borderRadius: 0, paddingLeft: '0.2rem', flex: 1 }} />
        </div>
      ) : multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} style={{ ...base, resize: 'vertical' }} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} style={base} />
      )}
    </div>
  );
}

// ─── Social link row ─────────────────────────────────────────────────────────
function SocialRow({ icon, label, value, href }) {
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem',
        background: 'rgba(255,255,255,0.65)', borderRadius: '1rem',
        border: '1px solid rgba(255,255,255,0.8)', transition: 'background 180ms', textDecoration: 'none',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.92)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.65)'}
    >
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--slate)' }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink)', margin: 0 }}>{label}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
      </div>
      <span style={{ color: 'var(--stone)', flexShrink: 0 }}><ArrowOut /></span>
    </a>
  );
}

// ─── Settings row ─────────────────────────────────────────────────────────────
function SettingsRow({ icon, label, sublabel, isLast, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '1rem 1.25rem', borderBottom: isLast ? 'none' : '1px solid rgba(25,37,36,0.06)',
        background: 'transparent', transition: 'background 150ms',
        textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-body)',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.05)' : 'rgba(209,235,219,0.25)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%',
        background: danger ? 'rgba(239,68,68,0.08)' : 'rgba(209,235,219,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        color: danger ? '#ef4444' : 'var(--slate)',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: danger ? '#ef4444' : 'var(--slate)', margin: 0 }}>{label}</p>
        {sublabel && <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0.15rem 0 0' }}>{sublabel}</p>}
      </div>
      {!danger && <span style={{ color: 'var(--stone)' }}><ChevronR /></span>}
    </button>
  );
}

// ─── Past collab card ─────────────────────────────────────────────────────────
function PastCollabCard({ collab }) {
  const statusColors = {
    pending:  { bg: 'rgba(212,168,67,0.15)',  text: '#D4A843' },
    uploaded: { bg: 'rgba(74,155,210,0.15)',   text: '#4A9BD2' },
    approved: { bg: 'rgba(74,155,127,0.15)',   text: '#4A9B7F' },
  };
  const s = statusColors[collab.status] || statusColors.pending;
  const statusIcons = { pending: '🟡', uploaded: '🔵', approved: '🟢' };
  return (
    <div className="listing-card" style={{ width: '220px', flexShrink: 0 }}>
      <div style={{ position: 'relative', height: '140px', overflow: 'hidden', background: 'var(--stone)' }}>
        <img src={collab.image} alt={collab.property_name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(25,37,36,0.45) 0%, transparent 55%)' }} />
        <span style={{ position: 'absolute', top: '0.625rem', left: '0.625rem', background: 'rgba(25,37,36,0.65)', color: 'var(--bone)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>SAMPLE</span>
        <span style={{ position: 'absolute', bottom: '0.625rem', left: '0.625rem', color: 'rgba(239,236,233,0.9)', fontSize: '0.7rem', fontWeight: 500 }}>📍 {collab.location}</span>
      </div>
      <div style={{ padding: '0.875rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)', margin: '0 0 0.25rem', lineHeight: 1.2 }}>{collab.property_name}</p>
        <p style={{ fontSize: '0.7rem', color: 'var(--sage)', margin: '0 0 0.5rem' }}>{collab.dates}</p>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', background: s.bg, color: s.text, fontSize: '0.65rem', fontWeight: 600 }}>
          {statusIcons[collab.status]} {collab.status_text}
        </span>
      </div>
    </div>
  );
}

// ─── Ghost collab card (shown when user has no past collabs) ─────────────────
function GhostCollabCard() {
  return (
    <div className="listing-card" style={{ width: '220px', flexShrink: 0, filter: 'blur(2px)', opacity: 0.45, pointerEvents: 'none' }}>
      <div style={{ height: '140px', background: 'linear-gradient(135deg, #E2E6E4 0%, #C8CEC9 100%)' }} />
      <div style={{ padding: '0.875rem' }}>
        <div style={{ height: '11px', background: '#D0D5CE', borderRadius: '6px', marginBottom: '0.5rem', width: '72%' }} />
        <div style={{ height: '9px', background: '#DDE1DF', borderRadius: '6px', marginBottom: '0.625rem', width: '48%' }} />
        <div style={{ height: '18px', background: '#D0D5CE', borderRadius: '9999px', width: '58px' }} />
      </div>
    </div>
  );
}

// ─── Main Profile page ────────────────────────────────────────────────────────
export default function Profile() {
  const { profile, loading, signOut, updateProfile } = useAuth();
  const { contracts } = useCollabs();
  const navigate = useNavigate();
  const location = useLocation();
  const verifySubscriptionSession = useAction(api.stripe.verifySubscriptionSession);
  const verifyLifetimeSession      = useAction(api.stripe.verifyLifetimeSession);
  const createBillingPortalSession = useAction(api.stripe.createBillingPortalSession);
  const generateUploadUrl          = useMutation(api.uploads.generateUploadUrl);
  const { openModal: openSubModal } = useSubscription();
  const userId = profile?._id || profile?.id || 'mock-user-001';
  const serverPitchCount = useQuery(api.pitches.getCount, { userId });
  const referralStats = useQuery(api.referrals.getMyCode, userId && userId !== 'mock-user-001' ? { profileId: userId } : 'skip');
  const realCollabs = useQuery(api.collaborations.getByCreator, userId && userId !== 'mock-user-001' ? { creatorId: userId } : 'skip');
  const hasCollabs = !!(realCollabs && realCollabs.length > 0);
  const allProfiles = useQuery(api.profiles.getAll);
  const globeStats  = useMemo(() => countGlobeStats(allProfiles), [allProfiles]);

  // Edit profile state
  const [profileOverride, setProfileOverride] = useState({});
  const [editDraft, setEditDraft]             = useState(null); // null = closed
  const [selectedListingIdx, setSelectedListingIdx] = useState(0);

  // Modal visibility
  const [showSettings,      setShowSettings]      = useState(false);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [showContracts,     setShowContracts]     = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAllCollabs,    setShowAllCollabs]    = useState(false);
  const [showPrivacy,       setShowPrivacy]       = useState(false);
  const [showVerification,  setShowVerification]  = useState(false);
  const [showLocation,      setShowLocation]      = useState(false);
  const [showListingPicker, setShowListingPicker] = useState(false);
  const [toastMsg, setToastMsg]               = useState(null);
  const [exitConfirmDraft, setExitConfirmDraft] = useState(null);
  const [portalLoading, setPortalLoading]       = useState(false);
  const [cropEditorFile, setCropEditorFile]     = useState(null);
  const [lifetimeModalOpen, setLifetimeModalOpen] = useState(false);

  // Notification toggles
  const [notifSettings, setNotifSettings] = useState({
    messages:       true,
    contractUpdates: true,
    newListings:     false,
    collabReminders: true,
    marketing:       false,
  });

  // Browser notification permission banner
  const NOTIF_KEY = '@collabnb_notif_permission_v1';
  const [showNotifBanner, setShowNotifBanner] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(NOTIF_KEY);
    if (stored) return false;
    return 'Notification' in window && Notification.permission === 'default';
  });

  function handleNotifAllow() {
    Notification.requestPermission().then((result) => {
      localStorage.setItem(NOTIF_KEY, result);
      setShowNotifBanner(false);
    });
  }

  function handleNotifDismiss() {
    localStorage.setItem(NOTIF_KEY, 'dismissed');
    setShowNotifBanner(false);
  }

  // Bio expand
  const [bioExpanded, setBioExpanded] = useState(false);

  // ── Stripe subscription redirect handler ────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const subStatus = params.get('subscription');
    const sessionId = params.get('session_id');
    const subscribePlan = params.get('subscribe'); // ?subscribe=monthly|yearly from pricing page
    if (subStatus === 'success' && sessionId) {
      navigate('/profile', { replace: true });
      verifySubscriptionSession({ sessionId })
        .then(({ tier, expiresAt }) => {
          setProfileOverride((prev) => ({
            ...prev,
            subscription_status: 'active',
            subscription_tier: tier,
            subscription_expires_at: expiresAt ?? undefined,
          }));
          setToastMsg('Subscription activated! Welcome to Collabnb Pro.');
        })
        .catch(() => setToastMsg('Could not verify payment — contact support@collabnb.com'));
    } else if (subStatus === 'cancelled') {
      navigate('/profile', { replace: true });
    } else if (subscribePlan === 'monthly' || subscribePlan === 'yearly') {
      navigate('/profile', { replace: true });
      openSubModal();
    }
    // Lifetime purchase redirect
    const lifetimeStatus    = params.get('lifetime');
    const lifetimeSessionId = params.get('session_id');
    if (lifetimeStatus === 'claim') {
      navigate('/profile', { replace: true });
      setLifetimeModalOpen(true);
    } else if (lifetimeStatus === 'success' && lifetimeSessionId) {
      navigate('/profile', { replace: true });
      verifyLifetimeSession({ sessionId: lifetimeSessionId })
        .then(() => {
          setProfileOverride((prev) => ({ ...prev, is_lifetime: true }));
          setToastMsg('Lifetime access activated! Welcome to Collabnb — forever.');
        })
        .catch(() => setToastMsg('Could not verify payment — contact support@collabnb.com'));
    } else if (lifetimeStatus === 'cancelled') {
      navigate('/profile', { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-open edit sheet when ?edit=true (e.g. from onboarding checklist) ──
  const autoEditDone = useRef(false);
  useEffect(() => {
    if (autoEditDone.current || loading || !profile) return;
    const params = new URLSearchParams(location.search);
    if (params.get('edit') === 'true') {
      autoEditDone.current = true;
      setEditDraft({ ...profile });
      navigate('/profile', { replace: true });
    } else if (params.get('settings') === 'true') {
      autoEditDone.current = true;
      setShowSettings(true);
      navigate('/profile', { replace: true });
    }
  }, [loading, profile, location.search, navigate]);

  // ── Scroll reveal observer ──────────────────────────────────────────────
  const sectionsRef = useRef([]);
  useEffect(() => {
    const el = sectionsRef.current;
    // Object.values catches non-integer keys (0.5, 3.5) that Array.forEach skips
    const all = Object.values(el).filter(Boolean);
    if (!('IntersectionObserver' in window)) {
      all.forEach((s) => s.classList.add('visible'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -20px 0px' }
    );
    all.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // ── Toast auto-dismiss ────────────────────────────────────────────────
  useEffect(() => {
    if (toastMsg) {
      const t = setTimeout(() => setToastMsg(null), 2200);
      return () => clearTimeout(t);
    }
  }, [toastMsg]);

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bone)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '2.5px solid var(--stone)',
            borderTopColor: 'var(--slate)',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem',
          }} />
          <p style={{ fontSize: '0.85rem', color: 'var(--sage)' }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const dp = { ...profile, ...profileOverride }; // display profile

  const BIO_LIMIT  = 155;
  const bioTruncated = !bioExpanded && (dp.bio?.length ?? 0) > BIO_LIMIT;
  const portfolioHref = dp.portfolio
    ? (dp.portfolio.startsWith('http') ? dp.portfolio : `https://${dp.portfolio}`)
    : null;

  const coinBackSrc = SAMPLE_LISTINGS[selectedListingIdx]?.image ?? '';

  function hasUnsavedChanges() {
    const fields = ['full_name','bio','city','region','country','avatar_url','banner_url','instagram_handle','tiktok_handle','youtube_handle','portfolio'];
    return fields.some(f => editDraft[f] !== (dp[f] ?? ''));
  }

  function openEditProfile() {
    setEditDraft({
      full_name:        dp.full_name        ?? '',
      bio:              dp.bio              ?? '',
      city:             dp.city             ?? '',
      region:           dp.region           ?? '',
      country:          dp.country          ?? '',
      avatar_url:       dp.avatar_url       ?? '',
      banner_url:       dp.banner_url       ?? '',
      instagram_handle: dp.instagram_handle ?? '',
      tiktok_handle:    dp.tiktok_handle    ?? '',
      youtube_handle:   dp.youtube_handle   ?? '',
      portfolio:        dp.portfolio        ?? '',
    });
  }

  function saveEditProfile() {
    updateProfile(editDraft);
    setProfileOverride({ ...profileOverride, ...editDraft });
    setEditDraft(null);
    setToastMsg('All changes saved');
    // Invalidate creator search cache so updated profile surfaces in host search
    cache.clearAll();
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: `${dp.full_name} on Collabnb`, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
    }
  }

  async function handleManageSubscription() {
    const customerId = dp.stripe_customer_id;
    if (!customerId) { setToastMsg('No billing account found — contact support@collabnb.com'); return; }
    setPortalLoading(true);
    try {
      const { url } = await createBillingPortalSession({
        customerId,
        returnUrl: `${window.location.href.split('#')[0]}#/profile`,
      });
      window.location.href = url;
    } catch {
      setToastMsg('Could not open billing portal — try again shortly');
      setPortalLoading(false);
    }
  }

  const editMode = editDraft !== null;

  const hasActiveSub = dp.stripe_customer_id && dp.subscription_status === 'active';
  const SETTINGS = [
    { icon: <PencilIcon />,      label: 'Edit Profile',    sublabel: 'Update your photos, bio, and socials',           onClick: () => { setShowSettings(false); openEditProfile(); } },
    { icon: <FileTextIcon />,    label: 'Contracts',       sublabel: 'View and manage your saved contracts',           onClick: () => { setShowSettings(false); setShowContracts(true); } },
    ...(hasActiveSub ? [{ icon: <CreditCardIcon />, label: 'Manage Plan', sublabel: 'Cancel, upgrade, or update billing', onClick: () => { setShowSettings(false); handleManageSubscription(); } }] : []),
    { icon: <ChecklistIcon />,   label: 'Setup Checklist', sublabel: 'Finish setting up your account',                 onClick: () => { setShowSettings(false); reopenChecklist(); } },
    { icon: <GlobeIcon />,       label: 'Location Settings', sublabel: 'Set your city & country for the globe map',    onClick: () => { setShowSettings(false); setShowLocation(true); } },
    { icon: <BellIcon />,        label: 'Notifications',   sublabel: 'Manage email & push preferences',               onClick: () => { setShowSettings(false); setShowNotifications(true); } },
    { icon: <LockIcon />,        label: 'Privacy Policy',  sublabel: 'Review how your data is used',                  onClick: () => { setShowSettings(false); setShowPrivacy(true); } },
    { icon: <SealCheck />,       label: 'Verification',    sublabel: 'Submit a re-verification request',              onClick: () => { setShowSettings(false); setShowVerification(true); } },
    { icon: <SwitchIcon />,      label: profile?.role === 'host' ? 'Sign up as Creator' : 'Sign up as Host', sublabel: profile?.role === 'host' ? 'Browse and apply to listings as a creator' : 'Create listings and collaborate with creators', onClick: () => { setShowSettings(false); setShowSwitchConfirm(true); } },
  ];

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: '6rem' }}>

      {/* ── Browser notification permission banner ────────────────────── */}
      {showNotifBanner && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '0.75rem', flexWrap: 'wrap',
          padding: '0.625rem 1rem',
          background: 'rgba(209,235,219,0.92)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(74,155,127,0.2)',
        }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--slate)', fontWeight: 500, textAlign: 'center', flex: '1 1 200px', minWidth: 0 }}>
            Enable notifications to stay updated on your collabs
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <button
              onClick={handleNotifAllow}
              style={{
                padding: '0.45rem 1rem', borderRadius: '999px', border: 'none', cursor: 'pointer',
                background: 'var(--slate)', color: '#fff', fontSize: '0.78rem', fontWeight: 600,
                fontFamily: 'var(--font-body)', minHeight: '44px',
              }}
            >
              Allow
            </button>
            <button
              onClick={handleNotifDismiss}
              style={{
                padding: '0.45rem 1rem', borderRadius: '999px', border: '1px solid rgba(60,87,89,0.25)',
                cursor: 'pointer', background: 'transparent', color: 'var(--slate)',
                fontSize: '0.78rem', fontWeight: 500, fontFamily: 'var(--font-body)', minHeight: '44px',
              }}
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {/* ── Hero (full-bleed, starts below floating nav) ──────────────────── */}
      <div style={{ position: 'relative', paddingTop: 'calc(5rem + var(--banner-h, 0rem))' }}>
        <div style={{ height: '400px', overflow: 'hidden', background: 'linear-gradient(135deg, #1a2322 0%, #2d4a3e 100%)' }}>
          {dp.banner_url && (
            <img
              src={dp.banner_url}
              alt={dp.full_name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '180px', background: 'linear-gradient(to top, #EFECE9 0%, rgba(239,236,233,0.55) 45%, transparent 100%)' }} />
        </div>

        {/* Coin flip — bottom-left */}
        <div style={{ position: 'absolute', bottom: '-20px', left: '1.5rem' }}>
          <CoinFlip
            frontSrc={dp.avatar_url || null}
            backSrc={coinBackSrc}
            editMode={editMode}
            onEdit={() => setShowListingPicker(true)}
            initials={(dp.full_name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          />
          {editMode && (
            <p style={{ fontSize: '0.58rem', color: 'var(--sage)', textAlign: 'center', marginTop: '0.375rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Tap to change
            </p>
          )}
        </div>
      </div>

      {/* ── Profile content ────────────────────────────────────────────────── */}
      <div className="container" style={{ maxWidth: '720px' }}>

        {/* ── Profile header ─────────────────────────────────────────────── */}
        <section style={{ textAlign: 'center', paddingTop: '2.75rem', paddingBottom: '1.5rem' }}>

          {/* Name */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
              {dp.full_name}
            </h2>
          </div>

          {/* Founding Member badge */}
          {dp.is_founder && (
            <div style={{ marginBottom: '0.625rem' }}>
              <FoundingMemberBadge />
            </div>
          )}

          {/* Handle + location */}
          <p style={{ color: 'var(--sage)', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
            @{dp.username}
            {(dp.city || dp.country) && (
              <span style={{ color: 'var(--slate)', marginLeft: '0.5rem' }}>
                · {[dp.city, dp.region, dp.country].filter(Boolean).join(' ')}
              </span>
            )}
          </p>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {profile?.role === 'host' && (
              <button
                className="btn-glass"
                style={{ fontSize: '0.8rem', padding: '0.6rem 1.1rem' }}
                onClick={() => navigate('/host')}
              >
                My Listings
              </button>
            )}
            <button
              className="btn-glass"
              style={{ fontSize: '0.8rem', padding: '0.6rem 1.1rem' }}
              onClick={handleShare}
            >
              Share Profile
            </button>
          </div>
        </section>

        {/* ── Stats card ─────────────────────────────────────────────────── */}
        <div className="glass section-reveal" ref={(el) => sectionsRef.current[0] = el} style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {[
              { value: dp.collab_count ?? 0,                                    label: 'Collabs'    },
              { value: fmtFollowers(dp.follower_count),                          label: 'Followers'  },
              { value: dp.engagement_rate ? `${dp.engagement_rate}%` : '—',     label: 'Engagement' },
            ].map((stat, i) => (
              <div key={stat.label} style={{ textAlign: 'center', padding: '0.5rem 0.75rem', borderRight: i < 2 ? '1px solid rgba(25,37,36,0.06)' : 'none' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--ink)', margin: '0 0 0.2rem' }}>{stat.value}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: 0 }}>{stat.label}</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--sage)', marginTop: '0.625rem' }}>↻ Updated just now</p>
        </div>

        {/* ── Payout card (creator only) ─────────────────────────────────── */}
        {dp.role === 'creator' && (() => {
          const unlocked = profile?.first_collab_completed === true;
          const totalPayout = SAMPLE_COLLABORATIONS
            .filter((c) => c.payment)
            .reduce((sum, c) => {
              const amt = parseFloat(c.payment.replace(/[^0-9.]/g, ''));
              return sum + (isNaN(amt) ? 0 : amt);
            }, 0);
          return (
            <div className="glass section-reveal" ref={(el) => sectionsRef.current[0.5] = el} style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              {/* Card content — blurred until first collab completed */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', filter: unlocked ? 'none' : 'blur(6px)', userSelect: unlocked ? 'auto' : 'none', pointerEvents: unlocked ? 'auto' : 'none' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '0.875rem',
                  background: 'linear-gradient(135deg, rgba(74,155,127,0.2), rgba(209,235,221,0.3))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  fontSize: '1.25rem',
                }}>
                  💰
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sage)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Payout Received</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--ink)', margin: '0.1rem 0 0' }}>${totalPayout.toLocaleString()}</p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--stone)', margin: '0.1rem 0 0' }}>Across {SAMPLE_COLLABORATIONS.filter((c) => c.payment).length} completed collaborations</p>
                </div>
              </div>
              {/* Lock overlay */}
              {!unlocked && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem' }}>🔒</span>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--slate)', margin: 0 }}>Unlocks after your first completed collab</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Bio ──────────────────────────────────────────────────────────── */}
        {dp.bio && (
          <div className="section-reveal" ref={(el) => sectionsRef.current[1] = el} style={{ marginBottom: '1.25rem' }}>
            <p style={{ color: 'var(--slate)', fontSize: '0.9375rem', lineHeight: 1.7, margin: 0 }}>
              {bioTruncated ? `${dp.bio.slice(0, BIO_LIMIT)}…` : dp.bio}
            </p>
            {(dp.bio?.length ?? 0) > BIO_LIMIT && (
              <button onClick={() => setBioExpanded(!bioExpanded)} style={{ color: 'var(--ink)', fontSize: '0.875rem', fontWeight: 600, marginTop: '0.375rem', fontFamily: 'var(--font-body)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {bioExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {/* ── Links & Socials ───────────────────────────────────────────────── */}
        <section className="section-reveal" ref={(el) => sectionsRef.current[2] = el} style={{ marginBottom: '1.75rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.125rem', color: 'var(--ink)', marginBottom: '1rem' }}>Links &amp; Socials</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {portfolioHref && <SocialRow icon={<GlobeIcon />} label="My Link-in-Bio" value={dp.portfolio} href={portfolioHref} />}
            {dp.instagram_handle && <SocialRow icon={<InstagramIcon />} label="Instagram" value={`@${dp.instagram_handle.replace(/^@/, '')}`} href={`https://instagram.com/${dp.instagram_handle.replace(/^@/, '')}`} />}
            {dp.tiktok_handle    && <SocialRow icon={<TikTokIcon />}    label="TikTok"    value={`@${dp.tiktok_handle.replace(/^@/, '')}`}    href={`https://tiktok.com/@${dp.tiktok_handle.replace(/^@/, '')}`} />}
            {dp.youtube_handle   && <SocialRow icon={<YouTubeIcon />}   label="YouTube"   value={`@${dp.youtube_handle.replace(/^@/, '')}`}   href={`https://youtube.com/@${dp.youtube_handle.replace(/^@/, '')}`} />}
          </div>
        </section>

        {/* ── Past Collabs ─────────────────────────────────────────────────── */}
        <section className="section-reveal" ref={(el) => sectionsRef.current[3] = el} style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.125rem', color: 'var(--ink)', margin: 0 }}>Past Collabs</h3>
            {hasCollabs && (
              <button onClick={() => setShowAllCollabs(true)} style={{ color: 'var(--slate)', fontSize: '0.875rem', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>View all →</button>
            )}
          </div>
          {hasCollabs ? (
            <div style={{ overflow: 'hidden', paddingBottom: '0.5rem' }}>
              <div className="scroll-track">
                {SAMPLE_COLLABORATIONS.map((c) => <PastCollabCard key={c.id} collab={c} />)}
                {SAMPLE_COLLABORATIONS.map((c) => <PastCollabCard key={`dup-${c.id}`} collab={c} />)}
              </div>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: '0.875rem', overflow: 'hidden' }}>
                {[0, 1, 2].map((i) => <GhostCollabCard key={i} />)}
              </div>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(to bottom, transparent 0%, rgba(246,244,241,0.6) 100%)',
              }}>
                <p style={{ fontSize: '0.8125rem', color: 'var(--slate)', fontWeight: 500, textAlign: 'center', padding: '0 1rem', textShadow: '0 1px 4px rgba(246,244,241,0.9)' }}>
                  Your completed collabs will appear here
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ── Travel Calendar ──────────────────────────────────────────────── */}
        <section className="glass section-reveal" ref={(el) => sectionsRef.current[3.5] = el} style={{ padding: '1.5rem', marginBottom: '1.75rem' }}>
          <TravelCalendar viewerRole="self" />
        </section>

        {/* ── Globe ────────────────────────────────────────────────────────── */}
        <section className="section-reveal" ref={(el) => sectionsRef.current[4] = el} style={{ textAlign: 'center', paddingBottom: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--ink)', marginBottom: '0.375rem' }}>Our Global Community</h3>
          <p style={{ color: 'var(--sage)', fontSize: '0.9rem', marginBottom: '0.875rem' }}>Creators and hosts connecting across the world</p>
          <GlobeCanvas profiles={allProfiles} />
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <span className="eyebrow-tag" style={{ gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', flexShrink: 0 }} />
              <strong>{globeStats.creators || '—'}</strong>&nbsp;Creators
            </span>
            <span className="eyebrow-tag" style={{ gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', flexShrink: 0 }} />
              <strong>{globeStats.hosts || '—'}</strong>&nbsp;Hosts
            </span>
            <span className="eyebrow-tag" style={{ gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D0D5CE', display: 'inline-block', flexShrink: 0 }} />
              <strong>{globeStats.countries > 0 ? `${globeStats.countries}+` : '40+'}</strong>&nbsp;Countries
            </span>
          </div>
        </section>
      </div>

      {/* ── Floating gear button ──────────────────────────────────────────── */}
      <button
        onClick={() => setShowSettings(true)}
        title="Settings"
        style={{
          position: 'fixed', bottom: '1.25rem', right: '1.25rem', zIndex: 40,
          width: '44px', height: '44px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.7)',
          boxShadow: '0 4px 16px rgba(25,37,36,0.14)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--slate)',
          transition: 'background 150ms, transform 200ms cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'rotate(60deg) scale(1.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.88)'; e.currentTarget.style.transform = 'rotate(0deg) scale(1)'; }}
      >
        <GearIcon />
      </button>

      {/* ── Edit Profile sheet ────────────────────────────────────────────── */}
      {editMode && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(25,37,36,0.4)', backdropFilter: 'blur(6px)' }}
          onClick={() => { if (hasUnsavedChanges()) setExitConfirmDraft(editDraft); else setEditDraft(null); }}
        >
          <div
            className="glass"
            style={{ width: '100%', maxWidth: '600px', borderRadius: '1.5rem 1.5rem 0 0', padding: '1.75rem 1.75rem 2.5rem', maxHeight: '88dvh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--ink)', margin: 0 }}>Edit Profile</h4>
              <button onClick={() => { if (hasUnsavedChanges()) setExitConfirmDraft(editDraft); else setEditDraft(null); }} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(25,37,36,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)', fontSize: '1rem' }}>✕</button>
            </div>

            {/* Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              <EditField label="Name" value={editDraft.full_name} onChange={(v) => setEditDraft({ ...editDraft, full_name: v })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', padding: '0.75rem', borderRadius: '0.875rem', background: 'rgba(255,255,255,0.7)', border: '1.5px dashed rgba(60,87,89,0.25)', cursor: 'pointer', transition: 'border-color 150ms, background 150ms' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(60,87,89,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(60,87,89,0.25)'; e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; }}
                >
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Profile Photo</span>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', background: 'var(--stone)', flexShrink: 0, border: '2px solid white', boxShadow: '0 2px 8px rgba(25,37,36,0.12)' }}>
                    {editDraft.avatar_url ? (
                      <img src={editDraft.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sage)', fontSize: '0.7rem' }}>+</div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.58rem', color: 'var(--sage)', opacity: 0.7 }}>300 × 300 px</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const url = await uploadResizedImage(f, 300, 300, generateUploadUrl);
                      setEditDraft(d => ({ ...d, avatar_url: url }));
                    }
                  }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', padding: '0.75rem', borderRadius: '0.875rem', background: 'rgba(255,255,255,0.7)', border: '1.5px dashed rgba(60,87,89,0.25)', cursor: 'pointer', transition: 'border-color 150ms, background 150ms' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(60,87,89,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(60,87,89,0.25)'; e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; }}
                >
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{dp.role === 'host' ? 'Property Photo' : 'Banner Image'}</span>
                  <div style={{ width: '100%', height: 52, borderRadius: '0.5rem', overflow: 'hidden', background: 'var(--stone)', flexShrink: 0, border: '2px solid white', boxShadow: '0 2px 8px rgba(25,37,36,0.12)' }}>
                    {editDraft.banner_url ? (
                      <img src={editDraft.banner_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sage)', fontSize: '0.7rem' }}>+</div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.58rem', color: 'var(--sage)', opacity: 0.7 }}>{dp.role === 'host' ? '3:1 ratio · e.g. 1200 × 400 px' : '3:1 ratio · e.g. 1200 × 400 px'}</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropEditorFile(f); }} />
                </label>
              </div>
              <EditField label="Bio" value={editDraft.bio} onChange={(v) => setEditDraft({ ...editDraft, bio: v })} multiline />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <EditField label="City" value={editDraft.city} onChange={(v) => setEditDraft({ ...editDraft, city: v })} />
                <EditField label="State / Region" value={editDraft.region} onChange={(v) => setEditDraft({ ...editDraft, region: v })} />
                <EditField label="Country" value={editDraft.country || ''} onChange={(v) => setEditDraft({ ...editDraft, country: v })} />
              </div>
              <div style={{ borderTop: '1px solid rgba(25,37,36,0.06)', paddingTop: '1rem' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.875rem' }}>Social Handles</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <EditField label="Instagram" value={editDraft.instagram_handle} onChange={(v) => setEditDraft({ ...editDraft, instagram_handle: v })} prefix="@" />
                  <EditField label="TikTok"    value={editDraft.tiktok_handle}    onChange={(v) => setEditDraft({ ...editDraft, tiktok_handle: v })}    prefix="@" />
                  <EditField label="YouTube"   value={editDraft.youtube_handle}   onChange={(v) => setEditDraft({ ...editDraft, youtube_handle: v })}   prefix="@" />
                  <EditField label="Portfolio URL" value={editDraft.portfolio}    onChange={(v) => setEditDraft({ ...editDraft, portfolio: v })} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn-glass" style={{ flex: 1 }} onClick={() => { if (hasUnsavedChanges()) setExitConfirmDraft(editDraft); else setEditDraft(null); }}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={saveEditProfile}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Banner crop editor ──────────────────────────────────────────── */}
      {cropEditorFile && (
        <BannerCropEditor
          file={cropEditorFile}
          onApply={async (dataUrl) => {
            if (generateUploadUrl && CONVEX_URL) {
              // Convert the cropped data URL to a blob and upload to Convex storage
              const res = await fetch(dataUrl);
              const blob = await res.blob();
              const uploadUrl = await generateUploadUrl();
              const upRes = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
              const { storageId } = await upRes.json();
              setEditDraft(d => ({ ...d, banner_url: `${CONVEX_URL}/api/storage/${storageId}` }));
            } else {
              setEditDraft(d => ({ ...d, banner_url: dataUrl }));
            }
            setCropEditorFile(null);
          }}
          onCancel={() => setCropEditorFile(null)}
        />
      )}

      {/* ── Listing picker ────────────────────────────────────────────────── */}
      {showListingPicker && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(25,37,36,0.45)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowListingPicker(false)}
        >
          <div
            className="glass"
            style={{ width: '100%', maxWidth: '520px', borderRadius: '1.5rem 1.5rem 0 0', padding: '1.5rem 1.5rem 2.5rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '1rem' }}>
              Choose a listing to show on your profile coin
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {SAMPLE_LISTINGS.map((l, idx) => (
                <button
                  key={l.id}
                  onClick={() => { setSelectedListingIdx(idx); setShowListingPicker(false); }}
                  style={{
                    borderRadius: '0.875rem', overflow: 'hidden', padding: 0,
                    cursor: 'pointer', background: 'none', aspectRatio: '1',
                    border: `2.5px solid ${selectedListingIdx === idx ? 'var(--slate)' : 'transparent'}`,
                    position: 'relative', transition: 'border-color 150ms',
                  }}
                >
                  <img src={l.image} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  {selectedListingIdx === idx && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(60,87,89,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                        <polyline points="2 7 5.5 10.5 12 3.5" />
                      </svg>
                    </div>
                  )}
                  <p style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.3rem 0.4rem', background: 'linear-gradient(to top, rgba(25,37,36,0.7), transparent)', color: 'white', fontSize: '0.58rem', fontWeight: 600, margin: 0, lineHeight: 1.2 }}>
                    {l.title}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Settings gear sheet ───────────────────────────────────────────── */}
      {showSettings && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem', background: 'rgba(25,37,36,0.5)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowSettings(false)}
        >
          <div
            style={{ width: '100%', maxWidth: '480px', borderRadius: '1.5rem', overflow: 'hidden', padding: 0, background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(255,255,255,0.85)', boxShadow: '0 20px 60px rgba(25,37,36,0.18), inset 0 1px 0 rgba(255,255,255,0.9)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(60,87,89,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--slate)', margin: 0, letterSpacing: '-0.01em' }}>Settings</p>
              <button onClick={() => setShowSettings(false)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(209,235,219,0.5)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)' }}>✕</button>
            </div>
            {dp.role === 'creator' && (() => {
              const count = serverPitchCount ?? getPitchCount().count;
              return (
                <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid rgba(60,87,89,0.08)', background: 'rgba(209,235,219,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate)', margin: 0 }}>Pitches used this month</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: count >= 10 ? '#ef4444' : 'var(--ink)', margin: 0 }}>{count} / 10</p>
                  </div>
                  <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(25,37,36,0.08)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '999px', width: `${Math.min((count / 10) * 100, 100)}%`, background: count >= 10 ? '#ef4444' : count >= 7 ? '#D4A843' : '#4A9B7F', transition: 'width 400ms ease' }} />
                  </div>
                  <p style={{ fontSize: '0.68rem', color: 'var(--sage)', margin: '0.35rem 0 0' }}>Resets on the 1st of each month. Standard applications are unlimited.</p>
                </div>
              );
            })()}
            {/* Referral collab bonus pending notice */}
            {dp.referral_bonus_pending && !dp.first_collab_completed && (
              <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(60,87,89,0.08)', background: 'rgba(139,92,246,0.06)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg viewBox="0 0 16 16" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" width="13" height="13">
                    <path d="M8 2a2 2 0 100 4 2 2 0 000-4zM4 9c0-1.1.9-2 2-2h4a2 2 0 012 2v3H4V9z"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#5B21B6', margin: 0 }}>Referral bonus ready</p>
                  <p style={{ fontSize: '0.7rem', color: '#7C3AED', margin: '0.1rem 0 0' }}>Complete your first collab to unlock 1 free month</p>
                </div>
              </div>
            )}

            {/* Membership status — 4-state subscription section */}
            {(() => {
              const isFounder = dp.is_founder === true;
              const expiresAt = dp.subscription_expires_at;
              const isActive = dp.subscription_status === 'active' && (!expiresAt || Date.now() < expiresAt);
              const isExpired = dp.subscription_status === 'active' && expiresAt && Date.now() >= expiresAt;
              const tier = dp.subscription_tier;
              const isYearly = tier === 'yearly';
              const firstDone = dp.first_collab_completed === true;

              if (isFounder) {
                return (
                  <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid rgba(60,87,89,0.08)', background: 'linear-gradient(135deg, rgba(212,168,67,0.08) 0%, rgba(212,168,67,0.04) 100%)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'rgba(212,168,67,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg viewBox="0 0 16 16" width="15" height="15" fill="#D4A843"><path d="M8 1.5l1.67 3.38 3.73.54-2.7 2.63.64 3.72L8 9.77l-3.34 1.76.64-3.72L2.6 5.42l3.73-.54z"/></svg>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#A87820', margin: 0 }}>Founding Member</p>
                        <p style={{ fontSize: '0.72rem', color: '#C4921A', margin: '0.1rem 0 0' }}>Free Forever — all features unlocked</p>
                      </div>
                    </div>
                  </div>
                );
              }

              if (isActive) {
                const nextDate = expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
                return (
                  <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid rgba(60,87,89,0.08)', background: 'rgba(74,155,127,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4A9B7F', flexShrink: 0, display: 'inline-block' }} />
                        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2D7A5F', margin: 0 }}>
                          Collabnb Pro &middot; {isYearly ? 'Annual' : 'Monthly'}
                        </p>
                      </div>
                      <button
                        onClick={handleManageSubscription}
                        disabled={portalLoading}
                        style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--slate)', background: 'none', border: 'none', cursor: portalLoading ? 'wait' : 'pointer', padding: 0, textDecoration: 'underline', opacity: portalLoading ? 0.6 : 1 }}
                      >
                        {portalLoading ? 'Opening…' : 'Manage →'}
                      </button>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: 0 }}>
                      {isYearly ? '$60/year' : '$10/month'}{nextDate ? ` · Renews ${nextDate}` : ''}
                    </p>
                    {!isYearly && (
                      <button
                        onClick={openSubModal}
                        style={{ marginTop: '0.5rem', fontSize: '0.7rem', fontWeight: 600, color: '#A87820', background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.25)', borderRadius: '999px', padding: '0.2rem 0.7rem', cursor: 'pointer' }}
                      >
                        Upgrade to Yearly — save 50%
                      </button>
                    )}
                  </div>
                );
              }

              if (isExpired) {
                return (
                  <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid rgba(60,87,89,0.08)', background: 'rgba(239,68,68,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#dc2626', margin: 0 }}>Plan expired</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0.1rem 0 0' }}>Renew to keep messaging and applying</p>
                      </div>
                      <button
                        onClick={openSubModal}
                        style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white', background: '#dc2626', border: 'none', borderRadius: '999px', padding: '0.35rem 0.9rem', cursor: 'pointer' }}
                      >
                        Renew
                      </button>
                    </div>
                  </div>
                );
              }

              if (!firstDone) {
                return (
                  <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid rgba(60,87,89,0.08)', background: 'rgba(209,235,219,0.15)' }}>
                    <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate)', margin: '0 0 0.1rem' }}>Free — first collab included</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: 0 }}>Complete your first collaboration, then choose a plan to continue.</p>
                  </div>
                );
              }

              return (
                <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid rgba(60,87,89,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate)', margin: 0 }}>No active plan</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0.1rem 0 0' }}>Subscribe to keep collaborating</p>
                    </div>
                    <button
                      onClick={openSubModal}
                      style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white', background: 'var(--slate)', border: 'none', borderRadius: '999px', padding: '0.35rem 0.9rem', cursor: 'pointer' }}
                    >
                      Subscribe
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Referral code — creators only */}
            {dp.role !== 'host' && (() => {
              const code = dp.referral_code || referralStats?.code;
              const freeMonths = dp.free_months_balance || 0;
              const signups = referralStats?.signups_rewarded || 0;
              const collabBonuses = referralStats?.collab_bonuses_earned || 0;
              if (!code) return null;
              return (
                <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid rgba(60,87,89,0.08)', background: 'rgba(209,235,219,0.08)' }}>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate)', margin: '0 0 0.625rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Referral Code</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.08em', background: 'rgba(25,37,36,0.05)', padding: '0.3rem 0.75rem', borderRadius: '0.5rem' }}>{code}</span>
                    <button
                      onClick={() => { navigator.clipboard?.writeText(code); }}
                      title="Copy code"
                      style={{ background: 'none', border: '1.5px solid rgba(25,37,36,0.15)', borderRadius: '0.5rem', cursor: 'pointer', padding: '0.3rem 0.6rem', fontSize: '0.72rem', color: 'var(--slate)', fontWeight: 600, fontFamily: 'var(--font-body)' }}
                    >
                      Copy
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--sage)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{signups}</span> / {referralStats?.max_uses || 12} signups used
                    </div>
                    {collabBonuses > 0 && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--sage)' }}>
                        <span style={{ fontWeight: 700, color: '#4A9B7F' }}>{collabBonuses}</span> collab bonus{collabBonuses !== 1 ? 'es' : ''} earned
                      </div>
                    )}
                    {freeMonths > 0 && (
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#4A9B7F' }}>
                        +{freeMonths} free month{freeMonths !== 1 ? 's' : ''} balance
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '0.68rem', color: 'var(--sage)', margin: '0.35rem 0 0', lineHeight: 1.5 }}>Share your code. Both you and new members get 1 free month on signup, +1 more when they complete their first collab.</p>
                </div>
              );
            })()}

            {SETTINGS.map((row, i) => (
              <SettingsRow key={row.label} {...row} isLast={i === SETTINGS.length - 1} />
            ))}

            {/* Host payment history */}
            {dp.role === 'host' && (() => {
              const paid = (contracts || []).filter(c => c.paid === true);
              if (paid.length === 0) return null;
              return (
                <div style={{ borderTop: '1px solid rgba(60,87,89,0.1)', padding: '0.875rem 1.5rem' }}>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate)', margin: '0 0 0.625rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Payment History</p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(60,87,89,0.1)' }}>
                        <th style={{ textAlign: 'left', padding: '0.25rem 0', fontWeight: 600, color: 'var(--sage)', paddingRight: '1rem' }}>Collab</th>
                        <th style={{ textAlign: 'right', padding: '0.25rem 0', fontWeight: 600, color: 'var(--sage)', paddingRight: '1rem' }}>Fee Paid</th>
                        <th style={{ textAlign: 'right', padding: '0.25rem 0', fontWeight: 600, color: 'var(--sage)' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paid.map((c, i) => (
                        <tr key={i} style={{ borderBottom: i < paid.length - 1 ? '1px solid rgba(60,87,89,0.06)' : 'none' }}>
                          <td style={{ padding: '0.4rem 0', color: 'var(--ink)', paddingRight: '1rem', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.property_name || c.creator_name || '—'}
                          </td>
                          <td style={{ padding: '0.4rem 0', color: 'var(--slate)', fontWeight: 600, textAlign: 'right', paddingRight: '1rem' }}>
                            {c.payment_amount ? `$${c.payment_amount.toFixed(2)}` : '—'}
                          </td>
                          <td style={{ padding: '0.4rem 0', color: 'var(--sage)', textAlign: 'right' }}>
                            {c.host_signed_at ? new Date(c.host_signed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            <div style={{ borderTop: '1px solid rgba(60,87,89,0.1)' }}>
              <button
                onClick={signOut}
                style={{
                  width: '100%', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
                  color: '#ef4444', fontSize: '0.875rem', fontWeight: 600,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', transition: 'background 150ms',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#ef4444' }}>
                  <SignOutIcon />
                </div>
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sign up as Host / Creator sheet ──────────────────────────────── */}
      {showSwitchConfirm && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem', background: 'rgba(25,37,36,0.4)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowSwitchConfirm(false)}
        >
          <div className="glass" style={{ width: '100%', maxWidth: '420px', borderRadius: '1.5rem', padding: '2rem' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.5rem' }}>
              {profile?.avatar_url && (
                <img src={profile.avatar_url} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.8)' }} />
              )}
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: 0, fontWeight: 500 }}>Signing up as</p>
                <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--ink)', margin: 0 }}>
                  {profile?.role === 'host' ? 'Creator' : 'Host'}
                </h4>
              </div>
            </div>

            {/* Account card */}
            <div style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(208,213,206,0.7)', borderRadius: '1rem', padding: '0.875rem 1rem', marginBottom: '0.875rem' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0 0 0.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your account</p>
              <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0, fontSize: '0.9375rem' }}>{profile?.full_name}</p>
              <p style={{ color: 'var(--slate)', fontSize: '0.8125rem', margin: '0.125rem 0 0' }}>{profile?.email}</p>
            </div>

            {/* Referral preservation note */}
            {referralStats?.code && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', background: 'rgba(209,235,219,0.35)', border: '1px solid rgba(74,155,127,0.25)', borderRadius: '0.875rem', padding: '0.75rem 0.875rem', marginBottom: '1rem' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#4A9B7F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M13 3L6 10l-3-3"/></svg>
                <p style={{ fontSize: '0.8rem', color: 'var(--slate)', margin: 0, lineHeight: 1.5 }}>
                  Your referral code <strong style={{ color: 'var(--ink)', fontFamily: 'monospace', letterSpacing: '0.04em' }}>{referralStats.code}</strong>
                  {referralStats.use_count > 0 ? ` and ${referralStats.use_count} referral${referralStats.use_count !== 1 ? 's' : ''}` : ''} will carry over.
                </p>
              </div>
            )}

            <p style={{ color: 'var(--slate)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {profile?.role === 'host'
                ? 'You\'ll join as a creator using the same account — browse and apply to listings right away.'
                : 'You\'ll join as a host using the same account — create listings and connect with creators.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <button className="btn-primary" onClick={async () => {
                const newRole = profile?.role === 'host' ? 'creator' : 'host';
                await updateProfile({ role: newRole });
                setShowSwitchConfirm(false);
                if (newRole === 'host') navigate('/host');
              }}>
                {profile?.role === 'host' ? 'Sign up as Creator' : 'Sign up as Host'}
              </button>
              <button
                onClick={() => { setShowSwitchConfirm(false); window.open('/join.html', '_blank'); }}
                style={{ background: 'none', border: 'none', color: 'var(--sage)', fontSize: '0.8125rem', cursor: 'pointer', padding: '0.375rem 0', textDecoration: 'underline', textUnderlineOffset: '2px', fontFamily: 'var(--font-body)' }}
              >
                Use a different account →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Contracts modal ───────────────────────────────────────────────── */}
      {showContracts && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem', background: 'rgba(25,37,36,0.4)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowContracts(false)}
        >
          <div
            className="glass"
            style={{ width: '100%', maxWidth: '500px', borderRadius: '1.5rem', padding: '2rem', maxHeight: '80dvh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--ink)', margin: 0 }}>Saved Contracts</h4>
              <button onClick={() => navigate('/contract')} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>+ New</button>
            </div>
            {(!contracts || contracts.length === 0) ? (
              <p style={{ color: 'var(--sage)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No contracts yet. Create your first one.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {contracts.map((c) => {
                  const ss = { draft: { bg: 'rgba(208,213,206,0.4)', text: 'var(--sage)' }, pending: { bg: 'rgba(212,168,67,0.15)', text: '#D4A843' }, accepted: { bg: 'rgba(74,155,127,0.15)', text: '#4A9B7F' } };
                  const s2 = ss[c.status] || ss.draft;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setShowContracts(false); navigate('/contract'); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '1rem', cursor: 'pointer', transition: 'background 150ms', textAlign: 'left', fontFamily: 'var(--font-body)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.92)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.65)'}
                    >
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(209,235,219,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, color: 'var(--slate)' }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink)', margin: 0 }}>{c.property_name || c.creator_name || 'Untitled Contract'}</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0.15rem 0 0' }}>{c.dates || c.location || 'No details'}</p>
                      </div>
                      <span style={{ padding: '0.2rem 0.7rem', borderRadius: '999px', background: s2.bg, color: s2.text, fontSize: '0.7rem', fontWeight: 600, flexShrink: 0 }}>
                        {c.status === 'draft' ? 'Draft' : c.status === 'pending' ? 'Pending' : 'Accepted'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── All Collabs modal ────────────────────────────────────────────── */}
      {showAllCollabs && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem', background: 'rgba(25,37,36,0.5)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowAllCollabs(false)}
        >
          <div
            style={{ width: '100%', maxWidth: '560px', borderRadius: '1.5rem', padding: '2rem', maxHeight: '80dvh', overflowY: 'auto', background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(255,255,255,0.85)', boxShadow: '0 20px 60px rgba(25,37,36,0.18)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--slate)', margin: 0 }}>All Collaborations</h4>
              <button onClick={() => setShowAllCollabs(false)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(209,235,219,0.5)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[...SAMPLE_COLLABORATIONS]
                .sort((a, b) => {
                  const parseDate = (str) => {
                    const m = str.match(/(\w+)\s*\d+.*?(\d{4})/);
                    if (!m) return 0;
                    const months = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
                    return parseInt(m[2]) * 12 + (months[m[1].toLowerCase().slice(0,3)] || 0);
                  };
                  return parseDate(b.dates) - parseDate(a.dates);
                })
                .map((c) => {
                  const statusColors = {
                    pending:  { bg: 'rgba(212,168,67,0.12)', text: '#D4A843' },
                    uploaded: { bg: 'rgba(74,155,210,0.12)', text: '#4A9BD2' },
                    approved: { bg: 'rgba(74,155,127,0.12)', text: '#4A9B7F' },
                  };
                  const sc = statusColors[c.status] || statusColors.pending;
                  return (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.625rem 0.875rem', borderRadius: '0.875rem',
                      background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.8)',
                    }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '0.625rem', overflow: 'hidden',
                        flexShrink: 0, background: 'var(--stone)',
                      }}>
                        <img src={c.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--slate)', margin: 0, lineHeight: 1.3 }}>{c.property_name}</p>
                        <p style={{ fontSize: '0.68rem', color: 'var(--sage)', margin: '0.1rem 0 0' }}>{c.location} · {c.dates}</p>
                      </div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.15rem 0.6rem', borderRadius: '999px', background: sc.bg, color: sc.text, flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {c.status_text}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ── Notifications modal ──────────────────────────────────────────── */}
      {showNotifications && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem', background: 'rgba(25,37,36,0.5)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowNotifications(false)}
        >
          <div
            style={{ width: '100%', maxWidth: '460px', borderRadius: '1.5rem', padding: 'clamp(1.25rem, 5vw, 2rem)', background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(255,255,255,0.85)', boxShadow: '0 20px 60px rgba(25,37,36,0.18)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--slate)', margin: 0 }}>Notification Preferences</h4>
              {/* 44px touch target wrapping the visual button */}
              <button onClick={() => setShowNotifications(false)} style={{ minWidth: '44px', minHeight: '44px', borderRadius: '50%', background: 'rgba(209,235,219,0.5)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              {[
                { key: 'messages',        label: 'Messages',         desc: 'New messages and replies in your inbox' },
                { key: 'contractUpdates', label: 'Contract Updates',  desc: 'When a contract is signed, updated, or needs action' },
                { key: 'newListings',     label: 'New Listings',      desc: 'Properties that match your preferences' },
                { key: 'collabReminders', label: 'Collab Reminders',  desc: 'Upcoming deadlines and pending deliverables' },
                { key: 'marketing',       label: 'Marketing',         desc: 'Product updates, tips, and Collabnb news' },
              ].map((item) => (
                <div key={item.key} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 0.5rem', borderRadius: '1rem',
                  background: 'transparent', transition: 'background 150ms',
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(209,235,219,0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate)', margin: 0 }}>{item.label}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0.1rem 0 0' }}>{item.desc}</p>
                  </div>
                  {/* 44px touch target wrapper around the visual toggle */}
                  <button
                    onClick={() => setNotifSettings((p) => ({ ...p, [item.key]: !p[item.key] }))}
                    style={{
                      minWidth: '44px', minHeight: '44px', flexShrink: 0,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    }}
                    aria-label={`Toggle ${item.label}`}
                  >
                    <span style={{
                      width: '38px', height: '22px', borderRadius: '999px', position: 'relative', display: 'block',
                      background: notifSettings[item.key] ? 'var(--slate)' : 'rgba(25,37,36,0.15)',
                      transition: 'background 200ms',
                    }}>
                      <span style={{
                        position: 'absolute', top: '2px', width: '18px', height: '18px',
                        borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                        transition: 'left 200ms cubic-bezier(0.34,1.56,0.64,1)',
                        left: notifSettings[item.key] ? '18px' : '2px',
                      }} />
                    </span>
                  </button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <button onClick={() => setShowNotifications(false)} className="btn-primary" style={{ padding: '0.6rem 2rem', fontSize: '0.85rem', minHeight: '44px' }}>Save Preferences</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Privacy Policy modal ─────────────────────────────────────────── */}
      {showPrivacy && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(25,37,36,0.5)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowPrivacy(false)}
        >
          <div
            style={{ width: '100%', maxWidth: '640px', borderRadius: '1.5rem', padding: '2rem', maxHeight: '85dvh', overflowY: 'auto', background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(255,255,255,0.85)', boxShadow: '0 20px 60px rgba(25,37,36,0.18)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--slate)', margin: 0 }}>Privacy Policy</h4>
              <button onClick={() => setShowPrivacy(false)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(209,235,219,0.5)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)' }}>✕</button>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--slate)', lineHeight: 1.7 }}>
              <p><strong>Effective Date:</strong> July 1, 2026</p>
              <p>Collabnb ("we," "our," "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>
              <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)', margin: '1.25rem 0 0.5rem' }}>Information We Collect</h5>
              <p>We collect personal information you provide directly, such as your name, email address, profile details, and social media handles. We also automatically collect usage data, cookies, and device information when you interact with our platform.</p>
              <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)', margin: '1.25rem 0 0.5rem' }}>How We Use Your Information</h5>
              <p>Your information is used to operate and improve Collabnb, facilitate collaborations between creators and hosts, send notifications and updates, and ensure platform safety. We never sell your personal data to third parties.</p>
              <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)', margin: '1.25rem 0 0.5rem' }}>Data Sharing</h5>
              <p>We may share your information with service providers who help us operate the platform (e.g., hosting, analytics), as required by law, or with your explicit consent.</p>
              <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)', margin: '1.25rem 0 0.5rem' }}>Your Rights</h5>
              <p>You may access, update, or delete your personal information at any time through your profile settings. Contact us at support@collabnb.com for assistance.</p>
              <p style={{ marginTop: '1rem' }}>For the full Privacy Policy, visit <a href="https://collabnb.com/privacy" style={{ color: 'var(--slate)', fontWeight: 600, textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">collabnb.com/privacy</a>.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Verification modal ───────────────────────────────────────────── */}
      {showVerification && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem', background: 'rgba(25,37,36,0.5)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowVerification(false)}
        >
          <div
            style={{ width: '100%', maxWidth: '420px', borderRadius: '1.5rem', padding: '2rem', background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(255,255,255,0.85)', boxShadow: '0 20px 60px rgba(25,37,36,0.18)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(209,235,219,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--slate)' }}>
                <SealCheck />
              </div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--slate)', margin: 0 }}>Re-Verification</h4>
            </div>
            <p style={{ color: 'var(--sage)', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
              Submit a request for the Collabnb team to review and re-verify your account. Your current verified status will remain active during review.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-glass" style={{ flex: 1, fontSize: '0.85rem' }} onClick={() => setShowVerification(false)}>Cancel</button>
              <button
                className="btn-primary"
                style={{ flex: 1, fontSize: '0.85rem' }}
                onClick={async () => {
                  alert('Re-verification request submitted. The Collabnb team will review your account.');
                  setShowVerification(false);
                }}
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Location Settings modal ────────────────────────────────────── */}
      {showLocation && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem', background: 'rgba(25,37,36,0.5)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowLocation(false)}
        >
          <div
            style={{ width: '100%', maxWidth: '460px', borderRadius: '1.5rem', padding: 'clamp(1.25rem, 5vw, 2rem)', background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(255,255,255,0.85)', boxShadow: '0 20px 60px rgba(25,37,36,0.18)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--slate)', margin: 0 }}>Location Settings</h4>
              <button onClick={() => setShowLocation(false)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(209,235,219,0.5)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)' }}>✕</button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--sage)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
              Your location appears as a pin on the Collabnb globe map so hosts and creators can see where the community is. You can update it anytime.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--sage)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>City</label>
                <input
                  type="text"
                  value={dp.city || ''}
                  onChange={(e) => {
                    const newCity = e.target.value;
                    setProfileOverride(prev => ({ ...prev, city: newCity }));
                    updateProfile({ ...dp, city: newCity });
                  }}
                  placeholder="e.g., Asheville"
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.875rem', background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(25,37,36,0.12)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--sage)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>State / Region</label>
                <input
                  type="text"
                  value={dp.region || ''}
                  onChange={(e) => {
                    const newRegion = e.target.value;
                    setProfileOverride(prev => ({ ...prev, region: newRegion }));
                    updateProfile({ ...dp, region: newRegion });
                  }}
                  placeholder="e.g., North Carolina"
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.875rem', background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(25,37,36,0.12)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--sage)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Country</label>
                <input
                  type="text"
                  value={dp.country || ''}
                  onChange={(e) => {
                    const newCountry = e.target.value;
                    setProfileOverride(prev => ({ ...prev, country: newCountry }));
                    updateProfile({ ...dp, country: newCountry });
                  }}
                  placeholder="e.g., United States"
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.875rem', background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(25,37,36,0.12)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {typeof navigator !== 'undefined' && 'geolocation' in navigator && (
              <button
                onClick={() => {
                  navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                      // Reverse geocode via OpenStreetMap Nominatim
                      try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
                        const data = await res.json();
                        const addr = data.address || {};
                        const newCity = addr.city || addr.town || addr.village || addr.municipality || '';
                        const newRegion = addr.state || '';
                        const newCountry = addr.country || '';
                        const updates = {};
                        if (newCity) updates.city = newCity;
                        if (newRegion) updates.region = newRegion;
                        if (newCountry) updates.country = newCountry;
                        setProfileOverride(prev => ({ ...prev, ...updates }));
                        updateProfile({ ...dp, ...updates });
                      } catch {
                        // Fallback: just use lat/lng as a hint
                      }
                    },
                    () => { /* permission denied — silently ignore */ },
                    { enableHighAccuracy: false, timeout: 10000 },
                  );
                }}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.875rem', border: '1.5px dashed rgba(60,87,89,0.3)', background: 'rgba(209,235,219,0.15)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate)', marginBottom: '0.75rem', transition: 'background 150ms, border-color 150ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(209,235,219,0.3)'; e.currentTarget.style.borderColor = 'rgba(60,87,89,0.5)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(209,235,219,0.15)'; e.currentTarget.style.borderColor = 'rgba(60,87,89,0.3)'; }}
              >
                📍 Use current location
              </button>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-glass" style={{ flex: 1, fontSize: '0.85rem' }} onClick={() => setShowLocation(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lifetime Access modal ────────────────────────────────────── */}
      <LifetimeAccessModal
        isOpen={lifetimeModalOpen}
        onClose={() => setLifetimeModalOpen(false)}
        role={profile?.role ?? 'creator'}
      />

      {/* ── Exit confirmation modal ───────────────────────────────────── */}
      {exitConfirmDraft && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(25,37,36,0.5)', backdropFilter: 'blur(6px)' }}
          onClick={() => setExitConfirmDraft(null)}
        >
          <div
            style={{ width: '100%', maxWidth: '380px', borderRadius: '1.5rem', padding: '2rem', background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(255,255,255,0.85)', boxShadow: '0 20px 60px rgba(25,37,36,0.18)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--slate)', margin: '0 0 0.75rem' }}>Unsaved Changes</h4>
            <p style={{ color: 'var(--sage)', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
              You have unsaved changes. Are you sure you want to exit without saving?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-primary" style={{ flex: 1, fontSize: '0.85rem' }} onClick={() => setExitConfirmDraft(null)}>Stay Editing</button>
              <button className="btn-glass" style={{ flex: 1, fontSize: '0.85rem' }} onClick={() => { setEditDraft(null); setExitConfirmDraft(null); }}>Discard Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast notification ───────────────────────────────────────────── */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '5rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 110, background: 'rgba(25,37,36,0.92)', backdropFilter: 'blur(12px)',
          color: '#EFECE9', padding: '0.75rem 1.5rem', borderRadius: '9999px',
          fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-body)',
          boxShadow: '0 8px 24px rgba(25,37,36,0.25)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          animation: 'fadeUp 300ms cubic-bezier(0.16,1,0.3,1) forwards',
        }}>
          <svg viewBox="0 0 14 14" fill="none" stroke="#D1EBDB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <polyline points="2 7 5.5 10.5 12 3.5" />
          </svg>
          {toastMsg}
        </div>
      )}
    </div>
  );
}
