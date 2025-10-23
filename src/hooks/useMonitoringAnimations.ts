/**
 * UJENZIPRO MONITORING PAGE ANIMATION HOOKS
 * Custom React hooks for managing animations in the monitoring dashboard
 */

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook to create pulsing animation for live camera feeds
 * @param isLive - Whether the camera is currently live
 * @param interval - Pulse interval in milliseconds (default: 2000)
 */
export const useCameraPulse = (isLive: boolean, interval: number = 2000) => {
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (!isLive) return;

    const pulseInterval = setInterval(() => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), interval / 2);
    }, interval);

    return () => clearInterval(pulseInterval);
  }, [isLive, interval]);

  return isPulsing;
};

/**
 * Hook for recording indicator blink animation
 * @param isRecording - Whether recording is active
 */
export const useRecordingBlink = (isRecording: boolean) => {
  const [blinkState, setBlinkState] = useState(true);

  useEffect(() => {
    if (!isRecording) {
      setBlinkState(false);
      return;
    }

    const blinkInterval = setInterval(() => {
      setBlinkState(prev => !prev);
    }, 750);

    return () => clearInterval(blinkInterval);
  }, [isRecording]);

  return blinkState;
};

/**
 * Hook for animated counter (count up animation)
 * @param endValue - Final value to count to
 * @param duration - Animation duration in milliseconds (default: 2000)
 */
export const useCountUp = (endValue: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = Date.now();
    let animationFrame: number;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - (startTimeRef.current || now)) / duration, 1);
      const easeOutQuad = progress * (2 - progress); // Easing function
      
      setCount(Math.floor(endValue * easeOutQuad));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [endValue, duration]);

  return count;
};

/**
 * Hook for progress bar animation
 * @param targetProgress - Target progress percentage (0-100)
 * @param duration - Animation duration in milliseconds (default: 1500)
 */
export const useProgressAnimation = (targetProgress: number, duration: number = 1500) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    let animationFrame: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      setProgress(targetProgress * easeOutCubic);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [targetProgress, duration]);

  return progress;
};

/**
 * Hook for signal strength animation bars
 * @param signalStrength - Signal strength percentage (0-100)
 */
export const useSignalAnimation = (signalStrength: number) => {
  const [animatedBars, setAnimatedBars] = useState<boolean[]>([false, false, false, false]);
  const bars = Math.ceil((signalStrength / 100) * 4);

  useEffect(() => {
    const delays = [0, 200, 400, 600];
    const timeouts: NodeJS.Timeout[] = [];

    delays.forEach((delay, index) => {
      if (index < bars) {
        timeouts.push(
          setTimeout(() => {
            setAnimatedBars(prev => {
              const newBars = [...prev];
              newBars[index] = true;
              return newBars;
            });
          }, delay)
        );
      }
    });

    return () => timeouts.forEach(timeout => clearTimeout(timeout));
  }, [bars]);

  return animatedBars;
};

/**
 * Hook for battery level animation with warning states
 * @param batteryLevel - Battery percentage (0-100)
 */
export const useBatteryAnimation = (batteryLevel: number) => {
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    setIsWarning(batteryLevel <= 20 && batteryLevel > 10);
    setIsCritical(batteryLevel <= 10);
  }, [batteryLevel]);

  return { isWarning, isCritical };
};

/**
 * Hook for staggered list animation
 * @param itemCount - Number of items to animate
 * @param staggerDelay - Delay between each item in milliseconds (default: 100)
 */
export const useStaggeredAnimation = (itemCount: number, staggerDelay: number = 100) => {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    for (let i = 0; i < itemCount; i++) {
      timeouts.push(
        setTimeout(() => {
          setVisibleItems(prev => [...prev, i]);
        }, i * staggerDelay)
      );
    }

    return () => timeouts.forEach(timeout => clearTimeout(timeout));
  }, [itemCount, staggerDelay]);

  return visibleItems;
};

/**
 * Hook for alert pulse animation
 * @param hasAlert - Whether there's an active alert
 * @param severity - Alert severity: 'low' | 'medium' | 'high' | 'critical'
 */
export const useAlertPulse = (hasAlert: boolean, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
  const [pulseIntensity, setPulseIntensity] = useState(0);

  useEffect(() => {
    if (!hasAlert) {
      setPulseIntensity(0);
      return;
    }

    const intensityMap = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4
    };

    setPulseIntensity(intensityMap[severity]);
  }, [hasAlert, severity]);

  return pulseIntensity;
};

/**
 * Hook for video feed loading state with shimmer effect
 * @param isLoading - Whether the video is loading
 */
export const useVideoLoadingShimmer = (isLoading: boolean) => {
  const [shimmerPosition, setShimmerPosition] = useState(-100);

  useEffect(() => {
    if (!isLoading) {
      setShimmerPosition(-100);
      return;
    }

    const interval = setInterval(() => {
      setShimmerPosition(prev => {
        if (prev >= 200) return -100;
        return prev + 5;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isLoading]);

  return shimmerPosition;
};

/**
 * Hook for drone floating animation coordinates
 * @param isActive - Whether the drone is active
 */
export const useDroneFloat = (isActive: boolean) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeRef = useRef(0);

  useEffect(() => {
    if (!isActive) {
      setPosition({ x: 0, y: 0 });
      return;
    }

    let animationFrame: number;

    const animate = () => {
      timeRef.current += 0.05;
      const x = Math.sin(timeRef.current) * 3;
      const y = Math.sin(timeRef.current * 0.5) * 8;
      
      setPosition({ x, y });
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [isActive]);

  return position;
};

/**
 * Hook for system health meter animation
 * @param healthPercentage - System health percentage (0-100)
 */
export const useHealthMeter = (healthPercentage: number) => {
  const [animatedHealth, setAnimatedHealth] = useState(0);
  const [status, setStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy');

  useEffect(() => {
    const duration = 2000;
    const startTime = Date.now();
    let animationFrame: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setAnimatedHealth(healthPercentage * easeOut);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    // Set status based on health
    if (healthPercentage >= 80) setStatus('healthy');
    else if (healthPercentage >= 50) setStatus('warning');
    else setStatus('critical');

    return () => cancelAnimationFrame(animationFrame);
  }, [healthPercentage]);

  return { animatedHealth, status };
};

/**
 * Hook for refresh button rotation animation
 */
export const useRefreshAnimation = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const triggerRefresh = useCallback((callback?: () => Promise<void>) => {
    setIsRefreshing(true);

    const execute = async () => {
      if (callback) {
        await callback();
      }
      setTimeout(() => setIsRefreshing(false), 1000);
    };

    execute();
  }, []);

  return { isRefreshing, triggerRefresh };
};

/**
 * Hook for location marker bounce animation
 * @param isActive - Whether the location is active
 */
export const useLocationBounce = (isActive: boolean) => {
  const [bounceOffset, setBounceOffset] = useState(0);
  const timeRef = useRef(0);

  useEffect(() => {
    if (!isActive) {
      setBounceOffset(0);
      return;
    }

    let animationFrame: number;

    const animate = () => {
      timeRef.current += 0.1;
      const offset = Math.abs(Math.sin(timeRef.current)) * 10;
      setBounceOffset(offset);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [isActive]);

  return bounceOffset;
};

/**
 * Hook for notification slide-in animation
 * @param notifications - Array of notification IDs
 */
export const useNotificationAnimation = (notifications: string[]) => {
  const [visibleNotifications, setVisibleNotifications] = useState<Set<string>>(new Set());
  const prevNotificationsRef = useRef<string[]>([]);

  useEffect(() => {
    const newNotifications = notifications.filter(
      id => !prevNotificationsRef.current.includes(id)
    );

    newNotifications.forEach((id, index) => {
      setTimeout(() => {
        setVisibleNotifications(prev => new Set([...prev, id]));
      }, index * 200);
    });

    prevNotificationsRef.current = notifications;
  }, [notifications]);

  return visibleNotifications;
};

/**
 * Hook for tab transition animation
 * @param activeTab - Currently active tab
 */
export const useTabTransition = (activeTab: string) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevTabRef = useRef(activeTab);

  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      setIsTransitioning(true);
      const timeout = setTimeout(() => {
        setIsTransitioning(false);
        prevTabRef.current = activeTab;
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [activeTab]);

  return isTransitioning;
};

/**
 * Hook for network activity animation
 */
export const useNetworkActivity = (isActive: boolean) => {
  const [activityLevel, setActivityLevel] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setActivityLevel(0);
      return;
    }

    const interval = setInterval(() => {
      setActivityLevel(Math.random() * 100);
    }, 500);

    return () => clearInterval(interval);
  }, [isActive]);

  return activityLevel;
};

/**
 * Hook for intersection observer based animations (scroll animations)
 * @param options - IntersectionObserver options
 */
export const useScrollAnimation = (options?: IntersectionObserverInit) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        // Optionally disconnect after first intersection
        // observer.disconnect();
      }
    }, options);

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [options]);

  return { ref: elementRef, isVisible };
};

/**
 * Hook for radar sweep animation
 * @param isScanning - Whether radar is actively scanning
 */
export const useRadarSweep = (isScanning: boolean) => {
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    if (!isScanning) {
      setAngle(0);
      return;
    }

    let animationFrame: number;
    let lastTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;

      setAngle(prev => (prev + (delta / 10)) % 360);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [isScanning]);

  return angle;
};

/**
 * Hook for typing animation effect
 * @param text - Text to animate
 * @param speed - Typing speed in milliseconds per character (default: 50)
 */
export const useTypingAnimation = (text: string, speed: number = 50) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayedText, isComplete };
};

/**
 * Hook for ripple effect on click
 */
export const useRippleEffect = () => {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const createRipple = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = Date.now();

    setRipples(prev => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== id));
    }, 600);
  }, []);

  return { ripples, createRipple };
};





