import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18nInstance from "../../i18n";
import useSaveListingDraft from "../../hooks/useSaveListingDraft";
import InspirationRail from "./InspirationRail";

const STEPS = [
  { label: "Basics", path: "/host/listings/create/basics" },
  { label: "The Offer", path: "/host/listings/create/offer" },
  { label: "Deliverables", path: "/host/listings/create/deliverables" },
  { label: "Review", path: "/host/listings/create/review" },
  { label: "Payment", path: "/host/listings/create/payment" },
];

// `missing`: [{ target, hint }] — required fields still empty, in page order.
// `target` is the DOM id of the field's wrapper; it gets a red outline once the
// host tries to continue, and the hint / Next button scroll to the first one.
const findTarget = (m) => document.getElementById(m.target) || (m.fallback && document.getElementById(m.fallback));

export default function WizardShell({ step, children, onBack, onNext, nextLabel, nextDisabled = false, nextHint = "", missing = [] }) {
  const { t } = useTranslation('wizardShell');
  const resolvedNextLabel = nextLabel ?? t('next');
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const [showInspiration, setShowInspiration] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => setShowInspiration(media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  const [attempted, setAttempted] = useState(false);
  const missingKey = missing.map((m) => m.target).join("|");
  const hint = missing[0]?.hint || nextHint;
  useEffect(() => {
    if (!attempted) return;
    const els = missing.map(findTarget).filter(Boolean);
    els.forEach((el) => el.classList.add("wizard-missing"));
    return () => els.forEach((el) => el.classList.remove("wizard-missing"));
  }, [attempted, missingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function goToMissing() {
    setAttempted(true);
    const el = missing[0] && findTarget(missing[0]);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const field = el.querySelector("input, textarea, select, button");
    field?.focus({ preventScroll: true });
  }

  function handleNext() {
    if (missing.length) { goToMissing(); return; }
    if (!nextDisabled) onNext?.();
  }
  const blocked = nextDisabled || missing.length > 0;
  const { saving, saveError, saveDraft: handleSaveExit } = useSaveListingDraft(i18nInstance.t('wizardShell:saveFallbackError'));

  function handleBack() {
    if (onBack) { onBack(); return; }
    if (step > 1) navigate(STEPS[step - 2].path);
    else navigate("/host/listings/create");
  }


  return (
    <div className="listing-wizard">
      {/* Top bar */}
      <div className="wizard-header" style={{
        position: "relative", zIndex: 50,
        background: "rgba(239,236,233,0.88)", backdropFilter: "blur(24px) saturate(140%)", WebkitBackdropFilter: "blur(24px) saturate(140%)",
        borderBottom: "1px solid rgba(255,255,255,0.65)",
        padding: "0 24px",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <button aria-label={t('back')} className="wizard-icon-button" onClick={handleBack} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "var(--ink)", fontFamily: "Satoshi, sans-serif", fontSize: 14, fontWeight: 500, padding: "8px 0" }}>
            <ArrowLeft size={18} />
          </button>
          <span style={{ fontFamily: "Satoshi, sans-serif", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
            {t('stepOf', { step, total: STEPS.length })}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button className="wizard-save-button" onClick={handleSaveExit} disabled={saving} style={{ background: "none", border: "none", cursor: saving ? "default" : "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--slate)", textDecoration: "underline", padding: 0, opacity: saving ? 0.6 : 1 }}>
              {saving ? t('saving') : t('saveExit')}
            </button>
            <div
              style={{ position: "relative", display: "flex" }}
              onKeyDown={(event) => { if (event.key === 'Escape') setShowHelp(false); }}
              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setShowHelp(false); }}
            >
              <button className="wizard-icon-button" aria-label={t('helpHeading')} aria-expanded={showHelp} aria-controls="wizard-help" onClick={() => setShowHelp((open) => !open)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sage)", display: "flex", padding: 0 }}>
                <HelpCircle size={18} />
              </button>
              {showHelp && (
                <div id="wizard-help" style={{
                  position: "absolute", top: "calc(100% + 10px)", right: 0, width: 240, zIndex: 60,
                  background: "var(--ink)", color: "#fff", borderRadius: "0.75rem", padding: "12px 14px",
                  fontFamily: "Satoshi, sans-serif", fontSize: 12.5, lineHeight: 1.5,
                  boxShadow: "0 8px 28px rgba(25,37,36,0.28)",
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{t('helpHeading')}</div>
                  {t('helpBodyPrefix')}<strong>{t('saveExit')}</strong>{t('helpBodySuffix')}
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
          <div role="alert" style={{ maxWidth: 680, margin: "0 auto 12px", padding: "10px 14px", borderRadius: "0.75rem", background: "rgba(212,168,67,0.14)", border: "1px solid rgba(212,168,67,0.35)" }}>
            <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12.5, color: "#7a5a10", margin: 0, lineHeight: 1.5 }}>
              {saveError}{t('saveErrorSuffix')}
            </p>
            <button onClick={() => navigate("/host")} style={{ marginTop: 6, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "Satoshi, sans-serif", fontSize: 12.5, fontWeight: 700, color: "#7a5a10", textDecoration: "underline" }}>
              {t('exitWithoutSaving')}
            </button>
          </div>
        )}
      </div>

      {/* Scrollable content — two-panel on desktop (rail left, form right) */}
      <div className="wizard-content" key={step}>
        <div className="wizard-row" style={{ maxWidth: 1500, margin: "0 auto", display: "flex", alignItems: "stretch" }}>
          {/* Inspiration rail — centered in the left half, sticky, follows scroll */}
          {showInspiration && (
            <div className="wizard-rail">
              <InspirationRail />
            </div>
          )}
          {/* Form — centered in the right half */}
          <div className="wizard-form-column">
            <div style={{ width: "100%", maxWidth: 680 }}>
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="wizard-footer" style={{
        position: "relative", zIndex: 50,
        background: "rgba(239,236,233,0.92)", backdropFilter: "blur(24px) saturate(140%)", WebkitBackdropFilter: "blur(24px) saturate(140%)",
        borderTop: "1px solid rgba(255,255,255,0.6)",
        padding: "16px 24px",
      }}>
        {blocked && hint && (
          <div style={{ maxWidth: 680, margin: "0 auto 10px", textAlign: "center" }}>
            {missing.length ? (
              <button type="button" onClick={goToMissing} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 12.5, fontWeight: 600, color: "#b45309", textDecoration: "underline", textUnderlineOffset: 3 }}>
                {hint}
              </button>
            ) : (
              <span style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12.5, fontWeight: 600, color: "#b45309" }}>{hint}</span>
            )}
          </div>
        )}
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 12 }}>
          <button
            onClick={handleBack}
            style={{ flex: 1, padding: "14px 0", borderRadius: 9999, border: "1.5px solid var(--ink)", background: "transparent", fontFamily: "Satoshi, sans-serif", fontSize: 15, fontWeight: 700, color: "var(--ink)", cursor: "pointer" }}
          >
            {t('back')}
          </button>
          <button
            onClick={handleNext}
            className="wizard-next-button"
            disabled={nextDisabled && !missing.length}
            aria-disabled={blocked}
            style={{
              flex: 2, padding: "14px 0", borderRadius: 9999,
              border: "1px solid rgba(255,255,255,0.6)",
              background: blocked
                ? "linear-gradient(135deg, rgba(209,235,219,0.45) 0%, rgba(168,206,184,0.5) 100%)"
                : "linear-gradient(135deg, rgba(193,235,210,0.95) 0%, rgba(138,202,170,0.96) 100%)",
              backdropFilter: "blur(14px) saturate(180%)", WebkitBackdropFilter: "blur(14px) saturate(180%)",
              boxShadow: blocked
                ? "inset 0 1px 0 rgba(255,255,255,0.5)"
                : "0 6px 20px rgba(74,155,127,0.32), inset 0 1px 0 rgba(255,255,255,0.75)",
              fontFamily: "Satoshi, sans-serif", fontSize: 15, fontWeight: 700,
              color: blocked ? "rgba(40,70,58,0.5)" : "#15392a",
              cursor: blocked && !missing.length ? "not-allowed" : "pointer",
              transition: "background 0.2s, box-shadow 0.2s",
            }}
          >
            {resolvedNextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
