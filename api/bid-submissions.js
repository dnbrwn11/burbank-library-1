import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from '../lib/supabaseServer.js';

function authClient(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

function serviceClient() {
  return SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export default async function handler(req, res) {
  // ── GET: fetch by token (public) or by packageId (auth) ──────────────────
  if (req.method === 'GET') {
    const { token, packageId } = req.query;

    // Public: resolve invitation details for the bid submission form
    if (token) {
      const admin = serviceClient();
      const { data: inv, error } = await admin
        .from('bid_invitations')
        .select('*, bid_packages(id, name, description, scope, due_date, project_id, projects(name))')
        .eq('token', token)
        .single();

      if (error || !inv) return res.status(404).json({ error: 'Invalid or expired invitation link' });

      const { data: existing } = await admin
        .from('bid_submissions')
        .select('id')
        .eq('invitation_id', inv.id)
        .maybeSingle();

      return res.status(200).json({
        invitation: { id: inv.id, email: inv.email, name: inv.name, company: inv.company, status: inv.status },
        package: inv.bid_packages,
        alreadySubmitted: Boolean(existing),
      });
    }

    // Auth: list submissions for a package
    if (packageId) {
      const bearerToken = req.headers.authorization?.replace('Bearer ', '');
      if (!bearerToken) return res.status(401).json({ error: 'Missing authorization token' });

      const supabase = authClient(bearerToken);
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) return res.status(401).json({ error: 'Invalid or expired token' });

      const { data, error } = await supabase
        .from('bid_submissions')
        .select('*')
        .eq('package_id', packageId)
        .order('submitted_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data });
    }

    return res.status(400).json({ error: 'token or packageId is required' });
  }

  // ── POST: submit a bid (public via invitation token) ──────────────────────
  if (req.method === 'POST') {
    const {
      token,
      submitter_name, submitter_email, submitter_company,
      amount_low, amount_mid, amount_high,
      notes, qualifications,
    } = req.body;

    if (!token) return res.status(400).json({ error: 'token is required' });

    const admin = serviceClient();

    const { data: inv, error: invErr } = await admin
      .from('bid_invitations')
      .select('id, package_id, project_id, status, email, name')
      .eq('token', token)
      .single();

    if (invErr || !inv) return res.status(404).json({ error: 'Invalid invitation link' });
    if (inv.status === 'submitted') {
      return res.status(409).json({ error: 'A bid has already been submitted for this invitation' });
    }

    const { data: submission, error: subErr } = await admin
      .from('bid_submissions')
      .insert({
        invitation_id: inv.id,
        package_id: inv.package_id,
        project_id: inv.project_id,
        submitter_name: submitter_name?.trim() || inv.name || null,
        submitter_email: submitter_email?.trim() || inv.email,
        submitter_company: submitter_company?.trim() || null,
        amount_low:  amount_low  != null ? parseFloat(amount_low)  : null,
        amount_mid:  amount_mid  != null ? parseFloat(amount_mid)  : null,
        amount_high: amount_high != null ? parseFloat(amount_high) : null,
        notes: notes?.trim() || null,
        qualifications: qualifications?.trim() || null,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (subErr) return res.status(500).json({ error: subErr.message });

    await admin.from('bid_invitations').update({ status: 'submitted' }).eq('id', inv.id);

    return res.status(201).json({ data: submission });
  }

  // ── PATCH: award / un-award a submission ──────────────────────────────────
  if (req.method === 'PATCH') {
    const bearerToken = req.headers.authorization?.replace('Bearer ', '');
    if (!bearerToken) return res.status(401).json({ error: 'Missing authorization token' });

    const supabase = authClient(bearerToken);
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return res.status(401).json({ error: 'Invalid or expired token' });

    const { id, is_awarded } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });

    const { data, error } = await supabase
      .from('bid_submissions')
      .update({ is_awarded: Boolean(is_awarded) })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
