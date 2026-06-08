import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';
import {
  getBotChallengeSiteKey,
  getConfiguredBotProvider,
  type BotProvider,
} from '@/lib/botChallengeConfig';

export interface BotChallengeState {
  token: string | null;
  provider: BotProvider | null;
  isConfigured: boolean;
  isReady: boolean;
}

interface BotChallengeProps {
  onVerify: (token: string, provider: BotProvider) => void;
  onExpire?: () => void;
  onError?: (message: string) => void;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>,
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    grecaptcha?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => number;
      reset: (widgetId: number) => void;
    };
    onRecaptchaLoad?: () => void;
  }
}

export function BotChallenge({
  onVerify,
  onExpire,
  onError,
  theme = 'light',
  className,
}: BotChallengeProps) {
  const provider = getConfiguredBotProvider();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!provider);

  const handleError = useCallback(
    (message: string) => {
      setError(message);
      onError?.(message);
    },
    [onError],
  );

  useEffect(() => {
    if (!provider || !containerRef.current) {
      setLoading(false);
      return;
    }

    const siteKey = getBotChallengeSiteKey(provider);
    if (!siteKey) {
      handleError('Bot protection is misconfigured.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const renderTurnstile = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return;

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        callback: (token: string) => {
          setError(null);
          onVerify(token, 'turnstile');
        },
        'expired-callback': () => {
          onExpire?.();
        },
        'error-callback': () => {
          handleError('Bot verification failed. Please try again.');
        },
      });
      setLoading(false);
    };

    const renderRecaptcha = () => {
      if (cancelled || !containerRef.current || !window.grecaptcha?.render) return;

      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        size: 'normal',
        callback: (token: string) => {
          setError(null);
          onVerify(token, 'recaptcha');
        },
        'expired-callback': () => {
          onExpire?.();
        },
        'error-callback': () => {
          handleError('Bot verification failed. Please try again.');
        },
      });
      setLoading(false);
    };

    if (provider === 'turnstile') {
      if (window.turnstile?.render) {
        renderTurnstile();
      } else {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.onload = () => renderTurnstile();
        script.onerror = () => handleError('Failed to load bot protection.');
        document.head.appendChild(script);
      }
    } else {
      if (window.grecaptcha?.render) {
        renderRecaptcha();
      } else {
        window.onRecaptchaLoad = () => renderRecaptcha();
        const script = document.createElement('script');
        script.src =
          'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
        script.async = true;
        script.defer = true;
        script.onerror = () => handleError('Failed to load bot protection.');
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (provider === 'turnstile' && widgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(String(widgetIdRef.current));
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [provider, theme, onVerify, onExpire, handleError]);

  const resetChallenge = () => {
    setError(null);
    if (provider === 'turnstile' && widgetIdRef.current && window.turnstile?.reset) {
      window.turnstile.reset(String(widgetIdRef.current));
    } else if (provider === 'recaptcha' && widgetIdRef.current != null && window.grecaptcha?.reset) {
      window.grecaptcha.reset(widgetIdRef.current as number);
    }
    onExpire?.();
  };

  if (!provider) {
    return null;
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}{' '}
          <button type="button" onClick={resetChallenge} className="ml-1 underline hover:no-underline">
            Try again
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={className}>
      {loading && (
        <Alert className="mb-2">
          <Shield className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2 text-sm">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-primary" />
            Loading bot protection…
          </AlertDescription>
        </Alert>
      )}
      <div ref={containerRef} className="flex justify-center min-h-[65px]" />
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Protected by {provider === 'turnstile' ? 'Cloudflare Turnstile' : 'Google reCAPTCHA'} — helps
        block automated spam and AI bots.
      </p>
    </div>
  );
}

export function useBotChallengeState(): BotChallengeState & {
  setVerified: (token: string, provider: BotProvider) => void;
  clearVerification: () => void;
} {
  const provider = getConfiguredBotProvider();
  const [token, setToken] = useState<string | null>(null);
  const [verifiedProvider, setVerifiedProvider] = useState<BotProvider | null>(null);

  return {
    token,
    provider: verifiedProvider,
    isConfigured: provider !== null,
    isReady: provider === null || token !== null,
    setVerified: (nextToken, nextProvider) => {
      setToken(nextToken);
      setVerifiedProvider(nextProvider);
    },
    clearVerification: () => {
      setToken(null);
      setVerifiedProvider(null);
    },
  };
}
