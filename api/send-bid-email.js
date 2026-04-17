import { createClient } from '@supabase/supabase-js';
import { resend, FROM_ADDRESS } from '../lib/resend.js';
import { bidSubmitted, bidInvite } from '../lib/email-templates.js';

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

  const { projectId, type, recipientEmail, recipientName, bidDetails = {} } = req.body;
  if (!projectId || !type || !recipientEmail) {
    return res.status(400).json({ error: 'projectId, type, and recipientEmail are required' });
  }
  if (!['submitted', 'invite'].includes(type)) {
    return res.status(400).json({ error: 'type must be "submitted" or "invite"' });
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

  const senderName = profile?.full_name || user.email;

  let subject, html;
  if (type === 'submitted') {
    ({ subject, html } = bidSubmitted({
      recipientName: recipientName || recipientEmail,
      projectName: project.name,
      submittedBy: senderName,
      amount: bidDetails.amount,
      projectUrl: bidDetails.projectUrl || 'https://app.costdeck.ai',
    }));
  } else {
    ({ subject, html } = bidInvite({
      recipientName: recipientName || recipientEmail,
      inviterName: senderName,
      projectName: project.name,
      dueDate: bidDetails.dueDate,
      inviteUrl: bidDetails.inviteUrl || 'https://app.costdeck.ai',
    }));
  }

  const { error: sendError } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: recipientEmail,
    subject,
    html,
  });

  if (sendError) {
    console.error('[send-bid-email] Resend error:', sendError);
    return res.status(502).json({ error: 'Failed to send email' });
  }

  const actionLabel = type === 'submitted' ? 'Bid submitted notification' : 'Bid invite';
  await supabase.from('audit_log').insert({
    project_id: projectId,
    user_id: user.id,
    field_name: 'email_sent',
    new_value: recipientEmail,
    description: `${actionLabel} sent to ${recipientEmail}`,
  });

  return res.status(200).json({ ok: true });
}
