import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceNotificationRequest {
  invoice_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { invoice_id }: InvoiceNotificationRequest = await req.json();

    console.log('Sending invoice notification for invoice:', invoice_id);

    // Get invoice details with supplier information
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select(`
        *,
        suppliers!inner(
          company_name,
          email,
          user_id
        ),
        profiles!inner(
          full_name,
          company_name
        )
      `)
      .eq('id', invoice_id)
      .single();

    if (invoiceError) {
      console.error('Error fetching invoice:', invoiceError);
      throw invoiceError;
    }

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    console.log('Invoice found:', invoice.invoice_number);

    // Create notification record for supplier
    const { error: notificationError } = await supabaseClient
      .from('delivery_communications')
      .insert({
        sender_id: invoice.issuer_id,
        sender_type: 'builder',
        sender_name: invoice.profiles.full_name || invoice.profiles.company_name || 'Builder',
        message_type: 'invoice_notification',
        content: `New invoice ${invoice.invoice_number} has been sent to you. Total amount: KES ${invoice.total_amount.toLocaleString()}. Due date: ${invoice.due_date || 'Not specified'}.`,
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          total_amount: invoice.total_amount,
          due_date: invoice.due_date,
          payment_terms: invoice.payment_terms
        }
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      throw notificationError;
    }

    console.log('Invoice notification sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invoice notification sent successfully',
        invoice_number: invoice.invoice_number 
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error('Error in send-invoice-notification function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to send invoice notification'
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);