import { ConvexHttpClient } from 'convex/browser';

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
const isConfigured = CONVEX_URL && CONVEX_URL !== 'YOUR_CONVEX_URL';

let convexInstance;

if (isConfigured) {
  try {
    convexInstance = new ConvexHttpClient(CONVEX_URL);
  } catch (err) {
    console.warn('Convex initialization failed:', err.message);
  }
}

// Mock client to prevent crashes when Convex is not configured
const mockClient = {
  query: async () => {
    console.warn('Convex not configured');
    return [];
  },
  mutation: async () => {
    console.warn('Convex not configured');
    return null;
  },
};

const client = convexInstance || mockClient;

// Fetch all profiles, count by role
export async function getProfileCounts() {
  try {
    const counts = await client.query('waitlist:getCounts');
    return { creators: counts.creators, hosts: counts.hosts };
  } catch (err) {
    console.warn('getProfileCounts failed:', err.message);
    return { creators: 0, hosts: 0 };
  }
}

// Submit a waitlist sign-up directly to Convex (bypasses Clerk for pre-auth signups)
export async function waitlistSignUp(data) {
  try {
    const result = await client.mutation('waitlist:signUp', data);
    return result;
  } catch (err) {
    console.warn('waitlistSignUp failed:', err.message);
    throw err;
  }
}

// Fetch all profiles (for globe pins, etc.)
export async function getAllProfiles() {
  try {
    return await client.query('profiles:getAll');
  } catch (err) {
    console.warn('getAllProfiles failed:', err.message);
    return [];
  }
}

// Fetch a single profile by email
export async function getProfileByEmail(email) {
  try {
    const profiles = await client.query('profiles:getAll');
    return profiles.find(p => p.email === email) || null;
  } catch (err) {
    console.warn('getProfileByEmail failed:', err.message);
    return null;
  }
}
