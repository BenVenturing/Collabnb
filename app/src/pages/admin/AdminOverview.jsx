import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../contexts/AuthContext';

// Switch the active admin tab via the AdminDashboard event bridge.
// `view` optionally selects a sub-view within the target panel (e.g. Users → pending).
function goToTab(tab, view) {
  window.dispatchEvent(new CustomEvent('collabnb-admin-tab', { detail: { tab, view } }));
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function fmt(n) {
  if (n === undefined || n === null) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export default function AdminOverview() {
  const { profile } = useAuth();
  const stats        = useQuery(api.blog.getPlatformStats);
  const unreadCount  = useQuery(api.messages.getUnreadCount);
  const unverified   = useQuery(api.profiles.getUnverified);
  const drafts       = useQuery(api.blog.getDrafts);
  const contracts    = useQuery(api.contracts.getAll);
  const prospectStats = useQuery(api.prospects.getStats);

  const firstName = (profile?.full_name || 'Ben').split(' ')[0];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const pendingVerifications = unverified?.length ?? 0;
  const pendingDrafts = drafts?.length ?? 0;
  const awaitingSignature = (contracts || []).filter(c => {
    const s = (c.status || '').toLowerCase();
    return !c.admin_dismissed && s !== 'completed' && s !== 'cancelled' && s !== 'draft' && !(c.creator_signed && c.host_signed);
  }).length;
  const failedFees = (contracts || []).filter(c => c.fee_charge_failed && !c.paid).length;
  const outreachDone = (prospectStats?.contactedToday?.creators ?? 0) + (prospectStats?.contactedToday?.hosts ?? 0);

  const attention = [
    pendingVerifications > 0 && { label: `${pendingVerifications} profile${pendingVerifications === 1 ? '' : 's'} waiting for verification`, tab: 'users', view: 'pending' },
    (unreadCount ?? 0) > 0 && { label: `${unreadCount} unread user message${unreadCount === 1 ? '' : 's'}`, tab: 'messages' },
    failedFees > 0 && { label: `${failedFees} platform fee charge${failedFees === 1 ? '' : 's'} failed and need manual payment`, tab: 'contracts' },
    awaitingSignature > 0 && { label: `${awaitingSignature} contract${awaitingSignature === 1 ? '' : 's'} awaiting signatures`, tab: 'contracts' },
    pendingDrafts > 0 && { label: `${pendingDrafts} blog draft${pendingDrafts === 1 ? '' : 's'} ready for review`, tab: 'blog' },
  ].filter(Boolean);

  const tiles = [
    { label: 'Creators',        value: fmt(stats?.creators),        tab: 'users' },
    { label: 'Hosts',           value: fmt(stats?.hosts),           tab: 'users', view: 'hosts' },
    { label: 'Active listings', value: fmt(stats?.activeListings),  tab: 'listings' },
    { label: 'Collabs',         value: fmt(stats?.approvedCollabs), tab: 'collabs' },
    { label: 'Outreach today',  value: `${outreachDone}/40`,        tab: 'discovery' },
  ];

  const pill = {
    padding: '0.55rem 1.4rem', borderRadius: 9999,
    border: '1px solid rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.12)',
    color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    transition: 'background 0.8s cubic-bezier(0.19,1,0.22,1), border-color 0.8s cubic-bezier(0.19,1,0.22,1)',
    fontFamily: 'Satoshi, sans-serif',
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: '#192524', isolation: 'isolate', minHeight: '100%' }}>
      <style>{`
        @keyframes hazyDrift1 { 0% { transform: translate(-12%, -8%) scale(1); } 50% { transform: translate(10%, 6%) scale(1.15); } 100% { transform: translate(-12%, -8%) scale(1); } }
        @keyframes hazyDrift2 { 0% { transform: translate(15%, 10%) scale(1.1); } 50% { transform: translate(-8%, -12%) scale(0.95); } 100% { transform: translate(15%, 10%) scale(1.1); } }
        @keyframes hazyDrift3 { 0% { transform: translate(0%, 14%) scale(1); } 50% { transform: translate(6%, -10%) scale(1.2); } 100% { transform: translate(0%, 14%) scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .hazy-blob { animation: none !important; }
        }
        .admin-focusable:focus-visible { outline: 2px solid #3C5759; outline-offset: 2px; }
      `}</style>

      {/* Liquid iridescent haze — now spans the whole page, not just the hero strip */}
      <div className="hazy-blob" style={{ position: 'absolute', top: '-25%', left: '-10%', width: '70%', height: '90%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(149,157,144,0.85), transparent 65%)', filter: 'blur(70px)', animation: 'hazyDrift1 26s cubic-bezier(0.19,1,0.22,1) infinite', zIndex: 0 }} />
      <div className="hazy-blob" style={{ position: 'absolute', top: '-15%', right: '-15%', width: '65%', height: '85%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,172,46,0.38), transparent 60%)', filter: 'blur(80px)', animation: 'hazyDrift2 32s cubic-bezier(0.19,1,0.22,1) infinite', zIndex: 0 }} />
      <div className="hazy-blob" style={{ position: 'absolute', bottom: '-10%', left: '20%', width: '55%', height: '70%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(209,235,219,0.5), transparent 62%)', filter: 'blur(60px)', animation: 'hazyDrift3 24s cubic-bezier(0.19,1,0.22,1) infinite', zIndex: 0 }} />

      {/* Hero content */}
      <div style={{ position: 'relative', zIndex: 1, padding: '3.5rem 2.5rem 3rem' }}>
        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 0.75rem', fontFamily: 'Satoshi, sans-serif' }}>{today}</p>
        <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 500, fontSize: 'clamp(1.9rem, 4vw, 2.9rem)', color: '#fff', margin: '0 0 1.75rem', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
        {greeting()}, {firstName}.
        </h1>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button className="admin-focusable" style={pill}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.24)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            onClick={() => goToTab('blog')}>
            New blog post
          </button>
          <button className="admin-focusable" style={pill}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.24)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            onClick={() => goToTab('discovery')}>
            Today's outreach
          </button>
          <button className="admin-focusable" style={pill}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.24)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            onClick={() => goToTab('users', 'pending')}>
            Review queue
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '1.75rem 2rem 2rem' }}>
        {/* Stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.75rem' }}>
          {tiles.map(t => (
            <button
              key={t.label}
              className="admin-focusable"
              onClick={() => goToTab(t.tab, t.view)}
              style={{
                textAlign: 'left', padding: '1rem 1.1rem', borderRadius: '1.25rem',
                background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.8)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 16px rgba(25,37,36,0.05)',
                cursor: 'pointer', transition: 'transform 0.8s cubic-bezier(0.19,1,0.22,1), box-shadow 0.8s cubic-bezier(0.19,1,0.22,1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 28px rgba(25,37,36,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 16px rgba(25,37,36,0.05)'; }}
            >
              <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '1.6rem', color: '#192524', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{t.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#959D90', marginTop: '0.4rem', fontFamily: 'Satoshi, sans-serif' }}>{t.label}</div>
            </button>
          ))}
        </div>

        {/* Platform analytics widget → opens the full dashboard */}
        <button
          className="admin-focusable"
          onClick={() => goToTab('analytics')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.9rem', width: '100%',
            textAlign: 'left', padding: '1rem 1.25rem', borderRadius: '1.25rem', marginBottom: '1.75rem',
            background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.8)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 16px rgba(25,37,36,0.05)',
            cursor: 'pointer', transition: 'transform 0.8s cubic-bezier(0.19,1,0.22,1), box-shadow 0.8s cubic-bezier(0.19,1,0.22,1)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 28px rgba(25,37,36,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 16px rgba(25,37,36,0.05)'; }}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, flexShrink: 0, borderRadius: '0.875rem', background: 'rgba(209,235,219,0.5)', color: '#166534' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </span>
          <span style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#192524' }}>Platform analytics</div>
            <div style={{ fontSize: '0.75rem', color: '#959D90', marginTop: '0.15rem', fontFamily: 'Satoshi, sans-serif' }}>Open the full dashboard</div>
          </span>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#959D90" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>

        {/* Needs attention */}
        <p style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#fff', margin: '0 0 0.75rem' }}>Needs attention</p>
        {attention.length === 0 ? (
          <div style={{ padding: '1.5rem', borderRadius: '1.25rem', background: 'rgba(209,235,219,0.85)', border: '1px solid rgba(209,235,219,0.9)', fontSize: '0.85rem', color: '#166534', fontFamily: 'Satoshi, sans-serif' }}>
            All clear. Nothing is waiting on you right now.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {attention.map((item, i) => (
              <button
                key={i}
                className="admin-focusable"
                onClick={() => goToTab(item.tab, item.view)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.8rem 1.1rem', borderRadius: '0.875rem', textAlign: 'left',
                  background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(25,37,36,0.07)',
                  fontSize: '0.85rem', color: '#3C5759', cursor: 'pointer', fontFamily: 'Satoshi, sans-serif',
                  transition: 'background 0.4s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.65)'; }}
              >
                <span>{item.label}</span>
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#959D90" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
