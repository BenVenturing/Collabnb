import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "application_limits_v1";

export async function checkDailyLimit(isPremium = false) {
  const limit = isPremium ? 5 : 1;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : { date: null, count: 0 };

    const today = new Date().toISOString().split("T")[0];

    if (data.date !== today) {
      return { canApply: true, count: 0, limit };
    }

    const canApply = data.count < limit;
    return { canApply, count: data.count, limit };
  } catch (error) {
    console.error("Failed to check daily limit:", error);
    return 0;
  }
}

export async function incrementDailyCount() {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : { date: null, count: 0 };

    const today = new Date().toISOString().split("T")[0];

    if (data.date !== today) {
      data.date = today;
      data.count = 1;
    } else {
      data.count += 1;
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data.count;
  } catch (error) {
    console.error("Failed to increment daily count:", error);
    return 0;
  }
}
