import { X } from 'lucide-react';

export default function DashboardModal({ title, onClose, children, maxWidth = 480 }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(25,37,36,0.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card"
        style={{ width: '100%', maxWidth, maxHeight: '85vh', overflowY: 'auto', padding: '1.75rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.15rem', color: 'var(--ink)', margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(25,37,36,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)', flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
