import { createClient } from '@supabase/supabase-js';

// Disable navigator.locks to prevent auth lock contention
if (typeof navigator !== 'undefined' && navigator.locks) {
  navigator.locks.request = async (name, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
    }
    return await callback();
  };
}
2
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);