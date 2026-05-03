import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@collabnb_creator_onboarding_draft";

const useCreatorOnboardingStore = create((set, get) => ({
  // Step 1: Basic Info
  profilePhoto: "",
  displayName: "",
  username: "",
  shortBio: "",

  // Step 2: Social Links
  instagramUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",
  personalWebsite: "",

  // Step 3: Portfolio
  portfolioItems: [],

  // Approval status
  creatorApprovalStatus: "not_submitted", // "not_submitted" | "pending" | "approved"

  // Actions
  updateField: (field, value) => {
    set({ [field]: value });
    get().saveDraft();
  },

  updateMultipleFields: (fields) => {
    set(fields);
    get().saveDraft();
  },

  saveDraft: async () => {
    try {
      const state = get();
      const draftData = {
        profilePhoto: state.profilePhoto,
        displayName: state.displayName,
        username: state.username,
        shortBio: state.shortBio,
        instagramUrl: state.instagramUrl,
        tiktokUrl: state.tiktokUrl,
        youtubeUrl: state.youtubeUrl,
        personalWebsite: state.personalWebsite,
        portfolioItems: state.portfolioItems,
        creatorApprovalStatus: state.creatorApprovalStatus,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
    } catch (error) {
      console.error("Failed to save creator onboarding draft:", error);
    }
  },

  loadDraft: async () => {
    try {
      const draft = await AsyncStorage.getItem(STORAGE_KEY);
      if (draft) {
        set(JSON.parse(draft));
      }
    } catch (error) {
      console.error("Failed to load creator onboarding draft:", error);
    }
  },

  clearDraft: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      set({
        profilePhoto: "",
        displayName: "",
        username: "",
        shortBio: "",
        instagramUrl: "",
        tiktokUrl: "",
        youtubeUrl: "",
        personalWebsite: "",
        portfolioItems: [],
        creatorApprovalStatus: "not_submitted",
      });
    } catch (error) {
      console.error("Failed to clear creator onboarding draft:", error);
    }
  },
}));

export default useCreatorOnboardingStore;
