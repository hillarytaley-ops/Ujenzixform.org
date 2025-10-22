import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check for critical security events in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: criticalEvents, error } = await supabaseClient
      .from('security_events')
      .select('*')
      .eq('severity', 'critical')
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Aggregate events by type
    const eventsByType = (criticalEvents || []).reduce((acc: any, event: any) => {
      const type = event.event_type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(event);
      return acc;
    }, {});

    // Check for suspicious patterns
    const alerts: any[] = [];
    
    // Pattern 1: Multiple failed login attempts
    if (eventsByType['failed_login']?.length >= 3) {
      alerts.push({
        type: 'multiple_failed_logins',
        severity: 'critical',
        count: eventsByType['failed_login'].length,
        message: `${eventsByType['failed_login'].length} failed login attempts detected`,
        events: eventsByType['failed_login']
      });
    }

    // Pattern 2: Unauthorized access attempts
    if (eventsByType['unauthorized_access']?.length >= 2) {
      alerts.push({
        type: 'unauthorized_access_spike',
        severity: 'critical',
        count: eventsByType['unauthorized_access'].length,
        message: `${eventsByType['unauthorized_access'].length} unauthorized access attempts`,
        events: eventsByType['unauthorized_access']
      });
    }

    // Pattern 3: Rate limit violations
    if (eventsByType['rate_limit_exceeded']?.length >= 5) {
      alerts.push({
        type: 'rate_limit_abuse',
        severity: 'high',
        count: eventsByType['rate_limit_exceeded'].length,
        message: `Potential abuse: ${eventsByType['rate_limit_exceeded'].length} rate limit violations`,
        events: eventsByType['rate_limit_exceeded']
      });
    }

    // Pattern 4: Session hijacking indicators
    if (eventsByType['invalid_token']?.length >= 2) {
      alerts.push({
        type: 'possible_session_hijacking',
        severity: 'critical',
        count: eventsByType['invalid_token'].length,
        message: `Possible session hijacking: ${eventsByType['invalid_token'].length} invalid token attempts`,
        events: eventsByType['invalid_token']
      });
    }

    // Send notifications for critical alerts
    for (const alert of alerts) {
      console.log(`🚨 SECURITY ALERT: ${alert.message}`);
      
      // Store alert in database
      await supabaseClient.from('security_alerts').insert({
        alert_type: alert.type,
        severity: alert.severity,
        event_count: alert.count,
        description: alert.message,
        related_events: alert.events.map((e: any) => e.id),
        created_at: new Date().toISOString()
      });

      // In production, send email/SMS notifications to admins
      // await sendAdminNotification(alert);
    }

    return new Response(
      JSON.stringify({
        success: true,
        criticalEventsFound: criticalEvents?.length || 0,
        alertsGenerated: alerts.length,
        alerts: alerts.map(a => ({ type: a.type, severity: a.severity, message: a.message }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Security monitoring error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
