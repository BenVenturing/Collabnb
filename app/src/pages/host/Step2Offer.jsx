import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, Sparkles } from "lucide-react";
import WizardShell from "../../components/host/WizardShell";
import { useListingDraft } from "../../contexts/ListingDraftContext";

function SectionLabel({ children }) {
  return <div style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ink)", marginBottom: 4 }}>{children}</div>;
}
function SectionDesc({ children }) {
  return <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--sage)", marginBottom: 12 }}>{children}</div>;
}

function PillInput({ placeholder, onAdd }) {
  const [value, setValue] = useState("");
  function handleAdd() {
    const trimmed = value.trim();
    if (trimmed) { onAdd(trimmed); setValue(""); }
  }
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        placeholder={placeholder}
        style={{ flex: 1, padding: "12px 16px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.875rem", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none" }}
      />
      <button onClick={handleAdd} style={{ width: 44, height: 44, borderRadius: "0.875rem", background: "var(--ink)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Plus size={18} color="#fff" />
      </button>
    </div>
  );
}

function PillList({ items, onRemove, color = "var(--mint)" }) {
  if (!items.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: color, borderRadius: 9999, fontFamily: "Satoshi, sans-serif", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
          {item}
          <button onClick={() => onRemove(i)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--slate)", padding: 0 }}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

function generateCollabCode(title, percent) {
  const initials = (title || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join("")
    .slice(0, 5);
  const pct = parseInt(percent, 10);
  if (!initials) return "";
  return `${initials}${isNaN(pct) || pct <= 0 ? "" : pct}`;
}

export default function Step2Offer() {
  const navigate = useNavigate();
  const { draft, updateDraft } = useListingDraft();

  function addPerk(perk) { updateDraft({ perks: [...draft.perks, perk] }); }
  function removePerk(i) { updateDraft({ perks: draft.perks.filter((_, idx) => idx !== i) }); }
  function addTag(tag) { updateDraft({ vibe_tags: [...draft.vibe_tags, tag] }); }
  function removeTag(i) { updateDraft({ vibe_tags: draft.vibe_tags.filter((_, idx) => idx !== i) }); }

  return (
    <WizardShell
      step={2}
      onNext={() => navigate("/host/listings/create/deliverables")}
    >
      <h2 style={{ fontFamily: "Cabinet Grotesk, serif", fontWeight: 800, fontSize: 28, color: "var(--ink)", margin: "0 0 6px" }}>
        What's the offer?
      </h2>
      <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--slate)", margin: "0 0 32px" }}>
        Tell creators what makes your listing special and what perks they'll get.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {/* Add-ons */}
        <div>
          <SectionLabel>Add-ons</SectionLabel>
          <SectionDesc>Optional extras you can include to sweeten the offer.</SectionDesc>
          <PillInput placeholder="e.g., Hot tub access" onAdd={addPerk} />
          <PillList items={draft.perks} onRemove={removePerk} />
        </div>

        {/* Affiliate section */}
        <div>
          <SectionLabel>Your affiliate code (optional)</SectionLabel>
          <SectionDesc>Paste your own affiliate code or link from your booking platform (e.g., Airbnb, VRBO, direct site).</SectionDesc>
          <input
            value={draft.affiliate_code}
            onChange={(e) => updateDraft({ affiliate_code: e.target.value })}
            placeholder="e.g., https://airbnb.com/ref/abc123 or MYCODE10"
            style={{ width: "100%", padding: "12px 16px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.875rem", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none", boxSizing: "border-box" }}
          />

          <div style={{ marginTop: 20 }}>
            <SectionLabel>Affiliate percentage (%)</SectionLabel>
            <SectionDesc>What percentage commission will the creator earn from your affiliate link?</SectionDesc>
            <input
              type="number"
              min="0"
              max="50"
              value={draft.affiliate_percent}
              onChange={(e) => {
                const v = e.target.value === "" ? 0 : Math.min(50, Math.max(0, parseInt(e.target.value, 10) || 0));
                updateDraft({ affiliate_percent: v });
              }}
              placeholder="e.g., 10"
              style={{ width: "100%", padding: "12px 16px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.875rem", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <button
            onClick={() => {
              const code = generateCollabCode(draft.title, draft.affiliate_percent);
              if (code) updateDraft({ affiliate_code: code });
            }}
            style={{ marginTop: 12, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--slate)", fontWeight: 600, padding: 0 }}
          >
            <Sparkles size={14} />
            Generate Collabnb Code
          </button>

          <p style={{ marginTop: 10, fontFamily: "Satoshi, sans-serif", fontSize: 11.5, color: "var(--sage)", lineHeight: 1.5 }}>
            Collabnb does not currently track affiliate clicks. Code-honoring is on the host. Real tracking coming in a future update.
          </p>
        </div>

        {/* Vibe tags */}
        <div>
          <SectionLabel>Vibe tags (optional)</SectionLabel>
          <SectionDesc>Add a few words that describe the vibe (Cozy, Luxury, Adventure, etc.)</SectionDesc>
          <PillInput placeholder="e.g., Cozy" onAdd={addTag} />
          <PillList items={draft.vibe_tags} onRemove={removeTag} color="rgba(209,235,219,0.6)" />
        </div>

        {/* Max offers */}
        <div>
          <SectionLabel>How many times do you want to offer this collab?</SectionLabel>
          <SectionDesc>Set a max number of confirmed collabs for this listing. Once reached, the listing auto-pauses. Leave blank for unlimited.</SectionDesc>
          <input
            type="number"
            min="1"
            value={draft.maxOffers}
            onChange={(e) => updateDraft({ maxOffers: e.target.value === '' ? '' : parseInt(e.target.value, 10) || '' })}
            placeholder="e.g., 3 (leave blank = unlimited)"
            style={{ width: '100%', padding: "12px 16px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.875rem", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none" }}
          />
        </div>
      </div>
    </WizardShell>
  );
}
