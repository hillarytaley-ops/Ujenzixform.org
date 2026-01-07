import React from 'react';
import { useScrollAnimation, useCountUp } from '@/hooks/useScrollAnimation';

interface AnimatedCounterProps {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
  showPlaceholder?: boolean;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  end,
  suffix = '',
  prefix = '',
  duration = 2000,
  className = '',
  showPlaceholder = true
}) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.3 });
  const count = useCountUp(end, duration, isVisible);

  // Show the final value as placeholder before animation starts
  // This prevents "0+" from appearing and makes the page look complete on load
  const displayValue = !isVisible && showPlaceholder ? end : count;

  return (
    <span ref={ref} className={className}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
};

export default AnimatedCounter;


















