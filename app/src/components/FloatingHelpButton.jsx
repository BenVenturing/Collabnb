import { useState } from 'react';
import FAQModal from './FAQModal';

export default function FloatingHelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Help & FAQ"
        title="Help & FAQ"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 200,
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.75)',
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(25,37,36,0.04), 0 4px 20px rgba(25,37,36,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform 200ms cubic-bezier(0.16,1,0.3,1), box-shadow 200ms',
          fontFamily: 'var(--font-display)',
          fontSize: '1.1rem',
          fontWeight: 800,
          color: 'var(--ink)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow =
            'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(25,37,36,0.04), 0 6px 28px rgba(25,37,36,0.18), 0 0 0 6px rgba(209,235,219,0.35)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow =
            'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(25,37,36,0.04), 0 4px 20px rgba(25,37,36,0.12)';
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
      >
        ?
      </button>

      <FAQModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
