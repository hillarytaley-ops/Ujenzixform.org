/**
 * RealTimeMaterialScanner
 * 
 * Shows builders real-time updates when their purchased materials
 * are scanned (dispatched, received, verified).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Package,
  Truck,
  CheckCircle,
  AlertTriangle,
  QrCode,
  RefreshCw,
  Wifi,
  WifiOff,
  Bell,
  Clock,
  MapPin,
  ArrowRight,
  Scan,
  PackageCheck,
  Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  builderMaterialTrackingService,
  MaterialScanEvent,
  MaterialItem,
  BuilderMaterialStats
} from '@/services/BuilderMaterialTrackingService';
import { format } from 'date-fns';

interface RealTimeMaterialScannerProps {
  compact?: boolean;
}

export const RealTimeMaterialScanner: React.FC<RealTimeMaterialScannerProps> = ({ compact = false }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState<BuilderMaterialStats | null>(null);
  const [recentScans, setRecentScans] = useState<MaterialScanEvent[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newScanAlert, setNewScanAlert] = useState<{ event: MaterialScanEvent; material?: MaterialItem } | null>(null);
  const { toast } = useToast();

  // Initialize tracking
  const initializeTracking = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No user found for material tracking');
        setLoading(false);
        return;
      }

      // Start real-time tracking
      const success = await builderMaterialTrackingService.startTracking(user.id);
      setIsConnected(success);

      // Load initial data
      const [initialStats, initialMaterials, initialScans] = await Promise.all([
        builderMaterialTrackingService.getBuilderMaterialStats(),
        builderMaterialTrackingService.getBuilderMaterials(),
        builderMaterialTrackingService.getRecentScans(10)
      ]);

      if (initialStats) setStats(initialStats);
      setMaterials(initialMaterials);
      setRecentScans(initialScans);

    } catch (error) {
      console.error('Error initializing material tracking:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeTracking();

    // Register for real-time scan events
    const unsubscribeScan = builderMaterialTrackingService.onScanEvent((event, material) => {
      // Show alert for new scan
      setNewScanAlert({ event, material });
      
      // Add to recent scans
      setRecentScans(prev => [event, ...prev.slice(0, 9)]);
      
      // Update material in list
      if (material) {
        setMaterials(prev => prev.map(m => 
          m.qr_code === material.qr_code ? material : m
        ));
      }

      // Show toast notification
      toast({
        title: getScanTitle(event.scan_type),
        description: `${material?.name || 'Material'} - ${event.scan_type} scan completed`,
      });

      // Play notification sound
      playNotificationSound();

      // Clear alert after 5 seconds
      setTimeout(() => setNewScanAlert(null), 5000);
    });

    // Register for stats updates
    const unsubscribeStats = builderMaterialTrackingService.onStatsUpdate((newStats) => {
      setStats(newStats);
    });

    return () => {
      unsubscribeScan();
      unsubscribeStats();
      builderMaterialTrackingService.stopTracking();
    };
  }, [initializeTracking, toast]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {
      // Ignore audio errors
    }
  };

  const getScanTitle = (scanType: string): string => {
    switch (scanType) {
      case 'dispatch': return '📦 Material Dispatched!';
      case 'receiving': return '✅ Material Received!';
      case 'verification': return '🔍 Material Verified!';
      default: return '🔔 Material Scanned';
    }
  };

  const getScanIcon = (scanType: string) => {
    switch (scanType) {
      case 'dispatch': return <Send className="h-4 w-4 text-blue-500" />;
      case 'receiving': return <PackageCheck className="h-4 w-4 text-green-500" />;
      case 'verification': return <CheckCircle className="h-4 w-4 text-purple-500" />;
      default: return <Scan className="h-4 w-4 text-gray-500" />;
    }
  };

  const getScanBadgeColor = (scanType: string): string => {
    switch (scanType) {
      case 'dispatch': return 'bg-blue-500';
      case 'receiving': return 'bg-green-500';
      case 'verification': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'dispatched': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-orange-100 text-orange-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'verified': return 'bg-purple-100 text-purple-800';
      case 'damaged': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressValue = (): number => {
    if (!stats || stats.totalItems === 0) return 0;
    const completed = stats.receivedItems + stats.verifiedItems;
    return Math.round((completed / stats.totalItems) * 100);
  };

  const handleRefresh = async () => {
    setLoading(true);
    await initializeTracking();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading material tracking...</span>
        </CardContent>
      </Card>
    );
  }

  // Compact view for header/sidebar
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge className={isConnected ? 'bg-green-500' : 'bg-gray-500'}>
          {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
          {isConnected ? 'Live' : 'Offline'}
        </Badge>
        {newScanAlert && (
          <Badge className={`${getScanBadgeColor(newScanAlert.event.scan_type)} animate-pulse`}>
            {getScanIcon(newScanAlert.event.scan_type)}
            <span className="ml-1">{newScanAlert.event.scan_type}</span>
          </Badge>
        )}
        {stats && (
          <span className="text-sm text-muted-foreground">
            {stats.dispatchedItems} in transit | {stats.receivedItems} received
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* New Scan Alert */}
      {newScanAlert && (
        <Alert className="border-2 border-green-500 bg-green-50 animate-pulse">
          <Bell className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800 font-bold">
            {getScanTitle(newScanAlert.event.scan_type)}
          </AlertTitle>
          <AlertDescription className="text-green-700">
            <div className="flex items-center gap-2">
              {getScanIcon(newScanAlert.event.scan_type)}
              <span>{newScanAlert.material?.name || 'Your material'} has been {newScanAlert.event.scan_type}ed</span>
            </div>
            <div className="text-sm mt-1">
              Condition: {newScanAlert.event.material_condition || 'Good'}
              {newScanAlert.event.notes && ` - ${newScanAlert.event.notes}`}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Status & Stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Material Tracking
              </CardTitle>
              <CardDescription>Real-time updates on your purchased materials</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={isConnected ? 'bg-green-500' : 'bg-gray-500'}>
                {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                {isConnected ? 'Live Updates' : 'Offline'}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stats && (
            <>
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Delivery Progress</span>
                  <span>{getProgressValue()}% Complete</span>
                </div>
                <Progress value={getProgressValue()} className="h-2" />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <Package className="h-6 w-6 mx-auto text-yellow-600 mb-1" />
                  <div className="text-2xl font-bold text-yellow-700">{stats.pendingItems}</div>
                  <div className="text-xs text-yellow-600">Pending</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Send className="h-6 w-6 mx-auto text-blue-600 mb-1" />
                  <div className="text-2xl font-bold text-blue-700">{stats.dispatchedItems}</div>
                  <div className="text-xs text-blue-600">Dispatched</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <PackageCheck className="h-6 w-6 mx-auto text-green-600 mb-1" />
                  <div className="text-2xl font-bold text-green-700">{stats.receivedItems}</div>
                  <div className="text-xs text-green-600">Received</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <CheckCircle className="h-6 w-6 mx-auto text-purple-600 mb-1" />
                  <div className="text-2xl font-bold text-purple-700">{stats.verifiedItems}</div>
                  <div className="text-xs text-purple-600">Verified</div>
                </div>
              </div>

              {stats.damagedItems > 0 && (
                <Alert variant="destructive" className="mt-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Damaged Items</AlertTitle>
                  <AlertDescription>
                    {stats.damagedItems} item(s) reported as damaged. Please review.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Scans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Recent Scan Activity
          </CardTitle>
          <CardDescription>Latest scanning events for your materials</CardDescription>
        </CardHeader>
        <CardContent>
          {recentScans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <QrCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No scan events yet</p>
              <p className="text-sm">You'll see updates here when your materials are scanned</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {recentScans.map((scan, index) => (
                  <div 
                    key={scan.id} 
                    className={`flex items-start gap-3 p-3 border rounded-lg ${
                      index === 0 && newScanAlert?.event.id === scan.id 
                        ? 'border-green-500 bg-green-50 animate-pulse' 
                        : ''
                    }`}
                  >
                    <div className={`p-2 rounded-full ${getScanBadgeColor(scan.scan_type)} bg-opacity-20`}>
                      {getScanIcon(scan.scan_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <Badge className={getScanBadgeColor(scan.scan_type)}>
                          {scan.scan_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(scan.scanned_at), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">
                        {scan.qr_code.substring(0, 25)}...
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Condition: {scan.material_condition || 'Good'}</span>
                        <span>•</span>
                        <span>Via: {scan.scanner_type}</span>
                      </div>
                      {scan.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          "{scan.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Material Items List */}
      {materials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Your Materials ({materials.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {materials.map((material) => (
                  <div key={material.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{material.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {material.quantity} {material.unit} • PO: {material.purchase_order_number}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(material.status)}>
                      {material.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RealTimeMaterialScanner;





















