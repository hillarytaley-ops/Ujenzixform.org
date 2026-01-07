// Supabase Edge Function: aggregate-daily-analytics
// Aggregates monitoring data into daily analytics
// Designed to be run as a scheduled cron job (daily at midnight)
//
// To set up cron schedule, add to supabase/config.toml:
// [functions.aggregate-daily-analytics]
// schedule = "0 0 * * *"  # Run at midnight every day

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DailyAnalytics {
  date: string;
  hour: number | null;
  cameras_online: number;
  cameras_offline: number;
  camera_uptime_percent: number;
  total_viewers: number;
  peak_viewers: number;
  deliveries_started: number;
  deliveries_completed: number;
  deliveries_delayed: number;
  avg_delivery_time_minutes: number | null;
  total_distance_km: number;
  alerts_created: number;
  alerts_critical: number;
  alerts_resolved: number;
  avg_resolution_time_minutes: number | null;
  access_requests_created: number;
  access_requests_approved: number;
  access_requests_rejected: number;
  api_requests: number;
  avg_response_time_ms: number;
  error_count: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the date to aggregate (default: yesterday)
    const requestBody = await req.json().catch(() => ({}));
    const targetDate = requestBody.date 
      ? new Date(requestBody.date) 
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
    
    const dateStr = targetDate.toISOString().split('T')[0];
    const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
    const endOfDay = new Date(dateStr + 'T23:59:59.999Z');

    console.log(`Aggregating analytics for ${dateStr}`);

    // Fetch all data for the day in parallel
    const [
      alertsResult,
      deliveriesResult,
      accessRequestsResult,
      camerasResult
    ] = await Promise.all([
      // Alerts
      supabase
        .from('monitoring_alerts')
        .select('*')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString()),
      
      // Delivery routes
      supabase
        .from('delivery_routes')
        .select('*')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString()),
      
      // Access requests
      supabase
        .from('camera_access_requests')
        .select('*')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString()),
      
      // Cameras (for uptime calculation)
      supabase
        .from('cameras')
        .select('*')
    ]);

    const alerts = alertsResult.data || [];
    const deliveries = deliveriesResult.data || [];
    const accessRequests = accessRequestsResult.data || [];
    const cameras = camerasResult.data || [];

    // Calculate alert metrics
    const criticalAlerts = alerts.filter(a => 
      a.severity === 'critical' || a.severity === 'emergency'
    );
    
    const resolvedAlerts = alerts.filter(a => a.status === 'resolved');
    
    // Calculate average resolution time
    let avgResolutionTime: number | null = null;
    const resolvedWithTime = alerts.filter(a => a.resolved_at && a.created_at);
    if (resolvedWithTime.length > 0) {
      const totalMinutes = resolvedWithTime.reduce((sum, a) => {
        const created = new Date(a.created_at).getTime();
        const resolved = new Date(a.resolved_at).getTime();
        return sum + ((resolved - created) / (1000 * 60));
      }, 0);
      avgResolutionTime = Math.round(totalMinutes / resolvedWithTime.length);
    }

    // Calculate delivery metrics
    const completedDeliveries = deliveries.filter(d => 
      d.status === 'completed' || d.status === 'arrived'
    );
    const delayedDeliveries = deliveries.filter(d => d.status === 'cancelled');
    
    // Calculate average delivery time
    let avgDeliveryTime: number | null = null;
    const completedWithTime = deliveries.filter(d => d.completed_at && d.started_at);
    if (completedWithTime.length > 0) {
      const totalMinutes = completedWithTime.reduce((sum, d) => {
        const started = new Date(d.started_at).getTime();
        const completed = new Date(d.completed_at).getTime();
        return sum + ((completed - started) / (1000 * 60));
      }, 0);
      avgDeliveryTime = Math.round(totalMinutes / completedWithTime.length);
    }

    // Calculate total distance
    const totalDistance = deliveries.reduce((sum, d) => 
      sum + (d.distance_km || 0), 0
    );

    // Calculate camera metrics
    const onlineCameras = cameras.filter(c => c.status === 'online').length;
    const offlineCameras = cameras.filter(c => c.status === 'offline').length;
    const uptimePercent = cameras.length > 0 
      ? (onlineCameras / cameras.length) * 100 
      : 100;

    // Calculate access request metrics
    const approvedRequests = accessRequests.filter(r => r.status === 'approved');
    const rejectedRequests = accessRequests.filter(r => r.status === 'rejected');

    // Create analytics record
    const analytics: Partial<DailyAnalytics> = {
      date: dateStr,
      hour: null, // Daily aggregate
      cameras_online: onlineCameras,
      cameras_offline: offlineCameras,
      camera_uptime_percent: Math.round(uptimePercent * 100) / 100,
      total_viewers: 0, // Would need viewer tracking
      peak_viewers: 0,
      deliveries_started: deliveries.filter(d => d.started_at).length,
      deliveries_completed: completedDeliveries.length,
      deliveries_delayed: delayedDeliveries.length,
      avg_delivery_time_minutes: avgDeliveryTime,
      total_distance_km: Math.round(totalDistance * 100) / 100,
      alerts_created: alerts.length,
      alerts_critical: criticalAlerts.length,
      alerts_resolved: resolvedAlerts.length,
      avg_resolution_time_minutes: avgResolutionTime,
      access_requests_created: accessRequests.length,
      access_requests_approved: approvedRequests.length,
      access_requests_rejected: rejectedRequests.length,
      api_requests: 0, // Would need API logging
      avg_response_time_ms: 0,
      error_count: alerts.filter(a => a.alert_type === 'system_error').length
    };

    // Upsert the analytics record
    const { data: result, error: upsertError } = await supabase
      .from('monitoring_analytics')
      .upsert(analytics, { 
        onConflict: 'date,hour',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting analytics:', upsertError);
      throw upsertError;
    }

    console.log(`Successfully aggregated analytics for ${dateStr}:`, result);

    // Check if we need to send daily summary emails
    if (requestBody.sendSummary !== false) {
      // Fetch admins to send summary to
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        // Get admin emails
        for (const admin of admins) {
          const { data: userData } = await supabase.auth.admin.getUserById(admin.user_id);
          
          if (userData?.user?.email) {
            // Queue daily summary email
            const emailPayload = {
              to: userData.user.email,
              toName: userData.user.user_metadata?.full_name || 'Admin',
              templateKey: 'daily_summary',
              variables: {
                user_name: userData.user.user_metadata?.full_name || 'Admin',
                date: new Date(dateStr).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }),
                cameras_online: String(analytics.cameras_online),
                cameras_offline: String(analytics.cameras_offline),
                uptime_percent: String(analytics.camera_uptime_percent),
                deliveries_completed: String(analytics.deliveries_completed),
                deliveries_in_progress: String(analytics.deliveries_started - analytics.deliveries_completed),
                deliveries_delayed: String(analytics.deliveries_delayed),
                alerts_total: String(analytics.alerts_created),
                alerts_critical: String(analytics.alerts_critical),
                alerts_resolved: String(analytics.alerts_resolved),
                dashboard_url: `${SUPABASE_URL.replace('.supabase.co', '')}/admin`
              }
            };

            // Call send-monitoring-email function
            try {
              await fetch(`${SUPABASE_URL}/functions/v1/send-monitoring-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                },
                body: JSON.stringify(emailPayload)
              });
              console.log(`Daily summary email queued for ${userData.user.email}`);
            } catch (emailError) {
              console.error(`Failed to send daily summary to ${userData.user.email}:`, emailError);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: dateStr,
        analytics: result
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error aggregating analytics:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});














