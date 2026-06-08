import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import UserDetailPanel from '../../components/admin/UserDetailPanel';

const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#959D90';
const BONE  = '#F7F5F2';
const MINT  = '#D1EBDB';

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Badge({ color, bg, children }) {
  return (
    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 99, background: bg, color, display: 'inline-block', lineHeight: 1.6 }}>
      {children}
    </span>
  );
}

const ROLE_FILTERS = ['all', 'creator', 'host'];
const ACCT_FILTERS = ['all', 'no_account', 'has_account'];

export default function WaitlistManager() {
  const allProfiles = useQuery(api.waitlist.getWaitlist);
  const [roleFilter, setRoleFilter] = useState('all');
  const [acctFilter, setAcctFilter] = useState('all');
  const [search,     setSearch]     = useState('');
  const [copied,     setCopied]     = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  if (allProfiles === undefined) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: SAGE, fontSize: '0.85rem' }}>Loading…</div>;
  }

  // Waitlist = profiles with tier 'waitlist' who haven't been approved yet
  const waitlist = allProfiles.filter((p) => p.tier === 'waitlist' && !p.is_verified);

  const filtered = waitlist
    .filter((p) => roleFilter === 'all' || p.role === roleFilter)
    .filter((p) => {
      if (acctFilter === 'no_account')  return !p.clerk_registered;
      if (acctFilter === 'has_account') return !!p.clerk_registered;
      return true;
    })
    .filter((p) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q)
      );
    });

  const creatorCount   = waitlist.filter((p) => p.role === 'creator').length;
  const hostCount      = waitlist.filter((p) => p.role === 'host').length;
  const betaCount      = waitlist.filter((p) => p.beta).length;
  const founderCount   = waitlist.filter((p) => p.is_founder).length;
  const noAccountCount = waitlist.filter((p) => !p.clerk_registered).length;

  const allEmails = filtered.map((p) => p.email).filter(Boolean).join(', ');

  function copyAll() {
    navigator.clipboard.writeText(allEmails).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function mailOne(email, name) {
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Your Collabnb waitlist spot')}`;
  }

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 900 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Waitlist Manager
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.5rem' }}>
        Everyone who signed up from the marketing site before creating a full account.
      </p>

      {/* ── Stats ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Signups',  value: waitlist.length, color: INK        },
          { label: 'Creators',       value: creatorCount,    color: '#0369A1'   },
          { label: 'Hosts',          value: hostCount,       color: '#92400E'   },
          { label: 'No Account Yet', value: noAccountCount,  color: '#B45309'   },
          { label: 'Beta Access',    value: betaCount,       color: '#7E22CE'   },
          { label: 'Founders',       value: founderCount,    color: '#166534'   },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 110 }}>
            <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontSize: '0.72rem', color: SAGE }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Controls ── */}
      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {/* Role filter */}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.78rem',
                fontWeight: roleFilter === r ? 700 : 400,
                background: roleFilter === r ? INK : '#fff',
                color: roleFilter === r ? '#fff' : SLATE,
                border: `1px solid ${roleFilter === r ? 'transparent' : 'rgba(25,37,36,0.12)'}`,
                cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
              }}
            >
              {r === 'all' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1) + 's'}
            </button>
          ))}
        </div>

        {/* Account status filter */}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {[
            { key: 'all',         label: 'All Status' },
            { key: 'no_account',  label: 'No Account' },
            { key: 'has_account', label: 'Has Account' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setAcctFilter(key)}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.78rem',
                fontWeight: acctFilter === key ? 700 : 400,
                background: acctFilter === key ? (key === 'no_account' ? '#92400E' : key === 'has_account' ? '#166534' : INK) : '#fff',
                color: acctFilter === key ? '#fff' : SLATE,
                border: `1px solid ${acctFilter === key ? 'transparent' : 'rgba(25,37,36,0.12)'}`,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, city…"
          style={{ flex: 1, minWidth: 180, padding: '0.4rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.82rem', border: '1px solid rgba(25,37,36,0.12)', fontFamily: 'inherit', color: INK, outline: 'none', background: '#fff' }}
        />

        {/* Copy emails */}
        <button
          onClick={copyAll}
          disabled={!filtered.length}
          style={{
            padding: '0.4rem 0.875rem', borderRadius: '0.4rem', fontSize: '0.78rem',
            fontWeight: 600, background: copied ? MINT : '#fff',
            color: copied ? '#166534' : SLATE,
            border: '1px solid rgba(25,37,36,0.12)',
            cursor: filtered.length ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}
        >
          {copied ? 'Copied!' : `Copy ${filtered.length} emails`}
        </button>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: SAGE, fontSize: '0.85rem', background: '#fff', borderRadius: '0.75rem', border: '1px solid rgba(25,37,36,0.07)' }}>
          {waitlist.length === 0 ? 'No waitlist signups yet.' : 'No results match your filters.'}
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
                {['Name / Email', 'Role', 'Account', 'Social', 'Location', 'Joined', 'Tags', ''].map((h) => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: SAGE, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr
                  key={p._id}
                  onClick={() => setSelectedProfileId(p._id)}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(25,37,36,0.05)' : 'none', transition: 'background 0.1s', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = BONE; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Name + email */}
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ fontWeight: 600, color: INK }}>{p.full_name}</div>
                    <div style={{ color: SAGE, fontSize: '0.75rem' }}>{p.email}</div>
                  </td>

                  {/* Role */}
                  <td style={{ padding: '0.875rem 1rem' }}>
                    {p.role === 'creator'
                      ? <Badge bg="#E0F2FE" color="#0369A1">Creator</Badge>
                      : <Badge bg="#FEF3C7" color="#92400E">Host</Badge>
                    }
                  </td>

                  {/* Account status */}
                  <td style={{ padding: '0.875rem 1rem' }}>
                    {p.clerk_registered
                      ? <Badge bg="#DCFCE7" color="#166534">✓ Account</Badge>
                      : <Badge bg="#FEF3C7" color="#B45309">Waitlist only</Badge>
                    }
                  </td>

                  {/* Social */}
                  <td style={{ padding: '0.875rem 1rem', color: SLATE, fontSize: '0.78rem' }}>
                    {p.instagram_handle && <div>@{p.instagram_handle} (IG)</div>}
                    {p.tiktok_handle    && <div>@{p.tiktok_handle} (TT)</div>}
                    {!p.instagram_handle && !p.tiktok_handle && <span style={{ color: SAGE }}>—</span>}
                  </td>

                  {/* Location */}
                  <td style={{ padding: '0.875rem 1rem', color: SLATE }}>
                    {[p.city, p.region].filter(Boolean).join(', ') || <span style={{ color: SAGE }}>—</span>}
                  </td>

                  {/* Joined */}
                  <td style={{ padding: '0.875rem 1rem', color: SLATE, whiteSpace: 'nowrap' }}>
                    {fmtDate(p._creationTime)}
                  </td>

                  {/* Tags */}
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      {p.is_founder && <Badge bg={MINT} color="#166534">Founder</Badge>}
                      {p.beta       && <Badge bg="#F3E8FF" color="#7E22CE">Beta</Badge>}
                    </div>
                  </td>

                  {/* Action */}
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <button
                      onClick={() => mailOne(p.email, p.full_name)}
                      title={`Email ${p.full_name}`}
                      style={{ padding: '0.3rem 0.5rem', borderRadius: '0.375rem', background: '#fff', border: '1px solid rgba(25,37,36,0.12)', cursor: 'pointer', color: SLATE, display: 'flex', alignItems: 'center' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    </button>
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
