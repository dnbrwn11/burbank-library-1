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

export async function createProject(project, userId) {
  if (!userId) return { data: null, error: { message: 'userId is required — pass user.id from the component that already holds the auth session' } };

  // Step 1: insert the project row
  const { data, error } = await supabase
    .from('projects')
    .insert({ ...project, owner_id: userId })
    .select()
    .single();

  if (error || !data) return { data, error };

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
    console.error('Failed to create Baseline scenario:', scError.message);
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
