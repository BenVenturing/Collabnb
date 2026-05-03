import { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import useRoleStore from "@/utils/RoleStore";
import useHostOnboardingStore from "@/utils/HostOnboardingStore";
import useCreatorOnboardingStore from "@/utils/CreatorOnboardingStore";

export function useRoleSwitch() {
  const router = useRouter();
  const { setRole } = useRoleStore();
  const { hostApprovalStatus } = useHostOnboardingStore();
  const { creatorApprovalStatus } = useCreatorOnboardingStore();

  const [showRoleSwitchModal, setShowRoleSwitchModal] = useState(false);
  const [pendingTargetRole, setPendingTargetRole] = useState(null);
  const [isSwitching, setIsSwitching] = useState(false);

  const attemptRoleSwitch = async (targetRole) => {
    const targetApprovalStatus =
      targetRole === "host" ? hostApprovalStatus : creatorApprovalStatus;

    if (targetApprovalStatus === "approved") {
      setIsSwitching(true);
      try {
        await setRole(targetRole);

        setTimeout(() => {
          setIsSwitching(false);

          if (targetRole === "host") {
            router.replace("/host/(tabs)/collabs");
          } else {
            router.replace("/(tabs)");
          }
        }, 400);
      } catch (error) {
        setIsSwitching(false);
        Alert.alert("Error", "Failed to switch roles. Please try again.");
      }
    } else if (targetApprovalStatus === "not_submitted") {
      setPendingTargetRole(targetRole);
      setShowRoleSwitchModal(true);
    } else if (targetApprovalStatus === "pending") {
      Alert.alert(
        `${targetRole === "host" ? "Host" : "Creator"} setup pending`,
        "Your application is under review. We'll notify you when you're approved.",
        [{ text: "OK" }],
      );
    }
  };

  const startOnboarding = () => {
    setShowRoleSwitchModal(false);
    if (pendingTargetRole === "host") {
      router.push("/host-onboarding/property");
    } else {
      router.push("/creator-onboarding/basic-info");
    }
  };

  return {
    showRoleSwitchModal,
    setShowRoleSwitchModal,
    pendingTargetRole,
    isSwitching,
    attemptRoleSwitch,
    startOnboarding,
  };
}
