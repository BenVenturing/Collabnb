import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ROLE_STORAGE_KEY = "@collabnb:user_role";

/**
 * RoleStore - Centralized role management
 * Stores user role (creator/host) persistently in AsyncStorage
 */
const useRoleStore = create((set, get) => ({
  role: null, // "creator" | "host" | null
  isRoleReady: false,

  /**
   * Load role from AsyncStorage on app start
   */
  loadRole: async () => {
    try {
      const storedRole = await AsyncStorage.getItem(ROLE_STORAGE_KEY);
      if (storedRole) {
        set({ role: storedRole, isRoleReady: true });
      } else {
        set({ isRoleReady: true });
      }
    } catch (error) {
      console.error("Failed to load role from storage:", error);
      set({ isRoleReady: true });
    }
  },

  /**
   * Save role to AsyncStorage and update state
   */
  setRole: async (newRole) => {
    try {
      if (newRole) {
        await AsyncStorage.setItem(ROLE_STORAGE_KEY, newRole);
      } else {
        await AsyncStorage.removeItem(ROLE_STORAGE_KEY);
      }
      set({ role: newRole });
    } catch (error) {
      console.error("Failed to save role to storage:", error);
    }
  },

  /**
   * Clear role (e.g., on logout)
   */
  clearRole: async () => {
    try {
      await AsyncStorage.removeItem(ROLE_STORAGE_KEY);
      set({ role: null });
    } catch (error) {
      console.error("Failed to clear role:", error);
    }
  },
}));

export default useRoleStore;
