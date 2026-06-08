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
      ready: (callback: () => void) => void;
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

  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const handleErrorRef = useRef(handleError);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    handleErrorRef.current = handleError;
  }, [onVerify, onExpire, handleError]);

  useEffect(() => {
    if (!provider || !containerRef.current) {
      setLoading(false);
      return;
    }

    const siteKey = getBotChallengeSiteKey(provider);
    if (!siteKey) {
      handleErrorRef.current('Bot protection is misconfigured.');
      setLoading(false);
      return;
    }

    // Avoid tearing down a live widget when the parent re-renders (form focus, typing, etc.).
    if (widgetIdRef.current != null) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const renderTurnstile = () => {
      if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current != null) {
        return;
      }

      const mount = () => {
        if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current != null) {
          return;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          callback: (token: string) => {
            setError(null);
            onVerifyRef.current(token, 'turnstile');
          },
          'expired-callback': () => {
            onExpireRef.current?.();
          },
          'error-callback': () => {
            handleErrorRef.current('Bot verification failed. Please try again.');
          },
        });
        setLoading(false);
      };

      if (window.turnstile.ready) {
        window.turnstile.ready(mount);
      } else {
        mount();
      }
    };

    const renderRecaptcha = () => {
      if (cancelled || !containerRef.current || !window.grecaptcha?.render || widgetIdRef.current != null) {
        return;
      }

      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        size: 'normal',
        callback: (token: string) => {
          setError(null);
          onVerifyRef.current(token, 'recaptcha');
        },
        'expired-callback': () => {
          onExpireRef.current?.();
        },
        'error-callback': () => {
          handleErrorRef.current('Bot verification failed. Please try again.');
        },
      });
      setLoading(false);
    };

    if (provider === 'turnstile') {
      const existingScript = document.querySelector(
        'script[src*="challenges.cloudflare.com/turnstile"]',
      );
      if (window.turnstile?.render) {
        renderTurnstile();
      } else if (existingScript) {
        existingScript.addEventListener('load', renderTurnstile, { once: true });
      } else {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.onload = () => renderTurnstile();
        script.onerror = () => handleErrorRef.current('Failed to load bot protection.');
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
        script.onerror = () => handleErrorRef.current('Failed to load bot protection.');
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [provider, theme]);

  const resetChallenge = () => {
    setError(null);
    if (provider === 'turnstile' && widgetIdRef.current != null && window.turnstile?.reset) {
      window.turnstile.reset(String(widgetIdRef.current));
    } else if (provider === 'recaptcha' && widgetIdRef.current != null && window.grecaptcha?.reset) {
      window.grecaptcha.reset(widgetIdRef.current as number);
    }
    onExpireRef.current?.();
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

  const setVerified = useCallback((nextToken: string, nextProvider: BotProvider) => {
    setToken(nextToken);
    setVerifiedProvider(nextProvider);
  }, []);

  const clearVerification = useCallback(() => {
    setToken(null);
    setVerifiedProvider(null);
  }, []);

  return {
    token,
    provider: verifiedProvider,
    isConfigured: provider !== null,
    isReady: provider === null || token !== null,
    setVerified,
    clearVerification,
  };
}
