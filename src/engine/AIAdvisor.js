import { supabase } from '../supabase/supabaseClient';

export async function fetchAIAdvice(item) {
  const { data: { session } } = await supabase.auth.getSession();

  const resp = await fetch('/api/ai-advice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ item }),
  });

  let data;
  try {
    data = await resp.json();
  } catch {
    throw new Error(`AI advice request failed (${resp.status}): response was not JSON`);
  }

  if (!resp.ok) {
    throw new Error(data?.error || `AI advice failed (${resp.status})`);
  }

  return data;
}
