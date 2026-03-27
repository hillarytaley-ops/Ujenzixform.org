/**
 * Vercel serverless: send transactional email via Resend (same-origin as the SPA — no CORS issues).
 * Env (Vercel project): RESEND_API_KEY, SUPABASE_URL + SUPABASE_ANON_KEY (or VITE_* fallbacks).
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
  if (!url || !anon) {
    return res.status(500).json({ error: 'Server misconfigured: missing Supabase URL/anon key' });
  }

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY is not configured' });
  }

  const body = req.body as {
    to?: string | string[];
    subject?: string;
    html?: string;
    from?: string;
    replyTo?: string;
  };
  const { to, subject, html, from, replyTo } = body;
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from || 'UjenziXform <info@ujenzixform.org>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        reply_to: replyTo || 'info@ujenzixform.org',
      }),
    });

    const data = (await response.json()) as { message?: string; id?: string };

    if (!response.ok) {
      console.error('Resend API error:', data);
      return res.status(502).json({ error: data.message || 'Failed to send email' });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (e) {
    console.error('send-email handler error:', e);
    return res.status(500).json({
      error: e instanceof Error ? e.message : 'Unknown error',
    });
  }
}
