import { createContext, useContext, useState, useEffect } from "react";

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
  property_url: "",
  collaboration_brief: "",
  compensation_type: "free_stay",
  nights: 2,
  cash_amount: 0,
  currency: "USD",
  creator_tier: "",
  deliverable_load: "",
  images: [],
  amenities: [],
  perks: [],
  vibe_tags: [],
  affiliate_code: "",
  affiliate_percent: 0,
  collab_start: "",
  collab_end: "",
  turnaround_days: 14,
  deliverables_list: [],
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
      // Auto-populate deliverables when load changes and list is empty or was auto-populated
      if (fields.deliverable_load && fields.deliverable_load !== prev.deliverable_load) {
        const preset = DELIVERABLE_PRESETS[fields.deliverable_load];
        if (preset) next.deliverables_list = preset;
      }
      return next;
    });
  }

  function clearDraft() {
    setDraft({ ...EMPTY_DRAFT });
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  const fee = calculateFee(draft);

  const totalDeliverables = draft.deliverables_list.reduce((sum, d) => sum + d.quantity, 0);
  const formatCount = draft.deliverables_list.length;

  return (
    <ListingDraftContext.Provider value={{ draft, updateDraft, clearDraft, fee, totalDeliverables, formatCount, DELIVERABLE_PRESETS, DEFAULT_USAGE_RIGHTS }}>
      {children}
    </ListingDraftContext.Provider>
  );
}

export function useListingDraft() {
  const ctx = useContext(ListingDraftContext);
  if (!ctx) throw new Error("useListingDraft must be used within ListingDraftProvider");
  return ctx;
}
