import { View, Text, TouchableOpacity, Linking } from "react-native";
import { BlurView } from "expo-blur";
import { ExternalLink } from "lucide-react-native";

export default function LinksSection({ personalLink, socialLinks }) {
  const openLink = (url) => {
    Linking.openURL(url);
  };

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: "#192524",
          marginBottom: 12,
        }}
      >
        Links & Socials
      </Text>

      <BlurView
        intensity={22}
        tint="light"
        style={{
          borderRadius: 24,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.35)",
          backgroundColor: "rgba(255, 255, 255, 0.28)",
          shadowColor: "#192524",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 2,
        }}
      >
        <TouchableOpacity
          onPress={() => openLink(personalLink.url)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255, 255, 255, 0.25)",
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#D1EBDB",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <personalLink.icon color="#192524" size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: "#192524",
                marginBottom: 2,
              }}
            >
              {personalLink.title}
            </Text>
            <Text style={{ fontSize: 13, color: "#959D90" }}>
              beacons.ai/benventuring
            </Text>
          </View>
          <ExternalLink color="#3C5759" size={18} />
        </TouchableOpacity>

        {socialLinks.map((link, index) => (
          <TouchableOpacity
            key={link.platform}
            onPress={() => openLink(link.url)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 16,
              borderBottomWidth: index < socialLinks.length - 1 ? 1 : 0,
              borderBottomColor: "rgba(255, 255, 255, 0.25)",
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#3C5759",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <link.icon color="#fff" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#192524",
                  marginBottom: 2,
                }}
              >
                {link.platform}
              </Text>
              <Text style={{ fontSize: 13, color: "#959D90" }}>
                {link.username}
              </Text>
            </View>
            <ExternalLink color="#3C5759" size={18} />
          </TouchableOpacity>
        ))}
      </BlurView>
    </View>
  );
}
