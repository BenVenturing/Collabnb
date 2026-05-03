import { View, Text, ScrollView, Alert, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  CheckCircle,
  Link,
  ChevronDown,
  ChevronUp,
  Sparkles,
  DollarSign,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import useHostOnboardingStore from "@/utils/HostOnboardingStore";
import HostOnboardingShell from "@/components/HostOnboardingShell";
import { TouchableOpacity } from "react-native";

export default function HostSubmitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    workEmail,
    airbnbUrl,
    instagramUrl,
    websiteUrl,
    fullName,
    contactEmail,
    createFirstListing,
    collaborationType,
    deliverablePreset,
    creatorTier,
    pricingType,
    cashValue,
    calculatedFee,
    updateField,
    updateMultipleFields,
    loadDraft,
  } = useHostOnboardingStore();

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  const [showListingSection, setShowListingSection] = useState(false);
  const [showPricingSection, setShowPricingSection] = useState(false);

  useEffect(() => {
    loadDraft();
  }, []);

  const triggerConfetti = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSubmit = () => {
    updateField("hostApprovalStatus", "pending");
    triggerConfetti();
    setIsSubmitted(true);
  };

  const handleSkip = () => {
    updateField("hostApprovalStatus", "not_submitted");
    triggerConfetti();
    setIsSkipped(true);
  };

  const handleReturnToExplore = () => {
    router.replace("/host/(tabs)/dashboard");
  };

  // Post-Submit Confirmation State
  if (isSubmitted) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <StatusBar style="dark" />

        <View
          style={{
            flex: 1,
            paddingTop: insets.top + 40,
            paddingHorizontal: 24,
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: insets.bottom + 100,
          }}
        >
          {/* Success Icon */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#D1EBDB",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <CheckCircle size={48} color="#3C5759" strokeWidth={2.5} />
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Submitted — under review
          </Text>

          {/* Body Text */}
          <Text
            style={{
              fontSize: 16,
              color: "#3C5759",
              lineHeight: 24,
              textAlign: "center",
              paddingHorizontal: 20,
            }}
          >
            We'll email you within 24–48 hours.
          </Text>
        </View>

        {/* Bottom CTA */}
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
          <TouchableOpacity
            onPress={handleReturnToExplore}
            style={{
              backgroundColor: "#192524",
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
              Explore listings
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Post-Skip Confirmation State
  if (isSkipped) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <StatusBar style="dark" />

        <View
          style={{
            flex: 1,
            paddingTop: insets.top + 40,
            paddingHorizontal: 24,
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: insets.bottom + 100,
          }}
        >
          {/* Success Icon */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#D1EBDB",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <Sparkles size={48} color="#3C5759" strokeWidth={2.5} />
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            You're in!
          </Text>

          {/* Body Text */}
          <Text
            style={{
              fontSize: 16,
              color: "#3C5759",
              lineHeight: 24,
              textAlign: "center",
              paddingHorizontal: 20,
            }}
          >
            You can browse now. You'll need approval before posting listings.
          </Text>
        </View>

        {/* Bottom CTA */}
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
          <TouchableOpacity
            onPress={handleReturnToExplore}
            style={{
              backgroundColor: "#192524",
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
              Start browsing
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Pre-Submit State
  return (
    <HostOnboardingShell
      currentStep={3}
      onNext={handleSubmit}
      onBack={() => router.back()}
      nextLabel="Submit for review"
      showBackButton={false}
    >
      <StatusBar style="dark" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 240 }}
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
            Submit for review
          </Text>
          <Text style={{ fontSize: 16, color: "#3C5759", lineHeight: 24 }}>
            Review your details before submitting
          </Text>
        </View>

        {/* Summary Card */}
        <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
          <View
            style={{
              backgroundColor: "#EFECE9",
              borderWidth: 1,
              borderColor: "#D0D5CE",
              borderRadius: 16,
              padding: 20,
            }}
          >
            {/* Verification Info */}
            <View
              style={{
                marginBottom: 20,
                paddingBottom: 20,
                borderBottomWidth: 1,
                borderBottomColor: "#D0D5CE",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#3C5759",
                  marginBottom: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Verification
              </Text>
              <Text style={{ fontSize: 14, color: "#192524", marginBottom: 8 }}>
                {workEmail}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#D0D5CE",
                  alignSelf: "flex-start",
                }}
              >
                <Link size={14} color="#3C5759" style={{ marginRight: 6 }} />
                <Text
                  style={{ fontSize: 13, color: "#3C5759" }}
                  numberOfLines={1}
                >
                  Property listing
                </Text>
              </View>
              {(instagramUrl || websiteUrl) && (
                <Text
                  style={{
                    fontSize: 12,
                    color: "#3C5759",
                    marginTop: 8,
                  }}
                >
                  {instagramUrl && "Instagram"}
                  {instagramUrl && websiteUrl && " • "}
                  {websiteUrl && "Website"}
                </Text>
              )}
            </View>

            {/* Host Info */}
            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#3C5759",
                  marginBottom: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Host
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#192524",
                  marginBottom: 4,
                }}
              >
                {fullName}
              </Text>
              <Text style={{ fontSize: 14, color: "#3C5759" }}>
                {contactEmail}
              </Text>
            </View>
          </View>
        </View>

        {/* Optional: Create First Collaboration */}
        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setShowListingSection(!showListingSection)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#EFECE9",
              borderWidth: 1,
              borderColor: "#D0D5CE",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#192524" }}>
              Create your first collaboration (optional)
            </Text>
            {showListingSection ? (
              <ChevronUp size={20} color="#3C5759" />
            ) : (
              <ChevronDown size={20} color="#3C5759" />
            )}
          </TouchableOpacity>

          {showListingSection && (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#D0D5CE",
                borderRadius: 12,
                padding: 16,
                marginTop: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#192524",
                  marginBottom: 12,
                }}
              >
                Collaboration type
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                {["Free stay", "Paid", "Hybrid"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => updateField("collaborationType", type)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor:
                        collaborationType === type ? "#192524" : "#D0D5CE",
                      backgroundColor:
                        collaborationType === type ? "#EFECE9" : "#FFFFFF",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: collaborationType === type ? "600" : "500",
                        color: "#192524",
                        textAlign: "center",
                      }}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#192524",
                  marginBottom: 12,
                }}
              >
                Deliverable preset
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                {["Light", "Moderate", "Heavy"].map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    onPress={() => updateField("deliverablePreset", preset)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor:
                        deliverablePreset === preset ? "#192524" : "#D0D5CE",
                      backgroundColor:
                        deliverablePreset === preset ? "#EFECE9" : "#FFFFFF",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight:
                          deliverablePreset === preset ? "600" : "500",
                        color: "#192524",
                        textAlign: "center",
                      }}
                    >
                      {preset}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#192524",
                  marginBottom: 12,
                }}
              >
                Creator tier
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {["UGC Beginner", "UGC Pro", "Micro", "Mid"].map((tier) => (
                  <TouchableOpacity
                    key={tier}
                    onPress={() => updateField("creatorTier", tier)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: creatorTier === tier ? "#192524" : "#D0D5CE",
                      backgroundColor:
                        creatorTier === tier ? "#EFECE9" : "#FFFFFF",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: creatorTier === tier ? "600" : "500",
                        color: "#192524",
                      }}
                    >
                      {tier}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Pricing & Fees Section (NEW) */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => setShowPricingSection(!showPricingSection)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#EFECE9",
              borderWidth: 1,
              borderColor: "#D0D5CE",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <DollarSign size={20} color="#3C5759" />
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#192524" }}
              >
                Pricing & fees (host-only)
              </Text>
            </View>
            {showPricingSection ? (
              <ChevronUp size={20} color="#3C5759" />
            ) : (
              <ChevronDown size={20} color="#3C5759" />
            )}
          </TouchableOpacity>

          {showPricingSection && (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#D0D5CE",
                borderRadius: 12,
                padding: 16,
                marginTop: 12,
              }}
            >
              {/* Pricing Type */}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#192524",
                  marginBottom: 12,
                }}
              >
                Collaboration pricing
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                {[
                  { value: "free", label: "Free/Exchange" },
                  { value: "paid", label: "Paid" },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => updateField("pricingType", option.value)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor:
                        pricingType === option.value ? "#192524" : "#D0D5CE",
                      backgroundColor:
                        pricingType === option.value ? "#EFECE9" : "#FFFFFF",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight:
                          pricingType === option.value ? "600" : "500",
                        color: "#192524",
                        textAlign: "center",
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Cash Value (if paid) */}
              {pricingType === "paid" && (
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#192524",
                      marginBottom: 8,
                    }}
                  >
                    Cash value (USD)
                  </Text>
                  <TextInput
                    value={cashValue}
                    onChangeText={(text) => updateField("cashValue", text)}
                    placeholder="500"
                    placeholderTextColor="#959D90"
                    keyboardType="numeric"
                    style={{
                      backgroundColor: "#EFECE9",
                      borderWidth: 1,
                      borderColor: "#D0D5CE",
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 15,
                      color: "#192524",
                    }}
                  />
                </View>
              )}

              {/* Fee Calculation */}
              <View
                style={{
                  backgroundColor: "#EFECE9",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#3C5759",
                    marginBottom: 6,
                  }}
                >
                  Your fee (per collaboration)
                </Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: "#192524",
                    marginBottom: 4,
                  }}
                >
                  ${calculatedFee.toFixed(2)}
                </Text>
                <Text
                  style={{ fontSize: 12, color: "#3C5759", lineHeight: 16 }}
                >
                  {pricingType === "free"
                    ? "Flat fee for free/exchange collaborations"
                    : `8% of cash value (min $20, max $100)`}
                </Text>
              </View>

              {/* Privacy Note */}
              <View
                style={{
                  backgroundColor: "rgba(209, 235, 219, 0.3)",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <Text
                  style={{ fontSize: 12, color: "#3C5759", lineHeight: 16 }}
                >
                  ℹ️ Creators don't see these fees. They only see the
                  collaboration offer.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Callout Text */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <View
            style={{
              backgroundColor: "rgba(209, 235, 219, 0.5)",
              borderWidth: 1,
              borderColor: "#D1EBDB",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text style={{ fontSize: 14, color: "#3C5759", lineHeight: 20 }}>
              Our team reviews each host to ensure a great experience for
              creators.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Custom Bottom Bar with Skip Option */}
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
        <TouchableOpacity
          onPress={handleSubmit}
          style={{
            backgroundColor: "#000000",
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
            Submit for review
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkip}
          style={{
            alignItems: "center",
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: "#6B7280", fontSize: 16, fontWeight: "500" }}>
            Skip for now
          </Text>
        </TouchableOpacity>
      </View>
    </HostOnboardingShell>
  );
}
