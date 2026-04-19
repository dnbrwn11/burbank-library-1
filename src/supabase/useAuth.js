import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';

const isLockError = (err) => {
  const msg = (err?.message || '').toLowerCase();
  return msg.includes('lock') && (msg.includes('stole') || msg.includes('released'));
};

export function useAuth() {
  const [user, setUser]     = useState(null);
  const [profile, setProfile] = useState(null);
  const [org, setOrg]       = useState(null);
  const [orgRole, setOrgRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef   = useRef(true);
  const resolvedRef  = useRef(false); // true once setLoading(false) has been called

  const resolve = useCallback(() => {
    if (mountedRef.current && !resolvedRef.current) {
      resolvedRef.current = true;
      setLoading(false);
    }
  }, []);

  const fetchProfile = useCallback(async (userId) => {
    try {
      const query = () => supabase.from('profiles').select('*').eq('id', userId).single();
      let { data, error } = await query();
      if (error && isLockError(error)) {
        await new Promise(r => setTimeout(r, 300));
        ({ data, error } = await query());
      }
      if (error) { console.error('[useAuth] profile fetch error:', error.message); return null; }
      return data;
    } catch (err) {
      console.error('[useAuth] fetchProfile threw:', err.message);
      return null;
    }
  }, []);

  const fetchOrg = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('role, organizations(id, name, logo_url, created_at, updated_at)')
        .eq('user_id', userId)
        .maybeSingle();
      if (error || !data) return { org: null, role: null };
      return { org: data.organizations, role: data.role };
    } catch (err) {
      console.error('[useAuth] fetchOrg threw:', err.message);
      return { org: null, role: null };
    }
  }, []);

  useEffect(() => {
    mountedRef.current  = true;
    resolvedRef.current = false;

    // ── Safety timeout ───────────────────────────────────────────────────────
    // If onAuthStateChange never fires (network stall, Supabase JS bug),
    // proceed as logged-out after 5 seconds so the app never hangs.
    const timeout = setTimeout(() => {
      if (!resolvedRef.current) {
        console.warn('[useAuth] Auth resolution timed out after 5 s — proceeding as logged out');
        resolve();
      }
    }, 5000);

    // ── Auth state listener ──────────────────────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mountedRef.current) return;
        clearTimeout(timeout);

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        try {
          if (currentUser) {
            // Parallel fetch — either may fail safely due to the try/catch in each helper
            const [p, { org: o, role: r }] = await Promise.all([
              fetchProfile(currentUser.id),
              fetchOrg(currentUser.id),
            ]);
            if (!mountedRef.current) return;
            setProfile(p);
            setOrg(o);
            setOrgRole(r);
          } else {
            setProfile(null);
            setOrg(null);
            setOrgRole(null);
          }
        } catch (err) {
          // Should never reach here (helpers catch internally), but belt-and-suspenders
          console.error('[useAuth] Unexpected error in auth callback:', err.message);
        } finally {
          // Always resolve — this is the critical fix
          resolve();
        }
      }
    );

    return () => {
      mountedRef.current = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile, fetchOrg, resolve]);

  const refreshOrg = useCallback(async () => {
    if (!user) return;
    const { org: o, role: r } = await fetchOrg(user.id);
    setOrg(o);
    setOrgRole(r);
  }, [user, fetchOrg]);

  const signIn = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setOrg(null);
    setOrgRole(null);
  };

  const updateProfile = async (updates) => {
    if (!user) return { error: { message: 'Not logged in' } };
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (!error && data) setProfile(data);
    return { data, error };
  };

  return { user, profile, org, orgRole, loading, signIn, signOut, updateProfile, refreshOrg };
}
