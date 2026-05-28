const PREFIX = 'collabnb_cache_';
const SESSION_KEY = 'collabnb_cache_session';
const DEFAULT_TTL = 5; // minutes

// On hard refresh (F5 / Ctrl+R) the session storage is cleared but localStorage is not.
// We use sessionStorage as a "tab alive" flag — if it's missing, this is a fresh page load
// (hard refresh or new tab) and we wipe all cache entries so data is never stale.
if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
  if (!sessionStorage.getItem(SESSION_KEY)) {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    sessionStorage.setItem(SESSION_KEY, '1');
  }
}

export const cache = {
  set(key, data, ttlMinutes = DEFAULT_TTL) {
    try {
      const entry = { data, expiry: Date.now() + ttlMinutes * 60 * 1000 };
      localStorage.setItem(PREFIX + key, JSON.stringify(entry));
    } catch {
      // localStorage full or unavailable — fail silently
    }
  },

  get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      if (Date.now() > entry.expiry) {
        localStorage.removeItem(PREFIX + key);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  },

  clear(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {}
  },

  clearAll() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
  },
};

// Deterministic hash of any serialisable params object → short string key suffix
export function hashParams(params) {
  if (!params || typeof params !== 'object') return 'default';
  const str = JSON.stringify(params, Object.keys(params).sort());
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export function cacheKey(queryName, params) {
  return `${queryName}_${hashParams(params)}`;
}
