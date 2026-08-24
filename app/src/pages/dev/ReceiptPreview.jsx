import { useEffect, useRef, useState } from "react";
import { ReceiptPrinter } from "../../components/ReceiptPrinter";
import ReceiptContent from "../../components/ReceiptContent";
import collabnbLogo from "../../assets/collabnb-logo.png";

const SCENARIOS = {
  creator: {
    label: "Creator — Monthly Plan",
    kicker: "CREATOR PRO · MONTHLY",
    title: "Subscription confirmed",
    items: [{ label: "Creator Pro membership", detail: "billed monthly", amount: "$29.00" }],
    subtotal: "$29.00",
    tax: "$0.00",
    total: "$29.00",
    totalLabel: "Charged today",
    card: "Visa •••• 4242",
    footNote: "Renews monthly until cancelled. Manage anytime from Settings → Billing.",
    thanks: "Welcome to Creator Pro",
    emailSubject: "You're on Creator Pro — receipt inside",
    emailHeading: "Welcome to Creator Pro",
    emailBody: "Your subscription is active. Here's your receipt for today's charge.",
  },
  host: {
    label: "Host — Card on File",
    kicker: "PAYMENT METHOD SAVED",
    title: "Card saved for future payments",
    items: [{ label: "Card verification hold", detail: "released immediately", amount: "$0.00" }],
    subtotal: "$0.00",
    tax: "$0.00",
    total: "$0.00",
    totalLabel: "Charged today",
    card: "Visa •••• 4242",
    footNote: "This card will be charged automatically once a collab is marked complete.",
    thanks: "You're ready to host",
    emailSubject: "Your payment method is saved",
    emailHeading: "You're ready to host",
    emailBody: "We saved your card on file. It's only charged once a collab wraps up.",
  },
};

const ORDER_ID = "CB-8842-QK";
const DATE_LABEL = new Date().toLocaleDateString(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function scenarioReceiptProps(scenario) {
  const s = SCENARIOS[scenario];
  return {
    kicker: s.kicker,
    orderId: ORDER_ID,
    date: DATE_LABEL,
    card: s.card,
    items: s.items,
    subtotal: s.subtotal,
    tax: s.tax,
    total: s.total,
    totalLabel: s.totalLabel,
    thanks: s.thanks,
    footNote: s.footNote,
  };
}

function EmailPreview({ scenario }) {
  const s = SCENARIOS[scenario];
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { margin:0; padding:0; background:#EFECE9; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; }
  .wrap { max-width:480px; margin:0 auto; padding:32px 20px; }
  .card { background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 4px 24px rgba(25,37,36,0.07); }
  .header { background:linear-gradient(135deg,#192524,#2d4a3e); padding:30px 32px 24px; text-align:center; }
  .logo-text { color:#fff; font-size:1.2rem; font-weight:800; letter-spacing:-0.02em; }
  .body { padding:28px 32px 8px; }
  h1 { font-size:1.3rem; font-weight:800; color:#192524; margin:0 0 8px; }
  p.lead { font-size:0.875rem; color:#4a6670; line-height:1.6; margin:0 0 20px; }
  .receipt { border:1px dashed rgba(25,37,36,0.25); border-radius:12px; padding:18px 20px; margin:0 0 20px; font-family:'SF Mono',Menlo,monospace; }
  .receipt .row { display:flex; justify-content:space-between; font-size:0.75rem; color:#3C5759; padding:3px 0; }
  .receipt .row.item span:first-child { color:#192524; }
  .receipt hr { border:none; border-top:1px dashed rgba(25,37,36,0.25); margin:10px 0; }
  .receipt .total { display:flex; justify-content:space-between; font-size:0.9rem; font-weight:800; color:#192524; border-top:1px solid #192524; padding-top:8px; margin-top:4px; }
  .footer { padding:16px 32px 28px; text-align:center; }
  .footer p { font-size:0.72rem; color:#8faea6; margin:0; }
</style></head>
<body>
<div class="wrap"><div class="card">
  <div class="header"><span class="logo-text">Collabnb</span></div>
  <div class="body">
    <h1>${s.emailHeading}</h1>
    <p class="lead">${s.emailBody}</p>
    <div class="receipt">
      <div class="row"><span>Order</span><span>${ORDER_ID}</span></div>
      <div class="row"><span>Date</span><span>${DATE_LABEL}</span></div>
      <div class="row"><span>Payment</span><span>${s.card}</span></div>
      <hr />
      ${s.items.map((i) => `<div class="row item"><span>${i.label}</span><span>${i.amount}</span></div>`).join("")}
      <hr />
      <div class="total"><span>${s.totalLabel}</span><span>${s.total}</span></div>
    </div>
  </div>
  <div class="footer"><p>${s.footNote}<br />Collabnb · collabnb.com</p></div>
</div></div>
</body></html>`;

  return (
    <iframe
      title="Confirmation email preview"
      srcDoc={html}
      className="h-[520px] w-full rounded-2xl border border-black/10 bg-white"
    />
  );
}

export default function ReceiptPreview() {
  const [scenario, setScenario] = useState("creator");
  const [stage, setStage] = useState("complete");
  const timers = useRef([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const runSimulation = () => {
    clearTimers();
    setStage("processing");
    timers.current.push(setTimeout(() => setStage("printing"), 1100));
    timers.current.push(setTimeout(() => setStage("complete"), 1100 + 1750));
  };

  useEffect(() => clearTimers, []);

  return (
    <div className="min-h-screen w-full" style={{ background: "var(--bone)" }}>
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--sage)]">
            Internal preview — not linked from the live app
          </span>
          <h1 className="font-display text-2xl font-extrabold text-[var(--ink)]">
            Post-checkout receipt animation
          </h1>
          <p className="max-w-2xl text-sm text-[var(--slate)]">
            Simulates what a creator sees after subscribing to the monthly plan, and what a host
            sees after saving a card for future payments — plus the confirmation email each one
            triggers. Nothing here is wired to real Stripe or Resend yet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {Object.entries(SCENARIOS).map(([key, s]) => (
            <button
              key={key}
              onClick={() => { setScenario(key); setStage("complete"); clearTimers(); }}
              className="rounded-full px-4 py-2 text-sm font-semibold transition"
              style={
                scenario === key
                  ? { background: "var(--ink)", color: "#fff" }
                  : { background: "#fff", color: "var(--slate)", border: "1px solid rgba(25,37,36,0.12)" }
              }
            >
              {s.label}
            </button>
          ))}

          <div className="mx-2 h-6 w-px" style={{ background: "rgba(25,37,36,0.12)" }} />

          <button
            onClick={runSimulation}
            className="rounded-full px-4 py-2 text-sm font-semibold text-white transition"
            style={{ background: "var(--slate)" }}
          >
            ▶ Simulate exiting Stripe checkout
          </button>

          <div className="flex items-center gap-1 rounded-full p-1" style={{ background: "#fff", border: "1px solid rgba(25,37,36,0.12)" }}>
            {["processing", "printing", "complete"].map((s) => (
              <button
                key={s}
                onClick={() => { clearTimers(); setStage(s); }}
                className="rounded-full px-3 py-1.5 text-xs font-medium capitalize transition"
                style={stage === s ? { background: "var(--mint)", color: "var(--ink)" } : { color: "var(--sage)" }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="flex flex-col items-center gap-4 rounded-[1.75rem] p-8" style={{ background: "rgba(255,255,255,0.5)" }}>
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--sage)]">
              Animation shown right after Stripe redirects back
            </span>
            <ReceiptPrinter.Root stage={stage} className="pt-2">
              <ReceiptPrinter.Machine>
                <ReceiptPrinter.Header>
                  <img src={collabnbLogo} alt="" className="h-6 w-6 rounded-md opacity-90" />
                  <ReceiptPrinter.Status />
                </ReceiptPrinter.Header>
                <ReceiptPrinter.Screen>
                  <span className="text-[0.65rem] text-white/50">Collabnb Terminal</span>
                </ReceiptPrinter.Screen>
              </ReceiptPrinter.Machine>
              <ReceiptPrinter.Output>
                <ReceiptPrinter.Paper>
                  <ReceiptContent {...scenarioReceiptProps(scenario)} />
                </ReceiptPrinter.Paper>
              </ReceiptPrinter.Output>
            </ReceiptPrinter.Root>
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--sage)]">
              Confirmation email sent on completion
            </span>
            <EmailPreview scenario={scenario} />
          </div>
        </div>
      </div>
    </div>
  );
}
