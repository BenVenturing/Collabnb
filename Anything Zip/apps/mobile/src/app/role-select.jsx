import { Redirect } from "expo-router";

export default function RoleSelectScreen() {
  // Role selection is now integrated into the signup screen
  return <Redirect href="/signup" />;
}
