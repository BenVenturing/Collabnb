import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@collabnb_host_shortlisted_creators_v1";

class SavedCreatorsStore {
  constructor() {
    this.savedCreatorIds = [];
    this.listeners = [];
  }

  async init() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.savedCreatorIds = JSON.parse(stored);
      } else {
        this.savedCreatorIds = [];
      }
    } catch (error) {
      console.error("Failed to init SavedCreatorsStore:", error);
      this.savedCreatorIds = [];
    }
  }

  async persist() {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(this.savedCreatorIds),
      );
      this.notifyListeners();
    } catch (error) {
      console.error("Failed to persist SavedCreatorsStore:", error);
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

  async addCreator(creatorId) {
    if (!this.savedCreatorIds.includes(creatorId)) {
      this.savedCreatorIds.push(creatorId);
      await this.persist();
    }
  }

  async removeCreator(creatorId) {
    this.savedCreatorIds = this.savedCreatorIds.filter(
      (id) => id !== creatorId,
    );
    await this.persist();
  }

  isSaved(creatorId) {
    return this.savedCreatorIds.includes(creatorId);
  }

  getSavedCreatorIds() {
    return this.savedCreatorIds;
  }

  async clearAll() {
    this.savedCreatorIds = [];
    await this.persist();
  }
}

export default new SavedCreatorsStore();
