import { useState, useEffect } from 'react';
import { Shield, Lock, Video, AlertTriangle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSecureCameras } from '@/hooks/useSecureCameras';
import { useToast } from '@/hooks/use-toast';

interface SecureCameraViewerProps {
  cameraId: string;
  projectId?: string;
  className?: string;
}

export const SecureCameraViewer = ({ 
  cameraId, 
  projectId, 
  className 
}: SecureCameraViewerProps) => {
  const [streamData, setStreamData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const { 
    getSecureCameraStream, 
    logCameraAccess, 
    isAuthenticated, 
    userRole 
  } = useSecureCameras();
  const { toast } = useToast();

  const handleRequestStreamAccess = async () => {
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please sign in to access camera feeds."
      });
      return;
    }

    setLoading(true);
    try {
      // Log the stream access request
      await logCameraAccess(cameraId, `stream_access_requested_for_project_${projectId || 'unknown'}`);
      
      // Fetch secure camera stream
      const streamInfo = await getSecureCameraStream(cameraId);
      setStreamData(streamInfo);
      setHasRequested(true);

      if (streamInfo?.can_access && streamInfo.stream_url) {
        setStreamActive(true);
        toast({
          title: "Camera access granted",
          description: "You now have access to the camera feed."
        });
      } else {
        toast({
          variant: "destructive",
          title: "Access restricted",
          description: streamInfo?.access_message || "Camera access not available."
        });
      }
    } catch (error) {
      console.error('Error requesting camera stream:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to access camera feed."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStopStream = () => {
    setStreamActive(false);
    toast({
      title: "Stream stopped",
      description: "Camera feed has been disconnected."
    });
  };

  const renderCameraInterface = () => {
    if (!hasRequested) {
      return (
        <Card className={className}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              Secure Camera Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-3 w-3" />
                Camera feeds are protected and access-controlled
              </div>
              <Button 
                onClick={handleRequestStreamAccess}
                disabled={loading}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Video className="h-3 w-3 mr-2" />
                {loading ? 'Requesting...' : 'Request Camera Access'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Camera access is logged for security and restricted to project participants only.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!streamData) {
      return (
        <Card className={className}>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              Camera information not available
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-600" />
            {streamData.camera_name}
            {streamData.can_access ? (
              <Badge variant="secondary" className="text-xs">Authorized</Badge>
            ) : (
              <Badge variant="outline" className="text-xs">Restricted</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {streamData.can_access && streamData.stream_url ? (
              <div className="space-y-3">
                {streamActive ? (
                  <div className="space-y-2">
                    <div className="bg-black rounded-md aspect-video flex items-center justify-center relative">
                      <video
                        src={streamData.stream_url}
                        autoPlay
                        muted
                        className="w-full h-full rounded-md"
                        onError={() => {
                          toast({
                            variant: "destructive",
                            title: "Stream error",
                            description: "Failed to load camera feed."
                          });
                        }}
                      />
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="text-xs">
                          <Eye className="h-3 w-3 mr-1" />
                          LIVE
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      onClick={handleStopStream}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Stop Stream
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={() => setStreamActive(true)}
                    variant="default"
                    size="sm"
                    className="w-full"
                  >
                    <Video className="h-3 w-3 mr-2" />
                    Start Live Feed
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-xs text-yellow-800">
                    <p className="font-medium">Camera access restricted</p>
                    <p>{streamData.access_message}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p><strong>Access Requirements:</strong></p>
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    <li>Be a project participant (builder, supplier, admin)</li>
                    <li>Have active involvement in the project</li>
                    <li>Authorized access for legitimate business purposes</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return renderCameraInterface();
};