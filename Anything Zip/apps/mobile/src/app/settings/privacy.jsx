import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Shield } from "lucide-react-native";
import { BlurView } from "expo-blur";

export default function PrivacySecurityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: "#EFECE9" }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: 20,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#D0D5CE",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 16 }}
          >
            <ChevronLeft color="#3C5759" size={28} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#192524" }}>
            Privacy & Security
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#D1EBDB",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Shield color="#3C5759" size={40} />
          </View>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 8,
            }}
          >
            Your Privacy Matters
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#3C5759",
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            We're committed to protecting your personal information
          </Text>
        </View>

        <BlurView
          intensity={60}
          tint="light"
          style={{
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.5)",
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            marginBottom: 16,
          }}
        >
          <View style={{ padding: 20 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#192524",
                marginBottom: 12,
              }}
            >
              What We Collect
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: "#3C5759",
                lineHeight: 22,
                marginBottom: 16,
              }}
            >
              We store only the information needed to run Collabnb effectively:
              account details, role preferences, listings, messages, and
              activity history.
            </Text>

            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#192524",
                marginBottom: 12,
              }}
            >
              How We Use It
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: "#3C5759",
                lineHeight: 22,
                marginBottom: 16,
              }}
            >
              Your data helps us connect creators with hosts, facilitate
              collaborations, and improve your experience. We don't sell
              personal data to third parties.
            </Text>

            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#192524",
                marginBottom: 12,
              }}
            >
              Your Rights
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: "#3C5759",
                lineHeight: 22,
              }}
            >
              You can request data deletion at any time by contacting support.
              Use a strong passcode and keep your device secure to protect your
              account.
            </Text>
          </View>
        </BlurView>

        <BlurView
          intensity={60}
          tint="light"
          style={{
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.5)",
            backgroundColor: "rgba(209, 235, 219, 0.4)",
          }}
        >
          <View style={{ padding: 16 }}>
            <Text
              style={{
                fontSize: 14,
                color: "#192524",
                lineHeight: 20,
                textAlign: "center",
                fontWeight: "500",
              }}
            >
              💡 Questions about privacy? Contact us at support@collabnb.com
            </Text>
          </View>
        </BlurView>

        <TouchableOpacity
          onPress={() => router.push("/privacy-policy")}
          style={{
            backgroundColor: "#3C5759",
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: "center",
            marginTop: 24,
          }}
        >
          <Text style={{ color: "#EFECE9", fontSize: 16, fontWeight: "600" }}>
            View Full Privacy Policy
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
