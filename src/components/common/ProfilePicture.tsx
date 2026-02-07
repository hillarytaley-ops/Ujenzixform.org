import React from 'react';

interface ProfilePictureProps {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  defaultImage?: 'logo' | 'user';
}

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
  '2xl': 'w-32 h-32',
};

export const ProfilePicture: React.FC<ProfilePictureProps> = ({
  src,
  alt = 'Profile',
  size = 'md',
  className = '',
  defaultImage = 'user',
}) => {
  const [fallbackIndex, setFallbackIndex] = React.useState(0);

  // Logo fallbacks - try multiple formats
  const logoFallbacks = [
    '/ujenzixform-logo.png',
    '/ujenzixform-logo.jpg',
    '/ujenzixform-logo.jpeg',
    '/ujenzixform-logo.webp',
    '/ujenzixform-logo-circular.svg',
  ];

  // Default images
  const defaultImages = {
    logo: logoFallbacks[Math.min(fallbackIndex, logoFallbacks.length - 1)],
    user: '/placeholder.svg',
  };

  const handleError = () => {
    if (defaultImage === 'logo' && fallbackIndex < logoFallbacks.length - 1) {
      setFallbackIndex(prev => prev + 1);
    }
  };

  const imageSrc = src || defaultImages[defaultImage];

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <img
        src={imageSrc}
        alt={alt}
        className="w-full h-full rounded-full object-cover border-2 border-gray-200 shadow-sm"
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
};

// UjenziXform Logo Component (for company branding)
// Supports multiple image formats: PNG, JPG, JPEG, WEBP, SVG
export const UjenziXformLogo: React.FC<{
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showText?: boolean;
}> = ({ size = 'md', className = '', showText = false }) => {
  const [currentLogoIndex, setCurrentLogoIndex] = React.useState(0);
  
  // Try multiple formats in order of preference
  const logoFormats = [
    '/ujenzixform-logo.png',
    '/ujenzixform-logo.jpg',
    '/ujenzixform-logo.jpeg',
    '/ujenzixform-logo.webp',
    '/ujenzixform-logo.svg',
    '/ujenzixform-logo-circular.svg', // Final fallback - always works
  ];
  
  const handleImageError = () => {
    // Try next format if available
    if (currentLogoIndex < logoFormats.length - 1) {
      setCurrentLogoIndex(prev => prev + 1);
    }
  };
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`relative ${sizeClasses[size]}`}>
        <img
          src={logoFormats[currentLogoIndex]}
          alt="UjenziXform Logo"
          className="w-full h-full rounded-full object-cover border-2 border-gray-200 shadow-sm"
          onError={handleImageError}
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="font-bold text-[#0F2C59] text-lg">UJENZIXFORM</span>
          <span className="text-xs text-[#4A9FD8]">Building Kenya's Future</span>
        </div>
      )}
    </div>
  );
};

// User Avatar Component (for user profiles)
export const UserAvatar: React.FC<{
  user: {
    avatar_url?: string | null;
    full_name?: string | null;
    email?: string;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showName?: boolean;
}> = ({ user, size = 'md', className = '', showName = false }) => {
  // Generate initials from name or email
  const getInitials = () => {
    if (user.full_name) {
      return user.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'M';
  };

  const initials = getInitials();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {user.avatar_url ? (
        <ProfilePicture
          src={user.avatar_url}
          alt={user.full_name || 'User'}
          size={size}
          defaultImage="user"
        />
      ) : (
        // Fallback to initials
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-[#0F2C59] to-[#4A9FD8] flex items-center justify-center text-white font-bold shadow-sm border-2 border-gray-200`}
        >
          <span className={size === 'xs' ? 'text-xs' : size === 'sm' ? 'text-sm' : 'text-base'}>
            {initials}
          </span>
        </div>
      )}
      {showName && user.full_name && (
        <span className="font-medium text-gray-700">{user.full_name}</span>
      )}
    </div>
  );
};

export default ProfilePicture;

