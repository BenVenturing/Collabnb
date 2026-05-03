import { View, Text, TouchableOpacity, Alert, Animated } from "react-native";
import { useState, useEffect, useRef } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ChevronDown, ChevronUp, Eye, DollarSign } from "lucide-react-native";
import ListingCreationShell from "@/components/ListingCreationShell";
import ListingDraftStore from "@/utils/ListingDraftStore";

// Simple confetti particle component
const ConfettiParticle = ({ delay, duration, startX }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 600,
        duration: duration,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: (Math.random() - 0.5) * 200,
        duration: duration,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: duration,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: Math.random() * 720,
        duration: duration,
        delay: delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const colors = ["#D1EBDB", "#3C5759", "#EFECE9", "#D0D5CE"];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: startX,
        top: -20,
        width: 10,
        height: 10,
        backgroundColor: color,
        borderRadius: 5,
        transform: [
          { translateY },
          { translateX },
          {
            rotate: rotate.interpolate({
              inputRange: [0, 720],
              outputRange: ["0deg", "720deg"],
            }),
          },
        ],
        opacity,
      }}
    />
  );
};

const ConfettiOverlay = ({ onComplete }) => {
  const [particles] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      key: i,
      delay: Math.random() * 200,
      duration: 1500 + Math.random() * 500,
      startX: Math.random() * 400,
    })),
  );

  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {particles.map((p) => (
        <ConfettiParticle
          key={p.key}
          delay={p.delay}
          duration={p.duration}
          startX={p.startX}
        />
      ))}
    </View>
  );
};

export default function CreateListingReview() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [draft, setDraft] = useState(ListingDraftStore.getDraft());
  const [showFees, setShowFees] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const init = async () => {
      await ListingDraftStore.init();

      // Check if we're in edit mode
      if (params.editMode === "true" && params.id) {
        const existingListing = await ListingDraftStore.getListingById(
          params.id,
        );
        if (existingListing && Object.keys(existingListing).length > 0) {
          // Pre-populate draft with existing listing data
          await ListingDraftStore.updateDraft({
            ...existingListing,
            _editingId: params.id,
          });
        }
      }

      setDraft(ListingDraftStore.getDraft());
    };
    init();

    const unsub = ListingDraftStore.subscribe(() => {
      setDraft(ListingDraftStore.getDraft());
    });
    return unsub;
  }, [params.editMode, params.id]);

  const fee = ListingDraftStore.calculateFee();

  const getTotalDeliverables = () => {
    return draft.deliverables.reduce((sum, d) => sum + d.quantity, 0);
  };

  const getTierLabel = (tier) => {
    const labels = {
      ugc_beginner: "UGC Beginner",
      ugc_pro: "UGC Pro",
      micro: "Micro",
      mid: "Mid",
    };
    return labels[tier] || tier;
  };

  const getCompensationDisplay = () => {
    if (draft.compensation_type === "free_stay") {
      return `${draft.stay_nights} night${draft.stay_nights > 1 ? "s" : ""} free stay`;
    } else if (draft.compensation_type === "paid") {
      return `$${draft.cash_payout} cash`;
    } else {
      return `${draft.stay_nights}N + $${draft.cash_payout} cash`;
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      // If editing, update the existing listing; otherwise publish new
      if (params.editMode === "true" && params.id) {
        // Update existing listing
        await ListingDraftStore.updateExistingListing(params.id, draft);
        Alert.alert("Changes Saved! ✓", "Your listing has been updated.", [
          {
            text: "View Listing",
            onPress: () =>
              router.replace(`/listing-detail?id=${params.id}&isHost=true`),
          },
        ]);
      } else {
        // Publish new listing
        await ListingDraftStore.publishListing();
        setShowConfetti(true);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to save listing. Please try again.");
      setPublishing(false);
    }
  };

  const handleConfettiComplete = () => {
    setShowConfetti(false);
    Alert.alert(
      "Listing Created! 🎉",
      "Your listing is now live and visible to creators.",
      [
        {
          text: "View Listings",
          onPress: () => router.replace("/host/(tabs)/listings"),
        },
      ],
    );
  };

  const handleSaveDraft = async () => {
    Alert.alert(
      "Draft Saved",
      "You can continue editing later from your Listings tab.",
      [
        {
          text: "OK",
          onPress: () => router.push("/host/(tabs)/listings"),
        },
      ],
    );
  };

  const isEditMode = params.editMode === "true";

  return (
    <>
      <ListingCreationShell
        currentStep={4}
        totalSteps={4}
        onBack={() => router.back()}
        onSaveExit={() => router.push("/host/(tabs)/listings")}
        onNext={handlePublish}
        nextLabel={
          publishing
            ? isEditMode
              ? "Saving..."
              : "Publishing..."
            : isEditMode
              ? "Save Changes"
              : "Publish listing"
        }
        nextDisabled={publishing}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <Eye color="#3C5759" size={24} />
            <Text
              style={{
                fontSize: 28,
                fontWeight: "700",
                color: "#192524",
              }}
            >
              Review & publish
            </Text>
          </View>
          <Text
            style={{
              fontSize: 15,
              color: "#3C5759",
              marginBottom: 32,
              lineHeight: 22,
            }}
          >
            Here's how your listing will appear to creators. Review everything
            before publishing.
          </Text>

          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "#D0D5CE",
              overflow: "hidden",
              marginBottom: 24,
            }}
          >
            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: "#EFECE9",
              }}
            >
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 6,
                }}
              >
                {draft.title}
              </Text>
              <Text style={{ fontSize: 15, color: "#3C5759" }}>
                {draft.location_city}, {draft.location_country}
              </Text>
            </View>

            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: "#EFECE9",
              }}
            >
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: "#EFECE9",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: "#192524",
                    }}
                  >
                    {getTierLabel(draft.creator_tier_required)}
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
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: "#192524",
                    }}
                  >
                    {getCompensationDisplay()}
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
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: "#192524",
                    }}
                  >
                    {draft.deliverable_load.charAt(0).toUpperCase() +
                      draft.deliverable_load.slice(1)}{" "}
                    Load
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: "#EFECE9",
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
                The Offer
              </Text>
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: "#3C5759",
                    marginBottom: 6,
                  }}
                >
                  Add-ons
                </Text>
                <Text
                  style={{ fontSize: 15, color: "#192524", marginBottom: 4 }}
                >
                  • {getCompensationDisplay()}
                </Text>
                {draft.perks.map((perk, idx) => (
                  <Text
                    key={idx}
                    style={{ fontSize: 15, color: "#192524", marginBottom: 4 }}
                  >
                    • {perk}
                  </Text>
                ))}
                {draft.affiliate_code && (
                  <Text
                    style={{ fontSize: 15, color: "#192524", marginBottom: 4 }}
                  >
                    • Affiliate code: {draft.affiliate_code}
                  </Text>
                )}
              </View>
              <View>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: "#3C5759",
                    marginBottom: 6,
                  }}
                >
                  What you deliver
                </Text>
                <Text style={{ fontSize: 15, color: "#192524" }}>
                  {getTotalDeliverables()} total deliverables across{" "}
                  {draft.deliverables.length} format
                  {draft.deliverables.length > 1 ? "s" : ""}
                </Text>
              </View>

              {draft.vibe_tags.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                  >
                    {draft.vibe_tags.map((tag, idx) => (
                      <View
                        key={idx}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 12,
                          backgroundColor: "#EFECE9",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: "#192524",
                          }}
                        >
                          {tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: "#EFECE9",
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
                Dates & Deadlines
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#192524",
                  marginBottom: 4,
                }}
              >
                Collaboration Window
              </Text>
              <Text
                style={{ fontSize: 14, color: "#3C5759", marginBottom: 12 }}
              >
                {draft.collaboration_window.startDate} -{" "}
                {draft.collaboration_window.endDate}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#192524",
                  marginBottom: 4,
                }}
              >
                Deliverables Due
              </Text>
              <Text style={{ fontSize: 14, color: "#3C5759" }}>
                {draft.turnaround_time_days} days after stay
              </Text>
            </View>

            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: "#EFECE9",
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
                Deliverables
              </Text>
              <View style={{ gap: 10 }}>
                {draft.deliverables.slice(0, 2).map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: "#EFECE9",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: "#192524",
                        marginBottom: 4,
                      }}
                    >
                      {item.quantity}x {item.type}
                    </Text>
                    <Text style={{ fontSize: 13, color: "#3C5759" }}>
                      {item.description}
                    </Text>
                  </View>
                ))}
                {draft.deliverables.length > 2 && (
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#3C5759",
                      textAlign: "center",
                      paddingVertical: 4,
                    }}
                  >
                    +{draft.deliverables.length - 2} more
                  </Text>
                )}
              </View>
            </View>

            <View style={{ padding: 20 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 12,
                }}
              >
                Things to know
              </Text>
              <View style={{ gap: 12 }}>
                <View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#192524",
                      marginBottom: 4,
                    }}
                  >
                    Revision policy
                  </Text>
                  <Text style={{ fontSize: 13, color: "#3C5759" }}>
                    {draft.revision_policy}
                  </Text>
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#192524",
                      marginBottom: 4,
                    }}
                  >
                    Usage rights
                  </Text>
                  <Text style={{ fontSize: 13, color: "#3C5759" }}>
                    {draft.usage_rights}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setShowFees(!showFees)}
            style={{
              backgroundColor: "#FFF8E5",
              borderRadius: 16,
              padding: 16,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: "#FFE5A0",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <DollarSign color="#D97706" size={20} />
                <Text
                  style={{ fontSize: 16, fontWeight: "700", color: "#192524" }}
                >
                  Host-only: Pricing & Fees
                </Text>
              </View>
              {showFees ? (
                <ChevronUp color="#D97706" size={20} />
              ) : (
                <ChevronDown color="#D97706" size={20} />
              )}
            </View>

            {showFees && (
              <View
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: "#FFE5A0",
                }}
              >
                <View style={{ marginBottom: 8 }}>
                  <Text
                    style={{ fontSize: 13, color: "#3C5759", marginBottom: 4 }}
                  >
                    Platform fee
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: "#192524",
                    }}
                  >
                    ${fee.calculatedFee || fee.amount}
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: "#959D90", marginTop: 2 }}
                  >
                    {fee.description}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: "#FFFAEB",
                    borderRadius: 8,
                    padding: 10,
                    marginTop: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#D97706",
                      fontWeight: "600",
                    }}
                  >
                    ⚠️ Creators don't see these fees
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSaveDraft}
            style={{
              paddingVertical: 16,
              borderRadius: 12,
              backgroundColor: "#EFECE9",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#192524" }}>
              Save draft
            </Text>
          </TouchableOpacity>
        </View>
      </ListingCreationShell>

      {showConfetti && <ConfettiOverlay onComplete={handleConfettiComplete} />}
    </>
  );
}
