import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { resend, FROM_ADDRESS } from '../lib/resend.js';
import { teamInvite } from '../lib/email-templates.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Env var guard — fail fast with a clear message
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('[send-invite] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
      return res.status(500).json({ error: 'Server configuration error: Supabase env vars missing' });
    }
    if (!process.env.RESEND_API_KEY) {
      console.error('[send-invite] Missing RESEND_API_KEY');
      return res.status(500).json({ error: 'Server configuration error: RESEND_API_KEY is not set' });
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

    console.log('[send-invite] Verifying auth token…');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[send-invite] Auth failed:', authError?.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.log('[send-invite] Authenticated as', user.email);

    const { projectId, inviteeEmail, inviteeName, role = 'Viewer', origin } = req.body;
    if (!projectId || !inviteeEmail || !origin) {
      return res.status(400).json({ error: 'projectId, inviteeEmail, and origin are required' });
    }

    console.log('[send-invite] Looking up project', projectId, 'for owner', user.id);
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, owner_id')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .single();

    if (projectError || !project) {
      console.error('[send-invite] Project lookup failed:', projectError?.message);
      return res.status(403).json({ error: 'Project not found or access denied' });
    }
    console.log('[send-invite] Project found:', project.name);

    // Generate HMAC-signed invite token
    const SECRET = process.env.INVITE_SECRET || process.env.SUPABASE_ANON_KEY;
    const payloadStr = JSON.stringify({
      projectId,
      projectName: project.name,
      email: inviteeEmail,
      role,
      iat: Date.now(),
    });
    const payloadB64 = Buffer.from(payloadStr).toString('base64url');
    const sig = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('hex').slice(0, 16);
    const inviteUrl = `${origin}?invite=${payloadB64}.${sig}`;
    console.log('[send-invite] Invite URL generated for', inviteeEmail, 'role:', role);

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const inviterName = profile?.full_name || user.email;
    const { subject, html } = teamInvite({
      inviterName,
      inviteeName: inviteeName || null,
      projectName: project.name,
      role,
      inviteUrl,
    });

    console.log('[send-invite] Sending email via Resend to', inviteeEmail);
    let sendError;
    try {
      const result = await resend.emails.send({
        from: FROM_ADDRESS,
        to: inviteeEmail,
        subject,
        html,
      });
      sendError = result.error;
    } catch (resendEx) {
      console.error('[send-invite] Resend threw an exception:', resendEx?.message, resendEx);
      return res.status(502).json({ error: 'Email service error', detail: resendEx?.message });
    }

    if (sendError) {
      console.error('[send-invite] Resend returned error:', JSON.stringify(sendError));
      return res.status(502).json({ error: 'Failed to send email', detail: sendError.message });
    }
    console.log('[send-invite] Email sent successfully');

    await supabase.from('audit_log').insert({
      project_id: projectId,
      user_id: user.id,
      field_name: 'email_sent',
      new_value: inviteeEmail,
      description: `Team invite sent to ${inviteeEmail} as ${role}`,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[send-invite] Unexpected error:', err?.message, err);
    return res.status(500).json({ error: 'Internal server error', detail: err?.message });
  }
}
