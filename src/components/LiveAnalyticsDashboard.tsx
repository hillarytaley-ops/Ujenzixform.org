import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Camera, Zap, Scan, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';

interface MaterialData {
  id: string;
  type: string;
  quantity: number;
  location: string;
  status: 'delivered' | 'pending' | 'verified';
  lastScanned: Date;
  confidence: number;
}

interface SiteAnalytics {
  totalMaterials: number;
  verifiedMaterials: number;
  pendingVerification: number;
  discrepancies: number;
  lastUpdate: Date;
  activeCameras: number;
  activeDrones: number;
  activeScanners: number;
}

export const LiveAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<SiteAnalytics>({
    totalMaterials: 0,
    verifiedMaterials: 0,
    pendingVerification: 0,
    discrepancies: 0,
    lastUpdate: new Date(),
    activeCameras: 0,
    activeDrones: 0,
    activeScanners: 0
  });

  const [materialData, setMaterialData] = useState<MaterialData[]>([]);
  const [isLive, setIsLive] = useState(true);

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate live data from cameras, drones, and scanners
      const mockAnalytics: SiteAnalytics = {
        totalMaterials: Math.floor(Math.random() * 500) + 200,
        verifiedMaterials: Math.floor(Math.random() * 400) + 150,
        pendingVerification: Math.floor(Math.random() * 50) + 10,
        discrepancies: Math.floor(Math.random() * 5),
        lastUpdate: new Date(),
        activeCameras: Math.floor(Math.random() * 8) + 4,
        activeDrones: Math.floor(Math.random() * 3) + 1,
        activeScanners: Math.floor(Math.random() * 6) + 2
      };

      setAnalytics(mockAnalytics);

      // Simulate material detection data
      const mockMaterials: MaterialData[] = [
        {
          id: '1',
          type: 'Steel Beams',
          quantity: Math.floor(Math.random() * 50) + 20,
          location: 'Zone A',
          status: 'verified',
          lastScanned: new Date(),
          confidence: 0.95
        },
        {
          id: '2',
          type: 'Concrete Blocks',
          quantity: Math.floor(Math.random() * 100) + 50,
          location: 'Zone B',
          status: 'delivered',
          lastScanned: new Date(),
          confidence: 0.88
        },
        {
          id: '3',
          type: 'Roofing Materials',
          quantity: Math.floor(Math.random() * 30) + 15,
          location: 'Zone C',
          status: 'pending',
          lastScanned: new Date(),
          confidence: 0.92
        }
      ];

      setMaterialData(mockMaterials);
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  const verificationRate = analytics.totalMaterials > 0 
    ? (analytics.verifiedMaterials / analytics.totalMaterials) * 100 
    : 0;

  return (
    <div className="space-y-6 p-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Live Site Analytics</h2>
          <p className="text-muted-foreground">Real-time building materials monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isLive ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          <span className="text-sm text-muted-foreground">
            Last update: {analytics.lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Data Source Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <Camera className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm font-medium">Active Cameras</p>
              <p className="text-2xl font-bold">{analytics.activeCameras}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <Zap className="h-8 w-8 text-orange-500 mr-3" />
            <div>
              <p className="text-sm font-medium">Active Drones</p>
              <p className="text-2xl font-bold">{analytics.activeDrones}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <Scan className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm font-medium">Active Scanners</p>
              <p className="text-2xl font-bold">{analytics.activeScanners}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Materials</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalMaterials}</div>
            <p className="text-xs text-muted-foreground">Items on site</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.verifiedMaterials}</div>
            <p className="text-xs text-muted-foreground">{verificationRate.toFixed(1)}% verified</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{analytics.pendingVerification}</div>
            <p className="text-xs text-muted-foreground">Awaiting verification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Discrepancies</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analytics.discrepancies}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Verification Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Site Verification Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Overall Verification</span>
              <span className="text-sm">{verificationRate.toFixed(1)}%</span>
            </div>
            <Progress value={verificationRate} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Live Material Detection */}
      <Card>
        <CardHeader>
          <CardTitle>Live Material Detection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {materialData.map((material) => (
              <div key={material.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{material.type}</h4>
                    <Badge variant={
                      material.status === 'verified' ? 'default' :
                      material.status === 'delivered' ? 'secondary' : 'outline'
                    }>
                      {material.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {material.location} • Qty: {material.quantity} • 
                    Confidence: {(material.confidence * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Last scanned: {material.lastScanned.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};