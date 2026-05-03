import { View, Text, TouchableOpacity } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";

export function BrandGuidelines({ guidelines, isExpanded, onToggle }) {
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
          Brand Guidelines
        </Text>
        {isExpanded ? (
          <ChevronUp color="#3C5759" size={24} />
        ) : (
          <ChevronDown color="#3C5759" size={24} />
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View style={{ paddingTop: 16, gap: 16 }}>
          {/* Vibe */}
          <View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#3C5759",
                marginBottom: 8,
              }}
            >
              Vibe & Aesthetic
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {guidelines.vibe_tags.map((tag, idx) => (
                <View
                  key={idx}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: "#EFECE9",
                  }}
                >
                  <Text style={{ fontSize: 13, color: "#192524" }}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Do's */}
          <View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#3C5759",
                marginBottom: 8,
              }}
            >
              ✅ Do's
            </Text>
            {guidelines.dos.map((item, idx) => (
              <Text
                key={idx}
                style={{
                  fontSize: 14,
                  color: "#192524",
                  marginBottom: 6,
                }}
              >
                • {item}
              </Text>
            ))}
          </View>

          {/* Don'ts */}
          <View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#3C5759",
                marginBottom: 8,
              }}
            >
              ❌ Don'ts
            </Text>
            {guidelines.donts.map((item, idx) => (
              <Text
                key={idx}
                style={{
                  fontSize: 14,
                  color: "#192524",
                  marginBottom: 6,
                }}
              >
                • {item}
              </Text>
            ))}
          </View>

          {/* Required */}
          <View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#3C5759",
                marginBottom: 8,
              }}
            >
              Required Tags & Mentions
            </Text>
            {guidelines.required_tags.map((tag, idx) => (
              <Text
                key={idx}
                style={{
                  fontSize: 14,
                  color: "#192524",
                  marginBottom: 4,
                }}
              >
                • {tag}
              </Text>
            ))}
            {guidelines.required_mentions.map((mention, idx) => (
              <Text
                key={idx}
                style={{
                  fontSize: 14,
                  color: "#192524",
                  marginBottom: 4,
                }}
              >
                • {mention}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
