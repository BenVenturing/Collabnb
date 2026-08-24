import { useEffect, useRef, useState } from "react";
import { ReceiptPrinter } from "./ReceiptPrinter";
import ReceiptContent from "./ReceiptContent";
import collabnbLogo from "../assets/collabnb-logo.png";

// Full-screen animation shown right after a user is redirected back from a
// real Stripe Checkout session (creator subscription or host card setup).
// `receipt` is null when there's nothing to show; the overlay mounts
// itself and auto-advances processing -> printing -> complete.
//
// receipt shape:
//   { type: 'creator', tier, amount, orderId, cardBrand, cardLast4 }
//   { type: 'host', orderId, cardBrand, cardLast4 }
export default function ReceiptCheckoutOverlay({ receipt, onClose }) {
  const [stage, setStage] = useState("processing");
  const timers = useRef([]);

  useEffect(() => {
    if (!receipt) return undefined;
    setStage("processing");
    timers.current.forEach(clearTimeout);
    timers.current = [
      setTimeout(() => setStage("printing"), 900),
      setTimeout(() => setStage("complete"), 900 + 1750),
    ];
    return () => timers.current.forEach(clearTimeout);
  }, [receipt]);

  if (!receipt) return null;

  const cardLabel = receipt.cardLast4
    ? `${receipt.cardBrand ? receipt.cardBrand[0].toUpperCase() + receipt.cardBrand.slice(1) : "Card"} •••• ${receipt.cardLast4}`
    : "Card on file";
  const dateLabel = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const orderLabel = receipt.orderId ? `CB-${receipt.orderId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}` : "CB-PENDING";

  const isHost = receipt.type === "host";
  const amountStr = `$${(receipt.amount ?? 0).toFixed(2)}`;
  const tierLabel = receipt.tier === "yearly" ? "Yearly" : "Monthly";

  const contentProps = isHost
    ? {
        kicker: "PAYMENT METHOD SAVED",
        items: [{ label: "Card verification hold", detail: "released immediately", amount: "$0.00" }],
        subtotal: "$0.00",
        tax: "$0.00",
        total: "$0.00",
        totalLabel: "Charged today",
        thanks: "You're ready to host",
        footNote: "This card will be charged automatically once a collab is marked complete.",
      }
    : {
        kicker: `CREATOR PRO · ${tierLabel.toUpperCase()}`,
        items: [{ label: "Creator Pro membership", detail: `billed ${tierLabel.toLowerCase()}`, amount: amountStr }],
        subtotal: amountStr,
        tax: "$0.00",
        total: amountStr,
        totalLabel: "Charged today",
        thanks: `Welcome to Creator Pro${receipt.tier === "yearly" ? " (yearly)" : ""}`,
        footNote: "Renews automatically. Manage anytime from Settings → Billing.",
      };

  const canClose = stage === "complete";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isHost ? "Card saved confirmation" : "Subscription confirmation"}
      onClick={(e) => { if (canClose && e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(25,37,36,0.55)",
        backdropFilter: "blur(6px)",
        padding: "1.5rem",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem" }}>
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
              <ReceiptContent orderId={orderLabel} date={dateLabel} card={cardLabel} {...contentProps} />
            </ReceiptPrinter.Paper>
          </ReceiptPrinter.Output>
        </ReceiptPrinter.Root>

        {canClose ? (
          <button
            onClick={onClose}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-white transition"
            style={{ background: "var(--ink)" }}
          >
            Done
          </button>
        ) : null}
      </div>
    </div>
  );
}
