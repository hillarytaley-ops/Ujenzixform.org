import { Shield, Camera, Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const CameraSecurityStatus = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Camera Security Status
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Secured
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Camera feeds are now protected with enterprise-grade security controls.
              Only authorized project participants can access surveillance data.
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Access Controls
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>✓ Project-based access restrictions</li>
                <li>✓ Role-based permissions (Admin, Builder, Supplier)</li>
                <li>✓ Active delivery status verification</li>
                <li>✓ Stream URL protection</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Security Features
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>✓ Comprehensive audit logging</li>
                <li>✓ Secure function-based access</li>
                <li>✓ Location data protection</li>
                <li>✓ Real-time access monitoring</li>
              </ul>
            </div>
          </div>
          
          <div className="p-3 bg-blue-50 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-medium">Access Requirements</p>
                <p>Camera feeds are restricted to project participants with legitimate business needs. All access attempts are logged and monitored.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};