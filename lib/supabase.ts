import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  (supabaseAnonKey || supabaseServiceKey) && 
  !supabaseUrl.includes('your-project')
);

// Client-safe instance (uses anon key)
export const supabaseClient: SupabaseClient | null = isSupabaseConfigured && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Server-side admin instance (uses service role key to bypass RLS)
export const supabaseAdmin: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  : null;

// Default export uses admin client if available (server-side), else client-safe instance
export const supabase: SupabaseClient | null = typeof window === 'undefined'
  ? (supabaseAdmin || supabaseClient)
  : (supabaseClient || supabaseAdmin);
