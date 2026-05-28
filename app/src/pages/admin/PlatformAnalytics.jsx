import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

// ─── Design tokens ────────────────────────────────────────────────────────────
const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#959D90';
const MINT  = '#D1EBDB';
const BONE  = '#F7F5F2';
const CARD  = { background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(25,37,36,0.04)' };

// ─── Stat card ────────────────────────────────────────────────────────────────
function Stat({ label, value, sub, accent }) {
  return (
    <div style={CARD}>
      <div style={{ fontSize: '1.625rem', fontWeight: 700, fontFamily: 'Cabinet Grotesk, sans-serif', color: accent || INK, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.8rem', color: SLATE, marginTop: '0.3rem', fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: SAGE, marginTop: '0.2rem' }}>{sub}</div>}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: SAGE, marginBottom: '0.875rem' }}>{title}</div>
      {children}
    </div>
  );
}

function StatGrid({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>{children}</div>;
}

// ─── Vertical bar chart (SVG) ─────────────────────────────────────────────────
function BarChart({ data, color = MINT }) {
  const max   = Math.max(...data.map((d) => d.value), 1);
  const BAR_W = 28;
  const GAP   = 10;
  const H     = 80;
  const W     = data.length * (BAR_W + GAP);

  return (
    <svg width={W} height={H + 28} style={{ overflow: 'visible' }}>
      {data.map((d, i) => {
        const barH  = Math.max((d.value / max) * H, d.value > 0 ? 3 : 0);
        const x     = i * (BAR_W + GAP);
        const y     = H - barH;
        return (
          <g key={i}>
            {/* Background track */}
            <rect x={x} y={0} width={BAR_W} height={H} fill={BONE} rx={4} />
            {/* Bar */}
            <rect x={x} y={y} width={BAR_W} height={barH} fill={color} rx={4} />
            {/* Value label */}
            {d.value > 0 && (
              <text x={x + BAR_W / 2} y={y - 5} textAnchor="middle" fontSize={10} fill={SLATE} fontFamily="Satoshi, sans-serif" fontWeight={600}>
                {d.value}
              </text>
            )}
            {/* Month label */}
            <text x={x + BAR_W / 2} y={H + 18} textAnchor="middle" fontSize={10} fill={SAGE} fontFamily="Satoshi, sans-serif">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Horizontal bar chart (CSS) ───────────────────────────────────────────────
function HBarChart({ data, color = '#3C5759' }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (!data.length) return <div style={{ fontSize: '0.82rem', color: SAGE, padding: '1rem 0' }}>No data yet.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ flex: '0 0 140px', fontSize: '0.78rem', color: SLATE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
            {d.label}
          </span>
          <div style={{ flex: 1, height: 20, background: BONE, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(d.value / max) * 100}%`, minWidth: d.value > 0 ? 4 : 0, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
          </div>
          <span style={{ flex: '0 0 24px', fontSize: '0.78rem', color: SAGE, textAlign: 'right' }}>{d.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Founder progress bar ─────────────────────────────────────────────────────
function FounderBar({ label, count, max = 100 }) {
  const pct  = Math.min((count / max) * 100, 100);
  const full = count >= max;
  return (
    <div style={{ marginBottom: '0.875rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
        <span style={{ fontSize: '0.82rem', color: SLATE, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '0.78rem', color: full ? '#991B1B' : '#166534', fontWeight: 700 }}>{count} / {max}</span>
      </div>
      <div style={{ height: 8, background: BONE, borderRadius: 99, overflow: 'hidden', border: '1px solid rgba(25,37,36,0.06)' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: full ? '#FECACA' : MINT, borderRadius: 99, transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function PlatformAnalytics() {
  const stats = useQuery(api.admin.getAnalytics);

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 860 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Platform Analytics
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '0.875rem' }}>
        Live metrics from Convex.
      </p>

      {/* Data warning banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.875rem', background: '#FEF3C7', border: '1px solid rgba(146,64,14,0.15)', borderRadius: '0.625rem', marginBottom: '1.75rem', fontSize: '0.78rem', color: '#92400E' }}>
        <span>⚠️</span>
        <span>Analytics based on local/test data — live dashboard coming with production backend.</span>
      </div>

      {stats === undefined ? (
        <div style={{ color: SAGE, fontSize: '0.85rem', padding: '3rem 0', textAlign: 'center' }}>Loading…</div>
      ) : (
        <>
          {/* ── User Stats ── */}
          <Section title="User Stats">
            <StatGrid>
              <Stat label="Total Users" value={stats.totalUsers} />
              <Stat label="Creators" value={stats.creators} />
              <Stat label="Hosts" value={stats.hosts} />
              <Stat label="Verified" value={stats.verified} accent="#166534" />
              <Stat label="Pending Review" value={stats.pending} accent={stats.pending > 0 ? '#92400E' : undefined} />
            </StatGrid>

            {/* Founder slots progress */}
            <div style={{ ...CARD, marginTop: '0.75rem', padding: '1.25rem 1.5rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: SLATE, marginBottom: '1rem' }}>Founder Slots</div>
              <FounderBar label="Creator Founders" count={stats.founderCreators} />
              <FounderBar label="Host Founders"    count={stats.founderHosts}    />
            </div>

            {/* Monthly signups bar chart */}
            <div style={{ ...CARD, marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: SLATE, marginBottom: '1rem' }}>New Signups — Last 6 Months</div>
              <div style={{ overflowX: 'auto', paddingBottom: '0.25rem' }}>
                <BarChart data={stats.monthlySignups} color={MINT} />
              </div>
            </div>
          </Section>

          {/* ── Collab Stats ── */}
          <Section title="Collab Stats">
            <StatGrid>
              <Stat label="Total Listings" value={stats.totalListings} />
              <Stat label="Total Collabs"  value={stats.totalCollabs}  />
              <Stat label="Approved"       value={stats.approvedCollabs}  accent="#166534" />
              <Stat label="Completed"      value={stats.completedCollabs} accent="#166534" />
              <Stat label="Pitches Submitted" value={stats.totalPitches} />
            </StatGrid>
          </Section>

          {/* ── Revenue (placeholder) ── */}
          <Section title="Revenue">
            <div style={{ ...CARD, display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
              <span style={{ fontSize: '1.5rem', marginTop: '0.1rem' }}>💳</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: INK, marginBottom: '0.25rem' }}>
                  Revenue tracking will activate when Stripe is in production
                </div>
                <div style={{ display: 'flex', gap: '2rem', marginTop: '0.875rem' }}>
                  <Placeholder label="Platform Fees Collected" value="$0" />
                  <Placeholder label="Active Subscriptions"    value="0"  />
                </div>
              </div>
            </div>
          </Section>

          {/* ── Engagement ── */}
          <Section title="Engagement">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={CARD}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: SLATE, marginBottom: '1rem' }}>Top 5 Listings by Applications</div>
                <HBarChart data={stats.topListings} color={MINT} />
              </div>
              <div style={CARD}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: SLATE, marginBottom: '1rem' }}>Top 5 Active Creators (Pitches)</div>
                <HBarChart data={stats.topCreators} color="#C7D9DC" />
              </div>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function Placeholder({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'Cabinet Grotesk, sans-serif', color: SAGE }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: SAGE, marginTop: '0.1rem' }}>{label}</div>
    </div>
  );
}
