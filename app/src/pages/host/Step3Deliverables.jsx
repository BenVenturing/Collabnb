import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Minus, Pencil, X, Copy } from "lucide-react";
import WizardShell from "../../components/host/WizardShell";
import { useListingDraft } from "../../contexts/ListingDraftContext";
import ThemedDateRangePicker from "../../components/host/ThemedDateRangePicker";

function Label({ children, required }) {
  return <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ink)", marginBottom: 6 }}>{children}{required && <span style={{ color: "#e04" }}> *</span>}</div>;
}
function Input({ value, onChange, placeholder, type = "text" }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "12px 16px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.875rem", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none", boxSizing: "border-box" }} />;
}

const LOAD_LABELS = { light: "light", moderate: "moderate", heavy: "heavy" };

export default function Step3Deliverables() {
  const navigate = useNavigate();
  const { draft, updateDraft, totalDeliverables, formatCount, DEFAULT_USAGE_RIGHTS } = useListingDraft();

  const [customQty, setCustomQty] = useState(1);
  const [customType, setCustomType] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customUsage, setCustomUsage] = useState(draft.usage_rights || DEFAULT_USAGE_RIGHTS);
  const [editIdx, setEditIdx] = useState(null);

  const canProceed = draft.collab_start && draft.collab_end && draft.deliverables_list.length > 0;

  function addDeliverable() {
    if (!customType.trim()) return;
    const item = { type: customType.trim(), quantity: customQty, description: customDesc.trim(), usage_rights: customUsage.trim() };
    if (editIdx !== null) {
      const updated = [...draft.deliverables_list];
      updated[editIdx] = item;
      updateDraft({ deliverables_list: updated });
      setEditIdx(null);
    } else {
      updateDraft({ deliverables_list: [...draft.deliverables_list, item] });
    }
    setCustomQty(1); setCustomType(""); setCustomDesc(""); setCustomUsage(draft.usage_rights || DEFAULT_USAGE_RIGHTS);
  }

  function removeDeliverable(i) {
    updateDraft({ deliverables_list: draft.deliverables_list.filter((_, idx) => idx !== i) });
  }

  function startEdit(i) {
    const d = draft.deliverables_list[i];
    setEditIdx(i); setCustomQty(d.quantity); setCustomType(d.type); setCustomDesc(d.description); setCustomUsage(d.usage_rights || draft.usage_rights || DEFAULT_USAGE_RIGHTS);
  }

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
      onNext={() => navigate("/host/listings/create/review")}
    >
      <h2 style={{ fontFamily: "Cabinet Grotesk, serif", fontWeight: 800, fontSize: 28, color: "var(--ink)", margin: "0 0 6px" }}>
        Deliverables & dates
      </h2>
      <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--slate)", margin: "0 0 32px" }}>
        Define when the collaboration happens and what content you need.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {/* Collaboration window */}
        <div>
          <Label required>Collaboration window</Label>
          <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--sage)", marginBottom: 8 }}>Pick the start and end of the window creators can book within.</div>
          <ThemedDateRangePicker
            start={draft.collab_start}
            end={draft.collab_end}
            onChange={(start, end) => updateDraft({ collab_start: start, collab_end: end })}
          />
        </div>

        {/* Turnaround */}
        <div>
          <Label>Deliverables due (days after stay)</Label>
          <Input type="number" value={draft.turnaround_days} onChange={(v) => updateDraft({ turnaround_days: Number(v) })} placeholder="14" />
        </div>

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

        {/* Deliverables list */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Label>Deliverables</Label>
            <span style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--sage)" }}>Swipe to see all →</span>
          </div>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
            {draft.deliverables_list.map((d, i) => (
              <div key={i} style={{ minWidth: 180, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderRadius: "0.875rem", border: "1px solid rgba(255,255,255,0.85)", padding: "14px 16px", flexShrink: 0, boxShadow: "0 1px 8px rgba(25,37,36,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{d.quantity}x {d.type}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => startEdit(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sage)" }}><Pencil size={13} /></button>
                    <button onClick={() => removeDeliverable(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sage)" }}><X size={13} /></button>
                  </div>
                </div>
                <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--slate)" }}>{d.description}</div>
                {d.usage_rights && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(25,37,36,0.08)" }}>
                    <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--sage)", marginBottom: 2 }}>Usage rights</div>
                    <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 11, color: "var(--slate)", lineHeight: 1.4 }}>{d.usage_rights}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add custom deliverable */}
        <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(14px) saturate(130%)", WebkitBackdropFilter: "blur(14px) saturate(130%)", borderRadius: "0.875rem", border: "1px solid rgba(255,255,255,0.88)", padding: "20px", boxShadow: "0 2px 12px rgba(25,37,36,0.05)" }}>
          <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ink)", marginBottom: 14 }}>
            {editIdx !== null ? "Edit deliverable" : "Add custom deliverable"}
          </div>
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

          {/* Usage rights for this deliverable */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 12, color: "var(--ink)" }}>Usage rights for this deliverable</div>
            <button
              onClick={copyUsageToAll}
              disabled={draft.deliverables_list.length === 0}
              title="Apply these usage rights to every deliverable"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: draft.deliverables_list.length === 0 ? "not-allowed" : "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 12, fontWeight: 600, color: draft.deliverables_list.length === 0 ? "var(--sage)" : "var(--slate)", padding: 0 }}
            >
              <Copy size={13} /> Copy to all
            </button>
          </div>
          <textarea
            value={customUsage}
            onChange={(e) => setCustomUsage(e.target.value)}
            placeholder="e.g., Host receives a perpetual license for marketing. Creator retains ownership."
            rows={2}
            style={{ width: "100%", padding: "10px 14px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.625rem", fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--ink)", background: "var(--bone)", outline: "none", resize: "vertical", boxSizing: "border-box", marginBottom: 12 }}
          />

          <button
            onClick={addDeliverable}
            disabled={!customType.trim()}
            style={{ width: "100%", padding: "12px 0", borderRadius: 9999, border: "none", background: customType.trim() ? "var(--ink)" : "rgba(25,37,36,0.14)", fontFamily: "Satoshi, sans-serif", fontSize: 14, fontWeight: 700, color: customType.trim() ? "#fff" : "var(--slate)", cursor: customType.trim() ? "pointer" : "not-allowed", transition: "background 150ms" }}
          >
            + {editIdx !== null ? "Save changes" : "Add deliverable"}
          </button>
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
