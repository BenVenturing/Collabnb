import { View, Text, TouchableOpacity } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";

export function IdealCreator({ idealCreator, isExpanded, onToggle }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <TouchableOpacity
        onPress={onToggle}
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#D0D5CE",
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#192524" }}>
          Ideal Creator
        </Text>
        {isExpanded ? (
          <ChevronUp color="#3C5759" size={24} />
        ) : (
          <ChevronDown color="#3C5759" size={24} />
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View style={{ paddingTop: 16, gap: 16 }}>
          <View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#3C5759",
                marginBottom: 8,
              }}
            >
              Platforms
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {idealCreator.platforms.map((platform, idx) => (
                <View
                  key={idx}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: "#3C5759",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#fff",
                      fontWeight: "600",
                    }}
                  >
                    {platform}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#3C5759",
                marginBottom: 8,
              }}
            >
              Niches
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {idealCreator.niche_tags.map((niche, idx) => (
                <View
                  key={idx}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: "#EFECE9",
                  }}
                >
                  <Text style={{ fontSize: 13, color: "#192524" }}>
                    {niche}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#3C5759",
                marginBottom: 8,
              }}
            >
              Additional Notes
            </Text>
            {idealCreator.notes.map((note, idx) => (
              <Text
                key={idx}
                style={{
                  fontSize: 14,
                  color: "#192524",
                  marginBottom: 6,
                }}
              >
                • {note}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
