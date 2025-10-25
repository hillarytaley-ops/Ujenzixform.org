import React, { useState, useEffect } from 'react';

interface OptimizedBackgroundProps {
  src: string;
  fallbackSrc?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

const OptimizedBackground: React.FC<OptimizedBackgroundProps> = ({
  src,
  fallbackSrc,
  className = '',
  style = {},
  children
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(fallbackSrc || '');
  const [error, setError] = useState(false);

  useEffect(() => {
    // Preload the main background image
    const img = new Image();
    img.onload = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
    };
    img.onerror = () => {
      setError(true);
      if (fallbackSrc) {
        setCurrentSrc(fallbackSrc);
        setIsLoaded(true);
      }
    };
    img.src = src;
  }, [src, fallbackSrc]);

  const backgroundStyle = {
    backgroundImage: currentSrc ? `url('${currentSrc}')` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    transition: 'opacity 0.5s ease-in-out',
    opacity: isLoaded ? 1 : 0,
    ...style
  };

  return (
    <div className={`relative ${className}`}>
      {/* Loading placeholder with gradient */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-gradient-to-br from-orange-400 via-yellow-500 to-green-600 animate-pulse"
          style={{ opacity: 0.8 }}
        />
      )}
      
      {/* Main background */}
      <div 
        className="absolute inset-0"
        style={backgroundStyle}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default OptimizedBackground;


















