import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Camera, Plus, Settings, Wifi, WifiOff, Eye, Trash2, Lock } from 'lucide-react';
import { physicalCameraService, CameraConfig } from '@/services/PhysicalCameraService';
import { supabase } from '@/integrations/supabase/client';
import { useSecureCameras } from '@/hooks/useSecureCameras';

interface CameraSetupProps {
  onCameraConnected: (camera: CameraConfig) => void;
}

const CameraSetup: React.FC<CameraSetupProps> = ({ onCameraConnected }) => {
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, userRole, logCameraAccess } = useSecureCameras();
  const [formData, setFormData] = useState({
    name: '',
    type: 'ip' as const,
    connectionUrl: '',
    username: '',
    password: '',
    qrScanning: true,
    aiDetection: true,
    recording: true,
    ptz: false
  });

  useEffect(() => {
    checkAuthorization();
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      // Load existing cameras
      setCameras(physicalCameraService.getCameras());

      // Listen for camera events
      physicalCameraService.on('camera-connected', (camera: CameraConfig) => {
        setCameras(prev => [...prev.filter(c => c.id !== camera.id), camera]);
        onCameraConnected(camera);
        toast.success(`Camera "${camera.name}" connected successfully`);
      });

      physicalCameraService.on('camera-disconnected', (camera: CameraConfig) => {
        setCameras(prev => prev.map(c => c.id === camera.id ? camera : c));
        toast.info(`Camera "${camera.name}" disconnected`);
      });

      physicalCameraService.on('camera-error', (camera: CameraConfig) => {
        setCameras(prev => prev.map(c => c.id === camera.id ? camera : c));
        toast.error(`Camera "${camera.name}" connection error`);
      });
    }
  }, [isAuthorized, onCameraConnected]);

  const checkAuthorization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      // Check if user has admin or supplier role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (profileError) {
        console.error('Error checking authorization:', profileError);
        setIsAuthorized(false);
      } else {
        // Check user role from user_roles table
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();
        
        setIsAuthorized(!!roleData);
      }
    } catch (error) {
      console.error('Authorization check error:', error);
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCamera = async () => {
    if (!formData.name || !formData.connectionUrl) {
      toast.error('Please fill in all required fields');
      return;
    }

    const cameraConfig = {
      id: `camera-${Date.now()}`,
      name: formData.name,
      type: formData.type,
      connectionUrl: formData.connectionUrl,
      username: formData.username || undefined,
      password: formData.password || undefined,
      capabilities: {
        qrScanning: formData.qrScanning,
        aiDetection: formData.aiDetection,
        recording: formData.recording,
        ptz: formData.ptz
      }
    };

    const success = await physicalCameraService.connectCamera(cameraConfig);
    
    if (success) {
      setShowAddForm(false);
      setFormData({
        name: '',
        type: 'ip',
        connectionUrl: '',
        username: '',
        password: '',
        qrScanning: true,
        aiDetection: true,
        recording: true,
        ptz: false
      });
    } else {
      toast.error('Failed to connect to camera. Please check your settings.');
    }
  };

  const handleDisconnectCamera = async (cameraId: string) => {
    await physicalCameraService.disconnectCamera(cameraId);
  };

  const getConnectionHelp = (type: string) => {
    switch (type) {
      case 'ip':
        return 'Format: http://192.168.1.100:8080 or https://camera.example.com';
      case 'rtsp':
        return 'Format: rtsp://192.168.1.100:554/stream1';
      case 'usb':
        return 'Use device ID from browser (e.g., default, or specific device ID)';
      case 'ai-device':
        return 'API endpoint for AI-enabled cameras (e.g., http://ai-camera.local:8080)';
      default:
        return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'disconnected':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
            <p className="text-muted-foreground mb-4">
              Camera setup is only available to administrators for security purposes.
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact your administrator if you need access to camera management features.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Physical Camera Setup
            </CardTitle>
            <Button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Camera
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <div className="space-y-4 mb-6 p-4 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="camera-name">Camera Name</Label>
                  <Input
                    id="camera-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Construction Site Camera 1"
                  />
                </div>

                <div>
                  <Label htmlFor="camera-type">Camera Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ip">IP Camera</SelectItem>
                      <SelectItem value="rtsp">RTSP Stream</SelectItem>
                      <SelectItem value="usb">USB Camera</SelectItem>
                      <SelectItem value="ai-device">AI Device</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="connection-url">Connection URL</Label>
                  <Input
                    id="connection-url"
                    value={formData.connectionUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, connectionUrl: e.target.value }))}
                    placeholder={getConnectionHelp(formData.type)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {getConnectionHelp(formData.type)}
                  </p>
                </div>

                {(formData.type === 'ip' || formData.type === 'ai-device') && (
                  <>
                    <div>
                      <Label htmlFor="username">Username (Optional)</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="admin"
                      />
                    </div>

                    <div>
                      <Label htmlFor="password">Password (Optional)</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="password"
                      />
                    </div>
                  </>
                )}
              </div>

              <Separator />

              <div>
                <Label className="text-base font-medium">Camera Capabilities</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="qr-scanning"
                      checked={formData.qrScanning}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, qrScanning: checked }))}
                    />
                    <Label htmlFor="qr-scanning">QR Scanning</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="ai-detection"
                      checked={formData.aiDetection}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, aiDetection: checked }))}
                    />
                    <Label htmlFor="ai-detection">AI Detection</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="recording"
                      checked={formData.recording}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, recording: checked }))}
                    />
                    <Label htmlFor="recording">Recording</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="ptz"
                      checked={formData.ptz}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ptz: checked }))}
                    />
                    <Label htmlFor="ptz">PTZ Control</Label>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddCamera}>Connect Camera</Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Connected Cameras List */}
          <div className="space-y-3">
            {cameras.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No cameras connected</p>
                <p className="text-sm">Add a physical camera to get started</p>
              </div>
            ) : (
              cameras.map((camera) => (
                <div key={camera.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Camera className="h-8 w-8" />
                      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor(camera.status)}`} />
                    </div>
                    
                    <div>
                      <h3 className="font-medium">{camera.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{camera.type.toUpperCase()}</Badge>
                        <span>{camera.connectionUrl}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {camera.capabilities.qrScanning && <Badge variant="secondary">QR</Badge>}
                        {camera.capabilities.aiDetection && <Badge variant="secondary">AI</Badge>}
                        {camera.capabilities.recording && <Badge variant="secondary">REC</Badge>}
                        {camera.capabilities.ptz && <Badge variant="secondary">PTZ</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={camera.status === 'connected' ? 'default' : 'destructive'}>
                      {camera.status === 'connected' ? (
                        <><Wifi className="h-3 w-3 mr-1" /> Connected</>
                      ) : (
                        <><WifiOff className="h-3 w-3 mr-1" /> {camera.status}</>
                      )}
                    </Badge>
                    
                    {camera.status === 'connected' && (
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDisconnectCamera(camera.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Camera Integration Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Integration Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Supported Camera Types:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><strong>IP Cameras:</strong> Standard network cameras with HTTP/HTTPS APIs</li>
              <li><strong>RTSP Streams:</strong> Real-time streaming protocol cameras</li>
              <li><strong>USB Cameras:</strong> Local USB-connected cameras</li>
              <li><strong>AI Devices:</strong> Smart cameras with built-in AI processing</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Required Camera Features:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• HTTP API for control and configuration</li>
              <li>• Video streaming capability (MJPEG, H.264, or WebRTC)</li>
              <li>• Optional: AI processing for material detection</li>
              <li>• Optional: PTZ (Pan, Tilt, Zoom) control</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CameraSetup;