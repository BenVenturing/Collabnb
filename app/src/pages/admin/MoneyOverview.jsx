import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#959D90';

function StatCard({ label, value, color = INK, sublabel }) {
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 140 }}>
      <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: '0.72rem', color: SAGE }}>{label}</span>
      {sublabel && <span style={{ fontSize: '0.68rem', color: SAGE, opacity: 0.8 }}>{sublabel}</span>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1rem', fontWeight: 700, color: INK, margin: '0 0 0.875rem' }}>{title}</h2>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

// One glance at all the money moving through Collabnb: subscription revenue,
// creator payouts, and platform fees collected. Payout-level detail (holds,
// Wise sends, per-contract status) lives on the Payouts tab; affiliate
// earnings live on the Affiliates tab — this page is the roll-up.
export default function MoneyOverview() {
  const profiles = useQuery(api.profiles.getAll);
  const contracts = useQuery(api.contracts.getAll);

  const loading = profiles === undefined || contracts === undefined;

  const creators = (profiles ?? []).filter((p) => p.role === 'creator');
  const activeMonthly = creators.filter((p) => p.subscription_status === 'active' && p.subscription_tier !== 'yearly').length;
  const activeYearly = creators.filter((p) => p.subscription_status === 'active' && p.subscription_tier === 'yearly').length;
  const mrr = activeMonthly * 10 + (activeYearly * 60) / 12;
  const inTrial = creators.filter((p) => p.access_state !== 'limited' && p.subscription_status !== 'active' && p.is_founder !== true).length;
  const founders = (profiles ?? []).filter((p) => p.is_founder === true).length;
  const lifetimeMembers = (profiles ?? []).filter((p) => p.is_lifetime === true).length;

  const paidContracts = (contracts ?? []).filter((c) => c.paid === true);
  const feesCollected = paidContracts.reduce((sum, c) => sum + (c.fee_amount || 0), 0);
  const grossProcessed = paidContracts.reduce((sum, c) => sum + (c.gross_charge_amount || c.payment_amount || 0), 0);
  const payoutsOwed = (contracts ?? [])
    .filter((c) => c.creator_payout_amount && c.creator_payout_status !== 'paid')
    .reduce((sum, c) => sum + c.creator_payout_amount, 0);

  const stripeConnected = creators.filter((p) => p.payout_method === 'stripe_connect' && p.stripe_connect_payouts_enabled).length;
  const wiseConnected = creators.filter((p) => p.payout_method === 'wise' && p.wise_recipient_id).length;
  const noPayoutMethod = creators.filter((p) => !p.payout_method).length;

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1100 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Money
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.5rem' }}>
        Subscriptions, collab payouts, and platform fees at a glance.
      </p>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: SAGE, fontSize: '0.85rem', background: '#fff', borderRadius: '0.875rem', border: '1px solid rgba(25,37,36,0.07)' }}>
          Loading…
        </div>
      ) : (
        <>
          <Section title="Creator Plus Subscriptions">
            <StatCard label="Est. MRR" value={`$${mrr.toFixed(0)}`} color="#166534" sublabel="monthly + amortized yearly" />
            <StatCard label="Active — Monthly" value={activeMonthly} />
            <StatCard label="Active — Yearly" value={activeYearly} />
            <StatCard label="In Free Trial" value={inTrial} color="#0369A1" />
            <StatCard label="Founders (free forever)" value={founders} color="#A87820" />
            <StatCard label="Lifetime Members" value={lifetimeMembers} />
          </Section>

          <Section title="Collab Payments">
            <StatCard label="Gross Processed" value={`$${grossProcessed.toFixed(0)}`} sublabel="host charges, all-time" />
            <StatCard label="Platform Fees Collected" value={`$${feesCollected.toFixed(0)}`} color="#166534" />
            <StatCard label="Owed to Creators (unpaid)" value={`$${payoutsOwed.toFixed(0)}`} color="#92400E" />
          </Section>

          <Section title="Creator Payout Methods">
            <StatCard label="Stripe Connected & Verified" value={stripeConnected} color="#166534" />
            <StatCard label="Wise Connected" value={wiseConnected} color="#166534" />
            <StatCard label="Not Yet Connected" value={noPayoutMethod} color="#92400E" />
          </Section>
        </>
      )}
    </div>
  );
}
