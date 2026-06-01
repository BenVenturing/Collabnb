import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#959D90';
const BONE  = '#F7F5F2';

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ContractManager() {
  const contracts = useQuery(() => { try { return []; } catch { return []; } });

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 900 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Contract Management
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.5rem' }}>
        View and manage all contracts on the platform.
      </p>

      <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</p>
        <p style={{ color: SAGE, fontSize: '0.85rem' }}>Contract data will populate once contracts are created on the platform.</p>
      </div>
    </div>
  );
}
