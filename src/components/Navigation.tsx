
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, BookOpen } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, Session } from '@supabase/supabase-js';
import { UserGuideMenu } from "@/components/ui/user-guide-menu";
import { MradiProLogo, UserAvatar } from "@/components/common/ProfilePicture";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const location = useLocation();
  const { toast } = useToast();


  useEffect(() => {
    // DON'T use cached role - always fetch fresh from database
    // This prevents stale role data from causing issues
    const cachedEmail = localStorage.getItem('user_email');
    if (cachedEmail) {
      // Only use cached email for display, NOT the role
      setUser({ email: cachedEmail } as any);
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Cache email for instant display on next page load
        if (session?.user?.email) {
          localStorage.setItem('user_email', session.user.email);
        }
        
        // Get user role when session changes
        if (session?.user) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .limit(1)
            .maybeSingle();
          const role = roleData?.role || null;
          setUserRole(role);
          if (role) {
            localStorage.setItem('user_role', role);
          }
        } else {
          setUserRole(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Cache email for instant display
      if (session?.user?.email) {
        localStorage.setItem('user_email', session.user.email);
      }
      
      // Get user role on initial load
      if (session?.user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .limit(1)
          .maybeSingle();
        const role = roleData?.role || null;
        setUserRole(role);
        if (role) {
          localStorage.setItem('user_role', role);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
    <header className="shadow-sm border-b sticky top-0 z-50 bg-gradient-primary relative overflow-visible">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between relative z-10 gap-4">
        <Link to="/home" className="flex items-center group flex-shrink-0">
          <div className="relative flex-shrink-0" style={{ width: '48px', height: '48px' }}>
            <img 
              src="/mradipro-logo.png" 
              alt="MradiPro" 
              width="48"
              height="48"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                objectFit: 'cover',
                display: 'block'
              }}
              className="shadow-lg"
              onError={(e) => {
                // Fallback to SVG if PNG fails
                const target = e.currentTarget;
                target.src = '/ujenzipro-logo-circular.svg';
                target.style.objectFit = 'contain';
              }}
            />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-4 flex-1 justify-center">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-xs font-medium transition-colors hover:text-construction-orange whitespace-nowrap ${
                isActive(item.path) ? "text-construction-orange font-bold" : "text-text-on-dark"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center space-x-3 flex-shrink-0">
          <UserGuideMenu 
            trigger={
              <Button variant="outline" size="sm" className="text-text-on-dark border-border hover:bg-background hover:text-foreground">
                <BookOpen className="h-4 w-4 mr-2" />
                Help
              </Button>
            }
          />
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-white text-sm font-medium">
                {user.email?.split('@')[0] || 'User'}
              </span>
              <button 
                type="button"
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 rounded-md cursor-pointer transition-colors"
                style={{ minWidth: '100px' }}
              >
                LOG OUT
              </button>
            </div>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="outline" size="sm" className="text-foreground bg-background/90 border-border hover:bg-background hover:text-foreground font-semibold shadow-lg">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="bg-construction-orange text-foreground hover:bg-construction-orange/90 font-semibold shadow-lg">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden text-text-on-dark bg-background/20 p-2 rounded-lg border border-white/30 backdrop-blur-sm hover:bg-background/30 transition-all duration-200 z-50"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

        {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="lg:hidden bg-background border-t shadow-lg z-50 absolute top-full left-0 right-0">
          <nav className="px-4 py-4 space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block text-sm font-medium transition-colors hover:text-primary ${
                  isActive(item.path) ? "text-primary" : "text-muted-foreground"
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
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="outline" className="w-full text-primary border-primary hover:bg-primary hover:text-primary-foreground">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      Get Started
                    </Button>
                  </Link>
                  <Link to="/admin-login">
                    <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50">
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
