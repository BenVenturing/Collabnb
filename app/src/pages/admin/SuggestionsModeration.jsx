import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { formatDate } from '../../lib/dateUtils';

const STATUSES = ['All', 'Pending', 'Approved', 'Implemented', 'Rejected'];

const STATUS_META = {
  pending:     { label: 'Pending',     bg: '#F7F5F2', color: '#3C5759' },
  approved:    { label: '⭐ Featured', bg: '#FEF3C7', color: '#92400E' },
  implemented: { label: '✅ Done',     bg: '#D1FAE5', color: '#166534' },
  rejected:    { label: 'Hidden',      bg: '#FEE2E2', color: '#991B1B' },
};

function statusMeta(s) {
  return STATUS_META[s] || STATUS_META.pending;
}

function StatusBadge({ status }) {
  const meta = statusMeta(status);
  return (
    <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.55rem', borderRadius: '99px', background: meta.bg, color: meta.color, fontWeight: 500, whiteSpace: 'nowrap' }}>
      {meta.label}
    </span>
  );
}

function ActionBtn({ onClick, children, variant = 'default' }) {
  const styles = {
    default: { background: '#F7F5F2', color: '#3C5759', border: '1px solid rgba(25,37,36,0.08)' },
    star:    { background: '#FEF3C7', color: '#92400E', border: '1px solid rgba(146,64,14,0.15)' },
    check:   { background: '#D1FAE5', color: '#166534', border: '1px solid rgba(22,101,52,0.15)' },
    hide:    { background: '#FEE2E2', color: '#991B1B', border: '1px solid rgba(153,27,27,0.15)' },
  };
  const s = styles[variant] || styles.default;
  return (
    <button
      onClick={onClick}
      style={{ ...s, fontSize: '0.75rem', fontWeight: 500, padding: '0.25rem 0.625rem', borderRadius: '0.4rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'opacity 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      {children}
    </button>
  );
}

export default function SuggestionsModeration() {
  const [filter, setFilter] = useState('All');
  const suggestions = useQuery(api.suggestions.getAdminSuggestions);
  const updateStatus = useMutation(api.suggestions.updateStatus);

  const filtered = (suggestions || []).filter(s => {
    if (filter === 'All') return true;
    const st = s.status || 'pending';
    return st === filter.toLowerCase();
  });

  function setStatus(id, status) {
    updateStatus({ suggestionId: id, status });
  }

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 900 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: '#192524', letterSpacing: '-0.025em', margin: 0 }}>
        Suggestions Moderation
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#959D90', marginTop: '0.3rem', marginBottom: '1.25rem' }}>
        Review user-submitted feature requests. Featured and implemented suggestions appear with badges in the public Help Center.
      </p>

      {/* ── Filter bar ── */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: '#F7F5F2', padding: '0.2rem', borderRadius: '0.5rem', width: 'fit-content', border: '1px solid rgba(25,37,36,0.06)' }}>
        {STATUSES.map(s => {
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '0.35rem',
                fontSize: '0.8rem',
                fontWeight: active ? 600 : 400,
                background: active ? '#192524' : 'transparent',
                color: active ? '#fff' : '#3C5759',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* ── Loading ── */}
      {suggestions === undefined && (
        <div style={{ color: '#959D90', fontSize: '0.85rem', padding: '3rem 0', textAlign: 'center' }}>Loading…</div>
      )}

      {/* ── Empty ── */}
      {suggestions !== undefined && filtered.length === 0 && (
        <div style={{ color: '#959D90', fontSize: '0.85rem', padding: '3rem 0', textAlign: 'center' }}>No suggestions in this filter.</div>
      )}

      {/* ── Table ── */}
      {suggestions !== undefined && filtered.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 52px 52px 68px 90px 120px 140px', gap: '0', borderBottom: '1px solid rgba(25,37,36,0.07)', padding: '0.6rem 1rem', background: '#F7F5F2' }}>
            {['Suggestion', 'Submitted by', '↑', '↓', 'Score', 'Date', 'Status', 'Actions'].map(h => (
              <span key={h} style={{ fontSize: '0.7rem', fontWeight: 600, color: '#959D90', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((s, i) => {
            const currentStatus = s.status || 'pending';
            return (
              <div
                key={s._id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 90px 52px 52px 68px 90px 120px 140px',
                  gap: '0',
                  padding: '0.75rem 1rem',
                  borderBottom: i < filtered.length - 1 ? '1px solid rgba(25,37,36,0.05)' : 'none',
                  alignItems: 'center',
                  background: currentStatus === 'rejected' ? 'rgba(254,226,226,0.25)' : 'transparent',
                }}
              >
                {/* Text */}
                <span style={{ fontSize: '0.83rem', color: '#192524', lineHeight: 1.45, paddingRight: '0.75rem' }}>
                  {s.text}
                </span>

                {/* Submitted by */}
                <span style={{ fontSize: '0.75rem', color: '#959D90', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.submitted_by ? s.submitted_by.slice(0, 8) + '…' : 'Anon'}
                </span>

                {/* Upvotes */}
                <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>{s.upvotes}</span>

                {/* Downvotes */}
                <span style={{ fontSize: '0.82rem', color: '#991B1B', fontWeight: 600 }}>{s.downvotes}</span>

                {/* Net score */}
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: s.netScore > 0 ? '#166534' : s.netScore < 0 ? '#991B1B' : '#959D90' }}>
                  {s.netScore > 0 ? `+${s.netScore}` : s.netScore}
                </span>

                {/* Date */}
                <span style={{ fontSize: '0.75rem', color: '#959D90' }}>{formatDate(s._creationTime)}</span>

                {/* Status */}
                <div><StatusBadge status={currentStatus} /></div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {currentStatus !== 'approved' && (
                    <ActionBtn variant="star" onClick={() => setStatus(s._id, 'approved')}>⭐</ActionBtn>
                  )}
                  {currentStatus !== 'implemented' && (
                    <ActionBtn variant="check" onClick={() => setStatus(s._id, 'implemented')}>✅</ActionBtn>
                  )}
                  {currentStatus !== 'rejected' && (
                    <ActionBtn variant="hide" onClick={() => setStatus(s._id, 'rejected')}>Hide</ActionBtn>
                  )}
                  {(currentStatus === 'rejected' || currentStatus === 'approved' || currentStatus === 'implemented') && (
                    <ActionBtn onClick={() => setStatus(s._id, 'pending')}>Reset</ActionBtn>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
