import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { resend, FROM_ADDRESS } from '../lib/resend.js';
import { teamInvite, orgInvite } from '../lib/email-templates.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, INVITE_SECRET } from '../lib/supabaseServer.js';
import { Sentry } from '../lib/sentry-server.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('[send-invite] Missing Supabase env vars');
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
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { type = 'project', projectId, orgId, inviteeEmail, inviteeName, role = 'Viewer', origin } = req.body;

    if (!inviteeEmail || !origin) {
      return res.status(400).json({ error: 'inviteeEmail and origin are required' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    const inviterName = profile?.full_name || user.email;

    const SECRET = INVITE_SECRET;

    // ── Org invite ──────────────────────────────────────────────────────────
    if (type === 'org') {
      if (!orgId) return res.status(400).json({ error: 'orgId is required for org invites' });

      // Verify caller is owner or admin of the org
      const { data: membership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('org_id', orgId)
        .eq('user_id', user.id)
        .single();

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return res.status(403).json({ error: 'Only org owners and admins can invite members' });
      }

      const { data: orgRow } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single();

      if (!orgRow) return res.status(404).json({ error: 'Organization not found' });

      const payloadStr = JSON.stringify({
        type: 'org',
        orgId,
        orgName: orgRow.name,
        email: inviteeEmail,
        role,
        iat: Date.now(),
      });
      const payloadB64 = Buffer.from(payloadStr).toString('base64url');
      const sig = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('hex').slice(0, 16);
      const inviteUrl = `${origin}?invite=${payloadB64}.${sig}`;

      const { subject, html } = orgInvite({
        inviterName,
        inviteeName: inviteeName || null,
        orgName: orgRow.name,
        role,
        inviteUrl,
      });

      let sendError;
      try {
        const result = await resend.emails.send({ from: FROM_ADDRESS, to: inviteeEmail, subject, html });
        sendError = result.error;
      } catch (ex) {
        console.error('[send-invite] Resend threw:', ex?.message);
        return res.status(502).json({ error: 'Email service error', detail: ex?.message });
      }

      if (sendError) {
        console.error('[send-invite] Resend error:', JSON.stringify(sendError));
        return res.status(502).json({ error: 'Failed to send email', detail: sendError.message });
      }

      console.log('[send-invite] Org invite sent to', inviteeEmail, 'for org', orgId);
      return res.status(200).json({ ok: true });
    }

    // ── Project invite (default) ─────────────────────────────────────────────
    if (!projectId) return res.status(400).json({ error: 'projectId is required for project invites' });

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, owner_id')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .single();

    if (projectError || !project) {
      return res.status(403).json({ error: 'Project not found or access denied' });
    }

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

    const { subject, html } = teamInvite({
      inviterName,
      inviteeName: inviteeName || null,
      projectName: project.name,
      role,
      inviteUrl,
    });

    let sendError;
    try {
      const result = await resend.emails.send({ from: FROM_ADDRESS, to: inviteeEmail, subject, html });
      sendError = result.error;
    } catch (ex) {
      console.error('[send-invite] Resend threw:', ex?.message);
      return res.status(502).json({ error: 'Email service error', detail: ex?.message });
    }

    if (sendError) {
      console.error('[send-invite] Resend error:', JSON.stringify(sendError));
      return res.status(502).json({ error: 'Failed to send email', detail: sendError.message });
    }

    await supabase.from('audit_log').insert({
      project_id: projectId,
      user_id: user.id,
      field_name: 'email_sent',
      new_value: inviteeEmail,
      description: `Team invite sent to ${inviteeEmail} as ${role}`,
    });

    console.log('[send-invite] Project invite sent to', inviteeEmail, 'for project', projectId);
    return res.status(200).json({ ok: true });

  } catch (err) {
    Sentry.captureException(err);
    console.error('[send-invite] Unexpected error:', err?.message, err);
    return res.status(500).json({ error: 'Internal server error', detail: err?.message });
  }
}
