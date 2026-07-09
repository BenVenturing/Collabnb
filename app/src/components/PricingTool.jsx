import { useState, useMemo, useEffect } from "react";
import {
  TIER_IDS, TIERS, DELIVERABLE_TYPES, DELIVERABLE_LABELS, DELIVERABLE_POINTS,
  PRESET_PACKAGES, LOAD_TIER_LABELS,
  totalPoints, calcMidpoint, calcRange, calcStayOffset, calcHardFloor, calcWarnThreshold,
  evaluateZone, computeLoadTier, isDeliverableAllowedForTier, findPackagesForBudget,
} from "../../convex/lib/compensationPoints";

// Range bar: a single smooth gradient from very light green to deep green.
// The hard floor, caution threshold, and recommended range stay labelled beneath.
const ZONE_COPY = {
  red: "Below the minimum for this workload — this can't be published as-is.",
  amber: "Below the recommended range for this workload.",
  green: "Within the recommended range.",
};

function fmt(n) {
  return `$${Math.round(n).toLocaleString()}`;
}

// Inline icons (no external icon dependency) so this component can be reused
// across builds — including the marketing pricing app — without extra installs.
function Plus({ size = 12, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function Minus({ size = 12, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function HelpCircle({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// Small "?" popover: a simple table of deliverable increments, their point
// values, and which creator tiers can produce each. Kept intentionally compact.
export function PointsHelpTable({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "rgba(25,37,36,0.4)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%", maxWidth: 420, borderRadius: 14,
          background: "var(--mint)", border: "1px solid rgba(25,37,36,0.12)",
          boxShadow: "0 12px 40px rgba(25,37,36,0.2)", padding: 18, fontFamily: "var(--font-blog-body)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: "var(--font-blog-display)", fontWeight: 600, fontSize: 15, color: "var(--ink)" }}>
            Points by deliverable & tier
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "rgba(25,37,36,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--slate)" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: "var(--sage)", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10 }}>
              <th style={{ textAlign: "left", fontWeight: 700, padding: "6px 4px", borderBottom: "1px solid rgba(25,37,36,0.12)" }}>Deliverable</th>
              <th style={{ textAlign: "center", fontWeight: 700, padding: "6px 4px", borderBottom: "1px solid rgba(25,37,36,0.12)" }}>Pts</th>
              <th style={{ textAlign: "left", fontWeight: 700, padding: "6px 4px", borderBottom: "1px solid rgba(25,37,36,0.12)" }}>Who can produce</th>
            </tr>
          </thead>
          <tbody>
            {DELIVERABLE_TYPES.map((type) => {
              const allowed = TIER_IDS.filter((id) => isDeliverableAllowedForTier(type, id)).map((id) => TIERS[id].label);
              return (
                <tr key={type} style={{ color: "var(--ink)" }}>
                  <td style={{ padding: "7px 4px", fontWeight: 600, borderBottom: "1px solid rgba(25,37,36,0.07)" }}>{DELIVERABLE_LABELS[type]}</td>
                  <td style={{ padding: "7px 4px", textAlign: "center", fontWeight: 700, borderBottom: "1px solid rgba(25,37,36,0.07)" }}>{DELIVERABLE_POINTS[type]}</td>
                  <td style={{ padding: "7px 4px", fontSize: 11, color: "var(--slate)", borderBottom: "1px solid rgba(25,37,36,0.07)" }}>
                    {allowed.length === TIER_IDS.length ? "All tiers" : allowed.join(", ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={{ fontSize: 11, color: "var(--sage)", marginTop: 10, lineHeight: 1.45 }}>
          Cash = points × $/pt (set by tier) × complexity. Hybrid stays offset part of the cash.
        </p>
      </div>
    </div>
  );
}

// Self-contained "?" trigger + popover — drops next to the modal close "x".
export function PointsHelpButton({ style }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="How points work"
        title="How points work"
        style={{
          width: 32, height: 32, borderRadius: "50%", border: "none",
          background: "rgba(25,37,36,0.07)", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", ...style,
        }}
      >
        <HelpCircle size={16} color="var(--slate)" />
      </button>
      <PointsHelpTable open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function Pill({ active, onClick, children, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 16px",
        borderRadius: 9999,
        border: active ? "1.5px solid var(--ink)" : "1.5px solid var(--sage)",
        background: active ? "var(--ink)" : "rgba(255,255,255,0.55)",
        color: active ? "var(--mint)" : "var(--slate)",
        fontFamily: "var(--font-blog-body)",
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "all 150ms",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function SegmentedToggle({ options, value, onChange }) {
  return (
    <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 9999, background: "rgba(25,37,36,0.06)" }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: "7px 16px",
            borderRadius: 9999,
            border: "none",
            background: value === opt.value ? "var(--ink)" : "transparent",
            color: value === opt.value ? "var(--mint)" : "var(--slate)",
            fontFamily: "var(--font-blog-body)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 150ms",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Stepper({ label, points, quantity, onChange, disabled, step = 1, min = 0, renderValue }) {
  const dec = () => onChange(Math.max(min, quantity - step));
  const inc = () => onChange(quantity + step);
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
      padding: "10px 12px", borderRadius: 10,
      background: disabled ? "rgba(25,37,36,0.03)" : "rgba(255,255,255,0.6)",
      opacity: disabled ? 0.4 : 1,
    }}>
      <div>
        <div style={{ fontFamily: "var(--font-blog-body)", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{label}</div>
        {points > 0 && (
          <div style={{ fontFamily: "var(--font-blog-body)", fontSize: 11, color: "var(--sage)" }}>{points} pt{points !== 1 ? "s" : ""} each</div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={dec}
          disabled={disabled || quantity <= min}
          style={{ width: 26, height: 26, borderRadius: "50%", border: "1.5px solid var(--sage)", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "not-allowed" : "pointer" }}
        >
          <Minus size={12} color="var(--slate)" />
        </button>
        <span style={{ minWidth: 18, textAlign: "center", fontFamily: "var(--font-blog-body)", fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{renderValue ? renderValue(quantity) : quantity}</span>
        <button
          onClick={inc}
          disabled={disabled}
          style={{ width: 26, height: 26, borderRadius: "50%", border: "1.5px solid var(--ink)", background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "not-allowed" : "pointer" }}
        >
          <Plus size={12} color="var(--mint)" />
        </button>
      </div>
    </div>
  );
}

// Smooth light-green → dark-green scale. The hard floor, caution threshold, and
// recommended range stay labelled, a median pin marks the recommended amount
// (rounded), and the cash marker tracks wherever the host has landed.
function ThreeZoneScale({ hardFloor, warnThreshold, range, cashAmount, midpoint }) {
  const upperBound = Math.max(range.high * 1.3, (cashAmount || 0) * 1.15, hardFloor * 2, 100);
  const pct = (n) => Math.max(0, Math.min(100, (n / upperBound) * 100));
  const medianP = pct(midpoint);
  const markerLeft = cashAmount ? pct(cashAmount) : null;

  const recommended = Math.round(midpoint / 10) * 10;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ position: "relative", height: 10, borderRadius: 9999, overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to right, #DCEFE3 0%, #6FAE8E 45%, #234A3A 78%, #17352A 100%)",
        }} />
        {markerLeft !== null && (
          <div style={{
            position: "absolute", left: `${markerLeft}%`, top: -3, width: 3, height: 16,
            background: "var(--mint)", borderRadius: 2, transform: "translateX(-50%)",
            boxShadow: "0 0 0 2px rgba(255,255,255,0.95)",
          }} />
        )}
      </div>

      {/* median pin sits above the bar at the recommended amount */}
      <div style={{ position: "relative", height: 0 }}>
        <div style={{
          position: "absolute", left: `${medianP}%`, top: -22, transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          <span style={{ fontFamily: "var(--font-blog-body)", fontSize: 9.5, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap" }}>
            {fmt(recommended)}
          </span>
          <div style={{ width: 2, height: 14, background: "var(--ink)", marginTop: 1, borderRadius: 2 }} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontFamily: "var(--font-blog-body)", fontSize: 10.5, color: "var(--sage)" }}>
        <span>Minimal {fmt(hardFloor)}</span>
        <span>Caution {fmt(warnThreshold)}</span>
        <span>Recommended {fmt(range.low)}–{fmt(range.high)}</span>
      </div>
    </div>
  );
}

function PresetCard({ preset, points, midpoint, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left", padding: "12px 14px", borderRadius: 12,
        border: active ? "1.5px solid var(--ink)" : "1px solid rgba(25,37,36,0.1)",
        background: active ? "rgba(209,235,219,0.45)" : "rgba(255,255,255,0.6)",
        cursor: "pointer", transition: "all 150ms",
      }}
    >
      <div style={{ fontFamily: "var(--font-blog-body)", fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>{preset.name}</div>
      <div style={{ fontFamily: "var(--font-blog-body)", fontSize: 11.5, color: "var(--sage)", marginTop: 2 }}>
        midrange {fmt(midpoint)}
      </div>
    </button>
  );
}

export default function PricingTool({ mode = "sandbox", initialValue, onChange }) {
  const [entryMode, setEntryMode] = useState("deliverables");
  const [tierId, setTierId] = useState(initialValue?.tierId || "ugc_pro");
  const [compensationType, setCompensationType] = useState(initialValue?.compensationType || "paid");
  const [complexity, setComplexity] = useState(initialValue?.complexity || "standard");
  const [stayValue, setStayValue] = useState(initialValue?.stayValue || 0);
  const [deliverables, setDeliverables] = useState(initialValue?.deliverables?.length ? initialValue.deliverables : []);
  const [cashAmount, setCashAmount] = useState(initialValue?.cashAmount || 0);
  const [budget, setBudget] = useState(250);
  const [selectedPreset, setSelectedPreset] = useState(null);

  const tier = TIERS[tierId];
  const track = tier?.track;

  const quantities = useMemo(() => {
    const map = {};
    DELIVERABLE_TYPES.forEach((t) => { map[t] = 0; });
    deliverables.forEach((d) => { map[d.type] = d.quantity; });
    return map;
  }, [deliverables]);

  function setQuantity(type, quantity) {
    setSelectedPreset(null);
    setDeliverables((prev) => {
      const next = prev.filter((d) => d.type !== type);
      if (quantity > 0) next.push({ type, quantity });
      return next;
    });
  }

  function applyPreset(preset) {
    setSelectedPreset(preset.name);
    setDeliverables(preset.deliverables.map((d) => ({ ...d })));
    setEntryMode("deliverables");
  }

  const points = totalPoints(deliverables);
  const midpoint = calcMidpoint(points, tierId, complexity);
  const range = calcRange(midpoint);
  const stayOffset = compensationType === "hybrid" ? calcStayOffset(stayValue, tierId, midpoint) : 0;
  const hardFloor = calcHardFloor(midpoint, stayOffset);
  const warnThreshold = calcWarnThreshold(midpoint, stayOffset);
  const zone = points > 0 ? evaluateZone(cashAmount, midpoint, stayOffset) : null;
  const loadTier = computeLoadTier(deliverables);

  // Budget mode
  const effectiveStayOffset = compensationType === "hybrid" ? calcStayOffset(stayValue, tierId, budget) : 0;
  const effectiveBudget = budget + effectiveStayOffset;
  const { fitting, stretch } = useMemo(
    () => findPackagesForBudget({ budget: effectiveBudget, tierId, complexity, track }),
    [effectiveBudget, tierId, complexity, track]
  );

  // Push committed fields up to the listing draft (no-op in sandbox mode).
  useEffect(() => {
    if (mode !== "listing" || !onChange) return;
    onChange({
      creator_tier: tierId,
      compensation_type: compensationType,
      complexity,
      stay_value: compensationType === "hybrid" ? stayValue : undefined,
      cash_amount: cashAmount,
      deliverables,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tierId, compensationType, complexity, stayValue, cashAmount, deliverables]);

  const relevantPresets = PRESET_PACKAGES.filter((p) => p.track === track || p.track === "custom");

  return (
    <div className="glass-card" style={{ padding: "22px 22px 26px", fontFamily: "var(--font-blog-body)" }}>
      <h3 style={{ fontFamily: "var(--font-blog-display)", fontWeight: 600, fontSize: 20, color: "var(--ink)", margin: "0 0 4px" }}>
        What does a collab cost?
      </h3>
      <p style={{ fontSize: 13, color: "var(--slate)", margin: "0 0 18px", lineHeight: 1.5 }}>
        Pricing is derived from deliverable points, creator tier, and workload complexity — never a guess.
      </p>

      {/* Entry mode */}
      <div style={{ marginBottom: 18 }}>
        <SegmentedToggle
          value={entryMode}
          onChange={setEntryMode}
          options={[
            { value: "deliverables", label: "I know my deliverables" },
            { value: "budget", label: "I have a budget" },
          ]}
        />
      </div>

      {/* Tier selector */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--sage)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Creator tier</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {TIER_IDS.map((id) => (
            <Pill key={id} active={tierId === id} onClick={() => setTierId(id)}>{TIERS[id].label}</Pill>
          ))}
        </div>
      </div>

      {/* Compensation type + stay value */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--sage)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Compensation type</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Pill active={compensationType === "paid"} onClick={() => setCompensationType("paid")}>Paid</Pill>
          <Pill active={compensationType === "hybrid"} onClick={() => setCompensationType("hybrid")}>Hybrid (stay + cash)</Pill>
          {compensationType === "hybrid" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
              <span style={{ fontSize: 12.5, color: "var(--slate)" }}>Declared stay value</span>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--sage)" }}>$</span>
                <input
                  type="number"
                  min={0}
                  value={stayValue || ""}
                  onChange={(e) => setStayValue(Number(e.target.value) || 0)}
                  style={{ width: 90, padding: "7px 10px 7px 20px", borderRadius: 8, border: "1.5px solid rgba(25,37,36,0.15)", fontFamily: "var(--font-blog-body)", fontSize: 13, color: "var(--ink)", outline: "none" }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Complexity */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--sage)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Complexity</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Pill active={complexity === "standard"} onClick={() => setComplexity("standard")}>Standard</Pill>
          <Pill active={complexity === "complex"} onClick={() => setComplexity("complex")}>Complex (shot list, drone, multi-location, exclusivity)</Pill>
        </div>
      </div>

      {entryMode === "budget" ? (
        <div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--sage)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Cash budget</div>
            <div style={{ position: "relative", maxWidth: 160 }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--sage)" }}>$</span>
              <input
                type="number"
                min={0}
                value={budget || ""}
                onChange={(e) => setBudget(Number(e.target.value) || 0)}
                style={{ width: "100%", padding: "10px 12px 10px 22px", borderRadius: 10, border: "1.5px solid rgba(25,37,36,0.15)", fontFamily: "var(--font-blog-body)", fontSize: 14, fontWeight: 600, color: "var(--ink)", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            {compensationType === "hybrid" && effectiveStayOffset > 0 && (
              <p style={{ fontSize: 11.5, color: "var(--sage)", marginTop: 6 }}>
                Effective budget: {fmt(budget)} cash + {fmt(effectiveStayOffset)} stay offset = <strong style={{ color: "var(--ink)" }}>{fmt(effectiveBudget)}</strong>
              </p>
            )}
          </div>

          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--sage)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Packages that fit</div>
          {fitting.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--sage)" }}>No preset fits this budget yet — try raising it or switching tiers.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
              {fitting.map((p) => (
                <PresetCard key={p.name} preset={p} points={p.points} midpoint={p.midpoint} active={selectedPreset === p.name} onClick={() => applyPreset(p)} />
              ))}
            </div>
          )}
          {stretch && (
            <>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--sage)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Stretch option (within 120% of budget)</div>
              <PresetCard preset={stretch} points={stretch.points} midpoint={stretch.midpoint} active={selectedPreset === stretch.name} onClick={() => applyPreset(stretch)} />
            </>
          )}
        </div>
      ) : (
        <div>
          {/* Presets */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--sage)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Presets</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
              {relevantPresets.map((p) => {
                const pPoints = totalPoints(p.deliverables);
                const pMidpoint = calcMidpoint(pPoints, tierId, complexity);
                return (
                  <PresetCard key={p.name} preset={p} points={pPoints} midpoint={pMidpoint} active={selectedPreset === p.name} onClick={() => applyPreset(p)} />
                );
              })}
            </div>
          </div>

          {/* Deliverable steppers */}
          <div style={{ background: "rgba(209,235,219,0.35)", borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--sage)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Build your own</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--slate)" }}>{loadTier ? LOAD_TIER_LABELS[loadTier] : "—"} load</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
              {DELIVERABLE_TYPES.map((type) => (
                <Stepper
                  key={type}
                  label={DELIVERABLE_LABELS[type]}
                  points={DELIVERABLE_POINTS[type] ?? 0}
                  quantity={quantities[type]}
                  disabled={!isDeliverableAllowedForTier(type, tierId)}
                  onChange={(q) => setQuantity(type, q)}
                />
              ))}
            </div>
          </div>

          {/* Cash amount + math */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--sage)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Cash compensation</div>
            <div style={{ position: "relative", maxWidth: 160 }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--sage)" }}>$</span>
              <input
                type="number"
                min={0}
                step={10}
                value={cashAmount || ""}
                onChange={(e) => setCashAmount(Number(e.target.value) || 0)}
                style={{ width: "100%", padding: "10px 12px 10px 22px", borderRadius: 10, border: "1.5px solid rgba(25,37,36,0.15)", fontFamily: "var(--font-blog-body)", fontSize: 14, fontWeight: 600, color: "var(--ink)", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {points > 0 && (
            <>
              <div style={{ fontFamily: "var(--font-blog-display)", fontWeight: 600, fontSize: 28, color: "var(--ink)", margin: "10px 0 2px" }}>
                {fmt(range.low)}–{fmt(range.high)}
              </div>
              <p style={{ fontSize: 12, color: "var(--slate)", margin: "0 0 4px" }}>
                {points} pts × {fmt(tier.ratePerPoint)}/pt ({tier.label}) × {complexity === "complex" ? "1.25 complex" : "1.0 standard"} = {fmt(midpoint)} midrange
                {stayOffset > 0 && <> · stay offset {fmt(stayOffset)}</>}
              </p>

              <ThreeZoneScale hardFloor={hardFloor} warnThreshold={warnThreshold} range={range} cashAmount={cashAmount} midpoint={midpoint} />

              {zone && zone !== "green" && (
                <p style={{ marginTop: 10, fontSize: 11, color: "var(--sage)", lineHeight: 1.4 }}>
                  {ZONE_COPY[zone]}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
