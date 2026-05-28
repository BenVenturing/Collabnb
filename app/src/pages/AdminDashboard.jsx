import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';
import VerificationQueue from './admin/VerificationQueue';
import SuggestionsModeration from './admin/SuggestionsModeration';
import UserMessages from './admin/UserMessages';
import PlatformAnalytics from './admin/PlatformAnalytics';
import AdminSettings from './admin/AdminSettings';
import FounderTracker from './admin/FounderTracker';
import Broadcast from './admin/Broadcast';
import WaitlistManager from './admin/WaitlistManager';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

// ─── Guard ────────────────────────────────────────────────────────────────────
function useAdminGuard() {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;
    const userEmail = session?.user?.email || profile?.email;
    if (!!ADMIN_EMAIL && userEmail === ADMIN_EMAIL) {
      setAuthorized(true);
    } else {
      navigate('/explore', { replace: true });
    }
  }, [loading, session, profile, navigate]);

  return { authorized, loading };
}


// ─── Sidebar nav items ────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'verification', icon: '📋', label: 'Verification Queue'     },
  { id: 'founders',     icon: '🌟', label: 'Founder Tracker'        },
  { id: 'waitlist',     icon: '📝', label: 'Waitlist Manager'       },
  { id: 'broadcast',    icon: '📣', label: 'Broadcast'              },
  { id: 'messages',     icon: '💬', label: 'User Messages'          },
  { id: 'suggestions',  icon: '💡', label: 'Suggestions Moderation' },
  { id: 'analytics',    icon: '📊', label: 'Platform Analytics'     },
  { id: 'settings',     icon: '⚙️', label: 'Settings'               },
];

// ─── Panel placeholders ───────────────────────────────────────────────────────
function VerificationPanel() {
  return <VerificationQueue />;
}

function FoundersPanel() {
  return <FounderTracker />;
}

function MessagesPanel() {
  return <UserMessages />;
}

function SuggestionsPanel() {
  return <SuggestionsModeration />;
}

function AnalyticsPanel() {
  return <PlatformAnalytics />;
}

function SettingsPanel()  { return <AdminSettings />;  }
function WaitlistPanel()  { return <WaitlistManager />; }
function BroadcastPanel() { return <Broadcast />;       }

const PANEL_MAP = {
  verification: VerificationPanel,
  founders:     FoundersPanel,
  waitlist:     WaitlistPanel,
  broadcast:    BroadcastPanel,
  messages:     MessagesPanel,
  suggestions:  SuggestionsPanel,
  analytics:    AnalyticsPanel,
  settings:     SettingsPanel,
};

// ─── AdminDashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { authorized, loading } = useAdminGuard();
  const [activeSection, setActiveSection] = useState('verification');
  const unreadCount = useQuery(api.messages.getUnreadCount);

  if (loading || !authorized) return null;

  const ActivePanel = PANEL_MAP[activeSection];
  const badges = { messages: unreadCount || 0 };

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: '#F7F5F2', fontFamily: 'Satoshi, sans-serif' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside style={{
        width: 232,
        flexShrink: 0,
        background: '#fff',
        borderRight: '1px solid rgba(25,37,36,0.07)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 0',
      }}>
        {/* Logo / wordmark */}
        <div style={{ padding: '0 1.25rem 1.5rem', borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
          <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#192524', letterSpacing: '-0.02em' }}>Collabnb</div>
          <div style={{ fontSize: '0.7rem', color: '#959D90', marginTop: '0.1rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Admin Panel</div>
        </div>

        {/* Nav items */}
        <nav style={{ padding: '1rem 0.75rem', flex: 1 }}>
          {SECTIONS.map(s => {
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '0.625rem',
                  marginBottom: '0.15rem',
                  background: active ? '#EFECE9' : 'transparent',
                  color: active ? '#192524' : '#3C5759',
                  fontWeight: active ? 600 : 400,
                  fontSize: '0.875rem',
                  textAlign: 'left',
                  transition: 'background 0.15s, color 0.15s',
                  cursor: 'pointer',
                  border: 'none',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F7F5F2'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '1rem', lineHeight: 1 }}>{s.icon}</span>
                <span style={{ flex: 1 }}>{s.label}</span>
                {badges[s.id] > 0 && (
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#D1EBDB', color: '#166534', borderRadius: '99px', padding: '0 0.4rem', lineHeight: 1.7 }}>
                    {badges[s.id]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(25,37,36,0.07)', fontSize: '0.75rem', color: '#D0D5CE' }}>
          Internal use only
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {/* Top bar */}
        <div style={{
          height: 52,
          borderBottom: '1px solid rgba(25,37,36,0.07)',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          padding: '0 2rem',
          gap: '0.75rem',
        }}>
          <span style={{ fontSize: '0.8rem', color: '#959D90' }}>
            {SECTIONS.find(s => s.id === activeSection)?.icon}{' '}
            {SECTIONS.find(s => s.id === activeSection)?.label}
          </span>
        </div>

        {/* Panel content */}
        <ActivePanel />
      </main>
    </div>
  );
}
