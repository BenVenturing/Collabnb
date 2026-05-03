import { View, Text, TouchableOpacity } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";

export function ThingsToKnow({ thingsToKnow, expandedItems, onToggle }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: "#192524",
          marginBottom: 16,
        }}
      >
        Things to know
      </Text>

      {/* Revision Policy */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: "#D0D5CE" }}>
        <TouchableOpacity
          onPress={() => onToggle("revision")}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 16,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#192524" }}>
            Revision policy
          </Text>
          {expandedItems.revision ? (
            <ChevronUp color="#3C5759" size={20} />
          ) : (
            <ChevronDown color="#3C5759" size={20} />
          )}
        </TouchableOpacity>
        {expandedItems.revision && (
          <View style={{ paddingBottom: 16 }}>
            <Text style={{ fontSize: 14, color: "#3C5759" }}>
              {thingsToKnow.revision_policy}
            </Text>
          </View>
        )}
      </View>

      {/* Usage Rights */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: "#D0D5CE" }}>
        <TouchableOpacity
          onPress={() => onToggle("usage")}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 16,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#192524" }}>
            Usage rights
          </Text>
          {expandedItems.usage ? (
            <ChevronUp color="#3C5759" size={20} />
          ) : (
            <ChevronDown color="#3C5759" size={20} />
          )}
        </TouchableOpacity>
        {expandedItems.usage && (
          <View style={{ paddingBottom: 16 }}>
            <Text style={{ fontSize: 14, color: "#3C5759" }}>
              {thingsToKnow.usage_rights}
            </Text>
          </View>
        )}
      </View>

      {/* Dispute */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: "#D0D5CE" }}>
        <TouchableOpacity
          onPress={() => onToggle("dispute")}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 16,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#192524" }}>
            Dispute resolution
          </Text>
          {expandedItems.dispute ? (
            <ChevronUp color="#3C5759" size={20} />
          ) : (
            <ChevronDown color="#3C5759" size={20} />
          )}
        </TouchableOpacity>
        {expandedItems.dispute && (
          <View style={{ paddingBottom: 16 }}>
            <Text style={{ fontSize: 14, color: "#3C5759" }}>
              {thingsToKnow.dispute_note}
            </Text>
          </View>
        )}
      </View>

      {/* Report listing */}
      <TouchableOpacity style={{ paddingVertical: 16 }}>
        <Text
          style={{
            fontSize: 14,
            color: "#3C5759",
            textDecorationLine: "underline",
          }}
        >
          Report this listing
        </Text>
      </TouchableOpacity>
    </View>
  );
}
