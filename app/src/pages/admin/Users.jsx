import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import UserDetailPanel from '../../components/admin/UserDetailPanel';
import { formatDate as fmtDate } from '../../lib/dateUtils';

const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#959D90';
const MINT  = '#D1EBDB';
const BONE  = '#F7F5F2';

const FOUNDER_LIMIT = 100;

const GLASS = {
  background: 'rgba(255,255,255,0.6)',
  backdropFilter: 'blur(20px) saturate(140%)',
  WebkitBackdropFilter: 'blur(20px) saturate(140%)',
  border: '1px solid rgba(255,255,255,0.75)',
};

function Avatar({ url, name, size = 34 }) {
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

function Badge({ color, bg, children }) {
  return (
    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 99, background: bg, color, display: 'inline-block', lineHeight: 1.6, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function RowReviewActions({ p, onReview }) {
  const rejectProfile = useMutation(api.gates.rejectProfile);
  const nudgeFinishSignup = useMutation(api.gates.nudgeFinishSignup);
  const [busy, setBusy] = useState(null);   // 'reject' | 'nudge'
  const [done, setDone] = useState(null);   // 'sent' | 'error'

  const isPending = p.is_verified !== true && !p.is_rejected;

  const btn = {
    padding: '0.35rem 0.7rem', borderRadius: 999, cursor: 'pointer',
    fontSize: '0.75rem', fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap',
  };

  if (!isPending) {
    return (
      <button
        onClick={e => { e.stopPropagation(); onReview(); }}
        style={{ ...btn, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(25,37,36,0.1)', color: SLATE }}
      >
        Review
      </button>
    );
  }

  const reject = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Reject ${p.full_name}? They'll receive a rejection email.`)) return;
    setBusy('reject');
    try { await rejectProfile({ profileId: p._id }); }
    finally { setBusy(null); }
  };

  const nudge = async (e) => {
    e.stopPropagation();
    setBusy('nudge');
    setDone(null);
    try {
      const res = await nudgeFinishSignup({ profileId: p._id });
      setDone(res?.ok ? 'sent' : 'error');
    } catch {
      setDone('error');
    } finally {
      setBusy(null);
      setTimeout(() => setDone(null), 3000);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
      <button
        onClick={e => { e.stopPropagation(); onReview(); }}
        style={{ ...btn, background: '#166534', border: 'none', color: '#fff' }}
      >
        Approve ▸
      </button>
      <button
        onClick={reject}
        disabled={busy === 'reject'}
        style={{ ...btn, background: 'transparent', border: '1px solid rgba(153,27,27,0.25)', color: '#991B1B', opacity: busy === 'reject' ? 0.6 : 1 }}
      >
        {busy === 'reject' ? '…' : 'Reject'}
      </button>
      {!p.clerk_registered && (
        <button
          onClick={nudge}
          disabled={busy === 'nudge'}
          title="Email them a link to finish creating their account"
          style={{ ...btn, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(25,37,36,0.12)', color: SLATE, opacity: busy === 'nudge' ? 0.6 : 1 }}
        >
          {busy === 'nudge' ? 'Sending…' : done === 'sent' ? 'Sent ✓' : done === 'error' ? 'Failed' : 'Finish signup ✉'}
        </button>
      )}
    </div>
  );
}

function CountBadge({ n, variant = 'green' }) {
  if (!n) return null;
  const colors = {
    green: { background: MINT, color: '#166534' },
    red:   { background: '#FEE2E2', color: '#991B1B' },
    amber: { background: '#FEF3C7', color: '#92400E' },
  };
  return (
    <span style={{ ...(colors[variant] ?? colors.green), borderRadius: '99px', padding: '0 0.4rem', fontSize: '0.7rem', fontWeight: 700, lineHeight: 1.6 }}>
      {n}
    </span>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.4rem 0.875rem', borderRadius: 999, fontSize: '0.82rem',
        fontWeight: active ? 600 : 400,
        background: active ? INK : 'transparent',
        color: active ? '#fff' : SLATE,
        border: 'none', cursor: 'pointer', transition: 'all 0.15s',
        fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.375rem',
      }}
    >
      {children}
    </button>
  );
}

function SocialCell({ p }) {
  const links = [];
  if (p.instagram_handle) links.push({ label: `@${p.instagram_handle.replace(/^@+/, '')} (IG)`, href: `https://instagram.com/${p.instagram_handle.replace('@', '')}` });
  if (p.tiktok_handle)    links.push({ label: `@${p.tiktok_handle.replace(/^@+/, '')} (TT)`, href: `https://tiktok.com/@${p.tiktok_handle.replace('@', '')}` });
  if (p.youtube_handle)   links.push({ label: 'YouTube', href: p.youtube_handle.startsWith('http') ? p.youtube_handle : `https://youtube.com/@${p.youtube_handle.replace('@', '')}` });
  if (!links.length) return <span style={{ color: SAGE }}>—</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
      {links.map(l => (
        <a key={l.label} href={l.href} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
          style={{ color: SLATE, fontSize: '0.75rem', textDecoration: 'none' }}>
          {l.label}
        </a>
      ))}
    </div>
  );
}

const TH_STYLE = { padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: SAGE, whiteSpace: 'nowrap' };
const TD_STYLE = { padding: '0.8rem 1rem', verticalAlign: 'top' };

export default function Users({ initialTab } = {}) {
  const [tab, setTab]               = useState(initialTab || 'creators');
  const [search, setSearch]         = useState('');
  const [acctFilter, setAcctFilter] = useState('all');
  const [copied, setCopied]         = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  const allProfiles   = useQuery(api.profiles.getAll);
  const founderCounts = useQuery(api.admin.getFounderCounts);

  const counts = founderCounts ?? { creator: 0, host: 0 };
  const isLoading = allProfiles === undefined;

  const nonRejected  = (allProfiles || []).filter(p => p.is_rejected !== true);
  const pending       = nonRejected.filter(p => p.is_verified !== true);
  const creatorsAll   = nonRejected.filter(p => p.role === 'creator');
  const hostsAll       = nonRejected.filter(p => p.role === 'host');
  const rejectedAll   = (allProfiles || []).filter(p => p.is_rejected === true);

  const baseRows =
    tab === 'pending'  ? pending      :
    tab === 'creators' ? creatorsAll :
    tab === 'hosts'    ? hostsAll    :
    rejectedAll;

  const filtered = baseRows
    .filter(p => {
      if (acctFilter === 'no_account')  return !p.clerk_registered;
      if (acctFilter === 'has_account') return !!p.clerk_registered;
      return true;
    })
    .filter(p => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q)
      );
    });

  const allEmails = filtered.map(p => p.email).filter(Boolean).join(', ');

  function copyAll() {
    navigator.clipboard.writeText(allEmails).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const stats = [
    { label: 'Pending',  value: pending.length,                                              color: INK },
    { label: 'Creators', value: creatorsAll.filter(p => p.is_verified === true).length,       color: '#0369A1' },
    { label: 'Hosts',    value: hostsAll.filter(p => p.is_verified === true).length,          color: '#92400E' },
    { label: 'Rejected', value: rejectedAll.length,                                           color: '#991B1B' },
  ];

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1180 }}>
      {/* ── Title ── */}
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Users
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.25rem' }}>
        Everyone in the pipeline — review, approve, and manage signups in one place.
      </p>

      {/* ── Stat tiles ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...GLASS, borderRadius: '1.25rem', padding: '0.875rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 110 }}>
            <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontSize: '0.72rem', color: SAGE }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Founder counters ── */}
      <div style={{ ...GLASS, display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.82rem', color: SLATE, padding: '0.625rem 1rem', borderRadius: 999, width: 'fit-content', marginBottom: '1.25rem', boxShadow: '0 1px 2px rgba(25,37,36,0.04)' }}>
        <span>
          <strong style={{ color: counts.creator >= FOUNDER_LIMIT ? '#991B1B' : '#166534', fontFamily: 'Cabinet Grotesk, sans-serif' }}>{counts.creator}</strong>
          <span style={{ color: '#D0D5CE' }}> / {FOUNDER_LIMIT}</span> Creator Founders
        </span>
        <span style={{ color: '#D0D5CE', fontSize: '1rem' }}>|</span>
        <span>
          <strong style={{ color: counts.host >= FOUNDER_LIMIT ? '#991B1B' : '#166534', fontFamily: 'Cabinet Grotesk, sans-serif' }}>{counts.host}</strong>
          <span style={{ color: '#D0D5CE' }}> / {FOUNDER_LIMIT}</span> Host Founders
        </span>
      </div>

      {/* ── Tabs ── */}
      <div style={{ ...GLASS, display: 'flex', gap: '0.2rem', marginBottom: '1rem', padding: '0.2rem', borderRadius: 999, width: 'fit-content' }}>
        <TabBtn active={tab === 'pending'} onClick={() => setTab('pending')}>
          Pending <CountBadge n={pending.length} variant="amber" />
        </TabBtn>
        <TabBtn active={tab === 'creators'} onClick={() => setTab('creators')}>
          Creators <CountBadge n={creatorsAll.length} />
        </TabBtn>
        <TabBtn active={tab === 'hosts'} onClick={() => setTab('hosts')}>
          Hosts <CountBadge n={hostsAll.length} />
        </TabBtn>
        <TabBtn active={tab === 'rejected'} onClick={() => setTab('rejected')}>
          Rejected <CountBadge n={rejectedAll.length} variant="red" />
        </TabBtn>
      </div>

      {/* ── Filter row ── */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, city…"
            style={{ ...GLASS, flex: 1, minWidth: 200, padding: '0.45rem 0.875rem', borderRadius: 999, fontSize: '0.82rem', fontFamily: 'inherit', color: INK, outline: 'none' }}
          />
          <div style={{ ...GLASS, display: 'flex', gap: '0.2rem', padding: '0.2rem', borderRadius: 999 }}>
            {[
              { key: 'all',         label: 'All' },
              { key: 'no_account',  label: 'Email only' },
              { key: 'has_account', label: 'Full account' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setAcctFilter(key)}
                style={{
                  padding: '0.35rem 0.75rem', borderRadius: 999, fontSize: '0.75rem',
                  fontWeight: acctFilter === key ? 700 : 400,
                  background: acctFilter === key ? INK : 'transparent',
                  color: acctFilter === key ? '#fff' : SLATE,
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={copyAll}
            disabled={!filtered.length}
            style={{
              ...GLASS, padding: '0.45rem 0.95rem', borderRadius: 999, fontSize: '0.78rem',
              fontWeight: 600, background: copied ? MINT : GLASS.background,
              color: copied ? '#166534' : SLATE,
              cursor: filtered.length ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit', transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
          >
            {copied ? 'Copied!' : `Copy ${filtered.length} emails`}
          </button>
        </div>
        <p style={{ fontSize: '0.72rem', color: SAGE, margin: '0.4rem 0 0' }}>
          Email only = we have their email but they haven't created a Collabnb account yet · Full account = they've signed up on the platform
        </p>
      </div>

      {/* ── Loading / empty ── */}
      {isLoading && (
        <div style={{ color: SAGE, fontSize: '0.85rem', padding: '3rem 0', textAlign: 'center' }}>Loading…</div>
      )}
      {!isLoading && filtered.length === 0 && (
        <div style={{ ...GLASS, padding: '3rem', textAlign: 'center', color: SAGE, fontSize: '0.85rem', borderRadius: '1.25rem' }}>
          {tab === 'rejected' ? 'No rejected users.'
            : baseRows.length === 0 ? 'Nobody here yet.'
            : 'No results match your filters.'}
        </div>
      )}

      {/* ── User table ── */}
      {!isLoading && filtered.length > 0 && (
        <div style={{ ...GLASS, borderRadius: '1.25rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
                {['Name / Email', 'Role', 'Account', 'Social', 'Location', 'Joined', 'Tags', ''].map((h, i, arr) => (
                  <th key={h} style={i === arr.length - 1 ? { ...TH_STYLE, paddingRight: '1.5rem' } : TH_STYLE}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr
                  key={p._id}
                  onClick={() => setSelectedProfileId(p._id)}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(25,37,36,0.05)' : 'none', transition: 'background 0.1s', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={TD_STYLE}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <Avatar url={p.avatar_url} name={p.full_name} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: INK }}>{p.full_name}</div>
                        <div style={{ color: SAGE, fontSize: '0.75rem' }}>{p.email}</div>
                        {tab === 'rejected' && p.rejection_reason && (
                          <div style={{ color: '#991B1B', fontSize: '0.72rem', marginTop: '0.15rem' }}>Reason: {p.rejection_reason}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={TD_STYLE}>
                    {p.role === 'creator'
                      ? <Badge bg="#E0F2FE" color="#0369A1">Creator</Badge>
                      : <Badge bg="#FEF3C7" color="#92400E">Host</Badge>
                    }
                  </td>
                  <td style={TD_STYLE}>
                    {p.clerk_registered
                      ? <Badge bg="#DCFCE7" color="#166534">Full account</Badge>
                      : <Badge bg="rgba(25,37,36,0.06)" color={SAGE}>Email only</Badge>
                    }
                  </td>
                  <td style={TD_STYLE}><SocialCell p={p} /></td>
                  <td style={{ ...TD_STYLE, color: SLATE }}>
                    {[p.city, p.region].filter(Boolean).join(', ') || <span style={{ color: SAGE }}>—</span>}
                  </td>
                  <td style={{ ...TD_STYLE, color: SLATE, whiteSpace: 'nowrap' }}>
                    {fmtDate(p._creationTime)}
                  </td>
                  <td style={TD_STYLE}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-start' }}>
                      {p.is_verified !== true && !p.is_rejected && <Badge bg="#FEF3C7" color="#92400E">Pending</Badge>}
                      {p.is_founder && !p.is_rejected && <Badge bg={MINT} color="#166534">Founder</Badge>}
                      {p.beta && <Badge bg="#F3E8FF" color="#7E22CE">Beta</Badge>}
                      {p.referred_by && <Badge bg="#EDE9FE" color="#5B21B6">Referred</Badge>}
                      {p.interview_requested && !p.is_rejected && <Badge bg="#DBEAFE" color="#1D4ED8">Interview</Badge>}
                      {p.is_rejected && <Badge bg="#FEE2E2" color="#991B1B">Rejected</Badge>}
                    </div>
                  </td>
                  <td style={{ ...TD_STYLE, paddingRight: '1.5rem' }}>
                    <RowReviewActions p={p} onReview={() => setSelectedProfileId(p._id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UserDetailPanel
        profileId={selectedProfileId}
        onClose={() => setSelectedProfileId(null)}
      />
    </div>
  );
}
