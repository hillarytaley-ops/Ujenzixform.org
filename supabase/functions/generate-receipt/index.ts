import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReceiptRequest {
  purchase_data: {
    buyer_id: string;
    supplier_id: string;
    items: any[];
    total_amount: number;
    payment_method: string;
    payment_reference: string;
    delivery_address?: string;
    special_instructions?: string;
  };
  builder_email: string;
  builder_name: string;
  supplier_name: string;
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

    const { purchase_data, builder_email, builder_name, supplier_name }: ReceiptRequest = await req.json();

    console.log('Generating receipt for purchase');

    // Generate receipt number
    const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create receipt record
    const { data: receipt, error: receiptError } = await supabaseClient
      .from('purchase_receipts')
      .insert({
        receipt_number: receiptNumber,
        buyer_id: purchase_data.buyer_id,
        supplier_id: purchase_data.supplier_id,
        items: purchase_data.items,
        total_amount: purchase_data.total_amount,
        payment_method: purchase_data.payment_method,
        payment_reference: purchase_data.payment_reference,
        delivery_address: purchase_data.delivery_address,
        special_instructions: purchase_data.special_instructions,
        status: 'completed',
        generated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (receiptError) {
      console.error('Error creating receipt:', receiptError);
      throw receiptError;
    }

    // Generate receipt content
    const receiptContent = `
      <h1>Purchase Receipt</h1>
      <p><strong>Receipt Number:</strong> ${receiptNumber}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Buyer:</strong> ${builder_name}</p>
      <p><strong>Supplier:</strong> ${supplier_name}</p>
      
      <h2>Items Purchased:</h2>
      <ul>
        ${purchase_data.items.map(item => `
          <li>${item.description} - Qty: ${item.quantity} ${item.unit} @ KES ${item.unit_price} = KES ${item.total_price}</li>
        `).join('')}
      </ul>
      
      <p><strong>Total Amount:</strong> KES ${purchase_data.total_amount.toLocaleString()}</p>
      <p><strong>Payment Method:</strong> ${purchase_data.payment_method}</p>
      <p><strong>Payment Reference:</strong> ${purchase_data.payment_reference}</p>
      
      ${purchase_data.delivery_address ? `<p><strong>Delivery Address:</strong> ${purchase_data.delivery_address}</p>` : ''}
      ${purchase_data.special_instructions ? `<p><strong>Special Instructions:</strong> ${purchase_data.special_instructions}</p>` : ''}
      
      <p>Thank you for your purchase!</p>
    `;

    // Send receipt email to builder
    await supabaseClient.functions.invoke('send-receipt-email', {
      body: {
        to_email: builder_email,
        builder_name: builder_name,
        receipt_number: receiptNumber,
        receipt_content: receiptContent,
        total_amount: purchase_data.total_amount
      }
    });

    console.log('Receipt generated and sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        receipt_number: receiptNumber,
        receipt_id: receipt.id,
        message: 'Receipt generated and sent to builder'
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
    console.error('Error in generate-receipt function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to generate receipt'
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