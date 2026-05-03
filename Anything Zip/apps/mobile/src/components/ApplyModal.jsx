import { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Sparkles, Check } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MessagingStore from "@/utils/MessagingStore";
import {
  checkDailyLimit,
  incrementDailyCount,
} from "@/utils/ApplicationLimits";

const TEMPLATES_KEY = "apply_templates_v1";

// Confetti component
function ConfettiEffect({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);
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
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.3)",
        zIndex: 1000,
      }}
    >
      <View
        style={{
          backgroundColor: "#fff",
          padding: 40,
          borderRadius: 20,
          alignItems: "center",
        }}
      >
        <Sparkles size={48} color="#3C5759" />
        <Text style={{ marginTop: 16, fontSize: 18, fontWeight: "700" }}>
          Application Sent!
        </Text>
      </View>
    </View>
  );
}

export default function ApplyModal({ visible, onClose, listing }) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState("");
  const [dateOptions, setDateOptions] = useState([
    { startDate: "", endDate: "" },
    { startDate: "", endDate: "" },
    { startDate: "", endDate: "" },
  ]);
  const [relevantExampleLink, setRelevantExampleLink] = useState("");
  const [otherReferenceLinks, setOtherReferenceLinks] = useState("");
  const [deliverablesConfirmed, setDeliverablesConfirmed] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [undoTimer, setUndoTimer] = useState(5);
  const [lastMessageId, setLastMessageId] = useState(null);
  const [lastThreadId, setLastThreadId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadTemplate();
      setDefaultMessage();
    }
  }, [visible]);

  useEffect(() => {
    let interval;
    if (showUndo && undoTimer > 0) {
      interval = setInterval(() => {
        setUndoTimer((prev) => {
          if (prev <= 1) {
            setShowUndo(false);
            onClose();
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showUndo, undoTimer]);

  const loadTemplate = async () => {
    try {
      const stored = await AsyncStorage.getItem(TEMPLATES_KEY);
      if (stored) {
        const template = JSON.parse(stored);
        setMessage(template.message || "");
        setRelevantExampleLink(template.relevantExampleLink || "");
        setOtherReferenceLinks(template.otherReferenceLinks || "");
      }
    } catch (error) {
      console.error("Failed to load template:", error);
    }
  };

  const saveTemplate = async () => {
    try {
      const template = {
        message,
        relevantExampleLink,
        otherReferenceLinks,
      };
      await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(template));
    } catch (error) {
      console.error("Failed to save template:", error);
    }
  };

  const setDefaultMessage = () => {
    if (!message) {
      const defaultMsg = `Hi! I'm really excited about the opportunity to collaborate on ${listing.title}. I believe my content style would be a great fit for this property.\n\nI'd love to discuss how we can create amazing content together!`;
      setMessage(defaultMsg);
    }
  };

  const validateDates = () => {
    const validDates = dateOptions.filter(
      (opt) => opt.startDate.trim() !== "" && opt.endDate.trim() !== "",
    );

    if (validDates.length === 0) {
      Alert.alert("Error", "Please provide at least one date option");
      return false;
    }

    // Basic YYYY-MM-DD validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const opt of validDates) {
      if (!dateRegex.test(opt.startDate) || !dateRegex.test(opt.endDate)) {
        Alert.alert("Error", "Please use YYYY-MM-DD format for all dates");
        return false;
      }
    }

    // Check against collaboration window if available
    if (
      listing.collaboration_window?.startDate &&
      listing.collaboration_window?.endDate
    ) {
      const windowStart = new Date(listing.collaboration_window.startDate);
      const windowEnd = new Date(listing.collaboration_window.endDate);

      for (const opt of validDates) {
        const start = new Date(opt.startDate);
        const end = new Date(opt.endDate);

        if (start < windowStart || end > windowEnd) {
          Alert.alert(
            "Error",
            `Dates must be within collaboration window: ${listing.collaboration_window.startDate} to ${listing.collaboration_window.endDate}`,
          );
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert("Error", "Please write a message");
      return;
    }

    if (!validateDates()) {
      return;
    }

    if (!deliverablesConfirmed) {
      Alert.alert("Error", "Please confirm you can deliver the requirements");
      return;
    }

    if (!deliveryMethod) {
      Alert.alert("Error", "Please select a delivery method");
      return;
    }

    setSubmitting(true);

    try {
      // Initialize MessagingStore
      await MessagingStore.init();

      // Create or get application thread
      const thread = await MessagingStore.createOrGetApplicationThread({
        listingId: listing.id,
        listingTitle: listing.title,
        listingLocation: `${listing.location_city}, ${listing.location_country}`,
        hostName: listing.host?.name || listing.host?.brand_name || "Host",
        hostAvatarUrl: `https://i.pravatar.cc/150?u=${listing.id}`,
      });

      // Filter valid date options
      const validDates = dateOptions.filter(
        (opt) => opt.startDate.trim() !== "" && opt.endDate.trim() !== "",
      );

      // Add application message
      const messageObj = await MessagingStore.addApplicationMessage({
        threadId: thread.id,
        messageText: message,
        metadata: {
          dateOptions: validDates,
          deliveryMethod,
          relevantExampleLink,
          otherReferenceLinks,
          deliverablesConfirmed,
        },
      });

      // Save template if requested
      if (saveAsTemplate) {
        await saveTemplate();
      }

      setLastMessageId(messageObj.id);
      setLastThreadId(thread.id);
      setSubmitting(false);
      setShowConfetti(true);
    } catch (error) {
      setSubmitting(false);
      console.error("Failed to submit application:", error);
      Alert.alert("Error", "Failed to submit application. Please try again.");
    }
  };

  const handleUndo = async () => {
    if (lastThreadId && lastMessageId) {
      await MessagingStore.cancelMessage({
        threadId: lastThreadId,
        messageId: lastMessageId,
      });
      setShowUndo(false);
      setUndoTimer(5);
      onClose();
    }
  };

  const handleConfettiComplete = () => {
    setShowConfetti(false);
    setShowUndo(true);
  };

  const updateDateOption = (index, field, value) => {
    const updated = [...dateOptions];
    updated[index][field] = value;
    setDateOptions(updated);
  };

  if (!listing) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        {showConfetti && <ConfettiEffect onComplete={handleConfettiComplete} />}

        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700" }}>Apply</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Preview Card */}
          <View
            style={{
              margin: 20,
              padding: 16,
              backgroundColor: "#F9FAFB",
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 4 }}>
              {listing.title}
            </Text>
            <Text style={{ fontSize: 14, color: "#6B7280" }}>
              {listing.location_city}, {listing.location_country}
            </Text>
          </View>

          {/* Message */}
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", marginBottom: 8 }}>
              Your message
            </Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Introduce yourself and explain why you're a great fit..."
              multiline
              numberOfLines={6}
              style={{
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 12,
                padding: 12,
                fontSize: 15,
                textAlignVertical: "top",
                minHeight: 120,
              }}
            />
          </View>

          {/* Date Options */}
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", marginBottom: 8 }}>
              Proposed dates (up to 3 options)
            </Text>
            {dateOptions.map((opt, idx) => (
              <View key={idx} style={{ marginBottom: 12 }}>
                <Text
                  style={{ fontSize: 13, color: "#6B7280", marginBottom: 6 }}
                >
                  Option {idx + 1}
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    value={opt.startDate}
                    onChangeText={(v) => updateDateOption(idx, "startDate", v)}
                    placeholder="YYYY-MM-DD"
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: "#D1D5DB",
                      borderRadius: 8,
                      padding: 10,
                      fontSize: 14,
                    }}
                  />
                  <TextInput
                    value={opt.endDate}
                    onChangeText={(v) => updateDateOption(idx, "endDate", v)}
                    placeholder="YYYY-MM-DD"
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: "#D1D5DB",
                      borderRadius: 8,
                      padding: 10,
                      fontSize: 14,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Relevant Example Link */}
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", marginBottom: 8 }}>
              Relevant example link
            </Text>
            <TextInput
              value={relevantExampleLink}
              onChangeText={setRelevantExampleLink}
              placeholder="https://..."
              style={{
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 12,
                padding: 12,
                fontSize: 15,
              }}
            />
          </View>

          {/* Other Reference Links */}
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", marginBottom: 8 }}>
              Other reference links
            </Text>
            <TextInput
              value={otherReferenceLinks}
              onChangeText={setOtherReferenceLinks}
              placeholder="Additional portfolio links, one per line"
              multiline
              numberOfLines={3}
              style={{
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 12,
                padding: 12,
                fontSize: 15,
                textAlignVertical: "top",
              }}
            />
          </View>

          {/* Deliverables Confirmation */}
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => setDeliverablesConfirmed(!deliverablesConfirmed)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                backgroundColor: deliverablesConfirmed ? "#EFF6FF" : "#F9FAFB",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: deliverablesConfirmed ? "#3B82F6" : "#D1D5DB",
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  backgroundColor: deliverablesConfirmed ? "#3B82F6" : "#fff",
                  borderWidth: deliverablesConfirmed ? 0 : 2,
                  borderColor: "#D1D5DB",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                {deliverablesConfirmed && <Check size={16} color="#fff" />}
              </View>
              <Text style={{ flex: 1, fontSize: 14 }}>
                I confirm I can deliver all requirements
              </Text>
            </TouchableOpacity>
          </View>

          {/* Delivery Method */}
          {deliverablesConfirmed && (
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
              <Text
                style={{ fontSize: 15, fontWeight: "600", marginBottom: 8 }}
              >
                Preferred delivery method
              </Text>
              {["Google Drive", "WeTransfer", "Dropbox"].map((method) => (
                <TouchableOpacity
                  key={method}
                  onPress={() => setDeliveryMethod(method)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    marginBottom: 8,
                    backgroundColor:
                      deliveryMethod === method ? "#EFF6FF" : "#F9FAFB",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor:
                      deliveryMethod === method ? "#3B82F6" : "#D1D5DB",
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor:
                        deliveryMethod === method ? "#3B82F6" : "#fff",
                      borderWidth: deliveryMethod === method ? 0 : 2,
                      borderColor: "#D1D5DB",
                      marginRight: 12,
                    }}
                  />
                  <Text style={{ fontSize: 14 }}>{method}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Save as Template */}
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => setSaveAsTemplate(!saveAsTemplate)}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  backgroundColor: saveAsTemplate ? "#3B82F6" : "#fff",
                  borderWidth: saveAsTemplate ? 0 : 2,
                  borderColor: "#D1D5DB",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                {saveAsTemplate && <Check size={16} color="#fff" />}
              </View>
              <Text style={{ fontSize: 14 }}>
                Save as template for future applications
              </Text>
            </TouchableOpacity>
          </View>

          {/* Microcopy */}
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <Text
              style={{ fontSize: 13, color: "#6B7280", textAlign: "center" }}
            >
              Hosts typically respond in 24–72 hours.
            </Text>
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        {!showUndo && (
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: 20,
              paddingBottom: insets.bottom + 20,
              backgroundColor: "#fff",
              borderTopWidth: 1,
              borderTopColor: "#E5E7EB",
            }}
          >
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={{
                backgroundColor: "#3C5759",
                padding: 16,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}
                >
                  Submit Application
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Undo Bar */}
        {showUndo && (
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: 20,
              paddingBottom: insets.bottom + 20,
              backgroundColor: "#10B981",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
              Application sent! ({undoTimer}s)
            </Text>
            <TouchableOpacity onPress={handleUndo}>
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                UNDO
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}
