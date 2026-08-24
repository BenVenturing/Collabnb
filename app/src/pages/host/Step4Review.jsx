import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Star, Eye, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../../convex/_generated/api";
import WizardShell from "../../components/host/WizardShell";
import { useListingDraft } from "../../contexts/ListingDraftContext";
import { useAuth } from "../../contexts/AuthContext";
import { formatDateRange } from "../../lib/dateUtils";
import ListingDetail from "../ListingDetail";
import { calcMidpoint, calcStayOffset, calcRange, evaluateZone, totalPoints } from "../../../convex/lib/compensationPoints";

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

export default function Step4Review() {
  const { t } = useTranslation('step4Review');
  const TIER_LABELS = t('tierLabels', { returnObjects: true });
  const COMP_LABELS = t('compLabels', { returnObjects: true });
  const LOAD_LABELS = t('loadLabels', { returnObjects: true });
  const navigate = useNavigate();
  const { draft, updateDraft, clearDraft, totalDeliverables, formatCount, combinedDeliverablesList } = useListingDraft();
  const { profile } = useAuth();
  const createListing = useMutation(api.listings.create);
  const updateListing = useMutation(api.listings.update);
  const editingId = typeof window !== 'undefined' ? localStorage.getItem('collabnb_editing_listing_id_v1') : null;
  const [saving, setSaving] = useState(false);
  const [creatorView, setCreatorView] = useState(false);
  const [saveError, setSaveError] = useState("");

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

  async function handleSaveDraft() {
    setSaving(true);
    setSaveError("");
    try {
      if (editingId) {
        await updateListing({ id: editingId, ...listingFields, status: "draft" });
        localStorage.removeItem('collabnb_editing_listing_id_v1');
      } else {
        await createListing({ ...listingFields, status: "draft" });
      }
      clearDraft();
      navigate("/host");
    } catch (err) {
      console.error(err);
      const message = err instanceof ConvexError ? err.data : err?.message;
      setSaveError(typeof message === "string" && message ? message : t('saveFallbackError'));
      setSaving(false);
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
      <WizardShell
        step={4}
        nextDisabled={!hasCompensation || compZone === "red"}
        onNext={() => navigate("/host/listings/create/payment")}
      >
        <h2 style={{ fontFamily: "Cabinet Grotesk, serif", fontWeight: 800, fontSize: 28, color: "var(--ink)", margin: "0 0 6px", display: "flex", alignItems: "center", gap: 10 }}>
          {editingId ? t('heading.edit') : t('heading.review')}
        </h2>
        <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--slate)", margin: "0 0 16px" }}>
          {editingId ? t('subtitle.edit') : t('subtitle.review')}
        </p>

        {/* View as creator toggle */}
        <button
          onClick={() => setCreatorView(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", marginBottom: 28, borderRadius: 9999, border: "1.5px solid var(--ink)", background: "transparent", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}
        >
          <Eye size={16} /> {t('viewAsCreator')}
        </button>

        {/* Header card */}
        <div style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(14px) saturate(130%)", WebkitBackdropFilter: "blur(14px) saturate(130%)", borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.85)", padding: "18px 20px", marginBottom: 16, boxShadow: "0 2px 12px rgba(25,37,36,0.05)" }}>
          <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>{draft.title || "—"}</div>
          <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--slate)", marginTop: 2 }}>{draft.location_city}{draft.location_country ? `, ${draft.location_country}` : ""}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {tierLabel && <span style={{ padding: "5px 12px", borderRadius: 9999, border: "1.5px solid rgba(25,37,36,0.15)", fontFamily: "Satoshi, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{tierLabel}</span>}
            {compLabel && draft.nights && draft.compensation_type !== "paid" && <span style={{ padding: "5px 12px", borderRadius: 9999, background: "var(--mint)", fontFamily: "Satoshi, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{t('nightsComp', { nights: draft.nights, compLabel })}</span>}
            {loadLabel && <span style={{ padding: "5px 12px", borderRadius: 9999, border: "1.5px solid rgba(25,37,36,0.15)", fontFamily: "Satoshi, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{loadLabel}</span>}
          </div>
        </div>

        {/* Photos — order + hero */}
        {draft.images.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ink)", marginBottom: 4 }}>{t('photos.heading')}</div>
            <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--sage)", marginBottom: 12 }}>{t('photos.hint')}</div>
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
                        <Star size={10} fill="#fff" /> {t('photos.hero')}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 6 }}>
                    <button onClick={() => moveImage(i, i - 1)} disabled={i === 0} title={t('photos.moveLeft')} style={{ width: 26, height: 26, borderRadius: "50%", border: "1.5px solid rgba(25,37,36,0.15)", background: "#fff", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.35 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ArrowLeft size={13} color="var(--ink)" />
                    </button>
                    {i !== 0 && (
                      <button onClick={() => moveImage(i, 0)} title={t('photos.setAsHero')} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 11, fontWeight: 600, color: "var(--slate)", padding: "0 2px" }}>{t('photos.hero')}</button>
                    )}
                    <button onClick={() => moveImage(i, i + 1)} disabled={i === draft.images.length - 1} title={t('photos.moveRight')} style={{ width: 26, height: 26, borderRadius: "50%", border: "1.5px solid rgba(25,37,36,0.15)", background: "#fff", cursor: i === draft.images.length - 1 ? "default" : "pointer", opacity: i === draft.images.length - 1 ? 0.35 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ArrowRight size={13} color="var(--ink)" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        <Section title={t('sections.offer')}>
          {draft.perks.length > 0 && <Row label={t('rows.addOns')} value={"• " + draft.perks.join("\n• ")} />}
          <Row label={t('rows.whatYouDeliver')} value={t('rows.whatYouDeliverValue', { total: totalDeliverables, count: formatCount })} />
          {draft.vibe_tags.length > 0 && <Row label={t('rows.vibe')} value={draft.vibe_tags.join(", ")} />}
        </Section>

        <Section title={t('sections.dates')}>
          {dateRanges.map((r, i) => (
            <Row key={i} label={dateRanges.length > 1 ? t('rows.collabWindowN', { n: i + 1 }) : t('rows.collabWindow')} value={formatDateRange(r.startDate, r.endDate)} />
          ))}
          <Row label={t('rows.deliverablesDue')} value={t('rows.deliverablesDueValue', { days: draft.turnaround_days })} />
        </Section>

        <Section title={t('sections.deliverables')}>
          {combinedDeliverablesList.slice(0, 2).map((d, i) => (
            <div key={i} style={{ background: "var(--bone)", borderRadius: "0.625rem", padding: "10px 14px" }}>
              <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>{d.quantity}x {d.type}</div>
              {d.description && <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--slate)", marginTop: 2 }}>{d.description}</div>}
            </div>
          ))}
          {combinedDeliverablesList.length > 2 && (
            <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--sage)", textAlign: "center" }}>{t('moreCount', { count: combinedDeliverablesList.length - 2 })}</div>
          )}
        </Section>

        <Section title={t('sections.thingsToKnow')}>
          <Row label={t('rows.revisionPolicy')} value={draft.revision_policy} />
          <Row label={t('rows.usageRights')} value={draft.usage_rights} />
        </Section>

        {/* Compensation zone warning */}
        {compZone === "amber" && compRange && (
          <div style={{ background: "rgba(212,168,67,0.14)", border: "1px solid rgba(212,168,67,0.35)", borderRadius: "0.875rem", padding: "12px 16px", marginBottom: 16 }}>
            <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, fontWeight: 700, color: "#7a5a10", margin: "0 0 2px" }}>
              {t('compZone.amberTitle')}
            </p>
            <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12.5, color: "#7a5a10", margin: 0 }}>
              {t('compZone.amberBody', { low: Math.round(compRange.low), high: Math.round(compRange.high) })}
            </p>
          </div>
        )}
        {compZone === "red" && (
          <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "#b45309", fontWeight: 600, marginBottom: 12 }}>
            {t('compZone.redBody')}
          </p>
        )}
        {saveError && (
          <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "#b45309", fontWeight: 600, marginBottom: 12 }}>
            {saveError}
          </p>
        )}

        {/* Save draft */}
        {!hasCompensation && (
          <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "#b45309", fontWeight: 600, marginBottom: 12 }}>
            {t('needCompensation')}
          </p>
        )}
        <button
          onClick={handleSaveDraft}
          disabled={saving || !hasCompensation}
          style={{ width: "100%", padding: "14px 0", marginBottom: 16, background: "none", border: "none", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 15, fontWeight: 600, color: "var(--slate)", textDecoration: "underline" }}
        >
          {saving ? t('saving') : t('saveDraft')}
        </button>
      </WizardShell>

      {/* Creator-view full preview overlay */}
      {creatorView && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "var(--bone)", display: "flex", flexDirection: "column" }}>
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: "rgba(239,236,233,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.6)" }}>
            <span style={{ fontFamily: "Satoshi, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--ink)", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Eye size={16} /> {t('creatorPreview.banner')}
            </span>
            <button onClick={() => setCreatorView(false)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9999, border: "1.5px solid var(--ink)", background: "transparent", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
              <X size={15} /> {t('creatorPreview.close')}
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
