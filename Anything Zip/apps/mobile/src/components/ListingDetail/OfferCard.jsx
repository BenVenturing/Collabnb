import { View, Text, TouchableOpacity } from "react-native";
import { Heart } from "lucide-react-native";
import { getLoadLabel, getTotalDeliverables } from "@/utils/listingHelpers";

export function OfferCard({ listing, isSaved, onSaveToggle }) {
  return (
    <View
      style={{
        backgroundColor: "#EFECE9",
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#192524" }}>
          The Offer
        </Text>
        <TouchableOpacity onPress={onSaveToggle}>
          <Heart
            color={isSaved ? "#E63946" : "#3C5759"}
            fill={isSaved ? "#E63946" : "none"}
            size={24}
          />
        </TouchableOpacity>
      </View>

      <View style={{ gap: 16 }}>
        {/* What You Get */}
        <View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: "#3C5759",
              marginBottom: 8,
            }}
          >
            What you get
          </Text>
          {listing.compensation_type === "free_stay" && (
            <Text style={{ fontSize: 15, color: "#192524", marginBottom: 4 }}>
              • {listing.stay_nights} night
              {listing.stay_nights > 1 ? "s" : ""} free stay ($
              {listing.value_estimate} value)
            </Text>
          )}
          {listing.compensation_type === "paid" && (
            <Text style={{ fontSize: 15, color: "#192524", marginBottom: 4 }}>
              • ${listing.cash_payout} cash payment
            </Text>
          )}
          {listing.perks.map((perk, idx) => (
            <Text
              key={idx}
              style={{ fontSize: 15, color: "#192524", marginBottom: 4 }}
            >
              • {perk}
            </Text>
          ))}
        </View>

        {/* What You Deliver */}
        <View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: "#3C5759",
              marginBottom: 8,
            }}
          >
            What you deliver
          </Text>
          <Text style={{ fontSize: 15, color: "#192524" }}>
            {getTotalDeliverables(listing.deliverables)} total deliverables
            across {listing.deliverables.length} format
            {listing.deliverables.length > 1 ? "s" : ""}
          </Text>
          <Text style={{ fontSize: 13, color: "#3C5759", marginTop: 4 }}>
            {getLoadLabel(listing.deliverable_load)}
          </Text>
        </View>
      </View>
    </View>
  );
}
