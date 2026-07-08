import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const REASON_LABELS = {
  inaccurate_information: 'Inaccurate Information',
  poor_communication: 'Poor Communication',
  failed_collaboration: 'Failed Collaboration',
  unprofessional_behavior: 'Unprofessional Behavior',
  other: 'Other',
};

export default function ModerationQueue() {
  const reports = useQuery(api.reports.getReports);
  const updateStatus = useMutation(api.reports.updateReportStatus);
  const dismissAll = useMutation(api.reports.dismissAllForUser);
  const [busy, setBusy] = useState(null);
  const [confirmDismiss, setConfirmDismiss] = useState(null);

  const pending = (reports ?? []).filter(r => r.status === 'pending');

  async function handleAction(reportId, status) {
    setBusy(reportId);
    await updateStatus({ reportId, status });
    setBusy(null);
  }

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 780 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: '#192524', letterSpacing: '-0.025em', margin: 0 }}>
        Moderation Queue
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#959D90', marginTop: '0.3rem', marginBottom: '1.25rem' }}>
        Review user reports. {pending.length} pending report{pending.length !== 1 ? 's' : ''}.
      </p>

      {pending.length === 0 && (
        <div style={{ color: '#959D90', fontSize: '0.85rem', padding: '3rem 0', textAlign: 'center' }}>
          No pending reports — all clear.
        </div>
      )}

      {pending.map((r) => (
        <div key={r._id} style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#192524' }}>
                Report: {REASON_LABELS[r.reason] || r.reason}
              </span>
              <div style={{ fontSize: '0.78rem', color: '#959D90', marginTop: '0.2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span>Reported: <strong>{r.reportedName}</strong> ({r.reportedEmail})</span>
                <span>By: <strong>{r.reporterName}</strong></span>
                <span>{fmtDate(r.created_at)}</span>
              </div>
            </div>
          </div>

          {r.details && (
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.82rem', color: '#3C5759', background: '#F7F5F2', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', lineHeight: 1.55 }}>
              {r.details}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem', borderTop: '1px solid rgba(25,37,36,0.06)', paddingTop: '0.875rem' }}>
            <button
              onClick={() => handleAction(r._id, 'dismissed')}
              disabled={busy === r._id}
              style={{ padding: '0.4rem 0.875rem', borderRadius: '0.5rem', background: '#F7F5F2', color: '#3C5759', fontSize: '0.82rem', fontWeight: 500, border: '1px solid rgba(25,37,36,0.1)', cursor: busy === r._id ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
            >
              Dismiss
            </button>
            <button
              onClick={() => handleAction(r._id, 'actioned')}
              disabled={busy === r._id}
              style={{ padding: '0.4rem 0.875rem', borderRadius: '0.5rem', background: '#FEE2E2', color: '#991B1B', fontSize: '0.82rem', fontWeight: 600, border: '1px solid rgba(153,27,27,0.2)', cursor: busy === r._id ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
            >
              Action Taken
            </button>
          </div>
        </div>
      ))}

      {/* Resolved */}
      {(reports ?? []).filter(r => r.status !== 'pending').length > 0 && (
        <>
          <h2 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: '#192524', margin: '2rem 0 1rem' }}>
            Resolved
          </h2>
          {reports.filter(r => r.status !== 'pending').map((r) => (
            <div key={r._id} style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', padding: '1rem 1.25rem', marginBottom: '0.5rem', opacity: 0.6 }}>
              <div style={{ fontSize: '0.8rem', color: '#3C5759', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>{r.reportedName}</span>
                <span style={{ color: '#959D90' }}>—</span>
                <span>{REASON_LABELS[r.reason] || r.reason}</span>
                <span style={{ fontSize: '0.7rem', background: r.status === 'actioned' ? '#FEE2E2' : '#F7F5F2', color: r.status === 'actioned' ? '#991B1B' : '#3C5759', padding: '0.1rem 0.5rem', borderRadius: '99px' }}>
                  {r.status}
                </span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
