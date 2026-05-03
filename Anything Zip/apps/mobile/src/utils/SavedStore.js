import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "saved_v1";

// In-memory cache
let state = {
  lists: [],
  loaded: false,
};

// Simple pub/sub for UI updates
const listeners = new Set();

const SavedStore = {
  // Initialize and load from AsyncStorage
  async init() {
    if (state.loaded) return;

    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        state = JSON.parse(json);
        state.loaded = true;
      } else {
        // Create default list on first run
        state = {
          lists: [
            {
              id: "default",
              name: "Saved",
              createdAt: new Date().toISOString(),
              items: [],
            },
          ],
          loaded: true,
        };
        await SavedStore._persist();
      }
    } catch (error) {
      console.error("SavedStore init error:", error);
      state = {
        lists: [
          {
            id: "default",
            name: "Saved",
            createdAt: new Date().toISOString(),
            items: [],
          },
        ],
        loaded: true,
      };
    }

    SavedStore._notify();
  },

  // Persist to AsyncStorage
  async _persist() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("SavedStore persist error:", error);
    }
  },

  // Notify all listeners
  _notify() {
    listeners.forEach((listener) => listener());
  },

  // Get current state
  getState() {
    return state;
  },

  // Subscribe to changes
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // Check if listing is saved in ANY list
  isSaved(listingId) {
    return state.lists.some((list) =>
      list.items.some((item) => item.listingId === listingId),
    );
  },

  // Toggle saved state (add to default list or remove from all)
  async toggleSaved(listingSnapshot, defaultListId = "default") {
    const listingId = listingSnapshot.id;
    const isSaved = SavedStore.isSaved(listingId);

    if (isSaved) {
      await SavedStore.removeFromAllLists(listingId);
    } else {
      await SavedStore.saveToList(defaultListId, listingSnapshot);
    }
  },

  // Save listing to specific list
  async saveToList(listId, listingSnapshot) {
    const list = state.lists.find((l) => l.id === listId);
    if (!list) {
      console.error("List not found:", listId);
      return;
    }

    const exists = list.items.some(
      (item) => item.listingId === listingSnapshot.id,
    );
    if (exists) {
      console.log("Already saved to this list");
      return;
    }

    list.items.unshift({
      listingId: listingSnapshot.id,
      snapshot: {
        id: listingSnapshot.id,
        title: listingSnapshot.title,
        location_city: listingSnapshot.location_city,
        location_country: listingSnapshot.location_country,
        image: listingSnapshot.image,
        deliverablesSummary: listingSnapshot.deliverablesSummary,
        offerSummary: listingSnapshot.offerSummary,
      },
      addedAt: new Date().toISOString(),
      note: null,
    });

    await SavedStore._persist();
    SavedStore._notify();
  },

  // Remove listing from all lists
  async removeFromAllLists(listingId) {
    state.lists.forEach((list) => {
      list.items = list.items.filter((item) => item.listingId !== listingId);
    });

    await SavedStore._persist();
    SavedStore._notify();
  },

  // Remove listing from specific list
  async removeFromList(listId, listingId) {
    const list = state.lists.find((l) => l.id === listId);
    if (!list) return;

    list.items = list.items.filter((item) => item.listingId !== listingId);

    await SavedStore._persist();
    SavedStore._notify();
  },

  // Get all lists
  getLists() {
    return state.lists;
  },

  // Get specific list
  getList(listId) {
    return state.lists.find((l) => l.id === listId);
  },

  // Create new list
  async createList(name) {
    const newList = {
      id: `list_${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      items: [],
    };

    state.lists.push(newList);
    await SavedStore._persist();
    SavedStore._notify();

    return newList;
  },

  // Rename list
  async renameList(listId, name) {
    const list = state.lists.find((l) => l.id === listId);
    if (!list) return;

    list.name = name;
    await SavedStore._persist();
    SavedStore._notify();
  },

  // Delete list
  async deleteList(listId) {
    if (listId === "default") {
      console.error("Cannot delete default list");
      return;
    }

    state.lists = state.lists.filter((l) => l.id !== listId);
    await SavedStore._persist();
    SavedStore._notify();
  },

  // Update note for saved item
  async updateNote(listId, listingId, note) {
    const list = state.lists.find((l) => l.id === listId);
    if (!list) return;

    const item = list.items.find((i) => i.listingId === listingId);
    if (!item) return;

    item.note = note;
    await SavedStore._persist();
    SavedStore._notify();
  },
};

// Initialize on import
SavedStore.init();

export default SavedStore;
