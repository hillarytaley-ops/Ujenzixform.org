/**
 * Vercel serverless: insert delivery_provider_queue rows using the service role so client RLS/GRANT
 * gaps on Supabase do not block the buyer notification flow.
 *
 * Env (Vercel project): SUPABASE_SERVICE_ROLE_KEY, plus SUPABASE_URL + SUPABASE_ANON_KEY (or VITE_*).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function supabasePublicEnv() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  return { url, anon };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { url, anon } = supabasePublicEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon) {
    return res.status(500).json({ error: 'Server misconfigured: missing Supabase URL/anon key' });
  }
  if (!serviceKey) {
    return res.status(500).json({ error: 'Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY' });
  }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: authErr,
  } = await userClient.auth.getUser();
  if (authErr || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body as {
    providerId?: string;
    requestId?: string;
    queuePosition?: number;
  };
  const { providerId, requestId, queuePosition } = body;
  if (!providerId || !requestId || queuePosition == null) {
    return res.status(400).json({ error: 'Missing providerId, requestId, or queuePosition' });
  }

  const admin = createClient(url, serviceKey);

  const { data: dr, error: drErr } = await admin
    .from('delivery_requests')
    .select('id, builder_id')
    .eq('id', requestId)
    .maybeSingle();

  if (drErr || !dr) {
    return res.status(404).json({ error: 'Delivery request not found' });
  }

  let allowed = dr.builder_id === user.id;
  if (!allowed) {
    const { data: prof } = await admin
      .from('profiles')
      .select('user_id')
      .eq('id', dr.builder_id)
      .maybeSingle();
    allowed = prof?.user_id === user.id;
  }

  if (!allowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const contactedAt = new Date().toISOString();
  const timeoutAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { error: insErr } = await admin.from('delivery_provider_queue').insert({
    provider_id: providerId,
    request_id: requestId,
    queue_position: queuePosition,
    status: 'notified',
    contacted_at: contactedAt,
    timeout_at: timeoutAt,
  });

  if (insErr) {
    console.error('delivery_provider_queue insert:', insErr);
    return res.status(500).json({ error: insErr.message });
  }

  return res.status(200).json({ success: true });
}
