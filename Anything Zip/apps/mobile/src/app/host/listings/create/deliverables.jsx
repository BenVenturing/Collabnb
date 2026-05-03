import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  FlatList,
  Modal,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Calendar, X, Plus, Edit2 } from "lucide-react-native";
import ListingCreationShell from "@/components/ListingCreationShell";
import ListingDraftStore from "@/utils/ListingDraftStore";

const DELIVERABLE_PRESETS = {
  light: [
    {
      type: "Instagram Reels",
      quantity: 2,
      description: "Showcase key features and vibe",
    },
    {
      type: "Instagram Story",
      quantity: 3,
      description: "Behind the scenes moments",
    },
    { type: "Photo Set", quantity: 5, description: "High-res property photos" },
  ],
  moderate: [
    {
      type: "TikTok Videos",
      quantity: 2,
      description: "Day in the life, property tour",
    },
    {
      type: "Instagram Reels",
      quantity: 3,
      description: "Highlight property and experience",
    },
    {
      type: "Instagram Story",
      quantity: 5,
      description: "Daily moments and activities",
    },
    {
      type: "Photo Set",
      quantity: 10,
      description: "Professional property shots",
    },
  ],
  heavy: [
    {
      type: "TikTok Videos",
      quantity: 4,
      description: "Viral-style property content, full tour",
    },
    {
      type: "Instagram Reels",
      quantity: 5,
      description: "Full property tour and features",
    },
    {
      type: "Instagram Story",
      quantity: 8,
      description: "Complete stay documentation",
    },
    {
      type: "YouTube Short",
      quantity: 2,
      description: "Extended property showcase",
    },
    {
      type: "Photo Set",
      quantity: 15,
      description: "Comprehensive photo library",
    },
  ],
};

export default function CreateListingDeliverables() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [draft, setDraft] = useState(ListingDraftStore.getDraft());
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingDeliverable, setEditingDeliverable] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newDeliverable, setNewDeliverable] = useState({
    type: "",
    quantity: 1,
    description: "",
  });

  useEffect(() => {
    const init = async () => {
      await ListingDraftStore.init();
      const currentDraft = ListingDraftStore.getDraft();

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
          setDraft(existingListing);
          return; // Skip auto-populate preset if editing
        }
      }

      setDraft(currentDraft);

      // Auto-populate deliverables if empty
      if (
        currentDraft.deliverables.length === 0 &&
        currentDraft.deliverable_load
      ) {
        const preset = DELIVERABLE_PRESETS[currentDraft.deliverable_load];
        if (preset) {
          await ListingDraftStore.updateDraft({ deliverables: preset });
        }
      }
    };
    init();

    const unsub = ListingDraftStore.subscribe(() => {
      setDraft(ListingDraftStore.getDraft());
    });
    return unsub;
  }, [params.editMode, params.id]);

  const updateField = async (field, value) => {
    await ListingDraftStore.updateDraft({ [field]: value });
  };

  const addDeliverable = async () => {
    if (!newDeliverable.type.trim() || !newDeliverable.description.trim()) {
      Alert.alert("Missing Info", "Please fill in all deliverable fields");
      return;
    }

    await ListingDraftStore.updateDraft({
      deliverables: [...draft.deliverables, { ...newDeliverable }],
    });

    setNewDeliverable({ type: "", quantity: 1, description: "" });
  };

  const removeDeliverable = async (idx) => {
    const updated = draft.deliverables.filter((_, i) => i !== idx);
    await ListingDraftStore.updateDraft({ deliverables: updated });
  };

  const openEditModal = (idx) => {
    setEditingIndex(idx);
    setEditingDeliverable({ ...draft.deliverables[idx] });
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    if (
      !editingDeliverable.type.trim() ||
      !editingDeliverable.description.trim()
    ) {
      Alert.alert("Missing Info", "Please fill in all fields");
      return;
    }

    const updated = [...draft.deliverables];
    updated[editingIndex] = editingDeliverable;
    await ListingDraftStore.updateDraft({ deliverables: updated });
    setShowEditModal(false);
    setEditingIndex(null);
    setEditingDeliverable(null);
  };

  const getTotalDeliverables = () => {
    return draft.deliverables.reduce((sum, d) => sum + d.quantity, 0);
  };

  const handleNext = () => {
    if (
      !draft.collaboration_window.startDate ||
      !draft.collaboration_window.endDate
    ) {
      Alert.alert("Missing Dates", "Please set collaboration window dates");
      return;
    }
    router.push({
      pathname: "/host/listings/create/review",
      params:
        params.editMode === "true" && params.id
          ? { id: params.id, editMode: "true" }
          : {},
    });
  };

  const handleSaveExit = () => {
    router.push("/host/(tabs)/listings");
  };

  const isValid =
    draft.collaboration_window.startDate &&
    draft.collaboration_window.endDate &&
    draft.deliverables.length > 0;

  const renderDeliverableCard = ({ item, index }) => (
    <View
      style={{
        width: 200,
        backgroundColor: "#EFECE9",
        borderRadius: 16,
        padding: 14,
        marginRight: 12,
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
            fontSize: 15,
            fontWeight: "700",
            color: "#192524",
            flex: 1,
            paddingRight: 8,
          }}
        >
          {item.quantity}x {item.type}
        </Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <TouchableOpacity
            onPress={() => openEditModal(index)}
            style={{ padding: 4 }}
          >
            <Edit2 color="#3C5759" size={16} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => removeDeliverable(index)}
            style={{ padding: 4 }}
          >
            <X color="#3C5759" size={16} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={{ fontSize: 13, color: "#3C5759", lineHeight: 18 }}>
        {item.description}
      </Text>
    </View>
  );

  return (
    <ListingCreationShell
      currentStep={3}
      totalSteps={4}
      onBack={() => router.back()}
      onSaveExit={handleSaveExit}
      onNext={handleNext}
      nextDisabled={!isValid}
    >
      <View style={{ paddingTop: 24 }}>
        <View style={{ paddingHorizontal: 20 }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: "#192524",
              marginBottom: 8,
            }}
          >
            Deliverables & dates
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: "#3C5759",
              marginBottom: 32,
              lineHeight: 22,
            }}
          >
            Define when the collaboration happens and what content you need.
          </Text>

          {/* Collaboration Window */}
          <View style={{ marginBottom: 24 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Calendar color="#3C5759" size={20} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#192524",
                }}
              >
                Collaboration window *
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 13, color: "#3C5759", marginBottom: 6 }}
                >
                  Start date
                </Text>
                <TextInput
                  value={draft.collaboration_window.startDate}
                  onChangeText={(val) =>
                    updateField("collaboration_window", {
                      ...draft.collaboration_window,
                      startDate: val,
                    })
                  }
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#959D90"
                  style={{
                    backgroundColor: "#fff",
                    borderWidth: 1,
                    borderColor: "#D0D5CE",
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 15,
                    color: "#192524",
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 13, color: "#3C5759", marginBottom: 6 }}
                >
                  End date
                </Text>
                <TextInput
                  value={draft.collaboration_window.endDate}
                  onChangeText={(val) =>
                    updateField("collaboration_window", {
                      ...draft.collaboration_window,
                      endDate: val,
                    })
                  }
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#959D90"
                  style={{
                    backgroundColor: "#fff",
                    borderWidth: 1,
                    borderColor: "#D0D5CE",
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 15,
                    color: "#192524",
                  }}
                />
              </View>
            </View>
          </View>

          {/* Turnaround Time */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#192524",
                marginBottom: 8,
              }}
            >
              Deliverables due (days after stay)
            </Text>
            <TextInput
              value={String(draft.turnaround_time_days)}
              onChangeText={(val) =>
                updateField("turnaround_time_days", parseInt(val) || 14)
              }
              placeholder="14"
              placeholderTextColor="#959D90"
              keyboardType="number-pad"
              style={{
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: "#D0D5CE",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: "#192524",
              }}
            />
          </View>

          {/* Deliverables Summary */}
          <View
            style={{
              backgroundColor: "#D1EBDB",
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
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
              {getTotalDeliverables()} total deliverables
            </Text>
            <Text style={{ fontSize: 13, color: "#3C5759" }}>
              Across {draft.deliverables.length} format
              {draft.deliverables.length !== 1 ? "s" : ""} •{" "}
              {draft.deliverable_load} load
            </Text>
          </View>

          {/* Deliverables Label */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
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
              Deliverables
            </Text>
            <Text style={{ fontSize: 12, color: "#959D90" }}>
              Swipe to see all →
            </Text>
          </View>
        </View>

        {/* Horizontal Scrollable Deliverables */}
        {draft.deliverables.length > 0 && (
          <FlatList
            data={draft.deliverables}
            renderItem={renderDeliverableCard}
            keyExtractor={(item, idx) => idx.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
          />
        )}

        <View style={{ paddingHorizontal: 20 }}>
          {/* Add Custom Deliverable */}
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#D0D5CE",
              padding: 16,
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#192524",
                marginBottom: 12,
              }}
            >
              Add custom deliverable
            </Text>

            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TextInput
                  value={String(newDeliverable.quantity)}
                  onChangeText={(val) =>
                    setNewDeliverable({
                      ...newDeliverable,
                      quantity: parseInt(val) || 1,
                    })
                  }
                  placeholder="Qty"
                  placeholderTextColor="#959D90"
                  keyboardType="number-pad"
                  style={{
                    width: 60,
                    backgroundColor: "#EFECE9",
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 15,
                    color: "#192524",
                    textAlign: "center",
                  }}
                />
                <TextInput
                  value={newDeliverable.type}
                  onChangeText={(val) =>
                    setNewDeliverable({ ...newDeliverable, type: val })
                  }
                  placeholder="Platform/Type (e.g., Instagram Reels)"
                  placeholderTextColor="#959D90"
                  style={{
                    flex: 1,
                    backgroundColor: "#EFECE9",
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 15,
                    color: "#192524",
                  }}
                />
              </View>

              <TextInput
                value={newDeliverable.description}
                onChangeText={(val) =>
                  setNewDeliverable({ ...newDeliverable, description: val })
                }
                placeholder="Description"
                placeholderTextColor="#959D90"
                multiline
                style={{
                  backgroundColor: "#EFECE9",
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 15,
                  color: "#192524",
                  minHeight: 60,
                  textAlignVertical: "top",
                }}
              />

              <TouchableOpacity
                onPress={addDeliverable}
                style={{
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: "#3C5759",
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Plus color="#fff" size={18} />
                <Text
                  style={{ fontSize: 15, fontWeight: "600", color: "#fff" }}
                >
                  Add deliverable
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Policies */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#192524",
                marginBottom: 16,
              }}
            >
              Policies
            </Text>

            <View style={{ gap: 16 }}>
              <View>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#192524",
                    marginBottom: 8,
                  }}
                >
                  Revision policy
                </Text>
                <TextInput
                  value={draft.revision_policy}
                  onChangeText={(val) => updateField("revision_policy", val)}
                  placeholder="e.g., 1 round of minor revisions"
                  placeholderTextColor="#959D90"
                  multiline
                  style={{
                    backgroundColor: "#fff",
                    borderWidth: 1,
                    borderColor: "#D0D5CE",
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 15,
                    color: "#192524",
                    minHeight: 70,
                    textAlignVertical: "top",
                  }}
                />
              </View>

              <View>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#192524",
                    marginBottom: 8,
                  }}
                >
                  Usage rights
                </Text>
                <TextInput
                  value={draft.usage_rights}
                  onChangeText={(val) => updateField("usage_rights", val)}
                  placeholder="e.g., Perpetual marketing license"
                  placeholderTextColor="#959D90"
                  multiline
                  style={{
                    backgroundColor: "#fff",
                    borderWidth: 1,
                    borderColor: "#D0D5CE",
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 15,
                    color: "#192524",
                    minHeight: 70,
                    textAlignVertical: "top",
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: 24,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#192524",
                marginBottom: 20,
              }}
            >
              Edit Deliverable
            </Text>

            {editingDeliverable && (
              <View style={{ gap: 14 }}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ width: 80 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#3C5759",
                        marginBottom: 6,
                      }}
                    >
                      Quantity
                    </Text>
                    <TextInput
                      value={String(editingDeliverable.quantity)}
                      onChangeText={(val) =>
                        setEditingDeliverable({
                          ...editingDeliverable,
                          quantity: parseInt(val) || 1,
                        })
                      }
                      keyboardType="number-pad"
                      style={{
                        backgroundColor: "#EFECE9",
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 15,
                        color: "#192524",
                        textAlign: "center",
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#3C5759",
                        marginBottom: 6,
                      }}
                    >
                      Type
                    </Text>
                    <TextInput
                      value={editingDeliverable.type}
                      onChangeText={(val) =>
                        setEditingDeliverable({
                          ...editingDeliverable,
                          type: val,
                        })
                      }
                      placeholder="TikTok Videos"
                      placeholderTextColor="#959D90"
                      style={{
                        backgroundColor: "#EFECE9",
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 15,
                        color: "#192524",
                      }}
                    />
                  </View>
                </View>

                <View>
                  <Text
                    style={{ fontSize: 13, color: "#3C5759", marginBottom: 6 }}
                  >
                    Description
                  </Text>
                  <TextInput
                    value={editingDeliverable.description}
                    onChangeText={(val) =>
                      setEditingDeliverable({
                        ...editingDeliverable,
                        description: val,
                      })
                    }
                    placeholder="Describe what you want"
                    placeholderTextColor="#959D90"
                    multiline
                    style={{
                      backgroundColor: "#EFECE9",
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 15,
                      color: "#192524",
                      minHeight: 80,
                      textAlignVertical: "top",
                    }}
                  />
                </View>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={() => setShowEditModal(false)}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 12,
                      backgroundColor: "#EFECE9",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: "#192524",
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={saveEdit}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 12,
                      backgroundColor: "#3C5759",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{ fontSize: 15, fontWeight: "600", color: "#fff" }}
                    >
                      Save Changes
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ListingCreationShell>
  );
}
