import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ltspsupggmbrvsjbuhtu.supabase.co';
const supabasePublishableKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn('⚠️ Missing Supabase environment variables!');
}

// Use a STANDARD, simple client configuration.
// This allows Supabase to manage the session correctly.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabasePublishableKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);