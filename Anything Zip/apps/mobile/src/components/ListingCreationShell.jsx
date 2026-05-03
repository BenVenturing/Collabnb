import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, X, HelpCircle } from "lucide-react-native";

export default function ListingCreationShell({
  currentStep,
  totalSteps,
  onBack,
  onSaveExit,
  onNext,
  children,
  nextDisabled = false,
  nextLabel = "Next",
  showBackButton = true,
  isOverview = false,
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: "#EFECE9" }}>
      <StatusBar style="dark" />

      {/* Top Bar */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: 20,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#D0D5CE",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
          {isOverview ? (
            <X color="#192524" size={24} />
          ) : (
            <ArrowLeft color="#192524" size={24} />
          )}
        </TouchableOpacity>

        {!isOverview && (
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#192524" }}>
            Step {currentStep} of {totalSteps}
          </Text>
        )}
        {isOverview && <View style={{ width: 24 }} />}

        <View style={{ flexDirection: "row", gap: 16 }}>
          {!isOverview && (
            <TouchableOpacity onPress={onSaveExit} style={{ padding: 4 }}>
              <Text
                style={{ fontSize: 15, fontWeight: "600", color: "#3C5759" }}
              >
                Save & exit
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={{ padding: 4 }}>
            <HelpCircle color="#959D90" size={24} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Bar */}
      {!isOverview && (
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 12,
            backgroundColor: "#fff",
            borderBottomWidth: 1,
            borderBottomColor: "#D0D5CE",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              gap: 8,
            }}
          >
            {[...Array(totalSteps)].map((_, idx) => (
              <View
                key={idx}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: idx < currentStep ? "#3C5759" : "#D0D5CE",
                }}
              />
            ))}
          </View>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: isOverview ? insets.bottom + 20 : 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      {/* Bottom Bar */}
      {!isOverview && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingTop: 16,
            paddingBottom: Math.max(insets.bottom, 16),
            paddingHorizontal: 20,
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "#D0D5CE",
            flexDirection: "row",
            gap: 12,
          }}
        >
          {showBackButton && (
            <TouchableOpacity
              onPress={onBack}
              style={{
                flex: 1,
                paddingVertical: 16,
                borderRadius: 12,
                backgroundColor: "#EFECE9",
                alignItems: "center",
              }}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#192524" }}
              >
                Back
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onNext}
            disabled={nextDisabled}
            style={{
              flex: showBackButton ? 1 : 1,
              paddingVertical: 16,
              borderRadius: 12,
              backgroundColor: nextDisabled ? "#D0D5CE" : "#3C5759",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: nextDisabled ? "#959D90" : "#fff",
              }}
            >
              {nextLabel}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
