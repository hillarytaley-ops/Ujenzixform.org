import React from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  animation?: 'fadeInUp' | 'fadeInLeft' | 'fadeInRight' | 'fadeIn' | 'scaleIn';
  delay?: number;
}

const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  className = '',
  animation = 'fadeInUp',
  delay = 0
}) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const getAnimationClass = () => {
    const baseClass = 'transition-all duration-700 ease-out';
    
    if (!isVisible) {
      switch (animation) {
        case 'fadeInUp':
          return `${baseClass} opacity-0 translate-y-8`;
        case 'fadeInLeft':
          return `${baseClass} opacity-0 -translate-x-8`;
        case 'fadeInRight':
          return `${baseClass} opacity-0 translate-x-8`;
        case 'scaleIn':
          return `${baseClass} opacity-0 scale-95`;
        default:
          return `${baseClass} opacity-0`;
      }
    }
    
    return `${baseClass} opacity-100 translate-y-0 translate-x-0 scale-100`;
  };

  const style = delay > 0 ? { transitionDelay: `${delay}ms` } : {};

  return (
    <div 
      ref={ref} 
      className={`${getAnimationClass()} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

export default AnimatedSection;
















