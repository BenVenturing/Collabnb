// Privacy Policy Screen — Collabnb
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={{ flex: 1, backgroundColor: "#FFFFFF", paddingTop: insets.top }}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 16 }}
        >
          <ArrowLeft size={24} color="#192524" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#192524" }}>
          Privacy Policy
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingVertical: 24,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 13, color: "#959D90", marginBottom: 24 }}>
          Last updated: May 2, 2026
        </Text>

        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: "#192524",
            marginBottom: 12,
          }}
        >
          Introduction
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 24,
          }}
        >
          Collabnb ("we," "our," or "us") is committed to protecting your
          privacy. This Privacy Policy explains how we collect, use, disclose,
          and safeguard your information when you use our mobile application and
          services.
        </Text>

        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#192524",
            marginBottom: 12,
          }}
        >
          Information We Collect
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 12,
          }}
        >
          We collect information that you provide directly to us, including:
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 4,
          }}
        >
          • Account information (name, email address, password)
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 4,
          }}
        >
          • Profile information (bio, location, social media links, portfolio)
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 4,
          }}
        >
          • Content you create (messages, applications, listings)
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 24,
          }}
        >
          • Usage data (app interactions, preferences, search history)
        </Text>

        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#192524",
            marginBottom: 12,
          }}
        >
          How We Use Your Information
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 12,
          }}
        >
          We use the information we collect to:
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 4,
          }}
        >
          • Provide, maintain, and improve our services
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 4,
          }}
        >
          • Connect creators with hospitality hosts
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 4,
          }}
        >
          • Send you updates, notifications, and support messages
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 4,
          }}
        >
          • Personalize your experience and show relevant content
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 24,
          }}
        >
          • Ensure safety and prevent fraud
        </Text>

        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#192524",
            marginBottom: 12,
          }}
        >
          Information Sharing
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 24,
          }}
        >
          We do not sell your personal information. We may share your
          information with other users (e.g., when you apply to a listing),
          service providers who help us operate our platform, and when required
          by law.
        </Text>

        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#192524",
            marginBottom: 12,
          }}
        >
          Data Security
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 24,
          }}
        >
          We implement appropriate technical and organizational measures to
          protect your personal information. However, no method of transmission
          over the internet is 100% secure.
        </Text>

        <Text
          style={{
            fontSize: 18,
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
            lineHeight: 24,
            marginBottom: 12,
          }}
        >
          You have the right to:
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 4,
          }}
        >
          • Access and update your personal information
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 4,
          }}
        >
          • Delete your account and associated data
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 4,
          }}
        >
          • Opt out of marketing communications
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 24,
          }}
        >
          • Request a copy of your data
        </Text>

        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#192524",
            marginBottom: 12,
          }}
        >
          Children's Privacy
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 24,
          }}
        >
          Our services are not intended for users under 18 years of age. We do
          not knowingly collect information from children under 18.
        </Text>

        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#192524",
            marginBottom: 12,
          }}
        >
          Changes to This Policy
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 24,
          }}
        >
          We may update this Privacy Policy from time to time. We will notify
          you of any changes by posting the new policy on this page and updating
          the "Last updated" date.
        </Text>

        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#192524",
            marginBottom: 12,
          }}
        >
          Contact Us
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 8,
          }}
        >
          If you have questions about this Privacy Policy, please contact us at:
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#3C5759",
            lineHeight: 24,
            marginBottom: 4,
          }}
        >
          Email: privacy@collabnb.com
        </Text>
        <Text style={{ fontSize: 15, color: "#3C5759", lineHeight: 24 }}>
          Address: Collabnb Inc., 123 Main Street, San Francisco, CA 94102
        </Text>
      </ScrollView>
    </View>
  );
}
