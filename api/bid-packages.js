import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { resend, FROM_ADDRESS } from '../lib/resend.js';
import { bidInvite } from '../lib/email-templates.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from '../lib/supabaseServer.js';

function authClient(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

const serviceClient = () =>
  SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

async function requireUser(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'Missing authorization token' }); return null; }
  const supabase = authClient(token);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) { res.status(401).json({ error: 'Invalid or expired token' }); return null; }
  return { user, supabase };
}

export default async function handler(req, res) {
  // ── GET: list bid packages for a project ──────────────────────────────────
  if (req.method === 'GET') {
    const auth = await requireUser(req, res);
    if (!auth) return;
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });

    const { data, error } = await auth.supabase
      .from('bid_packages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
  }

  // ── POST: create package or create invitation ─────────────────────────────
  if (req.method === 'POST') {
    const auth = await requireUser(req, res);
    if (!auth) return;
    const { action } = req.body;

    // Create bid package
    if (action === 'create_package') {
      const { projectId, name, description, scope, due_date } = req.body;
      if (!projectId || !name) return res.status(400).json({ error: 'projectId and name are required' });

      const { data: project } = await auth.supabase
        .from('projects').select('id').eq('id', projectId).single();
      if (!project) return res.status(403).json({ error: 'Project not found or access denied' });

      const { data, error } = await auth.supabase
        .from('bid_packages')
        .insert({
          project_id: projectId,
          name: name.trim(),
          description: description?.trim() || null,
          scope: scope?.trim() || null,
          due_date: due_date || null,
          status: 'active',
          created_by: auth.user.id,
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ data });
    }

    // Create invitation + send email
    if (action === 'create_invitation') {
      const { packageId, projectId, email, name, company, origin } = req.body;
      if (!packageId || !projectId || !email) {
        return res.status(400).json({ error: 'packageId, projectId, and email are required' });
      }

      const { data: project } = await auth.supabase
        .from('projects').select('id, name').eq('id', projectId).single();
      if (!project) return res.status(403).json({ error: 'Project not found or access denied' });

      const { data: pkg } = await auth.supabase
        .from('bid_packages').select('id, name, due_date').eq('id', packageId).single();
      if (!pkg) return res.status(404).json({ error: 'Bid package not found' });

      const { data: profile } = await auth.supabase
        .from('profiles').select('full_name').eq('id', auth.user.id).single();
      const inviterName = profile?.full_name || auth.user.email;

      const token = crypto.randomBytes(24).toString('base64url');
      const inviteUrl = `${origin || 'https://app.costdeck.ai'}?bid=${token}`;

      const writer = serviceClient() || auth.supabase;
      const { data: invitation, error: invErr } = await writer
        .from('bid_invitations')
        .insert({
          package_id: packageId,
          project_id: projectId,
          email: email.toLowerCase().trim(),
          name: name?.trim() || null,
          company: company?.trim() || null,
          token,
          status: 'pending',
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (invErr) return res.status(500).json({ error: invErr.message });

      const { subject, html } = bidInvite({
        recipientName: name || email,
        inviterName,
        projectName: project.name,
        dueDate: pkg.due_date,
        inviteUrl,
      });

      try {
        await resend.emails.send({ from: FROM_ADDRESS, to: email, subject, html });
      } catch (emailErr) {
        console.error('[bid-packages] email send error:', emailErr?.message);
      }

      return res.status(201).json({ data: invitation });
    }

    // Update package status
    if (action === 'update_package') {
      const { packageId, status } = req.body;
      if (!packageId || !status) return res.status(400).json({ error: 'packageId and status are required' });

      const { data, error } = await auth.supabase
        .from('bid_packages')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', packageId)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  // ── DELETE: remove a package or invitation ────────────────────────────────
  if (req.method === 'DELETE') {
    const auth = await requireUser(req, res);
    if (!auth) return;
    const { id, type } = req.query;
    if (!id || !type) return res.status(400).json({ error: 'id and type are required' });

    const table = type === 'package' ? 'bid_packages' : type === 'invitation' ? 'bid_invitations' : null;
    if (!table) return res.status(400).json({ error: 'type must be "package" or "invitation"' });

    const { error } = await auth.supabase.from(table).delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
