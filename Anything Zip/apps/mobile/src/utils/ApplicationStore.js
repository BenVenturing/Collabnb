import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@collabnb_applications_v1";

export async function submitApplication(application) {
  try {
    const existing = await getApplications();
    const newApp = {
      id: `app_${Date.now()}`,
      submittedAt: new Date().toISOString(),
      status: "pending",
      ...application,
    };
    await AsyncStorage.setItem(KEY, JSON.stringify([...existing, newApp]));
    return newApp;
  } catch (e) {
    return null;
  }
}

export async function getApplications() {
  try {
    const s = await AsyncStorage.getItem(KEY);
    return s ? JSON.parse(s) : [];
  } catch (e) {
    return [];
  }
}

export async function updateApplicationStatus(id, status) {
  try {
    const apps = await getApplications();
    const updated = apps.map((a) => (a.id === id ? { ...a, status } : a));
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch (e) {}
}
