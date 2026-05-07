import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useCollabs } from '../contexts/CollabContext';
import { SAMPLE_LISTINGS, SAMPLE_HOST, STAGES, DEMO_STAGE_CARDS } from '../lib/mockData';

/* ── Brand stage colors ──────────────────────────────────────────────────── */
const STAGE_COLORS = {
  pending:         { dot: '#192524', bg: 'rgba(25,37,36,0.08)',  label: 'Pending' },
  accepted:        { dot: '#959D90', bg: 'rgba(149,157,144,0.12)', label: 'Accepted' },
  updated:         { dot: '#D4A843', bg: 'rgba(212,168,67,0.12)', label: 'Adjustments' },
  uploaded_tagged: { dot: '#D1EBDD', bg: 'rgba(209,235,221,0.3)', label: 'Uploaded' },
  closed:          { dot: '#4A9B7F', bg: 'rgba(74,155,127,0.15)', label: 'Closed' },
  archived:        { dot: '#D0D5CE', bg: 'rgba(208,213,206,0.3)', label: 'Archived' },
};

/* ── SVG icons ────────────────────────────────────────────────────────────── */
const XIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14">
    <line x1="2" y1="2" x2="14" y2="14"/><line x1="14" y1="2" x2="2" y2="14"/>
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="10" height="10">
    <polyline points="2 7 5.5 10.5 12 3.5"/>
  </svg>
);
const GlobeSmall = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" width="12" height="12">
    <circle cx="8" cy="8" r="6"/><ellipse cx="8" cy="8" rx="2.5" ry="6"/>
    <line x1="2" y1="8" x2="14" y2="8"/>
  </svg>
);
const CalendarSmall = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" width="12" height="12">
    <rect x="2" y="3" width="12" height="11" rx="1.5"/><line x1="2" y1="7" x2="14" y2="7"/><line x1="5.5" y1="1" x2="5.5" y2="4"/><line x1="10.5" y1="1" x2="10.5" y2="4"/>
  </svg>
);
const BoxSmall = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" width="12" height="12">
    <path d="M2 5l6 3 6-3M8 14V8"/><path d="M2 5v6l6 3 6-3V5l-6-3z"/>
  </svg>
);
const DollarSmall = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" width="12" height="12">
    <line x1="8" y1="1" x2="8" y2="15"/><path d="M11 4.5c0-1.5-3-2-3-.5s3 2 3 3.5-3 2-3 .5"/><path d="M5 11.5c0 1.5 3 2 3 .5s-3-2-3-3.5 3-2 3-.5"/>
  </svg>
);

/* ─── Stage progress bar (redesigned) ────────────────────────────────────── */
/* Pulse keyframes for demo auto-advance */
const pulseKeyframes = `
@keyframes demo-pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(149,157,144,0.2); }
  50% { box-shadow: 0 0 0 10px rgba(149,157,144,0.4); }
}
@keyframes demo-dot-bounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.25); }
  100% { transform: scale(1); }
}
`;

function StageProgressBar({ stages, currentStage, viewingStage, onStageClick, demoPlaying }) {
  const prevViewingRef = useRef(viewingStage);
  const [animatingDot, setAnimatingDot] = useState(null);

  /* Detect when viewing stage changes — trigger bounce animation */
  useEffect(() => {
    if (prevViewingRef.current !== viewingStage) {
      setAnimatingDot(viewingStage);
      const t = setTimeout(() => setAnimatingDot(null), 400);
      prevViewingRef.current = viewingStage;
      return () => clearTimeout(t);
    }
  }, [viewingStage]);
  const curIdx = STAGES.findIndex((s) => s.key === currentStage);
  const stageCount = STAGES.length;
  // During demo, use viewingStage as the reference point instead of currentStage
  const refIdx = demoPlaying
    ? STAGES.findIndex((s) => s.key === (viewingStage || currentStage))
    : curIdx;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0.25rem 0' }}>
      <style>{pulseKeyframes}</style>
      <div className="flex items-start">
        {STAGES.map((stage, idx) => {
          const s = stages?.[stage.key];
          const completed = s?.completed;
          const isCurrent = stage.key === currentStage;
          const isViewing = stage.key === viewingStage;
          const isPast = idx < refIdx;
          const isClickable = completed || isCurrent;
          const color = STAGE_COLORS[stage.key] || STAGE_COLORS.pending;
          const dotSize = isCurrent ? 20 : isViewing ? 18 : completed ? 16 : 14;

          // In demo mode, use lighter/gentler visuals
          const effectiveDot = demoPlaying
            ? (isViewing || isPast ? color.dot : 'rgba(208,213,206,0.5)')
            : (completed ? color.dot : isCurrent ? color.dot : 'transparent');

          const effectiveBorder = demoPlaying
            ? isViewing
              ? `2.5px solid ${color.dot}`
              : isPast
                ? `2px solid ${color.dot}`
                : `1.5px solid rgba(208,213,206,0.5)`
            : completed
              ? 'none'
              : isCurrent
                ? `2.5px solid ${color.dot}`
                : `1.5px solid ${color.dot}`;

          const effectiveOpacity = demoPlaying
            ? (isViewing || isPast ? 1 : 0.4)
            : (completed || isCurrent ? 1 : 0.35);

          return (
            <div key={stage.key} className="flex items-center" style={{ flex: 1, minWidth: 0 }}>
              {/* Dot + label column */}
              <div
                className="flex flex-col items-center"
                style={{ flex: 1, cursor: isClickable ? 'pointer' : 'default' }}
                onClick={() => isClickable && onStageClick?.(stage.key)}
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: dotSize, height: dotSize,
                    borderRadius: '50%',
                    background: effectiveDot,
                    border: effectiveBorder,
                    opacity: effectiveOpacity,
                    boxShadow: isViewing
                      ? `0 0 0 4px ${color.bg}`
                      : isCurrent
                        ? `0 0 0 4px ${color.bg}`
                        : 'none',
                    transform: isViewing ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 350ms cubic-bezier(0.16,1,0.3,1)',
                    animation: animatingDot === stage.key
                      ? 'demo-dot-bounce 400ms ease-out'
                      : demoPlaying && isViewing
                        ? 'demo-pulse 1.5s ease-in-out infinite'
                        : 'none',
                  }}
                >
                  {isPast && !isViewing && !isCurrent && <span style={{ color: 'white', fontSize: '0.45rem' }}>✓</span>}
                </div>
                <span
                  className="text-center leading-tight transition-colors duration-200"
                  style={{
                    fontSize: isViewing ? '0.65rem' : isCurrent ? '0.6rem' : completed ? '0.6rem' : '0.55rem',
                    fontWeight: isViewing ? 800 : isCurrent ? 700 : completed ? 600 : 500,
                    color: demoPlaying
                      ? (isViewing ? 'var(--ink)' : isPast ? 'var(--slate)' : 'var(--stone)')
                      : (completed ? 'var(--slate)' : isCurrent ? 'var(--ink)' : 'var(--stone)'),
                    marginTop: '0.4rem',
                    maxWidth: '72px', overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {stage.label}
                </span>
                {demoPlaying && isViewing && (
                  <span style={{
                    fontSize: '0.48rem', color: 'var(--sage)', textAlign: 'center',
                    lineHeight: 1, marginTop: '0.15rem', whiteSpace: 'nowrap',
                    fontStyle: 'italic',
                  }}>
                    Current
                  </span>
                )}
                {!demoPlaying && completed && s?.date && (
                  <span style={{
                    fontSize: '0.48rem', color: 'var(--sage)', textAlign: 'center',
                    lineHeight: 1, marginTop: '0.15rem', whiteSpace: 'nowrap',
                  }}>
                    {s.date}
                  </span>
                )}
              </div>

              {/* Connector line — fixed 36px width for equal spacing */}
              {idx < stageCount - 1 && (
                <div
                  style={{
                    width: '36px', flexShrink: 0,
                    height: '1.5px',
                    background: isPast
                      ? `linear-gradient(90deg, ${color.dot}, ${STAGE_COLORS[STAGES[idx + 1].key]?.dot || color.dot})`
                      : `repeating-linear-gradient(90deg, rgba(208,213,206,0.5) 0, rgba(208,213,206,0.5) 4px, transparent 4px, transparent 7px)`,
                    alignSelf: 'flex-start',
                    marginTop: dotSize / 2,
                    marginBottom: (completed || (demoPlaying && isPast)) && s?.date ? '1.6rem' : '1.25rem',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Stage panels ───────────────────────────────────────────────────────── */

function PendingPanel({ collab, advanceStage }) {
  const [prompted, setPrompted] = useState(false);
  return (
    <div style={{ background: 'rgba(255,255,255,0.65)', borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1rem' }}>🟡</span>
        <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', margin: 0 }}>Pending Acceptance</h4>
      </div>
      <p style={{ color: 'var(--slate)', fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: 1.6 }}>
        This collaboration is waiting for the host to review and accept your application.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          className="btn-primary"
          style={{ fontSize: '0.8rem', padding: '0.6rem 1.25rem' }}
          onClick={() => {
            setPrompted(true);
            setTimeout(() => setPrompted(false), 2500);
          }}
        >
          {prompted ? '✓ Host Notified' : 'Prompt Host'}
        </button>
        <button
          className="btn-glass"
          style={{ fontSize: '0.8rem', padding: '0.6rem 1.25rem' }}
          onClick={() => advanceStage(collab.id)}
        >
          Advance to Accepted
        </button>
      </div>
      {prompted && (
        <p style={{ fontSize: '0.72rem', color: 'var(--sage)', marginTop: '0.5rem' }}>
          Notification sent to host — they'll be prompted to review your application.
        </p>
      )}
    </div>
  );
}

function AcceptedPanel({ collab, updateStageData, advanceStage }) {
  const [url, setUrl] = useState(collab.drive_url || '');
  const [saved, setSaved] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const hasLink = collab.drive_url && collab.drive_url.length > 0;
  const [notified, setNotified] = useState(false);

  const handleSaveLink = () => {
    updateStageData(collab.id, 'accepted', { drive_url: url, note: url ? 'Drive link shared' : '' });
    setSaved(true);
    setNotified(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.65)', borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1rem' }}>📋</span>
        <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', margin: 0 }}>Deliverables In Progress</h4>
      </div>
      <p style={{ color: 'var(--slate)', fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: 1.6 }}>
        The host has accepted! Share a link to your Google Drive or Dropbox folder so the host can preview your work.
      </p>
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://drive.google.com/..."
            style={{
              flex: 1, padding: '0.6rem 0.875rem', borderRadius: '0.75rem',
              background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(25,37,36,0.12)',
              fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--ink)',
              outline: 'none',
            }}
          />
          <div style={{ position: 'relative' }}>
            <button
              className="btn-primary"
              style={{ fontSize: '0.8rem', padding: '0.6rem 1rem' }}
              onClick={handleSaveLink}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              {saved ? 'Saved' : hasLink ? 'Update' : 'Save'}
            </button>
            {showTooltip && (
              <div style={{
                position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                marginBottom: '0.4rem', padding: '0.4rem 0.65rem', borderRadius: '0.5rem',
                background: 'var(--ink)', color: 'var(--bone)', fontSize: '0.68rem',
                whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10,
                boxShadow: '0 4px 12px rgba(25,37,36,0.15)',
              }}>
                Be sure that the link is editable by the host.
                <div style={{
                  position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                  width: 0, height: 0, borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent', borderTop: '5px solid var(--ink)',
                }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Host notified banner */}
      {notified && (
        <div style={{
          padding: '0.5rem 0.75rem', marginBottom: '0.75rem',
          borderRadius: '0.625rem', fontSize: '0.75rem', fontWeight: 600,
          background: 'rgba(74,155,127,0.1)', color: '#4A9B7F',
          display: 'flex', alignItems: 'center', gap: '0.4rem',
        }}>
          ✓ Drive link sent to host!
        </div>
      )}

      {/* Edit/resend button after first save */}
      {hasLink && (
        <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0 0 0.75rem', fontStyle: 'italic' }}>
          Need to update the link? Enter a new one above and click "{url !== collab.drive_url ? 'Save' : 'Update'}" to resend to the host.
        </p>
      )}

      <p style={{ fontSize: '0.7rem', color: 'var(--sage)', fontStyle: 'italic', margin: '0 0 1rem' }}>
        Future integrations with Frame.io, Wipster, and more on the way.
      </p>
      <button
        className="btn-glass"
        style={{ fontSize: '0.8rem', padding: '0.6rem 1.25rem' }}
        onClick={() => advanceStage(collab.id)}
      >
        Advance to Adjustments
      </button>
    </div>
  );
}

function AdjustmentsPanel({ collab, updateStageData, advanceStage }) {
  const deliverables = collab.deliverables || '';
  const parseDefault = (keyword) => {
    const m = deliverables.match(new RegExp(`(\\d+)\\s*${keyword}`, 'i'));
    return m ? parseInt(m[1]) : 0;
  };
  const defaultReels = parseDefault('Reel');
  const defaultPhotos = parseDefault('Photo');
  const defaultBlog = parseDefault('Blog');
  const [stats, setStats] = useState(collab.content_stats || {
    reels: defaultReels,
    photos: defaultPhotos,
    blog_posts: defaultBlog,
  });

  return (
    <div style={{ background: 'rgba(255,255,255,0.65)', borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1rem' }}>🔄</span>
        <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', margin: 0 }}>Adjustments</h4>
      </div>
      <p style={{ color: 'var(--slate)', fontSize: '0.85rem', margin: '0 0 0.75rem', lineHeight: 1.6 }}>
        Adjust the deliverables agreed upon in the Collabnb Agreement. The host will be notified of any changes.
      </p>

      {/* Agreement deliverables reference */}
      <div style={{
        padding: '0.6rem 0.75rem', marginBottom: '0.75rem',
        borderRadius: '0.625rem', background: 'rgba(209,235,221,0.15)',
        border: '1px solid rgba(209,235,221,0.4)',
      }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--sage)', margin: '0 0 0.2rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          From Collabnb Agreement
        </p>
        <p style={{ fontSize: '0.78rem', color: 'var(--slate)', margin: 0, fontStyle: 'italic' }}>
          {deliverables || 'No deliverables specified'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { key: 'reels', label: 'Reels', icon: '🎬' },
          { key: 'photos', label: 'Photos', icon: '📸' },
          { key: 'blog_posts', label: 'Blog Posts', icon: '✍️' },
        ].map(({ key, label, icon }) => (
          <div key={key} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--sage)', margin: '0 0 0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {icon} {label}
            </p>
            <input
              type="number" min="0"
              value={stats[key] || 0}
              onChange={(e) => setStats({ ...stats, [key]: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%', textAlign: 'center', padding: '0.4rem',
                borderRadius: '0.625rem', background: 'rgba(255,255,255,0.75)',
                border: '1px solid rgba(25,37,36,0.12)',
                fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 700,
                color: 'var(--ink)', outline: 'none',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          className="btn-primary"
          style={{ fontSize: '0.8rem', padding: '0.6rem 1rem' }}
          onClick={() => updateStageData(collab.id, 'updated', { content_stats: stats })}
        >
          Save Adjustments
        </button>
        <button
          className="btn-glass"
          style={{ fontSize: '0.8rem', padding: '0.6rem 1.25rem' }}
          onClick={() => advanceStage(collab.id)}
        >
          Advance to Uploaded
        </button>
      </div>
    </div>
  );
}

function UploadedPanel({ collab, advanceStage }) {
  const stats = collab.content_stats;
  const [checklist, setChecklist] = useState({ drive: false, tagged: false, located: false, met: false });
  const allChecked = Object.values(checklist).every(Boolean);
  return (
    <div style={{ background: 'rgba(255,255,255,0.65)', borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1rem' }}>🔵</span>
        <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', margin: 0 }}>Uploaded</h4>
      </div>

      {/* Stats display */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
          {Object.entries(stats).map(([key, val]) => (
            <div key={key} style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(209,235,219,0.3)', borderRadius: '0.75rem' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--slate)', margin: 0, fontFamily: 'var(--font-display)' }}>{val}</p>
              <p style={{ fontSize: '0.6rem', color: 'var(--sage)', margin: '0.1rem 0 0', textTransform: 'capitalize' }}>
                {key.replace(/_/g, ' ')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Review checklist */}
      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink)', margin: '0 0 0.5rem' }}>Review Checklist</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
        {[
          { key: 'drive', label: 'All files uploaded to shared drive' },
          { key: 'tagged', label: 'Content tagged @collabnb' },
          { key: 'located', label: 'Location tagged on all posts' },
          { key: 'met', label: 'All deliverables met' },
        ].map(({ key, label }) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--slate)' }}>
            <input
              type="checkbox"
              checked={checklist[key]}
              onChange={() => setChecklist((p) => ({ ...p, [key]: !p[key] }))}
              style={{ accentColor: 'var(--slate)' }}
            />
            {label}
          </label>
        ))}
      </div>

      <p style={{ fontSize: '0.7rem', color: 'var(--sage)', fontStyle: 'italic', margin: '0 0 1rem' }}>
        AI content analysis and performance projections coming soon.
      </p>

      {allChecked && (
        <button
          className="btn-primary"
          style={{ fontSize: '0.8rem', padding: '0.6rem 1.25rem' }}
          onClick={() => advanceStage(collab.id)}
        >
          Request Approval
        </button>
      )}
      {!allChecked && (
        <p style={{ fontSize: '0.72rem', color: 'var(--stone)', fontStyle: 'italic' }}>
          Complete all checklist items to request approval.
        </p>
      )}
    </div>
  );
}

function ClosedPanel({ collab, toggleCloseCollab }) {
  const stage = collab.stages?.closed || {};
  const creatorDone = !!stage.creator_closed;
  const hostDone = !!stage.host_closed;
  const bothDone = creatorDone && hostDone;
  const closedCount = [creatorDone, hostDone].filter(Boolean).length;

  return (
    <div style={{ background: 'rgba(255,255,255,0.65)', borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1rem' }}>🟢</span>
        <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', margin: 0 }}>Close Collaboration</h4>
      </div>

      {/* Dual-close progress */}
      <div style={{ marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--slate)', margin: '0 0 0.75rem', lineHeight: 1.6 }}>
          Both parties must confirm to close this collaboration and release payment.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <button
            onClick={() => toggleCloseCollab(collab.id, 'creator')}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.75rem', borderRadius: '0.875rem', cursor: 'pointer',
              background: creatorDone ? 'rgba(74,155,127,0.15)' : 'rgba(255,255,255,0.75)',
              border: `1.5px solid ${creatorDone ? '#4A9B7F' : 'rgba(25,37,36,0.12)'}`,
              fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600,
              color: creatorDone ? '#4A9B7F' : 'var(--slate)',
              transition: 'all 150ms',
            }}
          >
            {creatorDone ? <CheckIcon /> : <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--stone)', display: 'inline-block' }} />}
            Creator: {creatorDone ? 'Confirmed' : 'Confirm Close'}
          </button>
          <button
            onClick={() => toggleCloseCollab(collab.id, 'host')}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.75rem', borderRadius: '0.875rem', cursor: 'pointer',
              background: hostDone ? 'rgba(74,155,127,0.15)' : 'rgba(255,255,255,0.75)',
              border: `1.5px solid ${hostDone ? '#4A9B7F' : 'rgba(25,37,36,0.12)'}`,
              fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600,
              color: hostDone ? '#4A9B7F' : 'var(--slate)',
              transition: 'all 150ms',
            }}
          >
            {hostDone ? <CheckIcon /> : <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--stone)', display: 'inline-block' }} />}
            Host: {hostDone ? 'Confirmed' : 'Confirm Close'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(208,213,206,0.4)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '3px', background: 'var(--slate)', transition: 'width 300ms', width: `${(closedCount / 2) * 100}%` }} />
          </div>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--sage)' }}>{closedCount}/2</span>
        </div>
      </div>

      {/* Payment placeholder */}
      <div style={{
        padding: '1rem', borderRadius: '0.875rem',
        background: 'rgba(209,235,219,0.25)', border: '1px dashed rgba(60,87,89,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <DollarSmall />
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate)', margin: 0 }}>Integrated Payments — Coming Soon</p>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: 0, lineHeight: 1.5 }}>
          Collabnb will handle payouts, invoicing, and tax forms so you can focus on creating.
          Payment processor integration is on the way.
        </p>
      </div>

      {bothDone && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '0.875rem', background: 'rgba(74,155,127,0.1)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4A9B7F', margin: 0 }}>
            ✓ Both parties confirmed — collaboration will be archived
          </p>
        </div>
      )}
    </div>
  );
}

function ArchivedPanel({ collab }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.65)', borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1rem' }}>📦</span>
        <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', margin: 0 }}>Archived Collaboration</h4>
      </div>
      <p style={{ color: 'var(--slate)', fontSize: '0.85rem', margin: 0, lineHeight: 1.6 }}>
        This collaboration has been completed and archived. Use the timeline above to revisit any stage, or view the listing details below.
      </p>
      {collab.payment && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(74,155,127,0.1)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4A9B7F', margin: 0 }}>Payment: {collab.payment}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Main CollabDetail component ─────────────────────────────────────────── */
export default function CollabDetail({ collab, onClose }) {
  const navigate = useNavigate();
  const { advanceStage, updateStageData, toggleCloseCollab, contracts } = useCollabs();
  const [driveUrl, setDriveUrl] = useState(collab.drive_url || '');
  const listing = SAMPLE_LISTINGS.find((l) => l.id === collab.listing_id);
  const host = SAMPLE_HOST;
  const contract = collab.contract_id
    ? contracts.find((c) => c.id === collab.contract_id)
    : null;

  // Stage viewing & demo state
  const isDemo = collab.is_demo;
  const [viewingStageKey, setViewingStageKey] = useState(null);
  const isViewingPast = !isDemo && viewingStageKey && viewingStageKey !== collab.current_stage;
  const effectiveStageKey = viewingStageKey || collab.current_stage;
  const stageKeys = STAGES.map((s) => s.key);

  // Demo auto-advance
  const [demoPlaying, setDemoPlaying] = useState(isDemo);
  const [demoCardKey, setDemoCardKey] = useState(null);
  const demoCurIdx = stageKeys.indexOf(effectiveStageKey);
  const lastStageIdx = stageKeys.length - 1;
  const demoIntervalRef = useRef(null);

  useEffect(() => {
    if (isDemo && demoPlaying) {
      setDemoCardKey(effectiveStageKey);
      demoIntervalRef.current = setTimeout(() => {
        const curIdx = stageKeys.indexOf(effectiveStageKey);
        if (curIdx < lastStageIdx) {
          setViewingStageKey(stageKeys[curIdx + 1]);
        } else {
          setDemoPlaying(false);
          setDemoCardKey(null);
        }
      }, 3000);
      return () => clearTimeout(demoIntervalRef.current);
    }
  }, [isDemo, demoPlaying, effectiveStageKey]);

  const toggleDemoPlay = useCallback(() => {
    if (demoPlaying) {
      setDemoPlaying(false);
      clearTimeout(demoIntervalRef.current);
    } else {
      setDemoPlaying(true);
    }
  }, [demoPlaying]);

  const handleStageClick = useCallback((key) => {
    if (isDemo && demoPlaying) return; // ignore clicks while auto-playing
    setViewingStageKey(key === viewingStageKey ? null : key);
  }, [isDemo, demoPlaying, viewingStageKey]);

  // Save drive URL when it changes
  useEffect(() => {
    if (driveUrl !== collab.drive_url && driveUrl) {
      const timer = setTimeout(() => {
        updateStageData(collab.id, 'accepted', { drive_url: driveUrl });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [driveUrl]);

  const makeStagePanel = (stageKey) => {
    const panel = STAGES.find((s) => s.key === stageKey);
    if (!panel) return null;
    const panels = {
      pending:         <PendingPanel collab={collab} advanceStage={advanceStage} />,
      accepted:        <AcceptedPanel collab={collab} updateStageData={updateStageData} advanceStage={advanceStage} />,
      updated:         <AdjustmentsPanel collab={collab} updateStageData={updateStageData} advanceStage={advanceStage} />,
      uploaded_tagged: <UploadedPanel collab={collab} advanceStage={advanceStage} />,
      closed:          <ClosedPanel collab={collab} toggleCloseCollab={toggleCloseCollab} />,
      archived:        <ArchivedPanel collab={collab} />,
    };
    return panels[stageKey] || null;
  };

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        background: 'rgba(25,37,36,0.55)', backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '1rem', overflowY: 'auto',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%', maxWidth: '960px', marginTop: '1rem', marginBottom: '2rem',
          borderRadius: '1.5rem', overflow: 'hidden',
          background: 'rgba(255,255,255,0.97)',
          border: '1px solid rgba(255,255,255,0.85)',
          boxShadow: '0 20px 60px rgba(25,37,36,0.2), 0 4px 20px rgba(25,37,36,0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.5rem', borderBottom: '1px solid rgba(25,37,36,0.06)',
        }}>
          <div className="flex items-center gap-3">
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)', margin: 0 }}>
                {collab.property_name}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: '0.15rem 0 0' }}>
                {collab.location}
              </p>
            </div>
            {/* Due date badge */}
            {collab.is_active && collab.days_left !== null && collab.days_left !== undefined && (
              <span
                className="flex-shrink-0"
                style={{
                  fontSize: '0.65rem', fontWeight: 700, padding: '0.25rem 0.6rem',
                  borderRadius: '999px',
                  background: collab.days_left > 3
                    ? 'rgba(209,235,221,0.5)'
                    : collab.days_left > 0
                      ? 'rgba(212,168,67,0.15)'
                      : 'rgba(220,38,38,0.08)',
                  color: collab.days_left > 3
                    ? 'var(--slate)'
                    : collab.days_left > 0
                      ? '#B8922A'
                      : '#DC2626',
                }}
              >
                {collab.days_left > 0
                  ? `Due in ${collab.days_left} day${collab.days_left === 1 ? '' : 's'}`
                  : collab.days_left === 0
                    ? 'Due today'
                    : `Overdue by ${Math.abs(collab.days_left)} days`}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {isDemo && (
              <button
                onClick={toggleDemoPlay}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: demoPlaying ? 'rgba(74,155,127,0.12)' : 'rgba(25,37,36,0.06)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: demoPlaying ? '#4A9B7F' : 'var(--slate)', flexShrink: 0,
                  fontSize: '0.8rem',
                }}
                title={demoPlaying ? 'Pause auto-advance' : 'Resume auto-advance'}
              >
                {demoPlaying ? '⏸' : '▶'}
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'rgba(25,37,36,0.06)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--slate)', flexShrink: 0,
              }}
            >
              <XIcon />
            </button>
          </div>
        </div>

        {/* ── Stage progress bar ───────────────────────────────────────── */}
        <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(25,37,36,0.06)' }}>
          <StageProgressBar
            stages={collab.stages}
            currentStage={collab.current_stage}
            viewingStage={viewingStageKey}
            onStageClick={handleStageClick}
            demoPlaying={demoPlaying}
          />
        </div>

        {/* ── Stage interaction panel ──────────────────────────────────── */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(25,37,36,0.06)' }}>
          {/* Demo tour card */}
          {isDemo && demoCardKey && DEMO_STAGE_CARDS[demoCardKey] && (
            <div style={{
              padding: '1rem 1.25rem', marginBottom: '1rem',
              borderRadius: '1rem',
              background: 'rgba(209,235,221,0.3)',
              border: '1px solid rgba(209,235,221,0.6)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{DEMO_STAGE_CARDS[demoCardKey].icon}</span>
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                    {DEMO_STAGE_CARDS[demoCardKey].title}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--slate)', margin: '0.1rem 0 0', lineHeight: 1.4 }}>
                    {DEMO_STAGE_CARDS[demoCardKey].description}
                  </p>
                </div>
              </div>
              <p style={{
                fontSize: '0.68rem', color: 'var(--sage)', fontStyle: 'italic', margin: 0,
                padding: '0.4rem 0.65rem', borderRadius: '0.5rem',
                background: 'rgba(255,255,255,0.5)',
              }}>
                {DEMO_STAGE_CARDS[demoCardKey].tip}
              </p>
            </div>
          )}

          {/* Stage panel (grayed out when viewing past) */}
          <div style={{
            opacity: isViewingPast ? 0.4 : 1,
            pointerEvents: isViewingPast ? 'none' : 'auto',
            transition: 'opacity 300ms',
          }}>
            {makeStagePanel(effectiveStageKey)}
          </div>

          {/* Past stage notice */}
          {isViewingPast && (
            <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--sage)', fontStyle: 'italic' }}>
                Viewing past stage — actions are disabled. Click current or future stages to interact.
              </p>
            </div>
          )}
        </div>

        {/* ── Split content: Listing (left) + Contract (right, active only) ── */}
        {/* Skip for demo — only show stage pipeline */}
        {!isDemo && (
        <div style={{
          display: 'flex', flexDirection: 'row', gap: 0,
          borderBottom: '1px solid rgba(25,37,36,0.06)',
        }}>
          {/* Left: Listing Details */}
          <div style={{
            flex: collab.is_active ? '1 1 50%' : '1 1 100%',
            padding: '1.5rem',
            borderRight: collab.is_active ? '1px solid rgba(25,37,36,0.06)' : 'none',
            minWidth: 0,
          }}>
            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--sage)', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Listing Details
            </h4>
            <div style={{
              width: '100%', height: '160px', borderRadius: '0.875rem',
              overflow: 'hidden', marginBottom: '0.75rem',
              background: 'var(--stone)',
            }}>
              <img
                src={collab.image}
                alt={collab.property_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
            <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)', margin: '0 0 0.25rem' }}>
              {collab.property_name}
            </h5>
            <p style={{ fontSize: '0.75rem', color: 'var(--sage)', margin: '0 0 0.75rem' }}>
              📍 {collab.location}
            </p>

            {/* Quick info chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
              <span className="chip" style={{ fontSize: '0.65rem' }}><CalendarSmall /> {collab.dates}</span>
              <span className="chip" style={{ fontSize: '0.65rem' }}><BoxSmall /> {collab.deliverables}</span>
              {collab.payment && <span className="chip" style={{ fontSize: '0.65rem' }}><DollarSmall /> {collab.payment}</span>}
            </div>

            {/* Description */}
            {collab.listing_description && (
              <p style={{ fontSize: '0.78rem', color: 'var(--slate)', lineHeight: 1.6, margin: '0 0 1rem' }}>
                {collab.listing_description}
              </p>
            )}

            {/* Host info */}
            {host && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem', borderRadius: '0.875rem',
                background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden',
                  background: 'var(--mint)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--slate)', fontSize: '0.8rem', fontWeight: 700,
                }}>
                  {host.avatar_url ? (
                    <img src={host.avatar_url} alt={host.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    'H'
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{host.name}</p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--sage)', margin: '0.1rem 0 0' }}>{host.role}</p>
                </div>
              </div>
            )}

            <button
              className="btn-glass"
              style={{ marginTop: '0.75rem', fontSize: '0.75rem', padding: '0.5rem 1rem' }}
              onClick={() => navigate('/explore')}
            >
              <GlobeSmall /> View Full Listing
            </button>
          </div>

          {/* Right: Contract Summary (active collabs only) */}
          {collab.is_active && (
          <div style={{ flex: '1 1 50%', padding: '1.5rem', minWidth: 0 }}>
            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--sage)', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Contract Summary
            </h4>

            {/* Creator × Host */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
              marginBottom: '1rem',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden',
                  background: 'linear-gradient(135deg, #3C5759, #959D90)', margin: '0 auto 0.25rem',
                }}>
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 700 }}>
                    BV
                  </div>
                </div>
                <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Creator</p>
              </div>
              <span style={{ color: 'var(--stone)', fontSize: '0.8rem' }}>×</span>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden',
                  background: 'linear-gradient(135deg, #959D90, #D0D5CE)', margin: '0 auto 0.25rem',
                }}>
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 700 }}>
                    {collab.host_name?.charAt(0) || 'H'}
                  </div>
                </div>
                <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Host</p>
              </div>
            </div>

            {/* Agreement title */}
            <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', textAlign: 'center', margin: '0 0 0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(25,37,36,0.06)' }}>
              Collabnb Agreement
            </h5>

            {/* Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {[
                { label: 'Location', value: collab.location },
                { label: 'Dates', value: collab.dates },
                { label: 'Property', value: collab.property_name },
                { label: 'Deliverables', value: collab.deliverables },
                { label: 'Payment', value: collab.payment || 'Free Stay' },
                { label: 'Usage', value: 'Social Media Only' },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '0.4rem 0.5rem', background: 'rgba(209,235,219,0.15)', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--sage)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink)', margin: '0.1rem 0 0', lineHeight: 1.2 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Summary paragraph */}
            <div style={{
              padding: '0.625rem 0.75rem', borderRadius: '0.625rem',
              background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(25,37,36,0.06)',
              marginBottom: '0.75rem',
            }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--slate)', lineHeight: 1.6, margin: 0 }}>
                This collaboration agreement is between <strong>{collab.host_name || 'the Host'}</strong> and <strong>Ben Venturing</strong> regarding <strong>{collab.property_name}</strong> located in <strong>{collab.location}</strong> from <strong>{collab.dates}</strong>. The creator agrees to deliver <strong>{collab.deliverables}</strong> in exchange for <strong>{collab.payment || 'a complimentary stay'}</strong>.
              </p>
            </div>

            {/* Signature lines */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ flex: 1, padding: '0.5rem 0.625rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.5)' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--sage)', margin: '0 0 0.2rem', textTransform: 'uppercase' }}>Creator Signature</p>
                <p style={{ fontFamily: "'Pacifico', cursive", fontSize: '0.85rem', color: 'var(--ink)', margin: 0 }}>Ben Venturing</p>
              </div>
              <div style={{ flex: 1, padding: '0.5rem 0.625rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.5)' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--sage)', margin: '0 0 0.2rem', textTransform: 'uppercase' }}>Host Signature</p>
                {contract?.host_signed ? (
                  <p style={{ fontFamily: "'Pacifico', cursive", fontSize: '0.85rem', color: 'var(--ink)', margin: 0 }}>{collab.host_name}</p>
                ) : (
                  <p style={{ fontSize: '0.75rem', color: 'var(--stone)', fontStyle: 'italic', margin: 0 }}>Pending</p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(!contract || !contract.host_signed) && (
                <button
                  className="btn-primary"
                  style={{ flex: 1, fontSize: '0.75rem', padding: '0.5rem' }}
                  onClick={() => navigate('/contract', { state: { prefill: {
                    creator: 'Ben Venturing',
                    host: collab.host_name,
                    property_name: collab.property_name,
                    location: collab.location,
                    dates: collab.dates,
                    deliverables: collab.deliverables,
                  } } })}
                >
                  {contract ? 'Edit Contract' : 'Create Contract'}
                </button>
              )}
              <button
                className="btn-glass"
                style={{ flex: contract?.host_signed ? 1 : 'initial', fontSize: '0.75rem', padding: '0.5rem 0.75rem' }}
                onClick={() => navigate('/contract')}
              >
                View All
              </button>
            </div>
          </div>)}
        </div>)}
        {/* ── Demo listing-bypass message ──────────────────────────────── */}
        {isDemo && (
          <div style={{ padding: '1.5rem 1.5rem 0.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--sage)', fontStyle: 'italic' }}>
              This is a demo tour — listing details and contract sections are hidden. Use the stage walkthrough above to explore the collaboration lifecycle.
            </p>
          </div>
        )}

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div style={{ padding: '0.75rem 1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.65rem', color: 'var(--stone)', margin: 0 }}>
            Collabnb — Creator Collaboration Platform
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
