import { View, Text, ScrollView, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import useHostOnboardingStore from "@/utils/HostOnboardingStore";
import HostOnboardingShell from "@/components/HostOnboardingShell";

export default function HostProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    fullName,
    businessName,
    contactEmail,
    phone,
    workEmail,
    websiteUrl,
    updateField,
    loadDraft,
  } = useHostOnboardingStore();

  useEffect(() => {
    loadDraft();
  }, []);

  // Auto-fill contactEmail from workEmail if empty
  useEffect(() => {
    if (!contactEmail && workEmail) {
      updateField("contactEmail", workEmail);
    }
  }, [workEmail]);

  const handleContinue = () => {
    if (!fullName.trim() || !contactEmail.trim()) {
      Alert.alert("Required", "Please fill in your name and email");
      return;
    }
    router.push("/host-onboarding/submit");
  };

  return (
    <HostOnboardingShell
      currentStep={2}
      onNext={handleContinue}
      onBack={() => router.back()}
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
            Set up your host profile
          </Text>
          <Text style={{ fontSize: 16, color: "#3C5759", lineHeight: 24 }}>
            Help creators learn more about you
          </Text>
        </View>

        {/* Form Fields */}
        <View style={{ paddingHorizontal: 24 }}>
          {/* Full Name */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#192524",
                marginBottom: 8,
              }}
            >
              Full name <Text style={{ color: "#EF4444" }}>*</Text>
            </Text>
            <TextInput
              value={fullName}
              onChangeText={(text) => updateField("fullName", text)}
              placeholder="Your name"
              placeholderTextColor="#959D90"
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

          {/* Business/Brand Name */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#192524",
                marginBottom: 8,
              }}
            >
              Business / property brand name (optional)
            </Text>
            <TextInput
              value={businessName}
              onChangeText={(text) => updateField("businessName", text)}
              placeholder="e.g., Sunset Stays"
              placeholderTextColor="#959D90"
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

          {/* Website */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#192524",
                marginBottom: 8,
              }}
            >
              Website (optional)
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

          {/* Contact Email */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#192524",
                marginBottom: 8,
              }}
            >
              Contact email <Text style={{ color: "#EF4444" }}>*</Text>
            </Text>
            <TextInput
              value={contactEmail}
              onChangeText={(text) => updateField("contactEmail", text)}
              placeholder="your@email.com"
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
          </View>

          {/* Phone */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#192524",
                marginBottom: 8,
              }}
            >
              Phone (optional)
            </Text>
            <TextInput
              value={phone}
              onChangeText={(text) => updateField("phone", text)}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor="#959D90"
              keyboardType="phone-pad"
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

          {/* Info Callout */}
          <View
            style={{
              backgroundColor: "rgba(209, 235, 219, 0.5)",
              borderWidth: 1,
              borderColor: "#D1EBDB",
              borderRadius: 12,
              padding: 16,
              marginTop: 8,
            }}
          >
            <Text style={{ fontSize: 14, color: "#3C5759", lineHeight: 20 }}>
              Hosts are reviewed to maintain quality collaborations.
            </Text>
          </View>
        </View>
      </ScrollView>
    </HostOnboardingShell>
  );
}
