import { View, Text, ScrollView, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AlertCircle } from "lucide-react-native";
import useHostOnboardingStore from "@/utils/HostOnboardingStore";
import HostOnboardingShell from "@/components/HostOnboardingShell";

export default function PropertyIntakeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    workEmail,
    airbnbUrl,
    instagramUrl,
    websiteUrl,
    updateField,
    loadDraft,
  } = useHostOnboardingStore();

  const [showEmailWarning, setShowEmailWarning] = useState(false);

  useEffect(() => {
    loadDraft();
  }, []);

  useEffect(() => {
    const personalDomains = [
      "gmail.com",
      "yahoo.com",
      "outlook.com",
      "hotmail.com",
    ];
    const domain = workEmail.split("@")[1]?.toLowerCase();
    setShowEmailWarning(
      workEmail && domain && personalDomains.includes(domain),
    );
  }, [workEmail]);

  const handleContinue = () => {
    if (!workEmail.trim() || !airbnbUrl.trim()) {
      Alert.alert(
        "Required fields",
        "Please provide work email and Airbnb listing URL",
      );
      return;
    }
    router.push("/host-onboarding/host-profile");
  };

  const handleBack = () => {
    router.push("/host-onboarding");
  };

  return (
    <HostOnboardingShell
      currentStep={1}
      onNext={handleContinue}
      onBack={handleBack}
    >
      <StatusBar style="dark" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 8,
            }}
          >
            Verify your property
          </Text>
          <Text style={{ fontSize: 16, color: "#3C5759", lineHeight: 24 }}>
            We use these links to verify the property and keep listings
            accurate.
          </Text>
        </View>

        {/* Form Fields */}
        <View style={{ paddingHorizontal: 24 }}>
          {/* Work Email */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#192524",
                marginBottom: 8,
              }}
            >
              Work email <Text style={{ color: "#EF4444" }}>*</Text>
            </Text>
            <TextInput
              value={workEmail}
              onChangeText={(text) => updateField("workEmail", text)}
              placeholder="you@yourproperty.com"
              placeholderTextColor="#959D90"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={{
                backgroundColor: "#EFECE9",
                borderWidth: 1,
                borderColor: "#D0D5CE",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: "#192524",
              }}
            />
            {showEmailWarning && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 8,
                  backgroundColor: "#FEF3C7",
                  borderWidth: 1,
                  borderColor: "#FDE047",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <AlertCircle
                  size={16}
                  color="#92400E"
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    fontSize: 13,
                    color: "#92400E",
                    flex: 1,
                    lineHeight: 18,
                  }}
                >
                  Work email recommended for faster approval.
                </Text>
              </View>
            )}
          </View>

          {/* Property Listing URL */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#192524",
                marginBottom: 8,
              }}
            >
              Property listing URL <Text style={{ color: "#EF4444" }}>*</Text>
            </Text>
            <TextInput
              value={airbnbUrl}
              onChangeText={(text) => updateField("airbnbUrl", text)}
              placeholder="https://www.airbnb.com/rooms/..."
              placeholderTextColor="#959D90"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={{
                backgroundColor: "#EFECE9",
                borderWidth: 1,
                borderColor: "#D0D5CE",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: "#192524",
              }}
            />
          </View>

          {/* Instagram URL */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#192524",
                marginBottom: 8,
              }}
            >
              Instagram URL (optional)
            </Text>
            <TextInput
              value={instagramUrl}
              onChangeText={(text) => updateField("instagramUrl", text)}
              placeholder="https://instagram.com/yourproperty"
              placeholderTextColor="#959D90"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={{
                backgroundColor: "#EFECE9",
                borderWidth: 1,
                borderColor: "#D0D5CE",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: "#192524",
              }}
            />
          </View>

          {/* Website URL */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#192524",
                marginBottom: 8,
              }}
            >
              Website URL (optional)
            </Text>
            <TextInput
              value={websiteUrl}
              onChangeText={(text) => updateField("websiteUrl", text)}
              placeholder="https://yourwebsite.com"
              placeholderTextColor="#959D90"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={{
                backgroundColor: "#EFECE9",
                borderWidth: 1,
                borderColor: "#D0D5CE",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: "#192524",
              }}
            />
          </View>
        </View>
      </ScrollView>
    </HostOnboardingShell>
  );
}
