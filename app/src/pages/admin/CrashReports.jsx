import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CrashReports() {
  const reports = useQuery(api.crashReports.getCrashReports);
  const resolve = useMutation(api.crashReports.resolveCrashReport);
  const [busy, setBusy] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const active = (reports ?? []).filter(r => r.status === 'new');
  const resolved = (reports ?? []).filter(r => r.status !== 'new');

  async function handleResolve(reportId) {
    setBusy(reportId);
    await resolve({ reportId });
    setBusy(null);
  }

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 900 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: '#192524', letterSpacing: '-0.025em', margin: 0 }}>
        Crash Reports
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#959D90', marginTop: '0.3rem', marginBottom: '1.25rem' }}>
        Sent from the app's crash screen. {active.length} unresolved.
      </p>

      {active.length === 0 && (
        <div style={{ color: '#959D90', fontSize: '0.85rem', padding: '3rem 0', textAlign: 'center' }}>
          No unresolved crash reports.
        </div>
      )}

      {active.map((r) => (
        <div key={r._id} style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#192524' }}>{r.message}</span>
              <div style={{ fontSize: '0.78rem', color: '#959D90', marginTop: '0.2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span>{r.userEmail || 'Signed out'}</span>
                <span>{r.url}</span>
                <span>{fmtDate(r.created_at)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setExpanded(expanded === r._id ? null : r._id)}
            style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#3C5759', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: 'inherit' }}
          >
            {expanded === r._id ? 'Hide stack trace' : 'Show stack trace'}
          </button>

          {expanded === r._id && (
            <pre style={{ margin: '0.75rem 0 0', fontSize: '0.75rem', color: '#3C5759', background: '#F7F5F2', padding: '0.75rem', borderRadius: '0.5rem', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
              {r.stack}
              {r.componentStack ? `\n\nComponent stack:\n${r.componentStack}` : ''}
              {`\n\n${r.userAgent}`}
            </pre>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem', borderTop: '1px solid rgba(25,37,36,0.06)', paddingTop: '0.875rem' }}>
            <button
              onClick={() => handleResolve(r._id)}
              disabled={busy === r._id}
              style={{ padding: '0.4rem 0.875rem', borderRadius: '0.5rem', background: '#D1EBDB', color: '#166534', fontSize: '0.82rem', fontWeight: 600, border: '1px solid rgba(22,101,52,0.2)', cursor: busy === r._id ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
            >
              Mark resolved
            </button>
          </div>
        </div>
      ))}

      {resolved.length > 0 && (
        <>
          <h2 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: '#192524', margin: '2rem 0 1rem' }}>
            Resolved
          </h2>
          {resolved.map((r) => (
            <div key={r._id} style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', padding: '1rem 1.25rem', marginBottom: '0.5rem', opacity: 0.6 }}>
              <div style={{ fontSize: '0.8rem', color: '#3C5759', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>{r.message}</span>
                <span style={{ color: '#959D90' }}>—</span>
                <span>{fmtDate(r.created_at)}</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
