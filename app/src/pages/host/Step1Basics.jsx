import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, X, Plus } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import WizardShell from "../../components/host/WizardShell";
import { useListingDraft } from "../../contexts/ListingDraftContext";

const MAX_IMAGES = 10;

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
  const finalizeUpload = useMutation(api.uploads.finalizeUpload);
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const canProceed = draft.title.trim() && draft.location_city.trim() && draft.location_country.trim();

  async function handleImageUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = MAX_IMAGES - draft.images.length;
    const toUpload = files.slice(0, Math.max(0, remaining));
    if (!toUpload.length) { e.target.value = ""; return; }
    setUploading(true);
    setUploadError("");
    try {
      const uploaded = [];
      for (const file of toUpload) {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
        const { storageId } = await res.json();
        // Validates the file Convex actually stored (type/size) and deletes
        // it server-side if it fails — rejects before it ever reaches the draft.
        await finalizeUpload({ storageId });
        uploaded.push(storageId);
      }
      updateDraft({ images: [...draft.images, ...uploaded] });
    } catch (err) {
      console.error("Upload failed", err);
      setUploadError(err.message || "One of your photos couldn't be uploaded.");
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
          {uploadError && (
            <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "#c0392b", marginTop: 8 }}>{uploadError}</div>
          )}
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

        <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12.5, color: "var(--sage)", margin: 0 }}>
          Creator tier, compensation, and deliverables are set on the next step, with live pricing guidance.
        </p>
      </div>
    </WizardShell>
  );
}
