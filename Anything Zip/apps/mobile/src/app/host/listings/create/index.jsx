import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import ListingCreationShell from "@/components/ListingCreationShell";
import { Sparkles, FileText, Package, CheckCircle } from "lucide-react-native";

export default function CreateListingOverview() {
  const router = useRouter();

  const steps = [
    {
      icon: FileText,
      title: "The basics",
      description: "Tell us about your listing and collaboration type",
    },
    {
      icon: Sparkles,
      title: "The offer",
      description: "What perks and experience will creators get?",
    },
    {
      icon: Package,
      title: "Deliverables & dates",
      description: "Set collaboration window and define what you need",
    },
    {
      icon: CheckCircle,
      title: "Review & publish",
      description: "Preview your listing and publish to creators",
    },
  ];

  return (
    <ListingCreationShell
      isOverview
      onBack={() => router.replace("/host/(tabs)/dashboard")}
      onSaveExit={() => {}}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 32 }}>
        {/* Hero */}
        <View style={{ marginBottom: 40 }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 12,
            }}
          >
            It's easy to create{"\n"}a listing on Collabnb
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: "#3C5759",
              lineHeight: 24,
            }}
          >
            We'll guide you through the process step by step. You can save and
            come back anytime.
          </Text>
        </View>

        {/* Steps */}
        <View style={{ gap: 16, marginBottom: 32 }}>
          {steps.map((step, idx) => (
            <View
              key={idx}
              style={{
                backgroundColor: "#fff",
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: "#D0D5CE",
                flexDirection: "row",
                gap: 16,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "#D1EBDB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <step.icon color="#3C5759" size={24} />
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
                  {idx + 1}. {step.title}
                </Text>
                <Text style={{ fontSize: 14, color: "#3C5759" }}>
                  {step.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Get Started Button */}
        <TouchableOpacity
          onPress={() => router.push("/host/listings/create/basics")}
          style={{
            paddingVertical: 18,
            borderRadius: 14,
            backgroundColor: "#3C5759",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#fff" }}>
            Get started
          </Text>
        </TouchableOpacity>
      </View>
    </ListingCreationShell>
  );
}
