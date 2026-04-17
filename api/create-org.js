import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from '../lib/supabaseServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing authorization token' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

  const { name } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Organization name is required' });

  // Check if user already belongs to an org
  const { data: existing } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) return res.status(400).json({ error: 'You already belong to an organization' });

  // Use service role to bypass RLS for bootstrapping
  const writeClient = SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : supabase;

  const { data: org, error: orgErr } = await writeClient
    .from('organizations')
    .insert({ name: name.trim() })
    .select()
    .single();

  if (orgErr) {
    console.error('[create-org] insert org:', orgErr.message);
    return res.status(500).json({ error: 'Failed to create organization' });
  }

  const { error: memErr } = await writeClient
    .from('organization_members')
    .insert({
      org_id: org.id,
      user_id: user.id,
      role: 'owner',
      joined_at: new Date().toISOString(),
    });

  if (memErr) {
    console.error('[create-org] insert member:', memErr.message);
    return res.status(500).json({ error: 'Failed to set organization ownership' });
  }

  console.log('[create-org] Created org', org.id, 'for user', user.id);
  return res.status(200).json({ ok: true, org });
}
