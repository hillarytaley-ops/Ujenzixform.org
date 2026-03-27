// Supabase Edge Function: send-scheduled-report
// Generates and sends scheduled monitoring reports via email
//
// Secrets: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Optional: SITE_URL (default https://ujenzixform.org), RESEND_FROM_REPORTS (verified Resend sender)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SITE_URL = () =>
  Deno.env.get("SITE_URL") ?? "https://ujenzixform.org";

/** Must match a domain verified in Resend; override with RESEND_FROM_REPORTS. */
const RESEND_FROM_REPORTS = () =>
  Deno.env.get("RESEND_FROM_REPORTS") ??
  "UjenziXform Reports <reports@ujenzixform.org>";

interface ScheduledReport {
  id: string;
  name: string;
  recipients: string[];
  include_alerts: boolean;
  include_deliveries: boolean;
  include_cameras: boolean;
  include_analytics: boolean;
}

interface ReportData {
  alerts: {
    total: number;
    critical: number;
    resolved: number;
    byType: Record<string, number>;
  };
  deliveries: {
    total: number;
    completed: number;
    inProgress: number;
    delayed: number;
  };
  cameras: {
    total: number;
    online: number;
    offline: number;
  };
  analytics: {
    avgResolutionTime: number;
    avgDeliveryTime: number;
    uptimePercent: number;
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { reportId, isTest } = await req.json();

    if (!reportId) {
      throw new Error("Report ID is required");
    }

    // Fetch report configuration
    const { data: report, error: reportError } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      throw new Error("Report not found");
    }

    // Create execution log
    const { data: logEntry, error: logError } = await supabase
      .from('scheduled_report_logs')
      .insert([{
        report_id: reportId,
        status: 'running',
        recipients_count: report.recipients.length
      }])
      .select()
      .single();

    const startTime = Date.now();

    // Gather report data
    const endDate = new Date();
    const startDate = new Date();
    
    switch (report.frequency) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    const reportData: ReportData = {
      alerts: { total: 0, critical: 0, resolved: 0, byType: {} },
      deliveries: { total: 0, completed: 0, inProgress: 0, delayed: 0 },
      cameras: { total: 0, online: 0, offline: 0 },
      analytics: { avgResolutionTime: 0, avgDeliveryTime: 0, uptimePercent: 100 }
    };

    // Fetch alerts data
    if (report.include_alerts) {
      const { data: alerts } = await supabase
        .from('monitoring_alerts')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (alerts) {
        reportData.alerts.total = alerts.length;
        reportData.alerts.critical = alerts.filter(a => 
          a.severity === 'critical' || a.severity === 'emergency'
        ).length;
        reportData.alerts.resolved = alerts.filter(a => a.status === 'resolved').length;
        
        alerts.forEach(a => {
          const type = a.alert_type || 'unknown';
          reportData.alerts.byType[type] = (reportData.alerts.byType[type] || 0) + 1;
        });

        // Calculate avg resolution time
        const resolved = alerts.filter(a => a.resolved_at && a.created_at);
        if (resolved.length > 0) {
          const totalMinutes = resolved.reduce((sum, a) => {
            const created = new Date(a.created_at).getTime();
            const resolvedAt = new Date(a.resolved_at).getTime();
            return sum + ((resolvedAt - created) / (1000 * 60));
          }, 0);
          reportData.analytics.avgResolutionTime = Math.round(totalMinutes / resolved.length);
        }
      }
    }

    // Fetch deliveries data
    if (report.include_deliveries) {
      const { data: deliveries } = await supabase
        .from('delivery_routes')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (deliveries) {
        reportData.deliveries.total = deliveries.length;
        reportData.deliveries.completed = deliveries.filter(d => 
          d.status === 'completed' || d.status === 'arrived'
        ).length;
        reportData.deliveries.inProgress = deliveries.filter(d => 
          d.status === 'in_transit' || d.status === 'near_destination'
        ).length;
        reportData.deliveries.delayed = deliveries.filter(d => d.status === 'cancelled').length;

        // Calculate avg delivery time
        const completed = deliveries.filter(d => d.completed_at && d.started_at);
        if (completed.length > 0) {
          const totalMinutes = completed.reduce((sum, d) => {
            const started = new Date(d.started_at).getTime();
            const completedAt = new Date(d.completed_at).getTime();
            return sum + ((completedAt - started) / (1000 * 60));
          }, 0);
          reportData.analytics.avgDeliveryTime = Math.round(totalMinutes / completed.length);
        }
      }
    }

    // Fetch cameras data
    if (report.include_cameras) {
      const { data: cameras } = await supabase
        .from('cameras')
        .select('*');

      if (cameras) {
        reportData.cameras.total = cameras.length;
        reportData.cameras.online = cameras.filter(c => c.status === 'online').length;
        reportData.cameras.offline = cameras.filter(c => c.status === 'offline').length;
        
        if (cameras.length > 0) {
          reportData.analytics.uptimePercent = Math.round(
            (reportData.cameras.online / cameras.length) * 100
          );
        }
      }
    }

    // Generate HTML email
    const emailHtml = generateReportEmail(report, reportData, startDate, endDate, isTest);

    // Send emails
    let emailsSent = 0;
    let emailsFailed = 0;
    const errors: string[] = [];

    for (const recipient of report.recipients) {
      try {
        if (RESEND_API_KEY) {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
              from: RESEND_FROM_REPORTS(),
              to: recipient,
              subject: `${isTest ? '[TEST] ' : ''}${report.name} - ${new Date().toLocaleDateString()}`,
              html: emailHtml
            })
          });

          if (response.ok) {
            emailsSent++;
          } else {
            emailsFailed++;
            errors.push(`Failed to send to ${recipient}`);
          }
        } else {
          // Log that email would be sent (for testing without Resend)
          console.log(`Would send email to ${recipient}`);
          emailsSent++;
        }
      } catch (error) {
        emailsFailed++;
        errors.push(`Error sending to ${recipient}: ${error.message}`);
      }
    }

    const executionTime = Date.now() - startTime;

    // Update execution log
    if (logEntry) {
      await supabase
        .from('scheduled_report_logs')
        .update({
          status: emailsFailed > 0 && emailsSent === 0 ? 'failed' : 'completed',
          emails_sent: emailsSent,
          emails_failed: emailsFailed,
          error_message: errors.length > 0 ? errors.join('; ') : null,
          execution_time_ms: executionTime,
          completed_at: new Date().toISOString()
        })
        .eq('id', logEntry.id);
    }

    // Update next run time (if not a test)
    if (!isTest) {
      await supabase.rpc('update_report_next_run', {
        p_report_id: reportId,
        p_success: emailsSent > 0
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        emailsFailed,
        executionTime,
        isTest
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending scheduled report:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateReportEmail(
  report: ScheduledReport,
  data: ReportData,
  startDate: Date,
  endDate: Date,
  isTest: boolean
): string {
  const dateRange = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    ${isTest ? '.test-banner { background: #f59e0b; color: white; padding: 10px; text-align: center; font-weight: bold; }' : ''}
    .content { padding: 30px; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
    .metric-card { background: #f9fafb; border-radius: 8px; padding: 15px; text-align: center; border: 1px solid #e5e7eb; }
    .metric-value { font-size: 28px; font-weight: bold; color: #1f2937; }
    .metric-value.critical { color: #dc2626; }
    .metric-value.success { color: #16a34a; }
    .metric-value.warning { color: #f59e0b; }
    .metric-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    ${isTest ? '<div class="test-banner">⚠️ TEST EMAIL - This is a preview of your scheduled report</div>' : ''}
    
    <div class="header">
      <h1>📊 ${report.name}</h1>
      <p>${dateRange}</p>
    </div>
    
    <div class="content">
      ${report.include_alerts ? `
      <div class="section">
        <div class="section-title">🔔 Alerts Summary</div>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${data.alerts.total}</div>
            <div class="metric-label">Total Alerts</div>
          </div>
          <div class="metric-card">
            <div class="metric-value critical">${data.alerts.critical}</div>
            <div class="metric-label">Critical Alerts</div>
          </div>
          <div class="metric-card">
            <div class="metric-value success">${data.alerts.resolved}</div>
            <div class="metric-label">Resolved</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${data.analytics.avgResolutionTime} min</div>
            <div class="metric-label">Avg Resolution Time</div>
          </div>
        </div>
      </div>
      ` : ''}
      
      ${report.include_deliveries ? `
      <div class="section">
        <div class="section-title">🚚 Deliveries Summary</div>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${data.deliveries.total}</div>
            <div class="metric-label">Total Deliveries</div>
          </div>
          <div class="metric-card">
            <div class="metric-value success">${data.deliveries.completed}</div>
            <div class="metric-label">Completed</div>
          </div>
          <div class="metric-card">
            <div class="metric-value warning">${data.deliveries.inProgress}</div>
            <div class="metric-label">In Progress</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${data.analytics.avgDeliveryTime} min</div>
            <div class="metric-label">Avg Delivery Time</div>
          </div>
        </div>
      </div>
      ` : ''}
      
      ${report.include_cameras ? `
      <div class="section">
        <div class="section-title">📹 Camera Status</div>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${data.cameras.total}</div>
            <div class="metric-label">Total Cameras</div>
          </div>
          <div class="metric-card">
            <div class="metric-value success">${data.cameras.online}</div>
            <div class="metric-label">Online</div>
          </div>
          <div class="metric-card">
            <div class="metric-value critical">${data.cameras.offline}</div>
            <div class="metric-label">Offline</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${data.analytics.uptimePercent}%</div>
            <div class="metric-label">Uptime</div>
          </div>
        </div>
      </div>
      ` : ''}
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${DEFAULT_SITE_URL()}/admin" class="button">View Dashboard</a>
      </div>
    </div>
    
    <div class="footer">
      <p>UjenziXform Construction Monitoring System</p>
      <p>This is an automated report. To manage your subscriptions, visit the admin dashboard.</p>
    </div>
  </div>
</body>
</html>
  `;
}














