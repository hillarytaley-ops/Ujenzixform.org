import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Generate comprehensive analytics report
    const [
      { data: deliveries },
      { data: suppliers },
      { data: builders },
      { data: orders },
      { data: payments },
      { data: securityEvents }
    ] = await Promise.all([
      supabaseClient.from('deliveries').select('*'),
      supabaseClient.from('suppliers').select('*'),
      supabaseClient.from('profiles').select('*').eq('role', 'builder'),
      supabaseClient.from('purchase_orders').select('*'),
      supabaseClient.from('payments').select('*'),
      supabaseClient.from('security_events').select('*')
    ]);

    const analytics = {
      overview: {
        totalDeliveries: deliveries?.length || 0,
        activeSuppliers: suppliers?.filter(s => s.is_verified).length || 0,
        registeredBuilders: builders?.length || 0,
        totalOrderValue: orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0,
        paymentSuccessRate: payments?.length ? 
          (payments.filter(p => p.status === 'completed').length / payments.length) * 100 : 0
      },
      trends: {
        deliveryGrowth: calculateGrowthRate(deliveries || [], 'created_at'),
        supplierGrowth: calculateGrowthRate(suppliers || [], 'created_at'),
        builderGrowth: calculateGrowthRate(builders || [], 'created_at'),
        orderValueGrowth: calculateOrderValueGrowth(orders || [])
      },
      security: {
        totalSecurityEvents: securityEvents?.length || 0,
        criticalEvents: securityEvents?.filter(e => e.severity === 'critical').length || 0,
        recentThreats: securityEvents?.filter(e => 
          new Date(e.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length || 0
      },
      insights: generateBusinessInsights(deliveries || [], suppliers || [], builders || [], orders || [], payments || [])
    };

    return new Response(JSON.stringify(analytics), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function calculateGrowthRate(data: any[], dateField: string): number {
  if (!data || data.length === 0) return 0;
  
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const lastMonthCount = data.filter(item => {
    const date = new Date(item[dateField]);
    return date >= lastMonth && date < thisMonth;
  }).length;
  
  const thisMonthCount = data.filter(item => {
    const date = new Date(item[dateField]);
    return date >= thisMonth;
  }).length;
  
  return lastMonthCount === 0 ? 100 : ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100;
}

function calculateOrderValueGrowth(orders: any[]): number {
  if (!orders || orders.length === 0) return 0;
  
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const lastMonthValue = orders.filter(order => {
    const date = new Date(order.created_at);
    return date >= lastMonth && date < thisMonth;
  }).reduce((sum, order) => sum + (order.total_amount || 0), 0);
  
  const thisMonthValue = orders.filter(order => {
    const date = new Date(order.created_at);
    return date >= thisMonth;
  }).reduce((sum, order) => sum + (order.total_amount || 0), 0);
  
  return lastMonthValue === 0 ? 100 : ((thisMonthValue - lastMonthValue) / lastMonthValue) * 100;
}

function generateBusinessInsights(deliveries: any[], suppliers: any[], builders: any[], orders: any[], payments: any[]): string[] {
  const insights: string[] = [];
  
  // Performance insights
  if (deliveries && deliveries.length > 0) {
    const delayedDeliveries = deliveries.filter(d => 
      d.actual_delivery_time && d.estimated_delivery_time &&
      new Date(d.actual_delivery_time) > new Date(d.estimated_delivery_time)
    );
    
    if (delayedDeliveries.length / deliveries.length > 0.2) {
      insights.push('High delivery delay rate detected - consider logistics optimization');
    }
  }
  
  // Payment insights
  if (payments && payments.length > 0) {
    const failedPayments = payments.filter(p => p.status === 'failed');
    if (failedPayments.length / payments.length > 0.1) {
      insights.push('Payment failure rate above 10% - review payment integrations');
    }
  }
  
  // Growth opportunities
  if (builders && suppliers) {
    const builderSupplierRatio = builders.length / (suppliers?.length || 1);
    if (builderSupplierRatio > 5) {
      insights.push('High builder-to-supplier ratio - opportunity to onboard more suppliers');
    }
  }
  
  return insights;
}