import { View, Text, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Home, ArrowLeft } from "lucide-react-native";
import { Image } from "expo-image";

export default function HostComingSoonScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={{ flex: 1, backgroundColor: "#EFECE9", paddingTop: insets.top }}
    >
      <StatusBar style="dark" />

      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 32,
        }}
      >
        {/* Icon */}
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: "#D1EBDB",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <Home color="#192524" size={56} />
        </View>

        {/* Title */}
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: "#192524",
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          Host Mode
        </Text>

        {/* Body */}
        <Text
          style={{
            fontSize: 16,
            color: "#3C5759",
            textAlign: "center",
            lineHeight: 24,
            marginBottom: 40,
          }}
        >
          Host onboarding is being finalized. You can explore as a creator in
          the meantime and switch to host mode when it's ready.
        </Text>

        {/* Logo */}
        <Image
          source={{
            uri: "https://ucarecdn.com/9deddd9f-ada6-48b1-9614-1a97c13cfe69/",
          }}
          style={{ width: 80, height: 80, opacity: 0.6, marginBottom: 40 }}
          contentFit="contain"
          transition={200}
        />

        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#3C5759",
            paddingHorizontal: 24,
            paddingVertical: 16,
            borderRadius: 16,
          }}
        >
          <ArrowLeft color="#EFECE9" size={20} style={{ marginRight: 8 }} />
          <Text style={{ color: "#EFECE9", fontSize: 16, fontWeight: "600" }}>
            Go to Explore
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingBottom: insets.bottom + 20 }}>
        <Text style={{ fontSize: 13, color: "#959D90", textAlign: "center" }}>
          Need help? Contact support@collabnb.com
        </Text>
      </View>
    </View>
  );
}
