import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

const isLockError = (err) => {
  const msg = (err?.message || '').toLowerCase();
  return msg.includes('lock') && (msg.includes('stole') || msg.includes('released'));
};

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [org, setOrg] = useState(null);
  const [orgRole, setOrgRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    const query = () => supabase.from('profiles').select('*').eq('id', userId).single();
    let { data, error } = await query();
    if (error && isLockError(error)) {
      await new Promise(r => setTimeout(r, 300));
      ({ data, error } = await query());
    }
    if (error) { console.error('Error fetching profile:', error.message); return null; }
    return data;
  }, []);

  const fetchOrg = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('organization_members')
      .select('role, organizations(id, name, logo_url, created_at, updated_at)')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return { org: null, role: null };
    return { org: data.organizations, role: data.role };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const [p, { org: o, role: r }] = await Promise.all([
            fetchProfile(currentUser.id),
            fetchOrg(currentUser.id),
          ]);
          setProfile(p);
          setOrg(o);
          setOrgRole(r);
        } else {
          setProfile(null);
          setOrg(null);
          setOrgRole(null);
        }

        setLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchOrg]);

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
