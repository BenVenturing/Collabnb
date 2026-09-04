import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import undertowSrc from '../assets/audio/undertow.mp3';
import risingDawnSrc from '../assets/audio/rising-dawn.mp3';
import sunAndCloudsSrc from '../assets/audio/sun-and-clouds.mp3';
import sunshineDaySrc from '../assets/audio/sunshine-day.mp3';
import islandBreezeSrc from '../assets/audio/island-breeze.mp3';
import summerCarRideSrc from '../assets/audio/summer-car-ride.mp3';

const MUTE_KEY = 'collabnb_music_muted';
const DISMISS_KEY = 'collabnb_music_dismissed';
const TRACK_KEY = 'collabnb_music_track';

// Royalty-free tracks (free-stock-music.com — free to use with attribution;
// several are also formally CC BY) — not the Instagram references, which are
// licensed to Meta only and can't be rehosted here. Credit lines below satisfy
// the attribution requirement. Same ids/order as the marketing-site widget in
// public/collabnb-analytics.js — keep both lists in sync.
const TRACKS = [
  { id: 'undertow', title: 'Undertow', artist: 'Scott Buckley', mood: 'calm', src: undertowSrc, creditUrl: 'https://soundcloud.com/scottbuckley' },
  { id: 'rising-dawn', title: 'Rising Dawn', artist: 'Ethereal 88', mood: 'calm', src: risingDawnSrc, creditUrl: 'https://ethereal88.bandcamp.com' },
  { id: 'sun-and-clouds', title: 'Sun And Clouds', artist: '| e s c p', mood: 'calm', src: sunAndCloudsSrc, creditUrl: 'https://www.escp.space' },
  { id: 'sunshine-day', title: 'Sunshine Day', artist: 'Mixaund', mood: 'upbeat', src: sunshineDaySrc, creditUrl: 'https://mixaund.bandcamp.com' },
  { id: 'island-breeze', title: 'Island Breeze', artist: 'Surf House Productions', mood: 'upbeat', src: islandBreezeSrc, creditUrl: 'https://surf-house-productions.bandcamp.com' },
  { id: 'summer-car-ride', title: 'Summer Car Ride', artist: '| e s c p', mood: 'upbeat', src: summerCarRideSrc, creditUrl: 'https://www.escp.space' },
];

function SpeakerIcon({ muted }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      {muted
        ? <path d="M17 9l5 5M22 9l-5 5" />
        : <path d="M17.5 8.5a5 5 0 0 1 0 7M20.5 6a9 9 0 0 1 0 12" />}
    </svg>
  );
}

function NextTrackIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4l10 8-10 8V4z" />
      <path d="M19 5v14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function EqBars({ animate }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '2px', height: '10px' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: '2.5px', borderRadius: '2px', background: 'currentColor',
          height: animate ? undefined : '3px',
          animation: animate ? `cnb-mp-eq${i} ${0.75 + i * 0.15}s ease-in-out infinite` : 'none',
        }} />
      ))}
    </span>
  );
}

export default function BackgroundMusicPlayer() {
  const { t } = useTranslation('layout');
  const audioRef = useRef(null);
  const rootRef = useRef(null);
  const collapseTimer = useRef(null);
  const attempted = useRef(false);

  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
  const [trackIndex, setTrackIndex] = useState(() => {
    const saved = parseInt(localStorage.getItem(TRACK_KEY), 10);
    return Number.isInteger(saved) && saved >= 0 && saved < TRACKS.length ? saved : 0;
  });
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_KEY) === '1');
  const [needsGesture, setNeedsGesture] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const wasPlayingBeforeHide = useRef(false);

  const track = TRACKS[trackIndex];

  // Only make sound while this tab is actually the one you're looking at —
  // pause when you switch tabs/apps, resume where it left off when you're back.
  useEffect(() => {
    const onVisibility = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.hidden) {
        wasPlayingBeforeHide.current = !audio.paused;
        if (!audio.paused) audio.pause();
      } else if (wasPlayingBeforeHide.current) {
        audio.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Best-effort autoplay on mount: try with sound, fall back to muted
  // (browsers universally allow muted autoplay), fall back again to idle.
  useEffect(() => {
    if (dismissed || attempted.current) return;
    attempted.current = true;
    const audio = audioRef.current;
    audio.volume = 0.35;
    audio.loop = true;
    audio.src = track.src;

    const wantsSound = !muted;
    audio.muted = !wantsSound;

    audio.play().then(() => {
      setPlaying(true);
      setNeedsGesture(false);
    }).catch(() => {
      audio.muted = true;
      audio.play().then(() => {
        setPlaying(true);
        setMuted(true);
        setNeedsGesture(wantsSound); // only invite a tap if they actually wanted sound
      }).catch(() => {
        setPlaying(false);
        setNeedsGesture(true);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissed]);

  // Collapse the panel on outside click, and auto-collapse after a few seconds
  useEffect(() => {
    if (!expanded) return;
    const onClickAway = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setExpanded(false);
    };
    document.addEventListener('mousedown', onClickAway);
    collapseTimer.current = setTimeout(() => setExpanded(false), 6000);
    return () => {
      document.removeEventListener('mousedown', onClickAway);
      clearTimeout(collapseTimer.current);
    };
  }, [expanded]);

  const handleIconClick = useCallback(() => {
    const audio = audioRef.current;
    if (needsGesture) {
      audio.muted = false;
      audio.play().then(() => {
        setPlaying(true);
        setMuted(false);
        setNeedsGesture(false);
        localStorage.setItem(MUTE_KEY, '0');
      }).catch(() => {});
    } else if (!playing) {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
    setExpanded(v => !v);
  }, [needsGesture, playing]);

  const handleMuteToggle = useCallback((e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    const next = !muted;
    audio.muted = next;
    setMuted(next);
    setNeedsGesture(false);
    localStorage.setItem(MUTE_KEY, next ? '1' : '0');
    if (!next && !playing) {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [muted, playing]);

  const handleNext = useCallback((e) => {
    e.stopPropagation();
    const next = (trackIndex + 1) % TRACKS.length;
    setTrackIndex(next);
    localStorage.setItem(TRACK_KEY, String(next));
    const audio = audioRef.current;
    audio.src = TRACKS[next].src;
    audio.load();
    if (playing) audio.play().catch(() => {});
  }, [trackIndex, playing]);

  const handleDismiss = useCallback((e) => {
    e.stopPropagation();
    audioRef.current?.pause();
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, '1');
  }, []);

  if (dismissed) return null;

  const showEq = playing && !muted;

  return (
    <div ref={rootRef} style={{ position: 'fixed', bottom: '1.25rem', left: '1.25rem', zIndex: 210, fontFamily: 'var(--font-body)' }}>
      <style>{`
        @keyframes cnb-mp-eq0 { 0%,100% { height:3px } 50% { height:10px } }
        @keyframes cnb-mp-eq1 { 0%,100% { height:6px } 50% { height:2px } }
        @keyframes cnb-mp-eq2 { 0%,100% { height:4px } 50% { height:9px } }
        @keyframes cnb-mp-pulse { 0%,100% { box-shadow:0 0 0 0 rgba(25,37,36,0.14) } 50% { box-shadow:0 0 0 7px rgba(25,37,36,0) } }

        /* Liquid Glass surface: deep blur + saturation lift, a bright specular
           highlight pooled top-left, and an occasional light sweep across the
           surface — reads as refractive rather than flat frosted glass. */
        .cnb-mp-glass {
          position: relative;
          overflow: hidden;
          background-color: rgba(255,255,255,0.40);
          background-image: radial-gradient(circle at 30% 15%, rgba(255,255,255,0.95), rgba(255,255,255,0) 46%);
          backdrop-filter: blur(28px) saturate(180%) brightness(1.08);
          -webkit-backdrop-filter: blur(28px) saturate(180%) brightness(1.08);
          border: 1px solid rgba(255,255,255,0.7);
          box-shadow:
            inset 0 1.5px 0 rgba(255,255,255,0.95),
            inset 0 -1px 0 rgba(25,37,36,0.06),
            inset 0 0 0 1px rgba(255,255,255,0.10),
            0 10px 28px -10px rgba(25,37,36,0.30);
        }
        .cnb-mp-glass::before {
          content: '';
          position: absolute;
          inset: -50% -70%;
          background: linear-gradient(115deg, transparent 42%, rgba(255,255,255,0.55) 49%, rgba(255,255,255,0.05) 56%, transparent 66%);
          animation: cnb-mp-sheen 7s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes cnb-mp-sheen {
          0%   { transform: translateX(-55%); opacity: 0; }
          5%   { opacity: 0.85; }
          22%  { transform: translateX(55%); opacity: 0; }
          100% { transform: translateX(55%); opacity: 0; }
        }
        .cnb-mp-icon-btn { transition: background 150ms, transform 150ms; }
        .cnb-mp-icon-btn:hover { background: rgba(25,37,36,0.07); }
        .cnb-mp-icon-btn:active { transform: scale(0.9); }
      `}</style>

      {/* ── Expanded control pill ─────────────────────────────────────────── */}
      <div className="cnb-mp-glass" style={{
        position: 'absolute', bottom: 'calc(100% + 0.6rem)', left: 0,
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        borderRadius: '9999px',
        padding: '0.45rem 0.9rem 0.45rem 0.55rem',
        whiteSpace: 'nowrap',
        opacity: expanded ? 1 : 0,
        transform: expanded ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.96)',
        pointerEvents: expanded ? 'auto' : 'none',
        transition: 'opacity 200ms cubic-bezier(0.16,1,0.3,1), transform 200ms cubic-bezier(0.16,1,0.3,1)',
        transformOrigin: 'bottom left',
      }}>
        <a
          href={track.creditUrl} target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--ink)', textDecoration: 'none', maxWidth: '9.5rem', overflow: 'hidden', textOverflow: 'ellipsis' }}
          title={t('musicPlayer.credit', { title: track.title, artist: track.artist })}
        >
          {t('musicPlayer.credit', { title: track.title, artist: track.artist })}
        </a>

        <button onClick={handleNext} aria-label={t('musicPlayer.next')} title={t('musicPlayer.next')} className="cnb-mp-icon-btn" style={iconBtnStyle}>
          <NextTrackIcon />
        </button>
        <button onClick={handleMuteToggle} aria-label={t(muted ? 'musicPlayer.unmute' : 'musicPlayer.mute')} title={t(muted ? 'musicPlayer.unmute' : 'musicPlayer.mute')} className="cnb-mp-icon-btn" style={iconBtnStyle}>
          <SpeakerIcon muted={muted} />
        </button>
        <button onClick={handleDismiss} aria-label={t('musicPlayer.dismiss')} title={t('musicPlayer.dismiss')} className="cnb-mp-icon-btn" style={{ ...iconBtnStyle, color: 'var(--sage)' }}>
          <CloseIcon />
        </button>
      </div>

      {/* ── Collapsed icon ───────────────────────────────────────────────── */}
      <button
        onClick={handleIconClick}
        aria-label={t(playing && !muted ? 'musicPlayer.pause' : 'musicPlayer.play')}
        className="cnb-mp-glass"
        style={{
          width: '2.75rem', height: '2.75rem', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink)',
          cursor: 'pointer',
          animation: needsGesture ? 'cnb-mp-pulse 2.2s ease-in-out infinite' : 'none',
          transition: 'transform 200ms cubic-bezier(0.16,1,0.3,1), background 200ms',
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.93)'; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {showEq ? <EqBars animate /> : <SpeakerIcon muted={muted || !playing} />}
      </button>

      <audio ref={audioRef} preload="none" />
    </div>
  );
}

const iconBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '1.9rem', height: '1.9rem', borderRadius: '50%',
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--ink)', flexShrink: 0, padding: 0,
};
