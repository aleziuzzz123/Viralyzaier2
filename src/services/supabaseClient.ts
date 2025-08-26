import { createClient } from '@supabase/supabase-js';
import { Database } from '../types';

// In a Vite app, VITE_ prefixed env vars are exposed via import.meta.env.
// This is the ONLY reliable way to get them in a production build.
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// This check is critical. If the variables are missing, the app will fail fast
// with a clear error, preventing the white screen issue.
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required. Please ensure they are set in your Vercel project environment variables.");
}

// Create exactly ONE client for the whole app with robust auth settings.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'vza_auth',
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});