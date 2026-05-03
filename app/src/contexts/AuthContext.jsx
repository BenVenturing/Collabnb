import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MOCK_CREATOR } from '../lib/mockData';

const AuthContext = createContext(null);

const isDevMode = () => {
  try {
    // Always use mock data when running locally
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return true;
    }
    return (
      new URLSearchParams(window.location.search).has('dev') ||
      new URLSearchParams(window.location.hash.split('?')[1] || '').has('dev') ||
      localStorage.getItem('collabnb_dev') === 'true'
    );
  } catch {
    return false;
  }
};

const DEV = isDevMode();
const MOCK_SESSION = { user: { id: MOCK_CREATOR.id } };

export function AuthProvider({ children }) {
  const [session, setSession] = useState(DEV ? MOCK_SESSION : null);
  const [profile, setProfile] = useState(DEV ? MOCK_CREATOR  : null);
  const [loading, setLoading] = useState(!DEV);

  useEffect(() => {
    if (DEV) return;

    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
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
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem('collabnb_dev');
    setSession(null);
    setProfile(null);
    window.location.href = '../index.html';
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
