import AsyncStorage from "@react-native-async-storage/async-storage";
import { mockCreators } from "@/data/mockCreators";

const STORAGE_KEY = "messages_v1";
const SEED_VERSION = "v2"; // Increment this to force a re-seed

// Generate sample seed data
const generateSeedData = () => {
  const now = Date.now();
  return {
    seedVersion: SEED_VERSION,
    threads: [
      {
        id: "t1",
        listingId: "1",
        listingTitle: "Glacier Prime Cabin",
        listingLocation: "Lake Tahoe, CA",
        hostName: mockCreators[0].name,
        hostAvatarUrl: mockCreators[0].avatarUri,
        status: "application",
        lastMessageText: "Hi! I'd love to collaborate on this project.",
        lastMessageAt: new Date(now - 3600000).toISOString(),
        unreadCount: 2,
        isStarred: false,
        isArchived: false,
      },
      {
        id: "t2",
        listingId: "2",
        listingTitle: "Mountain View Lodge",
        listingLocation: "Aspen, CO",
        hostName: mockCreators[1].name,
        hostAvatarUrl: mockCreators[1].avatarUri,
        status: "collab",
        lastMessageText: "Looking forward to the shoot next week!",
        lastMessageAt: new Date(now - 7200000).toISOString(),
        unreadCount: 0,
        isStarred: true,
        isArchived: false,
      },
      {
        id: "t3",
        listingId: "3",
        listingTitle: "Desert Oasis Villa",
        listingLocation: "Phoenix, AZ",
        hostName: mockCreators[2].name,
        hostAvatarUrl: mockCreators[2].avatarUri,
        status: "pitch",
        lastMessageText: "I have some ideas for unique content angles",
        lastMessageAt: new Date(now - 86400000).toISOString(),
        unreadCount: 1,
        isStarred: false,
        isArchived: false,
      },
      {
        id: "t4",
        listingId: "4",
        listingTitle: "Coastal Retreat",
        listingLocation: "Malibu, CA",
        hostName: mockCreators[3].name,
        hostAvatarUrl: mockCreators[3].avatarUri,
        status: "application",
        lastMessageText: "Can we schedule a call to discuss?",
        lastMessageAt: new Date(now - 172800000).toISOString(),
        unreadCount: 0,
        isStarred: false,
        isArchived: false,
      },
      {
        id: "t5",
        listingId: "5",
        listingTitle: "Urban Loft",
        listingLocation: "New York, NY",
        hostName: mockCreators[4].name,
        hostAvatarUrl: mockCreators[4].avatarUri,
        status: "collab",
        lastMessageText: "Draft content looks great, approved!",
        lastMessageAt: new Date(now - 259200000).toISOString(),
        unreadCount: 0,
        isStarred: false,
        isArchived: true,
      },
      {
        id: "t6",
        listingId: "6",
        listingTitle: "Lakeside Cottage",
        listingLocation: "Lake Como, Italy",
        hostName: mockCreators[0].name,
        hostAvatarUrl: mockCreators[0].avatarUri,
        status: "pitch",
        lastMessageText: "This property would be perfect for my audience",
        lastMessageAt: new Date(now - 345600000).toISOString(),
        unreadCount: 3,
        isStarred: true,
        isArchived: false,
      },
    ],
    messagesByThreadId: {
      t1: [
        {
          id: "m1",
          threadId: "t1",
          senderRole: "creator",
          text: "Hi! I'd love to collaborate on this project.",
          createdAt: new Date(now - 3600000).toISOString(),
        },
        {
          id: "m2",
          threadId: "t1",
          senderRole: "host",
          text: "Great! Tell me more about your content style.",
          createdAt: new Date(now - 3000000).toISOString(),
        },
      ],
      t2: [
        {
          id: "m3",
          threadId: "t2",
          senderRole: "system",
          text: "Collaboration accepted! You can now coordinate details.",
          createdAt: new Date(now - 14400000).toISOString(),
        },
        {
          id: "m4",
          threadId: "t2",
          senderRole: "creator",
          text: "Looking forward to the shoot next week!",
          createdAt: new Date(now - 7200000).toISOString(),
        },
      ],
      t3: [
        {
          id: "m5",
          threadId: "t3",
          senderRole: "creator",
          text: "I have some ideas for unique content angles",
          createdAt: new Date(now - 86400000).toISOString(),
        },
      ],
      t4: [
        {
          id: "m6",
          threadId: "t4",
          senderRole: "creator",
          text: "Can we schedule a call to discuss?",
          createdAt: new Date(now - 172800000).toISOString(),
        },
      ],
      t5: [
        {
          id: "m7",
          threadId: "t5",
          senderRole: "host",
          text: "Draft content looks great, approved!",
          createdAt: new Date(now - 259200000).toISOString(),
        },
      ],
      t6: [
        {
          id: "m8",
          threadId: "t6",
          senderRole: "creator",
          text: "This property would be perfect for my audience",
          createdAt: new Date(now - 345600000).toISOString(),
        },
      ],
    },
  };
};

class MessagingStore {
  constructor() {
    this.data = { threads: [], messagesByThreadId: {} };
    this.listeners = [];
  }

  async init() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.seedVersion === SEED_VERSION) {
          this.data = parsed;
        } else {
          // Seed data version mismatch, clear cache and re-seed
          await AsyncStorage.removeItem(STORAGE_KEY);
          this.data = generateSeedData();
        }
      } else {
        // Seed initial data
        this.data = generateSeedData();
        await this.persist();
      }
    } catch (error) {
      console.error("Failed to init MessagingStore:", error);
      this.data = generateSeedData();
    }
  }

  async persist() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.notifyListeners();
    } catch (error) {
      console.error("Failed to persist MessagingStore:", error);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  // Get all threads (optionally filtered)
  getThreads(filter = "all") {
    let threads = this.data.threads.filter((t) => !t.isArchived);
    if (filter === "applications") {
      threads = threads.filter((t) => t.status === "application");
    } else if (filter === "collabs") {
      threads = threads.filter((t) => t.status === "collab");
    } else if (filter === "pitches") {
      threads = threads.filter((t) => t.status === "pitch");
    }
    return threads.sort(
      (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt),
    );
  }

  getArchivedThreads() {
    return this.data.threads
      .filter((t) => t.isArchived)
      .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  }

  getThread(threadId) {
    return this.data.threads.find((t) => t.id === threadId);
  }

  getMessages(threadId) {
    return (this.data.messagesByThreadId[threadId] || []).sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    );
  }

  async sendMessage(threadId, text) {
    const message = {
      id: `m${Date.now()}`,
      threadId,
      senderRole: "creator",
      text,
      createdAt: new Date().toISOString(),
    };

    if (!this.data.messagesByThreadId[threadId]) {
      this.data.messagesByThreadId[threadId] = [];
    }
    this.data.messagesByThreadId[threadId].push(message);

    const thread = this.data.threads.find((t) => t.id === threadId);
    if (thread) {
      thread.lastMessageText = text;
      thread.lastMessageAt = message.createdAt;
      thread.unreadCount = 0;
    }

    await this.persist();
    return message;
  }

  async markAsUnread(threadId) {
    const thread = this.data.threads.find((t) => t.id === threadId);
    if (thread) {
      thread.unreadCount = 1;
      await this.persist();
    }
  }

  async markAsRead(threadId) {
    const thread = this.data.threads.find((t) => t.id === threadId);
    if (thread) {
      thread.unreadCount = 0;
      await this.persist();
    }
  }

  async toggleStar(threadId) {
    const thread = this.data.threads.find((t) => t.id === threadId);
    if (thread) {
      thread.isStarred = !thread.isStarred;
      await this.persist();
    }
  }

  async toggleArchive(threadId) {
    const thread = this.data.threads.find((t) => t.id === threadId);
    if (thread) {
      thread.isArchived = !thread.isArchived;
      await this.persist();
    }
  }

  async createPitchThread(listingId, listingTitle, listingLocation, hostName) {
    // Check if pitch thread already exists
    const existing = this.data.threads.find(
      (t) => t.listingId === listingId && t.status === "pitch",
    );
    if (existing) {
      return existing;
    }

    const threadId = `t${Date.now()}`;
    const thread = {
      id: threadId,
      listingId,
      listingTitle,
      listingLocation,
      hostName: hostName || "Host",
      hostAvatarUrl: `https://i.pravatar.cc/150?u=${listingId}`,
      status: "pitch",
      lastMessageText: "Pitch thread started. Keep it professional.",
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      isStarred: false,
      isArchived: false,
    };

    this.data.threads.push(thread);
    this.data.messagesByThreadId[threadId] = [
      {
        id: `m${Date.now()}`,
        threadId,
        senderRole: "system",
        text: "Pitch thread started. Keep it professional.",
        createdAt: new Date().toISOString(),
      },
    ];

    await this.persist();
    return thread;
  }

  async createOrGetApplicationThread({
    listingId,
    listingTitle,
    listingLocation,
    hostName,
    hostAvatarUrl,
  }) {
    // Check if application thread already exists
    const existing = this.data.threads.find(
      (t) => t.listingId === listingId && t.status === "application",
    );
    if (existing) {
      return existing;
    }

    const threadId = `t${Date.now()}`;
    const now = new Date();
    const pinnedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    const thread = {
      id: threadId,
      listingId,
      listingTitle,
      listingLocation,
      hostName: hostName || "Host",
      hostAvatarUrl:
        hostAvatarUrl || `https://i.pravatar.cc/150?u=${listingId}`,
      status: "application",
      lastMessageText: "Application started",
      lastMessageAt: now.toISOString(),
      unreadCount: 0,
      isStarred: false,
      isArchived: false,
      pinnedUntil: pinnedUntil.toISOString(),
    };

    this.data.threads.push(thread);
    this.data.messagesByThreadId[threadId] = [];

    await this.persist();
    return thread;
  }

  async createOrGetCreatorThread({ creatorId, creatorName, creatorAvatarUrl }) {
    // Check if thread already exists with this creator
    const existing = this.data.threads.find((t) => t.creatorId === creatorId);
    if (existing) {
      return existing;
    }

    const threadId = `t${Date.now()}`;
    const now = new Date();

    const thread = {
      id: threadId,
      creatorId,
      listingId: null,
      listingTitle: `Chat with ${creatorName}`,
      listingLocation: "",
      hostName: creatorName,
      hostAvatarUrl:
        creatorAvatarUrl || `https://i.pravatar.cc/150?u=${creatorId}`,
      status: "pitch",
      lastMessageText: "",
      lastMessageAt: now.toISOString(),
      unreadCount: 0,
      isStarred: false,
      isArchived: false,
    };

    this.data.threads.push(thread);
    this.data.messagesByThreadId[threadId] = [];

    await this.persist();
    return thread;
  }

  async addListingCardMessage({ threadId, listing, prefilledText }) {
    const messages = [];

    // Add prefilled text message first
    if (prefilledText) {
      const textMessage = {
        id: `m${Date.now()}`,
        threadId,
        senderRole: "host",
        text: prefilledText,
        createdAt: new Date().toISOString(),
      };
      messages.push(textMessage);
    }

    // Add listing card message
    const cardMessage = {
      id: `m${Date.now() + 1}`,
      threadId,
      senderRole: "host",
      type: "listing_card",
      createdAt: new Date(Date.now() + 100).toISOString(),
      listingCard: {
        listingId: listing.id,
        title: listing.title,
        location: `${listing.location_city}, ${listing.location_country}`,
        compensationType: listing.compensation_type,
        tierRequired: listing.creator_tier_required,
        deliverablesLoad: listing.deliverable_load,
        stayNights: listing.stay_nights,
        cashPayout: listing.cash_payout,
        applyCta: true,
      },
    };
    messages.push(cardMessage);

    if (!this.data.messagesByThreadId[threadId]) {
      this.data.messagesByThreadId[threadId] = [];
    }

    this.data.messagesByThreadId[threadId].push(...messages);

    const thread = this.data.threads.find((t) => t.id === threadId);
    if (thread) {
      thread.lastMessageText = "Listing proposal sent";
      thread.lastMessageAt = cardMessage.createdAt;
      if (listing.title) {
        thread.listingTitle = listing.title;
      }
    }

    await this.persist();
    return messages;
  }

  async addApplicationMessage({ threadId, messageText, metadata }) {
    const message = {
      id: `m${Date.now()}`,
      threadId,
      senderRole: "creator",
      text: messageText,
      createdAt: new Date().toISOString(),
      metadata: {
        type: "application",
        dateOptions: metadata.dateOptions || [],
        deliveryMethod: metadata.deliveryMethod || "",
        relevantExampleLink: metadata.relevantExampleLink || "",
        otherReferenceLinks: metadata.otherReferenceLinks || "",
        deliverablesConfirmed: metadata.deliverablesConfirmed || false,
      },
      isCancelled: false,
    };

    if (!this.data.messagesByThreadId[threadId]) {
      this.data.messagesByThreadId[threadId] = [];
    }
    this.data.messagesByThreadId[threadId].push(message);

    const thread = this.data.threads.find((t) => t.id === threadId);
    if (thread) {
      thread.lastMessageText = messageText;
      thread.lastMessageAt = message.createdAt;
    }

    await this.persist();
    return message;
  }

  async cancelMessage({ threadId, messageId }) {
    const messages = this.data.messagesByThreadId[threadId] || [];
    const message = messages.find((m) => m.id === messageId);

    if (message) {
      message.isCancelled = true;

      const thread = this.data.threads.find((t) => t.id === threadId);
      if (thread) {
        thread.lastMessageText = "Application cancelled";
        thread.lastMessageAt = new Date().toISOString();
      }

      await this.persist();
    }
  }

  searchThreads(query, filter = "all") {
    if (!query || query.trim() === "") {
      return this.getThreads(filter);
    }

    const lowerQuery = query.toLowerCase();
    let threads = this.getThreads(filter);

    return threads.filter(
      (t) =>
        (t.listingTitle && t.listingTitle.toLowerCase().includes(lowerQuery)) ||
        (t.hostName && t.hostName.toLowerCase().includes(lowerQuery)) ||
        (t.lastMessageText &&
          t.lastMessageText.toLowerCase().includes(lowerQuery)),
    );
  }

  // Add a reset method to clear cached data and re-seed with fresh sample creator data
  async reset() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      this.data = generateSeedData();
      await this.persist();
    } catch (error) {
      console.error("Failed to reset MessagingStore:", error);
      this.data = generateSeedData();
    }
  }
}

export default new MessagingStore();

// TODO: Future notification functions
export function notifyUserOfNewMessage(threadId) {
  // TODO: Push notification
  // TODO: Email notification
  console.log(`[TODO] Notify user of new message in thread ${threadId}`);
}
