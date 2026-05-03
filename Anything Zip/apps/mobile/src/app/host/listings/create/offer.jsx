import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { X, Plus, HelpCircle, Sparkles } from "lucide-react-native";
import ListingCreationShell from "@/components/ListingCreationShell";
import ListingDraftStore from "@/utils/ListingDraftStore";
import GlassHelpModal from "@/components/GlassHelpModal";

export default function CreateListingOffer() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [draft, setDraft] = useState(ListingDraftStore.getDraft());
  const [newPerk, setNewPerk] = useState("");
  const [newTag, setNewTag] = useState("");
  const [showAddonsHelp, setShowAddonsHelp] = useState(false);
  const [showAffiliateHelp, setShowAffiliateHelp] = useState(false);

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

  const addonsHelpData = [
    {
      label: "Hot tub access",
      description: "Include amenities like hot tubs, pools, or spa access.",
    },
    {
      label: "Free activity passes",
      description: "Ski passes, wine tasting vouchers, or local experiences.",
    },
    {
      label: "Breakfast included",
      description: "Meals, snacks, or welcome packages.",
    },
    {
      label: "Airport transfer",
      description: "Transportation, parking, or EV charging.",
    },
  ];

  const affiliateHelpData = [
    {
      label: "What is an affiliate code?",
      description:
        "Creators can include the code/link in content so viewers can book. You track conversions externally for now.",
    },
    {
      label: "How creators use it",
      description:
        "They add it to captions, stories, or video descriptions to drive bookings.",
    },
  ];

  const generateAffiliateCode = async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "COLLABNB-";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    await ListingDraftStore.updateDraft({ affiliate_code: code });
  };

  const addPerk = async () => {
    if (!newPerk.trim()) return;
    await ListingDraftStore.updateDraft({
      perks: [...draft.perks, newPerk.trim()],
    });
    setNewPerk("");
  };

  const removePerk = async (idx) => {
    const updated = draft.perks.filter((_, i) => i !== idx);
    await ListingDraftStore.updateDraft({ perks: updated });
  };

  const addTag = async () => {
    if (!newTag.trim()) return;
    await ListingDraftStore.updateDraft({
      vibe_tags: [...draft.vibe_tags, newTag.trim()],
    });
    setNewTag("");
  };

  const removeTag = async (idx) => {
    const updated = draft.vibe_tags.filter((_, i) => i !== idx);
    await ListingDraftStore.updateDraft({ vibe_tags: updated });
  };

  const handleNext = () => {
    router.push({
      pathname: "/host/listings/create/deliverables",
      params:
        params.editMode === "true" && params.id
          ? { id: params.id, editMode: "true" }
          : {},
    });
  };

  const handleSaveExit = () => {
    router.push("/host/(tabs)/listings");
  };

  return (
    <>
      <ListingCreationShell
        currentStep={2}
        totalSteps={4}
        onBack={() => router.back()}
        onSaveExit={handleSaveExit}
        onNext={handleNext}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 8,
            }}
          >
            What's the offer?
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: "#3C5759",
              marginBottom: 32,
              lineHeight: 22,
            }}
          >
            Tell creators what makes your listing special and what perks they'll
            get.
          </Text>

          {/* Add-ons */}
          <View style={{ marginBottom: 28 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#192524",
                }}
              >
                Add-ons
              </Text>
              <TouchableOpacity onPress={() => setShowAddonsHelp(true)}>
                <HelpCircle color="#3C5759" size={18} />
              </TouchableOpacity>
            </View>
            <Text
              style={{
                fontSize: 14,
                color: "#3C5759",
                marginBottom: 12,
                lineHeight: 20,
              }}
            >
              Optional extras you can include to sweeten the offer.
            </Text>

            {/* Existing Perks */}
            {draft.perks.length > 0 && (
              <View style={{ gap: 8, marginBottom: 12 }}>
                {draft.perks.map((perk, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#D1EBDB",
                      borderRadius: 12,
                      paddingLeft: 16,
                      paddingRight: 8,
                      paddingVertical: 12,
                    }}
                  >
                    <Text style={{ flex: 1, fontSize: 15, color: "#192524" }}>
                      • {perk}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removePerk(idx)}
                      style={{ padding: 4 }}
                    >
                      <X color="#3C5759" size={18} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add Perk */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                value={newPerk}
                onChangeText={setNewPerk}
                placeholder="e.g., Hot tub access"
                placeholderTextColor="#959D90"
                onSubmitEditing={addPerk}
                returnKeyType="done"
                style={{
                  flex: 1,
                  backgroundColor: "#fff",
                  borderWidth: 1,
                  borderColor: "#D0D5CE",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: "#192524",
                }}
              />
              <TouchableOpacity
                onPress={addPerk}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: "#3C5759",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Plus color="#fff" size={24} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Affiliate Link/Code */}
          <View style={{ marginBottom: 28 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#192524",
                }}
              >
                Affiliate link or code (optional)
              </Text>
              <TouchableOpacity onPress={() => setShowAffiliateHelp(true)}>
                <HelpCircle color="#3C5759" size={18} />
              </TouchableOpacity>
            </View>
            <Text
              style={{
                fontSize: 14,
                color: "#3C5759",
                marginBottom: 12,
                lineHeight: 20,
              }}
            >
              Provide an affiliate code/link so creators can earn commission
              from bookings or purchases.
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              <TextInput
                value={draft.affiliate_code || ""}
                onChangeText={(val) =>
                  ListingDraftStore.updateDraft({ affiliate_code: val })
                }
                placeholder="e.g., COLLABNB-ABCD or https://..."
                placeholderTextColor="#959D90"
                autoCapitalize="characters"
                style={{
                  flex: 1,
                  backgroundColor: "#fff",
                  borderWidth: 1,
                  borderColor: "#D0D5CE",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: "#192524",
                }}
              />
            </View>
            <TouchableOpacity
              onPress={generateAffiliateCode}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: "#EFECE9",
              }}
            >
              <Sparkles color="#3C5759" size={16} />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#3C5759",
                }}
              >
                Generate code
              </Text>
            </TouchableOpacity>
          </View>

          {/* Vibe Tags */}
          <View style={{ marginBottom: 28 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#192524",
                marginBottom: 12,
              }}
            >
              Vibe tags (optional)
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#3C5759",
                marginBottom: 12,
                lineHeight: 20,
              }}
            >
              Add a few words that describe the vibe (Cozy, Luxury, Adventure,
              etc.)
            </Text>

            {/* Existing Tags */}
            {draft.vibe_tags.length > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                {draft.vibe_tags.map((tag, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#EFECE9",
                      borderRadius: 20,
                      paddingLeft: 14,
                      paddingRight: 6,
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#192524",
                      }}
                    >
                      {tag}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeTag(idx)}
                      style={{ padding: 4, marginLeft: 4 }}
                    >
                      <X color="#3C5759" size={16} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add Tag */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                value={newTag}
                onChangeText={setNewTag}
                placeholder="e.g., Cozy"
                placeholderTextColor="#959D90"
                onSubmitEditing={addTag}
                returnKeyType="done"
                style={{
                  flex: 1,
                  backgroundColor: "#fff",
                  borderWidth: 1,
                  borderColor: "#D0D5CE",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: "#192524",
                }}
              />
              <TouchableOpacity
                onPress={addTag}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: "#3C5759",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Plus color="#fff" size={24} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ListingCreationShell>
      <GlassHelpModal
        visible={showAddonsHelp}
        onClose={() => setShowAddonsHelp(false)}
        title="Add-ons Examples"
        data={addonsHelpData}
      />
      <GlassHelpModal
        visible={showAffiliateHelp}
        onClose={() => setShowAffiliateHelp(false)}
        title="Affiliate Code/Link"
        data={affiliateHelpData}
      />
    </>
  );
}
