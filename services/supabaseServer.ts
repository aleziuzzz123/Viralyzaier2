import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types';

export const supabaseUrl =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is required');
}

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const createSupabaseServerClient = (
  key: string = serviceRoleKey as string
) => {
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  }
  return createClient<Database>(supabaseUrl, key);
};

export const supabaseServer =
  serviceRoleKey ? createClient<Database>(supabaseUrl, serviceRoleKey) : null;
