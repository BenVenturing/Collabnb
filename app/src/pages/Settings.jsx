import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useAction, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getPitchCount } from '../lib/pitchCount';
import { reopenChecklist } from '../components/OnboardingChecklist';
import ReceiptCheckoutOverlay from '../components/ReceiptCheckoutOverlay';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

// ─── Icons (Phosphor-style, matches Profile.jsx's icon set) ────────────────
const UserIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <circle cx="128" cy="96" r="52"/><path d="M32,224a97.94,97.94,0,0,1,192,0"/>
  </svg>
);
const ShieldIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M128,26,40,58V128c0,60,88,102,88,102s88-42,88-102V58Z"/>
    <polyline points="94 130 116 152 166 102"/>
  </svg>
);
const HandIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M104,112V56a16,16,0,0,1,32,0v56"/>
    <path d="M136,112V40a16,16,0,0,1,32,0v72"/>
    <path d="M168,112V56a16,16,0,0,1,32,0v96"/>
    <path d="M72,152V112a16,16,0,0,1,32,0v40"/>
    <path d="M72,152c0,44.18,28,80,72,80s84-32,84-88v-24"/>
  </svg>
);
const BellIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M96,192a32,32,0,0,0,64,0"/>
    <path d="M56,104a72,72,0,0,1,144,0c0,35.82,8.3,56.6,14.9,68A8,8,0,0,1,208,184H48a8,8,0,0,1-6.88-12C47.71,160.6,56,139.81,56,104Z"/>
  </svg>
);
const SparkleIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M128,24l18.4,55.2a24,24,0,0,0,15.4,15.4L217,113l-55.2,18.4a24,24,0,0,0-15.4,15.4L128,202l-18.4-55.2a24,24,0,0,0-15.4-15.4L39,113l55.2-18.4a24,24,0,0,0,15.4-15.4Z"/>
  </svg>
);
const CreditCardIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="24" y="56" width="208" height="144" rx="16"/>
    <line x1="24" y1="104" x2="232" y2="104"/>
    <line x1="64" y1="152" x2="96" y2="152"/><line x1="120" y1="152" x2="136" y2="152"/>
  </svg>
);
const GlobeIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <circle cx="128" cy="128" r="96"/><ellipse cx="128" cy="128" rx="40" ry="96"/>
    <line x1="32" y1="128" x2="224" y2="128"/><line x1="40" y1="96" x2="216" y2="96"/><line x1="40" y1="160" x2="216" y2="160"/>
  </svg>
);
const ChevronL = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
    <polyline points="160 48 80 128 160 208"/>
  </svg>
);
const ChevronR = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
    <polyline points="96 48 176 128 96 208"/>
  </svg>
);
const SignOutIcon = () => (
  <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M112,216H48a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8h64"/>
    <polyline points="168 160 216 128 168 96"/><line x1="104" y1="128" x2="216" y2="128"/>
  </svg>
);

// ─── Responsive helper — collapses to a single pane below 860px ────────────
function useIsNarrow() {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)');
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

// ─── Building blocks ────────────────────────────────────────────────────────
function NavRow({ icon, label, active, badge, onClick, showChevron }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.75rem 0.875rem', borderRadius: '0.875rem', border: 'none',
        background: active ? 'rgba(60,87,89,0.08)' : 'transparent',
        cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)',
        transition: 'background 150ms',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(209,235,219,0.25)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ color: active ? 'var(--ink)' : 'var(--slate)', flexShrink: 0, display: 'flex' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: '0.86rem', fontWeight: active ? 700 : 600, color: active ? 'var(--ink)' : 'var(--slate)' }}>{label}</span>
      {badge && (
        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#A87820', background: 'rgba(212,168,67,0.16)', borderRadius: 999, padding: '0.15rem 0.5rem', flexShrink: 0 }}>{badge}</span>
      )}
      {showChevron && <span style={{ color: 'var(--stone)', flexShrink: 0 }}><ChevronR /></span>}
    </button>
  );
}

function FieldRow({ label, value, action, onAction, comingSoon, danger }) {
  return (
    <div style={{ padding: '1.1rem 0', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '0.92rem', fontWeight: 700, color: comingSoon ? 'var(--sage)' : 'var(--ink)', margin: '0 0 0.2rem' }}>{label}</p>
        {value && <p style={{ fontSize: '0.8rem', color: 'var(--sage)', margin: 0, lineHeight: 1.5 }}>{value}</p>}
      </div>
      {comingSoon ? (
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#A87820', background: 'rgba(212,168,67,0.16)', borderRadius: 999, padding: '0.28rem 0.65rem', whiteSpace: 'nowrap', flexShrink: 0 }}>Coming soon</span>
      ) : action ? (
        <button
          onClick={onAction}
          style={{ fontSize: '0.82rem', fontWeight: 600, color: danger ? '#dc2626' : 'var(--slate)', background: 'none', border: 'none', textDecoration: 'underline', textUnderlineOffset: '3px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}

function ToggleRow({ label, sublabel, checked, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.9rem 0', borderBottom: '1px solid var(--hairline)' }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{label}</p>
        {sublabel && <p style={{ fontSize: '0.76rem', color: 'var(--sage)', margin: '0.15rem 0 0', lineHeight: 1.5 }}>{sublabel}</p>}
      </div>
      <button
        role="switch" aria-checked={checked} aria-label={`Toggle ${label}`}
        onClick={onChange}
        style={{ flexShrink: 0, position: 'relative', width: 44, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0, background: checked ? '#4A9B7F' : 'rgba(25,37,36,0.15)', transition: 'background 200ms' }}
      >
        <span style={{ position: 'absolute', top: 2, left: checked ? 20 : 2, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 200ms cubic-bezier(0.34,1.56,0.64,1)' }} />
      </button>
    </div>
  );
}

function SelectRow({ label, value, options, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.9rem 0', borderBottom: '1px solid var(--hairline)' }}>
      <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate)', background: 'rgba(247,245,242,0.7)', border: '1px solid rgba(60,87,89,0.18)', borderRadius: '0.6rem', padding: '0.4rem 0.6rem', fontFamily: 'var(--font-body)', cursor: 'pointer', flexShrink: 0, maxWidth: '55%' }}
      >
        {options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
      </select>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '1.75rem 0 0.5rem' }}>{children}</p>
  );
}

// ─── Main Settings page ─────────────────────────────────────────────────────
export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  const { profile, updateProfile, signOut, openUserProfile } = useAuth();
  const { openModal: openSubModal } = useSubscription();
  const createBillingPortalSession = useAction(api.stripe.createBillingPortalSession);
  const createHostCardSetupSession = useAction(api.stripe.createHostCardSetupSession);
  const verifyHostCardSetupSession = useAction(api.stripe.verifyHostCardSetupSession);
  const removeSavedCard = useAction(api.stripe.removeSavedCard);
  const createConnectOnboardingLink = useAction(api.stripe.createConnectOnboardingLink);
  const getConnectAccountStatus = useAction(api.stripe.getConnectAccountStatus);
  const blockUserMutation = useMutation(api.profiles.blockUser);
  const unblockUserMutation = useMutation(api.profiles.unblockUser);
  const [portalLoading, setPortalLoading] = useState(false);
  const [policyExpanded, setPolicyExpanded] = useState(false);
  const [cardBusy, setCardBusy] = useState(false);
  const [cardError, setCardError] = useState('');
  const [checkoutReceipt, setCheckoutReceipt] = useState(null);
  const [connectStatus, setConnectStatus] = useState(null);
  const [connectBusy, setConnectBusy] = useState(false);
  const [blockQuery, setBlockQuery] = useState('');

  const notifPrefs = {
    messages: true, contractUpdates: true, newListings: false, collabReminders: true, marketing: false,
    ...profile?.notification_prefs,
  };
  function toggleNotif(key) {
    updateProfile({ notification_prefs: { ...notifPrefs, [key]: !notifPrefs[key] } });
  }

  const profileEmail = (profile?.email || '').toLowerCase();
  const isAdmin = profile?.is_admin === true
    || profileEmail === 'benventuring@gmail.com'
    || (!!ADMIN_EMAIL && profileEmail === ADMIN_EMAIL.toLowerCase());
  const userId = profile?._id || profile?.id || 'mock-user-001';
  const isMockUser = userId === 'mock-user-001';

  const serverPitchCount = useQuery(api.pitches.getCount, { userId });
  const referralStats = useQuery(api.referrals.getMyCode, !isMockUser ? { profileId: userId } : 'skip');
  const hostListings = useQuery(api.listings.getByHost, !isMockUser && profile?.role === 'host' ? { host_id: String(userId) } : 'skip');
  const hostBilling = useQuery(api.fees.getBilling, !isMockUser && profile?.role === 'host' ? { hostId: String(userId) } : 'skip');
  const allProfiles = useQuery(api.profiles.getAll);

  const hasListing = (hostListings?.length ?? 0) > 0;
  const isHostVerified = profile?.host_verified === true
    || ((profile?.is_verified === true || profile?.is_founder === true) && hasListing);
  const isCreatorVerified = profile?.creator_verified === true;
  const pendingRole = profile?.pending_role || null;
  const hasActiveSub = profile?.stripe_customer_id && profile?.subscription_status === 'active';

  const isNarrow = useIsNarrow();
  const params = new URLSearchParams(location.search);
  const requestedTab = params.get('tab');
  const activeTab = requestedTab || (isNarrow ? null : 'account');

  function goTab(id) { navigate(`/settings?tab=${id}`); }
  function goProfile(open) { navigate(open ? `/profile?open=${open}` : '/profile?edit=true'); }

  async function handleManageSubscription() {
    const customerId = profile?.stripe_customer_id;
    if (!customerId) return;
    setPortalLoading(true);
    try {
      const { url } = await createBillingPortalSession({
        profileId: profile?._id ? String(profile._id) : (profile?.id ? String(profile.id) : undefined),
        returnUrl: `${window.location.origin}/settings?tab=billing`,
      });
      window.location.href = url;
    } catch {
      setPortalLoading(false);
    }
  }

  // ── Saved card: handle the return trip from the Stripe setup Checkout ────
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const sessionId = p.get('session_id');
    if (p.get('card') === 'success' && sessionId) {
      setCardBusy(true);
      verifyHostCardSetupSession({ sessionId })
        .then(({ cardBrand, cardLast4, orderId }) => {
          setCheckoutReceipt({ type: 'host', orderId, cardBrand, cardLast4 });
        })
        .catch((err) => setCardError(err?.message || "Couldn't confirm your card — please try again."))
        .finally(() => setCardBusy(false));
      navigate('/settings?tab=payments', { replace: true });
    } else if (p.get('card') === 'cancelled') {
      navigate('/settings?tab=payments', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  async function handleAddCard() {
    setCardBusy(true);
    setCardError('');
    try {
      const base = `${window.location.origin}/settings`;
      const { url } = await createHostCardSetupSession({
        successUrl: `${base}?tab=payments&card=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${base}?tab=payments&card=cancelled`,
      });
      if (url) window.location.href = url;
    } catch (err) {
      setCardError(err?.message || "Couldn't start card setup — please try again.");
      setCardBusy(false);
    }
  }

  async function handleRemoveCard() {
    setCardBusy(true);
    setCardError('');
    try {
      await removeSavedCard({ profileId: userId });
    } catch (err) {
      setCardError(err?.message || "Couldn't remove that card — please try again.");
    } finally {
      setCardBusy(false);
    }
  }

  // ── Tax info: live Stripe Connect requirements (same account as Payout Method) ──
  useEffect(() => {
    if (activeTab !== 'payments' || profile?.role !== 'creator' || !profile?.stripe_connect_account_id) return;
    getConnectAccountStatus({ profileId: userId }).then(setConnectStatus).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, profile?.stripe_connect_account_id]);

  async function handleCompleteTaxInfo() {
    setConnectBusy(true);
    try {
      const appBase = window.location.origin;
      const { url } = await createConnectOnboardingLink({
        profileId: userId,
        refreshUrl: `${appBase}/settings?tab=payments`,
        returnUrl: `${appBase}/settings?tab=payments`,
      });
      if (url) window.location.href = url;
    } catch {
      setConnectBusy(false);
    }
  }

  // ── Blocked people ────────────────────────────────────────────────────────
  const blockedIds = profile?.blocked_user_ids ?? [];
  const blockedProfiles = (allProfiles ?? []).filter((p) => blockedIds.includes(String(p._id)));
  const blockResults = blockQuery.trim().length >= 2
    ? (allProfiles ?? [])
      .filter((p) => String(p._id) !== userId && !blockedIds.includes(String(p._id)) && p.full_name?.toLowerCase().includes(blockQuery.trim().toLowerCase()))
      .slice(0, 5)
    : [];

  async function handleBlock(targetId) {
    setBlockQuery('');
    await blockUserMutation({ profileId: userId, targetId });
  }
  async function handleUnblock(targetId) {
    await unblockUserMutation({ profileId: userId, targetId });
  }

  const roleAction = pendingRole
    ? { label: `${pendingRole === 'host' ? 'Host' : 'Creator'} access pending review`, disabled: true }
    : profile?.role === 'host'
      ? ((isAdmin || isCreatorVerified)
        ? { label: 'Switch to Creator View', onClick: async () => { await updateProfile({ role: 'creator' }); navigate('/explore'); } }
        : { label: 'Sign up as Creator', onClick: () => goProfile('switchrole') })
      : (isAdmin || isHostVerified)
        ? { label: 'Switch to Host View', onClick: async () => { await updateProfile({ role: 'host' }); navigate('/host'); } }
        : { label: 'Sign up as Host', onClick: () => goProfile('switchrole') };

  const NAV_GROUPS = [
    {
      label: 'Account',
      items: [
        { id: 'account', label: 'Personal info', icon: <UserIcon /> },
        { id: 'security', label: 'Login & security', icon: <ShieldIcon /> },
        { id: 'privacy', label: 'Privacy', icon: <HandIcon /> },
        { id: 'notifications', label: 'Notifications', icon: <BellIcon /> },
      ],
    },
    {
      label: 'Membership',
      items: [
        { id: 'billing', label: 'Plan & billing', icon: <SparkleIcon /> },
        { id: 'payments', label: 'Payments & tax', icon: <CreditCardIcon /> },
      ],
    },
    {
      label: 'Preferences',
      items: [
        { id: 'language', label: 'Language & region', icon: <GlobeIcon /> },
      ],
    },
  ];

  const QUICK_LINKS = [
    isAdmin
      ? { label: 'Admin dashboard', onClick: () => navigate('/admin') }
      : { label: 'Setup checklist', onClick: reopenChecklist },
    { label: 'AI Assistant', onClick: () => goProfile('aiassistant') },
    { label: 'Demo collab tour', onClick: () => { localStorage.removeItem('collabnb_demo_dismissed'); navigate('/collabs'); } },
  ].filter(Boolean);

  const activeLabel = NAV_GROUPS.flatMap(g => g.items).find(i => i.id === activeTab)?.label || 'Settings';

  const showSidebar = !isNarrow || !activeTab;
  const showContent = !isNarrow || !!activeTab;

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '1.5rem 1.5rem 5rem' }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        {isNarrow && activeTab ? (
          <button
            onClick={() => navigate('/settings')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', fontSize: '0.85rem', fontWeight: 600, padding: '0.4rem 0', fontFamily: 'var(--font-body)' }}
          >
            <ChevronL /> {activeLabel}
          </button>
        ) : (
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--ink)', margin: 0, letterSpacing: '-0.02em' }}>Settings</h1>
        )}
        <button
          onClick={() => navigate('/profile')}
          style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate)', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(60,87,89,0.15)', borderRadius: 999, padding: '0.5rem 1.1rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          Done
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '280px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        {showSidebar && (
          <div className="glass-card" style={{ padding: '1rem', position: isNarrow ? 'static' : 'sticky', top: '1.5rem' }}>
            {NAV_GROUPS.map((group) => (
              <div key={group.label} style={{ marginBottom: '0.75rem' }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0.5rem 0.875rem 0.35rem' }}>{group.label}</p>
                {group.items.map((item) => (
                  <NavRow
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    badge={item.badge}
                    active={activeTab === item.id}
                    showChevron={isNarrow}
                    onClick={() => goTab(item.id)}
                  />
                ))}
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--hairline)', margin: '0.5rem 0.875rem 0', paddingTop: '0.5rem' }}>
              {QUICK_LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={link.onClick}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.6rem 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate)' }}
                >
                  {link.label} <span style={{ color: 'var(--stone)' }}><ChevronR /></span>
                </button>
              ))}
              <button
                onClick={signOut}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600, color: '#ef4444' }}
              >
                <SignOutIcon /> Log out
              </button>
            </div>
          </div>
        )}

        {/* ── Content ──────────────────────────────────────────────────── */}
        {showContent && activeTab && (
          <div className="glass-card" style={{ padding: '1.75rem clamp(1.25rem, 4vw, 2rem)' }}>
            {activeTab === 'account' && (
              <>
                <FieldRow label="Legal name" value={profile?.full_name || 'Not set'} action="Edit" onAction={() => goProfile()} />
                <FieldRow label="Email" value={profile?.email} action="Manage" onAction={() => openUserProfile?.()} />
                <FieldRow
                  label={`Account type — ${profile?.role === 'host' ? 'Host' : 'Creator'}`}
                  value={profile?.role === 'host' ? (isHostVerified ? 'Verified host' : 'Not yet verified as host') : (isCreatorVerified ? 'Verified creator' : 'Not yet verified as creator')}
                  action={roleAction.disabled ? undefined : roleAction.label}
                  onAction={roleAction.onClick}
                  comingSoon={roleAction.disabled}
                />
                <FieldRow label="Verification" value="Submit a re-verification request" action="Request" onAction={() => goProfile('verification')} />
                <FieldRow label="Contracts" value="View and manage your saved contracts" action="Open" onAction={() => goProfile('contracts')} />
                {profile?.role === 'creator' && (
                  <FieldRow label="My metrics" value="Update your follower & engagement stats" action="Open" onAction={() => goProfile('metrics')} />
                )}
                {profile?.role === 'creator' && (
                  <FieldRow
                    label="Creator tier"
                    value={profile?.pending_tier ? `${profile.pending_tier} — pending admin review` : `Currently ${profile?.tier || 'unset'} — request a change if you've grown`}
                    action={profile?.pending_tier ? undefined : 'Request change'}
                    onAction={() => goProfile()}
                    comingSoon={!!profile?.pending_tier}
                  />
                )}
                <FieldRow label="Location settings" value="Set your city & country for the globe map" action="Edit" onAction={() => goProfile('location')} />
              </>
            )}

            {activeTab === 'security' && (
              <>
                <SectionLabel>Login</SectionLabel>
                <div style={{ background: 'rgba(209,235,219,0.15)', border: '1px solid rgba(74,155,127,0.15)', borderRadius: '1rem', padding: '1.1rem 1.25rem', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink)', margin: '0 0 0.35rem' }}>Password, passkeys & two-factor authentication</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--sage)', margin: '0 0 0.9rem', lineHeight: 1.5 }}>Manage how you sign in, including your password, passkeys, and active sessions.</p>
                  <button className="btn-primary" style={{ fontSize: '0.82rem', padding: '0.55rem 1.25rem' }} onClick={() => openUserProfile?.()}>Open account security</button>
                </div>
                <SectionLabel>Session</SectionLabel>
                <FieldRow label="Log out" value="Sign out of Collabnb on this device" action="Log out" onAction={signOut} danger />
              </>
            )}

            {activeTab === 'privacy' && (
              <>
                {profile?.role === 'creator' && (
                  <>
                    <SectionLabel>Visibility</SectionLabel>
                    <ToggleRow
                      label={profile?.profile_visible !== false ? 'Profile is visible to hosts' : 'Profile is hidden'}
                      sublabel={profile?.profile_visible !== false
                        ? 'Hosts can find you on the Creators page and message you.'
                        : "You won't appear in host search and hosts can't message you. Existing conversations stay open."}
                      checked={profile?.profile_visible !== false}
                      onChange={() => updateProfile({ profile_visible: !(profile?.profile_visible !== false) })}
                    />
                  </>
                )}
                <SectionLabel>Controls</SectionLabel>
                <ToggleRow
                  label="Show my activity to hosts"
                  sublabel="Applications, response time, and recent activity"
                  checked={profile?.show_activity_to_hosts !== false}
                  onChange={() => updateProfile({ show_activity_to_hosts: !(profile?.show_activity_to_hosts !== false) })}
                />
                <SectionLabel>Blocked people</SectionLabel>
                <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    value={blockQuery}
                    onChange={(e) => setBlockQuery(e.target.value)}
                    placeholder="Search by name to block someone…"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.85rem', border: '1px solid rgba(60,87,89,0.18)', borderRadius: '0.75rem', fontSize: '0.85rem', color: 'var(--ink)', background: 'rgba(247,245,242,0.7)', fontFamily: 'var(--font-body)', outline: 'none' }}
                  />
                  {blockResults.length > 0 && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20, background: '#fff', border: '1px solid rgba(60,87,89,0.15)', borderRadius: '0.75rem', boxShadow: '0 8px 24px rgba(25,37,36,0.12)', overflow: 'hidden' }}>
                      {blockResults.map((p) => (
                        <button
                          key={p._id}
                          onClick={() => handleBlock(String(p._id))}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.85rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)' }}
                        >
                          {p.avatar_url && <img src={p.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)' }}>{p.full_name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--sage)', marginLeft: 'auto' }}>Block</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {blockedProfiles.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--sage)', margin: '0 0 0.5rem' }}>You haven't blocked anyone. Blocked people can't message you or see your profile.</p>
                ) : (
                  blockedProfiles.map((p) => (
                    <FieldRow key={p._id} label={p.full_name} value="Blocked — can't message you or view your profile" action="Unblock" onAction={() => handleUnblock(String(p._id))} danger />
                  ))
                )}
                <SectionLabel>Privacy Policy</SectionLabel>
                <button
                  onClick={() => setPolicyExpanded((e) => !e)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(60,87,89,0.06)', border: '1px solid rgba(60,87,89,0.12)', borderRadius: '999px', padding: '0.3rem 0.75rem 0.3rem 0.6rem', margin: '0 0 0.75rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                >
                  <span style={{ fontSize: '0.7rem', color: 'var(--slate)', transform: policyExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 200ms ease', display: 'inline-flex' }}><ChevronR /></span>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--slate)' }}>{policyExpanded ? 'Collapse policy' : 'Read privacy policy'}</span>
                </button>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      fontSize: '0.83rem', color: 'var(--slate)', lineHeight: 1.7,
                      maxHeight: policyExpanded ? '3000px' : '92px',
                      overflow: 'hidden',
                      transition: 'max-height 420ms var(--ease-out-quart, ease)',
                    }}
                  >
                    <p><strong>Effective Date:</strong> July 15, 2026</p>
                    <p>Collabnb ("we," "our," "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>
                    <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', margin: '1.1rem 0 0.4rem' }}>Information We Collect</h5>
                    <p>We collect personal information you provide directly, such as your name, email address, profile details, and social media handles. We also automatically collect usage data, cookies, and device information when you interact with our platform.</p>
                    <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', margin: '1.1rem 0 0.4rem' }}>How We Use Your Information</h5>
                    <p>Your information is used to operate and improve Collabnb, facilitate collaborations between creators and hosts, send notifications and updates, and ensure platform safety. We never sell your personal data to third parties.</p>
                    <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', margin: '1.1rem 0 0.4rem' }}>Data Sharing</h5>
                    <p>We may share your information with service providers who help us operate the platform (e.g., hosting, analytics), as required by law, or with your explicit consent.</p>
                    <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', margin: '1.1rem 0 0.4rem' }}>Your Rights</h5>
                    <p>You may access, update, or delete your personal information at any time through these settings. Contact us at support@collabnb.com for assistance.</p>
                    <p style={{ marginTop: '0.9rem' }}>For the full Privacy Policy, visit <a href="https://collabnb.com/privacy" style={{ color: 'var(--slate)', fontWeight: 600, textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">collabnb.com/privacy</a>.</p>
                  </div>
                  {!policyExpanded && (
                    <div
                      onClick={() => setPolicyExpanded(true)}
                      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', cursor: 'pointer', background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.94) 75%)' }}
                    />
                  )}
                </div>
              </>
            )}

            {activeTab === 'notifications' && (
              <>
                <SectionLabel>Preferences</SectionLabel>
                {[
                  { key: 'messages', label: 'Messages', desc: 'New messages and replies in your inbox' },
                  { key: 'contractUpdates', label: 'Contract updates', desc: 'When a contract is signed, updated, or needs action' },
                  { key: 'newListings', label: 'New listings', desc: 'Properties that match your preferences' },
                  { key: 'collabReminders', label: 'Collab reminders', desc: 'Upcoming deadlines and pending deliverables' },
                  { key: 'marketing', label: 'Marketing', desc: 'Product updates, tips, and Collabnb news' },
                ].map((item) => (
                  <ToggleRow
                    key={item.key}
                    label={item.label}
                    sublabel={item.desc}
                    checked={notifPrefs[item.key]}
                    onChange={() => toggleNotif(item.key)}
                  />
                ))}
              </>
            )}

            {activeTab === 'billing' && (
              <>
                <SectionLabel>Plan</SectionLabel>
                <SubscriptionCard
                  profile={profile}
                  hasActiveSub={hasActiveSub}
                  portalLoading={portalLoading}
                  onUpgrade={openSubModal}
                  onManage={handleManageSubscription}
                />
                {profile?.role !== 'host' && referralStats?.code && (
                  <>
                    <SectionLabel>Referral code</SectionLabel>
                    <div style={{ background: 'rgba(209,235,219,0.15)', border: '1px solid rgba(74,155,127,0.2)', borderRadius: '1rem', padding: '1rem 1.1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.08em', background: 'rgba(25,37,36,0.05)', padding: '0.3rem 0.75rem', borderRadius: '0.5rem' }}>{referralStats.code}</span>
                        <button onClick={() => navigator.clipboard?.writeText(referralStats.code)} style={{ background: 'none', border: '1.5px solid rgba(25,37,36,0.15)', borderRadius: '0.5rem', cursor: 'pointer', padding: '0.3rem 0.6rem', fontSize: '0.72rem', color: 'var(--slate)', fontWeight: 600, fontFamily: 'var(--font-body)' }}>Copy</button>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--sage)' }}>
                        <span><strong style={{ color: 'var(--ink)' }}>{referralStats.signups_rewarded || 0}</strong> / {referralStats.max_uses || 12} signups used</span>
                        {(referralStats.collab_bonuses_earned || 0) > 0 && <span><strong style={{ color: '#4A9B7F' }}>{referralStats.collab_bonuses_earned}</strong> collab bonus{referralStats.collab_bonuses_earned !== 1 ? 'es' : ''} earned</span>}
                        {(profile?.free_months_balance || 0) > 0 && <span style={{ color: '#4A9B7F', fontWeight: 600 }}>+{profile.free_months_balance} free month{profile.free_months_balance !== 1 ? 's' : ''} balance</span>}
                      </div>
                      <p style={{ fontSize: '0.74rem', color: 'var(--sage)', margin: '0.6rem 0 0', lineHeight: 1.5 }}>Share your code. Both you and new members get 1 free month on signup, +1 more when they complete their first collab.</p>
                    </div>
                  </>
                )}
                {profile?.role === 'creator' && (
                  <>
                    <SectionLabel>Pitches</SectionLabel>
                    <PitchCounter serverPitchCount={serverPitchCount} />
                  </>
                )}
                {profile?.role === 'host' && (hostBilling?.length ?? 0) > 0 && (
                  <>
                    <SectionLabel>Billing history</SectionLabel>
                    <HostBillingLedger ledger={hostBilling} />
                  </>
                )}
              </>
            )}

            {activeTab === 'payments' && (
              <>
                <SectionLabel>Payouts</SectionLabel>
                {profile?.role === 'creator' ? (
                  <FieldRow label="Payout method" value="Connect Stripe or Wise to receive payouts" action="Manage" onAction={() => goProfile('payout')} />
                ) : (
                  <FieldRow label="Payout method" value="Payout methods are for creators receiving payments" comingSoon />
                )}
                <SectionLabel>Payment methods</SectionLabel>
                {profile?.role === 'host' ? (
                  <>
                    <FieldRow
                      label={profile?.stripe_default_payment_method_id
                        ? `${profile.stripe_card_brand ? profile.stripe_card_brand[0].toUpperCase() + profile.stripe_card_brand.slice(1) : 'Card'} •••• ${profile.stripe_card_last4 || '····'}`
                        : 'No card on file'}
                      value="Charged automatically when a collab you host completes"
                      action={cardBusy ? 'Working…' : (profile?.stripe_default_payment_method_id ? 'Update' : 'Add card')}
                      onAction={cardBusy ? undefined : handleAddCard}
                    />
                    {profile?.stripe_default_payment_method_id && (
                      <FieldRow label="Remove card" value="You'll need to add a new one before publishing another listing" action={cardBusy ? 'Working…' : 'Remove'} onAction={cardBusy ? undefined : handleRemoveCard} danger />
                    )}
                    {cardError && <p style={{ fontSize: '0.76rem', color: '#dc2626', margin: '0.4rem 0 0' }}>{cardError}</p>}
                  </>
                ) : (
                  <FieldRow label="Saved cards" value="Creators are paid out, not charged — nothing to save here" comingSoon />
                )}
                <SectionLabel>Tax</SectionLabel>
                {profile?.role === 'creator' ? (
                  !profile?.stripe_connect_account_id ? (
                    <FieldRow label="Tax info" value="Set up a Stripe payout method first — tax info is collected as part of that setup" action="Set up payout method" onAction={() => goProfile('payout')} />
                  ) : connectStatus && (connectStatus.currentlyDue.length > 0 || connectStatus.pastDue.length > 0) ? (
                    <FieldRow label="Tax info" value="Stripe needs more information to finish verifying your account" action={connectBusy ? 'Opening…' : 'Complete tax info'} onAction={connectBusy ? undefined : handleCompleteTaxInfo} />
                  ) : connectStatus ? (
                    <FieldRow label="Tax info" value="On file with Stripe as part of your payout account" action="Review" onAction={connectBusy ? undefined : handleCompleteTaxInfo} />
                  ) : (
                    <FieldRow label="Tax info" value="Checking your Stripe account status…" comingSoon />
                  )
                ) : (
                  <FieldRow label="Tax info" value="1099s apply to creators receiving payouts, not hosts" comingSoon />
                )}
              </>
            )}

            {activeTab === 'language' && (
              <>
                <SectionLabel>Preferences</SectionLabel>
                <SelectRow
                  label="Preferred language"
                  value={profile?.preferred_language || 'en'}
                  options={[['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'], ['pt', 'Português']]}
                  onChange={(v) => { i18n.changeLanguage(v); updateProfile({ preferred_language: v }); }}
                />
                <SelectRow
                  label="Currency"
                  value={profile?.preferred_currency || 'USD'}
                  options={[['USD', 'US Dollar ($)'], ['EUR', 'Euro (€)'], ['GBP', 'British Pound (£)'], ['CAD', 'Canadian Dollar (C$)'], ['AUD', 'Australian Dollar (A$)']]}
                  onChange={(v) => updateProfile({ preferred_currency: v })}
                />
                <SelectRow
                  label="Timezone"
                  value={profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                  options={Array.from(new Set([Intl.DateTimeFormat().resolvedOptions().timeZone, 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney'])).map((tz) => [tz, tz])}
                  onChange={(v) => updateProfile({ timezone: v })}
                />
              </>
            )}
          </div>
        )}
      </div>

      <ReceiptCheckoutOverlay receipt={checkoutReceipt} onClose={() => setCheckoutReceipt(null)} />
    </div>
  );
}

// ─── Plan & billing sub-components ──────────────────────────────────────────
function SubscriptionCard({ profile, hasActiveSub, portalLoading, onUpgrade, onManage }) {
  const isFounder = profile?.is_founder === true;
  const expiresAt = profile?.subscription_expires_at;
  const isActive = profile?.subscription_status === 'active' && (!expiresAt || Date.now() < expiresAt);
  const isExpired = profile?.subscription_status === 'active' && expiresAt && Date.now() >= expiresAt;
  const isPastDue = profile?.subscription_status === 'past_due';
  const isYearly = profile?.subscription_tier === 'yearly';
  const isTrialActive = profile?.access_state !== 'limited';
  const trialDaysLeft = profile?.trial_ends_at
    ? Math.max(0, Math.ceil((profile.trial_ends_at - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  if (isFounder) {
    const monthsSincePaidStart = profile?.trial_ends_at
      ? Math.max(0, (Date.now() - profile.trial_ends_at) / (30 * 24 * 60 * 60 * 1000))
      : 0;
    const lifetimeSavings = Math.round(monthsSincePaidStart * 10);
    return (
      <div style={{ borderRadius: '1rem', padding: '1.1rem 1.25rem', background: 'linear-gradient(135deg, rgba(212,168,67,0.1) 0%, rgba(212,168,67,0.04) 100%)', border: '1px solid rgba(212,168,67,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'rgba(212,168,67,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 16 16" width="15" height="15" fill="#D4A843"><path d="M8 1.5l1.67 3.38 3.73.54-2.7 2.63.64 3.72L8 9.77l-3.34 1.76.64-3.72L2.6 5.42l3.73-.54z"/></svg>
          </div>
          <div>
            <p style={{ fontSize: '0.86rem', fontWeight: 700, color: '#A87820', margin: 0 }}>Founding Member</p>
            <p style={{ fontSize: '0.76rem', color: '#C4921A', margin: '0.1rem 0 0' }}>Lifetime free access — all features unlocked</p>
          </div>
        </div>
        {lifetimeSavings > 0 && (
          <p style={{ fontSize: '0.76rem', color: '#A87820', fontWeight: 600, margin: '0.75rem 0 0', paddingTop: '0.75rem', borderTop: '1px solid rgba(212,168,67,0.2)' }}>
            You've saved ${lifetimeSavings} in subscription fees as a Founding Member
          </p>
        )}
      </div>
    );
  }

  if (isActive) {
    const nextDate = expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
    return (
      <div style={{ borderRadius: '1rem', padding: '1.1rem 1.25rem', background: 'rgba(74,155,127,0.06)', border: '1px solid rgba(74,155,127,0.15)', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4A9B7F', flexShrink: 0, display: 'inline-block' }} />
          <p style={{ fontSize: '0.86rem', fontWeight: 700, color: '#2D7A5F', margin: 0 }}>Creator Plus &middot; {isYearly ? 'Annual' : 'Monthly'}</p>
        </div>
        <p style={{ fontSize: '0.76rem', color: 'var(--sage)', margin: 0 }}>{isYearly ? '$60/year' : '$10/month'}{nextDate ? ` · Renews ${nextDate}` : ''}</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {!isYearly && (
            <button onClick={onUpgrade} style={{ fontSize: '0.72rem', fontWeight: 600, color: '#A87820', background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.25)', borderRadius: '999px', padding: '0.3rem 0.85rem', cursor: 'pointer' }}>
              Upgrade to Yearly — save 50%
            </button>
          )}
          <button onClick={onManage} disabled={portalLoading} style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--slate)', background: 'rgba(60,87,89,0.08)', border: 'none', borderRadius: '999px', padding: '0.3rem 0.85rem', cursor: portalLoading ? 'wait' : 'pointer' }}>
            {portalLoading ? 'Opening…' : 'Manage billing'}
          </button>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div style={{ borderRadius: '1rem', padding: '1.1rem 1.25rem', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <p style={{ fontSize: '0.86rem', fontWeight: 700, color: '#dc2626', margin: 0 }}>Plan expired</p>
          <p style={{ fontSize: '0.76rem', color: 'var(--sage)', margin: '0.1rem 0 0' }}>Renew to keep messaging and applying</p>
        </div>
        <button onClick={onUpgrade} style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white', background: '#dc2626', border: 'none', borderRadius: '999px', padding: '0.4rem 1rem', cursor: 'pointer', flexShrink: 0 }}>Renew</button>
      </div>
    );
  }

  if (isPastDue) {
    return (
      <div style={{ borderRadius: '1rem', padding: '1.1rem 1.25rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <p style={{ fontSize: '0.86rem', fontWeight: 700, color: '#dc2626', margin: 0 }}>Payment past due</p>
          <p style={{ fontSize: '0.76rem', color: 'var(--sage)', margin: '0.1rem 0 0' }}>Your last payment failed — update your card to keep your plan active.</p>
        </div>
        <button onClick={onManage} disabled={portalLoading} style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white', background: '#dc2626', border: 'none', borderRadius: '999px', padding: '0.4rem 1rem', cursor: portalLoading ? 'wait' : 'pointer', flexShrink: 0, opacity: portalLoading ? 0.6 : 1 }}>
          {portalLoading ? 'Opening…' : 'Update payment'}
        </button>
      </div>
    );
  }

  if (isTrialActive) {
    return (
      <div style={{ borderRadius: '1rem', padding: '1.1rem 1.25rem', background: 'rgba(209,235,219,0.15)', border: '1px solid rgba(74,155,127,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <p style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--ink)', margin: '0 0 0.1rem' }}>
            Free trial{trialDaysLeft !== null ? ` · ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left` : ''}
          </p>
          <p style={{ fontSize: '0.76rem', color: 'var(--sage)', margin: 0 }}>Full access included — choose a plan before your trial ends.</p>
        </div>
        <button onClick={onUpgrade} style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate)', background: 'rgba(60,87,89,0.08)', border: 'none', borderRadius: '999px', padding: '0.4rem 1rem', cursor: 'pointer', flexShrink: 0 }}>View plans</button>
      </div>
    );
  }

  return (
    <div style={{ borderRadius: '1rem', padding: '1.1rem 1.25rem', border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
      <div>
        <p style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>No active plan</p>
        <p style={{ fontSize: '0.76rem', color: 'var(--sage)', margin: '0.1rem 0 0' }}>Subscribe to keep collaborating</p>
      </div>
      <button onClick={onUpgrade} style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white', background: 'var(--slate)', border: 'none', borderRadius: '999px', padding: '0.4rem 1rem', cursor: 'pointer', flexShrink: 0 }}>Subscribe</button>
    </div>
  );
}

function PitchCounter({ serverPitchCount }) {
  const count = serverPitchCount ?? getPitchCount().count;
  return (
    <div style={{ borderRadius: '1rem', padding: '1rem 1.1rem', background: 'rgba(209,235,219,0.1)', border: '1px solid var(--hairline)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <p style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Pitches used this month</p>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: count >= 10 ? '#ef4444' : 'var(--ink)', margin: 0 }}>{count} / 10</p>
      </div>
      <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(25,37,36,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '999px', width: `${Math.min((count / 10) * 100, 100)}%`, background: count >= 10 ? '#ef4444' : count >= 7 ? '#D4A843' : '#4A9B7F', transition: 'width 400ms ease' }} />
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0.4rem 0 0' }}>Resets on the 1st of each month. Standard applications are unlimited.</p>
    </div>
  );
}

const BILLING_STATUS = {
  paid: { label: 'Paid', color: '#2D7A5F', bg: 'rgba(74,155,127,0.14)' },
  pending: { label: 'Pending', color: '#A87820', bg: 'rgba(212,168,67,0.16)' },
  failed: { label: 'Failed', color: '#dc2626', bg: 'rgba(239,68,68,0.12)' },
  waived: { label: 'Waived', color: 'var(--sage)', bg: 'rgba(60,87,89,0.1)' },
};

function HostBillingLedger({ ledger }) {
  const outstanding = ledger.filter((f) => f.status === 'pending' || f.status === 'failed').reduce((sum, f) => sum + (f.amount || 0), 0);
  return (
    <div>
      {outstanding > 0 && (
        <p style={{ fontSize: '0.76rem', fontWeight: 700, color: '#dc2626', margin: '0 0 0.6rem' }}>${outstanding.toFixed(2)} outstanding</p>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
            <th style={{ textAlign: 'left', padding: '0.3rem 0', fontWeight: 600, color: 'var(--sage)', paddingRight: '1rem' }}>Collab</th>
            <th style={{ textAlign: 'right', padding: '0.3rem 0', fontWeight: 600, color: 'var(--sage)', paddingRight: '1rem' }}>Fee</th>
            <th style={{ textAlign: 'right', padding: '0.3rem 0', fontWeight: 600, color: 'var(--sage)' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((f, i) => {
            const s = BILLING_STATUS[f.status] || BILLING_STATUS.pending;
            const when = f.paid_at || f.created_at;
            return (
              <tr key={f._id} style={{ borderBottom: i < ledger.length - 1 ? '1px solid rgba(60,87,89,0.06)' : 'none' }}>
                <td style={{ padding: '0.45rem 0', color: 'var(--ink)', paddingRight: '1rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.collabTitle || '—'}
                  {when && <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--sage)' }}>{new Date(when).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                </td>
                <td style={{ padding: '0.45rem 0', color: 'var(--slate)', fontWeight: 600, textAlign: 'right', paddingRight: '1rem' }}>
                  {f.method === 'waived' ? '—' : `$${(f.amount || 0).toFixed(2)}`}
                </td>
                <td style={{ padding: '0.45rem 0', textAlign: 'right' }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 700, color: s.color, background: s.bg, borderRadius: '999px', padding: '0.14rem 0.55rem' }}>{s.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
