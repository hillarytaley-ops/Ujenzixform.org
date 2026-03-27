import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, BookOpen } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserGuideMenu } from "@/components/ui/user-guide-menu";
import { useAuth } from "@/contexts/AuthContext";

console.log('🧭 Navigation BUILD v4 - FIX EMAIL DISPLAY Feb 21 2026');

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRoleState, setUserRoleState] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const location = useLocation();
  const { toast } = useToast();
  
  // Use AuthContext for user state
  const { user: authUser, userRole: authRole, loading: authLoading } = useAuth();

  // Check for user on mount and when auth changes
  useEffect(() => {
    const checkUser = async () => {
      // First check AuthContext
      if (authUser?.email) {
        console.log('🧭 Got email from AuthContext:', authUser.email);
        setUserEmail(authUser.email);
        localStorage.setItem('user_email', authUser.email);
      }
      if (authRole) {
        setUserRoleState(authRole);
      }
      
      // Also check localStorage
      const cachedEmail = localStorage.getItem('user_email');
      const cachedRole = localStorage.getItem('user_role');
      const cachedDisplayName = localStorage.getItem('user_display_name');
      
      if (cachedEmail && !userEmail) {
        console.log('🧭 Got email from localStorage:', cachedEmail);
        setUserEmail(cachedEmail);
      }
      if (cachedRole && !userRoleState) {
        setUserRoleState(cachedRole);
      }
      if (cachedDisplayName && !userDisplayName) {
        setUserDisplayName(cachedDisplayName);
      }
      
      // If no email yet, try to get from Supabase session
      let userId: string | null = null;
      if (!authUser?.email && !cachedEmail) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          console.log('🧭 Got email from Supabase session:', session.user.email);
          setUserEmail(session.user.email);
          localStorage.setItem('user_email', session.user.email);
          localStorage.setItem('user_id', session.user.id);
          userId = session.user.id;
        }
      } else {
        userId = authUser?.id || localStorage.getItem('user_id');
      }
      
      // Fetch user profile to get display name
      if (userId && !userDisplayName && !cachedDisplayName) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, company_name')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (profile) {
            const displayName = profile.full_name || profile.company_name;
            if (displayName) {
              console.log('🧭 Got display name from profile:', displayName);
              setUserDisplayName(displayName);
              localStorage.setItem('user_display_name', displayName);
            }
          }
          
          // Also check suppliers table for supplier role
          if (!profile?.full_name && (authRole === 'supplier' || cachedRole === 'supplier')) {
            const { data: supplier } = await supabase
              .from('suppliers')
              .select('company_name, contact_person')
              .eq('user_id', userId)
              .single();
            
            if (supplier) {
              const supplierName = supplier.contact_person || supplier.company_name;
              if (supplierName) {
                console.log('🧭 Got display name from supplier:', supplierName);
                setUserDisplayName(supplierName);
                localStorage.setItem('user_display_name', supplierName);
              }
            }
          }
        } catch (err) {
          console.log('🧭 Could not fetch profile for display name');
        }
      }
    };
    
    checkUser();
  }, [authUser, authRole]);

  // Determine if user is logged in
  const isLoggedIn = !!(authUser || userEmail || userRoleState);
  const displayEmail = authUser?.email || userEmail;
  const displayRole = authRole || userRoleState;
  // Use profile name if available, otherwise fall back to email
  const displayName = userDisplayName || displayEmail;
  
  console.log('🧭 Nav state - name:', displayName, 'email:', displayEmail, 'role:', displayRole, 'loggedIn:', isLoggedIn);

  // Public navigation items (visible to everyone)
  // NOTE: Tracking is only accessible from within dashboards (for clients and suppliers)
  const publicNavItems = [
    { path: "/home", label: "Home" },
    { path: "/builders", label: "Builders" },
    { path: "/suppliers", label: "Suppliers" },
    { path: "/delivery", label: "Delivery" },
    { path: "/scanners", label: "Scanners" },
    { path: "/monitoring", label: "Monitoring" },
    { path: "/about", label: "About" },
    { path: "/contact", label: "Contact" },
    { path: "/careers", label: "Careers" },
    { path: "/feedback", label: "Feedback" },
  ];

  // Admin-only navigation items (only visible to admin)
  const adminNavItems = [
    { path: "/analytics", label: "Analytics" },
  ];

  // Combine nav items based on user role
  const navItems = displayRole === 'admin' 
    ? [...publicNavItems, ...adminNavItems] 
    : publicNavItems;

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    window.location.href = '/auth';
    localStorage.clear();
    sessionStorage.clear();
    await supabase.auth.signOut();
  };

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
        {/* Logo */}
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
                const target = e.currentTarget;
                target.src = '/ujenzixform-logo-circular.svg';
                target.style.objectFit = 'contain';
              }}
            />
          </div>
        </Link>

        {/* Desktop Navigation */}
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

        {/* Right Section - User/Auth */}
        <div className="hidden lg:flex items-center gap-2 flex-shrink-0" style={{ minWidth: 'fit-content' }}>
          <UserGuideMenu 
            trigger={
              <Button variant="outline" size="sm" className="text-text-on-dark border-border hover:bg-background hover:text-foreground px-2">
                <BookOpen className="h-4 w-4" />
              </Button>
            }
          />
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="text-white text-xs font-medium bg-white/20 px-3 py-1.5 rounded-md max-w-[200px] truncate">
                {displayName || 'User'}
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
          ) : authLoading ? (
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
              {isLoggedIn ? (
                <div className="space-y-4">
                  <p className="text-gray-700 text-center font-medium truncate px-2">
                    {displayName || 'User'}
                  </p>
                  <button 
                    type="button"
                    onClick={handleSignOut}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-md cursor-pointer transition-colors"
                  >
                    LOG OUT
                  </button>
                </div>
              ) : authLoading ? (
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
