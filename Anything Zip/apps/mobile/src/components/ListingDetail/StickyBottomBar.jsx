import { View, Text, TouchableOpacity } from "react-native";
import { Heart, Send } from "lucide-react-native";
import { getTotalDeliverables } from "@/utils/listingHelpers";

export function StickyBottomBar({
  listing,
  isSaved,
  onSaveToggle,
  onApply,
  bottomInset,
}) {
  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#D0D5CE",
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: bottomInset + 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
      }}
    >
      {/* Offer Summary */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: "700", color: "#192524" }}>
          {listing.compensation_type === "free_stay"
            ? `${listing.stay_nights}N Free`
            : `$${listing.cash_payout}`}
        </Text>
        <Text style={{ fontSize: 13, color: "#3C5759" }}>
          {getTotalDeliverables(listing.deliverables)} deliverables
        </Text>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        onPress={onSaveToggle}
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: "#EFECE9",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Heart
          color={isSaved ? "#E63946" : "#3C5759"}
          fill={isSaved ? "#E63946" : "none"}
          size={24}
        />
      </TouchableOpacity>

      {/* Apply Button */}
      <TouchableOpacity
        onPress={onApply}
        style={{
          paddingHorizontal: 24,
          paddingVertical: 14,
          borderRadius: 24,
          backgroundColor: "#3C5759",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
          Apply
        </Text>
        <Send color="#fff" size={18} />
      </TouchableOpacity>
    </View>
  );
}
