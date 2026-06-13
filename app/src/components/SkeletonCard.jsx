let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.textContent = `@keyframes skeleton-pulse {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 1.0; }
  }`;
  document.head.appendChild(s);
}

const PULSE = {
  background: '#D0D5CE',
  animation: 'skeleton-pulse 1.8s ease-in-out infinite',
};

export function Block({ w = '100%', h = 12, r = 6, style, delay = 0 }) {
  return (
    <div style={{
      ...PULSE,
      width: w, height: h, borderRadius: r,
      animationDelay: `${delay}ms`,
      ...style,
    }} />
  );
}

export default function SkeletonCard({ variant = 'listing' }) {
  ensureStyles();

  if (variant === 'creator') {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        border: '1.5px solid rgba(255,255,255,0.75)',
        borderRadius: '1.25rem', padding: '20px',
      }}>
        <div style={{ display: 'flex', gap: 14, marginBottom: 14, alignItems: 'flex-start' }}>
          <Block w={52} h={52} r={9999} delay={0} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Block w="65%" h={14} r={6} delay={60} />
            <Block w="45%" h={11} r={6} delay={120} />
            <Block w="32%" h={20} r={9999} delay={180} />
          </div>
        </div>
        <Block h={11} r={6} delay={80} style={{ marginBottom: 5 }} />
        <Block w="88%" h={11} r={6} delay={140} style={{ marginBottom: 5 }} />
        <Block w="70%" h={11} r={6} delay={200} style={{ marginBottom: 14 }} />
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1,
          background: 'rgba(25,37,36,0.05)', borderRadius: '0.625rem',
          overflow: 'hidden', marginBottom: 14,
        }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ padding: '9px 0', textAlign: 'center', background: 'rgba(255,255,255,0.6)' }}>
              <Block w="45%" h={14} r={4} delay={i * 60} style={{ margin: '0 auto 3px' }} />
              <Block w="55%" h={9} r={4} delay={i * 60 + 30} style={{ margin: '0 auto' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
          <Block w={54} h={22} r={9999} delay={0} />
          <Block w={64} h={22} r={9999} delay={60} />
          <Block w={48} h={22} r={9999} delay={120} />
        </div>
        <Block h={38} r={9999} delay={100} />
      </div>
    );
  }

  if (variant === 'host-listing') {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.75)',
        borderRadius: '1.25rem', overflow: 'hidden',
      }}>
        <Block w="100%" h={176} r={0} delay={0} />
        <div style={{ padding: '0.875rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Block w="75%" h={14} r={6} delay={60} />
          <Block w="45%" h={10} r={6} delay={120} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Block w="55%" h={12} r={6} delay={80} />
            <Block w={52} h={24} r={9999} delay={140} />
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1,
            background: 'rgba(25,37,36,0.04)', borderRadius: '0.625rem', overflow: 'hidden',
          }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ padding: '8px 0', textAlign: 'center' }}>
                <Block w="40%" h={14} r={4} delay={i * 50} style={{ margin: '0 auto 3px' }} />
                <Block w="55%" h={9} r={4} delay={i * 50 + 25} style={{ margin: '0 auto' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'proposal') {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.8)',
        borderRadius: '1.25rem', padding: '18px 20px',
        display: 'flex', gap: 14, alignItems: 'flex-start',
      }}>
        <Block w={42} h={42} r={9999} delay={0} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <Block w="40%" h={13} r={6} delay={40} />
            <Block w={80} h={22} r={9999} delay={100} />
          </div>
          <Block w="55%" h={10} r={6} delay={80} />
          <Block w="85%" h={9} r={5} delay={120} />
          <Block w="65%" h={9} r={5} delay={160} />
        </div>
      </div>
    );
  }

  if (variant === 'stat') {
    return (
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Block w={15} h={15} r={4} delay={0} />
        <Block w="55%" h={28} r={6} delay={60} />
        <Block w="70%" h={10} r={5} delay={120} />
      </div>
    );
  }

  if (variant === 'activity') {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.8)',
        borderRadius: '1rem', padding: '14px 16px',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <Block w={32} h={32} r={8} delay={0} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Block w="60%" h={12} r={5} delay={50} />
          <Block w="80%" h={9} r={5} delay={100} />
        </div>
        <Block w={48} h={20} r={9999} delay={80} />
      </div>
    );
  }

  if (variant === 'message') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Block w="55%" h={36} r="12px 12px 12px 2px" delay={0} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Block w="45%" h={28} r="12px 12px 2px 12px" delay={80} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Block w="62%" h={44} r="12px 12px 12px 2px" delay={160} />
        </div>
      </div>
    );
  }

  if (variant === 'thread') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        borderBottom: '1px solid rgba(25,37,36,0.07)',
      }}>
        <Block w={44} h={44} r={9999} delay={0} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Block w="55%" h={12} r={5} delay={40} />
            <Block w={32} h={10} r={4} delay={60} />
          </div>
          <Block w="35%" h={9} r={4} delay={80} />
          <Block w="75%" h={9} r={4} delay={120} />
        </div>
      </div>
    );
  }

  // Default: listing card (Explore)
  return (
    <div style={{
      width: 260, maxWidth: '100%',
      background: 'rgba(255,255,255,0.6)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.75)',
      borderRadius: '1rem', overflow: 'hidden',
    }}>
      <Block w="100%" h={176} r={0} delay={0} />
      <div style={{ padding: '0.875rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Block w="80%" h={14} r={6} delay={60} />
        <Block w="50%" h={10} r={6} delay={120} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Block w={110} h={12} r={6} delay={80} />
            <Block w={80} h={9} r={6} delay={140} />
          </div>
          <Block w={55} h={22} r={9999} delay={100} />
        </div>
      </div>
    </div>
  );
}
