import { createContext, useContext, useState, useEffect } from "react";

const STORAGE_KEY = "collabnb_listing_draft_v1";

const DELIVERABLE_PRESETS = {
  light: [
    { type: "Reels", quantity: 2, description: "Highlight property and experience" },
    { type: "Stories", quantity: 3, description: "Behind-the-scenes moments" },
    { type: "Photos", quantity: 5, description: "High-quality property shots" },
  ],
  moderate: [
    { type: "TikTok Videos", quantity: 2, description: "Day in the life, property tour" },
    { type: "Instagram Reels", quantity: 3, description: "Highlight property and experience" },
    { type: "Stories", quantity: 5, description: "Behind-the-scenes moments" },
    { type: "Photos", quantity: 10, description: "High-quality property shots" },
  ],
  heavy: [
    { type: "TikTok Videos", quantity: 4, description: "Full property tour and day in the life" },
    { type: "Instagram Reels", quantity: 5, description: "Highlight property and experience" },
    { type: "Stories", quantity: 8, description: "Behind-the-scenes moments" },
    { type: "YouTube Shorts", quantity: 2, description: "Short-form property showcase" },
    { type: "Photos", quantity: 15, description: "High-quality property shots" },
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
  creator_tier: "",
  deliverable_load: "",
  images: [],
  perks: [],
  vibe_tags: [],
  affiliate_code: "",
  affiliate_percent: 0,
  collab_start: "",
  collab_end: "",
  turnaround_days: 14,
  deliverables_list: [],
  revision_policy: "1 round of minor revisions included. Major changes require mutual agreement.",
  usage_rights: "Host receives perpetual, worldwide license for marketing use. Creator retains ownership and portfolio rights.",
  maxOffers: "",
};

function calculateFee(draft) {
  if (draft.compensation_type === "paid" || draft.compensation_type === "hybrid") {
    const pct = draft.cash_amount * 0.08;
    return Math.min(Math.max(pct, 20), 100);
  }
  return 20;
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
    <ListingDraftContext.Provider value={{ draft, updateDraft, clearDraft, fee, totalDeliverables, formatCount, DELIVERABLE_PRESETS }}>
      {children}
    </ListingDraftContext.Provider>
  );
}

export function useListingDraft() {
  const ctx = useContext(ListingDraftContext);
  if (!ctx) throw new Error("useListingDraft must be used within ListingDraftProvider");
  return ctx;
}
