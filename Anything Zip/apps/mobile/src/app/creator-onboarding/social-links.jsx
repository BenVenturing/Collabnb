import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useState, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Instagram, Music, Youtube } from "lucide-react-native";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

export default function SocialLinksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const handleContinue = () => {
    // Navigate to next step (step 3)
    router.push("/creator-onboarding/portfolio");
  };

  const handleSkip = () => {
    // Skip to next step
    router.push("/creator-onboarding/portfolio");
  };

  return (
    <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
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
            Step 2 of 4
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
                width: "50%",
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
              Connect your social profiles
            </Text>
            <Text style={{ fontSize: 16, color: "#6B7280", lineHeight: 24 }}>
              Help brands discover your reach and engagement
            </Text>
          </View>

          {/* Social Links Form */}
          <View style={{ paddingHorizontal: 24, gap: 24 }}>
            {/* Instagram */}
            <View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Instagram
                  size={20}
                  color="#000000"
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{ fontSize: 16, fontWeight: "600", color: "#000000" }}
                >
                  Instagram
                </Text>
                <Text style={{ fontSize: 14, color: "#9CA3AF", marginLeft: 8 }}>
                  Optional
                </Text>
              </View>
              <TextInput
                value={instagramUrl}
                onChangeText={setInstagramUrl}
                placeholder="https://instagram.com/username"
                placeholderTextColor="#9CA3AF"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: "#000000",
                }}
              />
            </View>

            {/* TikTok */}
            <View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Music size={20} color="#000000" style={{ marginRight: 8 }} />
                <Text
                  style={{ fontSize: 16, fontWeight: "600", color: "#000000" }}
                >
                  TikTok
                </Text>
                <Text style={{ fontSize: 14, color: "#9CA3AF", marginLeft: 8 }}>
                  Optional
                </Text>
              </View>
              <TextInput
                value={tiktokUrl}
                onChangeText={setTiktokUrl}
                placeholder="https://tiktok.com/@username"
                placeholderTextColor="#9CA3AF"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: "#000000",
                }}
              />
            </View>

            {/* YouTube */}
            <View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Youtube size={20} color="#000000" style={{ marginRight: 8 }} />
                <Text
                  style={{ fontSize: 16, fontWeight: "600", color: "#000000" }}
                >
                  YouTube
                </Text>
                <Text style={{ fontSize: 14, color: "#9CA3AF", marginLeft: 8 }}>
                  Optional
                </Text>
              </View>
              <TextInput
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                placeholder="https://youtube.com/@channel"
                placeholderTextColor="#9CA3AF"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: "#000000",
                }}
              />
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
    </KeyboardAvoidingAnimatedView>
  );
}
