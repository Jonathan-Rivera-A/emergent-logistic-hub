import { createClient } from '@supabase/supabase-js';

// Fallback placeholder values keep the module loadable even when Supabase
// credentials are not provided. Calls to the dummy client will fail at runtime
// but the app will still load (the BI tab does not use Supabase at all).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
