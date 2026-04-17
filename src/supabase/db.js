import { supabase } from './supabaseClient';

// ════════════════════════════════════════════
// PROJECTS
// ════════════════════════════════════════════

export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  return { data, error };
}

export async function getProject(projectId) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  return { data, error };
}

export async function createProject(project, userId, orgId = null) {
  if (!userId) return { data: null, error: { message: 'userId is required — pass user.id from the component that already holds the auth session' } };

  console.log('[createProject] inserting project', { name: project.name, userId, orgId });

  // Step 1: insert the project row
  const row = { ...project, owner_id: userId };
  if (orgId) row.org_id = orgId;
  const { data, error } = await supabase
    .from('projects')
    .insert(row)
    .select()
    .single();

  if (error || !data) {
    console.error('[createProject] insert failed — full error:', error);
    console.error('[createProject] code:', error?.code, '| message:', error?.message, '| details:', error?.details, '| hint:', error?.hint);
    return { data, error };
  }

  console.log('[createProject] project created:', data.id);

  // Step 2: create the Baseline scenario — must complete before the caller
  // navigates into the project so useProjectData finds at least one scenario.
  const { error: scError } = await supabase
    .from('scenarios')
    .insert({
      project_id: data.id,
      name: 'Baseline',
      is_baseline: true,
      globals: {
        escalation: 0.04,
        laborBurden: 0.42,
        tax: 0.0975,
        insurance: 0.012,
        contingency: 0.05,
        fee: 0.045,
        regionFactor: 1.15,
        bond: 0.008,
        generalConditions: 0.08,
        buildingSF: project.gross_sf || 0,
        parkingStalls: project.parking_stalls || 0,
        openSpaceSF: 0,
      },
    })
    .select()
    .single();

  if (scError) {
    console.error('[createProject] Baseline scenario failed — full error:', scError);
    console.error('[createProject] code:', scError?.code, '| message:', scError?.message, '| details:', scError?.details);
  }

  return { data, error: null };
}

export async function updateProject(projectId, updates) {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single();

  return { data, error };
}

export async function archiveProject(projectId) {
  return updateProject(projectId, { status: 'archived' });
}

export async function duplicateProject(projectId) {
  // 1. Get original project
  const { data: original, error: fetchErr } = await getProject(projectId);
  if (fetchErr) return { data: null, error: fetchErr };

  // 2. Create new project (strip id, timestamps)
  const { id, created_at, updated_at, owner_id, ...projectData } = original;
  const { data: newProject, error: createErr } = await createProject({
    ...projectData,
    name: `${original.name} (Copy)`,
  });
  if (createErr) return { data: null, error: createErr };

  // 3. Copy scenarios + line items
  const { data: scenarios } = await getScenarios(projectId);
  if (scenarios) {
    for (const scenario of scenarios) {
      const { id: sId, project_id, created_at: sca, updated_at: sua, ...scenarioData } = scenario;
      const { data: newScenario } = await supabase
        .from('scenarios')
        .insert({ ...scenarioData, project_id: newProject.id })
        .select()
        .single();

      if (newScenario) {
        const { data: items } = await getLineItems(sId);
        if (items?.length) {
          const newItems = items.map(({ id, scenario_id, created_at, updated_at, ...item }) => ({
            ...item,
            scenario_id: newScenario.id,
          }));
          await supabase.from('line_items').insert(newItems);
        }
      }
    }
  }

  return { data: newProject, error: null };
}

// ════════════════════════════════════════════
// SCENARIOS
// ════════════════════════════════════════════

export async function getScenarios(projectId) {
  const { data, error } = await supabase
    .from('scenarios')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  return { data, error };
}

export async function createScenario(projectId, scenario = {}) {
  const { data, error } = await supabase
    .from('scenarios')
    .insert({ project_id: projectId, ...scenario })
    .select()
    .single();

  return { data, error };
}

export async function updateScenario(scenarioId, updates) {
  const { data, error } = await supabase
    .from('scenarios')
    .update(updates)
    .eq('id', scenarioId)
    .select()
    .single();

  return { data, error };
}

export async function updateGlobals(scenarioId, globals) {
  return updateScenario(scenarioId, { globals });
}

export async function deleteScenario(scenarioId) {
  const { error } = await supabase
    .from('scenarios')
    .delete()
    .eq('id', scenarioId);

  return { error };
}

// ════════════════════════════════════════════
// LINE ITEMS
// ════════════════════════════════════════════

export async function getLineItems(scenarioId) {
  const { data, error } = await supabase
    .from('line_items')
    .select('*')
    .eq('scenario_id', scenarioId)
    .eq('is_archived', false)
    .order('sort_order', { ascending: true });

  return { data, error };
}

export async function createLineItem(scenarioId, item) {
  const { data, error } = await supabase
    .from('line_items')
    .insert({ ...item, scenario_id: scenarioId })
    .select()
    .single();

  return { data, error };
}

export async function createLineItems(scenarioId, items) {
  const rows = items.map((item) => ({ ...item, scenario_id: scenarioId }));
  const { data, error } = await supabase
    .from('line_items')
    .insert(rows)
    .select();

  return { data, error };
}

export async function updateLineItem(itemId, updates) {
  const { data, error } = await supabase
    .from('line_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();

  return { data, error };
}

export async function deleteLineItem(itemId) {
  // Soft delete — archive instead of hard delete
  return updateLineItem(itemId, { is_archived: true });
}

// ════════════════════════════════════════════
// AUDIT LOG
// ════════════════════════════════════════════

export async function logChange(projectId, { scenarioId, itemId, fieldName, oldValue, newValue, description, userId = null }) {
  const { error } = await supabase
    .from('audit_log')
    .insert({
      project_id: projectId,
      scenario_id: scenarioId || null,
      user_id: userId,
      item_id: itemId || null,
      field_name: fieldName,
      old_value: oldValue?.toString() ?? null,
      new_value: newValue?.toString() ?? null,
      description: description || null,
    });

  return { error };
}

export async function getAuditLog(projectId, { limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data, error };
}

// ════════════════════════════════════════════
// PROJECT MEMBERS
// ════════════════════════════════════════════

export async function getProjectMembers(projectId) {
  const { data, error } = await supabase
    .from('project_members')
    .select('role, user_id, profiles(full_name, email, avatar_url)')
    .eq('project_id', projectId);
  return { data, error };
}

export async function addProjectMember(projectId, userId, role) {
  const { data, error } = await supabase
    .from('project_members')
    .upsert({ project_id: projectId, user_id: userId, role }, { onConflict: 'project_id,user_id' })
    .select()
    .single();
  return { data, error };
}

export async function removeProjectMember(projectId, userId) {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);
  return { error };
}

export async function getProjectMemberRole(projectId, userId) {
  const { data, error } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();
  return { data, error };
}

// ════════════════════════════════════════════
// ORGANIZATIONS
// ════════════════════════════════════════════

export async function getOrgForUser(userId) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('role, organizations(id, name, logo_url, created_at, updated_at)')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return { data: null, error };
  return { data: { ...data.organizations, role: data.role }, error: null };
}

export async function updateOrganization(orgId, updates) {
  const { data, error } = await supabase
    .from('organizations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', orgId)
    .select()
    .single();
  return { data, error };
}

export async function getOrgMembers(orgId) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('id, role, invited_at, joined_at, user_id, profiles(full_name, email, avatar_url)')
    .eq('org_id', orgId)
    .order('joined_at', { ascending: true, nullsFirst: false });
  return { data, error };
}

export async function removeOrgMember(orgId, userId) {
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', userId);
  return { error };
}

export async function getOrgProjects(orgId) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false });
  return { data, error };
}
