import React, { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface RecaptchaWrapperProps {
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  onExpired?: () => void;
  theme?: 'light' | 'dark';
  size?: 'compact' | 'normal';
  siteKey?: string;
}

declare global {
  interface Window {
    grecaptcha: any;
    onRecaptchaLoad: () => void;
  }
}

export const RecaptchaWrapper: React.FC<RecaptchaWrapperProps> = ({
  onVerify,
  onError,
  onExpired,
  theme = 'light',
  size = 'normal',
  siteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' // Test key
}) => {
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [widgetId, setWidgetId] = useState<number | null>(null);

  useEffect(() => {
    // Check if reCAPTCHA is already loaded
    if (window.grecaptcha && window.grecaptcha.render) {
      setIsLoaded(true);
      renderRecaptcha();
      return;
    }

    // Load reCAPTCHA script
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
    script.async = true;
    script.defer = true;

    // Set up callback for when reCAPTCHA loads
    window.onRecaptchaLoad = () => {
      setIsLoaded(true);
      renderRecaptcha();
    };

    script.onerror = () => {
      setError('Failed to load reCAPTCHA. Please check your internet connection.');
      onError?.('Failed to load reCAPTCHA');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (widgetId !== null && window.grecaptcha) {
        try {
          window.grecaptcha.reset(widgetId);
        } catch (e) {
          console.warn('Error resetting reCAPTCHA:', e);
        }
      }
    };
  }, []);

  const renderRecaptcha = () => {
    if (!recaptchaRef.current || !window.grecaptcha || widgetId !== null) {
      return;
    }

    try {
      const id = window.grecaptcha.render(recaptchaRef.current, {
        sitekey: siteKey,
        theme,
        size,
        callback: (token: string) => {
          onVerify(token);
          setError(null);
        },
        'error-callback': () => {
          const errorMsg = 'reCAPTCHA verification failed. Please try again.';
          setError(errorMsg);
          onError?.(errorMsg);
        },
        'expired-callback': () => {
          setError('reCAPTCHA expired. Please verify again.');
          onExpired?.();
        }
      });
      setWidgetId(id);
    } catch (err) {
      const errorMsg = 'Failed to render reCAPTCHA widget.';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const resetRecaptcha = () => {
    if (widgetId !== null && window.grecaptcha) {
      try {
        window.grecaptcha.reset(widgetId);
        setError(null);
      } catch (e) {
        console.warn('Error resetting reCAPTCHA:', e);
      }
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <button 
            onClick={resetRecaptcha}
            className="ml-2 underline hover:no-underline"
          >
            Try Again
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!isLoaded) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            Loading security verification...
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-2">
      <div ref={recaptchaRef} />
      <p className="text-xs text-muted-foreground text-center">
        Protected by reCAPTCHA and the Google{' '}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">
          Privacy Policy
        </a>{' '}
        and{' '}
        <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline">
          Terms of Service
        </a>{' '}
        apply.
      </p>
    </div>
  );
};











