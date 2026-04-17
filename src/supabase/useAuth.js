import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

/**
 * useAuth — handles magic link login, session state, and logout.
 *
 * Usage:
 *   const { user, loading, signIn, signOut } = useAuth();
 *
 *   if (loading) return <Spinner />;
 *   if (!user) return <LoginPage onSubmit={signIn} />;
 *   return <App user={user} onSignOut={signOut} />;
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile from public.profiles
  const fetchProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error.message);
      return null;
    }
    return data;
  }, []);

  useEffect(() => {
    // Check active session on mount
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const p = await fetchProfile(currentUser.id);
        setProfile(p);
      }

      setLoading(false);
    };

    getSession();

    // Listen for auth changes (magic link callback, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const p = await fetchProfile(currentUser.id);
          setProfile(p);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  /**
   * Send a magic link to the user's email.
   * Returns { error } if something went wrong.
   */
  const signIn = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Where Supabase redirects after clicking the magic link
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  /**
   * Sign out and clear session.
   */
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  /**
   * Update the user's profile (full_name, company, etc.)
   */
  const updateProfile = async (updates) => {
    if (!user) return { error: { message: 'Not logged in' } };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data);
    }
    return { data, error };
  };

  return { user, profile, loading, signIn, signOut, updateProfile };
}
