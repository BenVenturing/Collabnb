import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import OutreachFlow from './OutreachFlow';

const INK = '#192524', SLATE = '#3C5759', SAGE = '#646B62', BONE = '#F7F5F2', MINT = '#D1EBDB';
const ago = (t) => {
  if (!t) return '';
  const m = Math.floor((Date.now() - t) / 60000);
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
};

function Stat({ label, value, sub }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E1DB', borderRadius: 12, padding: '14px 16px', minWidth: 130, flex: 1 }}>
      <div style={{ fontSize: 12, color: SAGE }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: INK }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: SAGE }}>{sub}</div>}
    </div>
  );
}

function stage(r) {
  if (r.claim_token || r.built_at) return { label: 'Built listing', bg: MINT, color: INK };
  if (r.build_error) return { label: 'Build error', bg: '#FBE3E1', color: '#8A2A22' };
  if (r.replied) return { label: 'Replied', bg: '#E8E1F5', color: '#4B3A78' };
  if (r.viewed) return { label: `Viewed ×${r.viewed}`, bg: '#FCEBD2', color: '#8A5A12' };
  return { label: 'Sent', bg: '#EEEDEA', color: SLATE };
}

export default function AutoOutreach() {
  const d = useQuery(api.autoOutreach.adminFunnel);
  const setEnabled = useMutation(api.autoOutreach.adminSetEnabled);
  const [filter, setFilter] = useState('all');
  const [flow, setFlow] = useState(null);
  if (!d) return <div style={{ padding: 24, color: SAGE }}>Loading…</div>;

  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '–');
  const rows = d.rows.filter((r) => {
    const s = stage(r).label;
    if (filter === 'viewed') return r.viewed > 0;
    if (filter === 'built') return s === 'Built listing';
    if (filter === 'replied') return r.replied;
    if (filter === 'nudge') return r.dm_draft && !r.dm_done;
    return true;
  });
  const maxDay = Math.max(1, ...d.perDay.map((x) => x.n));

  return (
    <div style={{ padding: 24, maxWidth: 1100, background: BONE, minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, color: INK }}>Auto outreach</h2>
          <div style={{ fontSize: 13, color: SAGE }}>
            {d.enabled ? `On · cap today ${d.capToday} (max ${d.max})` : 'Paused'} · automated sends only; earlier manual outreach is unchanged in Discovery
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setFlow({})} style={{ background: '#fff', color: INK, border: `1px solid ${INK}`, borderRadius: 999, padding: '9px 18px', fontWeight: 600, cursor: 'pointer' }}>How it works</button>
        <button
          onClick={() => setEnabled({ enabled: !d.enabled })}
          style={{ background: d.enabled ? '#fff' : INK, color: d.enabled ? INK : '#fff', border: `1px solid ${INK}`, borderRadius: 999, padding: '9px 18px', fontWeight: 600, cursor: 'pointer' }}
        >
          {d.enabled ? 'Pause sending' : 'Start sending'}
        </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '18px 0' }}>
        <Stat label="Sent today" value={d.today.sent} sub={`of ${d.capToday}`} />
        <Stat label="Sent, 7 days" value={d.week.sent} />
        <Stat label="Viewed audit" value={d.all.viewed} sub={pct(d.all.viewed, d.all.sent)} />
        <Stat label="Built listing" value={d.all.built} sub={pct(d.all.built, d.all.sent)} />
        <Stat label="Replied" value={d.replied} sub={pct(d.replied, d.all.sent)} />
        <Stat label="Total sent" value={d.all.sent} />
      </div>

      {d.byVariant && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          {d.byVariant.map((v) => (
            <Stat key={v.variant} label={`Copy ${v.variant}`} value={v.sent} sub={`viewed ${pct(v.viewed, v.sent)} · built ${pct(v.built, v.sent)}`} />
          ))}
        </div>
      )}

      {d.perDay.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60, marginBottom: 18 }}>
          {d.perDay.map((x) => (
            <div key={x.date} title={`${x.date}: ${x.n}`} style={{ flex: 1, maxWidth: 28, height: `${(x.n / maxDay) * 100}%`, minHeight: 3, background: SLATE, borderRadius: 3 }} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {[['all', 'All'], ['viewed', 'Viewed'], ['built', 'Built'], ['replied', 'Replied'], ['nudge', 'DM nudge to send']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ border: `1px solid ${INK}`, background: filter === k ? INK : '#fff', color: filter === k ? '#fff' : INK, borderRadius: 999, padding: '5px 14px', fontSize: 13, cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E4E1DB', borderRadius: 12, overflow: 'hidden' }}>
        {rows.length === 0 && <div style={{ padding: 18, color: SAGE }}>Nothing here yet.</div>}
        {rows.map((r) => {
          const s = stage(r);
          return (
            <div key={r.token} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr', gap: 10, padding: '12px 16px', borderTop: '1px solid #F0EEEA', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: INK }}>{r.hotel}</div>
                <div style={{ fontSize: 12, color: SAGE }}>{r.email} · @{r.handle} · {(r.followers || 0).toLocaleString()} followers</div>
                <div style={{ fontSize: 12, color: SAGE }}>{r.teaser}</div>
                <div style={{ fontSize: 12, color: SLATE, marginTop: 2 }}>Copy {r.variant} · follow-ups {r.followups}/3{r.replied && !r.clicked ? ' · replied' : ''}</div>
              </div>
              <div><span style={{ background: s.bg, color: s.color, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{s.label}</span></div>
              <div style={{ fontSize: 12, color: SAGE, textAlign: 'right' }}>
                Sent {ago(r.sent_at)}{r.first_viewed_at ? ` · viewed ${ago(r.first_viewed_at)}` : ''}
                <div><button onClick={() => setFlow(r)} style={{ background: 'none', border: 'none', padding: 0, color: SLATE, textDecoration: 'underline', cursor: 'pointer', fontSize: 12, marginRight: 10 }}>Show in flow</button><a href={`/audit/${r.token}`} target="_blank" rel="noreferrer" style={{ color: SLATE }}>Open audit</a></div>
              </div>
            </div>
          );
        })}
      </div>
      {flow && <OutreachFlow row={flow.token ? flow : null} onClose={() => setFlow(null)} />}
    </div>
  );
}
