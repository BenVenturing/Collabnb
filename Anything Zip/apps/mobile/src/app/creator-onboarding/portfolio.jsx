import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Plus, X, Image as ImageIcon, Video } from "lucide-react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";

const MAX_PORTFOLIO_ITEMS = 6;

export default function PortfolioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [portfolioItems, setPortfolioItems] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleAddMedia = async () => {
    if (portfolioItems.length >= MAX_PORTFOLIO_ITEMS) {
      Alert.alert(
        "Maximum Reached",
        `You can upload up to ${MAX_PORTFOLIO_ITEMS} portfolio items.`,
      );
      return;
    }

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Required",
        "Please grant media library permissions to upload portfolio items.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];

      // UI ONLY: Create a placeholder item
      const newItem = {
        id: Date.now().toString(),
        uri: asset.uri,
        type: asset.type, // 'image' or 'video'
        // TODO: Integrate with useUpload hook when backend is ready
      };

      setPortfolioItems([...portfolioItems, newItem]);

      // Show "Coming soon" alert for actual upload
      Alert.alert(
        "Preview Only",
        "Upload integration coming soon. This is a UI preview.",
      );
    }
  };

  const handleRemoveItem = (itemId) => {
    setPortfolioItems(portfolioItems.filter((item) => item.id !== itemId));
  };

  const handleContinue = () => {
    // Navigate to step 4
    router.push("/creator-onboarding/submit");
  };

  const handleSkip = () => {
    // Skip to step 4
    router.push("/creator-onboarding/submit");
  };

  // Calculate grid layout: show items + add button if not at max
  const canAddMore = portfolioItems.length < MAX_PORTFOLIO_ITEMS;
  const gridItems = [...portfolioItems];
  if (canAddMore) {
    gridItems.push({ id: "add-button", type: "add" });
  }

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
          Step 3 of 4
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
              width: "75%",
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
            Showcase your work
          </Text>
          <Text style={{ fontSize: 16, color: "#6B7280", lineHeight: 24 }}>
            Upload photos and videos from past collaborations
          </Text>
        </View>

        {/* Portfolio Grid */}
        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            {gridItems.map((item) => {
              if (item.type === "add") {
                // Add button tile
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={handleAddMedia}
                    disabled={uploading}
                    style={{
                      width: "31%",
                      aspectRatio: 1,
                      backgroundColor: "#F9FAFB",
                      borderWidth: 2,
                      borderColor: "#E5E7EB",
                      borderStyle: "dashed",
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {uploading ? (
                      <ActivityIndicator color="#6B7280" />
                    ) : (
                      <>
                        <Plus size={28} color="#6B7280" strokeWidth={2} />
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#6B7280",
                            marginTop: 4,
                            fontWeight: "500",
                          }}
                        >
                          Add
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              }

              // Portfolio item tile
              return (
                <View
                  key={item.id}
                  style={{
                    width: "31%",
                    aspectRatio: 1,
                    borderRadius: 12,
                    overflow: "hidden",
                    backgroundColor: "#F3F4F6",
                    position: "relative",
                  }}
                >
                  {/* Thumbnail */}
                  <Image
                    source={{ uri: item.uri }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={200}
                  />

                  {/* Video indicator */}
                  {item.type === "video" && (
                    <View
                      style={{
                        position: "absolute",
                        bottom: 8,
                        left: 8,
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        borderRadius: 6,
                        paddingHorizontal: 6,
                        paddingVertical: 4,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Video size={12} color="#FFFFFF" />
                    </View>
                  )}

                  {/* Remove button */}
                  <TouchableOpacity
                    onPress={() => handleRemoveItem(item.id)}
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                      borderRadius: 12,
                      width: 24,
                      height: 24,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <X size={14} color="#FFFFFF" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>

        {/* Helper Text */}
        <View style={{ paddingHorizontal: 24, marginBottom: 8 }}>
          <Text
            style={{
              fontSize: 14,
              color: "#6B7280",
              lineHeight: 20,
              marginBottom: 8,
            }}
          >
            Optional, but recommended.
          </Text>
          <View
            style={{
              backgroundColor: "#F9FAFB",
              borderLeftWidth: 3,
              borderLeftColor: "#E5E7EB",
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 6,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: "#6B7280",
                lineHeight: 18,
              }}
            >
              Uploads are reviewed for policy compliance.
            </Text>
          </View>
        </View>

        {/* Accepted Formats Info */}
        <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ImageIcon size={16} color="#9CA3AF" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>JPG, PNG</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Video size={16} color="#9CA3AF" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>MP4, MOV</Text>
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
        {/* Primary CTA */}
        <TouchableOpacity
          onPress={handleContinue}
          style={{
            backgroundColor: "#000000",
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
            Continue
          </Text>
        </TouchableOpacity>

        {/* Secondary CTA */}
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
    </View>
  );
}
