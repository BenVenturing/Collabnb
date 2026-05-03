import React, { useState, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getTheme, subscribeToTheme, THEMES } from "../utils/ThemeStore";

export default function ThemedBackground({ children, style }) {
  const [themeId, setThemeId] = useState("white");

  useEffect(() => {
    getTheme().then((id) => {
      if (id) setThemeId(id);
    });
    const unsub = subscribeToTheme((id) => setThemeId(id));
    return unsub;
  }, []);

  const theme =
    THEMES.find((t) => t.id === themeId) ||
    THEMES.find((t) => t.id === "white");

  // For white theme, render plain View instead of LinearGradient to avoid gradient artifacts
  if (themeId === "white") {
    return (
      <View style={[{ flex: 1, backgroundColor: "#FFFFFF" }, style]}>
        {children}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={theme.colors}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[StyleSheet.absoluteFill, style]}
    >
      {children}
    </LinearGradient>
  );
}
