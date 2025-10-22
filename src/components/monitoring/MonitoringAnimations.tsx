/**
 * UJENZIPRO MONITORING ANIMATION COMPONENTS
 * Reusable animated components for the monitoring dashboard
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Camera, Signal, Battery, AlertTriangle, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==========================================
// CAMERA FEED COMPONENTS
// ==========================================

interface LiveCameraIndicatorProps {
  isLive: boolean;
  isRecording?: boolean;
  className?: string;
}

export const LiveCameraIndicator: React.FC<LiveCameraIndicatorProps> = ({
  isLive,
  isRecording = false,
  className
}) => {
  return (
    <motion.div
      className={cn(
        'flex items-center gap-2 px-3 py-1 rounded-full',
        isLive ? 'bg-red-500 text-white' : 'bg-gray-500 text-white',
        className
      )}
      animate={isLive ? {
        boxShadow: [
          '0 0 0 0 rgba(239, 68, 68, 0.7)',
          '0 0 0 10px rgba(239, 68, 68, 0)',
        ]
      } : {}}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    >
      <motion.div
        className="w-2 h-2 bg-white rounded-full"
        animate={isRecording ? {
          scale: [1, 0.8, 1],
          opacity: [1, 0.3, 1]
        } : {}}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
      <span className="text-xs font-semibold">
        {isLive ? (isRecording ? 'REC' : 'LIVE') : 'OFFLINE'}
      </span>
    </motion.div>
  );
};

// ==========================================
// SIGNAL STRENGTH COMPONENT
// ==========================================

interface SignalStrengthProps {
  strength: number; // 0-100
  className?: string;
}

export const SignalStrength: React.FC<SignalStrengthProps> = ({ strength, className }) => {
  const bars = Math.ceil((strength / 100) * 4);
  
  return (
    <div className={cn('flex items-end gap-1', className)}>
      {[1, 2, 3, 4].map((bar) => (
        <motion.div
          key={bar}
          className={cn(
            'w-1.5 rounded-sm',
            bar <= bars ? 'bg-green-500' : 'bg-gray-300'
          )}
          style={{ height: `${bar * 4}px` }}
          initial={{ scaleY: 0 }}
          animate={{
            scaleY: bar <= bars ? [1, 0.6, 1] : 0.3
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: bar * 0.2,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
};

// ==========================================
// BATTERY LEVEL COMPONENT
// ==========================================

interface BatteryLevelProps {
  level: number; // 0-100
  isCharging?: boolean;
  className?: string;
}

export const BatteryLevel: React.FC<BatteryLevelProps> = ({
  level,
  isCharging = false,
  className
}) => {
  const isLow = level <= 20;
  const isCritical = level <= 10;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative w-8 h-4 border-2 border-current rounded-sm">
        <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-2 bg-current rounded-r-sm" />
        <motion.div
          className={cn(
            'h-full rounded-sm',
            isCritical ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-green-500'
          )}
          initial={{ width: '0%' }}
          animate={{
            width: `${level}%`,
            backgroundColor: isCritical
              ? ['rgba(239, 68, 68, 0.8)', 'rgba(251, 191, 36, 0.8)', 'rgba(239, 68, 68, 0.8)']
              : undefined
          }}
          transition={{
            width: { duration: 1, ease: 'easeOut' },
            backgroundColor: isCritical ? { duration: 1, repeat: Infinity } : {}
          }}
        />
      </div>
      <span className={cn(
        'text-xs font-medium',
        isCritical ? 'text-red-500' : isLow ? 'text-yellow-500' : ''
      )}>
        {level}%
      </span>
    </div>
  );
};

// ==========================================
// DRONE INDICATOR COMPONENT
// ==========================================

interface DroneIndicatorProps {
  isActive: boolean;
  className?: string;
}

export const DroneIndicator: React.FC<DroneIndicatorProps> = ({ isActive, className }) => {
  return (
    <motion.div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700',
        className
      )}
      animate={isActive ? {
        y: [0, -5, -8, -5, 0],
        x: [0, 3, 0, -3, 0]
      } : {}}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    >
      <motion.div
        animate={isActive ? { rotate: 360 } : {}}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear'
        }}
      >
        <Plane className="h-4 w-4" />
      </motion.div>
      <span className="text-xs font-semibold">DRONE</span>
    </motion.div>
  );
};

// ==========================================
// ALERT BADGE COMPONENT
// ==========================================

interface AlertBadgeProps {
  count: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  className?: string;
}

export const AlertBadge: React.FC<AlertBadgeProps> = ({
  count,
  severity = 'medium',
  className
}) => {
  const severityColors = {
    low: 'bg-blue-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500'
  };

  if (count === 0) return null;

  return (
    <motion.div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1 rounded-full text-white',
        severityColors[severity],
        className
      )}
      animate={{
        scale: severity === 'critical' ? [1, 1.05, 1] : 1,
        boxShadow: severity === 'critical'
          ? [
              '0 0 0 0 rgba(239, 68, 68, 0.7)',
              '0 0 0 10px rgba(239, 68, 68, 0)',
            ]
          : '0 0 0 0 rgba(0, 0, 0, 0)'
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    >
      <AlertTriangle className="h-4 w-4" />
      <span className="text-sm font-bold">{count}</span>
    </motion.div>
  );
};

// ==========================================
// ANIMATED COUNTER COMPONENT
// ==========================================

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 2000,
  className
}) => {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    const startTime = Date.now();
    let animationFrame: number;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setDisplayValue(Math.floor(value * easeOut));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {displayValue}
    </motion.span>
  );
};

// ==========================================
// PROGRESS RING COMPONENT
// ==========================================

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  color = '#3b82f6',
  className
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold">{Math.round(progress)}%</span>
      </div>
    </div>
  );
};

// ==========================================
// LOADING SPINNER COMPONENT
// ==========================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <motion.div
      className={cn(
        'border-2 border-gray-300 border-t-blue-500 rounded-full',
        sizeClasses[size],
        className
      )}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear'
      }}
    />
  );
};

// ==========================================
// VIDEO FEED PLACEHOLDER COMPONENT
// ==========================================

interface VideoFeedPlaceholderProps {
  isLoading?: boolean;
  isDrone?: boolean;
  className?: string;
}

export const VideoFeedPlaceholder: React.FC<VideoFeedPlaceholderProps> = ({
  isLoading = false,
  isDrone = false,
  className
}) => {
  return (
    <div className={cn('relative w-full aspect-video bg-black rounded-lg overflow-hidden', className)}>
      {isLoading ? (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900"
          animate={{
            backgroundPosition: ['0% center', '200% center']
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear'
          }}
          style={{ backgroundSize: '200% 100%' }}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {isDrone ? (
              <motion.div
                animate={{
                  y: [0, -10, 0],
                  x: [0, 5, 0, -5, 0]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              >
                <Plane className="h-16 w-16 mb-4 text-purple-400" />
              </motion.div>
            ) : (
              <Camera className="h-16 w-16 mb-4 opacity-50" />
            )}
          </motion.div>
          <p className="text-lg">
            {isDrone ? 'Drone Aerial Feed' : 'Camera Feed'}
          </p>
          <p className="text-sm opacity-75 mt-2">
            {isLoading ? 'Loading...' : 'No Signal'}
          </p>
        </div>
      )}
    </div>
  );
};

// ==========================================
// NOTIFICATION TOAST COMPONENT
// ==========================================

interface NotificationToastProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onClose: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  message,
  type = 'info',
  onClose
}) => {
  const typeStyles = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  };

  React.useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className={cn(
        'px-4 py-3 rounded-lg shadow-lg text-white',
        typeStyles[type]
      )}
    >
      {message}
    </motion.div>
  );
};

// ==========================================
// STATS CARD COMPONENT
// ==========================================

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  delay?: number;
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  trend = 'neutral',
  delay = 0,
  className
}) => {
  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-gray-500'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.6,
        delay,
        ease: 'easeOut'
      }}
      whileHover={{
        y: -5,
        scale: 1.02,
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
      }}
      className={cn(
        'p-6 bg-white rounded-lg border shadow-sm cursor-pointer',
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <div className={trendColors[trend]}>{icon}</div>
      </div>
      <div className="text-3xl font-bold">
        {typeof value === 'number' ? (
          <AnimatedCounter value={value} />
        ) : (
          value
        )}
      </div>
    </motion.div>
  );
};

// ==========================================
// LOCATION MARKER COMPONENT
// ==========================================

interface LocationMarkerProps {
  isActive: boolean;
  className?: string;
}

export const LocationMarker: React.FC<LocationMarkerProps> = ({ isActive, className }) => {
  return (
    <motion.div
      className={cn('relative', className)}
      animate={isActive ? {
        y: [0, -10, 0]
      } : {}}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    >
      <div className="relative">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <div className="w-3 h-3 bg-white rounded-full" />
        </div>
        {isActive && (
          <>
            <motion.div
              className="absolute inset-0 bg-blue-500 rounded-full"
              animate={{
                scale: [1, 2, 2],
                opacity: [0.7, 0, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut'
              }}
            />
            <motion.div
              className="absolute inset-0 bg-blue-500 rounded-full"
              animate={{
                scale: [1, 3, 3],
                opacity: [0.5, 0, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 0.5,
                ease: 'easeOut'
              }}
            />
          </>
        )}
      </div>
    </motion.div>
  );
};




