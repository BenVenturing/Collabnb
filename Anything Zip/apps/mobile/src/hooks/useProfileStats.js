import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";

export function useProfileStats() {
  const [stats, setStats] = useState({
    followers: 413500,
    engagement: 8.2,
    collabs: 47,
    lastUpdated: new Date(),
  });

  const refreshStats = useCallback(() => {
    // TODO: Replace with actual API call when backend exists
    // For now, simulate slight variation to show "active" updates
    setStats({
      followers: 413500 + Math.floor(Math.random() * 100),
      engagement: 8.2 + (Math.random() * 0.2 - 0.1),
      collabs: 47,
      lastUpdated: new Date(),
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshStats();
    }, [refreshStats]),
  );

  return { stats, refreshStats };
}
