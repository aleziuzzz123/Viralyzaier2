import { createClient } from '@supabase/supabase-js';
import { Database } from '../types';

export const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (window as any).ENV?.VITE_SUPABASE_URL;
export const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (window as any).ENV?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required. Please check your environment variables.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);