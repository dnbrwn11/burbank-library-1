export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  const FORM_ID    = process.env.NEXT_PUBLIC_CONVERTKIT_FORM_ID;
  const API_SECRET = process.env.CONVERTKIT_API_SECRET;

  if (!FORM_ID || !API_SECRET) {
    console.warn('[join-founders-circle] ConvertKit env vars missing — recording locally only');
    console.log('[join-founders-circle] New signup:', email.trim());
    return res.status(200).json({ ok: true });
  }

  try {
    const ckRes = await fetch(
      `https://api.convertkit.com/v3/forms/${FORM_ID}/subscribe`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_secret: API_SECRET,
          email: email.trim(),
        }),
      }
    );

    const data = await ckRes.json();

    if (!ckRes.ok) {
      console.error('[join-founders-circle] ConvertKit error:', data);
      throw new Error(data.message || 'ConvertKit subscription failed');
    }

    console.log('[join-founders-circle] Subscribed:', email.trim());
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[join-founders-circle] Error:', err.message);
    return res.status(500).json({ error: 'Failed to join waitlist. Please try again.' });
  }
}
