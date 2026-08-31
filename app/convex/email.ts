import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";

const ADMIN_TO = "hellocollabnb@gmail.com";
const FROM = "Collabnb <hello@collabnb.com>";

// Shared receipt-style HTML shell for post-checkout confirmation emails —
// mirrors the torn-paper ReceiptPrinter UI shown in the app right after
// Stripe redirects back, so the email and the in-app animation tell the
// same story.
function receiptEmailHtml({ heading, leadText, orderId, dateStr, cardLine, itemLabel, itemDetail, itemAmountStr, totalLabel, amountStr, footNote }) {
  const itemAmount = itemAmountStr ?? amountStr;
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
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
  .receipt .row.item span:last-child { font-weight:700; }
  .receipt hr { border:none; border-top:1px dashed rgba(25,37,36,0.25); margin:10px 0; }
  .receipt .total { display:flex; justify-content:space-between; font-size:0.9rem; font-weight:800; color:#192524; border-top:1px solid #192524; padding-top:8px; margin-top:4px; }
  .footer { padding:16px 32px 28px; text-align:center; }
  .footer p { font-size:0.72rem; color:#8faea6; margin:0; line-height:1.6; }
</style></head>
<body>
<div class="wrap"><div class="card">
  <div class="header"><span class="logo-text">Collabnb</span></div>
  <div class="body">
    <h1>${heading}</h1>
    <p class="lead">${leadText}</p>
    <div class="receipt">
      <div class="row"><span>Order</span><span>${orderId}</span></div>
      <div class="row"><span>Date</span><span>${dateStr}</span></div>
      <div class="row"><span>Payment</span><span>${cardLine}</span></div>
      <hr />
      <div class="row item"><span>${itemLabel}<br /><span style="font-weight:400;color:#8faea6;font-size:0.68rem;">${itemDetail}</span></span><span>${itemAmount}</span></div>
      <hr />
      <div class="total"><span>${totalLabel}</span><span>${amountStr}</span></div>
    </div>
  </div>
  <div class="footer"><p>${footNote}<br />Collabnb · collabnb.com</p></div>
</div></div>
</body></html>`;
}

function shortOrderId(sessionId) {
  return `CB-${sessionId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}`;
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Internal action — sends welcome email to a new waitlist member ───────────
export const sendWelcomeEmail = internalAction({
  args: {
    to: v.string(),
    name: v.string(),
    role: v.string(),
  },
  handler: async (_ctx, { to, name, role }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const firstName = name.split(" ")[0];
    const roleLabel = role === "host" ? "host" : "creator";

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { margin:0; padding:0; background:#EFECE9; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; }
  .wrap { max-width:560px; margin:0 auto; padding:40px 20px; }
  .card { background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 4px 24px rgba(25,37,36,0.07); }
  .header { background:linear-gradient(135deg,#192524,#2d4a3e); padding:36px 40px 28px; text-align:center; }
  .header-inner { display:inline-flex; align-items:center; gap:12px; }
  .logo-text { color:#fff; font-size:1.35rem; font-weight:800; letter-spacing:-0.02em; vertical-align:middle; }
  .body { padding:36px 40px 32px; }
  h1 { font-size:1.55rem; font-weight:800; color:#192524; margin:0 0 12px; line-height:1.2; }
  p { font-size:0.9375rem; color:#4a6670; line-height:1.65; margin:0 0 16px; }
  .highlight { background:#f0faf5; border-left:3px solid #4ecdc4; border-radius:0 12px 12px 0; padding:14px 18px; margin:24px 0; }
  .highlight p { margin:0; font-size:0.875rem; color:#2d7a6a; font-weight:500; }
  .steps { margin:24px 0; }
  .step { display:flex; gap:14px; margin-bottom:16px; align-items:flex-start; }
  .step-num { width:28px; height:28px; min-width:28px; border-radius:50%; background:#192524; color:#fff; font-size:0.75rem; font-weight:800; display:flex; align-items:center; justify-content:center; margin-top:1px; }
  .step p { margin:0; font-size:0.875rem; }
  .btn { display:inline-block; background:#192524; color:#fff !important; text-decoration:none; padding:13px 28px; border-radius:12px; font-size:0.9rem; font-weight:700; letter-spacing:0.01em; margin:8px 0 0; }
  .footer { padding:20px 40px 28px; text-align:center; }
  .footer p { font-size:0.78rem; color:#8faea6; margin:0; line-height:1.6; }
  @media (max-width:560px) {
    .body, .footer { padding-left:24px; padding-right:24px; }
    .header { padding:28px 24px; }
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="header">
      <div class="header-inner">
        <img src="https://collabnb.com/assets/collabnb-logo.png" alt="Collabnb" width="40" height="40" style="border-radius:10px;display:inline-block;vertical-align:middle;" />
        <span class="logo-text">Collabnb</span>
      </div>
    </div>
    <div class="body">
      <h1>You're on the list, ${firstName}! 🎉</h1>
      <p>Thanks for joining Collabnb as a <strong>${roleLabel}</strong>. Your application is now in review — our team manually verifies every new member to keep the community high quality.</p>

      <div class="highlight">
        <p>📬 We'll email you at this address once you're approved. Usually within <strong>1–2 business days</strong>.</p>
      </div>

      <p style="font-weight:700;color:#192524;margin-bottom:10px;">What happens next:</p>
      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <p>Our team reviews your application and verifies your profile.</p>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <p>You'll receive an approval email with a link to access the platform.</p>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <p>Full listings go live <strong>July 15</strong> — early members get first pick.</p>
        </div>
      </div>

      <a href="https://collabnb.com" class="btn">Preview the platform →</a>
    </div>
    <div class="footer">
      <p>Questions? Reply to this email or reach us at <a href="mailto:hello@collabnb.com" style="color:#3C5759;">hello@collabnb.com</a></p>
      <p style="margin-top:6px;">© 2026 Collabnb · You're receiving this because you joined the waitlist.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: [to],
          subject: `You're on the Collabnb waitlist, ${firstName}!`,
          html,
        }),
      });
    } catch (err) {
      console.warn("Welcome email send failed:", err);
    }
  },
});

// ─── Internal action — sends admin notification email via Resend ──────────────
// Requires RESEND_API_KEY in Convex environment variables.
// Set it with: npx convex env set RESEND_API_KEY re_xxxxxxxxxxxx
export const sendAdminNotification = internalAction({
  args: {
    type: v.union(v.literal("signup"), v.literal("message"), v.literal("collab"), v.literal("crash")),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { type, subject, body }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return; // silently skip until API key is configured

    // Respect the admin notification toggles — except crash reports, which
    // are a manual "send this to dev right now" click and should always go
    // out regardless of the routine-notification settings.
    if (type !== "crash") {
      const settings = await ctx.runQuery(api.admin.getSettings);
      if (settings?.[`notify_${type}`] !== "true") return;
    }

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: [ADMIN_TO],
          subject: `[Collabnb] ${subject}`,
          text: body,
        }),
      });
    } catch (err) {
      console.warn("Email send failed:", err);
    }
  },
});

// ─── Internal action — payout receipt, sent to host + creator on charge/payout ──
// Fired from contracts.ts once a collab-completion charge succeeds (host receipt)
// and once the creator payout status changes to "paid" (creator receipt).
export const sendPayoutReceiptEmail = internalAction({
  args: {
    to: v.string(),
    name: v.string(),
    role: v.union(v.literal("host"), v.literal("creator")),
    amount: v.number(),
    counterpartyName: v.string(),
    propertyName: v.optional(v.string()),
  },
  handler: async (_ctx, { to, name, role, amount, counterpartyName, propertyName }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const firstName = name.split(" ")[0];
    const amountStr = `$${amount.toFixed(2)}`;
    const subject = role === "host"
      ? `Receipt: your Collabnb payment for ${propertyName || counterpartyName}`
      : `You've been paid ${amountStr} on Collabnb`;
    const headline = role === "host"
      ? `Payment confirmed, ${firstName}`
      : `${amountStr} is on its way, ${firstName}!`;
    const bodyLine = role === "host"
      ? `Your card was charged <strong>${amountStr}</strong> for the completed collaboration with <strong>${counterpartyName}</strong>. This covers the creator's payout plus Collabnb's platform fee.`
      : `Collabnb has forwarded <strong>${amountStr}</strong> for your completed collaboration with <strong>${counterpartyName}</strong> to your connected payout account. Stripe payouts arrive quickly; Wise payouts can take a few extra business days to settle.`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { margin:0; padding:0; background:#EFECE9; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; }
  .wrap { max-width:520px; margin:0 auto; padding:40px 20px; }
  .card { background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 4px 24px rgba(25,37,36,0.07); }
  .header { background:linear-gradient(135deg,#192524,#2d4a3e); padding:32px 40px 24px; text-align:center; }
  .logo-text { color:#fff; font-size:1.35rem; font-weight:800; letter-spacing:-0.02em; }
  .body { padding:32px 40px; }
  h1 { font-size:1.35rem; font-weight:800; color:#192524; margin:0 0 12px; line-height:1.2; }
  p { font-size:0.9375rem; color:#4a6670; line-height:1.65; margin:0 0 16px; }
  .amount { font-size:2rem; font-weight:800; color:#192524; margin:0 0 4px; }
  .footer { padding:16px 40px 28px; text-align:center; }
  .footer p { font-size:0.78rem; color:#8faea6; margin:0; line-height:1.6; }
</style>
</head>
<body>
<div class="wrap"><div class="card">
  <div class="header"><span class="logo-text">Collabnb</span></div>
  <div class="body">
    <p class="amount">${amountStr}</p>
    <h1>${headline}</h1>
    <p>${bodyLine}</p>
  </div>
  <div class="footer">
    <p>Questions? Reply to this email or reach us at <a href="mailto:hello@collabnb.com" style="color:#3C5759;">hello@collabnb.com</a></p>
  </div>
</div></div>
</body></html>`;

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to: [to], subject, html }),
      });
    } catch (err) {
      console.warn("Payout receipt email send failed:", err);
    }
  },
});

// ─── Internal action — creator subscription receipt ────────────────────────
// Fired from stripe.verifySubscriptionSession right after a monthly/yearly
// Creator Pro Checkout completes. amount is the real amount_total Stripe
// charged on the session (in dollars) — never a hardcoded tier price — so
// this always matches whatever STRIPE_PRICE_MONTHLY_ID/YEARLY_ID actually bill.
export const sendSubscriptionReceiptEmail = internalAction({
  args: {
    to: v.string(),
    name: v.string(),
    tier: v.string(),
    amount: v.number(),
    sessionId: v.string(),
    cardBrand: v.optional(v.string()),
    cardLast4: v.optional(v.string()),
  },
  handler: async (_ctx, { to, name, tier, amount, sessionId, cardBrand, cardLast4 }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const firstName = name.split(" ")[0];
    const tierLabel = tier === "yearly" ? "Yearly" : "Monthly";
    const amountStr = `$${amount.toFixed(2)}`;
    const cardLine = cardLast4 ? `${cardBrand ? cardBrand[0].toUpperCase() + cardBrand.slice(1) : "Card"} •••• ${cardLast4}` : "Card on file";

    const html = receiptEmailHtml({
      heading: `Welcome to Creator Pro, ${firstName}!`,
      leadText: "Your subscription is active. Here's your receipt for today's charge.",
      orderId: shortOrderId(sessionId),
      dateStr: todayLabel(),
      cardLine,
      itemLabel: "Creator Pro membership",
      itemDetail: `billed ${tierLabel.toLowerCase()}`,
      totalLabel: "Charged today",
      amountStr,
      footNote: `Renews ${tierLabel.toLowerCase()} until cancelled. Manage anytime from Settings → Billing.`,
    });

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to: [to], subject: `You're on Creator Pro — receipt inside`, html }),
      });
    } catch (err) {
      console.warn("Subscription receipt email send failed:", err);
    }
  },
});

// ─── Internal action — host card-on-file confirmation ──────────────────────
// Fired from stripe.verifyHostCardSetupSession (account-level card, amount
// unknown yet) and stripe.verifyFeeSetupSession (per-contract card saved at
// signing, where the eventual fee is already known). Either way $0.00 is
// charged right now — the card is only charged later, automatically, when
// a collab is marked complete. When feeAmount is passed in, the receipt
// previews that known future charge instead of a generic placeholder line.
export const sendCardSavedEmail = internalAction({
  args: {
    to: v.string(),
    name: v.string(),
    sessionId: v.string(),
    cardBrand: v.optional(v.string()),
    cardLast4: v.optional(v.string()),
    feeAmount: v.optional(v.number()),
    isACH: v.optional(v.boolean()),
  },
  handler: async (_ctx, { to, name, sessionId, cardBrand, cardLast4, feeAmount, isACH }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const firstName = name.split(" ")[0];
    const cardLine = cardLast4 ? `${cardBrand ? cardBrand[0].toUpperCase() + cardBrand.slice(1) : "Card"} •••• ${cardLast4}` : "Card on file";
    const knownFee = typeof feeAmount === "number" && feeAmount > 0;
    const achNote = isACH ? " Bank account charges take a few extra business days to clear once triggered — that's normal, not a problem." : "";

    const html = receiptEmailHtml({
      heading: `You're ready to host, ${firstName}`,
      leadText: (knownFee
        ? "We saved your card for this collaboration. It's only charged once the collab wraps up."
        : "We saved your card on file. It's only charged once a collab wraps up.") + achNote,
      orderId: shortOrderId(sessionId),
      dateStr: todayLabel(),
      cardLine,
      itemLabel: knownFee ? "Platform fee — this collaboration" : "Card verification hold",
      itemDetail: knownFee ? "charged automatically when completed" : "released immediately",
      itemAmountStr: knownFee ? `$${feeAmount.toFixed(2)}` : "$0.00",
      totalLabel: "Charged today",
      amountStr: "$0.00",
      footNote: isACH
        ? "This bank account will be debited automatically once a collab is marked complete — allow a few extra business days for it to clear."
        : "This card will be charged automatically once a collab is marked complete.",
    });

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to: [to], subject: "Your payment method is saved", html }),
      });
    } catch (err) {
      console.warn("Card saved email send failed:", err);
    }
  },
});
