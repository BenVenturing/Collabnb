import { View, Text, Dimensions } from "react-native";
import { useState } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { ArrowLeft, ArrowRight, ArrowUp, Users } from "lucide-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export default function CreatorSwipeDeck({
  creators,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
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
      setCurrentIndex(currentIndex + 1);
    }
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const velocityX = event.velocityX;
      const velocityY = event.velocityY;

      // Check for swipe up first (highest priority)
      if (translateY.value < -SWIPE_THRESHOLD && Math.abs(velocityY) > 200) {
        translateY.value = withSpring(-1000, {}, () => {
          translateX.value = 0;
          translateY.value = 0;
          runOnJS(handleSwipeAction)("up");
        });
      }
      // Check for swipe right
      else if (translateX.value > SWIPE_THRESHOLD || velocityX > 500) {
        translateX.value = withSpring(1000, {}, () => {
          translateX.value = 0;
          translateY.value = 0;
          runOnJS(handleSwipeAction)("right");
        });
      }
      // Check for swipe left
      else if (translateX.value < -SWIPE_THRESHOLD || velocityX < -500) {
        translateX.value = withSpring(-1000, {}, () => {
          translateX.value = 0;
          translateY.value = 0;
          runOnJS(handleSwipeAction)("left");
        });
      }
      // Return to center if threshold not met
      else {
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

  const leftLabelStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP,
    );
    return { opacity };
  });

  const rightLabelStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP,
    );
    return { opacity };
  });

  const upLabelStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP,
    );
    return { opacity };
  });

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
            {
              width: "100%",
              height: "100%",
              position: "absolute",
            },
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
              {/* Creator Avatar */}
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

              {/* Creator Info */}
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
                  style={{
                    fontSize: 13,
                    color: "#3C5759",
                    lineHeight: 18,
                  }}
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
