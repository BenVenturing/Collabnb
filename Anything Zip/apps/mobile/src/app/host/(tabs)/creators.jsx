import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import {
  Star,
  X,
  Send,
  Bookmark,
  Users,
  FileText,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
} from "lucide-react-native";
import MessagingStore from "@/utils/MessagingStore";
import SavedCreatorsStore from "@/utils/SavedCreatorsStore";
import ListingDraftStore from "@/utils/ListingDraftStore";
import {
  mockCreators,
  mockReviews,
  mockPastCollaborations,
} from "@/data/mockCreators";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export default function HostCreatorsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [savedCreatorIds, setSavedCreatorIds] = useState([]);
  const [showPastCollabsSheet, setShowPastCollabsSheet] = useState(false);
  const [selectedCreatorForCollabs, setSelectedCreatorForCollabs] =
    useState(null);
  const [showSavedCreators, setShowSavedCreators] = useState(false);
  const [selectedCreatorsForBulk, setSelectedCreatorsForBulk] = useState([]);
  const [showListingPicker, setShowListingPicker] = useState(false);
  const [availableListings, setAvailableListings] = useState([]);
  const [currentCreatorIndex, setCurrentCreatorIndex] = useState(0);

  useEffect(() => {
    const init = async () => {
      await SavedCreatorsStore.init();
      await MessagingStore.init();
      setSavedCreatorIds(SavedCreatorsStore.getSavedCreatorIds());

      const allListings = await ListingDraftStore.getPublishedListings();
      setAvailableListings(allListings.filter((l) => l.status === "published"));
    };
    init();

    const unsubSaved = SavedCreatorsStore.subscribe(() => {
      setSavedCreatorIds(SavedCreatorsStore.getSavedCreatorIds());
    });

    return () => {
      unsubSaved();
    };
  }, []);

  const handleSwipeRight = async (creator) => {
    await SavedCreatorsStore.addCreator(creator.id);
  };

  const handleSwipeLeft = (creator) => {
    console.log("Skipped creator:", creator.name);
  };

  const handleSwipeUp = async (creator) => {
    const listing = availableListings[0];
    const thread = await MessagingStore.createOrGetCreatorThread({
      creatorId: creator.id,
      creatorName: creator.name,
      creatorAvatarUrl: creator.avatarUri,
    });

    if (listing) {
      await MessagingStore.addListingCardMessage({
        threadId: thread.id,
        listing,
        prefilledText: `Hi ${creator.name} — I'd love to collaborate. Here's a proposal for you:`,
      });
    } else {
      await MessagingStore.sendMessage(
        thread.id,
        `Hi ${creator.name} — I'd love to collaborate with you. Let me know if you're interested!`,
      );
    }

    router.push(`/messages/${thread.id}`);
  };

  const handleReviewTap = (review) => {
    setSelectedCreatorForCollabs(review.creatorId);
    setShowPastCollabsSheet(true);
  };

  const handleBulkMessage = async (listingId) => {
    const listing = availableListings.find((l) => l.id === listingId);
    if (!listing) return;

    const selectedCreators = mockCreators.filter((c) =>
      selectedCreatorsForBulk.includes(c.id),
    );

    for (const creator of selectedCreators) {
      const thread = await MessagingStore.createOrGetCreatorThread({
        creatorId: creator.id,
        creatorName: creator.name,
        creatorAvatarUrl: creator.avatarUri,
      });

      await MessagingStore.addListingCardMessage({
        threadId: thread.id,
        listing,
        prefilledText: `Hi ${creator.name} — I'd love to collaborate. Here's a proposal for you:`,
      });
    }

    setShowListingPicker(false);
    setShowSavedCreators(false);
    setSelectedCreatorsForBulk([]);
    alert(
      `Sent listing proposal to ${selectedCreators.length} creator${selectedCreators.length > 1 ? "s" : ""}!`,
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar style="dark" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 80,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 32,
                fontWeight: "700",
                color: "#192524",
                marginBottom: 4,
              }}
            >
              Discover Creators
            </Text>
            <Text style={{ fontSize: 15, color: "#3C5759" }}>
              Find your perfect collaboration match
            </Text>
          </View>
          {savedCreatorIds.length > 0 && (
            <TouchableOpacity
              onPress={() => setShowSavedCreators(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: "#D1EBDB",
              }}
            >
              <Bookmark color="#192524" size={18} fill="#192524" />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#192524",
                }}
              >
                Saved ({savedCreatorIds.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recent Reviews Carousel */}
        <View style={{ marginBottom: 28 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 14,
            }}
          >
            Recent Reviews
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 20 }}
          >
            {mockReviews.map((review) => (
              <TouchableOpacity
                key={review.id}
                onPress={() => handleReviewTap(review)}
                activeOpacity={0.8}
                style={{ width: 290 }}
              >
                <BlurView
                  intensity={60}
                  tint="light"
                  style={{
                    borderRadius: 20,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.5)",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      padding: 18,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 14,
                      }}
                    >
                      <View
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 25,
                          overflow: "hidden",
                          borderWidth: 2,
                          borderColor: "#fff",
                          zIndex: 2,
                        }}
                      >
                        <Image
                          source={{ uri: review.creatorAvatarUri }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                      </View>
                      <View
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 25,
                          overflow: "hidden",
                          borderWidth: 2,
                          borderColor: "#fff",
                          marginLeft: -18,
                          zIndex: 1,
                        }}
                      >
                        <Image
                          source={{ uri: review.listingAvatarUri }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                      </View>
                      <View style={{ marginLeft: 14, flex: 1 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 3,
                            marginBottom: 3,
                          }}
                        >
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star
                              key={i}
                              size={13}
                              color="#F5D547"
                              fill="#F5D547"
                            />
                          ))}
                        </View>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#192524",
                          }}
                          numberOfLines={1}
                        >
                          {review.creatorName}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={{
                        fontSize: 14,
                        color: "#3C5759",
                        lineHeight: 20,
                        marginBottom: 10,
                      }}
                      numberOfLines={2}
                    >
                      {review.snippet}
                    </Text>

                    <Text
                      style={{
                        fontSize: 12,
                        color: "#959D90",
                        fontWeight: "500",
                      }}
                    >
                      {review.listingName}
                    </Text>
                  </View>
                </BlurView>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Swipe Deck */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#192524",
            marginBottom: 14,
          }}
        >
          Swipe to Match
        </Text>
        <SwipeDeck
          creators={mockCreators}
          currentIndex={currentCreatorIndex}
          onIndexChange={setCurrentCreatorIndex}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          onSwipeUp={handleSwipeUp}
        />
      </ScrollView>

      {/* Past Collaborations Bottom Sheet */}
      <PastCollaborationsSheet
        visible={showPastCollabsSheet}
        creatorId={selectedCreatorForCollabs}
        onClose={() => setShowPastCollabsSheet(false)}
        insets={insets}
      />

      {/* Saved Creators Modal */}
      <SavedCreatorsModal
        visible={showSavedCreators}
        savedCreatorIds={savedCreatorIds}
        selectedForBulk={selectedCreatorsForBulk}
        onToggleSelect={(creatorId) => {
          if (selectedCreatorsForBulk.includes(creatorId)) {
            setSelectedCreatorsForBulk(
              selectedCreatorsForBulk.filter((id) => id !== creatorId),
            );
          } else {
            setSelectedCreatorsForBulk([...selectedCreatorsForBulk, creatorId]);
          }
        }}
        onSendBulk={() => setShowListingPicker(true)}
        onClose={() => setShowSavedCreators(false)}
        insets={insets}
      />

      {/* Listing Picker Modal */}
      <ListingPickerModal
        visible={showListingPicker}
        availableListings={availableListings}
        onSelectListing={handleBulkMessage}
        onClose={() => setShowListingPicker(false)}
      />
    </View>
  );
}

// Swipe Deck Component
function SwipeDeck({
  creators,
  currentIndex,
  onIndexChange,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const currentCreator = creators[currentIndex];

  const handleSwipeAction = (direction) => {
    if (direction === "left") {
      onSwipeLeft(currentCreator);
    } else if (direction === "right") {
      onSwipeRight(currentCreator);
    } else if (direction === "up") {
      onSwipeUp(currentCreator);
    }

    if (currentIndex < creators.length - 1) {
      onIndexChange(currentIndex + 1);
    }
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (
        translateY.value < -SWIPE_THRESHOLD &&
        Math.abs(event.velocityY) > 200
      ) {
        translateY.value = withSpring(-1000, {}, () => {
          translateX.value = 0;
          translateY.value = 0;
          runOnJS(handleSwipeAction)("up");
        });
      } else if (translateX.value > SWIPE_THRESHOLD || event.velocityX > 500) {
        translateX.value = withSpring(1000, {}, () => {
          translateX.value = 0;
          translateY.value = 0;
          runOnJS(handleSwipeAction)("right");
        });
      } else if (
        translateX.value < -SWIPE_THRESHOLD ||
        event.velocityX < -500
      ) {
        translateX.value = withSpring(-1000, {}, () => {
          translateX.value = 0;
          translateY.value = 0;
          runOnJS(handleSwipeAction)("left");
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-15, 0, 15],
      Extrapolate.CLAMP,
    );

    const opacity = interpolate(
      Math.abs(translateX.value) + Math.abs(translateY.value),
      [0, SWIPE_THRESHOLD],
      [1, 0.7],
      Extrapolate.CLAMP,
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${rotate}deg` },
      ],
      opacity,
    };
  });

  const leftLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP,
    ),
  }));

  const rightLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP,
    ),
  }));

  const upLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP,
    ),
  }));

  if (!currentCreator) {
    return (
      <View
        style={{
          height: 480,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#EFECE9",
          borderRadius: 24,
          padding: 40,
        }}
      >
        <Users color="#959D90" size={48} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: "#192524",
            marginTop: 16,
            textAlign: "center",
          }}
        >
          No more creators
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#3C5759",
            marginTop: 8,
            textAlign: "center",
          }}
        >
          Check back later for new matches
        </Text>
      </View>
    );
  }

  return (
    <View style={{ height: 480, position: "relative" }}>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            { width: "100%", height: "100%", position: "absolute" },
            cardAnimatedStyle,
          ]}
        >
          <BlurView
            intensity={60}
            tint="light"
            style={{
              flex: 1,
              borderRadius: 24,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.5)",
            }}
          >
            <View
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                flex: 1,
                borderRadius: 24,
              }}
            >
              <View
                style={{
                  height: 280,
                  width: "100%",
                  backgroundColor: "#EFECE9",
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  overflow: "hidden",
                }}
              >
                <Image
                  source={{ uri: currentCreator.avatarUri }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={200}
                />
              </View>

              <View style={{ padding: 20 }}>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "700",
                    color: "#192524",
                    marginBottom: 6,
                  }}
                >
                  {currentCreator.name}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 12,
                      backgroundColor: "#D1EBDB",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: "#192524",
                      }}
                    >
                      {currentCreator.tier}
                    </Text>
                  </View>
                  <View
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
                      {currentCreator.followers} followers
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 6,
                    marginBottom: 12,
                  }}
                >
                  {currentCreator.tags.map((tag, idx) => (
                    <View
                      key={idx}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 10,
                        backgroundColor: "#EFECE9",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "600",
                          color: "#3C5759",
                        }}
                      >
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>

                <Text
                  style={{ fontSize: 13, color: "#3C5759", lineHeight: 18 }}
                  numberOfLines={3}
                >
                  {currentCreator.bio}
                </Text>
              </View>
            </View>
          </BlurView>

          {/* Swipe Labels */}
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 40,
                left: 40,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderWidth: 2,
                borderColor: "#3C5759",
              },
              leftLabelStyle,
            ]}
          >
            <ArrowLeft color="#3C5759" size={20} />
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#3C5759" }}>
              Skip
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              {
                position: "absolute",
                top: 40,
                right: 40,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderWidth: 2,
                borderColor: "#D1EBDB",
              },
              rightLabelStyle,
            ]}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#192524" }}>
              Save
            </Text>
            <ArrowRight color="#192524" size={20} />
          </Animated.View>

          <Animated.View
            style={[
              {
                position: "absolute",
                top: 120,
                alignSelf: "center",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderWidth: 2,
                borderColor: "#3C5759",
              },
              upLabelStyle,
            ]}
          >
            <ArrowUp color="#3C5759" size={20} />
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#3C5759" }}>
              Message Now
            </Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// Past Collaborations Sheet
function PastCollaborationsSheet({ visible, creatorId, onClose, insets }) {
  if (!visible || !creatorId) return null;

  const collabs = mockPastCollaborations[creatorId] || [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(25, 37, 36, 0.7)",
          justifyContent: "flex-end",
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <BlurView
          intensity={80}
          tint="light"
          style={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "hidden",
            maxHeight: "75%",
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.98)",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: insets.bottom,
            }}
          >
            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: "#D0D5CE",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{ fontSize: 20, fontWeight: "700", color: "#192524" }}
              >
                Past Collaborations
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#EFECE9",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X color="#3C5759" size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 500 }}
              contentContainerStyle={{ padding: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {collabs.length === 0 ? (
                <View style={{ padding: 40, alignItems: "center" }}>
                  <Users color="#959D90" size={48} />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#192524",
                      marginTop: 16,
                      textAlign: "center",
                    }}
                  >
                    No past collaborations
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#3C5759",
                      marginTop: 8,
                      textAlign: "center",
                    }}
                  >
                    This would be a first collaboration
                  </Text>
                </View>
              ) : (
                collabs.map((collab) => (
                  <View
                    key={collab.collaborationId}
                    style={{
                      marginBottom: 16,
                      padding: 16,
                      backgroundColor: "#EFECE9",
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: "#D0D5CE",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 12,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "700",
                            color: "#192524",
                            marginBottom: 4,
                          }}
                        >
                          {collab.listingName}
                        </Text>
                        <Text style={{ fontSize: 13, color: "#3C5759" }}>
                          {collab.date}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {Array.from({ length: collab.rating }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            color="#F5D547"
                            fill="#F5D547"
                          />
                        ))}
                      </View>
                    </View>

                    <Text
                      style={{
                        fontSize: 14,
                        color: "#192524",
                        lineHeight: 20,
                        marginBottom: 12,
                      }}
                    >
                      {collab.longReview}
                    </Text>

                    <View
                      style={{
                        padding: 12,
                        backgroundColor: "#fff",
                        borderRadius: 12,
                        marginBottom: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: "#192524",
                          marginBottom: 6,
                        }}
                      >
                        Deliverables
                      </Text>
                      <Text style={{ fontSize: 13, color: "#3C5759" }}>
                        {collab.deliverableSummary}
                      </Text>
                    </View>

                    <View
                      style={{
                        padding: 12,
                        backgroundColor: "rgba(209, 235, 219, 0.5)",
                        borderRadius: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: "#192524",
                          marginBottom: 6,
                        }}
                      >
                        Analytics (Coming soon)
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#3C5759",
                          fontStyle: "italic",
                        }}
                      >
                        Track impressions, engagement, and conversions
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

// Saved Creators Modal
function SavedCreatorsModal({
  visible,
  savedCreatorIds,
  selectedForBulk,
  onToggleSelect,
  onSendBulk,
  onClose,
  insets,
}) {
  if (!visible) return null;

  const savedCreators = mockCreators.filter((c) =>
    savedCreatorIds.includes(c.id),
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(25, 37, 36, 0.7)",
          justifyContent: "flex-end",
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <BlurView
          intensity={80}
          tint="light"
          style={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "hidden",
            maxHeight: "80%",
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.98)",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: insets.bottom,
            }}
          >
            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: "#D0D5CE",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{ fontSize: 20, fontWeight: "700", color: "#192524" }}
              >
                Saved Creators ({savedCreatorIds.length})
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#EFECE9",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X color="#3C5759" size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 500 }}
              contentContainerStyle={{ padding: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {savedCreators.map((creator) => {
                const isSelected = selectedForBulk.includes(creator.id);
                return (
                  <TouchableOpacity
                    key={creator.id}
                    onPress={() => onToggleSelect(creator.id)}
                    style={{
                      marginBottom: 12,
                      padding: 16,
                      backgroundColor: isSelected ? "#D1EBDB" : "#EFECE9",
                      borderRadius: 16,
                      borderWidth: 2,
                      borderColor: isSelected ? "#3C5759" : "transparent",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        overflow: "hidden",
                        marginRight: 12,
                      }}
                    >
                      <Image
                        source={{ uri: creator.avatarUri }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: "#192524",
                          marginBottom: 4,
                        }}
                      >
                        {creator.name}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 8,
                            backgroundColor: "#fff",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "600",
                              color: "#192524",
                            }}
                          >
                            {creator.tier}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: "#3C5759" }}>
                          {creator.followers}
                        </Text>
                      </View>
                    </View>
                    {isSelected && <CheckCircle2 color="#3C5759" size={24} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {selectedForBulk.length > 0 && (
              <View
                style={{
                  padding: 20,
                  borderTopWidth: 1,
                  borderTopColor: "#D0D5CE",
                }}
              >
                <TouchableOpacity
                  onPress={onSendBulk}
                  style={{
                    paddingVertical: 16,
                    borderRadius: 12,
                    backgroundColor: "#3C5759",
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Send color="#fff" size={20} />
                  <Text
                    style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}
                  >
                    Send to {selectedForBulk.length} creator
                    {selectedForBulk.length > 1 ? "s" : ""}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

// Listing Picker Modal
function ListingPickerModal({
  visible,
  availableListings,
  onSelectListing,
  onClose,
}) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(25, 37, 36, 0.8)",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <BlurView
          intensity={80}
          tint="light"
          style={{ borderRadius: 24, overflow: "hidden", maxHeight: "70%" }}
        >
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.98)",
              borderRadius: 24,
            }}
          >
            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: "#D0D5CE",
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#192524",
                  marginBottom: 8,
                }}
              >
                Choose a listing
              </Text>
              <Text style={{ fontSize: 14, color: "#3C5759" }}>
                Select which listing to propose to selected creators
              </Text>
            </View>

            <ScrollView
              style={{ maxHeight: 400 }}
              contentContainerStyle={{ padding: 20 }}
            >
              {availableListings.length === 0 ? (
                <View style={{ padding: 40, alignItems: "center" }}>
                  <FileText color="#959D90" size={48} />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#192524",
                      marginTop: 16,
                      textAlign: "center",
                    }}
                  >
                    No listings available
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#3C5759",
                      marginTop: 8,
                      textAlign: "center",
                    }}
                  >
                    Create a listing first
                  </Text>
                </View>
              ) : (
                availableListings.map((listing) => (
                  <TouchableOpacity
                    key={listing.id}
                    onPress={() => onSelectListing(listing.id)}
                    style={{
                      marginBottom: 12,
                      padding: 16,
                      backgroundColor: "#EFECE9",
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: "#D0D5CE",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#192524",
                        marginBottom: 4,
                      }}
                    >
                      {listing.title}
                    </Text>
                    <Text style={{ fontSize: 13, color: "#3C5759" }}>
                      {listing.location_city}, {listing.location_country}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View
              style={{
                padding: 20,
                borderTopWidth: 1,
                borderTopColor: "#D0D5CE",
              }}
            >
              <TouchableOpacity
                onPress={onClose}
                style={{
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: "#EFECE9",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ fontSize: 15, fontWeight: "600", color: "#192524" }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}
