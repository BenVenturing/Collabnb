import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MOCK_CREATOR } from '../lib/mockData';

const AuthContext = createContext(null);

const MOCK_SESSION = { user: { id: MOCK_CREATOR.id } };

export function AuthProvider({ children }) {
  const [session, setSession] = useState(MOCK_SESSION);
  const [profile, setProfile] = useState(MOCK_CREATOR);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      // No Supabase configured — stay on mock data
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: realSession } }) => {
      if (realSession?.user) {
        setSession(realSession);
        fetchProfile(realSession.user.id);
      } else {
        // No real session — use mock data for dev/demo
        setSession(MOCK_SESSION);
        setProfile(MOCK_CREATOR);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSession(session);
        fetchProfile(session.user.id);
      } else {
        // Fall back to mock when signed out in dev
        setSession(MOCK_SESSION);
        setProfile(MOCK_CREATOR);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      setProfile(data || MOCK_CREATOR);
    } catch {
      setProfile(MOCK_CREATOR);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(MOCK_SESSION);
    setProfile(MOCK_CREATOR);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
