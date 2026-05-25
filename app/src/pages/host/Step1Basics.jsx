import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, X, Plus, Minus } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import WizardShell from "../../components/host/WizardShell";
import { useListingDraft } from "../../contexts/ListingDraftContext";

const TIERS = [
  { id: "ugc_beginner", label: "UGC Beginner" },
  { id: "ugc_pro", label: "UGC Pro" },
  { id: "micro", label: "Micro Influencer" },
  { id: "mid", label: "Influencer" },
];

const LOADS = [
  { id: "light", label: "Light", desc: "Best for simple stays and quick content." },
  { id: "moderate", label: "Moderate", desc: "Balanced package for strong coverage." },
  { id: "heavy", label: "Heavy", desc: "For full campaigns and multi-format coverage." },
];

const COMP_TYPES = [
  { id: "free_stay", label: "Free Stay" },
  { id: "paid", label: "Paid" },
  { id: "hybrid", label: "Hybrid (Stay + Cash)" },
];

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

  const canProceed = draft.title.trim() && draft.location_city.trim() && draft.location_country.trim() && draft.creator_tier && draft.deliverable_load;

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await res.json();
      updateDraft({ images: [...draft.images, storageId] });
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
            {draft.images.map((id, i) => (
              <div key={i} style={{ width: 80, height: 80, borderRadius: "0.75rem", background: "var(--bone)", position: "relative", overflow: "hidden", border: "1.5px solid rgba(25,37,36,0.12)" }}>
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--sage)", fontFamily: "Satoshi, sans-serif" }}>IMG</div>
                <button onClick={() => removeImage(i)} style={{ position: "absolute", top: 4, right: 4, background: "var(--ink)", border: "none", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <X size={10} color="#fff" />
                </button>
              </div>
            ))}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{ width: "100%", padding: "18px 0", border: "1.5px dashed rgba(25,37,36,0.2)", borderRadius: "0.875rem", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--slate)", fontWeight: 500 }}
            >
              <Camera size={18} />
              {uploading ? "Uploading..." : "Upload images"}
            </button>
          </div>
          <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--sage)", textAlign: "center" }}>Select multiple images from your library</div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
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
                style={{ padding: "14px 18px", border: `1.5px solid ${draft.compensation_type === t.id ? "var(--ink)" : "rgba(25,37,36,0.15)"}`, borderRadius: "0.875rem", background: draft.compensation_type === t.id ? "var(--mint)" : "#fff", fontFamily: "Satoshi, sans-serif", fontSize: 14, fontWeight: 600, color: "var(--ink)", cursor: "pointer", textAlign: "left" }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Conditional: nights */}
          {(draft.compensation_type === "free_stay" || draft.compensation_type === "hybrid") && (
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
              <Label>Cash payment ($)</Label>
              <Input type="number" placeholder="0" value={draft.cash_amount || ""} onChange={(v) => updateDraft({ cash_amount: Number(v) })} />
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
                style={{ padding: "10px 18px", borderRadius: 9999, border: `1.5px solid ${draft.creator_tier === t.id ? "var(--ink)" : "rgba(25,37,36,0.15)"}`, background: draft.creator_tier === t.id ? "var(--ink)" : "#fff", fontFamily: "Satoshi, sans-serif", fontSize: 13, fontWeight: 600, color: draft.creator_tier === t.id ? "#fff" : "var(--ink)", cursor: "pointer" }}
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
                style={{ padding: "16px 18px", border: `1.5px solid ${draft.deliverable_load === l.id ? "var(--ink)" : "rgba(25,37,36,0.15)"}`, borderRadius: "0.875rem", background: draft.deliverable_load === l.id ? "var(--mint)" : "#fff", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--ink)", cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ fontWeight: 700 }}>{l.label}</div>
                <div style={{ fontSize: 12, color: "var(--slate)", marginTop: 2 }}>{l.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </WizardShell>
  );
}
