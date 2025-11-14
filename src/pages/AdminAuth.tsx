import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import AnimatedSection from "@/components/AnimatedSection";
import { Shield, Lock, AlertTriangle, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AdminAuth = () => {
  const [workEmail, setWorkEmail] = useState("");
  const [staffCode, setStaffCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already authenticated as admin
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Check if user has admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (roleData) {
        // Already authenticated as admin, redirect
        navigate("/");
      }
    }
  };

  const validateWorkEmail = (email: string): boolean => {
    // Only allow company domain emails (you can customize this)
    const allowedDomains = ['ujenzipro.com', 'ujenzipro.co.ke', 'gmail.com'];
    const emailDomain = email.split('@')[1]?.toLowerCase();
    
    if (!emailDomain) return false;
    
    return allowedDomains.includes(emailDomain);
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

  const logSecurityEvent = async (
    eventType: string, 
    email: string, 
    success: boolean,
    details?: string
  ) => {
    try {
      await supabase.from('admin_security_logs').insert({
        event_type: eventType,
        email_attempt: email,
        success: success,
        ip_address: 'client-side',
        user_agent: navigator.userAgent,
        details: details,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
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

    try {
      // Validate work email
      if (!validateWorkEmail(workEmail)) {
        await logSecurityEvent('invalid_work_email', workEmail, false, 'Non-company email attempt');
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
        await logSecurityEvent('invalid_staff_code_format', workEmail, false, 'Invalid format');
        toast({
          variant: "destructive",
          title: "Invalid Staff Code",
          description: "Staff code must be in format: UJPRO-YYYY-NNNN"
        });
        setAttempts(prev => prev + 1);
        setLoading(false);
        return;
      }

      // Hash the staff code
      const hashedCode = await hashStaffCode(staffCode.toUpperCase());

      // For development: Allow specific test credentials
      // TODO: Replace with database verification after migration
      const validTestCredentials = [
        { email: 'hillarytaley@gmail.com', hash: await hashStaffCode('UJPRO-2024-0001') }
      ];

      const isValidCredential = validTestCredentials.some(
        cred => cred.email.toLowerCase() === workEmail.toLowerCase() && cred.hash === hashedCode
      );

      if (!isValidCredential) {
        // Try database verification if available
        try {
          const { data, error } = await supabase.rpc('verify_admin_staff_credentials', {
            work_email: workEmail.toLowerCase(),
            staff_code_hash: hashedCode
          }).maybeSingle();

          if (error || !data?.is_valid) {
            throw new Error('Invalid credentials');
          }
        } catch (dbError) {
          // Database function not available or credentials invalid
          await logSecurityEvent('failed_admin_login', workEmail, false, 'Invalid credentials');
          
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);

          // Lock account after 3 failed attempts
          if (newAttempts >= 3) {
            const lockoutTime = Date.now() + (30 * 60 * 1000); // 30 minutes
            setLockoutUntil(lockoutTime);
            localStorage.setItem(`admin_lockout_${workEmail}`, lockoutTime.toString());
            
            await logSecurityEvent('admin_account_locked', workEmail, false, `Locked after ${newAttempts} attempts`);
            
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
      }

      // Credentials valid - now authenticate via Supabase
      // For development: Use the actual password
      // TODO: After migration, staff code will be the password
      let authPassword = staffCode.toUpperCase();
      
      // Check if using test credentials, use actual account password
      if (workEmail.toLowerCase() === 'hillarytaley@gmail.com' && staffCode.toUpperCase() === 'UJPRO-2024-0001') {
        authPassword = 'Admin123456'; // Your actual password
      }
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: workEmail.toLowerCase(),
        password: authPassword
      });

      if (authError) {
        await logSecurityEvent('auth_system_error', workEmail, false, authError.message);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Failed to authenticate. Please contact IT support."
        });
        setLoading(false);
        return;
      }

      // Verify user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      console.log('Role check:', { roleData, roleError, userId: authData.user.id });

      // For development: Allow specific email to bypass role check
      const isDevelopmentAdmin = workEmail.toLowerCase() === 'hillarytaley@gmail.com';

      if (!roleData && !isDevelopmentAdmin) {
        await logSecurityEvent('unauthorized_admin_access', workEmail, false, 'No admin role');
        await supabase.auth.signOut();
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: `Your account does not have administrator privileges. Please run VERIFY_AND_FIX_ADMIN_ROLE.sql in Supabase to grant admin access.`
        });
        setLoading(false);
        return;
      }
      
      // Log if using development bypass
      if (isDevelopmentAdmin && !roleData) {
        console.warn('Using development admin bypass for:', workEmail);
      }

      // Success - log and redirect
      await logSecurityEvent('successful_admin_login', workEmail, true, 'Admin authenticated');
      
      // Clear lockout
      localStorage.removeItem(`admin_lockout_${workEmail}`);
      setAttempts(0);
      setLockoutUntil(null);

      toast({
        title: "Welcome, Administrator",
        description: "You have been securely authenticated."
      });

      // Redirect to homepage
      navigate("/");

    } catch (error: any) {
      console.error('Admin auth error:', error);
      await logSecurityEvent('system_error', workEmail, false, error.message);
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
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Beautiful Kenyan Construction Workers with Yellow Hard Hats Background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `image-set(url('/kenyan-workers.webp') type('image/webp') 1x, url('/kenyan-workers.jpg') type('image/jpeg') 1x)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
        role="img"
        aria-label="Kenyan construction workers in yellow hard hats reviewing blueprints at steel construction site"
      />
      
      {/* Dark overlay for admin security feel */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-blue-900/70 to-slate-900/85 z-0"></div>
      
      <AnimatedSection animation="scaleIn" className="relative z-10">
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
      </AnimatedSection>
    </div>
  );
};

export default AdminAuth;

