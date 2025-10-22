import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier: string;
}

interface RateLimitState {
  count: number;
  resetAt: number;
}

export const useRateLimiting = () => {
  const [rateLimits, setRateLimits] = useState<Map<string, RateLimitState>>(new Map());
  const { toast } = useToast();

  const checkRateLimit = useCallback(async (config: RateLimitConfig): Promise<boolean> => {
    const key = `${config.identifier}`;
    const now = Date.now();
    const currentState = rateLimits.get(key);

    // Check local state first
    if (currentState && now < currentState.resetAt) {
      if (currentState.count >= config.maxRequests) {
        const resetInSeconds = Math.ceil((currentState.resetAt - now) / 1000);
        toast({
          title: "Rate Limit Exceeded",
          description: `Too many requests. Please try again in ${resetInSeconds} seconds.`,
          variant: "destructive"
        });
        
        // Log rate limit violation
        await logRateLimitViolation(config.identifier);
        return false;
      }
      
      setRateLimits(prev => new Map(prev).set(key, {
        count: currentState.count + 1,
        resetAt: currentState.resetAt
      }));
      return true;
    }

    // Reset or initialize
    setRateLimits(prev => new Map(prev).set(key, {
      count: 1,
      resetAt: now + config.windowMs
    }));

    return true;
  }, [rateLimits, toast]);

  const logRateLimitViolation = async (identifier: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('security_events').insert({
        user_id: user?.id,
        event_type: 'rate_limit_exceeded',
        severity: 'medium',
        details: { identifier, timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.error('Failed to log rate limit violation:', error);
    }
  };

  const resetRateLimit = (identifier: string) => {
    setRateLimits(prev => {
      const newMap = new Map(prev);
      newMap.delete(identifier);
      return newMap;
    });
  };

  return {
    checkRateLimit,
    resetRateLimit
  };
};
