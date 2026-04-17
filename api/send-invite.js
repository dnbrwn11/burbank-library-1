import { createClient } from '@supabase/supabase-js';
import { resend, FROM_ADDRESS } from '../lib/resend.js';
import { teamInvite } from '../lib/email-templates.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { projectId, inviteeEmail, inviteeName, role = 'Viewer', inviteUrl } = req.body;
  if (!projectId || !inviteeEmail || !inviteUrl) {
    return res.status(400).json({ error: 'projectId, inviteeEmail, and inviteUrl are required' });
  }

  // Verify caller owns the project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, owner_id')
    .eq('id', projectId)
    .eq('owner_id', user.id)
    .single();

  if (projectError || !project) {
    return res.status(403).json({ error: 'Project not found or access denied' });
  }

  // Get inviter's display name from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const inviterName = profile?.full_name || user.email;
  const { subject, html } = teamInvite({ inviterName, inviteeName, projectName: project.name, role, inviteUrl });

  const { error: sendError } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: inviteeEmail,
    subject,
    html,
  });

  if (sendError) {
    console.error('[send-invite] Resend error:', sendError);
    return res.status(502).json({ error: 'Failed to send email' });
  }

  // Audit log
  await supabase.from('audit_log').insert({
    project_id: projectId,
    user_id: user.id,
    field_name: 'email_sent',
    new_value: inviteeEmail,
    description: `Team invite sent to ${inviteeEmail} as ${role}`,
  });

  return res.status(200).json({ ok: true });
}
