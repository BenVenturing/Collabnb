import { View, Text } from "react-native";
import { getTierLabel } from "@/utils/listingHelpers";

export function ListingBadges({ listing, daysUntilDue }) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 24,
      }}
    >
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
          backgroundColor: "#EFECE9",
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "600", color: "#192524" }}>
          {getTierLabel(listing.creator_tier_required)}
        </Text>
      </View>
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
          backgroundColor: "#D1EBDB",
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "600", color: "#192524" }}>
          {listing.compensation_type === "free_stay"
            ? `${listing.stay_nights}N Free Stay`
            : `$${listing.cash_payout} Cash`}
        </Text>
      </View>
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
          backgroundColor: "#EFECE9",
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "600", color: "#192524" }}>
          {listing.deliverable_load.charAt(0).toUpperCase() +
            listing.deliverable_load.slice(1)}{" "}
          Load
        </Text>
      </View>
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
          backgroundColor: "#FFE5E5",
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "600", color: "#192524" }}>
          Due in {daysUntilDue} days
        </Text>
      </View>
    </View>
  );
}
