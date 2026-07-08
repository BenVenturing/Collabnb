import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, DollarSign, ArrowLeft, ArrowRight, Star, Eye, X } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import WizardShell from "../../components/host/WizardShell";
import { useListingDraft } from "../../contexts/ListingDraftContext";
import { useAuth } from "../../contexts/AuthContext";
import { formatDateRange } from "../../lib/dateUtils";
import ListingDetail from "../ListingDetail";
import { calcMidpoint, calcStayOffset, calcRange, evaluateZone, totalPoints } from "../../../convex/lib/compensationPoints";

const TIER_LABELS = { ugc_beginner: "UGC Beginner", ugc_pro: "UGC Pro", micro: "Micro Influencer", mid: "Influencer" };
const COMP_LABELS = { paid: "Paid", hybrid: "Hybrid" };
const LOAD_LABELS = { light: "Light Load", moderate: "Moderate Load", heavy: "Heavy Load", custom: "Custom Campaign" };

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ink)", marginBottom: 12 }}>{title}</div>
      <div style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(14px) saturate(130%)", WebkitBackdropFilter: "blur(14px) saturate(130%)", borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.85)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 2px 12px rgba(25,37,36,0.05)" }}>
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

const CONFETTI_COLORS = [
  "#FF3B30","#FF9500","#FFCC00","#34C759","#30D158",
  "#00C7BE","#32ADE6","#007AFF","#5856D6","#AF52DE",
  "#FF2D55","#FF6B35","#FFD60A","#30DB5B","#40CBE0",
  "#BF5AF2","#FF375F","#FF8C00","#ACE608","#0A84FF",
];

const PARTICLES = Array.from({ length: 90 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
  size: 6 + Math.random() * 8,
  isRect: Math.random() > 0.4,
  duration: 2.8 + Math.random() * 1.6,
  delay: Math.random() * 0.9,
  spin: 360 + Math.floor(Math.random() * 4) * 180,
  drift: (Math.random() - 0.5) * 120,
}));

function Confetti({ show }) {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999, overflow: "hidden" }}>
      {PARTICLES.map((p) => (
        <div key={p.id} style={{
          position: "absolute",
          left: `${p.left}%`,
          top: "-16px",
          width: p.isRect ? p.size * 0.55 : p.size,
          height: p.size,
          borderRadius: p.isRect ? "2px" : "50%",
          background: p.color,
          animation: `confettiFall${p.id % 3} ${p.duration}s cubic-bezier(0.25,0.46,0.45,0.94) ${p.delay}s forwards`,
          transformOrigin: "center center",
          opacity: 1,
          boxShadow: `0 0 2px ${p.color}66`,
        }} />
      ))}
      <style>{`
        @keyframes confettiFall0 { 0%{transform:translateY(0) rotate(0deg) translateX(0);opacity:1} 80%{opacity:1} 100%{transform:translateY(105vh) rotate(${PARTICLES[0]?.spin ?? 720}deg) translateX(40px);opacity:0} }
        @keyframes confettiFall1 { 0%{transform:translateY(0) rotate(20deg) translateX(0);opacity:1} 80%{opacity:1} 100%{transform:translateY(105vh) rotate(-${PARTICLES[1]?.spin ?? 540}deg) translateX(-60px);opacity:0} }
        @keyframes confettiFall2 { 0%{transform:translateY(0) rotate(-15deg) translateX(0);opacity:1} 80%{opacity:1} 100%{transform:translateY(105vh) rotate(${PARTICLES[2]?.spin ?? 900}deg) translateX(20px);opacity:0} }
      `}</style>
    </div>
  );
}

export default function Step4Review() {
  const navigate = useNavigate();
  const { draft, updateDraft, clearDraft, fee, totalDeliverables, formatCount } = useListingDraft();
  const { profile } = useAuth();
  const createListing = useMutation(api.listings.create);
  const updateListing = useMutation(api.listings.update);
  const editingId = typeof window !== 'undefined' ? localStorage.getItem('collabnb_editing_listing_id_v1') : null;
  const [feesOpen, setFeesOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [creatorView, setCreatorView] = useState(false);
  const [publishError, setPublishError] = useState("");

  // Resolve uploaded photos (storageIds → URLs) for reordering + creator preview
  const imageUrls = useQuery(api.uploads.getImageUrls, draft.images.length ? { storageIds: draft.images } : "skip") || [];

  function moveImage(from, to) {
    if (to < 0 || to >= draft.images.length) return;
    const next = [...draft.images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    updateDraft({ images: next });
  }

  const compLabel = COMP_LABELS[draft.compensation_type] || "";
  const tierLabel = TIER_LABELS[draft.creator_tier] || "";
  const loadLabel = LOAD_LABELS[draft.deliverable_load] || "";

  const dateRanges = (draft.date_ranges?.length
    ? draft.date_ranges
    : [{ startDate: draft.collab_start || "", endDate: draft.collab_end || "" }]
  ).filter((r) => r.startDate && r.endDate).slice(0, 3);
  const hasCompensation = (draft.compensation_type === "paid" || draft.compensation_type === "hybrid") && draft.cash_amount > 0;

  const listingFields = {
    title: draft.title,
    location: `${draft.location_city}, ${draft.location_country}`,
    location_city: draft.location_city,
    location_country: draft.location_country,
    host_id: profile?._id || profile?.id,
    host_name: profile?.full_name,
    property_url: draft.property_url,
    collaboration_brief: draft.collaboration_brief,
    compensation_type: draft.compensation_type,
    cash_amount: draft.cash_amount || undefined,
    currency: draft.currency || undefined,
    max_offers: draft.maxOffers === "" || draft.maxOffers == null ? undefined : Number(draft.maxOffers),
    nights: draft.nights,
    creator_tier: draft.creator_tier,
    deliverable_load: draft.deliverable_load,
    complexity: draft.complexity,
    stay_value: draft.compensation_type === "hybrid" ? draft.stay_value : undefined,
    deliverables: draft.deliverables?.length ? draft.deliverables : undefined,
    gallery_images: draft.images,
    amenities: draft.amenities?.length ? draft.amenities : undefined,
    perks: draft.perks,
    vibe_tags: draft.vibe_tags,
    affiliate_code: draft.affiliate_code,
    collab_start: dateRanges[0]?.startDate || draft.collab_start,
    collab_end: dateRanges[0]?.endDate || draft.collab_end,
    date_ranges: dateRanges.length ? dateRanges : undefined,
    turnaround_days: draft.turnaround_days,
    deliverables_list: draft.deliverables_list,
    deliverable_count: totalDeliverables,
    revision_policy: draft.revision_policy,
    usage_rights: draft.usage_rights,
  };

  const resolvedImages = imageUrls.filter(Boolean);
  const previewListing = {
    ...listingFields,
    _id: "preview",
    id: "preview",
    status: "published",
    gallery_images: resolvedImages,
    image: resolvedImages[0],
    collaboration_brief: draft.collaboration_brief,
  };

  async function handlePublish(status) {
    setPublishing(true);
    setPublishError("");
    try {
      if (editingId) {
        await updateListing({ id: editingId, ...listingFields, status });
        localStorage.removeItem('collabnb_editing_listing_id_v1');
      } else {
        await createListing({ ...listingFields, status });
      }
      if (status === "published") {
        setConfetti(true);
        setTimeout(() => { setConfetti(false); clearDraft(); navigate("/host"); }, 3800);
      } else {
        clearDraft();
        navigate("/host");
      }
    } catch (err) {
      console.error(err);
      setPublishError(err?.message || "Something went wrong publishing this listing.");
      setPublishing(false);
    }
  }

  // Client-side mirror of the server's three-zone floor check — same source
  // of truth (compensationPoints), so hosts see the warning before they hit it.
  let compZone = null;
  let compRange = null;
  if (draft.creator_tier && draft.deliverables?.length && hasCompensation) {
    const points = totalPoints(draft.deliverables);
    const midpoint = calcMidpoint(points, draft.creator_tier, draft.complexity || "standard");
    const stayOffset = draft.compensation_type === "hybrid" ? calcStayOffset(draft.stay_value || 0, draft.creator_tier, midpoint) : 0;
    compZone = evaluateZone(draft.cash_amount, midpoint, stayOffset);
    compRange = calcRange(midpoint);
  }

  return (
    <>
      <Confetti show={confetti} />
      <WizardShell
        step={4}
        nextLabel={publishing ? "Publishing..." : "Publish listing"}
        nextDisabled={publishing || !hasCompensation || compZone === "red"}
        onNext={() => handlePublish("published")}
      >
        <h2 style={{ fontFamily: "Cabinet Grotesk, serif", fontWeight: 800, fontSize: 28, color: "var(--ink)", margin: "0 0 6px", display: "flex", alignItems: "center", gap: 10 }}>
          {editingId ? "Edit & publish" : "Review & publish"}
        </h2>
        <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--slate)", margin: "0 0 16px" }}>
          {editingId ? "Review your changes before saving." : "Here's how your listing will appear to creators. Review everything before publishing."}
        </p>

        {/* View as creator toggle */}
        <button
          onClick={() => setCreatorView(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", marginBottom: 28, borderRadius: 9999, border: "1.5px solid var(--ink)", background: "transparent", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}
        >
          <Eye size={16} /> View as a creator
        </button>

        {/* Header card */}
        <div style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(14px) saturate(130%)", WebkitBackdropFilter: "blur(14px) saturate(130%)", borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.85)", padding: "18px 20px", marginBottom: 16, boxShadow: "0 2px 12px rgba(25,37,36,0.05)" }}>
          <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>{draft.title || "—"}</div>
          <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--slate)", marginTop: 2 }}>{draft.location_city}{draft.location_country ? `, ${draft.location_country}` : ""}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {tierLabel && <span style={{ padding: "5px 12px", borderRadius: 9999, border: "1.5px solid rgba(25,37,36,0.15)", fontFamily: "Satoshi, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{tierLabel}</span>}
            {compLabel && draft.nights && draft.compensation_type !== "paid" && <span style={{ padding: "5px 12px", borderRadius: 9999, background: "var(--mint)", fontFamily: "Satoshi, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{draft.nights} nights {compLabel}</span>}
            {loadLabel && <span style={{ padding: "5px 12px", borderRadius: 9999, border: "1.5px solid rgba(25,37,36,0.15)", fontFamily: "Satoshi, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{loadLabel}</span>}
          </div>
        </div>

        {/* Photos — order + hero */}
        {draft.images.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ink)", marginBottom: 4 }}>Photos</div>
            <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--sage)", marginBottom: 12 }}>The first photo is your hero — it leads the listing. Reorder or set a new hero below.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {draft.images.map((id, i) => (
                <div key={id || i} style={{ width: 104 }}>
                  <div style={{ position: "relative", width: 104, height: 104, borderRadius: "0.75rem", overflow: "hidden", border: i === 0 ? "2px solid var(--ink)" : "1.5px solid rgba(25,37,36,0.12)", background: "var(--bone)" }}>
                    {imageUrls[i] ? (
                      <img src={imageUrls[i]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(25,37,36,0.15)", borderTopColor: "var(--slate)", animation: "spin 0.7s linear infinite" }} />
                      </div>
                    )}
                    {i === 0 && (
                      <span style={{ position: "absolute", top: 6, left: 6, display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 7px", borderRadius: 9999, background: "var(--ink)", color: "#fff", fontFamily: "Satoshi, sans-serif", fontSize: 10, fontWeight: 700 }}>
                        <Star size={10} fill="#fff" /> Hero
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 6 }}>
                    <button onClick={() => moveImage(i, i - 1)} disabled={i === 0} title="Move left" style={{ width: 26, height: 26, borderRadius: "50%", border: "1.5px solid rgba(25,37,36,0.15)", background: "#fff", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.35 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ArrowLeft size={13} color="var(--ink)" />
                    </button>
                    {i !== 0 && (
                      <button onClick={() => moveImage(i, 0)} title="Set as hero" style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 11, fontWeight: 600, color: "var(--slate)", padding: "0 2px" }}>Hero</button>
                    )}
                    <button onClick={() => moveImage(i, i + 1)} disabled={i === draft.images.length - 1} title="Move right" style={{ width: 26, height: 26, borderRadius: "50%", border: "1.5px solid rgba(25,37,36,0.15)", background: "#fff", cursor: i === draft.images.length - 1 ? "default" : "pointer", opacity: i === draft.images.length - 1 ? 0.35 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ArrowRight size={13} color="var(--ink)" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        <Section title="The Offer">
          {draft.perks.length > 0 && <Row label="Add-ons" value={"• " + draft.perks.join("\n• ")} />}
          <Row label="What you deliver" value={`${totalDeliverables} total deliverables across ${formatCount} format${formatCount !== 1 ? "s" : ""}`} />
          {draft.vibe_tags.length > 0 && <Row label="Vibe" value={draft.vibe_tags.join(", ")} />}
        </Section>

        <Section title="Dates & Deadlines">
          {dateRanges.map((r, i) => (
            <Row key={i} label={dateRanges.length > 1 ? `Collaboration Window ${i + 1}` : "Collaboration Window"} value={formatDateRange(r.startDate, r.endDate)} />
          ))}
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
        <div style={{ border: "1.5px solid rgba(25,37,36,0.12)", borderRadius: "1rem", overflow: "hidden", marginBottom: 24 }}>
          <button
            onClick={() => setFeesOpen(!feesOpen)}
            style={{ width: "100%", padding: "16px 20px", background: "rgba(239,236,233,0.7)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>
              <DollarSign size={16} color="var(--slate)" />
              Host-only: Pricing & Fees
            </div>
            {feesOpen ? <ChevronUp size={16} color="var(--slate)" /> : <ChevronDown size={16} color="var(--slate)" />}
          </button>
          {feesOpen && (
            <div style={{ padding: "16px 20px", background: "rgba(255,251,240,0.7)", borderTop: "1px solid rgba(25,37,36,0.08)" }}>
              <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--slate)", marginBottom: 4 }}>Platform fee</div>
              <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 800, fontSize: 22, color: "var(--ink)", marginBottom: 2 }}>${fee.toFixed(0)}</div>
              <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--slate)", marginBottom: 8, lineHeight: 1.5 }}>
                {draft.compensation_type === "paid" || draft.compensation_type === "hybrid" ? "5% of cash payout (min $25)" : "Flat $25 platform fee"} — <strong>charged only once a collaboration is completed</strong>. You never pay anything upfront to publish a listing.
              </div>
              <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "#b45309", fontWeight: 600 }}>⚠ Creators don't see these fees</div>
            </div>
          )}
        </div>

        {/* Compensation zone warning */}
        {compZone === "amber" && compRange && (
          <div style={{ background: "rgba(212,168,67,0.14)", border: "1px solid rgba(212,168,67,0.35)", borderRadius: "0.875rem", padding: "12px 16px", marginBottom: 16 }}>
            <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, fontWeight: 700, color: "#7a5a10", margin: "0 0 2px" }}>
              This compensation is below the recommended range for this workload
            </p>
            <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12.5, color: "#7a5a10", margin: 0 }}>
              Recommended range: ${Math.round(compRange.low)}–${Math.round(compRange.high)}. You can still publish — this is a guideline, not a requirement.
            </p>
          </div>
        )}
        {compZone === "red" && (
          <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "#b45309", fontWeight: 600, marginBottom: 12 }}>
            This compensation is below the minimum for the selected deliverables and tier. Raise the amount, reduce the deliverables, or add a stay offset to continue.
          </p>
        )}
        {publishError && (
          <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "#b45309", fontWeight: 600, marginBottom: 12 }}>
            {publishError}
          </p>
        )}

        {/* Save draft */}
        {!hasCompensation && (
          <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "#b45309", fontWeight: 600, marginBottom: 12 }}>
            Add a cash compensation amount in the pricing step before publishing — every collaboration must include payment.
          </p>
        )}
        <button
          onClick={() => handlePublish("draft")}
          disabled={publishing || !hasCompensation}
          style={{ width: "100%", padding: "14px 0", marginBottom: 16, background: "none", border: "none", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 15, fontWeight: 600, color: "var(--slate)", textDecoration: "underline" }}
        >
          Save draft
        </button>
      </WizardShell>

      {/* Creator-view full preview overlay */}
      {creatorView && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "var(--bone)", display: "flex", flexDirection: "column" }}>
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: "rgba(239,236,233,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.6)" }}>
            <span style={{ fontFamily: "Satoshi, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--ink)", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Eye size={16} /> Creator preview — this is how creators see your listing
            </span>
            <button onClick={() => setCreatorView(false)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9999, border: "1.5px solid var(--ink)", background: "transparent", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
              <X size={15} /> Close
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <ListingDetail previewListing={previewListing} preview />
          </div>
        </div>
      )}
    </>
  );
}
