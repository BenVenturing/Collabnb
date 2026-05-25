import { useNavigate } from "react-router-dom";
import { FileText, Sparkles, Package2, CheckCircle, X } from "lucide-react";

const STEPS = [
  { icon: FileText, title: "1. The basics", desc: "Tell us about your listing and collaboration type" },
  { icon: Sparkles, title: "2. The offer", desc: "What perks and experience will creators get?" },
  { icon: Package2, title: "3. Deliverables & dates", desc: "Set collaboration window and define what you need" },
  { icon: CheckCircle, title: "4. Review & publish", desc: "Preview your listing and publish to creators" },
];

export default function CreateListingIntro() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bone)", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px" }}>
        <button onClick={() => navigate("/host")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)" }}>
          <X size={22} />
        </button>
        <button style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--slate)" }}>
          ?
        </button>
      </div>

      <div style={{ flex: 1, padding: "24px 24px 48px", maxWidth: 680, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontFamily: "Cabinet Grotesk, serif", fontWeight: 800, fontSize: "clamp(28px, 5vw, 38px)", color: "var(--ink)", lineHeight: 1.15, margin: "0 0 12px" }}>
          It's easy to create<br />a listing on Collabnb
        </h1>
        <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 15, color: "var(--slate)", margin: "0 0 40px", lineHeight: 1.55 }}>
          We'll guide you through the process step by step. You can save and come back anytime.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {STEPS.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{
              background: "#fff",
              borderRadius: "1.25rem",
              border: "1px solid rgba(255,255,255,0.85)",
              padding: "20px 24px",
              display: "flex",
              alignItems: "flex-start",
              gap: 20,
              boxShadow: "0 2px 12px rgba(25,37,36,0.06)",
            }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--mint)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={20} color="var(--ink)" />
              </div>
              <div>
                <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--ink)", marginBottom: 4 }}>{title}</div>
                <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--slate)", lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 24px 40px", maxWidth: 680, margin: "0 auto", width: "100%" }}>
        <button
          onClick={() => navigate("/host/listings/create/basics")}
          style={{ width: "100%", padding: "16px 0", borderRadius: 9999, border: "none", background: "var(--ink)", fontFamily: "Satoshi, sans-serif", fontSize: 16, fontWeight: 700, color: "#fff", cursor: "pointer", letterSpacing: "-0.01em" }}
        >
          Get started
        </button>
      </div>
    </div>
  );
}
