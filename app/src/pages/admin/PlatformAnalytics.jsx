import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

// ─── Date helpers ─────────────────────────────────────────────────────────────
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

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
  const pitchStats = useQuery(api.admin.getPitchAnalytics);
  const geo = useQuery(api.admin.getGeographicDistribution);
  const funnel = useQuery(api.admin.getFunnelAnalytics);
  const referralStats = useQuery(api.admin.getReferralAnalytics);

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 860 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Platform Analytics
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '0.875rem' }}>
        Live metrics from Convex.
      </p>

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

          {/* ── Funnel ── */}
          {funnel && (
            <Section title="Conversion Funnel">
              <StatGrid>
                <Stat label="Total Users"         value={funnel.totalUsers} />
                <Stat label="Waitlist"            value={funnel.waitlistSignups} />
                <Stat label="Has Account"          value={funnel.waitlistWithAccount} />
                <Stat label="Verified"             value={funnel.verifiedCount} accent="#166534" />
                <Stat label="Activated (1st Collab)" value={funnel.activatedCount} accent="#166534" />
                <Stat label="Signup → Verified"    value={funnel.conversionToVerified ? `${funnel.conversionToVerified}%` : '—'} />
                <Stat label="Verified → Activated" value={funnel.conversionToActivated ? `${funnel.conversionToActivated}%` : '—'} />
                <Stat label="Avg Days to Verify"   value={funnel.avgDaysToVerify ?? '—'} />
              </StatGrid>
              <div style={{ ...CARD, marginTop: '0.75rem', padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: SLATE, marginBottom: '0.625rem' }}>Funnel Flow</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Total', count: funnel.totalUsers, color: INK },
                    { label: 'Has Acct', count: funnel.waitlistWithAccount, color: '#92400E' },
                    { label: 'Verified', count: funnel.verifiedCount, color: '#166534' },
                    { label: 'Activated', count: funnel.activatedCount, color: '#4A9B7F' },
                  ].map((s, i, arr) => (
                    <React.Fragment key={s.label}>
                      <div style={{ textAlign: 'center', padding: '0.5rem 0.75rem', flex: 1, minWidth: 60 }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: s.color, fontFamily: 'Cabinet Grotesk, sans-serif' }}>{s.count}</div>
                        <div style={{ fontSize: '0.65rem', color: SAGE }}>{s.label}</div>
                      </div>
                      {i < arr.length - 1 && <span style={{ color: SAGE, fontSize: '0.8rem' }}>{'→'}</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* ── Pitch Volume ── */}
          {pitchStats && (
            <Section title="Pitch Volume">
              <StatGrid>
                <Stat label="Total Pitches (This Month)" value={pitchStats.totalThisMonth} accent="#0369A1" />
                <Stat label="Active Creators (Pitched)"  value={pitchStats.activeCreators} />
                <Stat label="Avg per Creator"            value={pitchStats.activeCreators > 0 ? (pitchStats.totalThisMonth / pitchStats.activeCreators).toFixed(1) : '—'} />
                <Stat label="At Limit (10/10)"           value={pitchStats.atLimit.length} accent={pitchStats.atLimit.length > 0 ? '#991B1B' : undefined} />
                <Stat label="Near Limit (7+)"            value={pitchStats.nearLimit.length} accent={pitchStats.nearLimit.length > 0 ? '#92400E' : undefined} />
              </StatGrid>

              {/* Monthly pitch trend */}
              <div style={{ ...CARD, marginTop: '0.75rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: SLATE, marginBottom: '1rem' }}>Monthly Pitch Volume — Last 6 Months</div>
                <div style={{ overflowX: 'auto', paddingBottom: '0.25rem' }}>
                  <BarChart data={pitchStats.monthlyTrend} color="#C7D9DC" />
                </div>
              </div>

              {/* Creators at limit */}
              {pitchStats.atLimit.length > 0 && (
                <div style={{ ...CARD, marginTop: '0.75rem', padding: '1rem 1.25rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#991B1B', marginBottom: '0.625rem' }}>⚠️ Creators at Pitch Limit (10/10)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {pitchStats.atLimit.map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', padding: '0.25rem 0.5rem', background: '#FEF2F2', borderRadius: '0.375rem' }}>
                        <span style={{ color: INK, fontWeight: 500 }}>{c.name}</span>
                        <span style={{ color: '#991B1B', fontWeight: 700 }}>{c.count} / 10</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top pitchers */}
              {pitchStats.topPitchers.length > 0 && (
                <div style={{ ...CARD, marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: SLATE, marginBottom: '0.75rem' }}>Top Pitchers This Month</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {pitchStats.topPitchers.slice(0, 5).map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', padding: '0.25rem 0', borderBottom: i < 4 ? '1px solid rgba(25,37,36,0.04)' : 'none' }}>
                        <span style={{ color: INK }}>#{i + 1} {c.name}</span>
                        <span style={{ color: SLATE, fontWeight: 600 }}>{c.count} pitches</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

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

          {/* ── Geographic Distribution ── */}
          {geo && (
            <Section title="Geographic Distribution">
              <StatGrid>
                <Stat label="Total Countries" value={geo.totalCountries} />
                <Stat label="Total Cities"    value={geo.totalCities} />
              </StatGrid>
              {geo.topCountries.length > 0 && (
                <div style={{ ...CARD, marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: SLATE, marginBottom: '0.75rem' }}>Top Countries</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {geo.topCountries.map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', padding: '0.25rem 0', borderBottom: i < geo.topCountries.length - 1 ? '1px solid rgba(25,37,36,0.04)' : 'none' }}>
                        <span style={{ flex: 1, color: INK }}>{c.country}</span>
                        <span style={{ color: '#0369A1', fontWeight: 600 }}>{c.creators} creators</span>
                        <span style={{ color: '#92400E', fontWeight: 600 }}>{c.hosts} hosts</span>
                        <span style={{ color: SLATE, fontWeight: 600, minWidth: 30, textAlign: 'right' }}>{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {geo.topCities.length > 0 && (
                <div style={{ ...CARD, marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: SLATE, marginBottom: '0.75rem' }}>Top Cities</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {geo.topCities.slice(0, 10).map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', padding: '0.25rem 0', borderBottom: i < Math.min(geo.topCities.length, 10) - 1 ? '1px solid rgba(25,37,36,0.04)' : 'none' }}>
                        <span style={{ color: INK }}>{c.city}</span>
                        <span style={{ color: SLATE, fontWeight: 600 }}>{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* ── Referral Analytics ── */}
          {referralStats && (
            <Section title="Referral Analytics">
              <StatGrid>
                <Stat label="Total Codes"        value={referralStats.totalCodes} />
                <Stat label="Successful Referrals" value={referralStats.totalReferrals} accent="#166534" />
                <Stat label="Unique Referrers"     value={referralStats.uniqueReferrers} />
                <Stat label="Free Months Given"    value={referralStats.totalFreeMonthsGiven} accent="#0369A1" />
                <Stat label="Collab Bonuses"      value={referralStats.collabBonusesGiven} />
              </StatGrid>
              {referralStats.topReferrers.length > 0 && (
                <div style={{ ...CARD, marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: SLATE, marginBottom: '0.625rem' }}>Top Referrers</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {referralStats.topReferrers.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', padding: '0.25rem 0', borderBottom: i < referralStats.topReferrers.length - 1 ? '1px solid rgba(25,37,36,0.04)' : 'none' }}>
                        <span style={{ color: INK }}>#{i + 1} {r.name}</span>
                        <span style={{ color: SLATE, fontWeight: 600 }}>{r.count} referrals</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}
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
