// Request signature verification for API calls
export class RequestSignature {
  private static readonly SECRET_KEY = 'ujenzipro-signature-key';

  static async generateSignature(payload: any, timestamp: number): Promise<string> {
    const data = JSON.stringify({ payload, timestamp });
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.SECRET_KEY);
    const messageData = encoder.encode(data);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static async verifySignature(
    payload: any,
    timestamp: number,
    signature: string
  ): Promise<boolean> {
    const expectedSignature = await this.generateSignature(payload, timestamp);
    return expectedSignature === signature;
  }

  static isTimestampValid(timestamp: number, maxAgeMs: number = 300000): boolean {
    const now = Date.now();
    return Math.abs(now - timestamp) <= maxAgeMs;
  }
}

export const createSignedRequest = async (payload: any) => {
  const timestamp = Date.now();
  const signature = await RequestSignature.generateSignature(payload, timestamp);
  
  return {
    payload,
    timestamp,
    signature
  };
};

export const verifySignedRequest = async (
  payload: any,
  timestamp: number,
  signature: string
): Promise<{ valid: boolean; reason?: string }> => {
  if (!RequestSignature.isTimestampValid(timestamp)) {
    return { valid: false, reason: 'Request timestamp expired' };
  }

  const isValid = await RequestSignature.verifySignature(payload, timestamp, signature);
  if (!isValid) {
    return { valid: false, reason: 'Invalid signature' };
  }

  return { valid: true };
};
