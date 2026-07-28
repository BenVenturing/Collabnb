import { useState } from 'react';

// Small first-party cookie notice, bottom-left, shown once per browser.
// Matches the platform surface (bone card, ink text, line-icon cookie).
// Tracking runs by default — this is an informational notice, not a gate.
const ACK_KEY = 'cnb_cookie_ack';

const CookieIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5z" />
    <circle cx="8.5" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="13" cy="14.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="15" r=".8" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10.5" r=".8" fill="currentColor" stroke="none" />
  </svg>
);

export default function CookieBanner() {
  const [show, setShow] = useState(() => {
    try { return localStorage.getItem(ACK_KEY) !== '1'; } catch { return false; }
  });
  const [leaving, setLeaving] = useState(false);

  if (!show) return null;

  const dismiss = () => {
    try { localStorage.setItem(ACK_KEY, '1'); } catch { /* noop */ }
    setLeaving(true);
    setTimeout(() => setShow(false), 300);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      style={{
        position: 'fixed', left: '1rem', bottom: '1rem', zIndex: 9998, maxWidth: 320,
        background: '#F7F5F2', border: '1px solid rgba(25,37,36,0.1)', borderRadius: 14,
        boxShadow: '0 8px 30px rgba(25,37,36,0.14)', padding: '14px 16px',
        fontFamily: 'Satoshi, -apple-system, system-ui, sans-serif', color: '#192524',
        opacity: leaving ? 0 : 1, transform: leaving ? 'translateY(14px)' : 'none',
        transition: 'opacity .3s, transform .3s',
        animation: leaving ? 'none' : 'cnbCookieIn .5s cubic-bezier(.16,1,.3,1) both',
      }}
    >
      <style>{`@keyframes cnbCookieIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ flex: '0 0 auto', color: '#3C5759', marginTop: 1 }}><CookieIcon /></span>
        <div>
          <h4 style={{ margin: '0 0 3px', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
            We use cookies
          </h4>
          <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.45, color: '#3C5759' }}>
            We use first-party cookies to understand how creators and hosts use Collabnb so we can
            make it better. No ads, no selling your data.{' '}
            <a href="/faq.html#cookies" target="_blank" rel="noreferrer"
              style={{ color: '#192524', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2 }}>
              Learn more
            </a>.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 11 }}>
        <button
          type="button"
          onClick={dismiss}
          style={{
            border: 0, cursor: 'pointer', font: 'inherit', fontSize: '0.78rem', fontWeight: 700,
            padding: '7px 16px', borderRadius: 99, background: '#192524', color: '#F7F5F2',
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
