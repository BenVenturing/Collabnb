import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, HelpCircle } from "lucide-react";

const STEPS = [
  { label: "Basics", path: "/host/listings/create/basics" },
  { label: "The Offer", path: "/host/listings/create/offer" },
  { label: "Deliverables", path: "/host/listings/create/deliverables" },
  { label: "Review", path: "/host/listings/create/review" },
];

export default function WizardShell({ step, children, onBack, onNext, nextLabel = "Next", nextDisabled = false }) {
  const navigate = useNavigate();

  function handleBack() {
    if (onBack) { onBack(); return; }
    if (step > 1) navigate(STEPS[step - 2].path);
    else navigate("/host/listings/create");
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bone)", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(239,236,233,0.85)", backdropFilter: "blur(20px) saturate(135%)",
        borderBottom: "1px solid rgba(255,255,255,0.6)",
        padding: "0 24px",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <button onClick={handleBack} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "var(--ink)", fontFamily: "Satoshi, sans-serif", fontSize: 14, fontWeight: 500, padding: "8px 0" }}>
            <ArrowLeft size={18} />
          </button>
          <span style={{ fontFamily: "Satoshi, sans-serif", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
            Step {step} of 4
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => navigate("/host")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--slate)", textDecoration: "underline", padding: 0 }}>
              Save & exit
            </button>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sage)" }}>
              <HelpCircle size={18} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 12, display: "flex", gap: 6 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 9999, background: i < step ? "var(--ink)" : "rgba(25,37,36,0.15)", transition: "background 0.3s" }} />
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px 120px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {children}
        </div>
      </div>

      {/* Bottom action bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(239,236,233,0.92)", backdropFilter: "blur(20px) saturate(135%)",
        borderTop: "1px solid rgba(255,255,255,0.6)",
        padding: "16px 24px",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 12 }}>
          <button
            onClick={handleBack}
            style={{ flex: 1, padding: "14px 0", borderRadius: 9999, border: "1.5px solid var(--ink)", background: "transparent", fontFamily: "Satoshi, sans-serif", fontSize: 15, fontWeight: 700, color: "var(--ink)", cursor: "pointer" }}
          >
            Back
          </button>
          <button
            onClick={onNext}
            disabled={nextDisabled}
            style={{ flex: 2, padding: "14px 0", borderRadius: 9999, border: "none", background: nextDisabled ? "var(--sage)" : "var(--ink)", fontFamily: "Satoshi, sans-serif", fontSize: 15, fontWeight: 700, color: "#fff", cursor: nextDisabled ? "not-allowed" : "pointer", transition: "background 0.2s" }}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
