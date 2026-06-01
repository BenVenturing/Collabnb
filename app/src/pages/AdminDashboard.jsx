import { useEffect, useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
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
import ListingManager from './admin/ListingManager';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

// ─── Guard ────────────────────────────────────────────────────────────────────
function useAdminGuard() {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;
    const userEmail = (session?.user?.email || profile?.email || '').toLowerCase();
    if (!!ADMIN_EMAIL && userEmail === ADMIN_EMAIL.toLowerCase()) {
      setAuthorized(true);
    } else {
      navigate('/explore', { replace: true });
    }
  }, [loading, session, profile, navigate]);

  return { authorized, loading, profile };
}

// ─── Sidebar nav items ────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'verification', icon: '📋', label: 'Verification Queue'     },
  { id: 'listings',     icon: '🏠', label: 'Listing Management'     },
  { id: 'founders',     icon: '🌟', label: 'Founder Tracker'        },
  { id: 'waitlist',     icon: '📝', label: 'Waitlist Manager'       },
  { id: 'broadcast',    icon: '📣', label: 'Broadcast'              },
  { id: 'messages',     icon: '💬', label: 'User Messages'          },
  { id: 'suggestions',  icon: '💡', label: 'Suggestions Moderation' },
  { id: 'analytics',    icon: '📊', label: 'Platform Analytics'     },
  { id: 'settings',     icon: '⚙️', label: 'Settings'               },
];

function VerificationPanel() { return <VerificationQueue />;    }
function ListingsPanel()     { return <ListingManager />;       }
function FoundersPanel()     { return <FounderTracker />;       }
function MessagesPanel()     { return <UserMessages />;         }
function SuggestionsPanel()  { return <SuggestionsModeration />; }
function AnalyticsPanel()    { return <PlatformAnalytics />;    }
function SettingsPanel()     { return <AdminSettings />;        }
function WaitlistPanel()     { return <WaitlistManager />;      }
function BroadcastPanel()    { return <Broadcast />;            }

const PANEL_MAP = {
  verification: VerificationPanel,
  listings:     ListingsPanel,
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
  const { authorized, loading, profile } = useAdminGuard();
  const [activeSection, setActiveSection] = useState('verification');
  const unreadCount = useQuery(api.messages.getUnreadCount);

  if (loading || !authorized) return null;

  const ActivePanel = PANEL_MAP[activeSection];
  const badges = { messages: unreadCount || 0 };

  // Decide where "Back to my account" goes based on role
  const backPath = profile?.role === 'host' ? '/host' : '/profile';

  return (
    <>
      {/* ── HAZY background layers ──────────────────────────────────────────── */}
      <div aria-hidden="true" className="bg-layers bg-base" />
      <div aria-hidden="true" className="bg-layers bg-gradient" />
      <div aria-hidden="true" className="bg-layers bg-clouds" />
      <div aria-hidden="true" className="bg-grain" />

      <div style={{ display: 'flex', minHeight: '100dvh', fontFamily: 'Satoshi, sans-serif', position: 'relative', zIndex: 10 }}>

        {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
        <aside style={{
          width: 232,
          flexShrink: 0,
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.55)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem 0',
          boxShadow: '2px 0 16px rgba(25,37,36,0.05)',
        }}>
          {/* Logo / wordmark */}
          <div style={{ padding: '0 1.25rem 1.25rem', borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
            <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#192524', letterSpacing: '-0.02em' }}>Collabnb</div>
            <div style={{ fontSize: '0.7rem', color: '#959D90', marginTop: '0.1rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Admin Panel</div>
          </div>

          {/* Back to account */}
          <div style={{ padding: '0.75rem 0.75rem 0' }}>
            <NavLink
              to={backPath}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 0.75rem', borderRadius: '0.625rem',
                background: 'rgba(209,235,219,0.35)',
                color: '#166534', fontSize: '0.8rem', fontWeight: 600,
                textDecoration: 'none', border: '1px solid rgba(209,235,219,0.7)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(209,235,219,0.6)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(209,235,219,0.35)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back to my account
            </NavLink>
          </div>

          {/* Nav items */}
          <nav style={{ padding: '0.75rem 0.75rem', flex: 1 }}>
            {SECTIONS.map(s => {
              const active = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                    width: '100%', padding: '0.55rem 0.75rem',
                    borderRadius: '0.625rem', marginBottom: '0.15rem',
                    background: active ? 'rgba(255,255,255,0.85)' : 'transparent',
                    color: active ? '#192524' : '#3C5759',
                    fontWeight: active ? 600 : 400,
                    fontSize: '0.875rem', textAlign: 'left',
                    transition: 'background 0.15s, color 0.15s',
                    cursor: 'pointer', border: 'none',
                    boxShadow: active ? '0 1px 4px rgba(25,37,36,0.08)' : 'none',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.5)'; }}
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
          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(25,37,36,0.07)', fontSize: '0.75rem', color: '#959D90' }}>
            Internal use only
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflow: 'auto' }}>
          {/* Top bar */}
          <div style={{
            height: 52,
            borderBottom: '1px solid rgba(255,255,255,0.4)',
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex', alignItems: 'center',
            padding: '0 2rem', gap: '0.75rem',
          }}>
            <span style={{ fontSize: '0.8rem', color: '#959D90' }}>
              {SECTIONS.find(s => s.id === activeSection)?.icon}{' '}
              {SECTIONS.find(s => s.id === activeSection)?.label}
            </span>
          </div>

          {/* Panel content — glass card wrapper */}
          <div style={{ padding: '1.5rem', minHeight: 'calc(100dvh - 52px)' }}>
            <div style={{
              background: 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '1.25rem',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 4px 24px rgba(25,37,36,0.06)',
              overflow: 'hidden',
              minHeight: 'calc(100dvh - 52px - 3rem)',
            }}>
              <ActivePanel />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
