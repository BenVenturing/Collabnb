import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';

// ─── Design tokens ────────────────────────────────────────────────────────────
const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#959D90';
const MINT  = '#D1EBDB';
const BONE  = '#F7F5F2';

// ─── Utilities ────────────────────────────────────────────────────────────────
function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtFollowers(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function Badge({ color, bg, children }) {
  return (
    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 99, background: bg, color, display: 'inline-block', lineHeight: 1.6, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid rgba(25,37,36,0.04)' }}>
      <span style={{ fontSize: '0.78rem', color: SAGE }}>{label}</span>
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: accent || INK }}>{value ?? '—'}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: SAGE, marginBottom: '0.5rem', paddingBottom: '0.25rem', borderBottom: '1px solid rgba(25,37,36,0.06)' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ url, name, size = 44 }) {
  if (url) {
    return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: MINT, color: SLATE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, flexShrink: 0, fontFamily: 'Cabinet Grotesk, sans-serif' }}>
      {initials}
    </div>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'social',    label: 'Social' },
  { id: 'collabs',   label: 'Collabs' },
  { id: 'referrals', label: 'Referrals' },
  { id: 'billing',   label: 'Billing' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Main Panel
// ═══════════════════════════════════════════════════════════════════════════════
export default function UserDetailPanel({ profileId, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const data = useQuery(api.profiles.getDetailedProfile, profileId ? { profileId } : 'skip');
  const deleteAccount = useAction(api.profiles.deleteAccount);

  const handleDelete = useCallback(async () => {
    if (!profileId) return;
    setDeleting(true);
    try {
      await deleteAccount({ profileId });
      setDeleting(false);
      onClose();
    } catch (err) {
      setDeleting(false);
      setShowDeleteConfirm(false);
      alert('Failed to delete user. Check console for details.');
      console.error('Delete failed:', err);
    }
  }, [profileId, deleteAccount, onClose]);

  // ── Close on Escape ─────────────────────────────────────────────────────────
  // (handled by the overlay click below)

  if (!profileId) return null;

  const panelWidth = 480;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(25,37,36,0.3)',
        }}
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 501,
        width: Math.min(panelWidth, 'calc(100vw - 2rem)'),
        background: '#fff',
        boxShadow: '-8px 0 40px rgba(25,37,36,0.12)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
          padding: '1.25rem 1.25rem 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
            <Avatar url={data?.profile?.avatar_url} name={data?.profile?.full_name} size={44} />
            <div style={{ minWidth: 0, flex: 1 }}>
              {data?.profile ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: INK, fontFamily: 'Cabinet Grotesk, sans-serif' }}>
                      {data.profile.full_name}
                    </span>
                    {data.profile.is_verified
                      ? <Badge bg="#DCFCE7" color="#166534">✓ Verified</Badge>
                      : <Badge bg="#FEF3C7" color="#B45309">Unverified</Badge>
                    }
                    {data.profile.is_rejected && <Badge bg="#FEE2E2" color="#991B1B">Rejected</Badge>}
                    {data.profile.is_founder && <Badge bg={MINT} color="#166534">Founder</Badge>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: SAGE, marginTop: '0.15rem' }}>
                    @{data.profile.username} · {data.profile.email}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: SAGE, marginTop: '0.1rem' }}>
                    Joined {fmtDate(data.profile._creationTime)}
                    {data.profile.role === 'creator' ? ' · Creator' : ' · Host'}
                  </div>
                </>
              ) : (
                <div style={{ color: SAGE, fontSize: '0.85rem' }}>Loading…</div>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', background: BONE, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: SAGE }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* ── Tab bar ── */}
        <div style={{
          display: 'flex', gap: 0,
          margin: '1rem 1.25rem 0',
          borderBottom: '1px solid rgba(25,37,36,0.07)',
        }}>
          {TABS.map(t => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? INK : SAGE,
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${active ? INK : 'transparent'}`,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'color 0.15s, border-color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── Body (scrollable) ── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.25rem 2rem' }}>
          {data === undefined ? (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: SAGE, fontSize: '0.85rem' }}>
              Loading profile data…
            </div>
          ) : data === null ? (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: SAGE, fontSize: '0.85rem' }}>
              Profile not found.
            </div>
          ) : (
            <>
              <TabContent tab={activeTab} data={data} />

              {/* ── Review actions (unverified or rejected users) ── */}
              {!data.profile.is_verified && (
                <ReviewActions profile={data.profile} />
              )}

              {/* ── Danger Zone ── */}
              <div style={{
                marginTop: '2rem',
                padding: '1rem 1.25rem',
                background: '#FEF2F2',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '0.75rem',
              }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg>
                  Danger Zone
                </div>
                <p style={{ fontSize: '0.78rem', color: '#7F1D1D', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                  Permanently delete this user and all associated data (collabs, pitches, messages, referral codes).
                  This cannot be undone. Their Clerk login is also removed automatically (when CLERK_SECRET_KEY is set), freeing the email for reuse.
                </p>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    style={{
                      padding: '0.45rem 1rem', borderRadius: '0.5rem',
                      background: '#FEE2E2', color: '#991B1B', fontSize: '0.82rem',
                      fontWeight: 600, border: '1px solid rgba(153,27,27,0.2)',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Delete this user
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#991B1B', fontWeight: 600 }}>Are you sure?</span>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      style={{
                        padding: '0.45rem 1rem', borderRadius: '0.5rem',
                        background: '#DC2626', color: '#fff', fontSize: '0.82rem',
                        fontWeight: 600, border: 'none',
                        cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                        opacity: deleting ? 0.6 : 1,
                      }}
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete permanently'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      style={{
                        padding: '0.45rem 0.75rem', borderRadius: '0.5rem',
                        background: 'transparent', color: '#959D90', fontSize: '0.82rem',
                        border: '1px solid rgba(25,37,36,0.1)',
                        cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tab Content
// ═══════════════════════════════════════════════════════════════════════════════
function TabContent({ tab, data }) {
  const p = data.profile;

  switch (tab) {
    // ── Overview ──────────────────────────────────────────────────────────────
    case 'overview':
      return (
        <>
          <Section title="Profile Stats">
            <Stat label="Follower Count"    value={fmtFollowers(p.follower_count)} />
            <Stat label="Engagement Rate"   value={p.engagement_rate ? `${p.engagement_rate}%` : '—'} />
            <Stat label="Collab Count"      value={data.collabCount ?? 0} />
            <Stat label="Tier"              value={p.tier || '—'} />
            <Stat label="First Collab"      value={p.first_collab_completed ? 'Completed' : 'Not yet'} />
          </Section>

          <Section title="Pitch Usage This Month">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
              <div style={{ flex: 1, height: 8, background: BONE, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min((data.pitchCount / 10) * 100, 100)}%`,
                  height: '100%',
                  background: data.pitchCount >= 10 ? '#FECACA' : data.pitchCount >= 7 ? '#FDE68A' : MINT,
                  borderRadius: 99,
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: data.pitchCount >= 10 ? '#991B1B' : INK, whiteSpace: 'nowrap' }}>
                {data.pitchCount} / 10
              </span>
            </div>
          </Section>

          <Section title="Status">
            <Stat label="Verified"          value={p.is_verified ? 'Yes' : 'No'} accent={p.is_verified ? '#166534' : '#991B1B'} />
            <Stat label="Founder"           value={p.is_founder ? 'Yes' : '—'} accent={p.is_founder ? '#166534' : undefined} />
            <Stat label="Beta Tester"       value={p.beta ? 'Yes' : '—'} />
            <Stat label="Rejected"          value={p.is_rejected ? `Yes — ${p.rejection_reason || 'No reason given'}` : '—'} accent={p.is_rejected ? '#991B1B' : undefined} />
            <Stat label="Clerk Registered"  value={p.clerk_registered ? 'Yes' : '—'} />
            {p.banner_url && <Stat label="Banner Image" value="Uploaded" />}
          </Section>
        </>
      );

    // ── Social ────────────────────────────────────────────────────────────────
    case 'social':
      return (
        <>
          {[
            { label: 'Instagram', handle: p.instagram_handle, url: p.instagram_handle ? `https://instagram.com/${p.instagram_handle.replace('@', '')}` : null },
            { label: 'TikTok',    handle: p.tiktok_handle,    url: p.tiktok_handle    ? `https://tiktok.com/@${p.tiktok_handle.replace('@', '')}` : null },
            { label: 'YouTube',   handle: p.youtube_handle,   url: p.youtube_handle   ? (p.youtube_handle.startsWith('http') ? p.youtube_handle : `https://youtube.com/@${p.youtube_handle.replace('@', '')}`) : null },
            { label: 'Portfolio', handle: p.portfolio,        url: p.portfolio        ? (p.portfolio.startsWith('http') ? p.portfolio : `https://${p.portfolio}`) : null },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(25,37,36,0.04)' }}>
              <span style={{ fontSize: '0.78rem', color: SAGE, minWidth: 80 }}>{s.label}</span>
              {s.handle ? (
                <a href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem', color: INK, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2 }}>
                  @{s.handle}
                </a>
              ) : (
                <span style={{ fontSize: '0.82rem', color: SAGE }}>—</span>
              )}
            </div>
          ))}
        </>
      );

    // ── Collabs ───────────────────────────────────────────────────────────────
    case 'collabs':
      if (!data.collabs?.length && !data.contracts?.length) {
        return <div style={{ padding: '2rem 0', textAlign: 'center', color: SAGE, fontSize: '0.85rem' }}>No collaborations or contracts yet.</div>;
      }
      return (
        <>
          {data.collabs?.length > 0 && (
            <Section title={`Collaborations (${data.collabs.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.collabs.map((c, i) => (
                  <div key={i} style={{ padding: '0.625rem 0.75rem', background: BONE, borderRadius: '0.5rem', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 600, color: INK }}>{c.property_name || 'Untitled'}</span>
                      <StatusBadge status={c.status || c.current_stage} />
                    </div>
                    <div style={{ color: SAGE }}>
                      {c.dates && <span>{c.dates} · </span>}
                      {c.location && <span>{c.location}</span>}
                      {c.deliverables && <span> · {c.deliverables}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {data.contracts?.length > 0 && (
            <Section title={`Contracts (${data.contracts.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.contracts.map((c, i) => (
                  <div key={i} style={{ padding: '0.625rem 0.75rem', background: BONE, borderRadius: '0.5rem', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 600, color: INK }}>{c.property_name || 'Untitled'}</span>
                      <ContractStatusBadge c={c} />
                    </div>
                    <div style={{ color: SAGE }}>
                      {c.dates && <span>{c.dates} · </span>}
                      {c.payment && <span>${c.payment} · </span>}
                      Status: {c.status}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      );

    // ── Referrals ─────────────────────────────────────────────────────────────
    case 'referrals':
      return (
        <>
          <Section title="Referral Code">
            <Stat label="Code"     value={p.referral_code || '—'} accent={p.referral_code ? '#166534' : undefined} />
            <Stat label="Referred By" value={data.referrerOwnerId ? `User ID: ${data.referrerOwnerId.slice(0, 12)}…` : '—'} />
            <Stat label="Total Referrals" value={data.totalReferrals ?? 0} />
            <Stat label="Free Months Balance" value={data.freeMonthsBalance ?? 0} />
            <Stat label="Collab Bonus Pending" value={p.referral_bonus_pending ? 'Pending' : '—'} />
          </Section>

          {data.referralCodes?.length > 0 && (
            <Section title="Owned Referral Codes">
              {data.referralCodes.map((rc, i) => (
                <div key={i} style={{ padding: '0.5rem 0.75rem', background: BONE, borderRadius: '0.5rem', marginBottom: '0.375rem', fontSize: '0.78rem' }}>
                  <div style={{ fontWeight: 600, color: INK }}>{rc.code}</div>
                  <div style={{ color: SAGE, fontSize: '0.72rem' }}>Used {rc.use_count} / {rc.max_uses} times</div>
                </div>
              ))}
            </Section>
          )}
        </>
      );

    // ── Billing ───────────────────────────────────────────────────────────────
    case 'billing':
      return (
        <Section title="Subscription">
          <Stat label="Status"      value={p.subscription_status || '—'} accent={p.subscription_status === 'active' ? '#166534' : undefined} />
          <Stat label="Tier"        value={p.subscription_tier || '—'} />
          <Stat label="Expires At"  value={p.subscription_expires_at ? fmtDate(p.subscription_expires_at) : '—'} />
          <Stat label="Stripe Customer ID" value={p.stripe_customer_id ? `${p.stripe_customer_id.slice(0, 20)}…` : '—'} />
        </Section>
      );

    default:
      return null;
  }
}

// ─── Collab status badge ──────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const colors = {
    pending:   { bg: '#FEF3C7', color: '#92400E' },
    approved:  { bg: '#DCFCE7', color: '#166534' },
    completed: { bg: '#D1EBDB', color: '#166534' },
    active:    { bg: '#DBEAFE', color: '#0369A1' },
  };
  const s = colors[status] || { bg: '#F7F5F2', color: SAGE };
  return (
    <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: 99, background: s.bg, color: s.color, textTransform: 'capitalize' }}>
      {status}
    </span>
  );
}

// ─── Review actions (approve / reject unverified users) ──────────────────────
const CREATOR_TRACKS = [
  { value: 'ugc', label: 'UGC Track', desc: 'Portfolio-driven, delivers on host\'s channels' },
  { value: 'influencer', label: 'Influencer Track', desc: 'Reach-driven, content on own channels' },
];
const TIERS_BY_TRACK = {
  ugc: ['UGC Beginner', 'UGC Pro'],
  influencer: ['Micro Influencer', 'Influencer'],
};
const CHECKLIST_ITEMS = {
  creator: [
    'Social accounts reviewed',
    'Follower count & engagement verified',
    'Portfolio & experience assessed',
  ],
  host: [
    'Property listing reviewed',
    'Contact & business info verified',
    'Photos assessed',
  ],
};

function ReviewActions({ profile }) {
  const isCreator  = profile.role === 'creator';
  const isRejected = profile.is_rejected === true;
  const checklist  = CHECKLIST_ITEMS[isCreator ? 'creator' : 'host'];

  const [checkedItems, setCheckedItems] = useState(() => new Set());
  const [creatorTrack, setCreatorTrack] = useState('ugc');
  const [creatorTier, setCreatorTier]   = useState('UGC Beginner');
  const [rejecting, setRejecting]       = useState(false);
  const [reason, setReason]             = useState('');
  const [busy, setBusy]                 = useState(false);
  const [error, setError]               = useState('');
  const [note, setNote]                 = useState(profile.admin_verification_note || '');
  const [requestInterview, setRequestInterview] = useState(!!profile.interview_requested);
  const [savingNote, setSavingNote]     = useState(false);
  const [noteSaved, setNoteSaved]       = useState(false);

  const approveCreator = useMutation(api.gates.approveCreator);
  const approveHost    = useMutation(api.gates.approveHost);
  const rejectProfile  = useMutation(api.gates.rejectProfile);
  const saveNote       = useMutation(api.gates.setAdminNote);
  const addAudit       = useMutation(api.admin.addAuditEntry);

  const totalFollowers = (profile.metrics_instagram_followers ?? 0) + (profile.metrics_tiktok_followers ?? 0) + (profile.metrics_youtube_subscribers ?? 0);
  const allChecked = checklist.every(item => checkedItems.has(item));
  const noteDirty  = note !== (profile.admin_verification_note || '') || requestInterview !== !!profile.interview_requested;

  // Auto-select tier based on followers
  useEffect(() => {
    if (creatorTrack === 'influencer') {
      setCreatorTier(totalFollowers >= 25000 ? 'Influencer' : 'Micro Influencer');
    } else {
      setCreatorTier('UGC Beginner');
    }
  }, [creatorTrack, totalFollowers]);

  function toggleItem(item) {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item); else next.add(item);
      return next;
    });
  }

  async function handleApprove() {
    setBusy(true);
    setError('');
    try {
      if (isCreator) {
        await approveCreator({ profileId: profile._id, track: creatorTrack, tier: creatorTier });
      } else {
        await approveHost({ profileId: profile._id });
      }
      try { await addAudit({ action: 'approved', targetType: 'profile', targetId: String(profile._id), details: `${profile.full_name}${isCreator ? ` (${creatorTrack}, ${creatorTier})` : ''}${isRejected ? ' — previously rejected' : ''}` }); } catch {}
    } catch (err) {
      setError(err?.message || 'Failed to approve.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    setBusy(true);
    try {
      await rejectProfile({ profileId: profile._id, reason: reason || undefined });
      try { await addAudit({ action: 'rejected', targetType: 'profile', targetId: String(profile._id), details: `${profile.full_name} — ${reason || 'No reason'}` }); } catch {}
      setRejecting(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveNote() {
    setSavingNote(true);
    try {
      await saveNote({ profileId: profile._id, note: note || undefined, requestInterview });
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 1500);
    } finally {
      setSavingNote(false);
    }
  }

  const pillStyle = (active) => ({
    padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600,
    background: active ? INK : 'rgba(255,255,255,0.7)',
    color: active ? '#fff' : SLATE,
    border: active ? `1px solid ${INK}` : '1px solid rgba(25,37,36,0.1)',
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
  });

  return (
    <div style={{
      marginTop: '2rem',
      padding: '1rem 1.25rem',
      background: 'rgba(209,235,219,0.30)',
      border: '1px solid rgba(74,155,127,0.25)',
      borderRadius: '0.75rem',
      backdropFilter: 'blur(20px) saturate(140%)',
    }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
        Review Actions
      </div>

      {isRejected && (
        <div style={{ marginBottom: '0.75rem', padding: '0.45rem 0.7rem', background: '#FEF2F2', borderRadius: '0.5rem', fontSize: '0.75rem', color: '#991B1B', borderLeft: '3px solid #FECACA' }}>
          Previously rejected{profile.rejection_reason ? <> — <strong>{profile.rejection_reason}</strong></> : ''}. Granting access clears the rejection.
        </div>
      )}

      {/* Track + tier (creators) */}
      {isCreator && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '0.72rem', color: SLATE, fontWeight: 600 }}>Creator Track</label>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {CREATOR_TRACKS.map(t => (
              <button key={t.value} onClick={() => setCreatorTrack(t.value)} style={pillStyle(creatorTrack === t.value)}>
                <div>{t.label}</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 400, opacity: 0.7 }}>{t.desc}</div>
              </button>
            ))}
          </div>
          <label style={{ fontSize: '0.72rem', color: SLATE, fontWeight: 600 }}>Tier</label>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {TIERS_BY_TRACK[creatorTrack]?.map(t => (
              <button key={t} onClick={() => setCreatorTier(t)} style={{
                ...pillStyle(creatorTier === t),
                background: creatorTier === t ? MINT : 'rgba(255,255,255,0.7)',
                color: creatorTier === t ? '#166534' : SLATE,
                border: creatorTier === t ? '1px solid rgba(22,101,52,0.2)' : '1px solid rgba(25,37,36,0.1)',
              }}>{t}</button>
            ))}
          </div>
          {creatorTrack === 'influencer' && (
            <p style={{ fontSize: '0.7rem', color: SAGE, margin: 0 }}>Total followers: {totalFollowers.toLocaleString()}</p>
          )}
        </div>
      )}

      {/* Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' }}>
        <label style={{ fontSize: '0.72rem', color: SLATE, fontWeight: 600 }}>Verification checklist</label>
        {checklist.map(item => (
          <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: SLATE, cursor: 'pointer' }}>
            <input type="checkbox" checked={checkedItems.has(item)} onChange={() => toggleItem(item)} />
            {item}
          </label>
        ))}
      </div>

      {error && <p style={{ fontSize: '0.75rem', color: '#991B1B', margin: '0 0 0.5rem' }}>{error}</p>}

      {/* Approve / Reject */}
      {!rejecting ? (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleApprove}
            disabled={busy || !allChecked}
            style={{ padding: '0.45rem 1.125rem', borderRadius: '0.5rem', background: '#166534', color: '#fff', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: busy || !allChecked ? 'not-allowed' : 'pointer', opacity: busy || !allChecked ? 0.55 : 1, fontFamily: 'inherit', transition: 'opacity 150ms' }}
          >
            {busy ? 'Approving…' : isRejected ? '✓ Grant Access' : '✓ Confirm Approval'}
          </button>
          {!isRejected && (
            <button
              onClick={() => setRejecting(true)}
              disabled={busy}
              style={{ padding: '0.45rem 1rem', borderRadius: '0.5rem', background: 'transparent', color: '#991B1B', fontSize: '0.8rem', fontWeight: 500, border: '1px solid rgba(153,27,27,0.2)', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
            >
              ✕ Reject
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <textarea
            placeholder="Optional rejection reason (will be included in the email)"
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '0.5rem', border: '1px solid rgba(25,37,36,0.15)', fontSize: '0.78rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', color: INK, lineHeight: 1.5 }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleReject}
              disabled={busy}
              style={{ padding: '0.4rem 0.875rem', borderRadius: '0.5rem', background: '#FEE2E2', color: '#991B1B', fontSize: '0.78rem', fontWeight: 600, border: '1px solid rgba(153,27,27,0.15)', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
            >
              {busy ? 'Sending…' : 'Send Rejection'}
            </button>
            <button
              onClick={() => { setRejecting(false); setReason(''); }}
              style={{ padding: '0.4rem 0.875rem', borderRadius: '0.5rem', background: 'transparent', color: SAGE, fontSize: '0.78rem', border: '1px solid rgba(25,37,36,0.1)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Admin note + interview flag */}
      <div style={{ marginTop: '0.875rem', padding: '0.7rem', background: 'rgba(255,255,255,0.6)', borderRadius: '0.625rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: SLATE }}>Admin note</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: SLATE, cursor: 'pointer' }}>
            <input type="checkbox" checked={requestInterview} onChange={e => setRequestInterview(e.target.checked)} />
            Flag for interview
          </label>
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Internal note (not shown to applicant)…"
          rows={2}
          style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '0.4rem', border: '1px solid rgba(25,37,36,0.12)', fontSize: '0.75rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', color: INK }}
        />
        {noteDirty && (
          <button
            onClick={handleSaveNote}
            disabled={savingNote}
            style={{ marginTop: '0.4rem', padding: '0.3rem 0.7rem', borderRadius: '0.4rem', background: INK, color: '#fff', fontSize: '0.7rem', fontWeight: 600, border: 'none', cursor: savingNote ? 'default' : 'pointer', opacity: savingNote ? 0.6 : 1, fontFamily: 'inherit' }}
          >
            {savingNote ? 'Saving…' : 'Save'}
          </button>
        )}
        {noteSaved && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#166534' }}>Saved</span>}
      </div>
    </div>
  );
}

// ─── Contract status badge ────────────────────────────────────────────────────
function ContractStatusBadge({ c }) {
  if (c.status === 'accepted' && (c.creator_signed || c.host_signed)) {
    return <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: 99, background: '#DCFCE7', color: '#166534' }}>✓ Signed</span>;
  }
  if (c.paid) {
    return <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: 99, background: '#D1EBDB', color: '#166534' }}>💰 Paid</span>;
  }
  return <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: 99, background: '#F7F5F2', color: SAGE }}>{c.status}</span>;
}
