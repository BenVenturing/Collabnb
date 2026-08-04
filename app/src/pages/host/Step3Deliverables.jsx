import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Minus, Pencil, X, Copy } from "lucide-react";
import WizardShell from "../../components/host/WizardShell";
import { useListingDraft } from "../../contexts/ListingDraftContext";
import ThemedDateRangePicker from "../../components/host/ThemedDateRangePicker";
import PricingTool from "../../components/PricingTool";

function Label({ children, required }) {
  return <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ink)", marginBottom: 6 }}>{children}{required && <span style={{ color: "#e04" }}> *</span>}</div>;
}
function Input({ value, onChange, onBlur, placeholder, type = "text" }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} style={{ width: "100%", padding: "12px 16px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.875rem", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none", boxSizing: "border-box" }} />;
}

const LOAD_LABELS = { light: "light", moderate: "moderate", heavy: "heavy", custom: "custom campaign" };

export default function Step3Deliverables() {
  const navigate = useNavigate();
  const { draft, updateDraft, totalDeliverables, formatCount, combinedDeliverablesList, autoDeliverableCount, DEFAULT_USAGE_RIGHTS } = useListingDraft();

  const [customQty, setCustomQty] = useState(1);
  const [customType, setCustomType] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customUsage, setCustomUsage] = useState(draft.usage_rights || DEFAULT_USAGE_RIGHTS);
  const [editIdx, setEditIdx] = useState(null);
  // Set instead of editIdx when editing an auto (cost-calculator) card — only
  // its usage rights are editable, stored as a per-type override rather than
  // turning it into a separate custom deliverable.
  const [editingAutoType, setEditingAutoType] = useState(null);

  const MAX_DATE_RANGES = 3;
  const dateRanges = draft.date_ranges?.length
    ? draft.date_ranges
    : [{ startDate: draft.collab_start || "", endDate: draft.collab_end || "" }];
  const completeRanges = dateRanges.filter((r) => r.startDate && r.endDate);

  // First range mirrors into collab_start/collab_end for existing consumers (contracts, search)
  function commitRanges(next) {
    updateDraft({
      date_ranges: next,
      collab_start: next[0]?.startDate || "",
      collab_end: next[0]?.endDate || "",
    });
  }
  function setRange(i, startDate, endDate) {
    commitRanges(dateRanges.map((r, idx) => (idx === i ? { startDate, endDate } : r)));
  }
  function addRange() {
    if (dateRanges.length >= MAX_DATE_RANGES) return;
    commitRanges([...dateRanges, { startDate: "", endDate: "" }]);
  }
  function removeRange(i) {
    commitRanges(dateRanges.filter((_, idx) => idx !== i));
  }

  const hasCompensation = (draft.compensation_type === "paid" || draft.compensation_type === "hybrid") && draft.cash_amount > 0;
  const hasDeliverables = draft.deliverables?.length > 0 || draft.deliverables_list.length > 0;
  const canProceed = completeRanges.length > 0 && hasDeliverables && draft.creator_tier && hasCompensation;

  // Tells the host exactly what's missing when Next is disabled, instead of
  // the button silently doing nothing.
  const nextHint = !draft.creator_tier
    ? "Pick a creator tier in the cost calculator above."
    : !hasCompensation
      ? "Enter a cash compensation amount in the cost calculator above."
      : !hasDeliverables
        ? "Pick at least one deliverable in the cost calculator, or add a custom one below."
        : completeRanges.length === 0
          ? "Add a collaboration window with both a start and end date."
          : "";

  function resetForm() {
    setCustomQty(1); setCustomType(""); setCustomDesc(""); setCustomUsage(draft.usage_rights || DEFAULT_USAGE_RIGHTS);
    setEditIdx(null); setEditingAutoType(null);
  }

  function addDeliverable() {
    if (editingAutoType) {
      updateDraft({
        deliverable_usage_overrides: { ...draft.deliverable_usage_overrides, [editingAutoType]: customUsage.trim() },
      });
      resetForm();
      return;
    }
    if (!customType.trim()) return;
    const item = { type: customType.trim(), quantity: customQty, description: customDesc.trim(), usage_rights: customUsage.trim() };
    if (editIdx !== null) {
      const updated = [...draft.deliverables_list];
      updated[editIdx] = item;
      updateDraft({ deliverables_list: updated });
    } else {
      updateDraft({ deliverables_list: [...draft.deliverables_list, item] });
    }
    resetForm();
  }

  function removeDeliverable(i) {
    updateDraft({ deliverables_list: draft.deliverables_list.filter((_, idx) => idx !== i) });
  }

  function startEdit(i) {
    const d = draft.deliverables_list[i];
    setEditingAutoType(null);
    setEditIdx(i); setCustomQty(d.quantity); setCustomType(d.type); setCustomDesc(d.description); setCustomUsage(d.usage_rights || draft.usage_rights || DEFAULT_USAGE_RIGHTS);
  }

  function startEditAuto(d) {
    setEditIdx(null);
    setEditingAutoType(d.type);
    setCustomQty(d.quantity); setCustomType(d.type); setCustomDesc(""); setCustomUsage(d.usage_rights || draft.usage_rights || DEFAULT_USAGE_RIGHTS);
  }

  // combinedDeliverablesList = auto (cost calculator) cards + custom cards, in
  // that order — only the custom slice maps back to editable deliverables_list
  // indices, since the auto cards' type/quantity are derived from the calculator.
  const isAutoCard = (i) => i < autoDeliverableCount;
  const toCustomIdx = (i) => i - autoDeliverableCount;

  // Copies the form's usage rights onto every deliverable, and stores it as the
  // listing-level default so the detail page "Things to know" stays populated.
  function copyUsageToAll() {
    const value = (customUsage || "").trim();
    updateDraft({
      deliverables_list: draft.deliverables_list.map((d) => ({ ...d, usage_rights: value })),
      usage_rights: value,
    });
  }

  return (
    <WizardShell
      step={3}
      nextDisabled={!canProceed}
      nextHint={nextHint}
      onNext={() => navigate("/host/listings/create/review")}
    >
      <h2 style={{ fontFamily: "Cabinet Grotesk, serif", fontWeight: 800, fontSize: 28, color: "var(--ink)", margin: "0 0 6px" }}>
        Pricing & dates
      </h2>
      <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--slate)", margin: "0 0 32px" }}>
        Set the creator tier, compensation, and deliverables — with live pricing guidance — then define when the collaboration happens.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {/* Pricing tool — creator tier, compensation, complexity, deliverables */}
        <PricingTool
          mode="listing"
          initialValue={{
            tierId: draft.creator_tier || undefined,
            compensationType: draft.compensation_type,
            complexity: draft.complexity,
            stayValue: draft.stay_value,
            cashAmount: draft.cash_amount,
            deliverables: draft.deliverables,
          }}
          onChange={(fields) => updateDraft(fields)}
        />

        {/* Summary banner */}
        {totalDeliverables > 0 && (
          <div style={{ background: "var(--mint)", borderRadius: "0.875rem", padding: "14px 18px" }}>
            <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>
              {totalDeliverables} total deliverables
            </div>
            <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--slate)", marginTop: 2 }}>
              Across {formatCount} format{formatCount !== 1 ? "s" : ""} · {LOAD_LABELS[draft.deliverable_load] || ""} load
            </div>
          </div>
        )}

        {/* Deliverables list — auto cards from the cost calculator above, plus any custom cards added below. Always kept in sync with the calculator. */}
        <div>
          <Label>Deliverables</Label>
          {combinedDeliverablesList.length === 0 ? (
            <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--sage)" }}>
              Pick deliverables in the cost calculator above, or add a custom one below.
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {combinedDeliverablesList.map((d, i) => {
                const auto = isAutoCard(i);
                return (
                  <div key={i} style={{ width: 200, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderRadius: "0.875rem", border: "1px solid rgba(255,255,255,0.85)", padding: "14px 16px", boxShadow: "0 1px 8px rgba(25,37,36,0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                      <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{d.quantity}x {d.type}</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => (auto ? startEditAuto(d) : startEdit(toCustomIdx(i)))} title="Edit usage rights" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sage)" }}><Pencil size={13} /></button>
                        {!auto && (
                          <button onClick={() => removeDeliverable(toCustomIdx(i))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sage)" }}><X size={13} /></button>
                        )}
                      </div>
                    </div>
                    {auto ? (
                      <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 11, color: "var(--sage)", fontStyle: "italic" }}>From the cost calculator above</div>
                    ) : (
                      <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--slate)" }}>{d.description}</div>
                    )}
                    {d.usage_rights && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(25,37,36,0.08)" }}>
                        <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--sage)", marginBottom: 2 }}>Usage rights</div>
                        <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 11, color: "var(--slate)", lineHeight: 1.4 }}>{d.usage_rights}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add custom deliverable */}
        <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(14px) saturate(130%)", WebkitBackdropFilter: "blur(14px) saturate(130%)", borderRadius: "0.875rem", border: "1px solid rgba(255,255,255,0.88)", padding: "20px", boxShadow: "0 2px 12px rgba(25,37,36,0.05)" }}>
          <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ink)", marginBottom: 14 }}>
            {editingAutoType ? `Edit usage rights — ${editingAutoType}` : editIdx !== null ? "Edit deliverable" : "Add custom deliverable"}
          </div>
          {!editingAutoType && (
            <>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                {/* Qty stepper */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bone)", borderRadius: "0.625rem", padding: "8px 12px", flexShrink: 0 }}>
                  <button onClick={() => setCustomQty(Math.max(1, customQty - 1))} style={{ background: "none", border: "none", cursor: "pointer" }}><Minus size={13} color="var(--ink)" /></button>
                  <span style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--ink)", minWidth: 20, textAlign: "center" }}>{customQty}</span>
                  <button onClick={() => setCustomQty(customQty + 1)} style={{ background: "none", border: "none", cursor: "pointer" }}><Plus size={13} color="var(--ink)" /></button>
                </div>
                <input value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Platform/Type (e.g., Instagram Reels)" style={{ flex: 1, padding: "10px 14px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.625rem", fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--ink)", background: "var(--bone)", outline: "none" }} />
              </div>
              <input value={customDesc} onChange={(e) => setCustomDesc(e.target.value)} placeholder="Description" style={{ width: "100%", padding: "10px 14px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.625rem", fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--ink)", background: "var(--bone)", outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
            </>
          )}
          {editingAutoType && (
            <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--sage)", marginBottom: 12 }}>
              {customQty}x {editingAutoType} — type and quantity come from the cost calculator above.
            </div>
          )}

          {/* Usage rights for this deliverable */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 12, color: "var(--ink)" }}>Usage rights for this deliverable</div>
            {!editingAutoType && (
              <button
                onClick={copyUsageToAll}
                disabled={draft.deliverables_list.length === 0}
                title="Apply these usage rights to every deliverable"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: draft.deliverables_list.length === 0 ? "not-allowed" : "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 12, fontWeight: 600, color: draft.deliverables_list.length === 0 ? "var(--sage)" : "var(--slate)", padding: 0 }}
              >
                <Copy size={13} /> Copy to all
              </button>
            )}
          </div>
          <textarea
            value={customUsage}
            onChange={(e) => setCustomUsage(e.target.value)}
            placeholder="e.g., Host receives a perpetual license for marketing. Creator retains ownership."
            rows={2}
            style={{ width: "100%", padding: "10px 14px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.625rem", fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--ink)", background: "var(--bone)", outline: "none", resize: "vertical", boxSizing: "border-box", marginBottom: 12 }}
          />

          <div style={{ display: "flex", gap: 10 }}>
            {(editIdx !== null || editingAutoType) && (
              <button
                onClick={resetForm}
                style={{ flex: 1, padding: "12px 0", borderRadius: 9999, border: "1.5px solid rgba(25,37,36,0.15)", background: "transparent", fontFamily: "Satoshi, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--ink)", cursor: "pointer" }}
              >
                Cancel
              </button>
            )}
            <button
              onClick={addDeliverable}
              disabled={!editingAutoType && !customType.trim()}
              style={{ flex: 2, padding: "12px 0", borderRadius: 9999, border: "none", background: (editingAutoType || customType.trim()) ? "var(--ink)" : "rgba(25,37,36,0.14)", fontFamily: "Satoshi, sans-serif", fontSize: 14, fontWeight: 700, color: (editingAutoType || customType.trim()) ? "#fff" : "var(--slate)", cursor: (editingAutoType || customType.trim()) ? "pointer" : "not-allowed", transition: "background 150ms" }}
            >
              + {editingAutoType || editIdx !== null ? "Save changes" : "Add deliverable"}
            </button>
          </div>
        </div>

        {/* Deliverables due */}
        <div style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(14px) saturate(130%)", WebkitBackdropFilter: "blur(14px) saturate(130%)", borderRadius: "0.875rem", border: "1px solid rgba(255,255,255,0.7)", padding: "18px 20px", boxShadow: "0 2px 12px rgba(25,37,36,0.05)" }}>
          <Label>Deliverables due (days after stay)</Label>
          <Input
            type="number"
            value={draft.turnaround_days}
            onChange={(v) => updateDraft({ turnaround_days: v === "" ? "" : Math.max(0, parseInt(v, 10) || 0) })}
            onBlur={() => { if (draft.turnaround_days === "") updateDraft({ turnaround_days: 0 }); }}
            placeholder="14"
          />
        </div>

        {/* Collaboration windows (up to 3) */}
        <div>
          <Label required>Collaboration windows</Label>
          <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--sage)", marginBottom: 8 }}>Add up to {MAX_DATE_RANGES} date windows creators can book within.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {dateRanges.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <ThemedDateRangePicker
                    start={r.startDate}
                    end={r.endDate}
                    onChange={(start, end) => setRange(i, start, end)}
                  />
                </div>
                {dateRanges.length > 1 && (
                  <button onClick={() => removeRange(i)} title="Remove date window" style={{ marginTop: 10, width: 30, height: 30, borderRadius: "50%", border: "1.5px solid rgba(25,37,36,0.15)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <X size={14} color="var(--slate)" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {dateRanges.length < MAX_DATE_RANGES && (
            <button onClick={addRange} style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "1.5px dashed rgba(25,37,36,0.25)", borderRadius: 9999, background: "transparent", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
              <Plus size={15} /> Add another date window
            </button>
          )}
        </div>

        {/* Policies */}
        <div>
          <Label>Revision policy</Label>
          <textarea
            value={draft.revision_policy}
            onChange={(e) => updateDraft({ revision_policy: e.target.value })}
            rows={3}
            style={{ width: "100%", padding: "13px 16px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.875rem", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none", resize: "vertical", boxSizing: "border-box" }}
          />
          <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--sage)", marginTop: 6 }}>
            Usage rights are now set per-deliverable above. Use "Copy to all" to apply one policy across every deliverable.
          </div>
        </div>
      </div>
    </WizardShell>
  );
}
