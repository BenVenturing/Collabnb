import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import UserDetailPanel from '../../components/admin/UserDetailPanel';
import { formatDate as fmtDate } from '../../lib/dateUtils';

const FOUNDER_LIMIT = 100;

// ─── Utilities ────────────────────────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return '—';
  return fmtDate(ts);
}

function Avatar({ url, name, size = 46 }) {
  if (url) {
    return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#D1EBDB', color: '#3C5759', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, flexShrink: 0, fontFamily: 'Cabinet Grotesk, sans-serif' }}>
      {initials}
    </div>
  );
}

function SocialPill({ label, href }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      style={{ fontSize: '0.75rem', padding: '0.15rem 0.55rem', borderRadius: '99px', background: '#F7F5F2', color: '#3C5759', border: '1px solid rgba(25,37,36,0.08)', textDecoration: 'none', lineHeight: 1.6 }}>
      {label}
    </a>
  );
}

function SocialLinks({ profile }) {
  const pills = [];
  if (profile.instagram_handle) pills.push({ label: `IG: ${profile.instagram_handle}`, href: `https://instagram.com/${profile.instagram_handle.replace('@', '')}` });
  if (profile.tiktok_handle)    pills.push({ label: `TT: ${profile.tiktok_handle}`, href: `https://tiktok.com/@${profile.tiktok_handle.replace('@', '')}` });
  if (profile.youtube_handle)   pills.push({ label: `YT: ${profile.youtube_handle}`, href: profile.youtube_handle.startsWith('http') ? profile.youtube_handle : `https://youtube.com/@${profile.youtube_handle.replace('@', '')}` });
  if (profile.portfolio)        pills.push({ label: 'Portfolio', href: profile.portfolio.startsWith('http') ? profile.portfolio : `https://${profile.portfolio}` });
  if (!pills.length) return <span style={{ fontSize: '0.75rem', color: '#D0D5CE' }}>No social links</span>;
  return (
    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
      {pills.map(p => <SocialPill key={p.label} label={p.label} href={p.href} />)}
    </div>
  );
}

// ─── Profile card ─────────────────────────────────────────────────────────────
function ProfileCard({ profile, onApprove, onReject, isRejected, onViewDetails }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason]       = useState('');
  const [busy, setBusy]           = useState(false);

  const location    = [profile.city, profile.region].filter(Boolean).join(', ') || null;
  const tierOrRole  = profile.tier || (profile.role === 'host' ? 'Host' : 'Creator');

  async function handleApprove() {
    setBusy(true);
    await onApprove(profile);
    setBusy(false);
  }

  async function handleReject() {
    setBusy(true);
    await onReject(profile, reason);
    setRejecting(false);
    setBusy(false);
  }

  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(25,37,36,0.07)',
      borderRadius: '0.875rem',
      padding: '1.25rem',
      boxShadow: '0 1px 3px rgba(25,37,36,0.04)',
      marginBottom: '0.75rem',
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
        <Avatar url={profile.avatar_url} name={profile.full_name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#192524', fontFamily: 'Cabinet Grotesk, sans-serif' }}>
              {profile.full_name}
            </span>
            <button
              onClick={() => onViewDetails?.(profile._id)}
              style={{ fontSize: '0.68rem', background: '#F7F5F2', border: '1px solid rgba(25,37,36,0.08)', borderRadius: '99px', padding: '0.1rem 0.55rem', color: '#3C5759', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, lineHeight: 1.6 }}
            >
              📋 Details
            </button>
            {profile.username && (
              <span style={{ fontSize: '0.8rem', color: '#959D90' }}>@{profile.username}</span>
            )}
            <span style={{ fontSize: '0.7rem', background: '#EFECE9', color: '#3C5759', padding: '0.1rem 0.5rem', borderRadius: '99px', fontWeight: 500 }}>
              {tierOrRole}
            </span>
            {isRejected && (
              <span style={{ fontSize: '0.7rem', background: '#FEE2E2', color: '#991B1B', padding: '0.1rem 0.5rem', borderRadius: '99px', fontWeight: 500 }}>
                Rejected
              </span>
            )}
            {profile.is_founder && !isRejected && (
              <span style={{ fontSize: '0.7rem', background: '#FEF3C7', color: '#92400E', padding: '0.1rem 0.5rem', borderRadius: '99px', fontWeight: 500 }}>
                Founder
              </span>
            )}
            {profile.referred_by && (
              <span style={{ fontSize: '0.7rem', background: '#EDE9FE', color: '#5B21B6', padding: '0.1rem 0.5rem', borderRadius: '99px', fontWeight: 600 }}>
                Referred
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#959D90', marginTop: '0.2rem', display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}>
            <span>{profile.email}</span>
            {location && <span>📍 {location}</span>}
            <span>Joined {formatDate(profile._creationTime)}</span>
          </div>
        </div>
      </div>

      {/* ── Bio ── */}
      {profile.bio && (
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.82rem', color: '#3C5759', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {profile.bio}
        </p>
      )}

      {/* ── Social links ── */}
      <div style={{ marginTop: '0.75rem' }}>
        <SocialLinks profile={profile} />
      </div>

      {/* ── Referral notice ── */}
      {profile.referred_by && (
        <div style={{ marginTop: '0.625rem', padding: '0.4rem 0.75rem', background: '#F5F3FF', borderRadius: '0.5rem', fontSize: '0.78rem', color: '#5B21B6', borderLeft: '3px solid #C4B5FD', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width="13" height="13">
            <path d="M8 1v6M5 4l3-3 3 3M4 9.5a4 4 0 008 0"/>
          </svg>
          Signed up via referral — will receive <strong style={{ marginLeft: '0.25rem' }}>1 free month</strong> after completing their first collab.
        </div>
      )}

      {/* ── Rejection reason badge ── */}
      {isRejected && profile.rejection_reason && (
        <div style={{ marginTop: '0.75rem', padding: '0.45rem 0.75rem', background: '#FEF2F2', borderRadius: '0.5rem', fontSize: '0.78rem', color: '#991B1B', borderLeft: '3px solid #FECACA' }}>
          <strong>Reason:</strong> {profile.rejection_reason}
        </div>
      )}

      {/* ── Actions ── */}
      {!isRejected && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(25,37,36,0.06)', paddingTop: '0.875rem' }}>
          {!rejecting ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleApprove}
                disabled={busy}
                style={{ padding: '0.45rem 1rem', borderRadius: '0.5rem', background: '#D1EBDB', color: '#166534', fontSize: '0.82rem', fontWeight: 600, border: '1px solid rgba(22,101,52,0.2)', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit' }}
              >
                ✓ Approve
              </button>
              <button
                onClick={() => setRejecting(true)}
                disabled={busy}
                style={{ padding: '0.45rem 1rem', borderRadius: '0.5rem', background: 'transparent', color: '#991B1B', fontSize: '0.82rem', fontWeight: 500, border: '1px solid rgba(153,27,27,0.2)', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit' }}
              >
                ✕ Reject
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <textarea
                placeholder="Optional rejection reason (will be included in the email)"
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(25,37,36,0.15)', fontSize: '0.82rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', color: '#192524', lineHeight: 1.5 }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleReject}
                  disabled={busy}
                  style={{ padding: '0.4rem 0.875rem', borderRadius: '0.5rem', background: '#FEE2E2', color: '#991B1B', fontSize: '0.82rem', fontWeight: 600, border: '1px solid rgba(153,27,27,0.15)', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                >
                  Send Rejection
                </button>
                <button
                  onClick={() => { setRejecting(false); setReason(''); }}
                  style={{ padding: '0.4rem 0.875rem', borderRadius: '0.5rem', background: 'transparent', color: '#959D90', fontSize: '0.82rem', border: '1px solid rgba(25,37,36,0.1)', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.4rem 0.875rem',
        borderRadius: '0.4rem',
        fontSize: '0.82rem',
        fontWeight: active ? 600 : 400,
        background: active ? '#192524' : 'transparent',
        color: active ? '#fff' : '#3C5759',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.15s',
        fontFamily: 'inherit',
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
      }}
    >
      {children}
    </button>
  );
}

function CountBadge({ n, variant = 'green' }) {
  if (!n) return null;
  const colors = {
    green: { background: '#D1EBDB', color: '#166534' },
    red:   { background: '#FEE2E2', color: '#991B1B' },
    amber: { background: '#FEF3C7', color: '#92400E' },
  };
  return (
    <span style={{ ...(colors[variant] ?? colors.green), borderRadius: '99px', padding: '0 0.4rem', fontSize: '0.7rem', fontWeight: 700, lineHeight: 1.6 }}>
      {n}
    </span>
  );
}

function TierChangeCard({ profile, onApprove, onDecline }) {
  const [busy, setBusy] = useState(false);
  const requestedAt = profile.tier_change_requested_at ? new Date(profile.tier_change_requested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  async function handle(action) {
    setBusy(true);
    try { await action(profile); } finally { setBusy(false); }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.08)', borderRadius: '0.875rem', padding: '1rem 1.25rem', marginBottom: '0.75rem', boxShadow: '0 1px 3px rgba(25,37,36,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
        <Avatar url={profile.avatar_url} name={profile.full_name} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#192524' }}>{profile.full_name}</span>
            <span style={{ fontSize: '0.72rem', background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>Account Status Change</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#3C5759', margin: '0 0 0.5rem' }}>
            <span style={{ fontWeight: 600 }}>{profile.tier || 'None'}</span>
            <span style={{ margin: '0 0.375rem', color: '#D0D5CE' }}>→</span>
            <span style={{ fontWeight: 700, color: '#192524' }}>{profile.pending_tier}</span>
          </p>
          <p style={{ fontSize: '0.72rem', color: '#959D90', margin: '0 0 0.75rem' }}>Requested {requestedAt} · {profile.email}</p>
          <SocialLinks profile={profile} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem', borderTop: '1px solid rgba(25,37,36,0.06)', paddingTop: '0.875rem' }}>
        <button
          disabled={busy}
          onClick={() => handle(onApprove)}
          style={{ flex: 1, padding: '0.45rem', borderRadius: '0.5rem', border: 'none', background: '#192524', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit' }}
        >
          Approve Change
        </button>
        <button
          disabled={busy}
          onClick={() => handle(onDecline)}
          style={{ flex: 1, padding: '0.45rem', borderRadius: '0.5rem', border: '1px solid rgba(25,37,36,0.15)', background: 'transparent', color: '#3C5759', fontSize: '0.8rem', fontWeight: 500, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit' }}
        >
          Decline
        </button>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function VerificationQueue() {
  const [tab, setTab] = useState('creators');
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  const unverified       = useQuery(api.profiles.getUnverified);
  const rejected         = useQuery(api.profiles.getRejected);
  const tierChangeReqs   = useQuery(api.profiles.getTierChangeRequests);
  const founderCounts    = useQuery(api.admin.getFounderCounts);
  const approve          = useMutation(api.profiles.approveProfile);
  const reject           = useMutation(api.profiles.rejectProfile);
  const approveTier      = useMutation(api.profiles.approveTierChange);
  const declineTier      = useMutation(api.profiles.declineTierChange);
  const addAudit         = useMutation(api.admin.addAuditEntry);

  const counts = founderCounts ?? { creator: 0, host: 0 };

  const pending          = unverified || [];
  const pendingCreators  = pending.filter(p => p.role === 'creator');
  const pendingHosts     = pending.filter(p => p.role === 'host');
  const rejectedAll      = rejected  || [];
  const tierRequests     = tierChangeReqs || [];

  async function handleApprove(profile) {
    await approve({ profileId: profile._id });
    try { await addAudit({ action: 'approved', targetType: 'profile', targetId: String(profile._id), details: profile.full_name }); } catch {}
  }

  async function handleReject(profile, reason) {
    await reject({ profileId: profile._id, reason: reason || undefined });
    try { await addAudit({ action: 'rejected', targetType: 'profile', targetId: String(profile._id), details: `${profile.full_name} — ${reason || 'No reason'}` }); } catch {}
  }

  async function handleApproveTier(profile) {
    await approveTier({ profileId: String(profile._id) });
    try { await addAudit({ action: 'approved', targetType: 'profile', targetId: String(profile._id), details: `Tier change: ${profile.tier} → ${profile.pending_tier} for ${profile.full_name}` }); } catch {}
  }

  async function handleDeclineTier(profile) {
    await declineTier({ profileId: String(profile._id) });
    try { await addAudit({ action: 'rejected', targetType: 'profile', targetId: String(profile._id), details: `Tier change declined: ${profile.pending_tier} for ${profile.full_name}` }); } catch {}
  }

  const displayCards =
    tab === 'creators' ? pendingCreators :
    tab === 'hosts'    ? pendingHosts    :
    tab === 'tiers'    ? tierRequests    :
    rejectedAll;

  const isLoading = unverified === undefined || rejected === undefined || tierChangeReqs === undefined;

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 760 }}>
      {/* ── Title ── */}
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: '#192524', letterSpacing: '-0.025em', margin: 0 }}>
        Verification Queue
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#959D90', marginTop: '0.3rem', marginBottom: '1.25rem' }}>
        Review and approve new creator and host accounts.
      </p>

      {/* ── Founder counters ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.82rem', color: '#3C5759', padding: '0.625rem 1rem', background: '#fff', borderRadius: '0.625rem', border: '1px solid rgba(25,37,36,0.07)', width: 'fit-content', marginBottom: '1.25rem', boxShadow: '0 1px 2px rgba(25,37,36,0.04)' }}>
        <span>
          <strong style={{ color: counts.creator >= FOUNDER_LIMIT ? '#991B1B' : '#166534', fontFamily: 'Cabinet Grotesk, sans-serif' }}>
            {counts.creator}
          </strong>
          <span style={{ color: '#D0D5CE' }}> / {FOUNDER_LIMIT}</span>
          {' '}Creator Founders
        </span>
        <span style={{ color: '#D0D5CE', fontSize: '1rem' }}>|</span>
        <span>
          <strong style={{ color: counts.host >= FOUNDER_LIMIT ? '#991B1B' : '#166534', fontFamily: 'Cabinet Grotesk, sans-serif' }}>
            {counts.host}
          </strong>
          <span style={{ color: '#D0D5CE' }}> / {FOUNDER_LIMIT}</span>
          {' '}Host Founders
        </span>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '1.25rem', background: '#F7F5F2', padding: '0.2rem', borderRadius: '0.5rem', width: 'fit-content', border: '1px solid rgba(25,37,36,0.06)' }}>
        <TabBtn active={tab === 'creators'} onClick={() => setTab('creators')}>
          Creators
          <CountBadge n={pendingCreators.length} />
        </TabBtn>
        <TabBtn active={tab === 'hosts'} onClick={() => setTab('hosts')}>
          Hosts
          <CountBadge n={pendingHosts.length} />
        </TabBtn>
        <TabBtn active={tab === 'tiers'} onClick={() => setTab('tiers')}>
          Account Status
          <CountBadge n={tierRequests.length} variant={tierRequests.length > 0 ? 'amber' : undefined} />
        </TabBtn>
        <TabBtn active={tab === 'rejected'} onClick={() => setTab('rejected')}>
          Rejected
          <CountBadge n={rejectedAll.length} variant="red" />
        </TabBtn>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div style={{ color: '#959D90', fontSize: '0.85rem', padding: '3rem 0', textAlign: 'center' }}>
          Loading…
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && displayCards.length === 0 && (
        <div style={{ color: '#959D90', fontSize: '0.85rem', padding: '3.5rem 0', textAlign: 'center' }}>
          {tab === 'rejected' ? 'No rejected users.' : tab === 'tiers' ? 'No pending account status changes.' : 'Queue is empty — all caught up.'}
        </div>
      )}

      {/* ── Tier change cards ── */}
      {!isLoading && tab === 'tiers' && displayCards.map(profile => (
        <TierChangeCard
          key={profile._id}
          profile={profile}
          onApprove={handleApproveTier}
          onDecline={handleDeclineTier}
        />
      ))}

      {/* ── Standard verification cards ── */}
      {!isLoading && tab !== 'tiers' && displayCards.map(profile => (
        <ProfileCard
          key={profile._id}
          profile={profile}
          onApprove={handleApprove}
          onReject={handleReject}
          isRejected={tab === 'rejected'}
          onViewDetails={setSelectedProfileId}
        />
      ))}

      <UserDetailPanel
        profileId={selectedProfileId}
        onClose={() => setSelectedProfileId(null)}
      />
    </div>
  );
}
