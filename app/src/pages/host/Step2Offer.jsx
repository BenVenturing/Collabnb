import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, Sparkles, Search, Wand2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
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

const VIBE_TAG_POOL = [
  "Cozy", "Luxury", "Adventure", "Minimalist", "Romantic", "Rustic", "Modern",
  "Tropical", "Boho", "Family-Friendly", "Pet-Friendly", "Remote Work", "Wellness",
  "Beachfront", "Mountain View", "Secluded", "Urban", "Historic", "Eco-Friendly",
  "Instagrammable", "Off-Grid", "Wine Country", "Desert", "Lakeside", "Treehouse",
  "Glamping", "Chef's Kitchen", "Pool Access", "Ski-In/Ski-Out", "Artsy",
];

// Keyword → tag matches scanned against the title/brief/amenities to power
// "Suggest from listing info" — intentionally simple substring matching, no
// external AI call needed for a handful of vibe words.
const VIBE_KEYWORDS = {
  "Cozy": ["cozy", "fireplace", "cabin", "wood stove", "blanket", "hearth"],
  "Luxury": ["luxury", "estate", "villa", "five-star", "5-star", "upscale", "chandelier"],
  "Adventure": ["hike", "hiking", "trek", "kayak", "adventure", "trail", "climbing", "surf"],
  "Romantic": ["romantic", "honeymoon", "couples", "candlelit", "intimate"],
  "Rustic": ["rustic", "log cabin", "barn", "farmhouse", "reclaimed wood"],
  "Modern": ["modern", "contemporary", "minimalist", "sleek", "architect"],
  "Tropical": ["tropical", "palm", "jungle", "rainforest", "island"],
  "Beachfront": ["beach", "ocean", "coastal", "seaside", "shore", "waterfront"],
  "Mountain View": ["mountain", "alpine", "peak", "ridge", "summit"],
  "Secluded": ["secluded", "private", "remote", "off-grid", "no neighbors", "acres"],
  "Family-Friendly": ["family", "kids", "playground", "kid-friendly"],
  "Pet-Friendly": ["pet-friendly", "dog-friendly", "pets welcome"],
  "Wellness": ["yoga", "spa", "meditation", "wellness", "sauna", "hot tub"],
  "Pool Access": ["pool", "infinity pool", "swimming"],
  "Wine Country": ["vineyard", "winery", "wine tasting"],
  "Desert": ["desert", "dune", "cactus"],
  "Lakeside": ["lake", "lakefront", "lakeside"],
  "Historic": ["historic", "heritage", "century-old", "restored"],
  "Eco-Friendly": ["eco-friendly", "sustainable", "solar-powered"],
  "Urban": ["downtown", "city center", "loft", "skyline"],
};

function suggestedVibeTagsFrom(draft, amenities) {
  const text = [draft.title, draft.collaboration_brief, ...amenities.map((a) => a.label)]
    .filter(Boolean).join(" ").toLowerCase();
  return Object.entries(VIBE_KEYWORDS)
    .filter(([, keywords]) => keywords.some((k) => text.includes(k)))
    .map(([tag]) => tag);
}

// Rotating pool of ideas shown as dashed chips below the tag input, plus a
// live filtered dropdown while typing — both draw from the same curated pool.
function VibeTagInput({ existing, onAdd }) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  function commit(raw) {
    const trimmed = raw.trim();
    if (trimmed) onAdd(trimmed);
    setValue("");
  }

  const query = value.trim().toLowerCase();
  const matches = query
    ? VIBE_TAG_POOL.filter((t) => t.toLowerCase().includes(query) && !existing.includes(t)).slice(0, 6)
    : [];

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commit(value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          placeholder="e.g., Cozy"
          style={{ flex: 1, padding: "12px 16px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.875rem", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none" }}
        />
        <button onClick={() => commit(value)} style={{ width: 44, height: 44, borderRadius: "0.875rem", background: "var(--ink)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Plus size={18} color="#fff" />
        </button>
      </div>
      {focused && matches.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 54, background: "#fff", border: "1.5px solid rgba(25,37,36,0.12)", borderRadius: "0.75rem", boxShadow: "0 10px 28px rgba(25,37,36,0.14)", zIndex: 5, overflow: "hidden" }}>
          {matches.map((m) => (
            <button key={m} onMouseDown={() => commit(m)} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", background: "none", border: "none", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--ink)" }}>
              {m}
            </button>
          ))}
        </div>
      )}
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
  const { t } = useTranslation('step2Offer');
  const navigate = useNavigate();
  const { draft, updateDraft } = useListingDraft();

  const [amenitySearch, setAmenitySearch] = useState("");
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [creatingAmenity, setCreatingAmenity] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customIcon, setCustomIcon] = useState("");
  const [tagSuggestionSeed, setTagSuggestionSeed] = useState(0);

  function addPerk(perk) { updateDraft({ perks: [...draft.perks, perk] }); }
  function removePerk(i) { updateDraft({ perks: draft.perks.filter((_, idx) => idx !== i) }); }
  function addTag(tag) {
    if (draft.vibe_tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    updateDraft({ vibe_tags: [...draft.vibe_tags, tag] });
  }
  function removeTag(i) { updateDraft({ vibe_tags: draft.vibe_tags.filter((_, idx) => idx !== i) }); }

  const tagIdeas = useMemo(() => {
    const pool = VIBE_TAG_POOL.filter((t) => !draft.vibe_tags.includes(t));
    return [...pool].sort(() => Math.random() - 0.5).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagSuggestionSeed, draft.vibe_tags.join("|")]);

  function suggestVibeTagsFromListing() {
    const matches = suggestedVibeTagsFrom(draft, amenities).filter((t) => !draft.vibe_tags.includes(t));
    if (matches.length) updateDraft({ vibe_tags: [...draft.vibe_tags, ...matches] });
  }

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
        {t('heading')}
      </h2>
      <p style={{ fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--slate)", margin: "0 0 32px" }}>
        {t('subtitle')}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {/* Amenities */}
        <div>
          <SectionLabel>{t('amenities.label')}</SectionLabel>
          <SectionDesc>{t('amenities.desc')}</SectionDesc>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search size={16} color="var(--sage)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              value={amenitySearch}
              onChange={(e) => setAmenitySearch(e.target.value)}
              placeholder={t('amenities.searchPlaceholder')}
              style={{ width: "100%", padding: "11px 14px 11px 40px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.875rem", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {!amenityQuery && (
            <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, color: "var(--sage)", marginBottom: 8 }}>
              {showAllAmenities ? t('amenities.allAmenities') : t('amenities.mostCommon')}
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
            <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--sage)", padding: "8px 2px" }}>{t('amenities.noMatch', { query: amenitySearch })}</div>
          )}

          {!amenityQuery && (
            <button
              onClick={() => setShowAllAmenities((v) => !v)}
              style={{ marginTop: 10, background: "none", border: "none", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 13, fontWeight: 600, color: "var(--slate)", textDecoration: "underline", padding: 0 }}
            >
              {showAllAmenities ? t('amenities.showCommonOnly') : t('amenities.showAllAmenities')}
            </button>
          )}

          {/* Selected amenities (standard + custom) */}
          {amenities.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>{t('amenities.selected', { count: amenities.length })}</div>
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
                <Wand2 size={15} /> {t('amenities.createOwn')}
              </button>
            ) : (
              <div style={{ background: "rgba(255,255,255,0.7)", border: "1.5px solid rgba(25,37,36,0.12)", borderRadius: "0.875rem", padding: 16 }}>
                <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>{t('amenities.createCustomHeading')}</div>
                <input
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder={t('amenities.namePlaceholder')}
                  style={{ width: "100%", padding: "11px 14px", border: "1.5px solid rgba(25,37,36,0.15)", borderRadius: "0.75rem", fontFamily: "Satoshi, sans-serif", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none", boxSizing: "border-box", marginBottom: 12 }}
                />
                <div style={{ fontFamily: "Satoshi, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--slate)", marginBottom: 8 }}>{t('amenities.chooseGraphic')}</div>
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
                const raw = e.target.value;
                if (raw === "") { updateDraft({ affiliate_percent: "" }); return; }
                const parsed = parseInt(raw, 10);
                if (Number.isNaN(parsed)) return;
                updateDraft({ affiliate_percent: Math.min(50, Math.max(0, parsed)) });
              }}
              onBlur={() => {
                if (draft.affiliate_percent === "") updateDraft({ affiliate_percent: 0 });
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

          <button
            onClick={suggestVibeTagsFromListing}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 10, padding: "9px 16px", borderRadius: 9999, border: "none", background: "var(--mint)", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 13, color: "var(--ink)", fontWeight: 700 }}
          >
            <Sparkles size={14} /> Suggest tags from listing info
          </button>

          <VibeTagInput existing={draft.vibe_tags} onAdd={addTag} />
          <PillList items={draft.vibe_tags} onRemove={removeTag} color="rgba(209,235,219,0.6)" />

          {tagIdeas.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 12 }}>
              <span style={{ fontFamily: "Satoshi, sans-serif", fontSize: 11.5, color: "var(--sage)", marginRight: 2 }}>Ideas:</span>
              {tagIdeas.map((t) => (
                <button
                  key={t}
                  onClick={() => addTag(t)}
                  style={{ padding: "5px 11px", borderRadius: 9999, border: "1.5px dashed rgba(25,37,36,0.22)", background: "transparent", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--slate)" }}
                >
                  + {t}
                </button>
              ))}
              <button
                onClick={() => setTagSuggestionSeed((s) => s + 1)}
                title="Show different ideas"
                style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "var(--mint)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <RefreshCw size={12} color="var(--ink)" />
              </button>
            </div>
          )}
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
