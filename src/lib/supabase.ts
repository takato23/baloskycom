import { createClient } from '@supabase/supabase-js';

// These would normally come from environment variables:
// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Placeholder for now to avoid crashing if env vars are missing.
// In a real scenario, you'd throw an error if these are missing.
const supabaseUrl = 'https://placeholder.supabase.co';
const supabaseAnonKey = 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
