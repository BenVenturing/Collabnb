import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useListingDraft } from "../../contexts/ListingDraftContext";
import { useAuth } from "../../contexts/AuthContext";
import InspirationRail from "./InspirationRail";

const STEPS = [
  { label: "Basics", path: "/host/listings/create/basics" },
  { label: "The Offer", path: "/host/listings/create/offer" },
  { label: "Deliverables", path: "/host/listings/create/deliverables" },
  { label: "Review", path: "/host/listings/create/review" },
  { label: "Payment", path: "/host/listings/create/payment" },
];

export default function WizardShell({ step, children, onBack, onNext, nextLabel = "Next", nextDisabled = false, nextHint = "" }) {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const { draft, combinedDeliverablesList, totalDeliverables } = useListingDraft();
  const { profile } = useAuth();
  const createListing = useMutation(api.listings.create);
  const updateListing = useMutation(api.listings.update);

  function handleBack() {
    if (onBack) { onBack(); return; }
    if (step > 1) navigate(STEPS[step - 2].path);
    else navigate("/host/listings/create");
  }

  // "Every change is saved to this browser" (localStorage) is not the same as
  // a real draft listing the host can find again on their dashboard — this
  // actually persists the current draft to Convex (status: "draft") before
  // leaving. Mirrors the field mapping Step4Review uses to publish.
  async function handleSaveExit() {
    setSaving(true);
    setSaveError("");
    try {
      const editingId = localStorage.getItem("collabnb_editing_listing_id_v1");
      const dateRanges = (draft.date_ranges?.length
        ? draft.date_ranges
        : [{ startDate: draft.collab_start || "", endDate: draft.collab_end || "" }]
      ).filter((r) => r.startDate && r.endDate).slice(0, 3);

      const fields = {
        title: draft.title,
        location: `${draft.location_city}, ${draft.location_country}`,
        location_city: draft.location_city,
        location_country: draft.location_country,
        lat: typeof draft.lat === "number" ? draft.lat : undefined,
        lng: typeof draft.lng === "number" ? draft.lng : undefined,
        host_id: profile?._id || profile?.id,
        host_name: profile?.full_name,
        property_url: draft.property_url,
        collaboration_brief: draft.collaboration_brief,
        compensation_type: draft.compensation_type,
        cash_amount: draft.cash_amount || undefined,
        payout_handling: draft.payout_handling || undefined,
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
        affiliate_percent: draft.affiliate_percent === "" ? undefined : draft.affiliate_percent,
        collab_start: dateRanges[0]?.startDate || draft.collab_start,
        collab_end: dateRanges[0]?.endDate || draft.collab_end,
        date_ranges: dateRanges.length ? dateRanges : undefined,
        turnaround_days: draft.turnaround_days === "" ? 0 : draft.turnaround_days,
        deliverables_list: combinedDeliverablesList,
        deliverable_count: totalDeliverables,
        revision_policy: draft.revision_policy,
        usage_rights: draft.usage_rights,
        status: "draft",
      };

      if (editingId) {
        await updateListing({ id: editingId, ...fields });
      } else {
        const newId = await createListing(fields);
        localStorage.setItem("collabnb_editing_listing_id_v1", String(newId));
      }
      navigate("/host");
    } catch (err) {
      const message = err instanceof ConvexError ? err.data : err?.message;
      setSaveError(typeof message === "string" && message ? message : "Couldn't save your draft — try again.");
      setSaving(false);
    }
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(239,236,233,0.88)", backdropFilter: "blur(24px) saturate(140%)", WebkitBackdropFilter: "blur(24px) saturate(140%)",
        borderBottom: "1px solid rgba(255,255,255,0.65)",
        padding: "0 24px",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <button onClick={handleBack} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "var(--ink)", fontFamily: "Satoshi, sans-serif", fontSize: 14, fontWeight: 500, padding: "8px 0" }}>
            <ArrowLeft size={18} />
          </button>
          <span style={{ fontFamily: "Satoshi, sans-serif", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
            Step {step} of {STEPS.length}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={handleSaveExit} disabled={saving} style={{ background: "none", border: "none", cursor: saving ? "default" : "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--slate)", textDecoration: "underline", padding: 0, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving..." : "Save & exit"}
            </button>
            <div
              style={{ position: "relative", display: "flex" }}
              onMouseEnter={() => setShowHelp(true)}
              onMouseLeave={() => setShowHelp(false)}
            >
              <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sage)", display: "flex", padding: 0 }}>
                <HelpCircle size={18} />
              </button>
              {showHelp && (
                <div style={{
                  position: "absolute", top: "calc(100% + 10px)", right: 0, width: 240, zIndex: 60,
                  background: "var(--ink)", color: "#fff", borderRadius: "0.75rem", padding: "12px 14px",
                  fontFamily: "Satoshi, sans-serif", fontSize: 12.5, lineHeight: 1.5,
                  boxShadow: "0 8px 28px rgba(25,37,36,0.28)",
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Your progress is saved</div>
                  Every change is saved to this browser automatically. Hit <strong>Save &amp; exit</strong> to head back to your dashboard — your draft will be waiting exactly where you left off.
                  <span style={{ position: "absolute", top: -5, right: 14, width: 10, height: 10, background: "var(--ink)", transform: "rotate(45deg)" }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 12, display: "flex", gap: 6 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 9999, background: i < step ? "var(--ink)" : "rgba(25,37,36,0.15)", transition: "background 0.3s" }} />
          ))}
        </div>

        {saveError && (
          <div style={{ maxWidth: 680, margin: "0 auto 12px", padding: "10px 14px", borderRadius: "0.75rem", background: "rgba(212,168,67,0.14)", border: "1px solid rgba(212,168,67,0.35)" }}>
            <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12.5, color: "#7a5a10", margin: 0, lineHeight: 1.5 }}>
              {saveError} Your progress is still kept in this browser — come back and finish filling it in, or exit anyway from here.
            </p>
            <button onClick={() => navigate("/host")} style={{ marginTop: 6, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "Satoshi, sans-serif", fontSize: 12.5, fontWeight: 700, color: "#7a5a10", textDecoration: "underline" }}>
              Exit without saving as a draft
            </button>
          </div>
        )}
      </div>

      {/* Scrollable content — two-panel on desktop (rail left, form right) */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px 120px", position: "relative", zIndex: 1 }}>
        <div className="wizard-row" style={{ maxWidth: 1500, margin: "0 auto", display: "flex", alignItems: "stretch" }}>
          {/* Inspiration rail — centered in the left half, sticky, follows scroll */}
          <div className="wizard-rail" style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center" }}>
            <InspirationRail />
          </div>
          {/* Form — centered in the right half */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center" }}>
            <div style={{ width: "100%", maxWidth: 680 }}>
              {children}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .wizard-rail { display: none; }
        @media (min-width: 1024px) { .wizard-rail { display: block; } }
      `}</style>

      {/* Bottom action bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(239,236,233,0.92)", backdropFilter: "blur(24px) saturate(140%)", WebkitBackdropFilter: "blur(24px) saturate(140%)",
        borderTop: "1px solid rgba(255,255,255,0.6)",
        padding: "16px 24px",
      }}>
        {nextDisabled && nextHint && (
          <div style={{ maxWidth: 680, margin: "0 auto 10px", fontFamily: "Satoshi, sans-serif", fontSize: 12.5, fontWeight: 600, color: "#b45309", textAlign: "center" }}>
            {nextHint}
          </div>
        )}
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
            style={{
              flex: 2, padding: "14px 0", borderRadius: 9999,
              border: "1px solid rgba(255,255,255,0.6)",
              background: nextDisabled
                ? "linear-gradient(135deg, rgba(209,235,219,0.45) 0%, rgba(168,206,184,0.5) 100%)"
                : "linear-gradient(135deg, rgba(193,235,210,0.95) 0%, rgba(138,202,170,0.96) 100%)",
              backdropFilter: "blur(14px) saturate(180%)", WebkitBackdropFilter: "blur(14px) saturate(180%)",
              boxShadow: nextDisabled
                ? "inset 0 1px 0 rgba(255,255,255,0.5)"
                : "0 6px 20px rgba(74,155,127,0.32), inset 0 1px 0 rgba(255,255,255,0.75)",
              fontFamily: "Satoshi, sans-serif", fontSize: 15, fontWeight: 700,
              color: nextDisabled ? "rgba(40,70,58,0.5)" : "#15392a",
              cursor: nextDisabled ? "not-allowed" : "pointer",
              transition: "background 0.2s, box-shadow 0.2s",
            }}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
