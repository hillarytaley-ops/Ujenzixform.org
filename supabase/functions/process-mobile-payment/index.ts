import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  amount: number;
  currency: string;
  provider: string;
  phoneNumber?: string;
  reference: string;
  description: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const paymentRequest: PaymentRequest = await req.json();

    // Process payment based on provider
    let result;
    switch (paymentRequest.provider) {
      case 'paystack':
        throw new Error(
          'Paystack is initialized in the browser; verify with the verify-paystack function using the transaction reference after checkout.'
        );
      case 'mpesa':
        result = await processMpesaPayment(paymentRequest);
        break;
      case 'airtel_money':
        result = await processAirtelMoneyPayment(paymentRequest);
        break;
      case 'equity_bank':
      case 'kcb':
        result = await processBankPayment(paymentRequest);
        break;
      default:
        throw new Error('Unsupported payment provider');
    }

    // Save payment record using secure vault function
    // This stores phone numbers separately in an encrypted vault with audit logging
    const { data: paymentId, error: insertError } = await supabaseClient
      .rpc('insert_payment_with_contact', {
        p_user_id: user.id,
        p_amount: paymentRequest.amount,
        p_currency: paymentRequest.currency,
        p_provider: paymentRequest.provider,
        p_phone_number: paymentRequest.phoneNumber || '',
        p_reference: paymentRequest.reference,
        p_description: paymentRequest.description,
        p_status: result.success ? 'completed' : 'failed',
        p_transaction_id: result.transactionId || '',
        p_provider_response: result.response
      });

    if (insertError) {
      console.error('Payment storage error:', insertError);
      throw insertError;
    }

    console.log(`Payment stored securely with ID: ${paymentId}`);

    return new Response(JSON.stringify(result), {
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

async function processMpesaPayment(request: PaymentRequest) {
  // Get M-Pesa configuration from secure environment variables
  const mpesaPasskey = Deno.env.get("MPESA_PASSKEY");
  const mpesaShortcode = Deno.env.get("MPESA_SHORTCODE") || "174379";
  
  if (!mpesaPasskey) {
    throw new Error("M-Pesa configuration missing");
  }
  
  // In production, integrate with Safaricom M-Pesa API using secure passkey
  // Example: Generate timestamp, create password using passkey, etc.
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
  
  console.log(`Processing M-Pesa payment with shortcode: ${mpesaShortcode}`);
  
  return {
    success: Math.random() > 0.15, // 85% success rate
    transactionId: `MP${Date.now()}`,
    response: {
      merchantRequestID: `mer_${Date.now()}`,
      checkoutRequestID: `ws_CO_${Date.now()}`,
      responseCode: '0',
      responseDescription: 'Success',
      customerMessage: 'Payment request sent to your phone',
      timestamp: timestamp
    }
  };
}

async function processAirtelMoneyPayment(request: PaymentRequest) {
  // Simulate Airtel Money integration
  return {
    success: Math.random() > 0.2, // 80% success rate
    transactionId: `AM${Date.now()}`,
    response: {
      transactionId: `AM${Date.now()}`,
      status: 'SUCCESS',
      message: 'Payment processed successfully'
    }
  };
}

async function processBankPayment(request: PaymentRequest) {
  // Simulate bank integration
  return {
    success: Math.random() > 0.1, // 90% success rate
    transactionId: `BNK_${Date.now()}`,
    response: {
      bankReference: `REF${Date.now()}`,
      status: 'COMPLETED',
      accountNumber: '****1234'
    }
  };
}