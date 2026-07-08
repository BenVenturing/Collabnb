import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, X, Plus, Minus } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import WizardShell from "../../components/host/WizardShell";
import { useListingDraft } from "../../contexts/ListingDraftContext";

const MAX_IMAGES = 10;

const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "CNY", symbol: "¥" },
  { code: "AUD", symbol: "A$" },
  { code: "CAD", symbol: "C$" },
  { code: "JPY", symbol: "¥" },
];

const TIERS = [
  { id: "ugc_beginner", label: "UGC Beginner" },
  { id: "ugc_pro", label: "UGC Pro" },
  { id: "micro", label: "Micro Influencer" },
  { id: "mid", label: "Influencer" },
];

const LOADS = [
  { id: "light", label: "Light", desc: "Best for simple stays and quick content.", counts: "~6 deliverables across 3 formats" },
  { id: "moderate", label: "Moderate", desc: "Balanced package for strong coverage.", counts: "~12 deliverables across 3 formats" },
  { id: "heavy", label: "Heavy", desc: "For full campaigns and multi-format coverage.", counts: "~20 deliverables across 4 formats" },
];

const COMP_TYPES = [
  { id: "paid", label: "Paid" },
  { id: "hybrid", label: "Hybrid (Stay + Cash)" },
];

// Resolves a Convex storageId (or plain http URL) to a thumbnail image.
function Thumb({ storageId, onRemove }) {
  const isUrl = typeof storageId === "string" && storageId.startsWith("http");
  const resolved = useQuery(api.uploads.getImageUrl, isUrl ? "skip" : { storageId });
  const src = isUrl ? storageId : resolved;
  return (
    <div style={{ width: 80, height: 80, borderRadius: "0.75rem", background: "var(--bone)", position: "relative", overflow: "hidden", border: "1.5px solid rgba(25,37,36,0.12)", flexShrink: 0 }}>
      {src ? (
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(25,37,36,0.15)", borderTopColor: "var(--slate)", animation: "spin 0.7s linear infinite" }} />
        </div>
      )}
      <button onClick={onRemove} style={{ position: "absolute", top: 4, right: 4, background: "var(--ink)", border: "none", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <X size={10} color="#fff" />
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Label({ children, required }) {
  return (
    <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ink)", marginBottom: 6 }}>
      {children}{required && <span style={{ color: "#e04" }}> *</span>}
    </div>
  );
}

function Input({ placeholder, value, onChange, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", padding: "13px 16px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.875rem", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none", boxSizing: "border-box" }}
    />
  );
}

export default function Step1Basics() {
  const navigate = useNavigate();
  const { draft, updateDraft } = useListingDraft();
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const canProceed = draft.title.trim() && draft.location_city.trim() && draft.location_country.trim() && draft.creator_tier && draft.deliverable_load &&
    (draft.compensation_type === "paid" || draft.compensation_type === "hybrid") && draft.cash_amount > 0;

  async function handleImageUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = MAX_IMAGES - draft.images.length;
    const toUpload = files.slice(0, Math.max(0, remaining));
    if (!toUpload.length) { e.target.value = ""; return; }
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of toUpload) {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
        const { storageId } = await res.json();
        uploaded.push(storageId);
      }
      updateDraft({ images: [...draft.images, ...uploaded] });
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeImage(idx) {
    updateDraft({ images: draft.images.filter((_, i) => i !== idx) });
  }

  return (
    <WizardShell
      step={1}
      nextDisabled={!canProceed}
      onNext={() => navigate("/host/listings/create/offer")}
    >
      <h2 style={{ fontFamily: "Cabinet Grotesk, serif", fontWeight: 800, fontSize: 28, color: "var(--ink)", margin: "0 0 6px" }}>
        Tell us the basics
      </h2>
      <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--slate)", margin: "0 0 32px" }}>
        Start with the essential details about your collaboration opportunity.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Title */}
        <div>
          <Label required>Listing title</Label>
          <Input placeholder="e.g., Cozy Lake Tahoe Cabin" value={draft.title} onChange={(v) => updateDraft({ title: v })} />
        </div>

        {/* Location */}
        <div>
          <Label required>Location</Label>
          <div style={{ display: "flex", gap: 12 }}>
            <Input placeholder="City" value={draft.location_city} onChange={(v) => updateDraft({ location_city: v })} />
            <Input placeholder="State / Country" value={draft.location_country} onChange={(v) => updateDraft({ location_country: v })} />
          </div>
        </div>

        {/* Property URL */}
        <div>
          <Label>Property listing URL</Label>
          <Input placeholder="https://your-stay-or-booking-link.com" value={draft.property_url} onChange={(v) => updateDraft({ property_url: v })} />
        </div>

        {/* Images */}
        <div>
          <Label>Property images</Label>

          {draft.images.length === 0 ? (
            /* Empty state — large dropzone */
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{ width: "100%", padding: "26px 0", border: "1.5px dashed rgba(25,37,36,0.2)", borderRadius: "0.875rem", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--slate)", fontWeight: 500 }}
            >
              <Camera size={20} />
              {uploading ? "Uploading..." : "Upload images"}
              <span style={{ fontSize: 12, color: "var(--sage)", fontWeight: 400 }}>Select multiple images from your library (up to {MAX_IMAGES})</span>
            </button>
          ) : (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                {draft.images.map((id, i) => (
                  <Thumb key={id || i} storageId={id} onRemove={() => removeImage(i)} />
                ))}
              </div>
              {draft.images.length < MAX_IMAGES && (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: 9999, background: "rgba(255,255,255,0.7)", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--ink)", fontWeight: 600 }}
                >
                  <Plus size={15} />
                  {uploading ? "Uploading..." : "Add photos"}
                </button>
              )}
              <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--sage)", marginTop: 8 }}>
                {draft.images.length} of {MAX_IMAGES} added{draft.images.length >= MAX_IMAGES ? " — limit reached" : ""}
              </div>
            </>
          )}

          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImageUpload} />
        </div>

        {/* Collaboration brief */}
        <div>
          <Label>Collaboration brief</Label>
          <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--sage)", marginBottom: 6 }}>Describe what you're looking for from creators (optional)</div>
          <textarea
            value={draft.collaboration_brief}
            onChange={(e) => updateDraft({ collaboration_brief: e.target.value })}
            placeholder="e.g., Looking for authentic content that highlights the mountain views and cozy cabin vibe..."
            rows={4}
            style={{ width: "100%", padding: "13px 16px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.875rem", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none", resize: "vertical", boxSizing: "border-box" }}
          />
        </div>

        {/* Collaboration type */}
        <div>
          <Label required>Collaboration type</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {COMP_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => updateDraft({ compensation_type: t.id })}
                style={{ padding: "14px 18px", border: `1.5px solid ${draft.compensation_type === t.id ? "var(--ink)" : "rgba(25,37,36,0.15)"}`, borderRadius: "0.875rem", background: draft.compensation_type === t.id ? "var(--mint)" : "rgba(255,255,255,0.82)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", fontFamily: "Satoshi, sans-serif", fontSize: 14, fontWeight: 600, color: "var(--ink)", cursor: "pointer", textAlign: "left" }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Conditional: nights */}
          {draft.compensation_type === "hybrid" && (
            <div style={{ marginTop: 16 }}>
              <Label>Number of nights</Label>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <button onClick={() => updateDraft({ nights: Math.max(1, draft.nights - 1) })} style={{ width: 40, height: 40, borderRadius: "50%", border: "1.5px solid var(--ink)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Minus size={16} color="var(--ink)" />
                </button>
                <span style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 20, color: "var(--ink)", minWidth: 32, textAlign: "center" }}>{draft.nights}</span>
                <button onClick={() => updateDraft({ nights: draft.nights + 1 })} style={{ width: 40, height: 40, borderRadius: "50%", border: "1.5px solid var(--ink)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={16} color="var(--ink)" />
                </button>
              </div>
            </div>
          )}

          {/* Conditional: cash */}
          {(draft.compensation_type === "paid" || draft.compensation_type === "hybrid") && (
            <div style={{ marginTop: 16 }}>
              <Label>Cash payment</Label>
              <div style={{ display: "flex", gap: 10 }}>
                <select
                  value={draft.currency}
                  onChange={(e) => updateDraft({ currency: e.target.value })}
                  style={{ flexShrink: 0, padding: "13px 14px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.875rem", fontFamily: "Satoshi, sans-serif", fontSize: 14, fontWeight: 600, color: "var(--ink)", background: "#fff", outline: "none", cursor: "pointer" }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                  ))}
                </select>
                <div style={{ position: "relative", flex: 1 }}>
                  <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--slate)", pointerEvents: "none" }}>
                    {CURRENCIES.find((c) => c.code === draft.currency)?.symbol || "$"}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={draft.cash_amount || ""}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^0-9.]/g, "");
                      updateDraft({ cash_amount: digits === "" ? 0 : Number(digits) });
                    }}
                    style={{ width: "100%", padding: "13px 16px 13px 34px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.875rem", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Creator tier */}
        <div>
          <Label required>Creator tier required</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {TIERS.map((t) => (
              <button
                key={t.id}
                onClick={() => updateDraft({ creator_tier: t.id })}
                style={{ padding: "10px 18px", borderRadius: 9999, border: `1.5px solid ${draft.creator_tier === t.id ? "var(--ink)" : "rgba(25,37,36,0.15)"}`, background: draft.creator_tier === t.id ? "var(--ink)" : "rgba(255,255,255,0.82)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", fontFamily: "Satoshi, sans-serif", fontSize: 13, fontWeight: 600, color: draft.creator_tier === t.id ? "#fff" : "var(--ink)", cursor: "pointer" }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Deliverable load */}
        <div>
          <Label required>Deliverable load</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {LOADS.map((l) => (
              <button
                key={l.id}
                onClick={() => updateDraft({ deliverable_load: l.id })}
                style={{ padding: "16px 18px", border: `1.5px solid ${draft.deliverable_load === l.id ? "var(--ink)" : "rgba(25,37,36,0.15)"}`, borderRadius: "0.875rem", background: draft.deliverable_load === l.id ? "var(--mint)" : "rgba(255,255,255,0.82)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--ink)", cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ fontWeight: 700 }}>{l.label}</div>
                <div style={{ fontSize: 12, color: "var(--slate)", marginTop: 2 }}>{l.desc}</div>
                <div style={{ fontSize: 11.5, color: "var(--sage)", marginTop: 4, fontWeight: 600 }}>{l.counts}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </WizardShell>
  );
}
