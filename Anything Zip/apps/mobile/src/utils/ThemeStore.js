import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_KEY = "@collabnb_bg_theme_v1";

export const THEMES = [
  {
    id: "white",
    label: "Plain White",
    colors: ["#FFFFFF", "#FFFFFF", "#FFFFFF"],
  },
  {
    id: "forest",
    label: "Deep Forest",
    colors: ["#c0d0bc", "#cddcc7", "#dce8d6"],
  },
  { id: "dusk", label: "Dusk", colors: ["#c9c0d4", "#d4c8e0", "#e8e2f0"] },
  {
    id: "sand",
    label: "Golden Sand",
    colors: ["#d4c9b0", "#e0d4bc", "#ece4d0"],
  },
  {
    id: "ocean",
    label: "Ocean Mist",
    colors: ["#b0c4d4", "#bccede", "#d0dfe8"],
  },
  { id: "rose", label: "Rose Fog", colors: ["#d4b8b8", "#dfc8c8", "#ecdcdc"] },
];

const DEFAULT_THEME = "white";

const listeners = new Set();

export function subscribeToTheme(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export async function getTheme() {
  try {
    const saved = await AsyncStorage.getItem(THEME_KEY);
    return saved || DEFAULT_THEME;
  } catch (error) {
    console.error("Failed to load theme:", error);
    return DEFAULT_THEME;
  }
}

export async function setTheme(themeId) {
  try {
    await AsyncStorage.setItem(THEME_KEY, themeId);
    listeners.forEach((cb) => cb(themeId));
  } catch (error) {
    console.error("Failed to save theme:", error);
    throw error;
  }
}

export default {
  getTheme,
  setTheme,
  subscribeToTheme,
  THEMES,
};
