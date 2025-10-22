import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Monitor, 
  Wifi, 
  WifiOff, 
  Users, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin
} from 'lucide-react';

interface LiveStreamProps {
  siteId?: string;
  siteName?: string;
}

interface StreamData {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'inactive' | 'warning';
  viewers: number;
  quality: string;
  uptime: string;
  lastActivity: Date;
}

interface ProgressUpdate {
  id: string;
  timestamp: Date;
  type: 'completion' | 'issue' | 'milestone';
  description: string;
  location: string;
  confidence: number;
}

const LiveStreamMonitor: React.FC<LiveStreamProps> = ({ 
  siteId = "site-001", 
  siteName = "UjenziPro Construction Site" 
}) => {
  const [streams, setStreams] = useState<StreamData[]>([
    {
      id: 'cam-001',
      name: 'Main Entrance',
      location: 'Gate A',
      status: 'active',
      viewers: 3,
      quality: '1080p',
      uptime: '2h 15m',
      lastActivity: new Date()
    },
    {
      id: 'cam-002',
      name: 'Foundation Work',
      location: 'Block A Foundation',
      status: 'active',
      viewers: 5,
      quality: '720p',
      uptime: '4h 32m',
      lastActivity: new Date()
    },
    {
      id: 'cam-003',
      name: 'Material Storage',
      location: 'Warehouse',
      status: 'warning',
      viewers: 1,
      quality: '480p',
      uptime: '1h 45m',
      lastActivity: new Date(Date.now() - 300000)
    }
  ]);

  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([
    {
      id: '1',
      timestamp: new Date(),
      type: 'completion',
      description: 'Foundation concrete pour completed in Section A',
      location: 'Block A Foundation',
      confidence: 0.92
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1800000),
      type: 'milestone',
      description: 'Steel reinforcement installation finished',
      location: 'Block B Structure',
      confidence: 0.88
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 3600000),
      type: 'issue',
      description: 'Possible safety violation detected - worker without helmet',
      location: 'Main Construction Area',
      confidence: 0.76
    }
  ]);

  const [isConnected, setIsConnected] = useState(true);
  const [selectedStream, setSelectedStream] = useState<string>('cam-001');

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update viewer counts randomly
      setStreams(prev => prev.map(stream => ({
        ...stream,
        viewers: Math.max(0, stream.viewers + Math.floor(Math.random() * 3) - 1),
        lastActivity: stream.status === 'active' ? new Date() : stream.lastActivity
      })));

      // Randomly add progress updates
      if (Math.random() > 0.7) {
        const updateTypes: Array<'completion' | 'issue' | 'milestone'> = ['completion', 'issue', 'milestone'];
        const descriptions = [
          'AI detected material delivery arrival',
          'Construction progress milestone reached',
          'Quality check completed automatically',
          'Safety equipment compliance verified',
          'Weather monitoring alert triggered'
        ];
        
        const newUpdate: ProgressUpdate = {
          id: Date.now().toString(),
          timestamp: new Date(),
          type: updateTypes[Math.floor(Math.random() * updateTypes.length)],
          description: descriptions[Math.floor(Math.random() * descriptions.length)],
          location: `Zone ${Math.floor(Math.random() * 3) + 1}`,
          confidence: Math.random() * 0.3 + 0.7
        };

        setProgressUpdates(prev => [newUpdate, ...prev.slice(0, 9)]);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'completion':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'milestone':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'issue':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Site Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              {siteName}
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {streams.filter(s => s.status === 'active').length}
              </div>
              <div className="text-sm text-muted-foreground">Active Cameras</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {streams.reduce((sum, s) => sum + s.viewers, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Viewers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {progressUpdates.filter(u => u.timestamp > new Date(Date.now() - 3600000)).length}
              </div>
              <div className="text-sm text-muted-foreground">Updates (1h)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="streams" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="streams">Live Streams</TabsTrigger>
          <TabsTrigger value="progress">Progress Monitor</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="streams" className="space-y-4">
          {/* Stream Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stream List */}
            <Card>
              <CardHeader>
                <CardTitle>Camera Feeds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {streams.map((stream) => (
                  <div
                    key={stream.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedStream === stream.id 
                        ? 'bg-primary/10 border-primary' 
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    onClick={() => setSelectedStream(stream.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(stream.status)}
                          <span className="font-medium">{stream.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          {stream.location}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {stream.viewers}
                        </div>
                        <div className="text-muted-foreground">{stream.quality}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Main Stream View */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {streams.find(s => s.id === selectedStream)?.name || 'Stream View'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-black rounded-lg flex items-center justify-center relative overflow-hidden">
                  {/* Simulated video feed */}
                  <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Monitor className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm opacity-75">Live Stream Feed</p>
                      <p className="text-xs opacity-50 mt-1">
                        {streams.find(s => s.id === selectedStream)?.location}
                      </p>
                    </div>
                  </div>
                  
                  {/* Stream overlay */}
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <Badge className="bg-red-500 text-white">
                      LIVE
                    </Badge>
                    <div className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                      {streams.find(s => s.id === selectedStream)?.uptime}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Progress Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progressUpdates.map((update) => (
                  <div key={update.id} className="flex gap-4 p-4 bg-muted rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      {getUpdateIcon(update.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{update.description}</p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {update.location}
                            <span>•</span>
                            <span>{update.timestamp.toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {Math.round(update.confidence * 100)}% confidence
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Average Stream Quality</span>
                  <Badge>1080p</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Total Recording Time</span>
                  <span className="font-medium">12h 45m</span>
                </div>
                <div className="flex justify-between">
                  <span>AI Detection Accuracy</span>
                  <span className="font-medium">94.2%</span>
                </div>
                <div className="flex justify-between">
                  <span>System Uptime</span>
                  <span className="font-medium">99.8%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Materials Detected</span>
                  <span className="font-medium">47</span>
                </div>
                <div className="flex justify-between">
                  <span>QR Codes Scanned</span>
                  <span className="font-medium">23</span>
                </div>
                <div className="flex justify-between">
                  <span>Progress Updates</span>
                  <span className="font-medium">15</span>
                </div>
                <div className="flex justify-between">
                  <span>Safety Alerts</span>
                  <span className="font-medium text-red-500">3</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LiveStreamMonitor;