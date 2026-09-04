import { useState } from 'react';
import { ACH_REQUIRED_ABOVE_CASH_VALUE } from '../../../convex/lib/fees';

const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#959D90';
const MOSS  = '#2D7A5F';
const RUST  = '#b45309';

// ─── Resource registry ──────────────────────────────────────────────────────
// One card per saved reference doc. Add an entry here + a matching detail
// component below to save another one — this is the "payment workflow"
// section Ben's building out over time, starting with the ACH cost model.
const RESOURCES = [
  {
    id: 'payout-flow-diagram',
    category: 'Payment workflow',
    title: 'Payout Structure — Flow Diagram',
    description: 'End-to-end flow chart: how a host payment method is chosen, how the charge resolves, and how the creator actually gets paid.',
    updated: 'Sep 2026',
  },
  {
    id: 'ach-cost-model',
    category: 'Payment workflow',
    title: 'ACH Routing — Cost Model',
    description: `Worked math on the $${ACH_REQUIRED_ABOVE_CASH_VALUE} ACH threshold, what the opt-out costs, and the Stripe Connect vs. Wise currency-conversion leg for creator payouts.`,
    updated: 'Sep 2026',
  },
];

// ─── Flow diagram primitives ────────────────────────────────────────────────
// `note` renders as a third, smaller line inside the SAME box — folded in
// rather than positioned as a separate element below it, since a fixed-height
// flowchart grid leaves no safe way to place a sibling element under a box
// without it drifting into whatever comes next as row heights change.
function FlowBox({ x, y, w, h, title, subtitle, note, accent }) {
  const border = accent === 'moss' ? MOSS : accent === 'rust' ? RUST : 'rgba(25,37,36,0.18)';
  const titleColor = accent === 'moss' ? MOSS : accent === 'rust' ? RUST : INK;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="10" fill="#fff" stroke={border} strokeWidth={accent ? 1.75 : 1.25} />
      <foreignObject x={x + 12} y={y} width={w - 24} height={h}>
        <div xmlns="http://www.w3.org/1999/xhtml" style={{
          height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3,
          fontFamily: 'Satoshi, -apple-system, sans-serif',
        }}>
          <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: 13.5, color: titleColor, lineHeight: 1.25 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: SLATE, lineHeight: 1.35 }}>{subtitle}</div>}
          {note && <div style={{ fontSize: 10, color: SAGE, fontStyle: 'italic', lineHeight: 1.4, marginTop: 2 }}>{note}</div>}
        </div>
      </foreignObject>
    </g>
  );
}

function FlowArrow({ from, to }) {
  return <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke="rgba(25,37,36,0.32)" strokeWidth="1.5" markerEnd="url(#flowArrow)" />;
}

function PayoutFlowDiagram() {
  return (
    <div>
      <p style={{ fontSize: '0.85rem', color: SLATE, lineHeight: 1.6, maxWidth: 640, marginBottom: '1.25rem' }}>
        Every collab's payout follows this path — which rail is used at each branch depends on cash value and what the creator connected. See <strong>ACH Routing — Cost Model</strong> in this same tab for the dollar math behind the card/ACH and Connect/Wise choices.
      </p>
      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.1rem', fontSize: '0.72rem', color: SAGE }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, border: `1.75px solid ${MOSS}`, display: 'inline-block' }} /> Fast / low-cost outcome</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, border: `1.75px solid ${RUST}`, display: 'inline-block' }} /> Slower / manual outcome</span>
      </div>

      <div style={{ overflowX: 'auto', background: '#fbfaf6', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.75rem', padding: '0.5rem 0' }}>
        <svg viewBox="0 0 820 1160" style={{ width: '100%', minWidth: 640, height: 'auto', display: 'block' }}>
          <defs>
            <marker id="flowArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="rgba(25,37,36,0.4)" />
            </marker>
          </defs>

          {/* Stage 1 → 2 */}
          <FlowArrow from={[410, 84]} to={[215, 122]} />
          <FlowArrow from={[410, 84]} to={[605, 122]} />
          {/* Stage 2 → 3 */}
          <FlowArrow from={[215, 198]} to={[410, 276]} />
          <FlowArrow from={[605, 198]} to={[410, 276]} />
          {/* Stage 3 → 4 */}
          <FlowArrow from={[410, 370]} to={[215, 448]} />
          <FlowArrow from={[410, 370]} to={[605, 448]} />
          {/* Stage 4 → 5 */}
          <FlowArrow from={[215, 522]} to={[410, 602]} />
          <FlowArrow from={[605, 522]} to={[410, 602]} />
          {/* Stage 5 → 6 */}
          <FlowArrow from={[410, 694]} to={[410, 774]} />
          {/* Stage 6 → 7 */}
          <FlowArrow from={[410, 854]} to={[215, 934]} />
          <FlowArrow from={[410, 854]} to={[605, 934]} />
          {/* Stage 7 → 8 */}
          <FlowArrow from={[215, 1014]} to={[410, 1074]} />
          <FlowArrow from={[605, 1014]} to={[410, 1074]} />

          <FlowBox x={240} y={20} w={340} h={64} title="Contract signed" subtitle="Host adds a payment method" />

          <FlowBox x={50} y={122} w={330} h={76} title="Card" subtitle={`Cash value under $${ACH_REQUIRED_ABOVE_CASH_VALUE}, or self-declared no US bank account`} />
          <FlowBox x={440} y={122} w={330} h={76} title="Bank account (ACH)" subtitle={`Cash value $${ACH_REQUIRED_ABOVE_CASH_VALUE}+ — required, both at listing publish and contract signing`} />

          <FlowBox x={200} y={276} w={420} h={94} title="Collab marked complete" subtitle="chargeContractFee fires" note={'Founders/lifetime hosts: fee waived to $0 · "Pay in person": fee only, cash handled off-platform'} />

          <FlowBox x={50} y={448} w={330} h={74} title="Charged instantly" subtitle="PaymentIntent status → succeeded" />
          <FlowBox x={440} y={448} w={330} h={74} title="Processing 3–5 business days" subtitle="Marked pending — webhook confirms succeeded / failed later" />

          <FlowBox x={180} y={602} w={460} h={92} title="Payment recorded" subtitle="Host receipt sent · creator payout-forward scheduled" note={
            <span style={{ display: 'inline-flex', gap: 8, marginTop: 2 }}>
              <span style={{ fontWeight: 700, color: MOSS, background: 'rgba(45,122,95,0.09)', borderRadius: 999, padding: '2px 8px', fontStyle: 'normal' }}>48h hold — card</span>
              <span style={{ fontWeight: 700, color: RUST, background: 'rgba(180,83,9,0.09)', borderRadius: 999, padding: '2px 8px', fontStyle: 'normal' }}>5-day hold — ACH</span>
            </span>
          } />

          <FlowBox x={220} y={774} w={380} h={80} title="Hold expires" subtitle="forwardCreatorPayout fires" note="Admin can release the hold early, or pause it if a dispute comes in" />

          <FlowBox x={50} y={934} w={330} h={80} accent="moss" title="Stripe Connect" subtitle="Instant transfer — creator receives funds immediately" />
          <FlowBox x={440} y={934} w={330} h={80} accent="rust" title="Wise" subtitle="Sits pending — admin manually sends once funds settle to Collabnb's bank" />

          <FlowBox x={240} y={1074} w={340} h={64} title="Creator receipt email sent" subtitle="End of flow" />
        </svg>
      </div>
    </div>
  );
}

function Th({ children, align = 'right' }) {
  return (
    <th style={{ textAlign: align, fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: SAGE, padding: '0 0.6rem 0.5rem', borderBottom: `1px solid rgba(25,37,36,0.14)` }}>
      {children}
    </th>
  );
}
function Td({ children, align = 'right', tone, strong }) {
  return (
    <td style={{
      textAlign: align, padding: '0.45rem 0.6rem', fontSize: '0.8rem',
      fontFamily: align === 'right' ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
      color: tone === 'gain' ? MOSS : tone === 'loss' ? RUST : INK,
      fontWeight: strong ? 700 : 400,
      borderBottom: '1px solid rgba(25,37,36,0.06)', whiteSpace: 'nowrap',
    }}>
      {children}
    </td>
  );
}

function Callout({ tone = 'moss', children }) {
  return (
    <div style={{
      background: tone === 'moss' ? 'rgba(45,122,95,0.07)' : 'rgba(180,83,9,0.07)',
      borderLeft: `3px solid ${tone === 'moss' ? MOSS : RUST}`,
      borderRadius: '0.375rem', padding: '0.85rem 1.1rem', margin: '1.1rem 0',
      fontSize: '0.82rem', color: SLATE, lineHeight: 1.55,
    }}>
      {children}
    </div>
  );
}

function Scenario({ label, net, netTone, creator, cost, verdict }) {
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.75rem', padding: '0.9rem 1.1rem', marginBottom: '0.6rem' }}>
      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: INK, marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.78rem' }}>
        <div><span style={{ color: SAGE }}>Platform nets </span><span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 700, color: netTone === 'gain' ? MOSS : RUST }}>{net}</span></div>
        <div><span style={{ color: SAGE }}>Creator receives </span><span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 700 }}>{creator}</span></div>
        <div><span style={{ color: SAGE }}>Ecosystem cost </span><span style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{cost}</span></div>
      </div>
      <div style={{ fontSize: '0.76rem', color: SLATE, marginTop: '0.4rem' }}>{verdict}</div>
    </div>
  );
}

function AchCostModelDoc() {
  return (
    <div>
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1rem', fontWeight: 700, color: INK, margin: '0 0 0.5rem' }}>
          Both gates are wired to the same rule
        </h2>
        <p style={{ fontSize: '0.85rem', color: SLATE, lineHeight: 1.6, maxWidth: 640 }}>
          The listing <strong>publish</strong> step checks the listing's cash amount; the contract <strong>signing</strong> step checks the actual contract's cash value — the number that determines the real charge. A host can clear one without hitting the other if the numbers differ, so both are gated independently. At ${ACH_REQUIRED_ABOVE_CASH_VALUE}+ cash value, both ask for a bank account, with a self-declared "I don't have a US bank account" opt-out that falls back to card.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1rem', fontWeight: 700, color: INK, margin: '0 0 0.5rem' }}>
          Platform net on the fee, card vs. ACH
        </h2>
        <p style={{ fontSize: '0.85rem', color: SLATE, lineHeight: 1.6, maxWidth: 640, marginBottom: '1rem' }}>
          Every collect-and-forward charge — fee <em>and</em> the cash pass-through — rides the same card swipe. Card cost scales with the whole amount (≈2.9% + $0.30); ACH is capped at $5 flat. Using the real fee rule (flat $20 under $500 cash value, 5% at $500+):
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
            <thead>
              <tr>
                <Th align="left">Cash value</Th>
                <Th>Fee</Th>
                <Th>Gross charge</Th>
                <Th>Card cost</Th>
                <Th>ACH cost</Th>
                <Th>Net via card</Th>
                <Th>Net via ACH</Th>
                <Th>ACH recovers</Th>
              </tr>
            </thead>
            <tbody>
              <tr><Td align="left">$200</Td><Td>$20.00</Td><Td>$220.00</Td><Td tone="loss">$6.68</Td><Td>$1.76</Td><Td>$13.32</Td><Td tone="gain">$18.24</Td><Td tone="gain" strong>+$4.92</Td></tr>
              <tr style={{ background: 'rgba(45,122,95,0.05)' }}><Td align="left">$299 <span style={{ color: SAGE, fontWeight: 400 }}>(just under the line)</span></Td><Td>$20.00</Td><Td>$319.00</Td><Td tone="loss">$9.55</Td><Td>$2.55</Td><Td>$10.45</Td><Td tone="gain">$17.45</Td><Td tone="gain" strong>+$7.00</Td></tr>
              <tr style={{ background: 'rgba(45,122,95,0.09)' }}><Td align="left">${ACH_REQUIRED_ABOVE_CASH_VALUE} <span style={{ color: SAGE, fontWeight: 400 }}>(the line)</span></Td><Td>$20.00</Td><Td>$320.00</Td><Td tone="loss">$9.58</Td><Td>$2.56</Td><Td>$10.42</Td><Td tone="gain">$17.44</Td><Td tone="gain" strong>+$7.02</Td></tr>
              <tr><Td align="left">$500 <span style={{ color: SAGE, fontWeight: 400 }}>(fee formula changes here)</span></Td><Td>$25.00</Td><Td>$525.00</Td><Td tone="loss">$15.53</Td><Td>$4.20</Td><Td>$9.47</Td><Td tone="gain">$20.80</Td><Td tone="gain" strong>+$11.33</Td></tr>
              <tr><Td align="left">$650</Td><Td>$32.50</Td><Td>$682.50</Td><Td tone="loss">$20.09</Td><Td>$5.00</Td><Td>$12.41</Td><Td tone="gain">$27.50</Td><Td tone="gain" strong>+$15.09</Td></tr>
              <tr><Td align="left">$1,000</Td><Td>$50.00</Td><Td>$1,050.00</Td><Td tone="loss">$30.75</Td><Td>$5.00</Td><Td>$19.25</Td><Td tone="gain">$45.00</Td><Td tone="gain" strong>+$25.75</Td></tr>
              <tr><Td align="left">$2,000</Td><Td>$100.00</Td><Td>$2,100.00</Td><Td tone="loss">$61.20</Td><Td>$5.00</Td><Td>$38.80</Td><Td tone="gain">$95.00</Td><Td tone="gain" strong>+$56.20</Td></tr>
              <tr><Td align="left">$5,000</Td><Td>$250.00</Td><Td>$5,250.00</Td><Td tone="loss">$152.55</Td><Td>$5.00</Td><Td>$97.45</Td><Td tone="gain">$245.00</Td><Td tone="gain" strong>+$147.55</Td></tr>
              <tr><Td align="left">$10,000</Td><Td>$500.00</Td><Td>$10,500.00</Td><Td tone="loss">$304.80</Td><Td>$5.00</Td><Td>$195.20</Td><Td tone="gain">$495.00</Td><Td tone="gain" strong>+$299.80</Td></tr>
            </tbody>
          </table>
        </div>
        <Callout tone="rust">
          Card processing crosses <strong>half</strong> the $20 flat fee around <strong>$314</strong> cash value — the ${ACH_REQUIRED_ABOVE_CASH_VALUE} line sits just under that natural pain point, not after it. $500 stays meaningful too: that's where the fee formula itself switches from flat $20 to 5%.
        </Callout>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1rem', fontWeight: 700, color: INK, margin: '0 0 0.5rem' }}>
          What an opt-out costs
        </h2>
        <p style={{ fontSize: '0.85rem', color: SLATE, lineHeight: 1.6, maxWidth: 640 }}>
          Every host who clicks "I don't have a US bank account" on a $650 collab drops the platform's net from <strong style={{ color: MOSS }}>$27.50</strong> to <strong style={{ color: RUST }}>$12.41</strong> — a $15.09 gap, scaling with the table above as the collab gets bigger. Worth tracking how often that link gets used: rare means the rule is doing its job; common means either a lot of hosts genuinely bank outside the US, or it's being used as a two-click way to skip ACH.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1rem', fontWeight: 700, color: INK, margin: '0 0 0.5rem' }}>
          The other leg: paying the creator out
        </h2>
        <p style={{ fontSize: '0.85rem', color: SLATE, lineHeight: 1.6, maxWidth: 640, marginBottom: '1rem' }}>
          The threshold only touches what the <em>host</em> is charged. Separately, whatever the creator is owed has to land in their account — and if that's not USD, someone pays a conversion cost.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr>
                <Th align="left">Creator situation</Th>
                <Th align="left">Rail</Th>
                <Th>Est. FX cost</Th>
                <Th align="left">Speed</Th>
                <Th align="left">Who eats it</Th>
              </tr>
            </thead>
            <tbody>
              <tr><Td align="left">US, USD</Td><Td align="left">Stripe Connect</Td><Td tone="gain">0%</Td><Td align="left">Instant</Td><Td align="left">—</Td></tr>
              <tr><Td align="left">Non-US, supported corridor</Td><Td align="left">Stripe Connect</Td><Td tone="loss">~1–2%</Td><Td align="left">Instant</Td><Td align="left">Creator</Td></tr>
              <tr><Td align="left">Non-US, any corridor</Td><Td align="left">Wise</Td><Td tone="loss">~0.3–1%</Td><Td align="left">Days — admin-triggered</Td><Td align="left">Creator</Td></tr>
              <tr><Td align="left">Non-US, unsupported corridor</Td><Td align="left">Stripe Connect</Td><Td align="left">Unknown</Td><Td align="left">Instant, in USD</Td><Td align="left">Creator, at their own bank's rate</Td></tr>
            </tbody>
          </table>
        </div>
        <Callout tone="moss">
          For a US creator, Connect is simply right — instant, free. For a non-US creator, Wise's markup is typically the smaller cost, but it's not instant. Connect's cross-border transfer is faster but usually a worse rate, and for unsupported pairs the creator is stuck holding USD and converting on their own — the worst outcome for them, at no cost to the platform.
        </Callout>
      </section>

      <section>
        <h2 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1rem', fontWeight: 700, color: INK, margin: '0 0 0.5rem' }}>
          Full picture: a $650 collab, five ways
        </h2>
        <p style={{ fontSize: '0.85rem', color: SLATE, lineHeight: 1.6, maxWidth: 640, marginBottom: '1rem' }}>
          Fee = $32.50, cash = $650, carried through every combination of host rail × creator rail × geography.
        </p>
        <Scenario label="A · US host (ACH) → US creator (Connect, USD)" net="$27.50" netTone="gain" creator="$650.00, instantly" cost="≈ $5.00" verdict="Best case — nothing to improve here." />
        <Scenario label="B · US host opts out (card) → US creator (Connect, USD)" net="$12.41" netTone="loss" creator="$650.00, instantly" cost="≈ $20.09" verdict="Creator never notices — the loss is entirely yours, vs. A." />
        <Scenario label="C · US host (ACH) → non-US creator (Connect, local currency)" net="$27.50" netTone="gain" creator="≈ $637–643 equiv." cost="≈ $12–18" verdict="Your side is fine; the creator quietly loses 1–2% to conversion." />
        <Scenario label="D · US host (ACH) → non-US creator (Wise, local currency)" net="$27.50" netTone="gain" creator="≈ $644–648 equiv." cost="≈ $7–11" verdict="Best outcome for an international creator — just not instant." />
        <Scenario label="E · Non-US host opts out (card) → non-US creator (Wise)" net="$12.41" netTone="loss" creator="≈ $644–648 equiv." cost="≈ $22–24" verdict="Worst combined case — both legs on their higher-cost rail." />
      </section>

      <p style={{ fontSize: '0.72rem', color: SAGE, marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(25,37,36,0.08)', lineHeight: 1.6 }}>
        Card assumed at Stripe's standard published US online rate, 2.9% + $0.30. ACH assumed at Stripe's standard 0.8%, capped at $5.00. Cross-border Connect and Wise figures are typical ranges, not live pricing — confirm against your actual dashboards before treating any of this as exact.
      </p>
    </div>
  );
}

const DOCS = {
  'payout-flow-diagram': PayoutFlowDiagram,
  'ach-cost-model': AchCostModelDoc,
};

export default function MoneyResources() {
  const [selectedId, setSelectedId] = useState(null);
  const selected = RESOURCES.find((r) => r.id === selectedId);
  const DocComponent = selected ? DOCS[selected.id] : null;

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 900 }}>
      {selected ? (
        <>
          <button
            onClick={() => setSelectedId(null)}
            style={{ background: 'none', border: 'none', padding: 0, marginBottom: '1.25rem', fontSize: '0.78rem', color: SAGE, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            ← Resources
          </button>
          <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.35rem', fontWeight: 700, color: INK, letterSpacing: '-0.02em', margin: 0 }}>
            {selected.title}
          </h1>
          <p style={{ fontSize: '0.78rem', color: SAGE, margin: '0.3rem 0 1.75rem' }}>Updated {selected.updated}</p>
          {DocComponent && <DocComponent />}
        </>
      ) : (
        <>
          <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
            Resources
          </h1>
          <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.75rem' }}>
            Saved reference docs on how the payment workflow is modeled.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {RESOURCES.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                style={{
                  textAlign: 'left', background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem',
                  padding: '1.1rem 1.35rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.35rem',
                }}
              >
                <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: MOSS }}>{r.category}</span>
                <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1rem', fontWeight: 700, color: INK }}>{r.title}</span>
                <span style={{ fontSize: '0.8rem', color: SLATE, lineHeight: 1.5 }}>{r.description}</span>
                <span style={{ fontSize: '0.7rem', color: SAGE, marginTop: '0.15rem' }}>Updated {r.updated}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
