import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollabs } from '../contexts/CollabContext';
import { SAMPLE_LISTINGS } from '../lib/mockData';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

// Deterministic rotation/offset from listing ID so cards don't shuffle on re-render
function getCardStyle(id) {
  const hash = String(id).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rotations = [-2.8, -1.6, -0.9, 0.7, 1.4, 2.2, -2.1, 1.9, -1.3, 0.4, 2.6, -0.6];
  const offsets   = [0, 10, -8, 14, -5, 8, -12, 6, -10, 12, -4, 7];
  return {
    rotation: rotations[hash % rotations.length],
    topOffset: offsets[(hash + 3) % offsets.length],
  };
}

function PolaroidCard({ listing, onUnsave, onNavigate, onMoveOpen, collections, delay }) {
  const [hovered, setHovered] = useState(false);
  const { rotation, topOffset } = getCardStyle(listing.id);
  const [rippling, setRippling] = useState(false);

  const handleUnsave = (e) => {
    e.stopPropagation();
    setRippling(true);
    setTimeout(() => setRippling(false), 650);
    onUnsave(listing.id);
  };

  return (
    <div
      className="reveal-up"
      style={{
        animationDelay: `${delay}ms`,
        opacity: 0,
        marginTop: topOffset,
        cursor: 'pointer',
      }}
      onClick={onNavigate}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '3px',
          padding: '9px 9px 40px',
          boxShadow: hovered
            ? '0 14px 40px rgba(25,37,36,0.2), 0 4px 12px rgba(25,37,36,0.1)'
            : '0 4px 18px rgba(25,37,36,0.13), 0 1px 4px rgba(25,37,36,0.07)',
          transform: hovered
            ? 'rotate(0deg) translateY(-8px) scale(1.025)'
            : `rotate(${rotation}deg)`,
          transition: 'transform 320ms var(--ease-out-quart), box-shadow 320ms var(--ease-out-quart)',
          userSelect: 'none',
          position: 'relative',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Photo */}
        <div style={{ position: 'relative', height: 190, overflow: 'hidden', borderRadius: '2px' }}>
          <img
            src={listing.image}
            alt={listing.title}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />

          {/* SAMPLE watermark */}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem',
              color: '#192524', opacity: 0.07, transform: 'rotate(-25deg)',
              userSelect: 'none', letterSpacing: '0.25em',
            }}>SAMPLE</span>
          </div>

          {listing.is_featured && (
            <span className="eyebrow-tag" style={{
              position: 'absolute', top: '0.5rem', left: '0.5rem',
              fontSize: '0.55rem', padding: '0.2rem 0.45rem',
            }}>Featured</span>
          )}

          {/* Heart / unsave */}
          <button
            onClick={handleUnsave}
            style={{
              position: 'absolute', top: '0.5rem', right: '0.5rem',
              width: '1.875rem', height: '1.875rem', borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer', overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(25,37,36,0.1)',
              transition: 'transform 200ms var(--ease-out-quart)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.12)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            title="Remove from saved"
          >
            {rippling && (
              <span style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(25,37,36,0.15)',
                animation: 'ripple-heart 650ms var(--ease-out-expo) forwards',
                pointerEvents: 'none',
              }} />
            )}
            <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, position: 'relative', zIndex: 1, transition: 'fill 250ms ease' }}
              fill="#192524" stroke="#192524" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>

        {/* Polaroid caption strip */}
        <div style={{ paddingTop: 10, textAlign: 'center', position: 'relative' }}>
          <p style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '0.82rem', color: 'var(--ink)', lineHeight: 1.25,
            marginBottom: '0.15rem',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {listing.title}
          </p>
          <p style={{ fontSize: '0.66rem', color: 'var(--sage)', marginBottom: '0.2rem' }}>{listing.location}</p>
          {/* Compensation value */}
          {listing.compensation && (
            <p style={{
              fontSize: '0.65rem', fontWeight: 700, color: 'var(--slate)',
              letterSpacing: '0.02em',
              display: 'inline-block',
              padding: '0.15rem 0.5rem',
              borderRadius: '999px',
              background: 'rgba(209,235,221,0.35)',
            }}>
              {listing.compensation}
            </p>
          )}

          {/* Move to collection dot-menu */}
          {collections.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveOpen(listing.id, e); }}
              style={{
                position: 'absolute', top: 8, right: -2,
                width: 20, height: 20, borderRadius: '50%',
                background: hovered ? 'rgba(25,37,36,0.07)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
                opacity: hovered ? 1 : 0, transition: 'opacity 200ms, background 150ms',
              }}
              title="Move to collection"
            >
              <svg viewBox="0 0 20 20" fill="var(--sage)" style={{ width: 12, height: 12 }}>
                <circle cx="10" cy="4"  r="1.5"/>
                <circle cx="10" cy="10" r="1.5"/>
                <circle cx="10" cy="16" r="1.5"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NewCollectionModal({ onConfirm, onCancel }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(25,37,36,0.35)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.8)',
          borderRadius: '1.25rem',
          padding: '1.75rem',
          width: '100%', maxWidth: 360,
          boxShadow: '0 24px 60px rgba(25,37,36,0.2)',
          animation: 'fadeUp 240ms var(--ease-out-expo) forwards',
        }}
      >
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--ink)', marginBottom: '1rem' }}>
          Name this collection
        </h2>
        <input
          ref={inputRef}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onConfirm(name); if (e.key === 'Escape') onCancel(); }}
          placeholder="e.g. Dream Cabins, East Coast…"
          style={{
            width: '100%', padding: '0.7rem 1rem',
            borderRadius: '0.75rem', fontSize: '0.9rem',
            border: '1.5px solid rgba(25,37,36,0.15)',
            background: 'rgba(239,236,233,0.5)',
            fontFamily: 'var(--font-body)', color: 'var(--ink)',
            outline: 'none', marginBottom: '1.25rem',
          }}
        />
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '0.65rem', borderRadius: '0.75rem',
            border: '1.5px solid rgba(25,37,36,0.12)', background: 'transparent',
            fontSize: '0.875rem', fontWeight: 500, color: 'var(--slate)',
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>Cancel</button>
          <button
            onClick={() => name.trim() && onConfirm(name)}
            disabled={!name.trim()}
            className="btn-primary"
            style={{ flex: 1, padding: '0.65rem', fontSize: '0.875rem', opacity: name.trim() ? 1 : 0.4 }}
          >Create</button>
        </div>
      </div>
    </div>
  );
}

function MoveMenu({ listing, collections, onMove, onClose, anchorPos }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 150 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: Math.min(anchorPos.y, window.innerHeight - 220),
          left: Math.min(anchorPos.x, window.innerWidth - 200),
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.8)',
          borderRadius: '0.875rem',
          padding: '0.5rem',
          minWidth: 180, zIndex: 151,
          boxShadow: '0 12px 40px rgba(25,37,36,0.15)',
          animation: 'fadeUp 180ms var(--ease-out-expo) forwards',
        }}
      >
        <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--sage)', padding: '0.4rem 0.75rem 0.5rem' }}>
          Move to
        </p>
        {collections.map((col) => (
          <button
            key={col.id}
            onClick={() => onMove(listing.id, col.id)}
            style={{
              width: '100%', textAlign: 'left', padding: '0.55rem 0.75rem',
              borderRadius: '0.625rem', fontSize: '0.85rem', fontWeight: 500,
              color: 'var(--ink)', background: 'transparent',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              transition: 'background 120ms',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(209,235,219,0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="var(--sage)" strokeWidth="1.5" style={{ width: 14, height: 14 }}>
              <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
            </svg>
            {col.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Saved() {
  const navigate = useNavigate();
  const { savedIds, collections, activeCollectionId, toggleSave, createCollection, setActiveCollection, moveToCollection } = useCollabs();

  const [showNewCollection, setShowNewCollection] = useState(false);
  const [moveState, setMoveState] = useState(null); // { listingId, pos: {x,y} }

  const convexListings = useQuery(api.listings.getAll) ?? [];
  // Normalize Convex listings so they use string `id` like SAMPLE_LISTINGS
  const convexNormalized = convexListings.map((l) => ({ ...l, id: String(l._id) }));
  // Merged pool: Convex listings take precedence, then sample (for demos/testing)
  const allListings = [
    ...convexNormalized,
    ...SAMPLE_LISTINGS.filter((s) => !convexNormalized.some((c) => c.id === s.id)),
  ];

  const allSaved = allListings.filter((l) => savedIds.has(l.id));
  const totalCount = allSaved.length;

  const handleCreateCollection = (name) => {
    createCollection(name);
    setShowNewCollection(false);
  };

  const handleMoveOpen = (listingId, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMoveState({ listingId, pos: { x: rect.right + 8, y: rect.top } });
  };

  const handleMove = (listingId, targetCollectionId) => {
    moveToCollection(listingId, targetCollectionId);
    setMoveState(null);
  };

  return (
    <div style={{ minHeight: '100dvh' }}>
      {/* ── Header ── */}
      <div style={{ padding: '2rem 1.5rem 1.25rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: '1.75rem', color: 'var(--ink)', marginBottom: '0.2rem',
        }}>
          Saved
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--sage)' }}>
          {totalCount === 0
            ? 'No saved collaborations yet'
            : `${totalCount} saved collaboration${totalCount !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* ── Empty state ── */}
      {totalCount === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', paddingTop: '5rem', gap: '1rem', textAlign: 'center',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(25,37,36,0.07)',
          }}>
            <svg viewBox="0 0 24 24" style={{
              width: 32, height: 32,
              animation: 'heart-idle-pulse 2.4s ease-in-out infinite',
            }}
              fill="none" stroke="var(--sage)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)', marginBottom: '0.35rem' }}>
              Nothing saved yet
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--sage)', maxWidth: 240 }}>
              Tap the heart on any listing in Explore to save it here.
            </p>
          </div>
          <button
            onClick={() => navigate('/explore')}
            className="btn-primary"
            style={{ marginTop: '0.5rem', padding: '0.65rem 1.5rem', fontSize: '0.85rem' }}
          >
            Browse collabs
          </button>
        </div>
      )}

      {/* ── Collections ── */}
      {totalCount > 0 && (
        <div style={{ padding: '0 1.5rem 5rem' }}>

          {/* Collection tabs */}
          <div style={{
            display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
            marginBottom: '1.75rem', alignItems: 'center',
          }}>
            {collections.map((col) => {
              const count = col.listingIds.length;
              const active = col.id === activeCollectionId;
              return (
                <button
                  key={col.id}
                  onClick={() => setActiveCollection(col.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.45rem 0.9rem', borderRadius: '9999px',
                    fontSize: '0.82rem', fontWeight: 600,
                    background: active ? 'var(--ink)' : 'rgba(255,255,255,0.65)',
                    color: active ? 'var(--bone)' : 'var(--slate)',
                    border: '1px solid', borderColor: active ? 'var(--ink)' : 'rgba(25,37,36,0.12)',
                    backdropFilter: 'blur(12px)',
                    cursor: 'pointer', transition: 'all 200ms var(--ease-out-quart)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {col.name}
                  {count > 0 && (
                    <span style={{
                      minWidth: 18, height: 18, borderRadius: 9999,
                      background: active ? 'rgba(255,255,255,0.2)' : 'rgba(25,37,36,0.08)',
                      fontSize: '0.65rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 5px',
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* New collection button */}
            <button
              onClick={() => setShowNewCollection(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.45rem 0.75rem', borderRadius: '9999px',
                fontSize: '0.82rem', fontWeight: 500, color: 'var(--sage)',
                background: 'transparent',
                border: '1.5px dashed rgba(149,157,144,0.45)',
                cursor: 'pointer', transition: 'border-color 150ms, color 150ms',
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(60,87,89,0.5)'; e.currentTarget.style.color = 'var(--slate)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(149,157,144,0.45)'; e.currentTarget.style.color = 'var(--sage)'; }}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 12, height: 12 }}>
                <line x1="10" y1="4" x2="10" y2="16"/><line x1="4" y1="10" x2="16" y2="10"/>
              </svg>
              New collection
            </button>
          </div>

          {/* Render each collection's polaroid board */}
          {collections.map((col) => {
            const listings = allListings.filter((l) => col.listingIds.includes(l.id));
            if (listings.length === 0) return (
              <div key={col.id} style={{ marginBottom: '2.5rem' }}>
                <p style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem',
                  color: 'var(--ink)', marginBottom: '0.75rem',
                }}>
                  {col.name}
                </p>
                <div style={{
                  border: '1.5px dashed rgba(149,157,144,0.35)',
                  borderRadius: '1rem', padding: '2rem 1.5rem',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--sage)' }}>
                    No listings in this collection yet — heart a listing to add it here.
                  </p>
                </div>
              </div>
            );

            return (
              <div key={col.id} style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)' }}>
                    {col.name}
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--sage)' }}>
                    {listings.length} {listings.length === 1 ? 'stay' : 'stays'}
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '1.5rem 1.25rem',
                  alignItems: 'start',
                }}>
                  {listings.map((listing, i) => (
                    <PolaroidCard
                      key={listing.id}
                      listing={listing}
                      onUnsave={toggleSave}
                      onNavigate={() => navigate(`/listing/${listing.id}`)}
                      onMoveOpen={handleMoveOpen}
                      collections={collections}
                      delay={i * 60}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modals ── */}
      {showNewCollection && (
        <NewCollectionModal
          onConfirm={handleCreateCollection}
          onCancel={() => setShowNewCollection(false)}
        />
      )}
      {moveState && (
        <MoveMenu
          listing={{ id: moveState.listingId }}
          collections={collections}
          onMove={handleMove}
          onClose={() => setMoveState(null)}
          anchorPos={moveState.pos}
        />
      )}
    </div>
  );
}
