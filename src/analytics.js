import posthog from 'posthog-js';

// ── PostHog ────────────────────────────────────────────────────────────────

const POSTHOG_KEY = import.meta.env.NEXT_PUBLIC_POSTHOG_KEY;

// Respect the Do Not Track browser setting — check both vendor forms
const dnt =
  navigator.doNotTrack === '1' ||
  navigator.doNotTrack === 'yes' ||
  window.doNotTrack === '1';

const phEnabled = Boolean(POSTHOG_KEY) && !dnt;

if (phEnabled) {
  posthog.init(POSTHOG_KEY, {
    api_host: 'https://us.i.posthog.com',
    person_profiles: 'identified_only', // only create profiles for identified users
    capture_pageview: true,
    autocapture: false, // rely on explicit events only
  });
}

export function identifyUser(userId, { email, name, company } = {}) {
  if (!phEnabled) return;
  posthog.identify(userId, {
    email,
    name: name || email,
    ...(company ? { company } : {}),
  });
}

export function resetAnalyticsUser() {
  if (!phEnabled) return;
  posthog.reset();
}

function capture(event, props = {}) {
  if (!phEnabled) return;
  try { posthog.capture(event, props); } catch { /* never throw from analytics */ }
}

// Named event helpers — kept in one place so event names never drift
export const analytics = {
  projectCreated: (p) => capture('project_created', {
    building_type: p.building_type,
    delivery_method: p.delivery_method,
    city: p.city,
    state: p.state,
  }),

  estimateGenerated: (project, itemCount) => capture('estimate_generated', {
    building_type: project?.building_type,
    gross_sf: project?.gross_sf,
    item_count: itemCount,
  }),

  lineItemEdited: (field) => capture('line_item_edited', { field }),

  scenarioCreated: (name) => capture('scenario_created', { scenario_name: name }),

  teamMemberInvited: (role) => capture('team_member_invited', { role }),

  // Defined for future use — call when export actions are added
  pdfExported: (projectId) => capture('pdf_exported', { project_id: projectId }),
  excelExported: (projectId) => capture('excel_exported', { project_id: projectId }),
  featureRequested: (feature) => capture('feature_requested', { feature }),
};

// ── Crisp chat widget ──────────────────────────────────────────────────────

const CRISP_ID = import.meta.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;

export function initCrisp() {
  if (!CRISP_ID) return;

  window.$crisp = [];
  window.CRISP_WEBSITE_ID = CRISP_ID;

  const loadScript = () => {
    const s = document.createElement('script');
    s.src = 'https://client.crisp.chat/l.js';
    s.async = true;
    document.head.appendChild(s);
  };

  // Defer load until the browser is idle so it doesn't compete with first paint
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(loadScript, { timeout: 3000 });
  } else {
    setTimeout(loadScript, 1500);
  }
}

export function identifyCrispUser(email, name) {
  if (!CRISP_ID || !window.$crisp) return;
  window.$crisp.push(['set', 'user:email', [email]]);
  if (name) window.$crisp.push(['set', 'user:nickname', [name]]);
}
