import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#959D90';
const BONE  = '#F7F5F2';

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AuditLog() {
  const logs = useQuery(api.admin.getAuditLog);

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 900 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Audit Log
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.5rem' }}>
        Track all admin actions taken on the platform.
      </p>

      {logs === undefined ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: SAGE, fontSize: '0.85rem' }}>Loading…</div>
      ) : logs.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</p>
          <p style={{ color: SAGE, fontSize: '0.85rem' }}>No admin actions logged yet. Actions will appear here as you approve/reject users and change settings.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
                {['Action', 'Target', 'Details', 'Date'].map((h) => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: SAGE }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={String(log._id)} style={{ borderBottom: i < logs.length - 1 ? '1px solid rgba(25,37,36,0.05)' : 'none' }}>
                  <td style={{ padding: '0.75rem 1rem', color: INK, fontWeight: 500, textTransform: 'capitalize' }}>{log.action}</td>
                  <td style={{ padding: '0.75rem 1rem', color: SLATE }}>
                    <span style={{ fontSize: '0.7rem', background: BONE, padding: '0.1rem 0.45rem', borderRadius: '4px' }}>{log.target_type}</span>
                    <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: SAGE }}>{log.target_id?.slice(0, 12)}…</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: SLATE, fontSize: '0.78rem' }}>{log.details || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: SAGE, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtDate(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
