import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  invoice_id: string;
  payment_method: string;
  payment_reference: string;
  amount: number;
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

    const { invoice_id, payment_method, payment_reference, amount }: PaymentRequest = await req.json();

    console.log('Processing payment for invoice:', invoice_id);

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select(`
        *,
        suppliers!inner(
          company_name,
          email,
          user_id
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

    // Update invoice status to paid
    const { error: updateError } = await supabaseClient
      .from('invoices')
      .update({ 
        status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', invoice_id);

    if (updateError) {
      console.error('Error updating invoice status:', updateError);
      throw updateError;
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from('invoice_payments')
      .insert({
        invoice_id: invoice_id,
        payment_method: payment_method,
        payment_reference: payment_reference,
        amount_paid: amount,
        payment_date: new Date().toISOString(),
        status: 'completed'
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      throw paymentError;
    }

    // Create notification to supplier about payment
    const { error: notificationError } = await supabaseClient
      .from('delivery_communications')
      .insert({
        sender_id: invoice.issuer_id,
        sender_type: 'builder',
        sender_name: 'System',
        message_type: 'payment_confirmation',
        content: `Payment received for invoice ${invoice.invoice_number}. Amount: KES ${amount.toLocaleString()}. Reference: ${payment_reference}`,
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          payment_id: payment.id,
          amount_paid: amount,
          payment_reference: payment_reference
        }
      });

    if (notificationError) {
      console.error('Error creating payment notification:', notificationError);
    }

    console.log('Payment processed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment processed successfully',
        payment_id: payment.id,
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
    console.error('Error in process-payment function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to process payment'
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