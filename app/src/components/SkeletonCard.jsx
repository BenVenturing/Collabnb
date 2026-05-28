let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.textContent = `@keyframes skeleton-shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }`;
  document.head.appendChild(s);
}

const SHIMMER = {
  background: 'linear-gradient(90deg, rgba(25,37,36,0.05) 0%, rgba(25,37,36,0.09) 40%, rgba(25,37,36,0.05) 80%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.6s ease-in-out infinite',
};

function Block({ w = '100%', h = 12, r = 6, style }) {
  return <div style={{ ...SHIMMER, width: w, height: h, borderRadius: r, ...style }} />;
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
          <Block w={52} h={52} r={9999} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Block w="65%" h={14} r={6} />
            <Block w="45%" h={11} r={6} />
            <Block w="32%" h={20} r={9999} />
          </div>
        </div>
        <Block h={11} r={6} style={{ marginBottom: 5 }} />
        <Block w="88%" h={11} r={6} style={{ marginBottom: 5 }} />
        <Block w="70%" h={11} r={6} style={{ marginBottom: 14 }} />
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1,
          background: 'rgba(25,37,36,0.05)', borderRadius: '0.625rem',
          overflow: 'hidden', marginBottom: 14,
        }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ padding: '9px 0', textAlign: 'center', background: 'rgba(255,255,255,0.6)' }}>
              <Block w="45%" h={14} r={4} style={{ margin: '0 auto 3px' }} />
              <Block w="55%" h={9} r={4} style={{ margin: '0 auto' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
          <Block w={54} h={22} r={9999} />
          <Block w={64} h={22} r={9999} />
          <Block w={48} h={22} r={9999} />
        </div>
        <Block h={38} r={9999} />
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
        <Block w="100%" h={176} r={0} />
        <div style={{ padding: '0.875rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Block w="75%" h={14} r={6} />
          <Block w="45%" h={10} r={6} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Block w="55%" h={12} r={6} />
            <Block w={52} h={24} r={9999} />
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1,
            background: 'rgba(25,37,36,0.04)', borderRadius: '0.625rem', overflow: 'hidden',
          }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ padding: '8px 0', textAlign: 'center' }}>
                <Block w="40%" h={14} r={4} style={{ margin: '0 auto 3px' }} />
                <Block w="55%" h={9} r={4} style={{ margin: '0 auto' }} />
              </div>
            ))}
          </div>
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
      <Block w="100%" h={176} r={0} />
      <div style={{ padding: '0.875rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Block w="80%" h={14} r={6} />
        <Block w="50%" h={10} r={6} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Block w={110} h={12} r={6} />
            <Block w={80} h={9} r={6} />
          </div>
          <Block w={55} h={22} r={9999} />
        </div>
      </div>
    </div>
  );
}
