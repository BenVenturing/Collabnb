// Creator V1 screen (namespaced to avoid host collisions)

import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import {
  CheckCircle,
  ChevronLeft,
  Instagram,
  Music,
  Youtube,
  Image as ImageIcon,
  Video,
} from "lucide-react-native";

export default function CreatorSubmitApplicationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Mock data for UI preview (since this is UI-only)
  const profileData = {
    photo:
      "https://e1a4c9d0d2f9f737c5e1.ucr.io/-/preview/https://api.urlbox.io/v1/NTYqWgJv5s0qDIxN/jpeg?url=https%3A%2F%2Fbeacons.ai%2Fbenventuring&full_page=true&width=1024&max_height=2048&quality=80",
    displayName: "Benjamin",
    username: "ben.venturing",
    socialLinks: {
      instagram: true,
      tiktok: false,
      youtube: true,
    },
    portfolioCount: 3,
  };

  const handleSubmit = () => {
    // TODO: Backend submission would happen here
    setIsSubmitted(true);
  };

  const handleEditProfile = () => {
    router.back();
  };

  const handleReturnToBrowse = () => {
    // TODO: Navigate to main app (likely /(tabs))
    Alert.alert("Navigation", "Would navigate to main browse screen");
  };

  // Confirmation State (Post-Submit)
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
              backgroundColor: "#DCFCE7",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <CheckCircle size={48} color="#16A34A" strokeWidth={2.5} />
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: "#000000",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Application submitted
          </Text>

          {/* Body Text */}
          <Text
            style={{
              fontSize: 16,
              color: "#6B7280",
              lineHeight: 24,
              textAlign: "center",
              paddingHorizontal: 20,
            }}
          >
            Thanks! We're reviewing your profile and will email you within 48
            hours.
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
            onPress={handleReturnToBrowse}
            style={{
              backgroundColor: "#000000",
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
              Return to browse
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Pre-Submit State
  return (
    <View
      style={{ flex: 1, backgroundColor: "#FFFFFF", paddingTop: insets.top }}
    >
      <StatusBar style="dark" />

      {/* Progress Bar */}
      <View
        style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 }}
      >
        <Text
          style={{
            fontSize: 12,
            color: "#6B7280",
            marginBottom: 8,
            fontWeight: "500",
          }}
        >
          Step 4 of 4
        </Text>
        <View
          style={{
            height: 4,
            backgroundColor: "#E5E7EB",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#000000",
            }}
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
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
              color: "#000000",
              marginBottom: 8,
            }}
          >
            Submit your application
          </Text>
          <Text style={{ fontSize: 16, color: "#6B7280", lineHeight: 24 }}>
            Review your profile before submitting
          </Text>
        </View>

        {/* Summary Card */}
        <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
          <View
            style={{
              backgroundColor: "#F9FAFB",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 16,
              padding: 20,
            }}
          >
            {/* Profile Photo & Name */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: "#D1D5DB",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 16,
                  borderWidth: 2,
                  borderColor: "#FFFFFF",
                }}
              >
                {profileData.photo ? (
                  <Image
                    source={{ uri: profileData.photo }}
                    style={{ width: "100%", height: "100%", borderRadius: 32 }}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <Text style={{ fontSize: 24, color: "#6B7280" }}>
                    {profileData.displayName.charAt(0)}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: "#000000",
                    marginBottom: 4,
                  }}
                >
                  {profileData.displayName}
                </Text>
                <Text style={{ fontSize: 14, color: "#6B7280" }}>
                  @{profileData.username}
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: "#E5E7EB",
                marginBottom: 16,
              }}
            />

            {/* Connected Platforms */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#6B7280",
                  marginBottom: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Connected Platforms
              </Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {profileData.socialLinks.instagram ? (
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      backgroundColor: "#FFFFFF",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                  >
                    <Instagram size={20} color="#000000" />
                  </View>
                ) : null}
                {profileData.socialLinks.tiktok ? (
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      backgroundColor: "#FFFFFF",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                  >
                    <Music size={20} color="#000000" />
                  </View>
                ) : null}
                {profileData.socialLinks.youtube ? (
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      backgroundColor: "#FFFFFF",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                  >
                    <Youtube size={20} color="#000000" />
                  </View>
                ) : null}
                {!profileData.socialLinks.instagram &&
                  !profileData.socialLinks.tiktok &&
                  !profileData.socialLinks.youtube && (
                    <Text style={{ fontSize: 14, color: "#9CA3AF" }}>
                      None connected
                    </Text>
                  )}
              </View>
            </View>

            {/* Portfolio Count */}
            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#6B7280",
                  marginBottom: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Portfolio
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#FFFFFF",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                  }}
                >
                  {profileData.portfolioCount > 0 ? (
                    <>
                      <ImageIcon
                        size={16}
                        color="#6B7280"
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={{
                          fontSize: 14,
                          color: "#000000",
                          fontWeight: "500",
                        }}
                      >
                        {profileData.portfolioCount} upload
                        {profileData.portfolioCount !== 1 ? "s" : ""}
                      </Text>
                    </>
                  ) : (
                    <Text style={{ fontSize: 14, color: "#9CA3AF" }}>
                      No uploads added
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Informational Text */}
        <View
          style={{
            paddingHorizontal: 24,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "#FEF3C7",
              borderWidth: 1,
              borderColor: "#FDE047",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: "#92400E",
                lineHeight: 20,
              }}
            >
              Our team reviews every creator application to ensure quality
              collaborations.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTAs */}
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
        {/* Primary CTA */}
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
            Submit application
          </Text>
        </TouchableOpacity>

        {/* Secondary CTA */}
        <TouchableOpacity
          onPress={handleEditProfile}
          style={{
            alignItems: "center",
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: "#6B7280", fontSize: 16, fontWeight: "500" }}>
            Edit profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
