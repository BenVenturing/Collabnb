import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { formatDate } from '../../lib/dateUtils';

const INK = '#192524', SLATE = '#3C5759', SAGE = '#959D90';

const STATUS_META = {
  pending:  { label: 'Pending',  bg: '#F7F5F2', color: SLATE },
  approved: { label: 'Approved', bg: '#D1FAE5', color: '#166534' },
  declined: { label: 'Declined', bg: '#FEE2E2', color: '#991B1B' },
  payable:  { label: 'Payable',  bg: '#FEF3C7', color: '#92400E' },
  paid:     { label: 'Paid',     bg: '#D1FAE5', color: '#166534' },
  reversed: { label: 'Reversed', bg: '#FEE2E2', color: '#991B1B' },
  taken:    { label: 'Active',   bg: '#D1EBDB', color: SLATE },
  inactive: { label: 'Inactive', bg: '#F7F5F2', color: SAGE },
};

const AMBASSADOR_LINK_BASE = 'https://collabnb.com/join.html?amb=';

function Badge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.55rem', borderRadius: 99, background: m.bg, color: m.color, fontWeight: 500, whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  );
}

function ActionBtn({ onClick, children, variant = 'default', disabled }) {
  const styles = {
    default: { background: '#F7F5F2', color: SLATE, border: '1px solid rgba(25,37,36,0.08)' },
    check:   { background: '#D1FAE5', color: '#166534', border: '1px solid rgba(22,101,52,0.15)' },
    hide:    { background: '#FEE2E2', color: '#991B1B', border: '1px solid rgba(153,27,27,0.15)' },
  };
  const s = styles[variant] || styles.default;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...s, fontSize: '0.75rem', fontWeight: 500, padding: '0.25rem 0.625rem', borderRadius: '0.4rem', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
    >
      {children}
    </button>
  );
}

const money = (n) => `$${(n || 0).toFixed(2)}`;

// ─── Applications ─────────────────────────────────────────────────────────────
function Applications() {
  const apps = useQuery(api.ambassadors.adminListApplications);
  const review = useMutation(api.ambassadors.adminReviewApplication);
  const [expanded, setExpanded] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const rows = (apps || []).filter(a => showAll || a.status === 'pending');

  return (
    <div>
      <label style={{ fontSize: '0.8rem', color: SLATE, display: 'inline-flex', gap: '0.4rem', alignItems: 'center', marginBottom: '1rem', cursor: 'pointer' }}>
        <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} style={{ accentColor: SLATE }} />
        Show reviewed applications
      </label>

      {apps === undefined && <div style={{ color: SAGE, fontSize: '0.85rem', padding: '3rem 0', textAlign: 'center' }}>Loading…</div>}
      {apps !== undefined && rows.length === 0 && (
        <div style={{ color: SAGE, fontSize: '0.85rem', padding: '3rem 0', textAlign: 'center' }}>
          {showAll ? 'No applications yet.' : 'No pending applications.'}
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', overflow: 'hidden' }}>
          {rows.map((a, i) => (
            <div key={a._id} style={{ borderBottom: i < rows.length - 1 ? '1px solid rgba(25,37,36,0.05)' : 'none' }}>
              <div
                onClick={() => setExpanded(expanded === a._id ? null : a._id)}
                style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 1fr 90px 110px 150px', gap: '0.5rem', padding: '0.75rem 1rem', alignItems: 'center', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: INK }}>{a.full_name}</span>
                <span style={{ fontSize: '0.78rem', color: SLATE, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.email}</span>
                <span style={{ fontSize: '0.8rem', color: SLATE }}>{a.country}</span>
                <span style={{ fontSize: '0.75rem', color: SAGE }}>{formatDate(a.created_at)}</span>
                <Badge status={a.status} />
                <div style={{ display: 'flex', gap: '0.3rem' }} onClick={e => e.stopPropagation()}>
                  {a.status === 'pending' && (
                    <>
                      <ActionBtn variant="check" onClick={() => review({ id: a._id, decision: 'approved' })}>Approve</ActionBtn>
                      <ActionBtn variant="hide" onClick={() => review({ id: a._id, decision: 'declined' })}>Decline</ActionBtn>
                    </>
                  )}
                </div>
              </div>
              {expanded === a._id && (
                <div style={{ padding: '0 1rem 1rem', fontSize: '0.8rem', color: SLATE, lineHeight: 1.55, background: '#FAFAF8' }}>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', padding: '0.75rem 0', color: SAGE, fontSize: '0.75rem' }}>
                    {a.based_in && <span>📍 {a.based_in}</span>}
                    {a.instagram_handle && <span>IG {a.instagram_handle}</span>}
                    {a.tiktok_handle && <span>TT {a.tiktok_handle}</span>}
                    {a.youtube_handle && <span>YT {a.youtube_handle}</span>}
                    {a.audience_size && <span>Audience: {a.audience_size}</span>}
                  </div>
                  <p style={{ margin: '0 0 0.6rem' }}><strong style={{ color: INK }}>How they'd push it:</strong><br />{a.content_plan}</p>
                  <p style={{ margin: '0 0 0.6rem' }}><strong style={{ color: INK }}>Connections:</strong><br />{a.connections}</p>
                  {a.extra && <p style={{ margin: 0 }}><strong style={{ color: INK }}>Extra:</strong><br />{a.extra}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Countries ────────────────────────────────────────────────────────────────
function Countries() {
  const countries = useQuery(api.ambassadors.adminListCountries);
  const upsert = useMutation(api.ambassadors.adminUpsertCountry);
  const [pctDraft, setPctDraft] = useState({});

  if (countries === undefined) return <div style={{ color: SAGE, fontSize: '0.85rem', padding: '3rem 0', textAlign: 'center' }}>Loading…</div>;
  if (countries.length === 0) return (
    <div style={{ color: SAGE, fontSize: '0.85rem', padding: '3rem 0', textAlign: 'center' }}>
      No ambassadors yet — approve an application to create the first country link.
    </div>
  );

  const save = (c, patch) => upsert({
    slug: c.slug, country: c.country, status: c.status,
    ambassador_name: c.ambassador_name, ambassador_email: c.ambassador_email,
    share_pct: c.share_pct, ...patch,
  });

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {countries.map((c) => {
        const link = AMBASSADOR_LINK_BASE + c.slug;
        const draft = pctDraft[c.slug];
        return (
          <div key={c.slug} style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', padding: '1.1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: INK }}>{c.country}</span>
              <Badge status={c.status} />
              {c.ambassador_name && <span style={{ fontSize: '0.78rem', color: SLATE }}>{c.ambassador_name} · {c.ambassador_email}</span>}
              <select
                value={c.status}
                onChange={e => save(c, { status: e.target.value })}
                style={{ marginLeft: 'auto', fontSize: '0.78rem', padding: '0.3rem 0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(25,37,36,0.12)', color: SLATE, fontFamily: 'inherit', background: '#F7F5F2' }}
              >
                <option value="taken">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <code style={{ fontSize: '0.75rem', color: SAGE, background: '#F7F5F2', padding: '0.2rem 0.5rem', borderRadius: '0.4rem' }}>{link}</code>
              <ActionBtn onClick={() => navigator.clipboard?.writeText(link)}>Copy link</ActionBtn>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '0.75rem', flexWrap: 'wrap', fontSize: '0.78rem', color: SLATE }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                Rate:
                <input
                  type="number" min={0} max={100} step={1}
                  value={draft ?? c.share_pct}
                  onChange={e => setPctDraft(d => ({ ...d, [c.slug]: e.target.value }))}
                  onBlur={() => {
                    const n = Number(draft);
                    if (draft !== undefined && Number.isFinite(n) && n !== c.share_pct) save(c, { share_pct: n });
                    setPctDraft(d => { const next = { ...d }; delete next[c.slug]; return next; });
                  }}
                  style={{ width: '3.5rem', fontSize: '0.78rem', padding: '0.2rem 0.4rem', borderRadius: '0.35rem', border: '1px solid rgba(25,37,36,0.12)', fontFamily: 'inherit' }}
                />
                <strong>%</strong> of platform fee
              </span>
              <span>Collabs: <strong>{c.stats.collabs}</strong></span>
              <span>Pending: <strong>{money(c.stats.pending)}</strong></span>
              <span style={{ color: '#92400E' }}>Payable: <strong>{money(c.stats.payable)}</strong></span>
              <span style={{ color: '#166534' }}>Paid: <strong>{money(c.stats.paid)}</strong></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Earnings ─────────────────────────────────────────────────────────────────
function Earnings() {
  const earnings = useQuery(api.ambassadors.adminListEarnings);
  const markPaid = useMutation(api.ambassadors.adminMarkEarningsPaid);
  const reverse = useMutation(api.ambassadors.adminReverseEarning);
  const [selected, setSelected] = useState(new Set());

  if (earnings === undefined) return <div style={{ color: SAGE, fontSize: '0.85rem', padding: '3rem 0', textAlign: 'center' }}>Loading…</div>;

  const totals = earnings.reduce((t, e) => {
    t[e.derived_status] = (t[e.derived_status] || 0) + e.amount;
    return t;
  }, {});

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  async function paySelected() {
    const note = window.prompt('Payout reference (e.g. "Wise transfer Jul 2026")') || undefined;
    await markPaid({ ids: [...selected], note });
    setSelected(new Set());
  }

  const selectedTotal = earnings.filter(e => selected.has(e._id)).reduce((t, e) => t + e.amount, 0);

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {['pending', 'payable', 'paid'].map(s => (
          <div key={s} style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.6rem', padding: '0.5rem 0.9rem', fontSize: '0.8rem', color: SLATE }}>
            {STATUS_META[s].label}: <strong style={{ color: INK }}>{money(totals[s])}</strong>
          </div>
        ))}
        {selected.size > 0 && (
          <button
            onClick={paySelected}
            style={{ marginLeft: 'auto', padding: '0.45rem 1rem', borderRadius: '0.5rem', border: 'none', background: INK, color: '#F7F5F2', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Mark {selected.size} paid — {money(selectedTotal)}
          </button>
        )}
      </div>

      {earnings.length === 0 && (
        <div style={{ color: SAGE, fontSize: '0.85rem', padding: '3rem 0', textAlign: 'center' }}>
          No earnings yet. Rows appear automatically when a collab completes for a host or creator who signed up through an ambassador's link.
        </div>
      )}

      {earnings.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '30px 90px 1fr 1fr 70px 50px 80px 100px 90px', gap: '0.4rem', padding: '0.6rem 1rem', background: '#F7F5F2', borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
            {['', 'Date', 'Country / Ambassador', 'Collab', 'Fee', '%', 'Amount', 'Status', ''].map((h, i) => (
              <span key={i} style={{ fontSize: '0.7rem', fontWeight: 600, color: SAGE, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</span>
            ))}
          </div>
          {earnings.map((e, i) => (
            <div key={e._id} style={{ display: 'grid', gridTemplateColumns: '30px 90px 1fr 1fr 70px 50px 80px 100px 90px', gap: '0.4rem', padding: '0.65rem 1rem', alignItems: 'center', borderBottom: i < earnings.length - 1 ? '1px solid rgba(25,37,36,0.05)' : 'none' }}>
              <input
                type="checkbox"
                disabled={e.derived_status !== 'payable' && e.derived_status !== 'pending'}
                checked={selected.has(e._id)}
                onChange={() => toggle(e._id)}
                style={{ accentColor: SLATE }}
              />
              <span style={{ fontSize: '0.75rem', color: SAGE }}>{formatDate(e.created_at)}</span>
              <span style={{ fontSize: '0.8rem', color: INK }}>
                {e.country}
                {e.ambassador_name && <span style={{ color: SAGE, fontSize: '0.72rem' }}> · {e.ambassador_name}</span>}
              </span>
              <span style={{ fontSize: '0.78rem', color: SLATE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.property_name || e.contract_id.slice(0, 10)}</span>
              <span style={{ fontSize: '0.78rem', color: SLATE }}>{money(e.fee_amount)}</span>
              <span style={{ fontSize: '0.78rem', color: SLATE }}>{e.share_pct}%</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: INK }}>{money(e.amount)}</span>
              <Badge status={e.derived_status} />
              <div>
                {(e.derived_status === 'pending' || e.derived_status === 'payable') && (
                  <ActionBtn variant="hide" onClick={() => reverse({ id: e._id })}>Reverse</ActionBtn>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────
const VIEWS = [
  { id: 'applications', label: 'Applications' },
  { id: 'countries', label: 'Countries' },
  { id: 'earnings', label: 'Earnings' },
];

export default function AmbassadorManager() {
  const [view, setView] = useState('applications');
  const apps = useQuery(api.ambassadors.adminListApplications);
  const pendingCount = (apps || []).filter(a => a.status === 'pending').length;

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1000 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Ambassadors <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: SLATE, background: '#D1EBDB', borderRadius: 99, padding: '0.15rem 0.5rem', verticalAlign: 'middle' }}>Beta</span>
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.25rem' }}>
        One exclusive partner per country, earning a share of the platform fee on every completed collab from a host or creator who signed up through their unique link. Payouts are manual for the beta — mark earnings paid once you've sent the transfer.
      </p>

      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: '#F7F5F2', padding: '0.2rem', borderRadius: '0.5rem', width: 'fit-content', border: '1px solid rgba(25,37,36,0.06)' }}>
        {VIEWS.map(v => {
          const active = view === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '0.35rem', fontSize: '0.8rem',
                fontWeight: active ? 600 : 400,
                background: active ? INK : 'transparent', color: active ? '#fff' : SLATE,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              }}
            >
              {v.label}
              {v.id === 'applications' && pendingCount > 0 && (
                <span style={{ marginLeft: '0.35rem', background: active ? '#fff' : SLATE, color: active ? INK : '#fff', borderRadius: 99, padding: '0 0.35rem', fontSize: '0.68rem', fontWeight: 700 }}>{pendingCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {view === 'applications' && <Applications />}
      {view === 'countries' && <Countries />}
      {view === 'earnings' && <Earnings />}
    </div>
  );
}
