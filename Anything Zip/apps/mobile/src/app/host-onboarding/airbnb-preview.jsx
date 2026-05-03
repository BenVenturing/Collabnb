import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MapPin } from "lucide-react-native";

export default function AirbnbPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [autoSync, setAutoSync] = useState(false);

  // Placeholder data (would come from scraping in real implementation)
  const placeholderListing = {
    title: "Modern Beach House",
    location: "Malibu, California",
    description: "Stunning oceanfront property with panoramic views...",
    images: 5,
  };

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
          Step 1 of 3
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
              width: "33.33%",
              height: "100%",
              backgroundColor: "#000000",
            }}
          />
        </View>
      </View>

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
              color: "#000000",
              marginBottom: 8,
            }}
          >
            Preview your listing
          </Text>
          <Text style={{ fontSize: 16, color: "#6B7280", lineHeight: 24 }}>
            Review imported property details
          </Text>
        </View>

        {/* Image Carousel Placeholder */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ gap: 12 }}
          >
            {[1, 2, 3, 4, 5].map((_, index) => (
              <View
                key={index}
                style={{
                  width: 280,
                  height: 200,
                  borderRadius: 16,
                  backgroundColor: "#E5E7EB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 14, color: "#9CA3AF" }}>
                  Image {index + 1}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Listing Summary Card */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <View
            style={{
              backgroundColor: "#F9FAFB",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#000000",
                marginBottom: 12,
              }}
            >
              {placeholderListing.title}
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <MapPin size={16} color="#6B7280" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 15, color: "#6B7280" }}>
                {placeholderListing.location}
              </Text>
            </View>

            <Text
              style={{
                fontSize: 15,
                color: "#374151",
                lineHeight: 22,
                marginBottom: 16,
              }}
            >
              {placeholderListing.description}
            </Text>

            <View
              style={{
                backgroundColor: "#FFFFFF",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ fontSize: 13, color: "#6B7280" }}>
                {placeholderListing.images} images imported
              </Text>
            </View>
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
        <TouchableOpacity
          onPress={() => router.push("/host-onboarding/host-profile")}
          style={{
            backgroundColor: "#000000",
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
            Confirm & Continue
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            alignItems: "center",
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: "#6B7280", fontSize: 16, fontWeight: "500" }}>
            Back to edit
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
