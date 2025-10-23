import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle, CheckCircle, MapPin, Smartphone, Clock, Zap } from 'lucide-react';
import { useEnhancedScannerSecurity } from '@/hooks/useEnhancedScannerSecurity';

interface EnhancedScannerSecurityGuardProps {
  children: React.ReactNode;
  onSecurityCheckComplete?: (canProceed: boolean, securityScore: number) => void;
}

export const EnhancedScannerSecurityGuard: React.FC<EnhancedScannerSecurityGuardProps> = ({
  children,
  onSecurityCheckComplete
}) => {
  const [securityStatus, setSecurityStatus] = useState<{
    canProceed: boolean;
    securityScore: number;
    issues: string[];
    recommendations: string[];
  } | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const {
    deviceFingerprint,
    locationData,
    rateLimitStatus,
    performSecurityCheck
  } = useEnhancedScannerSecurity();

  useEffect(() => {
    const runSecurityCheck = async () => {
      setIsChecking(true);
      try {
        const result = await performSecurityCheck();
        setSecurityStatus(result);
        onSecurityCheckComplete?.(result.canProceed, result.securityScore);
      } catch (error) {
        console.error('Security check failed:', error);
        setSecurityStatus({
          canProceed: false,
          securityScore: 0,
          issues: ['Security check failed'],
          recommendations: ['Contact system administrator']
        });
        onSecurityCheckComplete?.(false, 0);
      } finally {
        setIsChecking(false);
      }
    };

    runSecurityCheck();
  }, [performSecurityCheck, onSecurityCheckComplete]);

  const getSecurityBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (score >= 40) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getSecurityIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4" />;
    if (score >= 40) return <AlertTriangle className="h-4 w-4" />;
    return <Shield className="h-4 w-4" />;
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 animate-pulse" />
              Security Check
            </CardTitle>
            <CardDescription>
              Verifying scanner security requirements...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm">Checking device fingerprint...</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm">Verifying location access...</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm">Checking rate limits...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!securityStatus) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Security Check Failed</AlertTitle>
        <AlertDescription>
          Unable to complete security verification. Please refresh the page and try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!securityStatus.canProceed) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Scanner Access Blocked</AlertTitle>
          <AlertDescription>
            Security requirements not met. Scanner access is temporarily restricted.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Status
              </span>
              <Badge className={getSecurityBadgeColor(securityStatus.securityScore)}>
                {getSecurityIcon(securityStatus.securityScore)}
                Score: {securityStatus.securityScore}/100
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {securityStatus.issues.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Security Issues
                </h4>
                <ul className="space-y-1">
                  {securityStatus.issues.map((issue, index) => (
                    <li key={index} className="text-sm text-red-600 flex items-center gap-2">
                      <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {securityStatus.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Recommendations
                </h4>
                <ul className="space-y-1">
                  {securityStatus.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-blue-600 flex items-center gap-2">
                      <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
              variant="outline"
            >
              Retry Security Check
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Security Status Header */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800">Scanner Security Active</h3>
                <p className="text-sm text-green-700">Enhanced security measures enabled</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getSecurityBadgeColor(securityStatus.securityScore)}>
                {getSecurityIcon(securityStatus.securityScore)}
                {securityStatus.securityScore}/100
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide' : 'Show'} Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Details */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Device Fingerprint */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Device Security
                </h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Fingerprint:</span> {deviceFingerprint?.fingerprint?.slice(0, 8)}...</p>
                  <p><span className="text-muted-foreground">Resolution:</span> {deviceFingerprint?.screenResolution}</p>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                </div>
              </div>

              {/* Location Status */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location Security
                </h4>
                <div className="text-sm space-y-1">
                  {locationData ? (
                    <>
                      <p><span className="text-muted-foreground">Accuracy:</span> ±{locationData.accuracy?.toFixed(0)}m</p>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        GPS Active
                      </Badge>
                    </>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      No GPS
                    </Badge>
                  )}
                </div>
              </div>

              {/* Rate Limit Status */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Usage Limits
                </h4>
                <div className="text-sm space-y-1">
                  {rateLimitStatus ? (
                    <>
                      <p><span className="text-muted-foreground">Used:</span> {rateLimitStatus.currentCount}/{rateLimitStatus.limitThreshold}</p>
                      <Badge variant="outline" className={rateLimitStatus.rateLimitOk ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}>
                        {rateLimitStatus.rateLimitOk ? (
                          <><CheckCircle className="h-3 w-3 mr-1" />Within Limits</>
                        ) : (
                          <><AlertTriangle className="h-3 w-3 mr-1" />Limit Exceeded</>
                        )}
                      </Badge>
                    </>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                      Checking...
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {securityStatus.issues.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Minor Security Warnings</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 space-y-1">
                    {securityStatus.issues.map((issue, index) => (
                      <li key={index} className="text-sm">• {issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Scanner Content */}
      {children}
    </div>
  );
};














