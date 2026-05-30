import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useMutation, useConvex } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { MOCK_CREATOR } from '../lib/mockData';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

const AuthContext = createContext(null);

export const MOCK_SESSION = { user: { id: MOCK_CREATOR.id } };

// ─── Public: useAuth hook ──────────────────────────────────────────────────
export const useAuth = () => useContext(AuthContext);

// ─── Unified AuthProvider — picks MockAuthProvider or ClerkAuthProvider ─────
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export function AuthProvider({ children }) {
  // Always use mock on localhost — Clerk CDN unreachable in local dev
  return (CLERK_KEY && !IS_LOCAL)
    ? <ClerkAuthProvider>{children}</ClerkAuthProvider>
    : <MockAuthProvider>{children}</MockAuthProvider>;
}

// ─── Mock provider (no Clerk configured — uses mock data) ──────────────────
export function MockAuthProvider({ children }) {
  const [profile, setProfile] = useState(() => {
    try {
      const raw = localStorage.getItem('collabnb_profile');
      if (raw) return { ...MOCK_CREATOR, ...JSON.parse(raw) };
    } catch {}
    return MOCK_CREATOR;
  });

  const updateProfile = useCallback(async (updates) => {
    const merged = { ...profile, ...updates };
    setProfile(merged);
    localStorage.setItem('collabnb_profile', JSON.stringify(merged));
  }, [profile]);

  const signOut = useCallback(() => {
    window.location.href = window.location.origin + '/';
  }, []);

  return (
    <AuthContext.Provider value={{ session: MOCK_SESSION, profile, loading: false, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Clerk provider (Clerk configured — uses Clerk auth + Convex data) ────
export function ClerkAuthProvider({ children }) {
  // Dynamic imports to avoid calling Clerk hooks outside ClerkProvider
  const [hooks, setHooks] = useState(null);
  useEffect(() => {
    import('@clerk/clerk-react').then((mod) => setHooks(mod));
  }, []);

  if (!hooks) {
    // Loading Clerk module — show loading
    return (
      <AuthContext.Provider value={{ session: null, profile: null, loading: true, signOut: null, updateProfile: null }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return <ClerkAuthInner hooks={hooks}>{children}</ClerkAuthInner>;
}

function ClerkAuthInner({ hooks, children }) {
  const { useUser: useClerkUser, useAuth: useClerkAuth } = hooks;
  const { user: clerkUser, isLoaded: clerkLoaded } = useClerkUser();
  const { signOut: clerkSignOut } = useClerkAuth();
  const convex = useConvex();
  const updateProfileMutation = useMutation(api.profiles.updateProfile);
  const getOrCreateMutation = useMutation(api.profiles.getOrCreate);

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clerkLoaded) return;

    if (!clerkUser) {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalhost) {
        setSession(MOCK_SESSION);
        setProfile(MOCK_CREATOR);
      } else {
        setSession(null);
        setProfile(null);
      }
      setLoading(false);
      return;
    }

    const email = clerkUser.primaryEmailAddress?.emailAddress;
    const clerkSession = {
      user: {
        id: clerkUser.id,
        email,
        fullName: clerkUser.fullName,
        imageUrl: clerkUser.imageUrl,
      },
    };
    setSession(clerkSession);

    // Fetch or auto-create profile in Convex
    (async () => {
      try {
        if (!email) {
          setProfile(MOCK_CREATOR);
          setLoading(false);
          return;
        }
        const isAdminUser = ADMIN_EMAIL ? email.toLowerCase() === ADMIN_EMAIL.toLowerCase() : false;
        let result = await convex.query(api.profiles.getByEmail, { email });
        if (!result) {
          try {
            result = await getOrCreateMutation({
              email,
              full_name: clerkUser.fullName || email.split('@')[0],
              avatar_url: clerkUser.imageUrl || undefined,
              is_admin: isAdminUser,
            });
          } catch {
            // getOrCreate not yet deployed — profile remains null
          }
        } else if (isAdminUser) {
          // Profile exists — still call getOrCreate so it upgrades tier/verified if needed
          try {
            result = await getOrCreateMutation({
              email,
              full_name: result.full_name,
              avatar_url: result.avatar_url,
              is_admin: true,
            });
          } catch {
            // If not deployed yet, use the existing result as-is
          }
        }
        // Always surface Clerk/Google avatar locally; also persist to Convex if missing
        if (clerkUser.imageUrl && result && !result.avatar_url) {
          result = { ...result, avatar_url: clerkUser.imageUrl };
          if (result._id) {
            try {
              await updateProfileMutation({
                profileId: result._id,
                updates: { avatar_url: clerkUser.imageUrl },
              });
            } catch {
              // Non-critical — local state already updated above
            }
          }
        }
        setProfile(result || MOCK_CREATOR);
      } catch {
        setProfile(MOCK_CREATOR);
      } finally {
        setLoading(false);
      }
    })();
  }, [clerkLoaded, clerkUser, convex, getOrCreateMutation]);

  const updateProfile = useCallback(async (updates) => {
    const merged = { ...profile, ...updates };
    setProfile(merged);
    localStorage.setItem('collabnb_profile', JSON.stringify(merged));

    if (profile?._id) {
      try {
        await updateProfileMutation({
          profileId: profile._id,
          updates: {
            full_name: updates.full_name,
            username: updates.username,
            bio: updates.bio,
            avatar_url: updates.avatar_url,
            instagram_handle: updates.instagram_handle,
            tiktok_handle: updates.tiktok_handle,
            youtube_handle: updates.youtube_handle,
            portfolio: updates.portfolio,
            city: updates.city,
            region: updates.region,
            role: updates.role,
          },
        });
      } catch (err) {
        console.warn('Convex profile save warning:', err);
      }
    }
  }, [profile, updateProfileMutation]);

  const signOut = useCallback(async () => {
    await clerkSignOut();
    const homeUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5173/'
      : '/';
    window.location.href = homeUrl;
  }, [clerkSignOut]);

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
