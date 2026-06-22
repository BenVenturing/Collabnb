import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, Sparkles, Search, Wand2 } from "lucide-react";
import WizardShell from "../../components/host/WizardShell";
import { useListingDraft } from "../../contexts/ListingDraftContext";
import { AMENITY_ICONS, ICON_PALETTE } from "../../lib/amenityIcons";

const COMMON_AMENITY_KEYS = ["wifi", "pool", "hot_tub", "kitchen", "parking", "views"];

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

function generateCollabCode(title) {
  const initials = (title || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join("")
    .slice(0, 4);
  const suffix = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  return `COLLABNB-${initials || 'CODE'}${suffix}`;
}

export default function Step2Offer() {
  const navigate = useNavigate();
  const { draft, updateDraft } = useListingDraft();

  const [amenitySearch, setAmenitySearch] = useState("");
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [creatingAmenity, setCreatingAmenity] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customIcon, setCustomIcon] = useState("");

  function addPerk(perk) { updateDraft({ perks: [...draft.perks, perk] }); }
  function removePerk(i) { updateDraft({ perks: draft.perks.filter((_, idx) => idx !== i) }); }
  function addTag(tag) { updateDraft({ vibe_tags: [...draft.vibe_tags, tag] }); }
  function removeTag(i) { updateDraft({ vibe_tags: draft.vibe_tags.filter((_, idx) => idx !== i) }); }

  const amenities = draft.amenities || [];
  function toggleAmenity(key, label) {
    const already = amenities.some((a) => a.icon === key);
    updateDraft({
      amenities: already
        ? amenities.filter((a) => a.icon !== key)
        : [...amenities, { icon: key, label }],
    });
  }

  function removeAmenityAt(i) {
    updateDraft({ amenities: amenities.filter((_, idx) => idx !== i) });
  }
  function addCustomAmenity() {
    const label = customLabel.trim();
    if (!label || !customIcon) return;
    updateDraft({ amenities: [...amenities, { icon: customIcon, label }] });
    setCustomLabel(""); setCustomIcon(""); setCreatingAmenity(false);
  }

  const amenityQuery = amenitySearch.trim().toLowerCase();
  const visibleAmenities = amenityQuery
    ? AMENITY_ICONS.filter((a) => a.label.toLowerCase().includes(amenityQuery))
    : showAllAmenities
      ? AMENITY_ICONS
      : AMENITY_ICONS.filter((a) => COMMON_AMENITY_KEYS.includes(a.key) || amenities.some((sel) => sel.icon === a.key));

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
        {/* Amenities */}
        <div>
          <SectionLabel>Property amenities</SectionLabel>
          <SectionDesc>Search and select what your property offers. These appear on your listing page.</SectionDesc>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search size={16} color="var(--sage)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              value={amenitySearch}
              onChange={(e) => setAmenitySearch(e.target.value)}
              placeholder="Search amenities (e.g., WiFi, pool, hot tub)"
              style={{ width: "100%", padding: "11px 14px 11px 40px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.875rem", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {!amenityQuery && (
            <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--sage)", marginBottom: 8 }}>
              {showAllAmenities ? "All amenities" : "Most common"}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {visibleAmenities.map(({ key, label, Icon }) => {
              const selected = amenities.some((a) => a.icon === key);
              return (
                <button
                  key={key}
                  onClick={() => toggleAmenity(key, label)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 12px", borderRadius: "0.875rem",
                    border: selected ? "1.5px solid rgba(45,106,79,0.3)" : "1.5px solid rgba(25,37,36,0.1)",
                    background: selected ? "rgba(209,235,219,0.6)" : "rgba(255,255,255,0.7)",
                    cursor: "pointer", transition: "all 120ms",
                    fontFamily: "Satoshi, sans-serif", fontSize: 12, fontWeight: 600,
                    color: selected ? "#2d6a4f" : "var(--slate)", textAlign: "left",
                  }}
                >
                  <Icon size={15} strokeWidth={1.75} color={selected ? "#2d6a4f" : "var(--slate)"} />
                  {label}
                </button>
              );
            })}
          </div>

          {amenityQuery && visibleAmenities.length === 0 && (
            <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--sage)", padding: "8px 2px" }}>No amenities match "{amenitySearch}".</div>
          )}

          {!amenityQuery && (
            <button
              onClick={() => setShowAllAmenities((v) => !v)}
              style={{ marginTop: 10, background: "none", border: "none", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 13, fontWeight: 600, color: "var(--slate)", textDecoration: "underline", padding: 0 }}
            >
              {showAllAmenities ? "Show common only" : "Show all amenities"}
            </button>
          )}

          {/* Selected amenities (standard + custom) */}
          {amenities.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>Selected ({amenities.length})</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {amenities.map((a, i) => {
                  const IconC = ICON_PALETTE.find((p) => p.key === a.icon)?.Icon;
                  return (
                    <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 9999, background: "rgba(209,235,219,0.6)", border: "1.5px solid rgba(45,106,79,0.3)", fontFamily: "Satoshi, sans-serif", fontSize: 12.5, fontWeight: 600, color: "#2d6a4f" }}>
                      {IconC && <IconC size={14} strokeWidth={1.75} color="#2d6a4f" />}
                      {a.label}
                      <button onClick={() => removeAmenityAt(i)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "#2d6a4f", padding: 0 }}>
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create your own amenity */}
          <div style={{ marginTop: 16 }}>
            {!creatingAmenity ? (
              <button
                onClick={() => setCreatingAmenity(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 9999, border: "1.5px dashed rgba(25,37,36,0.25)", background: "transparent", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}
              >
                <Wand2 size={15} /> Create your own amenity
              </button>
            ) : (
              <div style={{ background: "rgba(255,255,255,0.7)", border: "1.5px solid rgba(25,37,36,0.12)", borderRadius: "0.875rem", padding: 16 }}>
                <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>Create a custom amenity</div>
                <input
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="Name your amenity (e.g., Rooftop Hammock)"
                  style={{ width: "100%", padding: "11px 14px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.75rem", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none", boxSizing: "border-box", marginBottom: 12 }}
                />
                <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--slate)", marginBottom: 8 }}>Choose a graphic</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, maxHeight: 168, overflowY: "auto", paddingRight: 2 }}>
                  {ICON_PALETTE.map(({ key, label, Icon }) => {
                    const sel = customIcon === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setCustomIcon(key)}
                        title={label}
                        style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "0.625rem", cursor: "pointer", border: sel ? "1.5px solid #2d6a4f" : "1.5px solid rgba(25,37,36,0.12)", background: sel ? "rgba(209,235,219,0.7)" : "#fff" }}
                      >
                        <Icon size={18} strokeWidth={1.75} color={sel ? "#2d6a4f" : "var(--slate)"} />
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button
                    onClick={() => { setCreatingAmenity(false); setCustomLabel(""); setCustomIcon(""); }}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 9999, border: "1.5px solid rgba(25,37,36,0.15)", background: "transparent", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--ink)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addCustomAmenity}
                    disabled={!customLabel.trim() || !customIcon}
                    style={{ flex: 2, padding: "10px 0", borderRadius: 9999, border: "none", background: (customLabel.trim() && customIcon) ? "var(--ink)" : "rgba(25,37,36,0.14)", cursor: (customLabel.trim() && customIcon) ? "pointer" : "not-allowed", fontFamily: "Satoshi, sans-serif", fontSize: 13, fontWeight: 700, color: (customLabel.trim() && customIcon) ? "#fff" : "var(--slate)" }}
                  >
                    Add amenity
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

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

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <button
              onClick={() => updateDraft({ affiliate_code: generateCollabCode(draft.title) })}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--slate)", fontWeight: 600, padding: 0 }}
            >
              <Sparkles size={14} />
              {draft.affiliate_code ? "Regenerate" : "Generate"} Collabnb Code
            </button>
            {draft.affiliate_code && (
              <button
                onClick={() => updateDraft({ affiliate_code: generateCollabCode(draft.title) })}
                title="Shuffle code"
                style={{ background: "none", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.5rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, color: "var(--sage)", transition: "background 120ms, color 120ms" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(25,37,36,0.06)"; e.currentTarget.style.color = "var(--ink)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--sage)"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
                  <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
                </svg>
              </button>
            )}
          </div>

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
          <SectionDesc>Set a max number of confirmed collabs for this listing. Once reached, the listing auto-pauses.</SectionDesc>

          {/* Limited / Unlimited toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[{ k: "limited", label: "Set a limit" }, { k: "unlimited", label: "Unlimited" }].map((opt) => {
              const isUnlimited = draft.maxOffers === "" || draft.maxOffers == null;
              const active = opt.k === "unlimited" ? isUnlimited : !isUnlimited;
              return (
                <button
                  key={opt.k}
                  onClick={() => updateDraft({ maxOffers: opt.k === "unlimited" ? "" : (draft.maxOffers || 3) })}
                  style={{
                    flex: 1, padding: "10px", borderRadius: "0.75rem", cursor: "pointer",
                    border: `1.5px solid ${active ? "var(--ink)" : "rgba(25,37,36,0.12)"}`,
                    background: active ? "var(--ink)" : "rgba(255,255,255,0.7)",
                    color: active ? "#fff" : "var(--slate)",
                    fontFamily: "Satoshi, sans-serif", fontSize: 13, fontWeight: 600,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {!(draft.maxOffers === "" || draft.maxOffers == null) && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, fontWeight: 600, color: "var(--slate)" }}>Number of collabs</span>
                <span style={{ fontFamily: "Satoshi, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{draft.maxOffers}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={draft.maxOffers || 1}
                onChange={(e) => updateDraft({ maxOffers: parseInt(e.target.value, 10) })}
                style={{ width: "100%", accentColor: "var(--ink)", height: 4, cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "Satoshi, sans-serif", fontSize: 11, color: "var(--sage)" }}>1</span>
                <span style={{ fontFamily: "Satoshi, sans-serif", fontSize: 11, color: "var(--sage)" }}>10</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </WizardShell>
  );
}
