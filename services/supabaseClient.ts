import { createClient } from '@supabase/supabase-js';
import { Database } from '../types';

// Get environment variables with fallbacks
const getEnvVar = (key: string, fallback?: string) => {
    const importMetaValue = (import.meta as any).env?.[key];
    const windowValue = (window as any).ENV?.[key];
    
    // Prioritize import.meta.env over window.ENV
    const value = importMetaValue || windowValue || fallback;
    
    console.log(`Environment variable ${key}:`, {
        importMeta: importMetaValue ? `***loaded*** (${typeof importMetaValue})` : 'NOT FOUND',
        window: windowValue ? `***loaded*** (${typeof windowValue})` : 'NOT FOUND',
        fallback: fallback ? `***using*** (${typeof fallback})` : 'NOT FOUND',
        final: value ? `***loaded*** (${typeof value})` : 'NOT FOUND',
        actualValue: typeof value === 'string' ? value.substring(0, 20) + '...' : value,
        isUsingFallback: value === fallback
    });
    
    // If we're using the fallback, log a warning
    if (value === fallback) {
        console.warn(`⚠️ Using fallback value for ${key}. Netlify environment variable not loaded.`);
    }
    
    return value;
};

// Force use correct values due to Netlify environment variable corruption
const rawSupabaseUrl = 'https://wpgrfukcnpcoyruymxdd.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwZ3JmdWtjbnBjb3lydXlteGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MzQ5MjgsImV4cCI6MjA2OTMxMDkyOH0.-b5KHzKWk2N3VEY_K5CzYZfszRRL6GY-MivOVUAL1Z4';

// Log the forced values
console.log('🔧 FORCED Supabase URL:', rawSupabaseUrl);
console.log('🔧 FORCED Supabase Anon Key:', supabaseAnonKey.substring(0, 20) + '...');

// Validate configuration
if (!rawSupabaseUrl || !supabaseAnonKey) {
    console.error("Supabase configuration missing:", { rawSupabaseUrl, supabaseAnonKey });
    if (import.meta.env.DEV) {
        throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.");
    }
}

// Validate URLs before creating client
const isValidUrl = (url: string) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

// Use fallback URL if the original is invalid
const finalSupabaseUrl = isValidUrl(rawSupabaseUrl) ? rawSupabaseUrl : 'https://wpgrfukcnpcoyruymxdd.supabase.co';

if (!isValidUrl(rawSupabaseUrl)) {
    console.error("Invalid Supabase URL:", rawSupabaseUrl);
    console.log("Using fallback URL:", finalSupabaseUrl);
} else {
    console.log("✅ Supabase URL is valid:", rawSupabaseUrl);
}

// Export the final validated URL
export const supabaseUrl = finalSupabaseUrl;

// Debug the anon key
console.log('🔑 Using Supabase Anon Key:', supabaseAnonKey.substring(0, 20) + '...');

export const supabase = createClient<Database>(finalSupabaseUrl, supabaseAnonKey);

// Test the connection
console.log('🔗 Testing Supabase connection...');
supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
        console.error('❌ Supabase connection failed:', error);
    } else {
        console.log('✅ Supabase connection successful');
    }
}).catch(err => {
    console.error('❌ Supabase connection error:', err);
});