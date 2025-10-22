import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Server-side encryption using the secure ENCRYPTION_KEY from secrets
async function encryptData(plaintext: string): Promise<string> {
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey) {
    throw new Error('Encryption key not configured');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // Generate a random IV for each encryption
  const iv = crypto.getRandomValues(new Uint8Array(16));
  
  // Import the key
  const keyData = encoder.encode(encryptionKey.padEnd(32, '0').substring(0, 32));
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  // Encrypt
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedData), iv.length);
  
  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

async function decryptData(ciphertext: string): Promise<string> {
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey) {
    throw new Error('Encryption key not configured');
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Decode from base64
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  
  // Extract IV and encrypted data
  const iv = combined.slice(0, 16);
  const encryptedData = combined.slice(16);
  
  // Import the key
  const keyData = encoder.encode(encryptionKey.padEnd(32, '0').substring(0, 32));
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  // Decrypt
  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedData
  );
  
  return decoder.decode(decryptedData);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, data } = await req.json();

    if (action === 'encrypt') {
      const encrypted = await encryptData(data);
      console.log(`Encrypted data for user ${user.id}`);
      
      return new Response(
        JSON.stringify({ encrypted }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } else if (action === 'decrypt') {
      const decrypted = await decryptData(data);
      console.log(`Decrypted data for user ${user.id}`);
      
      return new Response(
        JSON.stringify({ decrypted }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } else {
      throw new Error('Invalid action. Use "encrypt" or "decrypt"');
    }
  } catch (error) {
    console.error('Encryption service error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
