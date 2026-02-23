/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   📱 FLOATING SOCIAL BUTTON - PROTECTED COMPONENT                                    ║
 * ║                                                                                      ║
 * ║   ⚠️⚠️⚠️  DO NOT MODIFY WITHOUT AUTHORIZATION  ⚠️⚠️⚠️                                ║
 * ║                                                                                      ║
 * ║   LAST VERIFIED: December 28, 2025                                                   ║
 * ║   AUTHORIZED BY: Project Owner                                                       ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ║   PURPOSE:                                                                           ║
 * ║   - Single floating button that expands to show all social media links              ║
 * ║   - Works consistently across all screen sizes                                       ║
 * ║   - HIDDEN on authentication pages (auth, signin pages)                             ║
 * ║   - Links to official UjenziXform social media accounts                                ║
 * ║                                                                                      ║
 * ║   CRITICAL BEHAVIOR:                                                                 ║
 * ║   - Must NOT appear on /auth, /admin-auth, /builder-signin, etc.                    ║
 * ║   - Must appear on all other public pages                                           ║
 * ║                                                                                      ║
 * ║   🚫 UNAUTHORIZED CHANGES WILL BE REVERTED                                           ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Share2, X } from 'lucide-react';
import {
  FacebookIcon,
  TwitterIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  WhatsAppIcon,
  YouTubeIcon,
  EmailIcon,
  PhoneIcon
} from './SocialMediaIcons';

/**
 * ⚠️ PROTECTED: Pages where the floating social button should NOT appear
 * Do not remove any pages from this list without authorization
 */
const HIDDEN_ON_PAGES = [
  '/',
  '/auth',
  '/admin-auth',
  '/admin-login',
  '/builder-signin',
  '/supplier-signin',
  '/delivery-signin',
  '/reset-password',
];

// Social links configuration
const SOCIAL_LINKS = [
  { name: 'WhatsApp', href: 'https://wa.me/254712345678', icon: WhatsAppIcon, bg: 'bg-[#25D366]', hoverBg: 'hover:bg-[#20BD5A]' },
  { name: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61588491484665', icon: FacebookIcon, bg: 'bg-[#1877F2]', hoverBg: 'hover:bg-[#166FE5]' },
  { name: 'X', href: 'https://x.com/UjenziXform', icon: TwitterIcon, bg: 'bg-black', hoverBg: 'hover:bg-gray-800' },
  { name: 'Instagram', href: 'https://instagram.com/mradipro', icon: InstagramIcon, bg: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400', hoverBg: '' },
  { name: 'TikTok', href: 'https://tiktok.com/@mradipro', icon: TikTokIcon, bg: 'bg-black', hoverBg: 'hover:bg-gray-800' },
  { name: 'LinkedIn', href: 'https://www.linkedin.com/company/ujenzixform/?viewAsMember=true', icon: LinkedInIcon, bg: 'bg-[#0A66C2]', hoverBg: 'hover:bg-[#0958A8]' },
  { name: 'YouTube', href: 'https://www.youtube.com/@ujenziXform', icon: YouTubeIcon, bg: 'bg-[#FF0000]', hoverBg: 'hover:bg-[#E60000]' },
];

export const FloatingSocialSidebar: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Hide on auth-related pages
  const shouldHide = HIDDEN_ON_PAGES.some(page => 
    location.pathname === page || location.pathname.startsWith(page + '/')
  );
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  
  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);
  
  if (shouldHide) {
    return null;
  }

  return (
    <>
      {/* Desktop: Fixed LEFT sidebar */}
      <div ref={containerRef} className="hidden sm:block fixed left-6 bottom-6 z-[9998]" style={{ position: 'fixed', zIndex: 9998 }}>
        {/* Backdrop overlay when open */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] -z-10"
            onClick={() => setIsOpen(false)}
          />
        )}
        
        {/* Expanded social links - vertical stack */}
        <div className={`absolute bottom-16 left-0 flex flex-col gap-2 transition-all duration-300 ease-out ${
          isOpen 
            ? 'opacity-100 translate-y-0 pointer-events-auto' 
            : 'opacity-0 translate-y-8 pointer-events-none'
        }`}>
          {SOCIAL_LINKS.map((link, index) => {
            const IconComponent = link.icon;
            return (
              <a
                key={link.name}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className={`group relative flex items-center justify-center w-11 h-11 ${link.bg} ${link.hoverBg} rounded-full shadow-lg hover:scale-110 transition-all duration-200`}
                style={{ 
                  transitionDelay: isOpen ? `${index * 40}ms` : '0ms',
                  transform: isOpen ? 'scale(1)' : 'scale(0.5)',
                }}
                title={link.name}
              >
                <IconComponent size={20} className="text-white" />
                {/* Tooltip - positioned to the right */}
                <span className="absolute left-full ml-3 bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
                  {link.name}
                </span>
              </a>
            );
          })}
        </div>
        
        {/* Main toggle button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 ${
            isOpen 
              ? 'bg-gray-800 rotate-180' 
              : 'bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700'
          }`}
          aria-label={isOpen ? 'Close social links' : 'Open social links'}
        >
          {isOpen ? (
            <X size={24} className="text-white" />
          ) : (
            <Share2 size={24} className="text-white" />
          )}
          
          {/* Pulse animation when closed */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-30" />
          )}
          
          {/* Badge indicator */}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white shadow">
              7
            </span>
          )}
        </button>
        
        {/* Label text when closed */}
        {!isOpen && (
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
            Connect with us
          </div>
        )}
      </div>

      {/* Mobile: Fixed RIGHT side - ABOVE chatbot (75 + 56 + 8 = 139) */}
      <div className="sm:hidden fixed z-[9998]" style={{ bottom: '139px', right: '16px' }}>
        {/* Backdrop overlay when open */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black/10 -z-10"
            onClick={() => setIsOpen(false)}
          />
        )}
        
        {/* Expanded social links - vertical stack going UP */}
        <div className={`absolute left-0 flex flex-col gap-2 transition-all duration-300 ease-out ${
          isOpen 
            ? 'opacity-100 translate-y-0 pointer-events-auto' 
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{ bottom: '64px' }}
        >
          {SOCIAL_LINKS.map((link, index) => {
            const IconComponent = link.icon;
            return (
              <a
                key={link.name}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className={`flex items-center justify-center ${link.bg} ${link.hoverBg} rounded-full shadow-lg transition-all duration-200`}
                style={{ 
                  width: '44px',
                  height: '44px',
                  transitionDelay: isOpen ? `${index * 30}ms` : '0ms',
                  transform: isOpen ? 'scale(1)' : 'scale(0.5)',
                }}
                title={link.name}
              >
                <IconComponent size={20} className="text-white" />
              </a>
            );
          })}
        </div>
        
        {/* Main toggle button - EXACTLY 56px like chatbot */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative flex items-center justify-center rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ${
            isOpen 
              ? 'bg-gray-800' 
              : 'bg-gradient-to-br from-orange-500 to-red-600'
          }`}
          style={{ width: '56px', height: '56px' }}
          aria-label={isOpen ? 'Close social links' : 'Open social links'}
        >
          {isOpen ? (
            <X size={24} className="text-white" />
          ) : (
            <Share2 size={24} className="text-white" />
          )}
          
          {/* Pulse animation when closed */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-30" />
          )}
          
          {/* Badge indicator */}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-white shadow">
              7
            </span>
          )}
        </button>
      </div>
    </>
  );
};

export default FloatingSocialSidebar;







