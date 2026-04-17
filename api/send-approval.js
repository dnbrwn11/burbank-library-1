import { createClient } from '@supabase/supabase-js';
import { resend, FROM_ADDRESS } from '../lib/resend.js';
import { approvalRequest } from '../lib/email-templates.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabaseServer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { projectId, approverEmail, approverName, description, approveUrl, rejectUrl } = req.body;
  if (!projectId || !approverEmail || !approveUrl || !rejectUrl) {
    return res.status(400).json({ error: 'projectId, approverEmail, approveUrl, and rejectUrl are required' });
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const requesterName = profile?.full_name || user.email;
  const { subject, html } = approvalRequest({
    approverName: approverName || approverEmail,
    requesterName,
    projectName: project.name,
    description,
    approveUrl,
    rejectUrl,
  });

  const { error: sendError } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: approverEmail,
    subject,
    html,
  });

  if (sendError) {
    console.error('[send-approval] Resend error:', sendError);
    return res.status(502).json({ error: 'Failed to send email' });
  }

  await supabase.from('audit_log').insert({
    project_id: projectId,
    user_id: user.id,
    field_name: 'email_sent',
    new_value: approverEmail,
    description: `Approval request sent to ${approverEmail}`,
  });

  return res.status(200).json({ ok: true });
}
