import { supabase } from '@/integrations/supabase/client';

type Level = 'info' | 'warn' | 'error';

interface Event {
  type: string;
  level: Level;
  message?: string;
  data?: Record<string, any>;
  timestamp: string;
}

const queue: Event[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

const redact = (val: any): any => {
  const str = String(val ?? '');
  const redacted = str
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
    .replace(/\b\+?\d{7,}\b/g, '[redacted-phone]')
    .replace(/(api[_-]?key|authorization|token|secret)\s*[:=]\s*[^\s]+/gi, '$1:[redacted]')
    .replace(/(bearer)\s+[A-Za-z0-9\-._~+/]+=*/gi, '$1 [redacted]');
  return redacted.slice(0, 500);
};

const sanitize = (obj?: Record<string, any>) => {
  if (!obj) return undefined;
  const out: Record<string, any> = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v == null) continue;
    if (typeof v === 'string') out[k] = redact(v);
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    else out[k] = redact(JSON.stringify(v));
  }
  return out;
};

export const track = (type: string, level: Level = 'info', message?: string, data?: Record<string, any>) => {
  queue.push({ type, level, message: redact(message), data: sanitize(data), timestamp: new Date().toISOString() });
  if (!timer) {
    timer = setTimeout(flush, 3000);
  }
};

export const flush = async () => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  try {
    await supabase.from('app_logs').insert(batch);
  } catch (e) {
    console.warn('Telemetry insert failed');
    console.table(batch);
  }
};