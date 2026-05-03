import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, X, HelpCircle } from "lucide-react-native";
import useHostOnboardingStore from "@/utils/HostOnboardingStore";

/**
 * HostOnboardingShell - Shared navigation shell for all host onboarding steps
 * Provides top header (back, save & exit, help) and bottom progress bar + nav buttons
 */
export default function HostOnboardingShell({
  children,
  currentStep = 1,
  onNext,
  onBack,
  nextLabel = "Next",
  backLabel = "Back",
  showBackButton = true,
  nextDisabled = false,
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { saveDraft } = useHostOnboardingStore();

  const handleSaveAndExit = async () => {
    await saveDraft();
    Alert.alert(
      "Draft saved",
      "Your progress has been saved. You can continue later.",
      [
        {
          text: "Exit",
          onPress: () => router.replace("/host/(tabs)/dashboard"),
        },
        {
          text: "Continue editing",
          style: "cancel",
        },
      ],
    );
  };

  const handleHelp = () => {
    Alert.alert(
      "Help & FAQs",
      "Coming soon — reach out if you need assistance!",
      [{ text: "OK" }],
    );
  };

  const getProgressWidth = () => {
    switch (currentStep) {
      case 1:
        return "33.33%";
      case 2:
        return "66.66%";
      case 3:
        return "100%";
      default:
        return "0%";
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* Top Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 24,
          paddingBottom: 12,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <TouchableOpacity
          onPress={onBack || (() => router.back())}
          style={{
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: -8,
          }}
        >
          <ArrowLeft size={24} color="#192524" />
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: "#3C5759",
          }}
        >
          Step {currentStep} of 3
        </Text>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={handleSaveAndExit}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: "#F9FAFB",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#3C5759",
              }}
            >
              Save & exit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleHelp}
            style={{
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <HelpCircle size={22} color="#3C5759" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content (children) */}
      {children}

      {/* Bottom Navigation Bar */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
        }}
      >
        {/* Segmented Progress Bar */}
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {[1, 2, 3].map((step) => (
            <View
              key={step}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: step <= currentStep ? "#192524" : "#E5E7EB",
              }}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          {showBackButton && (
            <TouchableOpacity
              onPress={onBack || (() => router.back())}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#D0D5CE",
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#192524",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                {backLabel}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onNext}
            disabled={nextDisabled}
            style={{
              flex: showBackButton ? 1 : 2,
              backgroundColor: nextDisabled ? "#D0D5CE" : "#192524",
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              {nextLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
