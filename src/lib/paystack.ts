/**
 * Paystack Inline (https://paystack.com/docs/payments/accept-payments)
 * - Public key: VITE_PAYSTACK_PUBLIC_KEY
 * - Server verification: verify-paystack edge function (uses PAYSTACK_SECRET_KEY)
 *
 * Amount: smallest currency unit (KES = cents → multiply major units by 100).
 */

const PAYSTACK_INLINE_SRC = 'https://js.paystack.co/v1/inline.js';

export type PaystackCurrency = 'KES' | 'NGN' | 'GHS' | 'ZAR' | 'USD';

export interface PaystackCheckoutOptions {
  publicKey: string;
  email: string;
  amountMajor: number;
  currency: PaystackCurrency;
  reference: string;
  metadata?: Record<string, unknown>;
  onSuccess: (reference: string) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (opts: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref: string;
        metadata?: Record<string, unknown>;
        callback: (response: { reference: string }) => void;
        onClose: () => void;
      }) => { openIframe: () => void };
    };
  }
}

export function paystackAmountSubunit(amountMajor: number, currency: PaystackCurrency): number {
  const n = Math.round(amountMajor * 100);
  return Math.max(n, 100);
}

export function loadPaystackScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.PaystackPop) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PAYSTACK_INLINE_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Paystack script failed')), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = PAYSTACK_INLINE_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Paystack'));
    document.body.appendChild(s);
  });
}

/**
 * Opens Paystack inline checkout. Resolves when user completes or closes (via callbacks).
 */
export async function openPaystackCheckout(options: PaystackCheckoutOptions): Promise<void> {
  const pk = options.publicKey?.trim();
  if (!pk) {
    throw new Error('Paystack is not configured (missing VITE_PAYSTACK_PUBLIC_KEY)');
  }

  await loadPaystackScript();
  const PaystackPop = window.PaystackPop;
  if (!PaystackPop?.setup) {
    throw new Error('Paystack failed to initialize');
  }

  const amount = paystackAmountSubunit(options.amountMajor, options.currency);

  const handler = PaystackPop.setup({
    key: pk,
    email: options.email,
    amount,
    currency: options.currency,
    ref: options.reference,
    metadata: options.metadata,
    callback: (response) => {
      options.onSuccess(response.reference);
    },
    onClose: () => {
      options.onClose();
    },
  });

  handler.openIframe();
}

export function getPaystackPublicKey(): string {
  return (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string) || '';
}
