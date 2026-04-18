import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = supabaseUrl && supabaseUrl !== 'YOUR_SUPABASE_URL';

let supabaseInstance;

if (isConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.warn('Supabase initialization failed:', err.message);
  }
}

// Fallback / Mock client to prevent crashes
export const supabase = supabaseInstance || {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signUp: async () => ({ data: null, error: { message: 'Supabase not configured. Please add your credentials to .env' } }),
    signInWithPassword: async () => ({ data: null, error: { message: 'Supabase not configured.' } }),
    signOut: async () => ({ error: null }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({ 
        count: 'exact', 
        head: true,
        then: async (cb) => cb({ count: 0, error: null }) 
      })
    })
  })
};
