import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#959D90';
const BONE  = '#F7F5F2';

const STATUS_FILTERS = ['all', 'draft', 'sent', 'signed', 'active', 'completed', 'cancelled'];

const statusColors = {
  draft:      { bg: '#F7F5F2',  color: '#3C5759' },
  sent:       { bg: '#FEF3C7',  color: '#92400E' },
  signed:     { bg: '#DBEAFE',  color: '#0369A1' },
  active:     { bg: '#DCFCE7',  color: '#166534' },
  completed:  { bg: '#D1EBDB',  color: '#166534' },
  cancelled:  { bg: '#FEE2E2',  color: '#991B1B' },
};

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }) {
  const s = (status ?? 'draft').toLowerCase();
  const colors = statusColors[s] ?? { bg: '#F7F5F2', color: '#3C5759' };
  return (
    <span style={{
      fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.45rem',
      borderRadius: 99, background: colors.bg, color: colors.color,
      textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {s}
    </span>
  );
}

export default function ContractManager() {
  const contracts = useQuery(api.contracts.getAll);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openId, setOpenId] = useState(null);

  const openContract = (contracts ?? []).find((c) => String(c._id) === String(openId)) || null;

  const filtered = (contracts ?? []).filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.creator_name?.toLowerCase().includes(q) ||
        c.host_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCount = (contracts ?? []).filter(c => c.status === 'active').length;
  const signedCount = (contracts ?? []).filter(c => c.creator_signed && c.host_signed).length;
  const paidCount   = (contracts ?? []).filter(c => c.paid === true).length;

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1100 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Contract Management
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.5rem' }}>
        View and manage all contracts on the platform.
      </p>

      {/* ── Stats ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total',        value: contracts?.length ?? '…', color: INK },
          { label: 'Active',       value: activeCount,               color: '#166534' },
          { label: 'Fully Signed', value: signedCount,               color: '#0369A1' },
          { label: 'Paid',         value: paidCount,                 color: '#7E22CE' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 100 }}>
            <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontSize: '0.72rem', color: SAGE }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Filters + Search ── */}
      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.78rem',
                fontWeight: statusFilter === s ? 700 : 400,
                background: statusFilter === s ? INK : '#fff',
                color: statusFilter === s ? '#fff' : SLATE,
                border: `1px solid ${statusFilter === s ? 'transparent' : 'rgba(25,37,36,0.12)'}`,
                cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
              }}
            >
              {s === 'all' ? 'All Status' : s}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search creator or host…"
          style={{ flex: 1, minWidth: 200, padding: '0.4rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.82rem', border: '1px solid rgba(25,37,36,0.12)', fontFamily: 'inherit', color: INK, outline: 'none', background: '#fff' }}
        />
      </div>

      {/* ── Loading ── */}
      {contracts === undefined && (
        <div style={{ padding: '3rem', textAlign: 'center', color: SAGE, fontSize: '0.85rem', background: '#fff', borderRadius: '0.875rem', border: '1px solid rgba(25,37,36,0.07)' }}>
          Loading…
        </div>
      )}

      {/* ── Empty ── */}
      {contracts !== undefined && filtered.length === 0 && (
        <div style={{ padding: '3rem', textAlign: 'center', background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem' }}>
          <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>📄</p>
          <p style={{ color: SAGE, fontSize: '0.85rem', margin: 0 }}>
            {contracts.length === 0
              ? 'No contracts have been created on the platform yet.'
              : 'No contracts match your current filters.'}
          </p>
        </div>
      )}

      {/* ── Table ── */}
      {contracts !== undefined && filtered.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
                {['Creator', 'Host', 'Property', 'Status', 'Dates', 'Payment', 'Signatures', 'Created', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: SAGE, whiteSpace: 'nowrap', minWidth: h === 'Actions' ? 150 : undefined }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr
                  key={String(c._id)}
                  onClick={() => setOpenId(c._id)}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(25,37,36,0.05)' : 'none', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = BONE; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: INK }}>{c.creator_name || '—'}</td>
                  <td style={{ padding: '0.75rem', color: SLATE }}>{c.host_name || '—'}</td>
                  <td style={{ padding: '0.75rem', color: SLATE, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.property_name || c.location || '—'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <StatusBadge status={c.status} />
                    {c.admin_dismissed && <HandledBadge />}
                  </td>
                  <td style={{ padding: '0.75rem', color: SLATE, whiteSpace: 'nowrap' }}>{c.dates || '—'}</td>
                  <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                    {c.paid
                      ? <span style={{ color: '#166534', fontWeight: 600 }}>Paid{c.payment_amount ? ` $${c.payment_amount}` : ''}</span>
                      : <span style={{ color: SLATE }}>{c.payment || '—'}</span>}
                  </td>
                  <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                    <span style={{ color: c.creator_signed ? '#166534' : SAGE, marginRight: '0.5rem', fontSize: '0.8rem' }}>
                      {c.creator_signed ? '✓' : '○'} Creator
                    </span>
                    <span style={{ color: c.host_signed ? '#166534' : SAGE, fontSize: '0.8rem' }}>
                      {c.host_signed ? '✓' : '○'} Host
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', color: SAGE, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {fmtDate(c._creationTime)}
                  </td>
                  <td style={{ padding: '0.75rem' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-start' }}>
                      <PromptButtons contract={c} size="sm" direction="column" />
                      <ManageButtons contract={c} size="sm" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openContract && (
        <ContractDetailModal contract={openContract} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}

function PromptButtons({ contract: c, size = 'md', direction = 'row' }) {
  const promptParty = useMutation(api.contracts.promptParty);
  const [busy, setBusy] = useState(null);   // 'host' | 'creator'
  const [done, setDone] = useState(null);   // { party, ok, reason }

  const send = async (party) => {
    setBusy(party);
    setDone(null);
    try {
      const res = await promptParty({ contractId: c._id, party });
      setDone({ party, ...(res || { ok: true }) });
    } catch {
      setDone({ party, ok: false, reason: 'error' });
    } finally {
      setBusy(null);
      setTimeout(() => setDone(null), 3500);
    }
  };

  const pad = size === 'sm' ? '0.25rem 0.55rem' : '0.4rem 0.8rem';
  const fs = size === 'sm' ? '0.7rem' : '0.8rem';

  const btn = (party, label, disabled) => (
    <button
      onClick={() => send(party)}
      disabled={disabled || busy === party}
      title={disabled ? `${label.replace('Prompt ', '')} has already signed` : ''}
      style={{
        padding: pad, fontSize: fs, fontWeight: 600, borderRadius: '0.4rem',
        border: `1px solid ${disabled ? 'rgba(25,37,36,0.08)' : 'rgba(60,87,89,0.3)'}`,
        background: disabled ? '#F7F5F2' : '#fff',
        color: disabled ? SAGE : SLATE,
        cursor: disabled || busy === party ? 'default' : 'pointer',
        fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: busy === party ? 0.6 : 1,
      }}
    >
      {busy === party ? 'Sending…' : label}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: direction, gap: '0.35rem', alignItems: direction === 'column' ? 'flex-start' : 'center' }}>
      {btn('host', 'Prompt Host', !!c.host_signed)}
      {btn('creator', 'Prompt Creator', !!c.creator_signed)}
      {done && (
        <span style={{ fontSize: '0.7rem', color: done.ok ? '#166534' : '#991B1B', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {done.ok
            ? `Sent to ${done.party}`
            : done.reason === 'no_account' ? 'No linked account' : 'Failed'}
        </span>
      )}
    </div>
  );
}

function HandledBadge() {
  return (
    <span style={{
      display: 'inline-block', marginLeft: '0.4rem', fontSize: '0.6rem', fontWeight: 700,
      padding: '0.1rem 0.4rem', borderRadius: 99, background: '#E5E7EB', color: '#4B5563',
      textTransform: 'uppercase', letterSpacing: '0.04em', verticalAlign: 'middle',
    }}>
      Handled
    </span>
  );
}

function ManageButtons({ contract: c, size = 'md' }) {
  const removeContract = useMutation(api.contracts.remove);
  const setHandled = useMutation(api.contracts.setHandled);
  const [busy, setBusy] = useState(null);   // 'handle' | 'delete'

  const pad = size === 'sm' ? '0.25rem 0.55rem' : '0.4rem 0.8rem';
  const fs = size === 'sm' ? '0.7rem' : '0.8rem';

  const toggleHandled = async () => {
    setBusy('handle');
    try { await setHandled({ contractId: c._id, handled: !c.admin_dismissed }); }
    finally { setBusy(null); }
  };

  const del = async () => {
    if (!window.confirm(`Delete this contract (${c.creator_name || '—'} ↔ ${c.host_name || '—'})? This permanently removes it and cannot be undone.`)) return;
    setBusy('delete');
    try { await removeContract({ contractId: c._id }); }
    finally { setBusy(null); }
  };

  return (
    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
      <button
        onClick={toggleHandled}
        disabled={busy === 'handle'}
        style={{
          padding: pad, fontSize: fs, fontWeight: 600, borderRadius: '0.4rem',
          border: '1px solid rgba(60,87,89,0.3)', background: c.admin_dismissed ? '#EEF2F0' : '#fff',
          color: SLATE, cursor: busy === 'handle' ? 'default' : 'pointer',
          fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: busy === 'handle' ? 0.6 : 1,
        }}
      >
        {busy === 'handle' ? '…' : c.admin_dismissed ? 'Unmark' : 'Mark handled'}
      </button>
      <button
        onClick={del}
        disabled={busy === 'delete'}
        style={{
          padding: pad, fontSize: fs, fontWeight: 600, borderRadius: '0.4rem',
          border: '1px solid rgba(153,27,27,0.3)', background: '#fff',
          color: '#991B1B', cursor: busy === 'delete' ? 'default' : 'pointer',
          fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: busy === 'delete' ? 0.6 : 1,
        }}
      >
        {busy === 'delete' ? '…' : 'Delete'}
      </button>
    </div>
  );
}

function Row({ label, value }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div style={{ display: 'flex', gap: '1rem', padding: '0.55rem 0', borderBottom: '1px solid rgba(25,37,36,0.05)' }}>
      <span style={{ flex: '0 0 130px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: SAGE, paddingTop: '0.1rem' }}>{label}</span>
      <span style={{ flex: 1, fontSize: '0.85rem', color: INK, lineHeight: 1.5 }}>{value}</span>
    </div>
  );
}

function ContractDetailModal({ contract: c, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sigLine = (signed, at, label) => (
    <span style={{ color: signed ? '#166534' : SAGE, fontSize: '0.85rem', fontWeight: signed ? 600 : 400 }}>
      {signed ? '✓' : '○'} {label}{signed && at ? ` · ${at}` : ''}
    </span>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem', background: 'rgba(25,37,36,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto',
          background: '#fff', borderRadius: '1.25rem', padding: '1.75rem 1.75rem 1.5rem',
          boxShadow: '0 24px 60px rgba(25,37,36,0.25)',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: '1rem', right: '1rem', width: 36, height: 36, borderRadius: '50%',
            border: 'none', background: BONE, color: SLATE, cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ×
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', paddingRight: '2.5rem' }}>
          <h2 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.25rem', fontWeight: 700, color: INK, margin: 0 }}>
            {c.property_name || c.location || 'Contract'}
          </h2>
          <StatusBadge status={c.status} />
        </div>
        <p style={{ fontSize: '0.8rem', color: SAGE, margin: '0 0 1rem' }}>
          {c.creator_name} &nbsp;↔&nbsp; {c.host_name}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <PromptButtons contract={c} />
          <ManageButtons contract={c} />
        </div>

        <Row label="Creator" value={c.creator_name} />
        <Row label="Host" value={c.host_name} />
        <Row label="Property" value={c.property_name} />
        <Row label="Location" value={c.location} />
        <Row label="Dates" value={c.dates} />
        <Row label="Deliverables" value={c.deliverables} />
        <Row label="Payment" value={c.paid ? `Paid${c.payment_amount ? ` · $${c.payment_amount}` : ''}` : (c.payment || '—')} />
        <Row label="Currency" value={c.currency} />
        <Row label="Usage Rights" value={c.usage_rights} />
        <Row label="Summary" value={c.summary_note} />
        <Row label="Signatures" value={
          <span style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {sigLine(c.creator_signed, c.creator_signed_at, 'Creator')}
            {sigLine(c.host_signed, c.host_signed_at, 'Host')}
          </span>
        } />
        <Row label="Sent" value={c.sent_at ? fmtDate(c.sent_at) : undefined} />
        <Row label="Created" value={fmtDate(c._creationTime)} />
      </div>
    </div>
  );
}
