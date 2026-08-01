import { useEffect, useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';
import Users from './admin/Users';
import SuggestionsModeration from './admin/SuggestionsModeration';
import UserMessages from './admin/UserMessages';
import PlatformAnalytics from './admin/PlatformAnalytics';
import AdminSettings from './admin/AdminSettings';
import FounderTracker from './admin/FounderTracker';
import Broadcast from './admin/Broadcast';
import ListingManager from './admin/ListingManager';
import CollabOversight from './admin/CollabOversight';
import ContractManager from './admin/ContractManager';
import AuditLog from './admin/AuditLog';
import BlogManager from './admin/BlogManager';
import AdminOverview from './admin/AdminOverview';
import Discovery from './admin/Discovery';
import SocialHub from './admin/SocialHub';
import AmbassadorManager from './admin/AmbassadorManager';
import AlgorithmLab from './admin/AlgorithmLab';
import CreatorAlgorithmLab from './admin/CreatorAlgorithmLab';
import ModerationQueue from './admin/ModerationQueue';
import AdminInbox from './admin/AdminInbox';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

// ─── Guard ────────────────────────────────────────────────────────────────────
function useAdminGuard() {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;
    const userEmail = (session?.user?.email || profile?.email || '').toLowerCase();
    const isAdmin = profile?.is_admin === true
      || userEmail === 'benventuring@gmail.com'
      || (!!ADMIN_EMAIL && userEmail === ADMIN_EMAIL.toLowerCase());
    if (isAdmin) {
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
  overview:     IC(<><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></>),
  discovery:    IC(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>),
  users:        IC(<><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></>),
  listings:     IC(<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>),
  collabs:      IC(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>),
  contracts:    IC(<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>),
  founders:     IC(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>),
  broadcast:    IC(<><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.86a2 2 0 011.72-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 15.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 22"/><path d="M14.05 2a9 9 0 018 7.94M14.05 6A5 5 0 0119 10"/></>),
  marketing:    IC(<><path d="M3 3h18v4H3z"/><path d="M3 10h11v11H3z"/><path d="M17 10h4v4h-4z"/><path d="M17 17h4v4h-4z"/></>),
  blog:         IC(<><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></>),
  social:       IC(<><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>),
  'algo-simulator': IC(<><polygon points="5 3 19 12 5 21 5 3"/></>),
  'algo-reference': IC(<><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>),
  'creator-algo-simulator': IC(<><polygon points="5 3 19 12 5 21 5 3"/></>),
  'creator-algo-reference': IC(<><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>),
  messages:     IC(<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>),
  inbox:        IC(<><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></>),
  'admin-inbox': IC(<><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></>),
  suggestions:  IC(<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></>),
  moderation:   IC(<><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></>),
  audit:        IC(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>),
  analytics:    IC(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>),
  ambassadors:  IC(<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z"/></>),
  settings:     IC(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>),
};

// ─── Sidebar nav items ────────────────────────────────────────────────────────
// Flat items shown above the collapsible groups.
const TOP_SECTIONS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'admin-inbox', label: 'Inbox'    },
];

// Pinned to the footer — always visible.
const SETTINGS_SECTION = { id: 'settings', label: 'Settings' };

// Collapsible groups. `icon` keys into ICONS; each group opens its first tab.
const GROUPS = [
  { id: 'users', label: 'Users', icon: 'users', tabs: [
    { id: 'users',          label: 'All Users'           },
    { id: 'messages',       label: 'User Messages'       },
    { id: 'founders',       label: 'Founder Tracker'     },
    { id: 'algo-simulator', label: 'Listing Feed Algorithm Simulator', children: [
      { id: 'algo-reference', label: 'How It Works' },
    ] },
    { id: 'creator-algo-simulator', label: 'Creator Ranking Algorithm Simulator', children: [
      { id: 'creator-algo-reference', label: 'How It Works' },
    ] },
  ] },
  { id: 'collabs', label: 'Collab Oversight', icon: 'collabs', tabs: [
    { id: 'collabs',   label: 'Oversight'          },
    { id: 'listings',  label: 'Listing Management' },
    { id: 'contracts', label: 'Contracts'          },
  ] },
  { id: 'marketing', label: 'Marketing', icon: 'marketing', tabs: [
    { id: 'discovery', label: 'Discovery' },
    { id: 'blog',      label: 'Blog'      },
    { id: 'broadcast', label: 'Emails'    },
    { id: 'social',    label: 'Social'    },
  ] },
  { id: 'suggestions', label: 'Suggestions / Beta', icon: 'suggestions', tabs: [
    { id: 'suggestions', label: 'Suggestions'        },
    { id: 'ambassadors', label: 'Ambassadors (Beta)' },
    { id: 'moderation',  label: 'Moderation'         },
    { id: 'audit',       label: 'Audit Log'          },
  ] },
];

// Panels reachable outside the sidebar (e.g. Overview widgets) — kept here so
// the breadcrumb can still resolve their label.
const HIDDEN_SECTIONS = [
  { id: 'analytics', label: 'Platform Analytics' },
];

// A group's tabs, flattened to include any nested children.
const flatTabs = (group) => group.tabs.flatMap(t => [t, ...(t.children || [])]);
const groupContains = (group, id) => flatTabs(group).some(t => t.id === id);

const ALL_LABELS = [
  ...TOP_SECTIONS, SETTINGS_SECTION, ...HIDDEN_SECTIONS,
  ...GROUPS.flatMap(flatTabs),
];

// Flat, searchable index of every navigable destination in the admin panel.
const NAV_INDEX = [
  ...TOP_SECTIONS.map(s => ({ id: s.id, label: s.label })),
  ...GROUPS.flatMap(g => flatTabs(g).map(t => ({ id: t.id, label: t.label, group: g.label }))),
  { id: SETTINGS_SECTION.id, label: SETTINGS_SECTION.label },
  ...HIDDEN_SECTIONS.map(s => ({ id: s.id, label: s.label })),
];

function UsersPanel()        { return <Users />;                }
function ListingsPanel()     { return <ListingManager />;       }
function CollabPanel()       { return <CollabOversight />;     }
function ContractPanel()     { return <ContractManager />;      }
function FoundersPanel()     { return <FounderTracker />;       }
function MessagesPanel()     { return <UserMessages />;         }
function SuggestionsPanel()  { return <SuggestionsModeration />; }
function ModerationPanel()   { return <ModerationQueue />;      }
function AnalyticsPanel()    { return <PlatformAnalytics />;    }
function SettingsPanel()     { return <AdminSettings />;        }
function BroadcastPanel()    { return <Broadcast />;            }
function AuditPanel()        { return <AuditLog />;             }
function BlogPanel()         { return <BlogManager />;          }
function SocialPanel()       { return <SocialHub />;            }
function OverviewPanel()     { return <AdminOverview />;        }
function DiscoveryPanel({ sidebarCollapsed, setSidebarCollapsed }) { return <Discovery sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} />; }
function AmbassadorsPanel()  { return <AmbassadorManager />;    }
function AlgoSimulatorPanel() { return <AlgorithmLab view="simulator" />; }
function AlgoReferencePanel() { return <AlgorithmLab view="reference" />; }
function CreatorAlgoSimulatorPanel() { return <CreatorAlgorithmLab view="simulator" />; }
function CreatorAlgoReferencePanel() { return <CreatorAlgorithmLab view="reference" />; }
function AdminInboxPanel()   { return <AdminInbox />; }

const PANEL_MAP = {
  overview:     OverviewPanel,
  discovery:    DiscoveryPanel,
  users:        UsersPanel,
  listings:     ListingsPanel,
  collabs:      CollabPanel,
  contracts:    ContractPanel,
  founders:     FoundersPanel,
  ambassadors:  AmbassadorsPanel,
  broadcast:    BroadcastPanel,
  messages:     MessagesPanel,
  suggestions:  SuggestionsPanel,
  moderation:   ModerationPanel,
  audit:        AuditPanel,
  analytics:    AnalyticsPanel,
  settings:     SettingsPanel,
  blog:         BlogPanel,
  social:       SocialPanel,
  'algo-simulator': AlgoSimulatorPanel,
  'algo-reference': AlgoReferencePanel,
  'creator-algo-simulator': CreatorAlgoSimulatorPanel,
  'creator-algo-reference': CreatorAlgoReferencePanel,
  'admin-inbox':    AdminInboxPanel,
};

// ─── AdminDashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { authorized, loading, profile } = useAdminGuard();
  const [activeSection, setActiveSection] = useState('overview');
  const [openGroups, setOpenGroups] = useState({});
  const [openSubGroups, setOpenSubGroups] = useState({});
  const [usersInitialView, setUsersInitialView] = useState(null);
  const [navSearch, setNavSearch] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const unreadCount = useQuery(api.messages.getUnreadCount);
  const adminUnread = useQuery(api.adminThreads.unreadCount) ?? 0;

  // Manual nav clears any deep-linked Users sub-view (e.g. Overview → pending).
  const selectSection = (id) => { setUsersInitialView(null); setActiveSection(id); };

  useEffect(() => {
    const handler = (e) => {
      const { tab, view } = e.detail || {};
      if (tab && PANEL_MAP[tab]) {
        setUsersInitialView(view || null);
        setActiveSection(tab);
      }
    };
    window.addEventListener('collabnb-admin-tab', handler);
    return () => window.removeEventListener('collabnb-admin-tab', handler);
  }, []);

  if (loading || !authorized) return (
    <div style={{ minHeight: '100dvh', background: '#EFECE9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '2.5px solid rgba(25,37,36,0.1)', borderTopColor: '#3C5759', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const ActivePanel = PANEL_MAP[activeSection] || PANEL_MAP['overview'];
  const badges = { messages: unreadCount || 0, 'admin-inbox': adminUnread || 0 };
  const q = navSearch.trim().toLowerCase();
  const navResults = q
    ? NAV_INDEX.filter(it => it.label.toLowerCase().includes(q) || (it.group || '').toLowerCase().includes(q))
    : null;
  const activeGroup = GROUPS.find(g => groupContains(g, activeSection));
  const activeLabel = activeGroup
    ? `${activeGroup.label} › ${flatTabs(activeGroup).find(t => t.id === activeSection)?.label}`
    : ALL_LABELS.find(s => s.id === activeSection)?.label;

  // Decide where "Back to my account" goes based on role
  const backPath = profile?.role === 'host' ? '/host' : '/profile';

  const renderSection = (s) => {
    const active = activeSection === s.id;
    return (
      <button
        key={s.id}
        onClick={() => selectSection(s.id)}
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
  };

  // Nested item one level deeper than a sub-tab (e.g. a simulator's "How It Works").
  const renderSubChild = (c) => {
    const active = activeSection === c.id;
    return (
      <button
        key={c.id}
        onClick={() => selectSection(c.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          width: '100%', padding: '0.4rem 0.75rem 0.4rem 3rem',
          borderRadius: '0.625rem', marginBottom: '0.1rem',
          background: active ? 'rgba(255,255,255,0.75)' : 'transparent',
          color: active ? '#192524' : '#5a7070',
          fontWeight: active ? 600 : 400,
          fontSize: '0.8rem', textAlign: 'left',
          cursor: 'pointer', border: 'none',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.4)'; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ display: 'flex', alignItems: 'center', opacity: active ? 1 : 0.6 }}>{ICONS[c.id]}</span>
        <span style={{ flex: 1 }}>{c.label}</span>
      </button>
    );
  };

  const renderSubTab = (t) => {
    const active = activeSection === t.id;

    // Sub-tab that owns nested children (e.g. a simulator + its "How It Works").
    if (t.children) {
      const childActive = t.children.some(c => c.id === activeSection);
      const expanded = openSubGroups[t.id] || active || childActive;
      return (
        <div key={t.id}>
          <button
            onClick={() => {
              setOpenSubGroups(o => ({ ...o, [t.id]: !expanded }));
              if (!active) selectSection(t.id);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              width: '100%', padding: '0.45rem 0.75rem 0.45rem 2rem',
              borderRadius: '0.625rem', marginBottom: '0.1rem',
              background: active ? 'rgba(255,255,255,0.75)' : 'transparent',
              color: active ? '#192524' : '#5a7070',
              fontWeight: active ? 600 : 400,
              fontSize: '0.82rem', textAlign: 'left',
              cursor: 'pointer', border: 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.4)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ display: 'flex', alignItems: 'center', opacity: active ? 1 : 0.6 }}>{ICONS[t.id]}</span>
            <span style={{ flex: 1 }}>{t.label}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transition: 'transform 150ms', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', opacity: 0.45 }}>
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
          {expanded && t.children.map(renderSubChild)}
        </div>
      );
    }

    return (
      <button
        key={t.id}
        onClick={() => selectSection(t.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          width: '100%', padding: '0.45rem 0.75rem 0.45rem 2rem',
          borderRadius: '0.625rem', marginBottom: '0.1rem',
          background: active ? 'rgba(255,255,255,0.75)' : 'transparent',
          color: active ? '#192524' : '#5a7070',
          fontWeight: active ? 600 : 400,
          fontSize: '0.82rem', textAlign: 'left',
          cursor: 'pointer', border: 'none',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.4)'; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ display: 'flex', alignItems: 'center', opacity: active ? 1 : 0.6 }}>{ICONS[t.id]}</span>
        <span style={{ flex: 1 }}>{t.label}</span>
        {badges[t.id] > 0 && (
          <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#D1EBDB', color: '#166534', borderRadius: '99px', padding: '0 0.4rem', lineHeight: 1.7 }}>
            {badges[t.id]}
          </span>
        )}
      </button>
    );
  };

  const renderGroup = (group) => {
    const isActive = groupContains(group, activeSection);
    const expanded = openGroups[group.id] || isActive;
    return (
      <div key={group.id}>
        <button
          onClick={() => {
            setOpenGroups(o => ({ ...o, [group.id]: !expanded }));
            if (!isActive) selectSection(group.tabs[0].id);
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            width: '100%', padding: '0.55rem 0.75rem',
            borderRadius: '0.625rem', marginBottom: '0.15rem',
            background: isActive ? 'rgba(255,255,255,0.85)' : 'transparent',
            color: isActive ? '#192524' : '#3C5759',
            fontWeight: isActive ? 600 : 400,
            fontSize: '0.875rem', textAlign: 'left',
            transition: 'background 0.15s, color 0.15s',
            cursor: 'pointer', border: 'none',
            boxShadow: isActive ? '0 1px 4px rgba(25,37,36,0.08)' : 'none',
          }}
          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.5)'; }}
          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
        >
          <span style={{ display: 'flex', alignItems: 'center', color: isActive ? '#192524' : '#3C5759', opacity: isActive ? 1 : 0.7 }}>{ICONS[group.icon]}</span>
          <span style={{ flex: 1 }}>{group.label}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transition: 'transform 150ms', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', opacity: 0.5 }}>
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
        {expanded && group.tabs.map(renderSubTab)}
      </div>
    );
  };

  // Icon-only button for the collapsed rail.
  const renderRailIcon = (iconKey, label, active, onClick, badge = 0) => (
    <button
      key={iconKey}
      title={label}
      aria-label={label}
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', height: 40, borderRadius: '0.625rem', marginBottom: '0.15rem',
        background: active ? 'rgba(255,255,255,0.85)' : 'transparent',
        color: active ? '#192524' : '#3C5759',
        cursor: 'pointer', border: 'none',
        boxShadow: active ? '0 1px 4px rgba(25,37,36,0.08)' : 'none',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.5)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ display: 'flex', alignItems: 'center', opacity: active ? 1 : 0.75 }}>{ICONS[iconKey]}</span>
      {badge > 0 && (
        <span style={{ position: 'absolute', top: 6, right: 9, minWidth: 7, height: 7, borderRadius: '99px', background: '#166534' }} />
      )}
    </button>
  );

  return (
    <>
      <div style={{ display: 'flex', minHeight: '100dvh', fontFamily: 'Satoshi, sans-serif', position: 'relative', zIndex: 10 }}>

        {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
        <aside style={{
          width: sidebarCollapsed ? 64 : 232,
          flexShrink: 0,
          background: 'rgba(255,255,255,0.60)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          borderRight: '1px solid rgba(255,255,255,0.65)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem 0',
          boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.5), 2px 0 20px rgba(25,37,36,0.06)',
          transition: 'width 0.2s ease',
        }}>
          {/* Logo / wordmark + collapse toggle */}
          <div style={{ padding: sidebarCollapsed ? '0 0 1rem' : '0 1.25rem 1.25rem', borderBottom: '1px solid rgba(25,37,36,0.07)', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', gap: '0.5rem' }}>
            {!sidebarCollapsed && (
              <div>
                <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#192524', letterSpacing: '-0.02em' }}>Collabnb</div>
                <div style={{ fontSize: '0.7rem', color: '#959D90', marginTop: '0.1rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Admin Panel</div>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              title={sidebarCollapsed ? 'Expand panel' : 'Collapse panel'}
              aria-label={sidebarCollapsed ? 'Expand panel' : 'Collapse panel'}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, flexShrink: 0, borderRadius: '0.5rem', border: '1px solid rgba(25,37,36,0.1)', background: 'rgba(255,255,255,0.6)', color: '#3C5759', cursor: 'pointer' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
            </button>
          </div>

          {sidebarCollapsed ? (
            /* ── Collapsed icon rail ── */
            <>
              <nav style={{ padding: '0.75rem 0.5rem', flex: 1 }}>
                {TOP_SECTIONS.map(s => renderRailIcon(s.id, s.label, activeSection === s.id, () => selectSection(s.id), badges[s.id]))}
                {GROUPS.map(g => renderRailIcon(g.icon, g.label, groupContains(g, activeSection), () => selectSection(g.tabs[0].id)))}
              </nav>
              <div style={{ padding: '0.5rem', borderTop: '1px solid rgba(25,37,36,0.07)' }}>
                {renderRailIcon('settings', 'Settings', activeSection === 'settings', () => selectSection('settings'))}
              </div>
            </>
          ) : (
            /* ── Expanded sidebar ── */
            <>
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

              {/* Search */}
              <div style={{ padding: '0.75rem 0.75rem 0' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#959D90" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '0.6rem', pointerEvents: 'none' }}>
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    value={navSearch}
                    onChange={e => setNavSearch(e.target.value)}
                    placeholder="Search admin…"
                    style={{ width: '100%', padding: '0.5rem 1.6rem 0.5rem 2rem', borderRadius: '0.625rem', border: '1px solid rgba(25,37,36,0.12)', background: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', color: '#192524', outline: 'none', fontFamily: 'inherit' }}
                  />
                  {navSearch && (
                    <button
                      onClick={() => setNavSearch('')}
                      aria-label="Clear search"
                      style={{ position: 'absolute', right: '0.4rem', width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'transparent', color: '#959D90', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Nav items OR search results */}
              <nav style={{ padding: '0.75rem 0.75rem', flex: 1, overflowY: 'auto' }}>
                {navResults ? (
                  navResults.length === 0 ? (
                    <div style={{ padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: '#959D90' }}>No matches.</div>
                  ) : (
                    navResults.map(it => {
                      const active = activeSection === it.id;
                      return (
                        <button
                          key={it.id}
                          onClick={() => { selectSection(it.id); setNavSearch(''); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.625rem', marginBottom: '0.1rem',
                            background: active ? 'rgba(255,255,255,0.75)' : 'transparent',
                            color: active ? '#192524' : '#3C5759',
                            fontSize: '0.82rem', textAlign: 'left', cursor: 'pointer', border: 'none',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.45)'; }}
                          onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', opacity: 0.7 }}>{ICONS[it.id]}</span>
                          <span style={{ flex: 1 }}>{it.label}</span>
                          {it.group && <span style={{ fontSize: '0.66rem', color: '#959D90' }}>{it.group}</span>}
                        </button>
                      );
                    })
                  )
                ) : (
                  <>
                    {TOP_SECTIONS.map(renderSection)}
                    {GROUPS.map(renderGroup)}
                  </>
                )}
              </nav>

              {/* Pinned Settings — always visible */}
              <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid rgba(25,37,36,0.07)' }}>
                {renderSection(SETTINGS_SECTION)}
              </div>

              {/* Footer */}
              <div style={{ padding: '0.75rem 1.25rem', fontSize: '0.75rem', color: '#959D90' }}>
                Internal use only
              </div>
            </>
          )}
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
              <span style={{ display: 'flex', alignItems: 'center' }}>{ICONS[activeSection] || ICONS.marketing}</span>
              {activeLabel}
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
              {activeSection === 'users'
                ? <Users initialTab={usersInitialView} />
                : <ActivePanel sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} />}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
