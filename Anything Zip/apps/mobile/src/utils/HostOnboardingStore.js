import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@collabnb_host_onboarding_draft";

const useHostOnboardingStore = create((set, get) => ({
  // Step 1: Property & Verification
  workEmail: "",
  airbnbUrl: "",
  instagramUrl: "",
  websiteUrl: "",

  // Step 2: Host Profile
  fullName: "",
  businessName: "",
  contactEmail: "",
  phone: "",

  // Step 3: Optional first listing
  createFirstListing: false,
  collaborationType: "",
  deliverablePreset: "",
  creatorTier: "",
  collaborationWindow: { start: null, end: null },
  deliverablesDue: "",

  // Pricing & Fees (new)
  pricingType: "free", // "free" | "paid"
  cashValue: "",
  calculatedFee: 0,

  // Approval status
  hostApprovalStatus: "not_submitted", // "not_submitted" | "pending" | "approved"

  // Actions
  updateField: (field, value) => {
    set({ [field]: value });

    // Auto-calculate fee when cash value changes
    if (field === "cashValue" || field === "pricingType") {
      get().calculateFee();
    }

    get().saveDraft();
  },

  updateMultipleFields: (fields) => {
    set(fields);
    get().saveDraft();
  },

  calculateFee: () => {
    const { pricingType, cashValue } = get();

    if (pricingType === "free") {
      set({ calculatedFee: 20 });
    } else if (pricingType === "paid" && cashValue) {
      const value = parseFloat(cashValue) || 0;
      const eightPercent = value * 0.08;
      const fee = Math.max(20, Math.min(100, eightPercent));
      set({ calculatedFee: Math.round(fee * 100) / 100 });
    } else {
      set({ calculatedFee: 0 });
    }
  },

  saveDraft: async () => {
    try {
      const state = get();
      const draftData = {
        workEmail: state.workEmail,
        airbnbUrl: state.airbnbUrl,
        instagramUrl: state.instagramUrl,
        websiteUrl: state.websiteUrl,
        fullName: state.fullName,
        businessName: state.businessName,
        contactEmail: state.contactEmail,
        phone: state.phone,
        createFirstListing: state.createFirstListing,
        collaborationType: state.collaborationType,
        deliverablePreset: state.deliverablePreset,
        creatorTier: state.creatorTier,
        collaborationWindow: state.collaborationWindow,
        deliverablesDue: state.deliverablesDue,
        pricingType: state.pricingType,
        cashValue: state.cashValue,
        calculatedFee: state.calculatedFee,
        hostApprovalStatus: state.hostApprovalStatus,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
    } catch (error) {
      console.error("Failed to save host onboarding draft:", error);
    }
  },

  loadDraft: async () => {
    try {
      const draft = await AsyncStorage.getItem(STORAGE_KEY);
      if (draft) {
        set(JSON.parse(draft));
      }
    } catch (error) {
      console.error("Failed to load host onboarding draft:", error);
    }
  },

  clearDraft: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      set({
        workEmail: "",
        airbnbUrl: "",
        instagramUrl: "",
        websiteUrl: "",
        fullName: "",
        businessName: "",
        contactEmail: "",
        phone: "",
        createFirstListing: false,
        collaborationType: "",
        deliverablePreset: "",
        creatorTier: "",
        collaborationWindow: { start: null, end: null },
        deliverablesDue: "",
        pricingType: "free",
        cashValue: "",
        calculatedFee: 0,
        hostApprovalStatus: "not_submitted",
      });
    } catch (error) {
      console.error("Failed to clear host onboarding draft:", error);
    }
  },
}));

export default useHostOnboardingStore;
