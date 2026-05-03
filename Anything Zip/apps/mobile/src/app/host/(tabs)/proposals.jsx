// ============================================================
// COLLABNB — Proposals CRM (Rebuilt)
// 6-stage pipeline: Invited → Applied → Negotiating →
//                   Confirmed → Live → Completed
// File: /host/(tabs)/proposals.jsx
// ============================================================

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import ThemedBackground from "@/components/ThemedBackground";

const STORAGE_KEY = "@collabnb_proposals_v1";

const STAGES = [
  {
    id: "invited",
    label: "Invited",
    emoji: "📨",
    color: "#959D90",
    bg: "rgba(149,157,144,0.15)",
  },
  {
    id: "applied",
    label: "Applied",
    emoji: "✦",
    color: "#3C5759",
    bg: "rgba(60,87,89,0.12)",
  },
  {
    id: "negotiating",
    label: "Negotiating",
    emoji: "💬",
    color: "#D4A843",
    bg: "rgba(212,168,67,0.15)",
  },
  {
    id: "confirmed",
    label: "Confirmed",
    emoji: "✓",
    color: "#4A9B7F",
    bg: "rgba(74,155,127,0.15)",
  },
  {
    id: "live",
    label: "Live",
    emoji: "🎬",
    color: "#7B68C8",
    bg: "rgba(123,104,200,0.15)",
  },
  {
    id: "completed",
    label: "Completed",
    emoji: "⭐",
    color: "#D4A843",
    bg: "rgba(212,168,67,0.12)",
  },
];

const ACTIVE_STAGES = STAGES.filter((s) => s.id !== "completed");

const TIER_CONFIG = {
  "UGC Beginner": { color: "#959D90", bg: "rgba(149,157,144,0.12)" },
  "UGC Pro": { color: "#3C5759", bg: "rgba(60,87,89,0.12)" },
  "Micro Influencer": { color: "#7B68C8", bg: "rgba(123,104,200,0.12)" },
  Influencer: { color: "#C86868", bg: "rgba(200,104,104,0.12)" },
};

const SAMPLE_PROPOSALS = [
  {
    id: "p1",
    creatorName: "Maya Chen",
    handle: "@mayaexplores",
    tier: "Micro Influencer",
    followers: "28.4k",
    listing: "Treehouse Suite — Summer Escape",
    listingId: "l1",
    stage: "confirmed",
    note: "Loves botanical stays. Confirmed June 14–16.",
    stayDates: "June 14–16",
    deliverables: "2 Reels, 4 Stories, 1 TikTok",
    lastUpdate: "2d ago",
  },
  {
    id: "p2",
    creatorName: "Jordan Ellis",
    handle: "@jordantravels",
    tier: "UGC Pro",
    followers: "12.1k",
    listing: "Cliffside Villa — Weekend Collab",
    listingId: "l2",
    stage: "negotiating",
    note: "Wants to bring a partner. 2 nights vs 3.",
    stayDates: "",
    deliverables: "3 Reels, 6 Stories",
    lastUpdate: "5h ago",
  },
  {
    id: "p3",
    creatorName: "Priya Nair",
    handle: "@priyaframes",
    tier: "Influencer",
    followers: "91k",
    listing: "Treehouse Suite — Summer Escape",
    listingId: "l1",
    stage: "applied",
    note: "",
    stayDates: "",
    deliverables: "",
    lastUpdate: "1d ago",
  },
  {
    id: "p4",
    creatorName: "Sam Kowalski",
    handle: "@samwanders",
    tier: "UGC Beginner",
    followers: "3.2k",
    listing: "Desert Dome — Content Weekend",
    listingId: "l3",
    stage: "invited",
    note: "",
    stayDates: "",
    deliverables: "",
    lastUpdate: "3d ago",
  },
  {
    id: "p5",
    creatorName: "Lena Park",
    handle: "@lenavisuals",
    tier: "UGC Pro",
    followers: "8.7k",
    listing: "Desert Dome — Content Weekend",
    listingId: "l3",
    stage: "live",
    note: "Currently on property. Content due in 5 days.",
    stayDates: "June 8–10",
    deliverables: "2 TikToks, 3 Reels",
    lastUpdate: "12h ago",
  },
  {
    id: "p6",
    creatorName: "Alex Rivers",
    handle: "@alexroams",
    tier: "Micro Influencer",
    followers: "19.2k",
    listing: "Desert Dome — Content Weekend",
    listingId: "l3",
    stage: "completed",
    note: "Great collab. Very professional.",
    stayDates: "May 20–22",
    deliverables: "1 YouTube, 2 Reels, 5 Stories",
    lastUpdate: "3w ago",
    rating: 5,
    contentUrl: "https://instagram.com/alexroams",
  },
];

// ─── SUB-COMPONENTS ──────────────────────────────────────────
function Avatar({ name, size = 38 }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>
        {initials}
      </Text>
    </View>
  );
}

function TierBadge({ tier }) {
  const c = TIER_CONFIG[tier] || TIER_CONFIG["UGC Beginner"];
  return (
    <View style={[styles.tierBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.tierText, { color: c.color }]}>{tier}</Text>
    </View>
  );
}

function ProposalCard({ proposal, onPress }) {
  return (
    <TouchableOpacity
      style={styles.proposalCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <Avatar name={proposal.creatorName} />
        <View style={{ flex: 1, marginLeft: 9 }}>
          <Text style={styles.cardName} numberOfLines={1}>
            {proposal.creatorName}
          </Text>
          <Text style={styles.cardHandle}>{proposal.handle}</Text>
        </View>
        <Text style={styles.cardTime}>{proposal.lastUpdate}</Text>
      </View>
      <Text style={styles.cardListing} numberOfLines={2}>
        {proposal.listing}
      </Text>
      <View style={styles.cardFooter}>
        <TierBadge tier={proposal.tier} />
        {proposal.isCounter && (
          <View style={styles.counterBadge}>
            <Text style={styles.counterBadgeText}>🔄 Counter</Text>
          </View>
        )}
        <Text style={styles.cardFollowers}>👥 {proposal.followers}</Text>
      </View>
      {!!proposal.note && (
        <View style={styles.notePreview}>
          <Text style={styles.notePreviewText} numberOfLines={2}>
            📝 {proposal.note}
          </Text>
        </View>
      )}
      {!!proposal.stayDates && (
        <Text style={styles.datesText}>📅 {proposal.stayDates}</Text>
      )}
    </TouchableOpacity>
  );
}

function ArchiveCard({ proposal, onPress }) {
  return (
    <TouchableOpacity
      style={styles.archiveCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <Avatar name={proposal.creatorName} size={34} />
        <View style={{ flex: 1, marginLeft: 9 }}>
          <Text style={styles.cardName}>{proposal.creatorName}</Text>
          <Text style={styles.cardHandle}>{proposal.handle}</Text>
        </View>
        {proposal.rating && (
          <Text style={styles.rating}>{"★".repeat(proposal.rating)}</Text>
        )}
      </View>
      <Text style={styles.cardListing} numberOfLines={1}>
        {proposal.listing}
      </Text>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 6,
        }}
      >
        <Text style={styles.archiveSub}>📅 {proposal.stayDates}</Text>
        {!!proposal.contentUrl && (
          <Text style={styles.archiveLink}>View Content ↗</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── DETAIL MODAL ────────────────────────────────────────────
function DetailModal({ proposal, visible, onClose, onStageChange, onSave }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [stayDates, setStayDates] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (proposal) {
      setNote(proposal.note || "");
      setStayDates(proposal.stayDates || "");
      setDeliverables(proposal.deliverables || "");
    }
  }, [proposal]);

  if (!proposal) return null;

  const currentStage = STAGES.find((s) => s.id === proposal.stage);

  const handleSave = async () => {
    setSaving(true);
    await onSave(proposal.id, { note, stayDates, deliverables });
    setSaving(false);
  };

  const handleMessage = () => {
    router.push("/host/(tabs)/inbox");
  };

  const handleDecline = async () => {
    await onStageChange(proposal.id, "declined");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalDone}>Done</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Proposal Detail</Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.modalContent}
        >
          {/* Creator card */}
          <View style={styles.modalCreatorCard}>
            <Avatar name={proposal.creatorName} size={54} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.modalCreatorName}>
                {proposal.creatorName}
              </Text>
              <Text style={styles.modalHandle}>{proposal.handle}</Text>
              <View style={styles.modalBadges}>
                <TierBadge tier={proposal.tier} />
                <View style={styles.followerBadge}>
                  <Text style={styles.followerText}>
                    👥 {proposal.followers}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Listing */}
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>LISTING</Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/listing-detail",
                  params: { id: proposal.listingId, isHost: "true" },
                })
              }
              activeOpacity={0.8}
            >
              <View style={styles.infoCard}>
                <Text style={{ fontSize: 18 }}>🏡</Text>
                <Text style={styles.infoCardText}>{proposal.listing}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Current stage */}
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>CURRENT STAGE</Text>
            <View
              style={[
                styles.currentStagePill,
                { backgroundColor: currentStage?.bg },
              ]}
            >
              <Text style={{ fontSize: 16 }}>{currentStage?.emoji}</Text>
              <Text
                style={[
                  styles.currentStageText,
                  { color: currentStage?.color },
                ]}
              >
                {currentStage?.label}
              </Text>
            </View>
          </View>

          {/* Move stage */}
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>MOVE TO STAGE</Text>
            <View style={styles.stageGrid}>
              {STAGES.filter((s) => s.id !== proposal.stage).map((stage) => (
                <TouchableOpacity
                  key={stage.id}
                  style={[styles.stageBtn, { borderColor: stage.color }]}
                  onPress={() => onStageChange(proposal.id, stage.id)}
                >
                  <Text>{stage.emoji}</Text>
                  <Text style={[styles.stageBtnText, { color: stage.color }]}>
                    {stage.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Stay dates */}
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>STAY DATES</Text>
            <View style={styles.inputCard}>
              <TextInput
                style={styles.inputField}
                value={stayDates}
                onChangeText={setStayDates}
                placeholder="e.g. June 14–16"
                placeholderTextColor="#959D90"
              />
            </View>
          </View>

          {/* Deliverables */}
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>DELIVERABLES AGREED</Text>
            <View style={styles.inputCard}>
              <TextInput
                style={styles.inputField}
                value={deliverables}
                onChangeText={setDeliverables}
                placeholder="e.g. 2 Reels, 4 Stories, 1 TikTok"
                placeholderTextColor="#959D90"
              />
            </View>
          </View>

          {/* Notes */}
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>NEGOTIATION NOTES</Text>
            <View style={styles.noteCard}>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                multiline
                placeholder="Add notes, follow-ups, negotiation history..."
                placeholderTextColor="#959D90"
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? "Saving…" : "Save Changes"}
            </Text>
          </TouchableOpacity>

          {/* Actions */}
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>QUICK ACTIONS</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionPrimary}
                onPress={handleMessage}
              >
                <Text style={styles.actionPrimaryText}>💬 Message</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionDanger}
                onPress={handleDecline}
              >
                <Text style={styles.actionDangerText}>✕ Decline</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────
export default function ProposalsScreen() {
  const [proposals, setProposals] = useState(SAMPLE_PROPOSALS);
  const [selected, setSelected] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [view, setView] = useState("pipeline");
  const [tierFilter, setTierFilter] = useState("all");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((s) => {
        if (s) setProposals(JSON.parse(s));
      })
      .catch(() => {});
  }, []);

  const persist = async (updated) => {
    setProposals(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  const handleStageChange = async (id, newStage) => {
    const updated = proposals.map((p) =>
      p.id === id ? { ...p, stage: newStage, lastUpdate: "just now" } : p,
    );
    await persist(updated);
    setSelected((prev) => (prev ? { ...prev, stage: newStage } : prev));
  };

  const handleSave = async (id, fields) => {
    const updated = proposals.map((p) =>
      p.id === id ? { ...p, ...fields } : p,
    );
    await persist(updated);
    setSelected((prev) => (prev ? { ...prev, ...fields } : prev));
  };

  const filtered =
    tierFilter === "all"
      ? proposals
      : proposals.filter((p) => p.tier === tierFilter);
  const active = filtered.filter((p) => p.stage !== "completed");
  const archived = filtered.filter((p) => p.stage === "completed");
  const byStage = (id) => active.filter((p) => p.stage === id);

  const TIERS = [
    "all",
    "UGC Beginner",
    "UGC Pro",
    "Micro Influencer",
    "Influencer",
  ];

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Proposals</Text>
            <Text style={styles.headerSub}>
              {active.length} active · {byStage("confirmed").length} confirmed ·{" "}
              {byStage("live").length} live
            </Text>
          </View>
          <TouchableOpacity style={styles.inviteBtn}>
            <Text style={styles.inviteBtnText}>+ Invite</Text>
          </TouchableOpacity>
        </View>

        {/* Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              view === "pipeline" && styles.toggleBtnActive,
            ]}
            onPress={() => setView("pipeline")}
          >
            <Text
              style={[
                styles.toggleBtnText,
                view === "pipeline" && styles.toggleBtnTextActive,
              ]}
            >
              Pipeline
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              view === "archive" && styles.toggleBtnActive,
            ]}
            onPress={() => setView("archive")}
          >
            <Text
              style={[
                styles.toggleBtnText,
                view === "archive" && styles.toggleBtnTextActive,
              ]}
            >
              Completed ({archived.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tier Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          {TIERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                tierFilter === f && styles.filterChipActive,
              ]}
              onPress={() => setTierFilter(f)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  tierFilter === f && styles.filterChipTextActive,
                ]}
              >
                {f === "all" ? "All Tiers" : f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Pipeline */}
        {view === "pipeline" && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.board}
          >
            {ACTIVE_STAGES.map((stage) => {
              const cards = byStage(stage.id);
              return (
                <View key={stage.id} style={styles.pipelineCol}>
                  <View
                    style={[styles.colHeader, { backgroundColor: stage.bg }]}
                  >
                    <Text>{stage.emoji}</Text>
                    <Text style={[styles.colLabel, { color: stage.color }]}>
                      {stage.label}
                    </Text>
                    <View
                      style={[
                        styles.colCount,
                        { backgroundColor: stage.color },
                      ]}
                    >
                      <Text style={styles.colCountText}>{cards.length}</Text>
                    </View>
                  </View>
                  {cards.length === 0 ? (
                    <Text style={styles.emptyColText}>None here</Text>
                  ) : (
                    cards.map((p) => (
                      <ProposalCard
                        key={p.id}
                        proposal={p}
                        onPress={() => {
                          setSelected(p);
                          setModalVisible(true);
                        }}
                      />
                    ))
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Archive */}
        {view === "archive" && (
          <ScrollView contentContainerStyle={styles.archiveList}>
            {archived.length === 0 ? (
              <View style={styles.emptyArchive}>
                <Text style={styles.emptyArchiveIcon}>⭐</Text>
                <Text style={styles.emptyArchiveText}>
                  No completed collabs yet
                </Text>
              </View>
            ) : (
              archived.map((p) => (
                <ArchiveCard
                  key={p.id}
                  proposal={p}
                  onPress={() => {
                    setSelected(p);
                    setModalVisible(true);
                  }}
                />
              ))
            )}
          </ScrollView>
        )}

        <DetailModal
          proposal={selected}
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onStageChange={handleStageChange}
          onSave={handleSave}
        />
      </SafeAreaView>
    </ThemedBackground>
  );
}

// ─── STYLES ──────────────────────────────────────────────────
const GLASS = {
  backgroundColor: "rgba(255,255,255,0.58)",
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.78)",
  shadowColor: "#3C5759",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 2,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#192524",
    letterSpacing: -0.5,
  },
  headerSub: { fontSize: 12, color: "#959D90", marginTop: 3 },
  inviteBtn: {
    backgroundColor: "#3C5759",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  inviteBtnText: { fontSize: 13, fontWeight: "600", color: "#EFECE9" },

  viewToggle: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.45)",
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 11,
    alignItems: "center",
  },
  toggleBtnActive: { backgroundColor: "#3C5759" },
  toggleBtnText: { fontSize: 13, fontWeight: "500", color: "#959D90" },
  toggleBtnTextActive: { color: "#EFECE9", fontWeight: "600" },

  filterRow: { maxHeight: 40, marginBottom: 6 },
  filterContent: { paddingHorizontal: 20, gap: 8, alignItems: "center" },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: "rgba(60,87,89,0.15)",
  },
  filterChipActive: { backgroundColor: "#3C5759", borderColor: "#3C5759" },
  filterChipText: { fontSize: 12, fontWeight: "500", color: "#3C5759" },
  filterChipTextActive: { color: "#EFECE9" },

  board: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
    alignItems: "flex-start",
  },
  pipelineCol: { width: 210 },
  colHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 10,
  },
  colLabel: { fontSize: 12, fontWeight: "600", flex: 1 },
  colCount: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  colCountText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  emptyColText: {
    fontSize: 11,
    color: "#D0D5CE",
    textAlign: "center",
    paddingVertical: 20,
  },

  proposalCard: { ...GLASS, padding: 13, marginBottom: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  cardName: { fontSize: 13, fontWeight: "600", color: "#192524" },
  cardHandle: { fontSize: 11, color: "#959D90" },
  cardTime: { fontSize: 10, color: "#D0D5CE" },
  cardListing: {
    fontSize: 11,
    color: "#3C5759",
    marginBottom: 8,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardFollowers: { fontSize: 11, color: "#959D90" },
  notePreview: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(60,87,89,0.07)",
  },
  notePreviewText: { fontSize: 11, color: "#959D90", lineHeight: 16 },
  datesText: {
    fontSize: 11,
    color: "#4A9B7F",
    fontWeight: "500",
    marginTop: 6,
  },

  avatar: {
    backgroundColor: "#D1EBDB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.7)",
  },
  avatarText: { fontWeight: "700", color: "#3C5759" },
  tierBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  tierText: { fontSize: 10, fontWeight: "600" },

  archiveList: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  archiveCard: { ...GLASS, padding: 14, marginBottom: 10 },
  archiveSub: { fontSize: 11, color: "#959D90" },
  archiveLink: { fontSize: 11, fontWeight: "500", color: "#7B68C8" },
  rating: { fontSize: 13, color: "#D4A843" },
  emptyArchive: { alignItems: "center", paddingTop: 60 },
  emptyArchiveIcon: { fontSize: 36, marginBottom: 10 },
  emptyArchiveText: { fontSize: 14, color: "#959D90" },

  modalSafe: { flex: 1, backgroundColor: "#EFECE9" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(60,87,89,0.08)",
  },
  modalDone: { fontSize: 15, fontWeight: "500", color: "#3C5759" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#192524" },
  modalContent: { paddingHorizontal: 20 },
  modalCreatorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    ...GLASS,
    padding: 16,
    marginTop: 16,
  },
  modalCreatorName: { fontSize: 18, fontWeight: "700", color: "#192524" },
  modalHandle: { fontSize: 13, color: "#959D90", marginTop: 2 },
  modalBadges: { flexDirection: "row", gap: 7, marginTop: 8, flexWrap: "wrap" },
  followerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(25,37,36,0.07)",
  },
  followerText: { fontSize: 11, color: "#3C5759" },
  modalSection: { marginTop: 22 },
  modalLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#959D90",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...GLASS,
    padding: 14,
  },
  infoCardText: { fontSize: 14, fontWeight: "500", color: "#192524", flex: 1 },
  currentStagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  currentStageText: { fontSize: 15, fontWeight: "600" },
  stageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  stageBtnText: { fontSize: 12, fontWeight: "500" },
  inputCard: { ...GLASS, padding: 14 },
  inputField: { fontSize: 14, color: "#192524" },
  noteCard: { ...GLASS, padding: 14 },
  noteInput: { fontSize: 14, color: "#192524", minHeight: 80, lineHeight: 21 },
  saveBtn: {
    backgroundColor: "#3C5759",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
  },
  saveBtnText: { fontSize: 15, fontWeight: "600", color: "#EFECE9" },
  actionRow: { flexDirection: "row", gap: 10 },
  actionPrimary: {
    flex: 1,
    backgroundColor: "#3C5759",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },
  actionPrimaryText: { fontSize: 14, fontWeight: "600", color: "#EFECE9" },
  actionDanger: {
    flex: 1,
    backgroundColor: "rgba(200,104,104,0.1)",
    borderWidth: 1,
    borderColor: "rgba(200,104,104,0.25)",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },
  actionDangerText: { fontSize: 14, fontWeight: "600", color: "#C86868" },
});
