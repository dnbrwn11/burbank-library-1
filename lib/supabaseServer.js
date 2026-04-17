// Resolves Supabase env vars from the names actually set in Vercel.
// VITE_ vars are set for both client and server; NEXT_PUBLIC_SUPABASE_URL is also
// present as an alias. Neither bare SUPABASE_URL nor SUPABASE_ANON_KEY is set.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;

export const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Used as HMAC secret for invite tokens when INVITE_SECRET is not explicitly set.
// Must resolve to the same value in both sign (send-invite) and verify (accept-invite).
export const INVITE_SECRET = process.env.INVITE_SECRET || SUPABASE_ANON_KEY;
