import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, DollarSign, CreditCard, Lock } from "lucide-react";
import { useMutation, useQuery, useAction } from "convex/react";
import { useTranslation } from "react-i18next";
import { ConvexError } from "convex/values";
import { api } from "../../../convex/_generated/api";
import WizardShell from "../../components/host/WizardShell";
import Confetti from "../../components/Confetti";
import ReceiptCheckoutOverlay from "../../components/ReceiptCheckoutOverlay";
import { useListingDraft } from "../../contexts/ListingDraftContext";
import { useAuth } from "../../contexts/AuthContext";

function PayoutSwitch({ value, onChange, disabled }) {
  const isPlatform = value !== "in_person";
  return (
    <button
      onClick={() => !disabled && onChange(isPlatform ? "in_person" : "platform")}
      disabled={disabled}
      style={{
        position: "relative", width: 64, height: 34, borderRadius: 9999, border: "none", flexShrink: 0,
        background: isPlatform ? "var(--ink)" : "rgba(212,168,67,0.9)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1, transition: "background 200ms",
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: isPlatform ? 3 : 33, width: 28, height: 28, borderRadius: "50%",
        background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,0.25)", transition: "left 200ms cubic-bezier(0.4,0,0.2,1)",
      }} />
    </button>
  );
}

function InfoCol({ title, text }) {
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 11.5, fontWeight: 700, color: "var(--sage)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{title}</div>
      <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13.5, color: "var(--slate)", lineHeight: 1.6, margin: 0 }}>{text}</p>
    </div>
  );
}

export default function Step5Payment() {
  const { t } = useTranslation('step5Payment');
  const PAYOUT_INFO = t('payoutInfo', { returnObjects: true });
  const navigate = useNavigate();
  const { draft, updateDraft, clearDraft, fee, totalDeliverables, formatCount, combinedDeliverablesList } = useListingDraft();
  const { profile } = useAuth();
  const createListing = useMutation(api.listings.create);
  const updateListing = useMutation(api.listings.update);
  const createHostCardSetupSession = useAction(api.stripe.createHostCardSetupSession);
  const verifyHostCardSetupSession = useAction(api.stripe.verifyHostCardSetupSession);
  const editingId = typeof window !== 'undefined' ? localStorage.getItem('collabnb_editing_listing_id_v1') : null;
  const existingListing = useQuery(api.listings.getById, editingId ? { id: editingId } : "skip");

  const [feesOpen, setFeesOpen] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [startingCardSetup, setStartingCardSetup] = useState(false);
  const [cardJustSaved, setCardJustSaved] = useState(false);
  const [checkoutReceipt, setCheckoutReceipt] = useState(null);

  const isLive = existingListing?.status === "published";
  const payoutHandling = draft.payout_handling || "platform";

  // A draft can always be saved with no card — this only ever gates Publish
  // (also enforced server-side in listings.create/update).
  const needsCard = !!profile && profile.is_admin !== true && !profile.stripe_default_payment_method_id;

  // Handle the return trip from the Stripe card-setup Checkout redirect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cardSetup = params.get('card_setup');
    const sessionId = params.get('session_id');
    if (cardSetup === 'success' && sessionId) {
      verifyHostCardSetupSession({ sessionId })
        .then(({ cardBrand, cardLast4, orderId }) => {
          setCardJustSaved(true);
          setCheckoutReceipt({ type: 'host', orderId, cardBrand, cardLast4 });
        })
        .catch((err) => setPublishError(err?.message || t('errors.cardConfirmFailed')));
      navigate('/host/listings/create/payment', { replace: true });
    } else if (cardSetup === 'cancelled') {
      navigate('/host/listings/create/payment', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dateRanges = (draft.date_ranges?.length
    ? draft.date_ranges
    : [{ startDate: draft.collab_start || "", endDate: draft.collab_end || "" }]
  ).filter((r) => r.startDate && r.endDate).slice(0, 3);

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
      setConfetti(true);
      setTimeout(() => { setConfetti(false); clearDraft(); navigate("/host"); }, 3800);
    } catch (err) {
      console.error(err);
      const message = err instanceof ConvexError ? err.data : err?.message;
      setPublishError(typeof message === "string" && message ? message : t('errors.publishFailed'));
      setPublishing(false);
    }
  }

  async function handlePublishClick() {
    if (needsCard) {
      setStartingCardSetup(true);
      setPublishError("");
      try {
        const base = `${window.location.origin}/host/listings/create/payment`;
        const result = await createHostCardSetupSession({
          successUrl: `${base}?card_setup=success&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${base}?card_setup=cancelled`,
        });
        if (result?.url) window.location.href = result.url;
      } catch (err) {
        setPublishError(err?.message || t('errors.cardSetupFailed'));
        setStartingCardSetup(false);
      }
      return;
    }
    handlePublish("published");
  }

  const info = PAYOUT_INFO[payoutHandling === "in_person" ? "in_person" : "platform"];

  return (
    <>
      <Confetti show={confetti} />
      <ReceiptCheckoutOverlay receipt={checkoutReceipt} onClose={() => setCheckoutReceipt(null)} />
      <WizardShell
        step={5}
        nextLabel={publishing ? t('nextLabel.publishing') : startingCardSetup ? t('nextLabel.redirecting') : needsCard ? t('nextLabel.addCard') : isLive ? t('nextLabel.saveChanges') : t('nextLabel.publish')}
        nextDisabled={publishing || startingCardSetup}
        onNext={handlePublishClick}
      >
        <h2 style={{ fontFamily: "Cabinet Grotesk, serif", fontWeight: 800, fontSize: 28, color: "var(--ink)", margin: "0 0 6px" }}>
          {t('heading')}
        </h2>
        <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--slate)", margin: "0 0 24px" }}>
          {t('subtitle')}
        </p>

        {isLive && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(25,37,36,0.05)", border: "1px solid rgba(25,37,36,0.1)", borderRadius: "0.875rem", padding: "12px 16px", marginBottom: 20 }}>
            <Lock size={15} color="var(--slate)" />
            <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12.5, color: "var(--slate)", margin: 0 }}>
              {t('lockedBanner')}
            </p>
          </div>
        )}

        {/* Payout switch */}
        <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(14px) saturate(130%)", WebkitBackdropFilter: "blur(14px) saturate(130%)", borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.88)", padding: "22px", marginBottom: 18, boxShadow: "0 2px 12px rgba(25,37,36,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <PayoutSwitch
              value={payoutHandling}
              disabled={isLive}
              onChange={(v) => updateDraft({ payout_handling: v })}
            />
            <div>
              <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 800, fontSize: 17, color: "var(--ink)" }}>
                {payoutHandling === "in_person" ? t('payoutSwitch.inPerson') : t('payoutSwitch.platform')}
              </div>
              {payoutHandling !== "in_person" && (
                <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 11, fontWeight: 700, color: "#2d6a4f", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>
                  {t('payoutSwitch.recommended')}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, paddingTop: 18, borderTop: "1px solid rgba(25,37,36,0.08)" }}>
            <InfoCol title={t('infoCol.forHost')} text={info.host} />
            <InfoCol title={t('infoCol.forCreator')} text={info.creator} />
          </div>
        </div>

        {/* Host-only fees */}
        <div style={{ border: "1.5px solid rgba(25,37,36,0.12)", borderRadius: "1rem", overflow: "hidden", marginBottom: 20 }}>
          <button
            onClick={() => setFeesOpen(!feesOpen)}
            style={{ width: "100%", padding: "16px 20px", background: "rgba(239,236,233,0.7)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>
              <DollarSign size={16} color="var(--slate)" />
              {t('fees.heading')}
            </div>
            {feesOpen ? <ChevronUp size={16} color="var(--slate)" /> : <ChevronDown size={16} color="var(--slate)" />}
          </button>
          {feesOpen && (
            <div style={{ padding: "16px 20px", background: "rgba(255,251,240,0.7)", borderTop: "1px solid rgba(25,37,36,0.08)" }}>
              <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--slate)", marginBottom: 4 }}>{t('fees.platformFee')}</div>
              <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 800, fontSize: 22, color: "var(--ink)", marginBottom: 2 }}>${fee.toFixed(0)}</div>
              <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--slate)", marginBottom: 8, lineHeight: 1.5 }}>
                {draft.compensation_type === "paid" || draft.compensation_type === "hybrid" ? t('fees.percentDesc') : t('fees.flatDesc')} — <strong>{t('fees.chargedOnlyOnce')}</strong>{t('fees.chargedNoteSuffix')}
              </div>
              <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "#b45309", fontWeight: 600 }}>{t('fees.hiddenNote')}</div>
            </div>
          )}
        </div>

        {publishError && (
          <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "#b45309", fontWeight: 600, marginBottom: 12 }}>
            {publishError}
          </p>
        )}
        {cardJustSaved && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--mint)", borderRadius: "0.875rem", padding: "12px 16px", marginBottom: 12 }}>
            <CreditCard size={16} color="var(--ink)" />
            <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--ink)", fontWeight: 600, margin: 0 }}>
              {t('cardSaved')}
            </p>
          </div>
        )}
        {needsCard && !cardJustSaved && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(212,168,67,0.14)", border: "1px solid rgba(212,168,67,0.35)", borderRadius: "0.875rem", padding: "12px 16px", marginBottom: 12 }}>
            <CreditCard size={16} color="#7a5a10" />
            <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "#7a5a10", margin: 0 }}>
              {t('needsCardNote')}
            </p>
          </div>
        )}
      </WizardShell>
    </>
  );
}
