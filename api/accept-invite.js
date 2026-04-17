import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, INVITE_SECRET } from '../lib/supabaseServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authToken = req.headers.authorization?.replace('Bearer ', '');
  if (!authToken) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${authToken}` } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired auth token' });
  }

  const { inviteToken } = req.body;
  if (!inviteToken) {
    return res.status(400).json({ error: 'inviteToken is required' });
  }

  // Token format: base64url(payload) + '.' + hmac_hex_16
  const dotIndex = inviteToken.lastIndexOf('.');
  if (dotIndex === -1) {
    return res.status(400).json({ error: 'Invalid token format' });
  }
  const payloadB64 = inviteToken.slice(0, dotIndex);
  const sig = inviteToken.slice(dotIndex + 1);

  const SECRET = INVITE_SECRET;
  const expectedSig = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('hex').slice(0, 16);

  if (sig !== expectedSig) {
    return res.status(400).json({ error: 'Invalid invite token' });
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Malformed token' });
  }

  const { projectId, projectName, email, role, iat } = payload;

  if (Date.now() - iat > 7 * 24 * 60 * 60 * 1000) {
    return res.status(400).json({ error: 'This invitation has expired' });
  }

  if (user.email.toLowerCase() !== email.toLowerCase()) {
    return res.status(403).json({ error: `This invite was sent to ${email}. Please sign in with that address.` });
  }

  // Use service role to bypass RLS; fall back to user-scoped client
  const writeClient = SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : supabase;

  const { error: memberError } = await writeClient
    .from('project_members')
    .upsert(
      { project_id: projectId, user_id: user.id, role },
      { onConflict: 'project_id,user_id' }
    );

  if (memberError) {
    console.error('[accept-invite] upsert error:', memberError);
    return res.status(500).json({ error: 'Failed to add you to the project' });
  }

  return res.status(200).json({ ok: true, projectId, projectName, role });
}
