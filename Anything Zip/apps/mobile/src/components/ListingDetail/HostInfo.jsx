import { View, Text, TouchableOpacity } from "react-native";
import { Instagram, Globe, Check } from "lucide-react-native";

export function HostInfo({ host }) {
  return (
    <View
      style={{
        backgroundColor: "#EFECE9",
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: "#192524",
          marginBottom: 12,
        }}
      >
        Hosted by {host.brand_name || host.name}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 14, color: "#3C5759" }}>{host.name}</Text>
        {host.verified && (
          <View
            style={{
              marginLeft: 8,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Check color="#3C5759" size={16} />
            <Text
              style={{
                fontSize: 13,
                color: "#3C5759",
                marginLeft: 4,
                fontWeight: "600",
              }}
            >
              Verified
            </Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {host.instagram_url && (
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: "#fff",
            }}
          >
            <Instagram color="#192524" size={18} />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#192524",
              }}
            >
              Instagram
            </Text>
          </TouchableOpacity>
        )}
        {host.website_url && (
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: "#fff",
            }}
          >
            <Globe color="#192524" size={18} />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#192524",
              }}
            >
              Website
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Message host - disabled */}
      <TouchableOpacity
        disabled
        style={{
          marginTop: 12,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: "#D0D5CE",
          opacity: 0.5,
        }}
      >
        <Text
          style={{
            textAlign: "center",
            fontSize: 14,
            fontWeight: "600",
            color: "#192524",
          }}
        >
          Message host (coming soon)
        </Text>
      </TouchableOpacity>
    </View>
  );
}
