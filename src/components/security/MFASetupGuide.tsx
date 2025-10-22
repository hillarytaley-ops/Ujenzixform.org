import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Smartphone, Key, ExternalLink } from "lucide-react";

export const MFASetupGuide = () => {
  const openSupabaseDashboard = () => {
    window.open('https://supabase.com/dashboard/project/wuuyjjpgzgeimiptuuws/auth/providers', '_blank');
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <CardTitle>Multi-Factor Authentication (MFA) Setup</CardTitle>
        </div>
        <CardDescription>
          Enhance admin account security with two-factor authentication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Enhanced Security for Admins</AlertTitle>
          <AlertDescription>
            MFA adds an extra layer of protection to admin accounts by requiring a second form of verification.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Setup Steps
          </h3>
          
          <ol className="space-y-3 list-decimal list-inside">
            <li className="text-sm">
              <strong>Enable MFA in Supabase Dashboard</strong>
              <p className="ml-6 text-muted-foreground mt-1">
                Navigate to Authentication → Providers and enable Phone or TOTP authentication
              </p>
            </li>
            
            <li className="text-sm">
              <strong>Configure Admin Requirements</strong>
              <p className="ml-6 text-muted-foreground mt-1">
                Set up authentication policies to require MFA for admin role users
              </p>
            </li>
            
            <li className="text-sm">
              <strong>Install Authenticator App</strong>
              <p className="ml-6 text-muted-foreground mt-1">
                Recommended: Google Authenticator, Authy, or Microsoft Authenticator
              </p>
            </li>
            
            <li className="text-sm">
              <strong>Enroll Admin Users</strong>
              <p className="ml-6 text-muted-foreground mt-1">
                Each admin must enroll their MFA device through their account settings
              </p>
            </li>
          </ol>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Key className="h-5 w-5" />
            Available MFA Methods
          </h3>
          
          <div className="grid gap-3">
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium">TOTP (Time-based One-Time Password)</h4>
                <p className="text-sm text-muted-foreground">
                  Use authenticator apps like Google Authenticator or Authy
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium">SMS Authentication</h4>
                <p className="text-sm text-muted-foreground">
                  Receive verification codes via text message (requires Twilio setup)
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Button onClick={openSupabaseDashboard} className="w-full">
          <ExternalLink className="mr-2 h-4 w-4" />
          Open Supabase Auth Settings
        </Button>

        <Alert>
          <AlertDescription className="text-xs">
            <strong>Note:</strong> MFA configuration requires Supabase project admin access. 
            After enabling MFA, admin users will be prompted to set up their authentication method on next login.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
