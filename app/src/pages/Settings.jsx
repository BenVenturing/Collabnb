import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useAction, useMutation } from 'convex/react';
import { useTranslation, Trans } from 'react-i18next';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getPitchCount } from '../lib/pitchCount';
import { COUNTRIES } from '../lib/countries';
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
  const { t } = useTranslation('settings');
  return (
    <div style={{ padding: '1.1rem 0', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '0.92rem', fontWeight: 700, color: comingSoon ? 'var(--sage)' : 'var(--ink)', margin: '0 0 0.2rem' }}>{label}</p>
        {value && <p style={{ fontSize: '0.8rem', color: 'var(--sage)', margin: 0, lineHeight: 1.5 }}>{value}</p>}
      </div>
      {comingSoon ? (
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#A87820', background: 'rgba(212,168,67,0.16)', borderRadius: 999, padding: '0.28rem 0.65rem', whiteSpace: 'nowrap', flexShrink: 0 }}>{t('comingSoon')}</span>
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
  const { t, i18n } = useTranslation('settings');
  const { profile, updateProfile, signOut, openUserProfile } = useAuth();
  const { openModal: openSubModal } = useSubscription();
  const createBillingPortalSession = useAction(api.stripe.createBillingPortalSession);
  const createHostCardSetupSession = useAction(api.stripe.createHostCardSetupSession);
  const verifyHostCardSetupSession = useAction(api.stripe.verifyHostCardSetupSession);
  const removeSavedCard = useAction(api.stripe.removeSavedCard);
  const createConnectOnboardingLink = useAction(api.stripe.createConnectOnboardingLink);
  const getConnectAccountStatus = useAction(api.stripe.getConnectAccountStatus);
  const listBillingHistory = useAction(api.stripe.listBillingHistory);
  const blockUserMutation = useMutation(api.profiles.blockUser);
  const unblockUserMutation = useMutation(api.profiles.unblockUser);
  const [portalLoading, setPortalLoading] = useState(false);
  const [policyExpanded, setPolicyExpanded] = useState(false);
  const [cardBusy, setCardBusy] = useState(false);
  const [cardError, setCardError] = useState('');
  const [checkoutReceipt, setCheckoutReceipt] = useState(null);
  const [connectStatus, setConnectStatus] = useState(null);
  const [connectBusy, setConnectBusy] = useState(false);
  const [billingHistory, setBillingHistory] = useState(null);
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

  // ── Payment history: past paid Stripe invoices (subscription renewals) ──
  useEffect(() => {
    if (activeTab !== 'payments' || !profile?.stripe_customer_id) return;
    listBillingHistory({}).then(setBillingHistory).catch(() => setBillingHistory([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, profile?.stripe_customer_id]);

  function handleViewPastReceipt(invoice) {
    setCheckoutReceipt({
      type: 'creator',
      tier: /year/i.test(invoice.description || '') ? 'yearly' : 'monthly',
      amount: invoice.amount,
      orderId: invoice.id,
      date: invoice.created,
      instant: true,
    });
  }

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
    ? { label: t('roleAction.pendingReview', { role: pendingRole === 'host' ? t('roles.host') : t('roles.creator') }), disabled: true }
    : profile?.role === 'host'
      ? ((isAdmin || isCreatorVerified)
        ? { label: t('roleAction.switchToCreator'), onClick: async () => { await updateProfile({ role: 'creator' }); navigate('/explore'); } }
        : { label: t('roleAction.signUpAsCreator'), onClick: () => goProfile('switchrole') })
      : (isAdmin || isHostVerified)
        ? { label: t('roleAction.switchToHost'), onClick: async () => { await updateProfile({ role: 'host' }); navigate('/host'); } }
        : { label: t('roleAction.signUpAsHost'), onClick: () => goProfile('switchrole') };

  const NAV_GROUPS = [
    {
      label: t('navGroups.account'),
      items: [
        { id: 'account', label: t('nav.personalInfo'), icon: <UserIcon /> },
        { id: 'security', label: t('nav.security'), icon: <ShieldIcon /> },
        { id: 'privacy', label: t('nav.privacy'), icon: <HandIcon /> },
        { id: 'notifications', label: t('nav.notifications'), icon: <BellIcon /> },
      ],
    },
    {
      label: t('navGroups.membership'),
      items: [
        { id: 'billing', label: t('nav.billing'), icon: <SparkleIcon /> },
        { id: 'payments', label: t('nav.payments'), icon: <CreditCardIcon /> },
      ],
    },
    {
      label: t('navGroups.preferences'),
      items: [
        { id: 'language', label: t('nav.language'), icon: <GlobeIcon /> },
      ],
    },
  ];

  const QUICK_LINKS = [
    isAdmin
      ? { label: t('quickLinks.adminDashboard'), onClick: () => navigate('/admin') }
      : { label: t('quickLinks.setupChecklist'), onClick: reopenChecklist },
    { label: t('quickLinks.aiAssistant'), onClick: () => goProfile('aiassistant') },
    { label: t('quickLinks.demoTour'), onClick: () => { localStorage.removeItem('collabnb_demo_dismissed'); navigate('/collabs'); } },
  ].filter(Boolean);

  const activeLabel = NAV_GROUPS.flatMap(g => g.items).find(i => i.id === activeTab)?.label || t('header.title');

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
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--ink)', margin: 0, letterSpacing: '-0.02em' }}>{t('header.title')}</h1>
        )}
        <button
          onClick={() => navigate('/profile')}
          style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate)', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(60,87,89,0.15)', borderRadius: 999, padding: '0.5rem 1.1rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          {t('header.done')}
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
                <SignOutIcon /> {t('logout')}
              </button>
            </div>
          </div>
        )}

        {/* ── Content ──────────────────────────────────────────────────── */}
        {showContent && activeTab && (
          <div className="glass-card" style={{ padding: '1.75rem clamp(1.25rem, 4vw, 2rem)' }}>
            {activeTab === 'account' && (
              <>
                <FieldRow label={t('account.legalName')} value={profile?.full_name || t('account.notSet')} action={t('account.edit')} onAction={() => goProfile()} />
                <FieldRow label={t('account.email')} value={profile?.email} action={t('account.manage')} onAction={() => openUserProfile?.()} />
                <FieldRow
                  label={t('account.accountType', { role: profile?.role === 'host' ? t('roles.host') : t('roles.creator') })}
                  value={profile?.role === 'host' ? (isHostVerified ? t('account.verifiedHost') : t('account.notVerifiedHost')) : (isCreatorVerified ? t('account.verifiedCreator') : t('account.notVerifiedCreator'))}
                  action={roleAction.disabled ? undefined : roleAction.label}
                  onAction={roleAction.onClick}
                  comingSoon={roleAction.disabled}
                />
                <FieldRow label={t('account.verification')} value={t('account.verificationValue')} action={t('account.request')} onAction={() => goProfile('verification')} />
                <FieldRow label={t('account.contracts')} value={t('account.contractsValue')} action={t('account.open')} onAction={() => goProfile('contracts')} />
                {profile?.role === 'creator' && (
                  <FieldRow label={t('account.myMetrics')} value={t('account.myMetricsValue')} action={t('account.open')} onAction={() => goProfile('metrics')} />
                )}
                {profile?.role === 'creator' && (
                  <FieldRow
                    label={t('account.creatorTier')}
                    value={profile?.pending_tier ? t('account.creatorTierPending', { tier: profile.pending_tier }) : t('account.creatorTierCurrent', { tier: profile?.tier || 'unset' })}
                    action={profile?.pending_tier ? undefined : t('account.requestChange')}
                    onAction={() => goProfile()}
                    comingSoon={!!profile?.pending_tier}
                  />
                )}
                <FieldRow label={t('account.locationSettings')} value={t('account.locationSettingsValue')} action={t('account.edit')} onAction={() => goProfile('location')} />
              </>
            )}

            {activeTab === 'security' && (
              <>
                <SectionLabel>{t('security.sectionLogin')}</SectionLabel>
                <div style={{ background: 'rgba(209,235,219,0.15)', border: '1px solid rgba(74,155,127,0.15)', borderRadius: '1rem', padding: '1.1rem 1.25rem', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink)', margin: '0 0 0.35rem' }}>{t('security.loginCardTitle')}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--sage)', margin: '0 0 0.9rem', lineHeight: 1.5 }}>{t('security.loginCardDesc')}</p>
                  <button className="btn-primary" style={{ fontSize: '0.82rem', padding: '0.55rem 1.25rem' }} onClick={() => openUserProfile?.()}>{t('security.openSecurity')}</button>
                </div>
                <SectionLabel>{t('security.sectionSession')}</SectionLabel>
                <FieldRow label={t('logout')} value={t('security.logoutValue')} action={t('logout')} onAction={signOut} danger />
              </>
            )}

            {activeTab === 'privacy' && (
              <>
                {profile?.role === 'creator' && (
                  <>
                    <SectionLabel>{t('privacy.sectionVisibility')}</SectionLabel>
                    <ToggleRow
                      label={profile?.profile_visible !== false ? t('privacy.profileVisible') : t('privacy.profileHidden')}
                      sublabel={profile?.profile_visible !== false
                        ? t('privacy.profileVisibleSub')
                        : t('privacy.profileHiddenSub')}
                      checked={profile?.profile_visible !== false}
                      onChange={() => updateProfile({ profile_visible: !(profile?.profile_visible !== false) })}
                    />
                  </>
                )}
                <SectionLabel>{t('privacy.sectionControls')}</SectionLabel>
                <ToggleRow
                  label={t('privacy.showActivity')}
                  sublabel={t('privacy.showActivitySub')}
                  checked={profile?.show_activity_to_hosts !== false}
                  onChange={() => updateProfile({ show_activity_to_hosts: !(profile?.show_activity_to_hosts !== false) })}
                />
                <SectionLabel>{t('privacy.sectionBlocked')}</SectionLabel>
                <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    value={blockQuery}
                    onChange={(e) => setBlockQuery(e.target.value)}
                    placeholder={t('privacy.blockSearchPlaceholder')}
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
                          <span style={{ fontSize: '0.7rem', color: 'var(--sage)', marginLeft: 'auto' }}>{t('privacy.block')}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {blockedProfiles.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--sage)', margin: '0 0 0.5rem' }}>{t('privacy.noBlocked')}</p>
                ) : (
                  blockedProfiles.map((p) => (
                    <FieldRow key={p._id} label={p.full_name} value={t('privacy.blockedValue')} action={t('privacy.unblock')} onAction={() => handleUnblock(String(p._id))} danger />
                  ))
                )}
                <SectionLabel>{t('privacy.sectionPolicy')}</SectionLabel>
                <button
                  onClick={() => setPolicyExpanded((e) => !e)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(60,87,89,0.06)', border: '1px solid rgba(60,87,89,0.12)', borderRadius: '999px', padding: '0.3rem 0.75rem 0.3rem 0.6rem', margin: '0 0 0.75rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                >
                  <span style={{ fontSize: '0.7rem', color: 'var(--slate)', transform: policyExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 200ms ease', display: 'inline-flex' }}><ChevronR /></span>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--slate)' }}>{policyExpanded ? t('privacy.collapsePolicy') : t('privacy.readPolicy')}</span>
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
                    <p><strong>{t('privacy.policy.effectiveDate')}</strong></p>
                    <p>{t('privacy.policy.intro')}</p>
                    <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', margin: '1.1rem 0 0.4rem' }}>{t('privacy.policy.collectHeading')}</h5>
                    <p>{t('privacy.policy.collectBody')}</p>
                    <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', margin: '1.1rem 0 0.4rem' }}>{t('privacy.policy.useHeading')}</h5>
                    <p>{t('privacy.policy.useBody')}</p>
                    <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', margin: '1.1rem 0 0.4rem' }}>{t('privacy.policy.sharingHeading')}</h5>
                    <p>{t('privacy.policy.sharingBody')}</p>
                    <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', margin: '1.1rem 0 0.4rem' }}>{t('privacy.policy.rightsHeading')}</h5>
                    <p>{t('privacy.policy.rightsBody')}</p>
                    <p style={{ marginTop: '0.9rem' }}>
                      <Trans i18nKey="settings:privacy.policy.fullPolicy" t={t} values={{ link: 'collabnb.com/privacy' }}>
                        For the full Privacy Policy, visit <a href="https://collabnb.com/privacy" style={{ color: 'var(--slate)', fontWeight: 600, textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">{{ link: 'collabnb.com/privacy' }}</a>.
                      </Trans>
                    </p>
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
                <SectionLabel>{t('notifications.sectionPreferences')}</SectionLabel>
                {[
                  { key: 'messages', label: t('notifications.messages'), desc: t('notifications.messagesDesc') },
                  { key: 'contractUpdates', label: t('notifications.contractUpdates'), desc: t('notifications.contractUpdatesDesc') },
                  { key: 'newListings', label: t('notifications.newListings'), desc: t('notifications.newListingsDesc') },
                  { key: 'collabReminders', label: t('notifications.collabReminders'), desc: t('notifications.collabRemindersDesc') },
                  { key: 'marketing', label: t('notifications.marketing'), desc: t('notifications.marketingDesc') },
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
                <SectionLabel>{t('billing.sectionPlan')}</SectionLabel>
                <SubscriptionCard
                  profile={profile}
                  hasActiveSub={hasActiveSub}
                  portalLoading={portalLoading}
                  onUpgrade={openSubModal}
                  onManage={handleManageSubscription}
                />
                {profile?.role !== 'host' && referralStats?.code && (
                  <>
                    <SectionLabel>{t('billing.sectionReferralCode')}</SectionLabel>
                    <div style={{ background: 'rgba(209,235,219,0.15)', border: '1px solid rgba(74,155,127,0.2)', borderRadius: '1rem', padding: '1rem 1.1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.08em', background: 'rgba(25,37,36,0.05)', padding: '0.3rem 0.75rem', borderRadius: '0.5rem' }}>{referralStats.code}</span>
                        <button onClick={() => navigator.clipboard?.writeText(referralStats.code)} style={{ background: 'none', border: '1.5px solid rgba(25,37,36,0.15)', borderRadius: '0.5rem', cursor: 'pointer', padding: '0.3rem 0.6rem', fontSize: '0.72rem', color: 'var(--slate)', fontWeight: 600, fontFamily: 'var(--font-body)' }}>{t('billing.copy')}</button>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--sage)' }}>
                        <span>
                          <Trans i18nKey="settings:billing.signupsUsed" t={t} values={{ used: referralStats.signups_rewarded || 0, max: referralStats.max_uses || 6 }}>
                            <strong style={{ color: 'var(--ink)' }}>{{ used: referralStats.signups_rewarded || 0 }}</strong> / {{ max: referralStats.max_uses || 6 }} signups used
                          </Trans>
                        </span>
                        {(profile?.free_months_balance || 0) > 0 && (
                          <span style={{ color: '#4A9B7F', fontWeight: 600 }}>{t('billing.freeMonthsBalance', { count: profile.free_months_balance })}</span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.74rem', color: 'var(--sage)', margin: '0.6rem 0 0', lineHeight: 1.5 }}>{t('billing.referralDesc')}</p>
                    </div>
                  </>
                )}
                <SectionLabel>{t('billing.sectionAmbassador')}</SectionLabel>
                <AmbassadorLookup />
                {profile?.role === 'creator' && (
                  <>
                    <SectionLabel>{t('billing.sectionPitches')}</SectionLabel>
                    <PitchCounter serverPitchCount={serverPitchCount} />
                  </>
                )}
                {profile?.role === 'host' && (hostBilling?.length ?? 0) > 0 && (
                  <>
                    <SectionLabel>{t('billing.sectionBillingHistory')}</SectionLabel>
                    <HostBillingLedger ledger={hostBilling} />
                  </>
                )}
              </>
            )}

            {activeTab === 'payments' && (
              <>
                <SectionLabel>{t('payments.sectionPayouts')}</SectionLabel>
                {profile?.role === 'creator' ? (
                  <FieldRow label={t('payments.payoutMethod')} value={t('payments.payoutMethodCreatorValue')} action={t('account.manage')} onAction={() => goProfile('payout')} />
                ) : (
                  <FieldRow label={t('payments.payoutMethod')} value={t('payments.payoutMethodHostValue')} comingSoon />
                )}
                <SectionLabel>{t('payments.sectionPaymentMethods')}</SectionLabel>
                {profile?.role === 'host' ? (
                  <>
                    <FieldRow
                      label={profile?.stripe_default_payment_method_id
                        ? `${profile.stripe_card_brand ? profile.stripe_card_brand[0].toUpperCase() + profile.stripe_card_brand.slice(1) : 'Card'} •••• ${profile.stripe_card_last4 || '····'}`
                        : t('payments.noCardOnFile')}
                      value={t('payments.cardValue')}
                      action={cardBusy ? t('payments.working') : (profile?.stripe_default_payment_method_id ? t('payments.update') : t('payments.addCard'))}
                      onAction={cardBusy ? undefined : handleAddCard}
                    />
                    {profile?.stripe_default_payment_method_id && (
                      <FieldRow label={t('payments.removeCard')} value={t('payments.removeCardValue')} action={cardBusy ? t('payments.working') : t('payments.remove')} onAction={cardBusy ? undefined : handleRemoveCard} danger />
                    )}
                    {cardError && <p style={{ fontSize: '0.76rem', color: '#dc2626', margin: '0.4rem 0 0' }}>{cardError}</p>}
                  </>
                ) : (
                  <FieldRow label={t('payments.savedCardsCreator')} value={t('payments.savedCardsCreatorValue')} comingSoon />
                )}
                <SectionLabel>{t('payments.sectionTax')}</SectionLabel>
                {profile?.role === 'creator' ? (
                  !profile?.stripe_connect_account_id ? (
                    <FieldRow label={t('payments.taxInfo')} value={t('payments.taxSetupFirstValue')} action={t('payments.setUpPayoutMethod')} onAction={() => goProfile('payout')} />
                  ) : connectStatus && (connectStatus.currentlyDue.length > 0 || connectStatus.pastDue.length > 0) ? (
                    <FieldRow label={t('payments.taxInfo')} value={t('payments.taxNeedsInfoValue')} action={connectBusy ? t('billing.subscription.opening') : t('payments.completeTaxInfo')} onAction={connectBusy ? undefined : handleCompleteTaxInfo} />
                  ) : connectStatus ? (
                    <FieldRow label={t('payments.taxInfo')} value={t('payments.taxOnFileValue')} action={t('payments.review')} onAction={connectBusy ? undefined : handleCompleteTaxInfo} />
                  ) : (
                    <FieldRow label={t('payments.taxInfo')} value={t('payments.taxCheckingValue')} comingSoon />
                  )
                ) : (
                  <FieldRow label={t('payments.taxInfo')} value={t('payments.taxHostValue')} comingSoon />
                )}
                {(billingHistory?.length ?? 0) > 0 && (
                  <>
                    <SectionLabel>{t('payments.sectionHistory')}</SectionLabel>
                    <div>
                      {billingHistory.map((inv, i) => (
                        <button
                          key={inv.id}
                          onClick={() => handleViewPastReceipt(inv)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                            background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                            padding: '0.6rem 0', borderBottom: i < billingHistory.length - 1 ? '1px solid rgba(60,87,89,0.06)' : 'none',
                          }}
                        >
                          <span style={{ fontSize: '0.82rem', color: 'var(--ink)', fontWeight: 600 }}>
                            {new Date(inv.periodStart || inv.created).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </span>
                          <span style={{ fontSize: '0.82rem', color: 'var(--slate)', fontWeight: 600 }}>${inv.amount.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {activeTab === 'language' && (
              <>
                <SectionLabel>{t('language.sectionPreferences')}</SectionLabel>
                <SelectRow
                  label={t('language.preferredLanguage')}
                  value={profile?.preferred_language || 'en'}
                  options={[
                    ['en', `🇺🇸 ${t('language.languages.en')}`],
                    ['es', `🇪🇸 ${t('language.languages.es')}`],
                    ['fr', `🇫🇷 ${t('language.languages.fr')}`],
                    ['de', `🇩🇪 ${t('language.languages.de')}`],
                    ['pt', `🇵🇹 ${t('language.languages.pt')}`],
                  ]}
                  onChange={(v) => { i18n.changeLanguage(v); updateProfile({ preferred_language: v }); }}
                />
                <SelectRow
                  label={t('language.currency')}
                  value={profile?.preferred_currency || 'USD'}
                  options={[
                    ['USD', t('language.currencies.USD')],
                    ['EUR', t('language.currencies.EUR')],
                    ['GBP', t('language.currencies.GBP')],
                    ['CAD', t('language.currencies.CAD')],
                    ['AUD', t('language.currencies.AUD')],
                  ]}
                  onChange={(v) => updateProfile({ preferred_currency: v })}
                />
                <SelectRow
                  label={t('language.timezone')}
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
  const { t } = useTranslation('settings');
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
            <p style={{ fontSize: '0.86rem', fontWeight: 700, color: '#A87820', margin: 0 }}>{t('billing.subscription.founderTitle')}</p>
            <p style={{ fontSize: '0.76rem', color: '#C4921A', margin: '0.1rem 0 0' }}>{t('billing.subscription.founderSub')}</p>
          </div>
        </div>
        {lifetimeSavings > 0 && (
          <p style={{ fontSize: '0.76rem', color: '#A87820', fontWeight: 600, margin: '0.75rem 0 0', paddingTop: '0.75rem', borderTop: '1px solid rgba(212,168,67,0.2)' }}>
            {t('billing.subscription.founderSavings', { amount: lifetimeSavings })}
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
          <p style={{ fontSize: '0.86rem', fontWeight: 700, color: '#2D7A5F', margin: 0 }}>{isYearly ? t('billing.subscription.planAnnual') : t('billing.subscription.planMonthly')}</p>
        </div>
        <p style={{ fontSize: '0.76rem', color: 'var(--sage)', margin: 0 }}>{isYearly ? t('billing.subscription.priceAnnual') : t('billing.subscription.priceMonthly')}{nextDate ? t('billing.subscription.renews', { date: nextDate }) : ''}</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {!isYearly && (
            <button onClick={onUpgrade} style={{ fontSize: '0.72rem', fontWeight: 600, color: '#A87820', background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.25)', borderRadius: '999px', padding: '0.3rem 0.85rem', cursor: 'pointer' }}>
              {t('billing.subscription.upgradeYearly')}
            </button>
          )}
          <button onClick={onManage} disabled={portalLoading} style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--slate)', background: 'rgba(60,87,89,0.08)', border: 'none', borderRadius: '999px', padding: '0.3rem 0.85rem', cursor: portalLoading ? 'wait' : 'pointer' }}>
            {portalLoading ? t('billing.subscription.opening') : t('billing.subscription.manageBilling')}
          </button>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div style={{ borderRadius: '1rem', padding: '1.1rem 1.25rem', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <p style={{ fontSize: '0.86rem', fontWeight: 700, color: '#dc2626', margin: 0 }}>{t('billing.subscription.planExpired')}</p>
          <p style={{ fontSize: '0.76rem', color: 'var(--sage)', margin: '0.1rem 0 0' }}>{t('billing.subscription.planExpiredDesc')}</p>
        </div>
        <button onClick={onUpgrade} style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white', background: '#dc2626', border: 'none', borderRadius: '999px', padding: '0.4rem 1rem', cursor: 'pointer', flexShrink: 0 }}>{t('billing.subscription.renew')}</button>
      </div>
    );
  }

  if (isPastDue) {
    return (
      <div style={{ borderRadius: '1rem', padding: '1.1rem 1.25rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <p style={{ fontSize: '0.86rem', fontWeight: 700, color: '#dc2626', margin: 0 }}>{t('billing.subscription.pastDue')}</p>
          <p style={{ fontSize: '0.76rem', color: 'var(--sage)', margin: '0.1rem 0 0' }}>{t('billing.subscription.pastDueDesc')}</p>
        </div>
        <button onClick={onManage} disabled={portalLoading} style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white', background: '#dc2626', border: 'none', borderRadius: '999px', padding: '0.4rem 1rem', cursor: portalLoading ? 'wait' : 'pointer', flexShrink: 0, opacity: portalLoading ? 0.6 : 1 }}>
          {portalLoading ? t('billing.subscription.opening') : t('billing.subscription.updatePayment')}
        </button>
      </div>
    );
  }

  if (isTrialActive) {
    return (
      <div style={{ borderRadius: '1rem', padding: '1.1rem 1.25rem', background: 'rgba(209,235,219,0.15)', border: '1px solid rgba(74,155,127,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <p style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--ink)', margin: '0 0 0.1rem' }}>
            {t('billing.subscription.freeTrial')}{trialDaysLeft !== null ? t('billing.subscription.freeTrialDays', { count: trialDaysLeft }) : ''}
          </p>
          <p style={{ fontSize: '0.76rem', color: 'var(--sage)', margin: 0 }}>{t('billing.subscription.trialDesc')}</p>
        </div>
        <button onClick={onUpgrade} style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate)', background: 'rgba(60,87,89,0.08)', border: 'none', borderRadius: '999px', padding: '0.4rem 1rem', cursor: 'pointer', flexShrink: 0 }}>{t('billing.subscription.viewPlans')}</button>
      </div>
    );
  }

  return (
    <div style={{ borderRadius: '1rem', padding: '1.1rem 1.25rem', border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
      <div>
        <p style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{t('billing.subscription.noPlan')}</p>
        <p style={{ fontSize: '0.76rem', color: 'var(--sage)', margin: '0.1rem 0 0' }}>{t('billing.subscription.noPlanDesc')}</p>
      </div>
      <button onClick={onUpgrade} style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white', background: 'var(--slate)', border: 'none', borderRadius: '999px', padding: '0.4rem 1rem', cursor: 'pointer', flexShrink: 0 }}>{t('billing.subscription.subscribe')}</button>
    </div>
  );
}

function PitchCounter({ serverPitchCount }) {
  const { t } = useTranslation('settings');
  const count = serverPitchCount ?? getPitchCount().count;
  return (
    <div style={{ borderRadius: '1rem', padding: '1rem 1.1rem', background: 'rgba(209,235,219,0.1)', border: '1px solid var(--hairline)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <p style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{t('billing.pitchCounter.title')}</p>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: count >= 10 ? '#ef4444' : 'var(--ink)', margin: 0 }}>{count} / 10</p>
      </div>
      <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(25,37,36,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '999px', width: `${Math.min((count / 10) * 100, 100)}%`, background: count >= 10 ? '#ef4444' : count >= 7 ? '#D4A843' : '#4A9B7F', transition: 'width 400ms ease' }} />
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0.4rem 0 0' }}>{t('billing.pitchCounter.footer')}</p>
    </div>
  );
}

function AmbassadorLookup() {
  const { t } = useTranslation('settings');
  const countries = useQuery(api.ambassadors.listCountries);
  const [query, setQuery] = useState('');

  const takenMap = new Map((countries || []).map((c) => [c.country, c.ambassador_first_name]));
  const trimmed = query.trim();
  const match = trimmed ? COUNTRIES.find((c) => c.toLowerCase() === trimmed.toLowerCase()) : null;
  const status = match ? (takenMap.has(match) ? 'taken' : 'available') : null;

  return (
    <div style={{ borderRadius: '1rem', padding: '1rem 1.1rem', background: 'rgba(209,235,219,0.1)', border: '1px solid var(--hairline)' }}>
      <p style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--ink)', margin: '0 0 0.6rem' }}>{t('billing.ambassador.prompt')}</p>
      <input
        list="ambassador-country-options"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('billing.ambassador.placeholder')}
        style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.82rem', padding: '0.5rem 0.7rem', borderRadius: '0.6rem', border: '1px solid rgba(25,37,36,0.15)', fontFamily: 'inherit', color: 'var(--ink)' }}
      />
      <datalist id="ambassador-country-options">
        {COUNTRIES.map((c) => <option key={c} value={c} />)}
      </datalist>
      {status && (
        <p style={{ fontSize: '0.78rem', margin: '0.6rem 0 0', fontWeight: 600, color: status === 'available' ? '#166534' : 'var(--slate)' }}>
          {status === 'available'
            ? t('billing.ambassador.available', { country: match })
            : t('billing.ambassador.taken', { country: match, name: takenMap.get(match) || '—' })}
        </p>
      )}
      <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: '0.6rem 0 0', lineHeight: 1.5 }}>
        <Trans
          i18nKey="settings:billing.ambassador.footer"
          t={t}
          components={{
            a: <a href="https://collabnb.com/ambassadors.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--slate)', fontWeight: 600, textDecoration: 'underline' }} />,
          }}
        />
      </p>
    </div>
  );
}

function HostBillingLedger({ ledger }) {
  const { t } = useTranslation('settings');
  const BILLING_STATUS = {
    paid: { label: t('billing.status.paid'), color: '#2D7A5F', bg: 'rgba(74,155,127,0.14)' },
    pending: { label: t('billing.status.pending'), color: '#A87820', bg: 'rgba(212,168,67,0.16)' },
    failed: { label: t('billing.status.failed'), color: '#dc2626', bg: 'rgba(239,68,68,0.12)' },
    waived: { label: t('billing.status.waived'), color: 'var(--sage)', bg: 'rgba(60,87,89,0.1)' },
  };
  const outstanding = ledger.filter((f) => f.status === 'pending' || f.status === 'failed').reduce((sum, f) => sum + (f.amount || 0), 0);
  return (
    <div>
      {outstanding > 0 && (
        <p style={{ fontSize: '0.76rem', fontWeight: 700, color: '#dc2626', margin: '0 0 0.6rem' }}>{t('billing.ledger.outstanding', { amount: outstanding.toFixed(2) })}</p>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
            <th style={{ textAlign: 'left', padding: '0.3rem 0', fontWeight: 600, color: 'var(--sage)', paddingRight: '1rem' }}>{t('billing.ledger.collab')}</th>
            <th style={{ textAlign: 'right', padding: '0.3rem 0', fontWeight: 600, color: 'var(--sage)', paddingRight: '1rem' }}>{t('billing.ledger.fee')}</th>
            <th style={{ textAlign: 'right', padding: '0.3rem 0', fontWeight: 600, color: 'var(--sage)' }}>{t('billing.ledger.status')}</th>
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
