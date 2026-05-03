import { View, Text, TouchableOpacity } from "react-native";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react-native";

export function DeliverablesSection({
  deliverables,
  showAll,
  onToggleShowAll,
}) {
  const visibleDeliverables = showAll ? deliverables : deliverables.slice(0, 2);

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
        Deliverables
      </Text>
      <View style={{ gap: 12 }}>
        {visibleDeliverables.map((deliverable, idx) => (
          <View
            key={idx}
            style={{
              backgroundColor: "#EFECE9",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#192524",
                  flex: 1,
                }}
              >
                {deliverable.quantity}x {deliverable.type}
              </Text>
              {deliverable.example_url && (
                <TouchableOpacity>
                  <ExternalLink color="#3C5759" size={18} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={{ fontSize: 14, color: "#3C5759", marginBottom: 8 }}>
              {deliverable.description}
            </Text>
            {deliverable.specs && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {deliverable.specs.durationSec && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: "#D0D5CE",
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#192524" }}>
                      {deliverable.specs.durationSec}s
                    </Text>
                  </View>
                )}
                {deliverable.specs.orientation && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: "#D0D5CE",
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#192524" }}>
                      {deliverable.specs.orientation}
                    </Text>
                  </View>
                )}
                {deliverable.specs.resolution && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: "#D0D5CE",
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#192524" }}>
                      {deliverable.specs.resolution}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
      </View>

      {deliverables.length > 2 && (
        <TouchableOpacity
          onPress={onToggleShowAll}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 12,
            marginTop: 8,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#3C5759" }}>
            {showAll ? "Show less" : `Show ${deliverables.length - 2} more`}
          </Text>
          {showAll ? (
            <ChevronUp color="#3C5759" size={20} />
          ) : (
            <ChevronDown color="#3C5759" size={20} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
