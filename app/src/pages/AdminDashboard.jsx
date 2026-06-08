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
import CollabOversight from './admin/CollabOversight';
import ContractManager from './admin/ContractManager';
import AuditLog from './admin/AuditLog';

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

// ─── Sidebar nav icons ────────────────────────────────────────────────────────
const IC = (d) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const ICONS = {
  verification: IC(<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>),
  listings:     IC(<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>),
  collabs:      IC(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>),
  contracts:    IC(<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>),
  founders:     IC(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>),
  waitlist:     IC(<><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></>),
  broadcast:    IC(<><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.86a2 2 0 011.72-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 15.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 22"/><path d="M14.05 2a9 9 0 018 7.94M14.05 6A5 5 0 0119 10"/></>),
  messages:     IC(<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>),
  suggestions:  IC(<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></>),
  audit:        IC(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>),
  analytics:    IC(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>),
  settings:     IC(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>),
};

// ─── Sidebar nav items ────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'verification', label: 'Verification Queue'     },
  { id: 'listings',     label: 'Listing Management'     },
  { id: 'collabs',      label: 'Collab Oversight'       },
  { id: 'contracts',    label: 'Contracts'              },
  { id: 'founders',     label: 'Founder Tracker'        },
  { id: 'waitlist',     label: 'Waitlist Manager'       },
  { id: 'broadcast',    label: 'Broadcast'              },
  { id: 'messages',     label: 'User Messages'          },
  { id: 'suggestions',  label: 'Suggestions'            },
  { id: 'audit',        label: 'Audit Log'              },
  { id: 'analytics',    label: 'Platform Analytics'     },
  { id: 'settings',     label: 'Settings'               },
];

function VerificationPanel() { return <VerificationQueue />;    }
function ListingsPanel()     { return <ListingManager />;       }
function CollabPanel()       { return <CollabOversight />;     }
function ContractPanel()     { return <ContractManager />;      }
function FoundersPanel()     { return <FounderTracker />;       }
function MessagesPanel()     { return <UserMessages />;         }
function SuggestionsPanel()  { return <SuggestionsModeration />; }
function AnalyticsPanel()    { return <PlatformAnalytics />;    }
function SettingsPanel()     { return <AdminSettings />;        }
function WaitlistPanel()     { return <WaitlistManager />;      }
function BroadcastPanel()    { return <Broadcast />;            }
function AuditPanel()        { return <AuditLog />;             }

const PANEL_MAP = {
  verification: VerificationPanel,
  listings:     ListingsPanel,
  collabs:      CollabPanel,
  contracts:    ContractPanel,
  founders:     FoundersPanel,
  waitlist:     WaitlistPanel,
  broadcast:    BroadcastPanel,
  messages:     MessagesPanel,
  suggestions:  SuggestionsPanel,
  audit:        AuditPanel,
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
      <div style={{ display: 'flex', minHeight: '100dvh', fontFamily: 'Satoshi, sans-serif', position: 'relative', zIndex: 10 }}>

        {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
        <aside style={{
          width: 232,
          flexShrink: 0,
          background: 'rgba(255,255,255,0.60)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          borderRight: '1px solid rgba(255,255,255,0.65)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem 0',
          boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.5), 2px 0 20px rgba(25,37,36,0.06)',
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
                  <span style={{ display: 'flex', alignItems: 'center', color: active ? '#192524' : '#3C5759', opacity: active ? 1 : 0.7 }}>{ICONS[s.id]}</span>
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
            borderBottom: '1px solid rgba(255,255,255,0.45)',
            background: 'rgba(255,255,255,0.48)',
            backdropFilter: 'blur(18px) saturate(150%)',
            WebkitBackdropFilter: 'blur(18px) saturate(150%)',
            display: 'flex', alignItems: 'center',
            padding: '0 2rem', gap: '0.75rem',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#959D90' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>{ICONS[activeSection]}</span>
              {SECTIONS.find(s => s.id === activeSection)?.label}
            </span>
          </div>

          {/* Panel content — glass card wrapper */}
          <div style={{ padding: '1.5rem', minHeight: 'calc(100dvh - 52px)' }}>
            <div style={{
              background: 'rgba(255,255,255,0.58)',
              backdropFilter: 'blur(24px) saturate(160%)',
              WebkitBackdropFilter: 'blur(24px) saturate(160%)',
              borderRadius: '1.25rem',
              border: '1px solid rgba(255,255,255,0.72)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 32px rgba(25,37,36,0.08)',
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
