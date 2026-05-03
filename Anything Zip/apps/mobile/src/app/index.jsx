import { Redirect } from "expo-router";
import { useEffect } from "react";
import useRoleStore from "@/utils/RoleStore";

export default function Index() {
  const { role, isRoleReady, loadRole } = useRoleStore();

  useEffect(() => {
    loadRole();
  }, [loadRole]);

  // Wait for role to load before routing (prevents flicker)
  if (!isRoleReady) {
    return null;
  }

  // Role-based routing
  if (role === "host") {
    return <Redirect href="/host/(tabs)/dashboard" />;
  }

  // Default to creator tabs (for creators or users without role set)
  return <Redirect href="/(tabs)" />;
}
