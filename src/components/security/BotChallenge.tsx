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

const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const LOAD_TIMEOUT_MS = 15000;

let turnstileLoadPromise: Promise<void> | null = null;

function waitForTurnstileApi(timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    const tick = () => {
      if (window.turnstile?.render) {
        if (window.turnstile.ready) {
          window.turnstile.ready(() => resolve());
        } else {
          resolve();
        }
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error('Turnstile API did not become ready in time'));
        return;
      }
      window.setTimeout(tick, 50);
    };

    tick();
  });
}

function loadTurnstileApi(): Promise<void> {
  if (window.turnstile?.render) {
    return waitForTurnstileApi(LOAD_TIMEOUT_MS);
  }
  if (turnstileLoadPromise) {
    return turnstileLoadPromise;
  }

  turnstileLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${TURNSTILE_SCRIPT}"]`);

    if (existing) {
      waitForTurnstileApi(LOAD_TIMEOUT_MS).then(resolve).catch(reject);
      return;
    }

    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT;
    script.async = true;
    script.onload = () => {
      waitForTurnstileApi(LOAD_TIMEOUT_MS).then(resolve).catch(reject);
    };
    script.onerror = () => {
      turnstileLoadPromise = null;
      reject(new Error('Failed to load Turnstile script'));
    };
    document.head.appendChild(script);
  });

  return turnstileLoadPromise;
}

let recaptchaLoadPromise: Promise<void> | null = null;

function loadRecaptchaApi(): Promise<void> {
  if (window.grecaptcha?.render) {
    return Promise.resolve();
  }
  if (recaptchaLoadPromise) {
    return recaptchaLoadPromise;
  }

  recaptchaLoadPromise = new Promise((resolve, reject) => {
    window.onRecaptchaLoad = () => resolve();
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      recaptchaLoadPromise = null;
      reject(new Error('Failed to load reCAPTCHA script'));
    };
    document.head.appendChild(script);
  });

  return recaptchaLoadPromise;
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
  const mountedRef = useRef(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!provider);

  const handleError = useCallback(
    (message: string) => {
      setLoading(false);
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
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!provider) {
      setLoading(false);
      return;
    }

    const siteKey = getBotChallengeSiteKey(provider);
    if (!siteKey) {
      handleErrorRef.current('Bot protection is misconfigured.');
      return;
    }

    if (widgetIdRef.current != null) {
      setLoading(false);
      return;
    }

    let timeoutId: number | undefined;

    const mountTurnstile = () => {
      if (!mountedRef.current || !containerRef.current || !window.turnstile || widgetIdRef.current != null) {
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

    const mountRecaptcha = () => {
      if (!mountedRef.current || !containerRef.current || !window.grecaptcha?.render || widgetIdRef.current != null) {
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

    const boot = async () => {
      try {
        timeoutId = window.setTimeout(() => {
          if (mountedRef.current && widgetIdRef.current == null) {
            handleErrorRef.current('Bot protection timed out. Please refresh and try again.');
          }
        }, LOAD_TIMEOUT_MS);

        if (provider === 'turnstile') {
          await loadTurnstileApi();
          if (!mountedRef.current) return;
          mountTurnstile();
        } else {
          await loadRecaptchaApi();
          if (!mountedRef.current) return;
          mountRecaptcha();
        }
      } catch (err) {
        if (!mountedRef.current) return;
        handleErrorRef.current(
          err instanceof Error ? err.message : 'Failed to load bot protection.',
        );
      }
    };

    // Ref is attached after paint; retry once if the effect ran too early.
    if (!containerRef.current) {
      const retryId = window.requestAnimationFrame(() => {
        if (mountedRef.current && containerRef.current) {
          void boot();
        }
      });
      return () => {
        window.cancelAnimationFrame(retryId);
        if (timeoutId) window.clearTimeout(timeoutId);
      };
    }

    void boot();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [provider, theme]);

  const resetChallenge = () => {
    setError(null);
    setLoading(false);
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
