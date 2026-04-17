import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// auth-js uses navigator.locks by default in browsers, which causes
// "Lock was released because another request stole it" under concurrent
// auth calls. Providing a custom lock function bypasses navigatorLock
// entirely — this matches the library's own internal lockNoOp implementation.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
});
