import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useCollabs } from '../contexts/CollabContext';
import { useAuth } from '../contexts/AuthContext';
import { SAMPLE_LISTINGS, SAMPLE_HOST, STAGES, DEMO_STAGE_CARDS } from '../lib/mockData';
import {
  Clock, Trash2, ClipboardCheck, RefreshCw, Clapperboard, Camera, PenLine,
  Upload, CheckCircle2, BarChart3, Archive,
} from 'lucide-react';

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
const PinSmall = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" width="12" height="12">
    <path d="M8 0C5.24 0 3 2.24 3 5c0 3.75 5 11 5 11s5-7.25 5-11c0-2.76-2.24-5-5-5z"/><circle cx="8" cy="5" r="2"/>
  </svg>
);

/* ─── Small panel-header icon + title row (shared across stage panels) ────── */
function PanelHeading({ icon: Icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
      <Icon size={16} color="var(--slate)" />
      <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', margin: 0 }}>{children}</h4>
    </div>
  );
}

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
  const { t } = useTranslation('collabDetail');
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
                    {t('current')}
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

function PendingPanel({ collab, advanceStage, onRemove }) {
  const { t } = useTranslation('collabDetail');
  const [prompted, setPrompted] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  return (
    <div style={{ background: 'rgba(255,255,255,0.65)', borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.8)' }}>
      <PanelHeading icon={Clock}>{t('pending.title')}</PanelHeading>
      <p style={{ color: 'var(--slate)', fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: 1.6 }}>
        {t('pending.body')}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className="btn-primary"
          style={{ fontSize: '0.8rem', padding: '0.6rem 1.25rem' }}
          onClick={() => {
            setPrompted(true);
            setTimeout(() => setPrompted(false), 2500);
          }}
        >
          {prompted ? t('pending.prompted') : t('pending.prompt')}
        </button>
        <button
          className="btn-glass"
          style={{ fontSize: '0.8rem', padding: '0.6rem 1.25rem' }}
          onClick={() => advanceStage(collab.id)}
        >
          {t('pending.advance')}
        </button>
        {onRemove && (
          <button
            className="btn-glass"
            style={{ fontSize: '0.8rem', padding: '0.6rem 1.25rem', color: '#c0392b', borderColor: 'rgba(192,57,43,0.2)' }}
            onClick={() => setConfirmWithdraw(true)}
          >
            {t('pending.withdraw')}
          </button>
        )}
      </div>
      {prompted && (
        <p style={{ fontSize: '0.72rem', color: 'var(--sage)', marginTop: '0.5rem' }}>
          {t('pending.notified')}
        </p>
      )}
      {confirmWithdraw && (
        <WithdrawConfirmModal
          onConfirm={onRemove}
          onCancel={() => setConfirmWithdraw(false)}
        />
      )}
    </div>
  );
}

/* ─── Withdraw confirmation popup ─────────────────────────────────────────── */
function WithdrawConfirmModal({ onConfirm, onCancel, titleKey = 'withdraw.title', bodyKey = 'withdraw.body', confirmKey = 'withdraw.confirm', cancelKey = 'withdraw.cancel' }) {
  const { t } = useTranslation('collabDetail');
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(25,37,36,0.5)', backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)', padding: '1.5rem',
        animation: 'fadeIn 150ms ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          width: '100%', maxWidth: '380px',
          background: 'rgba(255,255,255,0.98)',
          border: '1px solid rgba(255,255,255,0.85)',
          borderRadius: '1.25rem', padding: '1.5rem',
          boxShadow: '0 20px 60px rgba(25,37,36,0.28)',
          textAlign: 'center',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: '50%', margin: '0 auto 0.875rem',
          background: 'rgba(192,57,43,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Trash2 size={19} color="#c0392b" />
        </div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', margin: '0 0 0.5rem' }}>
          {t(titleKey)}
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--slate)', lineHeight: 1.55, margin: '0 0 1.25rem' }}>
          {t(bodyKey)}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={onConfirm}
            style={{
              width: '100%', padding: '0.7rem', borderRadius: '0.75rem',
              background: '#c0392b', color: '#fff', border: 'none',
              fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            {t(confirmKey)}
          </button>
          <button
            onClick={onCancel}
            className="btn-glass"
            style={{ width: '100%', padding: '0.7rem', fontSize: '0.85rem', fontWeight: 600 }}
          >
            {t(cancelKey)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function AcceptedPanel({ collab, updateStageData, advanceStage }) {
  const { t } = useTranslation('collabDetail');
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
      <PanelHeading icon={ClipboardCheck}>{t('accepted.title')}</PanelHeading>
      <p style={{ color: 'var(--slate)', fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: 1.6 }}>
        {t('accepted.body')}
      </p>
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('accepted.placeholder')}
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
              {saved ? t('accepted.saved') : hasLink ? t('accepted.update') : t('accepted.save')}
            </button>
            {showTooltip && (
              <div style={{
                position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                marginBottom: '0.4rem', padding: '0.4rem 0.65rem', borderRadius: '0.5rem',
                background: 'var(--ink)', color: 'var(--bone)', fontSize: '0.68rem',
                whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10,
                boxShadow: '0 4px 12px rgba(25,37,36,0.15)',
              }}>
                {t('accepted.tooltip')}
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
          {t('accepted.linkSent')}
        </div>
      )}

      {/* Edit/resend button after first save */}
      {hasLink && (
        <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0 0 0.75rem', fontStyle: 'italic' }}>
          {t('accepted.resend', { action: url !== collab.drive_url ? t('accepted.save') : t('accepted.update') })}
        </p>
      )}

      <p style={{ fontSize: '0.7rem', color: 'var(--sage)', fontStyle: 'italic', margin: '0 0 1rem' }}>
        {t('accepted.integrations')}
      </p>
      <button
        className="btn-glass"
        style={{ fontSize: '0.8rem', padding: '0.6rem 1.25rem' }}
        onClick={() => advanceStage(collab.id)}
      >
        {t('accepted.advance')}
      </button>
    </div>
  );
}

function AdjustmentsPanel({ collab, updateStageData, advanceStage }) {
  const { t } = useTranslation('collabDetail');
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
      <PanelHeading icon={RefreshCw}>{t('adjustments.title')}</PanelHeading>
      <p style={{ color: 'var(--slate)', fontSize: '0.85rem', margin: '0 0 0.75rem', lineHeight: 1.6 }}>
        {t('adjustments.body')}
      </p>

      {/* Agreement deliverables reference */}
      <div style={{
        padding: '0.6rem 0.75rem', marginBottom: '0.75rem',
        borderRadius: '0.625rem', background: 'rgba(209,235,221,0.15)',
        border: '1px solid rgba(209,235,221,0.4)',
      }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--sage)', margin: '0 0 0.2rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {t('adjustments.fromAgreement')}
        </p>
        <p style={{ fontSize: '0.78rem', color: 'var(--slate)', margin: 0, fontStyle: 'italic' }}>
          {deliverables || t('adjustments.noDeliverables')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { key: 'reels', icon: Clapperboard },
          { key: 'photos', icon: Camera },
          { key: 'blog_posts', icon: PenLine },
        ].map(({ key, icon: FieldIcon }) => (
          <div key={key} style={{ textAlign: 'center' }}>
            <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', fontSize: '0.65rem', fontWeight: 700, color: 'var(--sage)', margin: '0 0 0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <FieldIcon size={12} /> {t(`adjustments.types.${key}`)}
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
          {t('adjustments.save')}
        </button>
        <button
          className="btn-glass"
          style={{ fontSize: '0.8rem', padding: '0.6rem 1.25rem' }}
          onClick={() => advanceStage(collab.id)}
        >
          {t('adjustments.advance')}
        </button>
      </div>
    </div>
  );
}

function UploadedPanel({ collab, advanceStage }) {
  const { t } = useTranslation('collabDetail');
  const stats = collab.content_stats;
  const [checklist, setChecklist] = useState({ drive: false, tagged: false, located: false, met: false });
  const allChecked = Object.values(checklist).every(Boolean);
  return (
    <div style={{ background: 'rgba(255,255,255,0.65)', borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.8)' }}>
      <PanelHeading icon={Upload}>{t('uploaded.title')}</PanelHeading>

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
      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink)', margin: '0 0 0.5rem' }}>{t('uploaded.checklist')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
        {[
          { key: 'drive' },
          { key: 'tagged' },
          { key: 'located' },
          { key: 'met' },
        ].map(({ key }) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--slate)' }}>
            <input
              type="checkbox"
              checked={checklist[key]}
              onChange={() => setChecklist((p) => ({ ...p, [key]: !p[key] }))}
              style={{ accentColor: 'var(--slate)' }}
            />
            {t(`uploaded.items.${key}`)}
          </label>
        ))}
      </div>

      <p style={{ fontSize: '0.7rem', color: 'var(--sage)', fontStyle: 'italic', margin: '0 0 1rem' }}>
        {t('uploaded.ai')}
      </p>

      {allChecked && (
        <button
          className="btn-primary"
          style={{ fontSize: '0.8rem', padding: '0.6rem 1.25rem' }}
          onClick={() => advanceStage(collab.id)}
        >
          {t('uploaded.requestApproval')}
        </button>
      )}
      {!allChecked && (
        <p style={{ fontSize: '0.72rem', color: 'var(--stone)', fontStyle: 'italic' }}>
          {t('uploaded.hint')}
        </p>
      )}
    </div>
  );
}

const INPUT_S = {
  width: '100%', padding: '0.45rem 0.6rem', borderRadius: '0.625rem',
  background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(25,37,36,0.12)',
  fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink)', outline: 'none',
};
const LABEL_S = { fontSize: '0.65rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.3rem' };

const TRUSTPILOT_REVIEW_URL = 'https://www.trustpilot.com/evaluate/collabnb.com';

function StarRow({ value, onChange, size = '1.6rem' }) {
  const { t } = useTranslation('collabDetail');
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: '0.25rem' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          aria-label={t('star', { count: n })}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontSize: size, lineHeight: 1, transition: 'transform 120ms',
            transform: (hover || value) >= n ? 'scale(1.08)' : 'scale(1)',
            color: (hover || value) >= n ? '#D4A843' : 'rgba(25,37,36,0.18)',
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function ClosedPanel({ collab, toggleCloseCollab }) {
  const { t } = useTranslation('collabDetail');
  const stage = collab.stages?.closed || {};
  const creatorDone = !!stage.creator_closed;
  const hostDone = !!stage.host_closed;
  const bothDone = creatorDone && hostDone;
  const closedCount = [creatorDone, hostDone].filter(Boolean).length;
  const { submitContentMetrics } = useCollabs();
  const { profile } = useAuth();

  // Mutual ratings — required to confirm close
  const submitReviewCvx = useMutation(api.reviews.submit);
  const reviews = useQuery(api.reviews.getForCollab, { collabId: String(collab.id) }) || [];
  const reviewByRole = (role) => reviews.find((r) => r.reviewer_role === role);
  const [ratingParty, setRatingParty] = useState(null); // 'creator' | 'host' | null
  const [stars, setStars] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const openRating = (party) => {
    if ((party === 'creator' && creatorDone) || (party === 'host' && hostDone)) return;
    setRatingParty(party);
    setStars(0);
    setReviewComment('');
  };

  const handleSubmitReview = async () => {
    if (!ratingParty || stars < 1 || submittingReview) return;
    setSubmittingReview(true);
    try {
      await submitReviewCvx({
        collabId: String(collab.id),
        contractId: collab.contract_id ? String(collab.contract_id) : undefined,
        reviewerRole: ratingParty,
        rating: stars,
        comment: reviewComment.trim() || undefined,
        reviewerId: profile?._id ? String(profile._id) : undefined,
        reviewerName: profile?.full_name || undefined,
        revieweeName: ratingParty === 'creator' ? collab.host_name : (collab.creator_name || undefined),
        propertyName: collab.property_name || undefined,
      }).catch(() => {});
      toggleCloseCollab(collab.id, ratingParty);
      setRatingParty(null);
    } finally {
      setSubmittingReview(false);
    }
  };

  const [form, setForm] = useState({ post_url: '', views: '', likes: '', comments: '', saves: '' });
  const [metricsSubmitted, setMetricsSubmitted] = useState(!!collab.content_metrics);
  const [computedER, setComputedER] = useState(collab.content_er ?? null);

  const setField = (f) => (e) => setForm((m) => ({ ...m, [f]: e.target.value }));
  const canSubmit = form.views && form.likes !== '' && form.comments !== '';

  const handleSubmitMetrics = () => {
    if (!canSubmit) return;
    const v = parseInt(form.views, 10) || 0;
    const l = parseInt(form.likes, 10) || 0;
    const c = parseInt(form.comments, 10) || 0;
    const s = parseInt(form.saves, 10) || 0;
    const er = v > 0 ? parseFloat((((l + c) / v) * 100).toFixed(2)) : 0;
    submitContentMetrics(collab.id, { post_url: form.post_url, views: v, likes: l, comments: c, saves: s });
    setComputedER(er);
    setMetricsSubmitted(true);
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.65)', borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.8)' }}>
      <PanelHeading icon={CheckCircle2}>{t('closed.title')}</PanelHeading>

      {/* Dual-close progress */}
      <div style={{ marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--slate)', margin: '0 0 0.75rem', lineHeight: 1.6 }}>
          {t('closed.body')}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
          {[
            { party: 'creator', done: creatorDone },
            { party: 'host', done: hostDone },
          ].map(({ party, done }) => {
            const rev = reviewByRole(party);
            return (
              <button
                key={party}
                onClick={() => openRating(party)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                  padding: '0.75rem', borderRadius: '0.875rem', cursor: done ? 'default' : 'pointer',
                  background: done ? 'rgba(74,155,127,0.15)' : ratingParty === party ? 'rgba(212,168,67,0.1)' : 'rgba(255,255,255,0.75)',
                  border: `1.5px solid ${done ? '#4A9B7F' : ratingParty === party ? '#D4A843' : 'rgba(25,37,36,0.12)'}`,
                  fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600,
                  color: done ? '#4A9B7F' : 'var(--slate)',
                  transition: 'all 150ms',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {done ? <CheckIcon /> : <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--stone)', display: 'inline-block' }} />}
                  {t(`closed.parties.${party}`)}: {done ? t('closed.confirmed') : t('closed.rateClose')}
                </span>
                {rev && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#D4A843' }}>
                    {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {ratingParty && (
          <div style={{ marginBottom: '0.75rem', padding: '1rem', borderRadius: '0.875rem', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)', backdropFilter: 'blur(20px) saturate(140%)', WebkitBackdropFilter: 'blur(20px) saturate(140%)' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)', margin: '0 0 0.25rem', fontFamily: 'var(--font-display)' }}>
              {ratingParty === 'creator'
                ? (collab.host_name ? t('closed.rateHost', { name: collab.host_name }) : t('closed.rateHostPlain'))
                : (collab.creator_name ? t('closed.rateCreator', { name: collab.creator_name }) : t('closed.rateCreatorPlain'))}
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0 0 0.75rem' }}>
              {t('closed.howWasIt')}
            </p>
            <div style={{ marginBottom: '0.75rem' }}>
              <StarRow value={stars} onChange={setStars} />
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder={t('closed.commentPlaceholder')}
              rows={2}
              style={{ ...INPUT_S, resize: 'vertical', marginBottom: '0.75rem' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                className="btn-primary"
                disabled={stars < 1 || submittingReview}
                onClick={handleSubmitReview}
                style={{ fontSize: '0.8rem', padding: '0.6rem 1.25rem', opacity: stars < 1 || submittingReview ? 0.5 : 1, cursor: stars < 1 ? 'not-allowed' : 'pointer' }}
              >
                {submittingReview ? t('closed.submitting') : t('closed.submitRating')}
              </button>
              <button
                onClick={() => setRatingParty(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: 'var(--sage)', fontFamily: 'var(--font-body)' }}
              >
                {t('closed.cancel')}
              </button>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(208,213,206,0.4)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '3px', background: 'var(--slate)', transition: 'width 300ms', width: `${(closedCount / 2) * 100}%` }} />
          </div>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--sage)' }}>{closedCount}/2</span>
        </div>
      </div>

      {/* Content performance — shown once creator has confirmed */}
      {creatorDone && (
        <div style={{ marginBottom: '1.25rem', padding: '1rem', borderRadius: '0.875rem', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(25,37,36,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <BarChart3 size={14} color="var(--slate)" />
            <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink)', margin: 0 }}>{t('closed.sharePerformance')}</h5>
          </div>

          {metricsSubmitted ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <CheckIcon />
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#4A9B7F', margin: 0 }}>
                  <Trans i18nKey="closed.metricsSaved" t={t} values={{ er: computedER }}>Metrics saved! Collabnb Content ER: <strong>{{ er: computedER }}%</strong></Trans>
                </p>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--stone)', margin: 0, fontStyle: 'italic' }}>
                {t('closed.instaSoon')}
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate)', margin: '0 0 0.875rem', lineHeight: 1.5 }}>
                {t('closed.howDidPost')}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--slate)', margin: '0 0 0.875rem', lineHeight: 1.5, background: 'rgba(209,235,219,0.3)', borderRadius: '0.75rem', padding: '0.625rem 0.75rem' }}>
                <Trans i18nKey="closed.tagUs" t={t}><strong>Tag us when you post</strong> — it helps hosts spot your work on the platform.<br />Instagram: tag <strong>@collabnb</strong> in the caption and add us as a collaborator.<br />TikTok: tag <strong>@collabnbofficial</strong> in the caption.</Trans>
              </p>
              <div style={{ marginBottom: '0.625rem' }}>
                <label style={LABEL_S}>{t('closed.postUrl')}</label>
                <input type="url" placeholder={t('closed.postUrlPlaceholder')} value={form.post_url} onChange={setField('post_url')} style={INPUT_S} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.625rem', marginBottom: '0.625rem' }}>
                <div>
                  <label style={LABEL_S}>{t('closed.views')}</label>
                  <input type="number" min="0" placeholder="0" value={form.views} onChange={setField('views')} style={INPUT_S} />
                </div>
                <div>
                  <label style={LABEL_S}>{t('closed.likes')}</label>
                  <input type="number" min="0" placeholder="0" value={form.likes} onChange={setField('likes')} style={INPUT_S} />
                </div>
                <div>
                  <label style={LABEL_S}>{t('closed.comments')}</label>
                  <input type="number" min="0" placeholder="0" value={form.comments} onChange={setField('comments')} style={INPUT_S} />
                </div>
                <div>
                  <label style={LABEL_S}>{t('closed.saves')}</label>
                  <input type="number" min="0" placeholder="0" value={form.saves} onChange={setField('saves')} style={INPUT_S} />
                </div>
              </div>
              <button
                onClick={handleSubmitMetrics}
                disabled={!canSubmit}
                style={{
                  width: '100%', padding: '0.6rem', borderRadius: '0.75rem', cursor: canSubmit ? 'pointer' : 'not-allowed',
                  background: canSubmit ? 'var(--ink)' : 'rgba(25,37,36,0.25)',
                  color: '#fff', fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600,
                  border: 'none', transition: 'background 150ms',
                }}
              >
                {t('closed.savePerformance')}
              </button>
              <p style={{ fontSize: '0.68rem', color: 'var(--stone)', margin: '0.5rem 0 0', fontStyle: 'italic', textAlign: 'center' }}>
                {t('closed.instaSoon')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Payment placeholder */}
      <div style={{
        padding: '1rem', borderRadius: '0.875rem',
        background: 'rgba(209,235,219,0.25)', border: '1px dashed rgba(60,87,89,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <DollarSmall />
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate)', margin: 0 }}>{t('closed.payments')}</p>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: 0, lineHeight: 1.5 }}>
          {t('closed.paymentsBody')}
        </p>
      </div>

      {bothDone && (
        <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '0.875rem', background: 'rgba(74,155,127,0.1)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4A9B7F', margin: '0 0 0.75rem' }}>
            {t('closed.bothConfirmed')}
          </p>
          <a
            href={TRUSTPILOT_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.55rem 1.1rem', borderRadius: '999px', textDecoration: 'none',
              background: '#00B67A', color: '#fff', fontSize: '0.78rem', fontWeight: 700,
              fontFamily: 'var(--font-body)',
            }}
          >
            {t('closed.trustpilot')}
          </a>
          <p style={{ fontSize: '0.68rem', color: 'var(--sage)', margin: '0.6rem 0 0', fontStyle: 'italic' }}>
            {t('closed.trustpilotEmail')}
          </p>
        </div>
      )}
    </div>
  );
}

function ArchivedPanel({ collab }) {
  const { t } = useTranslation('collabDetail');
  return (
    <div style={{ background: 'rgba(255,255,255,0.65)', borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.8)' }}>
      <PanelHeading icon={Archive}>{t('archived.title')}</PanelHeading>
      <p style={{ color: 'var(--slate)', fontSize: '0.85rem', margin: 0, lineHeight: 1.6 }}>
        {t('archived.body')}
      </p>
      {collab.payment && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(74,155,127,0.1)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4A9B7F', margin: 0 }}>{t('archived.payment', { amount: collab.payment })}</p>
        </div>
      )}
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <a
          href={TRUSTPILOT_REVIEW_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.5rem 1rem', borderRadius: '999px', textDecoration: 'none',
            background: '#00B67A', color: '#fff', fontSize: '0.75rem', fontWeight: 700,
            fontFamily: 'var(--font-body)',
          }}
        >
          {t('archived.trustpilot')}
        </a>
      </div>
    </div>
  );
}

/* ─── Main CollabDetail component ─────────────────────────────────────────── */
export default function CollabDetail({ collab, onClose }) {
  const { t } = useTranslation('collabDetail');
  const navigate = useNavigate();
  const { advanceStage, updateStageData, toggleCloseCollab, removeCollab, contracts } = useCollabs();
  const { profile } = useAuth();
  const [driveUrl, setDriveUrl] = useState(collab.drive_url || '');
  const [confirmTerminate, setConfirmTerminate] = useState(false);

  // Ending an accepted collab takes both sides — read the pending request (if
  // any) straight from Convex, which is where the host writes it.
  const convexCollab = useQuery(
    api.collaborations.getById,
    collab.convex_id ? { id: String(collab.convex_id) } : 'skip',
  );
  const terminationRequestedBy = convexCollab?.termination_requested_by || null;
  const requestTerminationCvx = useMutation(api.collaborations.requestTermination);
  const cancelTerminationCvx  = useMutation(api.collaborations.cancelTermination);
  const confirmTerminationCvx = useMutation(api.collaborations.confirmTermination);
  const isAcceptedCollab = collab.current_stage && collab.current_stage !== 'pending';
  const listing = SAMPLE_LISTINGS.find((l) => l.id === collab.listing_id);
  const host = SAMPLE_HOST;
  const hostProfile = useQuery(api.profiles.getByUsername, { username: host.username });
  const contract = collab.contract_id
    ? contracts.find((c) => c.id === collab.contract_id)
    : null;

  // Auto-generated contract name — property + the two parties; edit any of
  // those three fields on the contract itself and this updates to match.
  const creatorDisplayName = profile?.full_name || t('contractSummary.creatorLabel');
  const hostDisplayName = collab.host_name || t('contractSummary.hostLabel');
  const contractName = collab.property_name
    ? `${collab.property_name} — ${creatorDisplayName} × ${hostDisplayName}`
    : `${creatorDisplayName} × ${hostDisplayName}`;

  // Stage viewing & demo state
  const isDemo = collab.is_demo;
  const [viewingStageKey, setViewingStageKey] = useState(null);
  const isViewingPast = !isDemo && viewingStageKey && viewingStageKey !== collab.current_stage;
  const effectiveStageKey = viewingStageKey || collab.current_stage;
  const stageKeys = STAGES.map((s) => s.key);

  // Demo auto-advance
  const [demoPlaying, setDemoPlaying] = useState(isDemo);
  const [demoCardKey, setDemoCardKey] = useState(() => isDemo ? collab.current_stage : null);
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
    const nextKey = key === viewingStageKey ? null : key;
    setViewingStageKey(nextKey);
    if (nextKey) setDemoCardKey(nextKey); // update the demo card when clicking through stages while paused
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
      pending:         <PendingPanel collab={collab} advanceStage={advanceStage} onRemove={() => { removeCollab(collab); onClose(); }} />,
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
                  ? t('dueIn', { count: collab.days_left })
                  : collab.days_left === 0
                    ? t('dueToday')
                    : t('overdue', { count: Math.abs(collab.days_left) })}
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
                title={demoPlaying ? t('pauseAuto') : t('resumeAuto')}
              >
                {demoPlaying ? '⏸' : '▶'}
              </button>
            )}
            {!isDemo && (
              <button
                onClick={() => setConfirmTerminate(true)}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(192,57,43,0.08)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#c0392b', flexShrink: 0,
                }}
                title={t('terminate.title')}
              >
                <Trash2 size={15} />
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
        {confirmTerminate && (
          <WithdrawConfirmModal
            titleKey="terminate.title"
            bodyKey={isAcceptedCollab && collab.convex_id ? 'terminate.bodyAccepted' : 'terminate.body'}
            confirmKey={isAcceptedCollab && collab.convex_id ? 'terminate.requestConfirm' : 'terminate.confirm'}
            cancelKey="terminate.cancel"
            onConfirm={() => {
              // An accepted collab can't be ended unilaterally — ask the host
              // and leave it in place until they confirm.
              if (isAcceptedCollab && collab.convex_id) {
                requestTerminationCvx({ id: String(collab.convex_id) }).catch(() => {});
                setConfirmTerminate(false);
                return;
              }
              removeCollab(collab);
              onClose();
            }}
            onCancel={() => setConfirmTerminate(false)}
          />
        )}

        {/* Pending termination — either side may have asked */}
        {terminationRequestedBy && (
          <div style={{
            margin: '0 1.5rem 0.75rem', padding: '0.75rem 1rem', borderRadius: '0.875rem',
            background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)',
            display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
          }}>
            <Trash2 size={15} color="#c0392b" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 180, fontSize: '0.8rem', fontWeight: 600, color: '#c0392b', lineHeight: 1.45 }}>
              {terminationRequestedBy === 'host' ? t('terminate.hostRequested') : t('terminate.awaitingHost')}
            </span>
            {terminationRequestedBy === 'host' ? (
              <button
                onClick={() => { confirmTerminationCvx({ id: String(collab.convex_id) }).catch(() => {}); }}
                style={{ padding: '0.45rem 0.9rem', borderRadius: 9999, border: 'none', background: '#c0392b', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {t('terminate.agree')}
              </button>
            ) : (
              <button
                onClick={() => { cancelTerminationCvx({ id: String(collab.convex_id) }).catch(() => {}); }}
                style={{ padding: '0.45rem 0.9rem', borderRadius: 9999, border: '1.5px solid rgba(192,57,43,0.35)', background: 'transparent', color: '#c0392b', fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {t('terminate.withdraw')}
              </button>
            )}
          </div>
        )}

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
                <div style={{
                  width: 34, height: 34, borderRadius: '0.65rem', flexShrink: 0,
                  background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {(() => { const StageIcon = DEMO_STAGE_CARDS[demoCardKey].icon; return <StageIcon size={17} color="var(--slate)" />; })()}
                </div>
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
                {t('pastStageNotice')}
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
              {t('listingDetails')}
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
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--sage)', margin: '0 0 0.75rem' }}>
              <PinSmall /> {collab.location}
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
              <div
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/profile/${host.username}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/profile/${host.username}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem', borderRadius: '0.875rem',
                  background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)',
                  cursor: 'pointer', transition: 'background 150ms',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.85)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden',
                  background: 'var(--mint)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--slate)', fontSize: '0.8rem', fontWeight: 700,
                }}>
                  {(hostProfile?.avatar_url || host.avatar_fallback) ? (
                    <img src={hostProfile?.avatar_url || host.avatar_fallback} alt={host.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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
              onClick={() => window.open(collab.listing_id ? `/listing/${collab.listing_id}` : '/explore', '_blank', 'noopener,noreferrer')}
            >
              <GlobeSmall /> {t('viewFullListing')}
            </button>
          </div>

          {/* Right: Contract Summary (active collabs only) */}
          {collab.is_active && (
          <div style={{ flex: '1 1 50%', padding: '1.5rem', minWidth: 0 }}>
            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--sage)', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {contractName}
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
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={t('contractSummary.creatorAlt')} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 700 }}>
                      {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'BV'}
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{t('contractSummary.creatorLabel')}</p>
              </div>
              <span style={{ color: 'var(--stone)', fontSize: '0.8rem' }}>×</span>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden',
                  background: 'linear-gradient(135deg, #959D90, #D0D5CE)', margin: '0 auto 0.25rem',
                }}>
                  {(hostProfile?.avatar_url || host.avatar_fallback) ? (
                    <img src={hostProfile?.avatar_url || host.avatar_fallback} alt={t('contractSummary.hostAlt')} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 700 }}>
                      {collab.host_name?.charAt(0) || 'H'}
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{t('contractSummary.hostLabel')}</p>
              </div>
            </div>

            {/* Agreement title */}
            <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', textAlign: 'center', margin: '0 0 0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(25,37,36,0.06)' }}>
              {t('contractSummary.agreement')}
            </h5>

            {/* Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {[
                { key: 'location', value: collab.location },
                { key: 'dates', value: collab.dates },
                { key: 'property', value: collab.property_name },
                { key: 'deliverables', value: collab.deliverables },
                { key: 'payment', value: collab.payment || '—' },
                { key: 'usage', value: t('contractSummary.socialMediaOnly') },
              ].map(({ key, value }) => (
                <div key={key} style={{ padding: '0.4rem 0.5rem', background: 'rgba(209,235,219,0.15)', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--sage)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t(`contractSummary.${key}`)}</p>
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
                <Trans i18nKey="contractSummary.body" t={t} values={{
                  hostName: collab.host_name || t('contractSummary.theHost'),
                  creatorName: creatorDisplayName,
                  propertyName: collab.property_name,
                  location: collab.location,
                  dates: collab.dates,
                  deliverables: collab.deliverables,
                  payment: collab.payment || t('contractSummary.stayComp'),
                }}>This collaboration agreement is between <strong>{{ hostName: collab.host_name || t('contractSummary.theHost') }}</strong> and <strong>{{ creatorName: creatorDisplayName }}</strong> regarding <strong>{{ propertyName: collab.property_name }}</strong> located in <strong>{{ location: collab.location }}</strong> from <strong>{{ dates: collab.dates }}</strong>. The creator agrees to deliver <strong>{{ deliverables: collab.deliverables }}</strong> as compensation for <strong>{{ payment: collab.payment || t('contractSummary.stayComp') }}</strong>.</Trans>
              </p>
            </div>

            {/* Signature lines */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ flex: 1, padding: '0.5rem 0.625rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.5)' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--sage)', margin: '0 0 0.2rem', textTransform: 'uppercase' }}>{t('contractSummary.creatorSignature')}</p>
                <p style={{ fontFamily: "'Pacifico', cursive", fontSize: '0.85rem', color: 'var(--ink)', margin: 0 }}>{creatorDisplayName}</p>
              </div>
              <div style={{ flex: 1, padding: '0.5rem 0.625rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.5)' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--sage)', margin: '0 0 0.2rem', textTransform: 'uppercase' }}>{t('contractSummary.hostSignature')}</p>
                {contract?.host_signed ? (
                  <p style={{ fontFamily: "'Pacifico', cursive", fontSize: '0.85rem', color: 'var(--ink)', margin: 0 }}>{collab.host_name}</p>
                ) : (
                  <p style={{ fontSize: '0.75rem', color: 'var(--stone)', fontStyle: 'italic', margin: 0 }}>{t('contractSummary.pending')}</p>
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
                    creator: creatorDisplayName,
                    host: collab.host_name,
                    property_name: collab.property_name,
                    location: collab.location,
                    dates: collab.dates,
                    deliverables: collab.deliverables,
                  } } })}
                >
                  {contract ? t('contractSummary.editContract') : t('contractSummary.createContract')}
                </button>
              )}
              <button
                className="btn-glass"
                style={{ flex: contract?.host_signed ? 1 : 'initial', fontSize: '0.75rem', padding: '0.5rem 0.75rem' }}
                onClick={() => navigate('/contract')}
              >
                {t('contractSummary.viewAll')}
              </button>
            </div>
          </div>)}
        </div>)}
        {/* ── Demo listing-bypass message ──────────────────────────────── */}
        {isDemo && (
          <div style={{ padding: '1.5rem 1.5rem 0.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--sage)', fontStyle: 'italic' }}>
              {t('demoBypass')}
            </p>
          </div>
        )}

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div style={{ padding: '0.75rem 1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.65rem', color: 'var(--stone)', margin: 0 }}>
            {t('footer')}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
