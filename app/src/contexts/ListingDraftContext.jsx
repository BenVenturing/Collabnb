import { createContext, useContext, useState, useEffect } from "react";
import { computeLoadTier, totalPoints, DELIVERABLE_LABELS } from "../../convex/lib/compensationPoints";

const STORAGE_KEY = "collabnb_listing_draft_v1";

const DEFAULT_USAGE_RIGHTS = "Host receives perpetual, worldwide license for marketing use. Creator retains ownership and portfolio rights.";

const DELIVERABLE_PRESETS = {
  // ~6 total
  light: [
    { type: "Instagram Reels", quantity: 2, description: "Highlight property and experience", usage_rights: DEFAULT_USAGE_RIGHTS },
    { type: "Stories", quantity: 2, description: "Behind-the-scenes moments", usage_rights: DEFAULT_USAGE_RIGHTS },
    { type: "Photos", quantity: 2, description: "High-quality property shots", usage_rights: DEFAULT_USAGE_RIGHTS },
  ],
  // ~12 total
  moderate: [
    { type: "Instagram Reels", quantity: 3, description: "Highlight property and experience", usage_rights: DEFAULT_USAGE_RIGHTS },
    { type: "Stories", quantity: 4, description: "Behind-the-scenes moments", usage_rights: DEFAULT_USAGE_RIGHTS },
    { type: "Photos", quantity: 5, description: "High-quality property shots", usage_rights: DEFAULT_USAGE_RIGHTS },
  ],
  // ~20 total
  heavy: [
    { type: "TikTok Videos", quantity: 3, description: "Full property tour and day in the life", usage_rights: DEFAULT_USAGE_RIGHTS },
    { type: "Instagram Reels", quantity: 5, description: "Highlight property and experience", usage_rights: DEFAULT_USAGE_RIGHTS },
    { type: "Stories", quantity: 6, description: "Behind-the-scenes moments", usage_rights: DEFAULT_USAGE_RIGHTS },
    { type: "Photos", quantity: 6, description: "High-quality property shots", usage_rights: DEFAULT_USAGE_RIGHTS },
  ],
};

const EMPTY_DRAFT = {
  title: "",
  location_city: "",
  location_country: "",
  lat: undefined,
  lng: undefined,
  property_url: "",
  collaboration_brief: "",
  compensation_type: "paid",
  nights: 2,
  cash_amount: 0,
  currency: "USD",
  creator_tier: "",
  deliverable_load: "", // derived from `deliverables` points — never set manually
  deliverables: [], // points-based array: [{ type, quantity }] — feeds the pricing tool
  complexity: "standard", // 'standard' | 'complex'
  stay_value: 0, // declared $ value of the stay (Hybrid stay-offset math)
  images: [],
  amenities: [],
  perks: [],
  vibe_tags: [],
  affiliate_code: "",
  affiliate_percent: 0,
  collab_start: "",
  collab_end: "",
  date_ranges: [],
  turnaround_days: 14,
  deliverables_list: [],
  // Per-type usage-rights override for the auto (cost-calculator) deliverable
  // cards, keyed by the deliverable's display type label — lets a host
  // customize one of those cards without turning it into a separate custom
  // deliverable (which would double-count it and drop it from the pricing points).
  deliverable_usage_overrides: {},
  revision_policy: "1 round of minor revisions included. Major changes require mutual agreement.",
  usage_rights: DEFAULT_USAGE_RIGHTS,
  maxOffers: "",
};

function calculateFee(draft) {
  if (draft.compensation_type === "paid" || draft.compensation_type === "hybrid") {
    return Math.max(draft.cash_amount * 0.05, 25);
  }
  return 25;
}

const ListingDraftContext = createContext(null);

export function ListingDraftProvider({ children }) {
  const [draft, setDraft] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...EMPTY_DRAFT, ...JSON.parse(saved) } : { ...EMPTY_DRAFT };
    } catch {
      return { ...EMPTY_DRAFT };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {}
  }, [draft]);

  function updateDraft(fields) {
    setDraft((prev) => {
      const next = { ...prev, ...fields };
      // Load tier is always derived from points — never set manually.
      if (fields.deliverables) {
        next.deliverable_load = computeLoadTier(next.deliverables) || "";
      }
      return next;
    });
  }

  function loadDraft(fields) {
    setDraft({ ...EMPTY_DRAFT, ...fields });
  }

  function hydrateFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setDraft(saved ? { ...EMPTY_DRAFT, ...JSON.parse(saved) } : { ...EMPTY_DRAFT });
    } catch {
      setDraft({ ...EMPTY_DRAFT });
    }
  }

  function clearDraft() {
    setDraft({ ...EMPTY_DRAFT });
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    try { localStorage.removeItem('collabnb_editing_listing_id_v1'); } catch {}
  }

  const fee = calculateFee(draft);

  // Cards auto-derived from the cost calculator's points-based `deliverables`
  // array — kept separate from the user's hand-added `deliverables_list` cards
  // so the two stay linked without ever overwriting a manual edit. Always
  // placed first; `autoDeliverableCount` tells consumers where the editable
  // (custom) cards start.
  const autoDeliverables = (draft.deliverables || []).map((d) => {
    const type = DELIVERABLE_LABELS[d.type] || d.type;
    return {
      type,
      quantity: d.quantity,
      description: "",
      usage_rights: draft.deliverable_usage_overrides?.[type] || draft.usage_rights || DEFAULT_USAGE_RIGHTS,
    };
  });
  const autoDeliverableCount = autoDeliverables.length;
  const combinedDeliverablesList = [...autoDeliverables, ...draft.deliverables_list];

  const totalDeliverables = combinedDeliverablesList.reduce((sum, d) => sum + d.quantity, 0);
  const formatCount = combinedDeliverablesList.length;
  const pricingPoints = totalPoints(draft.deliverables);

  return (
    <ListingDraftContext.Provider value={{ draft, updateDraft, loadDraft, hydrateFromStorage, clearDraft, fee, totalDeliverables, formatCount, pricingPoints, combinedDeliverablesList, autoDeliverableCount, DELIVERABLE_PRESETS, DEFAULT_USAGE_RIGHTS }}>
      {children}
    </ListingDraftContext.Provider>
  );
}

export function useListingDraft() {
  const ctx = useContext(ListingDraftContext);
  if (!ctx) throw new Error("useListingDraft must be used within ListingDraftProvider");
  return ctx;
}
