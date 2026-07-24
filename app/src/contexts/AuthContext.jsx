import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useMutation, useConvex } from 'convex/react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
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

  const setSavedCreatorIds = useCallback((ids) => {
    setProfile((prev) => {
      const merged = { ...prev, saved_creator_ids: ids };
      try { localStorage.setItem('collabnb_profile', JSON.stringify(merged)); } catch {}
      return merged;
    });
  }, []);

  const toggleSavedCreator = useCallback((_creatorId) => {
    // Mock provider has no Convex profile; mirror saved ids locally only
    const cur = profile.saved_creator_ids ?? [];
    const next = cur.includes(_creatorId) ? cur.filter((id) => id !== _creatorId) : [...cur, _creatorId];
    setSavedCreatorIds(next);
    return next;
  }, [profile, setSavedCreatorIds]);

  const signOut = useCallback(() => {
    window.location.href = window.location.origin + '/';
  }, []);

  return (
    <AuthContext.Provider value={{ session: MOCK_SESSION, profile, loading: false, signOut, updateProfile, toggleSavedCreator }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Clerk provider (Clerk configured — uses Clerk auth + Convex data) ────
export function ClerkAuthProvider({ children }) {
  return <ClerkAuthInner>{children}</ClerkAuthInner>;
}

function ClerkAuthInner({ children }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerkAuth();
  const convex = useConvex();
  const updateProfileMutation = useMutation(api.profiles.updateProfile);
  const getOrCreateMutation = useMutation(api.profiles.getOrCreate);
  const applyReferralCodeMutation = useMutation(api.referrals.applyReferralCode);
  const toggleSavedCreatorMutation = useMutation(api.profiles.toggleSavedCreator);

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
        const waitlistRole = (() => {
          // The Clerk account carries the chosen role in unsafeMetadata — this is
          // authoritative because it travels with the identity across the
          // marketing→app origin boundary and any email mismatch. Fall back to
          // the origin-scoped localStorage bridge only when metadata is absent.
          const metaRole = clerkUser.unsafeMetadata?.role;
          if (metaRole) return metaRole;
          try { return localStorage.getItem('collabnb_waitlist_role') || undefined; } catch { return undefined; }
        })();
        let result = await convex.query(api.profiles.getByEmail, { email });
        const isNewUser = !result;
        if (!result) {
          try {
            result = await getOrCreateMutation({
              email,
              full_name: clerkUser.fullName || email.split('@')[0],
              avatar_url: clerkUser.imageUrl || undefined,
              is_admin: isAdminUser,
              role: waitlistRole,
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
        // Prefer Clerk/Google full name if waitlist profile has a generic one
        // (e.g. created from just email prefix before the user typed their name)
        if (clerkUser.fullName && result && (!result.full_name || result.full_name === email.split('@')[0])) {
          result = { ...result, full_name: clerkUser.fullName };
          if (result._id) {
            try {
              await updateProfileMutation({
                profileId: result._id,
                updates: { full_name: clerkUser.fullName },
              });
            } catch { /* non-critical */ }
          }
        }
        // Apply referral code for brand-new signups
        if (isNewUser && result?._id && !result.referred_by) {
          const storedCode = localStorage.getItem('collabnb_referral_code');
          if (storedCode) {
            try {
              await applyReferralCodeMutation({ code: storedCode, newUserId: String(result._id) });
              localStorage.removeItem('collabnb_referral_code');
              // Refresh profile to pick up free_months_balance / referred_by
              result = await convex.query(api.profiles.getByEmail, { email }) || result;
            } catch {
              // Non-critical
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
  }, [clerkLoaded, clerkUser, convex, getOrCreateMutation, applyReferralCodeMutation]);

  const updateProfile = useCallback(async (updates) => {
    const merged = { ...profile, ...updates };
    setProfile(merged);
    // Cache only text fields — base64 images are too large and can block the quota
    try {
      const { avatar_url: _a, banner_url: _b, ...textFields } = merged;
      localStorage.setItem('collabnb_profile', JSON.stringify(textFields));
    } catch { /* non-critical */ }

    if (profile?._id) {
      try {
        await updateProfileMutation({
          profileId: profile._id,
          updates: {
            full_name: updates.full_name,
            username: updates.username,
            bio: updates.bio,
            avatar_url: updates.avatar_url,
            banner_url: updates.banner_url,
            instagram_handle: updates.instagram_handle,
            tiktok_handle: updates.tiktok_handle,
            youtube_handle: updates.youtube_handle,
            portfolio: updates.portfolio,
            city: updates.city,
            region: updates.region,
            country: updates.country,
            role: updates.role,
            niches: updates.niches,
          },
        });
      } catch (err) {
        console.warn('Convex profile save warning:', err);
      }
    }

    // Sync profile photo to Clerk so the Clerk dashboard + nav avatar stay consistent
    if (updates.avatar_url && clerkUser) {
      try {
        const res = await fetch(updates.avatar_url);
        const blob = await res.blob();
        await clerkUser.setProfileImage({ file: new File([blob], 'avatar.jpg', { type: blob.type || 'image/jpeg' }) });
      } catch (err) {
        console.warn('Clerk avatar sync warning:', err);
      }
    }
  }, [profile, updateProfileMutation, clerkUser]);

  const signOut = useCallback(async () => {
    await clerkSignOut();
    const homeUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5173/'
      : '/';
    window.location.href = homeUrl;
  }, [clerkSignOut]);

  const toggleSavedCreator = useCallback(async (creatorId) => {
    const profileId = profile?._id;
    if (!profileId) return profile?.saved_creator_ids ?? [];
    // Optimistic update
    const cur = profile.saved_creator_ids ?? [];
    const optimistic = cur.includes(creatorId) ? cur.filter((id) => id !== creatorId) : [...cur, creatorId];
    setProfile((prev) => prev ? { ...prev, saved_creator_ids: optimistic } : prev);
    try {
      const next = await toggleSavedCreatorMutation({ profileId, creatorId });
      setProfile((prev) => prev ? { ...prev, saved_creator_ids: next } : prev);
      return next;
    } catch (err) {
      // Roll back on failure
      setProfile((prev) => prev ? { ...prev, saved_creator_ids: cur } : prev);
      console.warn('toggleSavedCreator failed:', err);
      return cur;
    }
  }, [profile, toggleSavedCreatorMutation]);

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut, updateProfile, toggleSavedCreator }}>
      {children}
    </AuthContext.Provider>
  );
}
