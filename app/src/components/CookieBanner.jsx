import { useState } from 'react';
import { useTranslation } from 'react-i18next';

// Compact first-party cookie notice, bottom-left, shown once per browser.
// "Review" expands more detail in-place; tracking runs by default (not a gate).
const ACK_KEY = 'cnb_cookie_ack';

const CookieIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5z" />
    <circle cx="8.5" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="13" cy="14.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="15" r=".8" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10.5" r=".8" fill="currentColor" stroke="none" />
  </svg>
);

export default function CookieBanner() {
  const { t } = useTranslation('cookieBanner');
  const [show, setShow] = useState(() => {
    try { return localStorage.getItem(ACK_KEY) !== '1'; } catch { return false; }
  });
  const [leaving, setLeaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!show) return null;

  const dismiss = () => {
    try { localStorage.setItem(ACK_KEY, '1'); } catch { /* noop */ }
    setLeaving(true);
    setTimeout(() => setShow(false), 300);
  };

  return (
    <div
      role="dialog"
      aria-label={t('ariaLabel')}
      style={{
        position: 'fixed', left: '0.85rem', bottom: '0.85rem', zIndex: 9998, maxWidth: 258,
        background: '#F7F5F2', border: '1px solid rgba(25,37,36,0.1)', borderRadius: 12,
        boxShadow: '0 6px 22px rgba(25,37,36,0.13)', padding: '11px 13px',
        fontFamily: 'Satoshi, -apple-system, system-ui, sans-serif', color: '#192524',
        opacity: leaving ? 0 : 1, transform: leaving ? 'translateY(12px)' : 'none',
        transition: 'opacity .3s, transform .3s',
        animation: leaving ? 'none' : 'cnbCookieIn .5s cubic-bezier(.16,1,.3,1) both',
      }}
    >
      <style>{`@keyframes cnbCookieIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ flex: '0 0 auto', color: '#3C5759', display: 'flex' }}><CookieIcon /></span>
        <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
          {t('heading')}
        </h4>
      </div>

      <p style={{ margin: '5px 0 0', fontSize: '0.72rem', lineHeight: 1.4, color: '#3C5759' }}>
        {t('body')}
      </p>

      {expanded && (
        <p style={{ margin: '7px 0 0', fontSize: '0.7rem', lineHeight: 1.45, color: '#3C5759',
          borderTop: '1px solid rgba(25,37,36,0.08)', paddingTop: 7 }}>
          {t('details.pre')}<strong>{t('details.strong')}</strong>{t('details.post')}{' '}
          <a href="/faq.html#cookies" target="_blank" rel="noreferrer"
            style={{ color: '#192524', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2 }}>
            {t('details.faqLink')}
          </a>.
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 9 }}>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          style={{ border: 0, background: 'none', cursor: 'pointer', font: 'inherit',
            fontSize: '0.72rem', fontWeight: 600, color: '#3C5759', padding: 0, textDecoration: 'underline', textUnderlineOffset: 2 }}
        >
          {expanded ? t('less') : t('review')}
        </button>
        <button
          type="button"
          onClick={dismiss}
          style={{ border: 0, cursor: 'pointer', font: 'inherit', fontSize: '0.72rem', fontWeight: 700,
            padding: '5px 14px', borderRadius: 99, background: '#192524', color: '#F7F5F2' }}
        >
          {t('gotIt')}
        </button>
      </div>
    </div>
  );
}
