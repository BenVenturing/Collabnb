import AsyncStorage from "@react-native-async-storage/async-storage";

const DRAFT_KEY = "@collabnb_host_listing_draft_v1";
const LISTINGS_KEY = "@collabnb_host_listings_local_v1";

// Default empty draft structure
const getEmptyDraft = () => ({
  // Basics
  title: "",
  location_city: "",
  location_country: "",
  airbnb_url: "",
  collaboration_brief: "",
  compensation_type: "free_stay", // "free_stay" | "paid" | "hybrid"
  stay_nights: 2,
  cash_payout: 0,
  creator_tier_required: "micro",
  deliverable_load: "moderate",
  images: [], // local URIs from image picker

  // Offer
  perks: [],
  vibe_tags: [],
  affiliate_code: "",

  // Deliverables & Dates
  collaboration_window: { startDate: "", endDate: "" },
  deliverables_due_date: "",
  turnaround_time_days: 14,
  deliverables: [],

  // Policies
  revision_policy:
    "1 round of minor revisions included. Major changes require mutual agreement.",
  usage_rights:
    "Host receives perpetual, worldwide license for marketing use. Creator retains ownership and portfolio rights.",
  dispute_note:
    "Disputes handled via Collabnb mediation. Payment held in escrow until deliverables approved.",

  // CRM-friendly fields
  status: "draft",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  collabStages: ["Apply & Pitch", "Confirm Terms", "Deliver & Get Paid"],
  hostInternalNotes: "",
});

class ListingDraftStore {
  constructor() {
    this.draft = getEmptyDraft();
    this.listeners = [];
  }

  async init() {
    try {
      const stored = await AsyncStorage.getItem(DRAFT_KEY);
      if (stored) {
        this.draft = JSON.parse(stored);
      } else {
        this.draft = getEmptyDraft();
      }
    } catch (error) {
      console.error("Failed to load listing draft:", error);
      this.draft = getEmptyDraft();
    }
  }

  async persist() {
    try {
      this.draft.updatedAt = new Date().toISOString();
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(this.draft));
      this.notifyListeners();
    } catch (error) {
      console.error("Failed to persist listing draft:", error);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  getDraft() {
    return this.draft;
  }

  async updateDraft(updates) {
    this.draft = { ...this.draft, ...updates };
    await this.persist();
  }

  async clearDraft() {
    this.draft = getEmptyDraft();
    await AsyncStorage.removeItem(DRAFT_KEY);
    this.notifyListeners();
  }

  // Calculate host fees
  calculateFee() {
    const { compensation_type, cash_payout } = this.draft;

    if (compensation_type === "free_stay") {
      return {
        type: "flat",
        amount: 20,
        description: "Free/Exchange listing fee",
      };
    }

    // Paid or Hybrid
    const percentFee = Math.round(cash_payout * 0.08);
    const finalFee = Math.max(20, Math.min(100, percentFee));

    return {
      type: "percentage",
      percent: 8,
      min: 20,
      max: 100,
      calculatedFee: finalFee,
      description: `8% of $${cash_payout} (min $20, max $100)`,
    };
  }

  // Toggle listing status (published <-> unpublished)
  static async toggleListingStatus(listingId) {
    try {
      const stored = await AsyncStorage.getItem(LISTINGS_KEY);
      const listings = stored ? JSON.parse(stored) : [];

      const listing = listings.find((l) => l.id === listingId);
      if (listing) {
        listing.status =
          listing.status === "published" ? "unpublished" : "published";
        listing.updatedAt = new Date().toISOString();
        await AsyncStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
      }

      return listing;
    } catch (error) {
      console.error("Failed to toggle listing status:", error);
      throw error;
    }
  }

  // Update a specific listing in the store
  static async updateListingInStore(listingId, updates) {
    try {
      const stored = await AsyncStorage.getItem(LISTINGS_KEY);
      const listings = stored ? JSON.parse(stored) : [];

      const index = listings.findIndex((l) => l.id === listingId);
      if (index !== -1) {
        listings[index] = {
          ...listings[index],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
        return listings[index];
      }

      return null;
    } catch (error) {
      console.error("Failed to update listing:", error);
      throw error;
    }
  }

  // Get a single listing by ID
  static async getListingById(listingId) {
    try {
      const stored = await AsyncStorage.getItem(LISTINGS_KEY);
      const listings = stored ? JSON.parse(stored) : [];
      return listings.find((l) => l.id === listingId);
    } catch (error) {
      console.error("Failed to get listing by ID:", error);
      return null;
    }
  }

  // Publish listing (save to local listings array)
  async publishListing() {
    try {
      const fee = this.calculateFee();

      // Build complete listing object
      const listing = {
        id: `listing_${Date.now()}`,
        ...this.draft,
        status: "published",
        publishedAt: new Date().toISOString(),
        feeModel: fee,
        bargaining_mode_enabled: false,
        images: this.draft.images || [],
        value_estimate:
          this.draft.compensation_type === "free_stay"
            ? this.draft.stay_nights * 200
            : this.draft.cash_payout,
        brand_guidelines: {
          vibe_tags: this.draft.vibe_tags || [],
          dos: [],
          donts: [],
          required_tags: [],
          required_mentions: [],
        },
        ideal_creator: {
          platforms: [],
          niche_tags: [],
          notes: [],
        },
        host: {
          name: "Host",
          brand_name: "Your Property",
          verified: false,
        },
        things_to_know: {
          revision_policy: this.draft.revision_policy,
          usage_rights: this.draft.usage_rights,
          dispute_note: this.draft.dispute_note,
        },
      };

      // Get existing listings
      const stored = await AsyncStorage.getItem(LISTINGS_KEY);
      const listings = stored ? JSON.parse(stored) : [];

      // Add new listing
      listings.unshift(listing);

      // Save
      await AsyncStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));

      // Clear draft
      await this.clearDraft();

      return listing;
    } catch (error) {
      console.error("Failed to publish listing:", error);
      throw error;
    }
  }

  // Update an existing listing
  async updateExistingListing(listingId, updates) {
    try {
      const fee = this.calculateFee();

      // Build updated listing object
      const updatedListing = {
        ...updates,
        id: listingId,
        updatedAt: new Date().toISOString(),
        feeModel: fee,
        images: updates.images || [],
        value_estimate:
          updates.compensation_type === "free_stay"
            ? updates.stay_nights * 200
            : updates.cash_payout,
        brand_guidelines: {
          vibe_tags: updates.vibe_tags || [],
          dos: [],
          donts: [],
          required_tags: [],
          required_mentions: [],
        },
        ideal_creator: {
          platforms: [],
          niche_tags: [],
          notes: [],
        },
        host: {
          name: "Host",
          brand_name: "Your Property",
          verified: false,
        },
        things_to_know: {
          revision_policy: updates.revision_policy,
          usage_rights: updates.usage_rights,
          dispute_note: updates.dispute_note,
        },
      };

      // Get existing listings
      const stored = await AsyncStorage.getItem(LISTINGS_KEY);
      const listings = stored ? JSON.parse(stored) : [];

      // Find and update the listing
      const index = listings.findIndex((l) => l.id === listingId);
      if (index !== -1) {
        listings[index] = {
          ...listings[index],
          ...updatedListing,
        };
      }

      // Save
      await AsyncStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));

      // Clear draft
      await this.clearDraft();

      return listings[index];
    } catch (error) {
      console.error("Failed to update existing listing:", error);
      throw error;
    }
  }

  // Get all published listings
  static async getPublishedListings() {
    try {
      const stored = await AsyncStorage.getItem(LISTINGS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to get published listings:", error);
      return [];
    }
  }
}

export default new ListingDraftStore();
