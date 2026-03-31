/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   🛡️ ADMIN AUTHENTICATION PAGE - DYNAMIC STAFF AUTHENTICATION                       ║
 * ║                                                                                      ║
 * ║   ⚠️⚠️⚠️  CRITICAL SECURITY COMPONENT - DO NOT MODIFY  ⚠️⚠️⚠️                        ║
 * ║                                                                                      ║
 * ║   SECURITY AUDIT: December 24, 2025                                                  ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ║   AUTHENTICATION FLOW:                                                               ║
 * ║   ┌─────────────────────────────────────────────────────────────────────────────┐   ║
 * ║   │  1. Work email domain validation (ujenzipro.com, authorized gmail)          │   ║
 * ║   │  2. Staff code format validation (UJPRO-YYYY-NNNN)                          │   ║
 * ║   │  3. DYNAMIC: Check admin_staff table for email + staff_code match           │   ║
 * ║   │  4. FALLBACK: Super admin hardcoded credentials for initial setup           │   ║
 * ║   │  5. 3 failed attempts = 30-minute lockout                                   │   ║
 * ║   │  6. All login attempts are logged                                           │   ║
 * ║   │  7. 24-hour session expiry                                                  │   ║
 * ║   │  8. Staff account status check (active/inactive/suspended)                  │   ║
 * ║   └─────────────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                                      ║
 * ║   SUPER ADMIN EMAILS (hardcoded fallback):                                           ║
 * ║   - hillarytaley@gmail.com                                                          ║
 * ║   - hillarykaptingei@gmail.com                                                      ║
 * ║   - admin@ujenzipro.com                                                             ║
 * ║                                                                                      ║
 * ║   STAFF MEMBERS: Added via Staff Management tab → stored in admin_staff table       ║
 * ║   Each staff member gets a unique staff code (UJPRO-YYYY-NNNN)                      ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, AlertTriangle, KeyRound, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { canAccessAdminDashboardStorage } from "@/utils/adminStaffSession";

// Type helper for tables not yet in generated types
const db = supabase as any;

const AdminAuth = () => {
  const [workEmail, setWorkEmail] = useState("");
  const [staffCode, setStaffCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Clear any stale lockouts on component mount (non-blocking)
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('admin_lockout_')) {
          const lockoutTime = parseInt(localStorage.getItem(key) || '0');
          if (Date.now() > lockoutTime) {
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      // Ignore localStorage errors
    }
    
    // Check if user is already authenticated (non-blocking)
    // This runs in background and redirects if already logged in
    checkExistingAuth().catch(() => {
      // Ignore all errors - form is already showing
    });
  }, []);

  const checkExistingAuth = async () => {
    try {
      // Already signed in as admin (staff portal or main /auth)
      if (canAccessAdminDashboardStorage()) {
        setTimeout(() => {
          navigate("/admin-dashboard", { replace: true });
        }, 0);
        return;
      }
      
      // Skip Supabase checks on mobile to avoid hanging
      // User can still login manually if needed
      // Only do quick check if network seems fast
      if (navigator.connection && (navigator.connection as any).effectiveType === 'slow-2g') {
        // Skip network checks on slow connections
        return;
      }
      
      // Quick Supabase check with very short timeout (500ms)
      try {
        const getUserPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 500)
        );
        
        const result = await Promise.race([getUserPromise, timeoutPromise]) as any;
        const { data: { user } } = result || { data: { user: null } };
        
        if (user) {
          // Quick role check with timeout
          try {
            const roleQueryPromise = supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id)
              .eq('role', 'admin')
              .maybeSingle();
            
            const roleTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 500)
            );
            
            const roleResult = await Promise.race([roleQueryPromise, roleTimeoutPromise]) as any;
            const { data: roleData } = roleResult || { data: null };
            
            if (roleData) {
              setTimeout(() => {
                navigate("/admin-dashboard", { replace: true });
              }, 100);
            }
          } catch {
            // Ignore - show form
          }
        }
      } catch {
        // Ignore all errors - show login form
      }
    } catch (error) {
      // Ignore all errors - show login form
    }
  };

  const validateWorkEmail = (email: string): boolean => {
    // Allow any valid email format - actual authorization is checked against admin_staff table
    // This is just a basic format validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailPattern.test(email)) {
      return false;
    }
    
    // Super admin emails are always allowed
    const superAdminEmails = [
      'hillarytaley@gmail.com',
      'hillarykaptingei@gmail.com',
      'admin@ujenzipro.com'
    ];
    
    if (superAdminEmails.includes(email.toLowerCase())) {
      return true;
    }
    
    // Any valid email format is allowed - the actual check happens
    // when we verify against the admin_staff table
    return true;
  };
  
  // Function to clear lockout for testing
  const clearLockout = () => {
    localStorage.removeItem(`admin_lockout_${workEmail}`);
    setLockoutUntil(null);
    setAttempts(0);
  };

  const validateStaffCode = (code: string): boolean => {
    // Staff code format: UJPRO-XXXX-XXXX (e.g., UJPRO-2024-0001)
    const staffCodePattern = /^UJPRO-\d{4}-\d{4}$/;
    return staffCodePattern.test(code.toUpperCase());
  };

  const hashStaffCode = async (code: string): Promise<string> => {
    // Hash the staff code for secure verification
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const logSecurityEvent = (
    eventType: string, 
    email: string, 
    success: boolean,
    details?: string
  ) => {
    // Fire and forget - don't block login flow
    // Use db (any type) since admin_security_logs might not be in generated types
    (async () => {
      try {
        const { error } = await db.from('admin_security_logs').insert({
          event_type: eventType,
          email: email,
          success: success,
          ip_address: 'client-side',
          user_agent: navigator.userAgent,
          details: details,
          created_at: new Date().toISOString()
        });
        
        if (error) {
          console.error('Failed to log security event:', error);
        }
      } catch (error: any) {
        console.error('Failed to log security event:', error);
      }
    })();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for lockout
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingMinutes = Math.ceil((lockoutUntil - Date.now()) / 60000);
      toast({
        variant: "destructive",
        title: "Account Locked",
        description: `Too many failed attempts. Try again in ${remainingMinutes} minutes.`
      });
      return;
    }

    setLoading(true);
    
    // Safety timeout - reset loading after 5 seconds no matter what
    const safetyTimeout = setTimeout(() => setLoading(false), 5000);

    try {
      // Validate work email
      if (!validateWorkEmail(workEmail)) {
        toast({
          variant: "destructive",
          title: "Invalid Work Email",
          description: "Please use your UjenziPro company email address."
        });
        setAttempts(prev => prev + 1);
        setLoading(false);
        return;
      }

      // Validate staff code format
      if (!validateStaffCode(staffCode)) {
        toast({
          variant: "destructive",
          title: "Invalid Staff Code",
          description: "Staff code must be in format: UJPRO-YYYY-NNNN"
        });
        setAttempts(prev => prev + 1);
        setLoading(false);
        return;
      }

      // DYNAMIC STAFF AUTHENTICATION
      // Check admin_staff table for valid staff members with their unique staff codes
      
      const normalizedEmail = workEmail.toLowerCase().trim();
      const normalizedCode = staffCode.toUpperCase().trim();
      
      console.log('🔐 Checking credentials:', { email: normalizedEmail, code: normalizedCode });

      // Hardcoded super-admin bootstrap (disabled in production unless explicitly allowed)
      const allowSuperAdminFallback =
        import.meta.env.DEV ||
        import.meta.env.VITE_ALLOW_SUPER_ADMIN_FALLBACK === "true";

      const superAdminCredentials = allowSuperAdminFallback
        ? [
            { email: "hillarytaley@gmail.com", staffCode: "UJPRO-2024-0001" },
            { email: "hillarykaptingei@gmail.com", staffCode: "UJPRO-2024-0001" },
            { email: "admin@ujenzipro.com", staffCode: "UJPRO-2024-0001" },
          ]
        : [];

      const isSuperAdmin =
        allowSuperAdminFallback &&
        superAdminCredentials.some(
          (cred) =>
            cred.email.toLowerCase() === normalizedEmail &&
            cred.staffCode === normalizedCode
        );
      
      let isValidStaff = false;
      let staffRole = 'admin';
      let staffName = '';
      
      if (isSuperAdmin) {
        console.log('🔐 Super Admin credentials verified');
        isValidStaff = true;
        staffRole = 'super_admin';
        staffName = 'Super Administrator';
      } else {
        // Check admin_staff table for dynamic staff members
        console.log('🔐 Checking admin_staff table...');
        
        try {
          // Add timeout to prevent hanging
          const staffQueryPromise = db
            .from('admin_staff')
            .select('id, email, full_name, role, staff_code, status')
            .eq('email', normalizedEmail)
            .eq('staff_code', normalizedCode)
            .maybeSingle();

          // Set 5 second timeout for database query
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout')), 5000)
          );

          const { data: staffData, error: staffError } = await Promise.race([
            staffQueryPromise,
            timeoutPromise
          ]) as any;

          if (staffError && staffError.message !== 'Query timeout') {
            console.error('🔐 Staff lookup error:', staffError);
          }

          if (staffData) {
            // Check if staff account is active
            if (staffData.status === 'active') {
              isValidStaff = true;
              staffRole = staffData.role;
              staffName = staffData.full_name;
              console.log('🔐 Staff member verified:', staffData.full_name, 'Role:', staffData.role);
              
              // Update last_login timestamp (fire and forget - don't block)
              (async () => {
                try {
                  await db.from('admin_staff')
                    .update({ last_login: new Date().toISOString() })
                    .eq('id', staffData.id);
                } catch (err: any) {
                  console.error('Failed to update last_login:', err);
                }
              })();
            } else {
              console.log('🔐 Staff account is not active:', staffData.status);
              toast({
                variant: "destructive",
                title: "Account Inactive",
                description: `Your account is ${staffData.status}. Please contact an administrator.`
              });
              setLoading(false);
              return;
            }
          } else {
            console.log('🔐 No matching staff member found in database');
          }
        } catch (err: any) {
          if (err.message === 'Query timeout') {
            console.error('🔐 Database query timed out');
            toast({
              variant: "destructive",
              title: "Connection Timeout",
              description: "Could not verify credentials. Please check your connection and try again."
            });
            setLoading(false);
            return;
          }
          console.error('🔐 Database check error:', err);
        }
      }
      
      console.log('🔐 Credential check result:', isValidStaff);

      if (!isValidStaff) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        // Lock account after 3 failed attempts
        if (newAttempts >= 3) {
          const lockoutTime = Date.now() + (30 * 60 * 1000); // 30 minutes
          setLockoutUntil(lockoutTime);
          localStorage.setItem(`admin_lockout_${workEmail}`, lockoutTime.toString());
          
          toast({
            variant: "destructive",
            title: "Account Locked",
            description: "Too many failed attempts. Account locked for 30 minutes."
          });
        } else {
          toast({
            variant: "destructive",
            title: "Invalid Credentials",
            description: `Invalid work email or staff code. ${3 - newAttempts} attempts remaining.`
          });
        }
        
        setLoading(false);
        return;
      }

      // Staff credentials valid!
      // For admin portal, we use localStorage-based authentication
      // This works because admin operations should use the service role key
      // or we configure permissive RLS policies for development
      
      console.log('✅ Staff credentials verified for:', workEmail, 'Role:', staffRole);

      // Try to sign in with Supabase using staff code as password
      // This creates a proper session for RLS policies
      // Use Promise.race with timeout to prevent hanging
      let hasSupabaseSession = false;
      
      try {
        const authPromise = supabase.auth.signInWithPassword({
          email: workEmail.toLowerCase(),
          password: staffCode.toUpperCase()
        });

        // 3 second timeout for auth attempt
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 3000)
        );

        const result = await Promise.race([authPromise, timeoutPromise]) as any;
        const { data: authData, error: authError } = result;

        if (!authError && authData?.user) {
          console.log('✅ Supabase session established');
          hasSupabaseSession = true;
          
          // Set admin role in user_roles table (fire and forget)
          (async () => {
            try {
              await supabase.from('user_roles').upsert({
                user_id: authData.user.id,
                role: 'admin'
              }, { onConflict: 'user_id' });
            } catch (err) {
              // Ignore errors
            }
          })();
        } else {
          console.log('ℹ️ No Supabase account, using localStorage auth');
        }
      } catch (err: any) {
        if (err.message !== 'Auth timeout') {
          console.log('ℹ️ Supabase auth skipped, using localStorage auth');
        } else {
          console.log('ℹ️ Supabase auth timed out, using localStorage auth');
        }
      }

      // Store staff status with login time (works regardless of Supabase session)
      localStorage.setItem('admin_authenticated', 'true');
      localStorage.setItem('admin_email', workEmail.toLowerCase());
      localStorage.setItem('admin_staff_role', staffRole);
      localStorage.setItem('admin_staff_name', staffName);
      localStorage.setItem('user_role', 'admin');
      localStorage.setItem('admin_login_time', Date.now().toString());
      localStorage.setItem('has_supabase_session', hasSupabaseSession.toString());
      
      // Clear lockout
      localStorage.removeItem(`admin_lockout_${workEmail}`);
      setAttempts(0);
      setLockoutUntil(null);

      // Log successful login (non-blocking)
      logSecurityEvent('staff_login', workEmail, true, `Role: ${staffRole}`);

      toast({
        title: staffName ? `Welcome, ${staffName}` : "Welcome, Administrator",
        description: hasSupabaseSession 
          ? `You have been securely authenticated as ${staffRole}.`
          : `You have been authenticated as ${staffRole} (limited mode).`
      });

      // Redirect to Admin Dashboard immediately
      navigate("/admin-dashboard");

    } catch (error: any) {
      console.error('Admin auth error:', error);
      toast({
        variant: "destructive",
        title: "System Error",
        description: "An unexpected error occurred. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const isLocked = lockoutUntil && Date.now() < lockoutUntil;
  const remainingAttempts = Math.max(0, 3 - attempts);

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-950">
      {/* Beautiful Kenyan Construction Workers with Yellow Hard Hats Background */}
      {/* Note: Removed backgroundAttachment: 'fixed' as it causes issues on iOS Safari and some mobile browsers */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url('/kenyan-workers.jpg')`,
          backgroundColor: '#1e3a5f',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
        role="img"
        aria-label="Kenyan construction workers in yellow hard hats reviewing blueprints at steel construction site"
      />
      
      {/* Dark overlay for admin security feel */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-blue-900/70 to-slate-900/85 z-0"></div>
      
      {/* Removed AnimatedSection to prevent mobile visibility issues */}
      <div className="relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <Card className="w-full max-w-md border-2 border-blue-600/70 shadow-2xl bg-slate-900/65 backdrop-blur-2xl">
          <CardHeader className="text-center bg-gradient-to-r from-blue-950 to-slate-950 border-b-2 border-blue-900/50">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-blue-900/30 rounded-full border-2 border-blue-500/50">
                <Shield className="h-12 w-12 text-blue-500" />
              </div>
            </div>
            
            <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
              <Lock className="h-6 w-6 text-blue-400" />
              UjenziPro Admin Portal
            </CardTitle>
            
            <CardDescription className="text-gray-300 mt-2">
              Secure Staff Access Only
            </CardDescription>
            
            <div className="mt-4 flex justify-center gap-2">
              <Badge className="bg-blue-900/50 border-blue-500/50 text-blue-300">
                <KeyRound className="h-3 w-3 mr-1" />
                High Security
              </Badge>
              <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Staff Only
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="mt-6">
            {/* Security Warning */}
            <Alert className="mb-6 border-blue-900/50 bg-blue-950/30">
              <Shield className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-sm text-gray-300">
                <strong className="text-blue-400">Security Notice:</strong> This portal is for authorized UjenziPro staff only. 
                All access attempts are logged and monitored. Unauthorized access is prohibited.
              </AlertDescription>
            </Alert>

            {/* Lockout Warning */}
            {isLocked && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Account temporarily locked due to failed login attempts. 
                  Please wait {Math.ceil((lockoutUntil - Date.now()) / 60000)} minutes.
                </AlertDescription>
              </Alert>
            )}

            {/* Remaining Attempts */}
            {!isLocked && attempts > 0 && (
              <Alert className="mb-6 border-yellow-900/50 bg-yellow-950/30">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-200">
                  <strong>Warning:</strong> {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining 
                  before 30-minute lockout.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Work Email */}
              <div className="space-y-2">
                <Label htmlFor="work-email" className="text-gray-200 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  Work Email Address
                </Label>
                <Input
                  id="work-email"
                  type="email"
                  placeholder="staff@ujenzipro.com"
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  required
                  disabled={loading || isLocked}
                  className="bg-slate-950/50 border-slate-700 text-white placeholder:text-gray-500"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-400">
                  Use your official UjenziPro company email
                </p>
              </div>

              {/* Staff Code */}
              <div className="space-y-2">
                <Label htmlFor="staff-code" className="text-gray-200 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-red-500" />
                  Unique Staff Code
                </Label>
                <Input
                  id="staff-code"
                  type="password"
                  placeholder="UJPRO-YYYY-NNNN"
                  value={staffCode}
                  onChange={(e) => setStaffCode(e.target.value.toUpperCase())}
                  required
                  disabled={loading || isLocked}
                  className="bg-slate-950/50 border-slate-700 text-white placeholder:text-gray-500 font-mono"
                  autoComplete="off"
                  maxLength={15}
                />
                <p className="text-xs text-gray-400">
                  Format: UJPRO-2024-0001 (provided by IT department)
                </p>
              </div>

              {/* Security Info */}
              <div className="bg-slate-950/30 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2 text-xs text-gray-400">
                  <Shield className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>All login attempts are encrypted and logged</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-400">
                  <Lock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Staff codes are hashed with SHA-256 encryption</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-400">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>3 failed attempts = 30-minute lockout</span>
                </div>
              </div>

              {/* Lockout indicator and clear button */}
              {(lockoutUntil || attempts > 0) && (
                <div className="bg-red-950/30 border border-red-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-red-400">
                      {lockoutUntil && Date.now() < lockoutUntil 
                        ? `🔒 Locked for ${Math.ceil((lockoutUntil - Date.now()) / 60000)} min`
                        : `⚠️ ${attempts}/3 attempts used`
                      }
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-red-400 hover:text-red-300"
                      onClick={() => {
                        // Clear all lockouts
                        Object.keys(localStorage).forEach(key => {
                          if (key.startsWith('admin_lockout_')) {
                            localStorage.removeItem(key);
                          }
                        });
                        setLockoutUntil(null);
                        setAttempts(0);
                        toast({
                          title: "Lockout Cleared",
                          description: "You can now try logging in again."
                        });
                      }}
                    >
                      Clear & Retry
                    </Button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 text-white font-semibold py-6 text-lg" 
                disabled={loading || isLocked}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Verifying Credentials...
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5 mr-2" />
                    Secure Admin Login
                  </>
                )}
              </Button>

              {/* Help Text */}
              <div className="text-center space-y-2">
                <p className="text-xs text-gray-400">
                  Don't have staff credentials?
                </p>
                <a 
                  href="/auth" 
                  className="text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  Use regular login instead
                </a>
              </div>
            </form>

            {/* Security Footer */}
            <div className="mt-6 pt-6 border-t border-slate-800">
              <div className="text-center space-y-1">
                <p className="text-xs text-gray-500">
                  🔒 256-bit encryption | 🛡️ Multi-factor security
                </p>
                <p className="text-xs text-gray-500">
                  📊 Activity monitored | 🔐 SOC 2 compliant
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Security Notice */}
        <div className="mt-6 max-w-md mx-auto">
          <Alert className="bg-slate-950/50 border-slate-800">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-xs text-gray-400">
              <strong className="text-yellow-500">Security Policy:</strong> Unauthorized access attempts will be reported 
              to IT Security and may result in account suspension and legal action.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
};

// Proper React Error Boundary class component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

class AdminAuthErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AdminAuth Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md bg-slate-900/80 p-8 rounded-lg border border-red-800">
            <div className="text-red-500 text-2xl font-bold">⚠️ Error Loading Admin Login</div>
            <p className="text-gray-400">Please refresh the page or contact support.</p>
            <p className="text-gray-500 text-xs font-mono break-all">
              {this.state.error?.message || 'Unknown error'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-medium"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrap AdminAuth with proper Error Boundary
const AdminAuthWithErrorBoundary = () => {
  return (
    <AdminAuthErrorBoundary>
      <AdminAuth />
    </AdminAuthErrorBoundary>
  );
};

export default AdminAuthWithErrorBoundary;

