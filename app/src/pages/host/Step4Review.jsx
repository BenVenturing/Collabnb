import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, DollarSign } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import WizardShell from "../../components/host/WizardShell";
import { useListingDraft } from "../../contexts/ListingDraftContext";
import { useAuth } from "../../contexts/AuthContext";
import { formatDateRange } from "../../lib/dateUtils";

const TIER_LABELS = { ugc_beginner: "UGC Beginner", ugc_pro: "UGC Pro", micro: "Micro Influencer", mid: "Influencer" };
const COMP_LABELS = { free_stay: "Free Stay", paid: "Paid", hybrid: "Hybrid" };
const LOAD_LABELS = { light: "Light Load", moderate: "Moderate Load", heavy: "Heavy Load" };

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ink)", marginBottom: 12 }}>{title}</div>
      <div style={{ background: "#fff", borderRadius: "1rem", border: "1.5px solid rgba(25,37,36,0.08)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 13, color: "var(--slate)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--ink)" }}>{value}</div>
    </div>
  );
}

function Confetti({ show }) {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999, overflow: "hidden" }}>
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${Math.random() * 100}%`,
          top: "-10px",
          width: 8,
          height: 8,
          borderRadius: Math.random() > 0.5 ? "50%" : 0,
          background: ["#D1EBDB", "#192524", "#3C5759", "#959D90", "#fff"][Math.floor(Math.random() * 5)],
          animation: `fall ${1.5 + Math.random()}s ease-in forwards`,
          animationDelay: `${Math.random() * 0.5}s`,
          transform: `rotate(${Math.random() * 360}deg)`,
        }} />
      ))}
      <style>{`@keyframes fall { to { transform: translateY(110vh) rotate(720deg); opacity: 0; } }`}</style>
    </div>
  );
}

export default function Step4Review() {
  const navigate = useNavigate();
  const { draft, clearDraft, fee, totalDeliverables, formatCount } = useListingDraft();
  const { profile } = useAuth();
  const createListing = useMutation(api.listings.create);
  const [feesOpen, setFeesOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confetti, setConfetti] = useState(false);

  const compLabel = COMP_LABELS[draft.compensation_type] || "";
  const tierLabel = TIER_LABELS[draft.creator_tier] || "";
  const loadLabel = LOAD_LABELS[draft.deliverable_load] || "";

  async function handlePublish(status) {
    setPublishing(true);
    try {
      await createListing({
        title: draft.title,
        location: `${draft.location_city}, ${draft.location_country}`,
        location_city: draft.location_city,
        location_country: draft.location_country,
        host_id: profile?._id || profile?.id,
        host_name: profile?.full_name,
        status,
        property_url: draft.property_url,
        collaboration_brief: draft.collaboration_brief,
        compensation_type: draft.compensation_type,
        cash_amount: draft.cash_amount || undefined,
        nights: draft.nights,
        creator_tier: draft.creator_tier,
        deliverable_load: draft.deliverable_load,
        gallery_images: draft.images,
        perks: draft.perks,
        vibe_tags: draft.vibe_tags,
        affiliate_code: draft.affiliate_code,
        collab_start: draft.collab_start,
        collab_end: draft.collab_end,
        turnaround_days: draft.turnaround_days,
        deliverables_list: draft.deliverables_list,
        deliverable_count: totalDeliverables,
        revision_policy: draft.revision_policy,
        usage_rights: draft.usage_rights,
      });
      if (status === "published") {
        setConfetti(true);
        setTimeout(() => { setConfetti(false); clearDraft(); navigate("/host"); }, 2200);
      } else {
        clearDraft();
        navigate("/host");
      }
    } catch (err) {
      console.error(err);
      setPublishing(false);
    }
  }

  return (
    <>
      <Confetti show={confetti} />
      <WizardShell
        step={4}
        nextLabel={publishing ? "Publishing..." : "Publish listing"}
        nextDisabled={publishing}
        onNext={() => handlePublish("published")}
      >
        <h2 style={{ fontFamily: "Cabinet Grotesk, serif", fontWeight: 800, fontSize: 28, color: "var(--ink)", margin: "0 0 6px", display: "flex", alignItems: "center", gap: 10 }}>
          Review & publish
        </h2>
        <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--slate)", margin: "0 0 32px" }}>
          Here's how your listing will appear to creators. Review everything before publishing.
        </p>

        {/* Header card */}
        <div style={{ background: "#fff", borderRadius: "1rem", border: "1.5px solid rgba(25,37,36,0.08)", padding: "18px 20px", marginBottom: 16 }}>
          <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>{draft.title || "—"}</div>
          <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--slate)", marginTop: 2 }}>{draft.location_city}{draft.location_country ? `, ${draft.location_country}` : ""}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {tierLabel && <span style={{ padding: "5px 12px", borderRadius: 9999, border: "1.5px solid rgba(25,37,36,0.15)", fontFamily: "Satoshi, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{tierLabel}</span>}
            {compLabel && draft.nights && draft.compensation_type !== "paid" && <span style={{ padding: "5px 12px", borderRadius: 9999, background: "var(--mint)", fontFamily: "Satoshi, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{draft.nights} nights {compLabel}</span>}
            {loadLabel && <span style={{ padding: "5px 12px", borderRadius: 9999, border: "1.5px solid rgba(25,37,36,0.15)", fontFamily: "Satoshi, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{loadLabel}</span>}
          </div>
        </div>

        <Section title="The Offer">
          {draft.perks.length > 0 && <Row label="Add-ons" value={"• " + draft.perks.join("\n• ")} />}
          <Row label="What you deliver" value={`${totalDeliverables} total deliverables across ${formatCount} format${formatCount !== 1 ? "s" : ""}`} />
          {draft.vibe_tags.length > 0 && <Row label="Vibe" value={draft.vibe_tags.join(", ")} />}
        </Section>

        <Section title="Dates & Deadlines">
          {draft.collab_start && draft.collab_end && <Row label="Collaboration Window" value={formatDateRange(draft.collab_start, draft.collab_end)} />}
          <Row label="Deliverables Due" value={`${draft.turnaround_days} days after stay`} />
        </Section>

        <Section title="Deliverables">
          {draft.deliverables_list.slice(0, 2).map((d, i) => (
            <div key={i} style={{ background: "var(--bone)", borderRadius: "0.625rem", padding: "10px 14px" }}>
              <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>{d.quantity}x {d.type}</div>
              {d.description && <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--slate)", marginTop: 2 }}>{d.description}</div>}
            </div>
          ))}
          {draft.deliverables_list.length > 2 && (
            <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--sage)", textAlign: "center" }}>+{draft.deliverables_list.length - 2} more</div>
          )}
        </Section>

        <Section title="Things to know">
          <Row label="Revision policy" value={draft.revision_policy} />
          <Row label="Usage rights" value={draft.usage_rights} />
        </Section>

        {/* Host-only fees */}
        <div style={{ border: "1.5px solid #3C5759", borderRadius: "1rem", overflow: "hidden", marginBottom: 24 }}>
          <button
            onClick={() => setFeesOpen(!feesOpen)}
            style={{ width: "100%", padding: "16px 20px", background: "rgba(60,87,89,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>
              <DollarSign size={16} color="var(--slate)" />
              Host-only: Pricing & Fees
            </div>
            {feesOpen ? <ChevronUp size={16} color="var(--slate)" /> : <ChevronDown size={16} color="var(--slate)" />}
          </button>
          {feesOpen && (
            <div style={{ padding: "16px 20px", background: "rgba(255,251,230,0.6)", borderTop: "1px solid rgba(60,87,89,0.15)" }}>
              <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--slate)", marginBottom: 4 }}>Platform fee</div>
              <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 800, fontSize: 22, color: "var(--ink)", marginBottom: 2 }}>${fee.toFixed(0)}</div>
              <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--sage)", marginBottom: 12 }}>
                {draft.compensation_type === "paid" || draft.compensation_type === "hybrid" ? "8% of cash payout (min $20, max $100)" : "Flat fee for free/exchange listing"}
              </div>
              <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "#b45309", fontWeight: 600 }}>⚠ Creators don't see these fees</div>
            </div>
          )}
        </div>

        {/* Save draft */}
        <button
          onClick={() => handlePublish("draft")}
          disabled={publishing}
          style={{ width: "100%", padding: "14px 0", marginBottom: 16, background: "none", border: "none", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 15, fontWeight: 600, color: "var(--slate)", textDecoration: "underline" }}
        >
          Save draft
        </button>
      </WizardShell>
    </>
  );
}
