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

export const track = (type: string, level: Level = 'info', message?: string, data?: Record<string, any>) => {
  queue.push({ type, level, message, data, timestamp: new Date().toISOString() });
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