import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, Lock, Camera, Settings, AlertTriangle } from "lucide-react";

interface BuilderMonitoringNoticeProps {
  userRole?: string;
  className?: string;
}

export const BuilderMonitoringNotice: React.FC<BuilderMonitoringNoticeProps> = ({ 
  userRole, 
  className = "" 
}) => {
  const isBuilder = userRole === 'builder';
  
  if (!isBuilder) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Security Notice */}
      <Alert className="border-amber-200 bg-amber-50">
        <Shield className="h-4 w-4" />
        <AlertTitle>Builder Access Restrictions</AlertTitle>
        <AlertDescription>
          <strong>Important:</strong> As a builder, you have <strong>VIEW-ONLY</strong> access to camera feeds. 
          All camera controls (recording, zoom, settings) are restricted to UjenziPro administrators for security and operational integrity.
        </AlertDescription>
      </Alert>

      {/* Access Level Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Eye className="h-5 w-5" />
            Your Monitoring Access Level
          </CardTitle>
          <CardDescription>
            What you can and cannot do in the monitoring system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* What Builders CAN Do */}
            <div className="space-y-3">
              <h4 className="font-medium text-green-700 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                ✅ You CAN Access
              </h4>
              <ul className="text-sm space-y-1 text-green-800">
                <li>• View live camera feeds from your construction sites</li>
                <li>• Monitor construction activities and progress</li>
                <li>• Receive safety and security alerts</li>
                <li>• Track material deliveries to your sites</li>
                <li>• Scan QR codes for material verification</li>
                <li>• View project analytics and reports</li>
              </ul>
            </div>

            {/* What Builders CANNOT Do */}
            <div className="space-y-3">
              <h4 className="font-medium text-red-700 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                ❌ You CANNOT Control
              </h4>
              <ul className="text-sm space-y-1 text-red-800">
                <li>• Start/stop camera recording</li>
                <li>• Adjust camera settings or configurations</li>
                <li>• Control camera zoom, pan, or movement</li>
                <li>• Install or remove cameras</li>
                <li>• Access system administration features</li>
                <li>• View other builders' camera feeds</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Why These Restrictions?</p>
                <p>
                  Camera controls are restricted to UjenziPro administrators to ensure:
                  • System security and integrity
                  • Consistent monitoring coverage
                  • Professional operation standards
                  • Compliance with security protocols
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
          <Eye className="h-3 w-3 mr-1" />
          Live Viewing Enabled
        </Badge>
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <Camera className="h-3 w-3 mr-1" />
          Camera Controls Disabled
        </Badge>
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <Settings className="h-3 w-3 mr-1" />
          Admin Controls Only
        </Badge>
      </div>
    </div>
  );
};
