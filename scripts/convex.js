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

// Update an existing waitlist profile with additional details (step 2 of wizard)
export async function updateWaitlistProfile(profileId, updates) {
  try {
    return await client.mutation('profiles:updateProfile', { profileId, updates });
  } catch (err) {
    console.warn('updateWaitlistProfile failed (non-critical):', err.message);
  }
}

// Ambassador program (beta)
export async function listAmbassadorRegions() {
  try {
    return await client.query('ambassadors:listRegions');
  } catch (err) {
    console.warn('listAmbassadorRegions failed:', err.message);
    return null;
  }
}

export async function applyAmbassador(data) {
  return await client.mutation('ambassadors:apply', data);
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

// ── FAQ bubble: Help Center message form ──
export async function submitMessage(data) {
  return await client.mutation('messages:submitMessage', data);
}

export async function getMessagesByEmail(email) {
  try {
    return await client.query('messages:getMessagesByEmail', { email });
  } catch (err) {
    console.warn('getMessagesByEmail failed:', err.message);
    return [];
  }
}

// ── Live marketplace stats (signup sidebar, How it works, pricing counters) ──
export async function getMarketplaceStats() {
  try {
    return await client.query('marketplaceStats:getStats');
  } catch (err) {
    console.warn('getMarketplaceStats failed:', err.message);
    return null;
  }
}

export async function getPublishedListingsPreview(country, limit) {
  try {
    const args = {};
    if (country) args.country = country;
    if (limit) args.limit = limit;
    return await client.query('listings:getPublishedPreview', args);
  } catch (err) {
    console.warn('getPublishedListingsPreview failed:', err.message);
    return [];
  }
}

// ── FAQ bubble: Suggestions tab ──
export async function getSuggestions(userId) {
  try {
    return await client.query('suggestions:getSuggestions', userId ? { userId } : {});
  } catch (err) {
    console.warn('getSuggestions failed:', err.message);
    return [];
  }
}

export async function seedSuggestions() {
  try {
    await client.mutation('suggestions:seedSuggestions');
  } catch (err) {
    console.warn('seedSuggestions failed:', err.message);
  }
}

export async function submitSuggestion(text, userId) {
  return await client.mutation('suggestions:submitSuggestion', { text, userId });
}

export async function voteSuggestion(suggestionId, userId) {
  return await client.mutation('suggestions:vote', { suggestionId, userId, direction: 'up' });
}
