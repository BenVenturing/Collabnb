import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#959D90';
const MINT  = '#D1EBDB';
const BONE  = '#F7F5F2';

const STATUS_FILTERS = ['all', 'pending', 'active', 'approved', 'completed', 'closed'];
const statusColors = {
  pending:   { bg: '#FEF3C7', color: '#92400E' },
  active:    { bg: '#DBEAFE', color: '#0369A1' },
  approved:  { bg: '#DCFCE7', color: '#166534' },
  completed: { bg: '#D1EBDB', color: '#166534' },
  closed:    { bg: '#F3E8FF', color: '#7E22CE' },
};

export default function CollabOversight() {
  const stats = useQuery(api.admin.getAnalytics);
  const [statusFilter, setStatusFilter] = useState('all');

  if (stats === undefined) {
    return <div style={{ padding: '2rem 2.5rem', color: SAGE, fontSize: '0.85rem' }}>Loading…</div>;
  }

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 900 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Collaboration Oversight
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.5rem' }}>
        Monitor and manage all collaborations on the platform.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total',      value: stats.totalCollabs,  color: INK },
          { label: 'Approved',   value: stats.approvedCollabs, color: '#166534' },
          { label: 'Completed',  value: stats.completedCollabs, color: '#166534' },
          { label: 'Active Listings', value: stats.publishedListings, color: '#0369A1' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 100 }}>
            <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontSize: '0.72rem', color: SAGE }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
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

      <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', padding: '2rem', textAlign: 'center', color: SAGE, fontSize: '0.85rem' }}>
        <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤝</p>
        <p>Collaboration data will populate once collabs are created on the platform.</p>
        <p style={{ fontSize: '0.78rem', marginTop: '0.5rem', color: SLATE }}>Stats above reflect current database totals.</p>
      </div>
    </div>
  );
}
