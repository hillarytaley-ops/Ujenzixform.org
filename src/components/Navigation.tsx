import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, BookOpen } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, Session } from '@supabase/supabase-js';
import { UserGuideMenu } from "@/components/ui/user-guide-menu";
import { UjenziXformLogo, UserAvatar } from "@/components/common/ProfilePicture";
import { useAuth } from "@/contexts/AuthContext";

console.log('🧭 Navigation BUILD v3 - SHOW USER EMAIL Feb 21 2026');

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const location = useLocation();
  const { toast } = useToast();
  
  // Use AuthContext for user state - single source of truth
  const { user: authUser, userRole: authRole, loading: authLoading } = useAuth();
  
  // Also check localStorage for instant display (before auth loads)
  const cachedEmail = localStorage.getItem('user_email');
  const cachedRole = localStorage.getItem('user_role');
  const cachedUserId = localStorage.getItem('user_id') || localStorage.getItem('user_role_id');
  
  // Use auth context if available, otherwise fall back to localStorage
  // If user has a cached role, they are logged in
  const user = authUser || (cachedRole && cachedEmail ? { email: cachedEmail, id: cachedUserId } as any : null);
  const userRole = authRole || cachedRole;
  const isAuthLoading = authLoading && !cachedRole;
  
  console.log('🧭 Nav user:', user?.email, 'role:', userRole, 'loading:', isAuthLoading);

  // Public navigation items (visible to everyone)
  const publicNavItems = [
    { path: "/home", label: "Home" },
    { path: "/builders", label: "Builders" },
    { path: "/suppliers", label: "Suppliers" },
    { path: "/delivery", label: "Delivery" },
    { path: "/scanners", label: "Scanners" },
    { path: "/tracking", label: "Tracking" },
    { path: "/monitoring", label: "Monitoring" },
    { path: "/about", label: "About" },
    { path: "/contact", label: "Contact" },
    { path: "/careers", label: "Careers" },
    { path: "/feedback", label: "Feedback" },
  ];

  // Admin-only navigation items (only visible to admin)
  const adminNavItems = [
    { path: "/analytics", label: "ML Analytics" },
  ];

  // Combine nav items based on user role
  const navItems = userRole === 'admin' 
    ? [...publicNavItems, ...adminNavItems] 
    : publicNavItems;

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    // Set signing out state FIRST to prevent UI flash
    setIsSigningOut(true);
    
    // Redirect IMMEDIATELY before any async operations
    // This ensures user sees auth page instantly
    window.location.href = '/auth';
    
    // Then clear everything in background (page is already redirecting)
    localStorage.clear();
    sessionStorage.clear();
    await supabase.auth.signOut();
  };

  // Show full-screen signing out overlay to prevent any UI flash
  if (isSigningOut) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Signing out...</p>
        </div>
      </div>
    );
  }

  return (
    <header className="shadow-sm border-b sticky top-0 z-50 bg-gradient-primary relative">
      <div className="w-full px-4 py-3 flex items-center justify-between gap-2">
        {/* Logo - Fixed width */}
        <Link to="/home" className="flex items-center group flex-shrink-0">
          <div className="relative flex-shrink-0" style={{ width: '48px', height: '48px' }}>
            <img 
              src="/ujenzixform-logo.png" 
              alt="UjenziXform" 
              width="48"
              height="48"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                objectFit: 'cover',
                display: 'block'
              }}
              className="shadow-lg border-2 border-white"
              onError={(e) => {
                // Fallback to SVG if PNG fails
                const target = e.currentTarget;
                target.src = '/ujenzixform-logo-circular.svg';
                target.style.objectFit = 'contain';
              }}
            />
          </div>
        </Link>

        {/* Desktop Navigation - Scrollable if needed */}
        <nav className="hidden lg:flex items-center gap-3 xl:gap-5 flex-1 justify-center overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-xs xl:text-sm font-semibold transition-colors hover:text-construction-orange whitespace-nowrap py-2 px-1 ${
                isActive(item.path) ? "text-construction-orange font-bold border-b-2 border-construction-orange" : "text-text-on-dark"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right Section - User/Auth - Fixed width, never shrinks */}
        <div className="hidden lg:flex items-center gap-2 flex-shrink-0" style={{ minWidth: 'fit-content' }}>
          <UserGuideMenu 
            trigger={
              <Button variant="outline" size="sm" className="text-text-on-dark border-border hover:bg-background hover:text-foreground px-2">
                <BookOpen className="h-4 w-4" />
              </Button>
            }
          />
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-white text-xs font-medium hidden xl:inline">
                {user.email?.split('@')[0] || 'User'}
              </span>
              <Button 
                type="button"
                onClick={handleSignOut}
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-md shadow-lg whitespace-nowrap text-xs"
              >
                LOG OUT
              </Button>
            </div>
          ) : isAuthLoading ? (
            // Show loading placeholder while checking auth - prevents flash of Sign In buttons
            <div className="flex items-center gap-2">
              <div className="w-20 h-8 bg-white/20 rounded animate-pulse"></div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/auth">
                <Button variant="outline" size="sm" className="bg-white text-gray-900 border-2 border-white hover:bg-gray-100 hover:text-gray-900 font-bold shadow-lg text-xs px-4">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="bg-orange-500 text-white border-2 border-orange-400 hover:bg-orange-600 font-bold shadow-lg text-xs px-4">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden text-text-on-dark bg-background/20 p-2 rounded-lg border border-white/30 backdrop-blur-sm hover:bg-background/30 transition-all duration-200 z-50 flex-shrink-0"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

        {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="lg:hidden bg-background border-t shadow-lg z-50 absolute top-full left-0 right-0">
          <nav className="px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block text-base font-semibold py-3 px-3 rounded-lg transition-colors hover:bg-primary/10 hover:text-primary ${
                  isActive(item.path) ? "text-primary bg-primary/10" : "text-foreground"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-4 space-y-2">
              {user ? (
                <div className="space-y-4">
                  <p className="text-gray-700 text-center font-medium">
                    {user.email?.split('@')[0] || 'User'}
                  </p>
                  <button 
                    type="button"
                    onClick={handleSignOut}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-md cursor-pointer transition-colors"
                  >
                    LOG OUT
                  </button>
                </div>
              ) : isAuthLoading ? (
                <div className="space-y-4">
                  <div className="w-full h-10 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="outline" className="w-full bg-white text-gray-900 border-2 border-gray-300 hover:bg-gray-100 font-bold">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button className="w-full bg-orange-500 text-white border-2 border-orange-400 hover:bg-orange-600 font-bold">
                      Register
                    </Button>
                  </Link>
                  <Link to="/admin-login">
                    <Button variant="ghost" className="w-full text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 font-medium">
                      🔒 Staff Portal
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navigation;
