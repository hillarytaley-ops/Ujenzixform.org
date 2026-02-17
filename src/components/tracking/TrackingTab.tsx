import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MapPin,
  Truck,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink,
  Phone,
  Navigation,
  RefreshCw,
  Copy,
  Eye,
  Calendar,
  Building,
  User,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface TrackingNumber {
  id: string;
  tracking_number: string;
  delivery_request_id: string;
  purchase_order_id: string | null;
  builder_id: string;
  delivery_provider_id: string | null;
  supplier_id: string | null;
  status: 'pending' | 'accepted' | 'picked_up' | 'in_transit' | 'near_destination' | 'delivered' | 'cancelled';
  current_latitude: number | null;
  current_longitude: number | null;
  last_location_update: string | null;
  pickup_address: string | null;
  delivery_address: string;
  materials_description: string | null;
  estimated_delivery_date: string | null;
  actual_delivery_date: string | null;
  provider_name: string | null;
  provider_phone: string | null;
  vehicle_type: string | null;
  vehicle_registration: string | null;
  created_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
}

interface TrackingTabProps {
  userId: string;
  userRole: 'admin' | 'professional_builder' | 'private_client' | 'delivery_provider';
  userName?: string;
}

const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';

export const TrackingTab: React.FC<TrackingTabProps> = ({ userId, userRole, userName }) => {
  const [trackingNumbers, setTrackingNumbers] = useState<TrackingNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchTrackingNumbers();
  }, [userId, userRole]);

  const getAccessToken = () => {
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        return parsed.access_token || '';
      }
    } catch (e) {}
    return '';
  };

  const fetchTrackingNumbers = async () => {
    setLoading(true);
    try {
      const accessToken = getAccessToken();
      
      console.log('📦 TrackingTab: Starting fetch for userId:', userId, 'role:', userRole);
      
      // For builders, we need to get their profile ID as well
      let profileId = userId;
      if (userRole === 'professional_builder' || userRole === 'private_client') {
        try {
          const profileResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=id`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
              }
            }
          );
          if (profileResponse.ok) {
            const profiles = await profileResponse.json();
            console.log('📦 Profile lookup result:', profiles);
            if (profiles && profiles.length > 0) {
              profileId = profiles[0].id;
              console.log('📦 Got profile ID:', profileId);
            }
          }
        } catch (e) {
          console.log('📦 Could not fetch profile, using userId');
        }
      }
      
      // Build query based on user role
      let url = `${SUPABASE_URL}/rest/v1/tracking_numbers?order=created_at.desc&select=*`;
      
      if (userRole === 'admin') {
        // Admin sees all tracking numbers - no filter needed
        console.log('📦 Admin mode: fetching ALL tracking numbers');
      } else if (userRole === 'delivery_provider') {
        // Delivery provider sees their assigned deliveries
        url += `&delivery_provider_id=eq.${userId}`;
        console.log('📦 Delivery provider mode: filtering by provider_id');
      } else {
        // Builders see their own tracking numbers - check both user_id and profile_id
        // Also check if builder_id is null (for testing)
        url += `&or=(builder_id.eq.${userId},builder_id.eq.${profileId})`;
        console.log('📦 Builder mode: filtering by userId:', userId, 'and profileId:', profileId);
      }

      console.log('📦 Fetching tracking numbers from:', url);

      const response = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTrackingNumbers(data || []);
        console.log('📦 Tracking numbers loaded:', data?.length || 0, data);
        
        // Debug: show what builder_ids exist in the data
        if (data && data.length > 0) {
          console.log('📦 Builder IDs in tracking numbers:', data.map((t: any) => t.builder_id));
        }
      } else {
        const errorText = await response.text();
        console.error('📦 Failed to fetch tracking numbers:', response.status, errorText);
        setTrackingNumbers([]);
      }
      
      // Also fetch ALL tracking numbers to see what exists (for debugging)
      if (userRole !== 'admin') {
        const allResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/tracking_numbers?select=id,tracking_number,builder_id,status&limit=10`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            }
          }
        );
        if (allResponse.ok) {
          const allData = await allResponse.json();
          console.log('📦 DEBUG - All tracking numbers in system:', allData);
          console.log('📦 DEBUG - Your userId is:', userId);
          console.log('📦 DEBUG - Your profileId is:', profileId);
        }
      }
    } catch (error) {
      console.error('📦 Error fetching tracking numbers:', error);
      setTrackingNumbers([]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Tracking number copied to clipboard',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
      pending: { label: 'Pending', variant: 'secondary', color: 'bg-gray-100 text-gray-700' },
      accepted: { label: 'Accepted', variant: 'default', color: 'bg-blue-100 text-blue-700' },
      picked_up: { label: 'Picked Up', variant: 'default', color: 'bg-purple-100 text-purple-700' },
      in_transit: { label: 'In Transit', variant: 'default', color: 'bg-orange-100 text-orange-700' },
      near_destination: { label: 'Near You', variant: 'default', color: 'bg-green-100 text-green-700' },
      delivered: { label: 'Delivered', variant: 'default', color: 'bg-green-500 text-white' },
      cancelled: { label: 'Cancelled', variant: 'destructive', color: 'bg-red-100 text-red-700' },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-gray-500" />;
      case 'accepted': return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case 'picked_up': return <Package className="h-4 w-4 text-purple-500" />;
      case 'in_transit': return <Truck className="h-4 w-4 text-orange-500" />;
      case 'near_destination': return <Navigation className="h-4 w-4 text-green-500" />;
      case 'delivered': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredTrackingNumbers = trackingNumbers.filter(tn => {
    const matchesSearch = searchQuery === '' || 
      tn.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tn.delivery_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tn.provider_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || tn.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const activeDeliveries = trackingNumbers.filter(tn => ['accepted', 'picked_up', 'in_transit', 'near_destination'].includes(tn.status));
  const completedDeliveries = trackingNumbers.filter(tn => tn.status === 'delivered');
  const pendingDeliveries = trackingNumbers.filter(tn => tn.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Tracking</p>
                <p className="text-3xl font-bold">{trackingNumbers.length}</p>
              </div>
              <Package className="h-10 w-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Active Deliveries</p>
                <p className="text-3xl font-bold">{activeDeliveries.length}</p>
              </div>
              <Truck className="h-10 w-10 text-orange-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Delivered</p>
                <p className="text-3xl font-bold">{completedDeliveries.length}</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-100 text-sm">Pending</p>
                <p className="text-3xl font-bold">{pendingDeliveries.length}</p>
              </div>
              <Clock className="h-10 w-10 text-gray-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Track Portal */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <MapPin className="h-5 w-5" />
            Quick Track Your Delivery
          </CardTitle>
          <CardDescription>
            Enter your tracking number to view real-time delivery status and location
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Enter tracking number (e.g., TRK-20260216-A7B3C)"
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                if (searchQuery) {
                  window.open(`/tracking?number=${searchQuery}`, '_blank');
                }
              }}
            >
              <Navigation className="h-4 w-4 mr-2" />
              Track Now
            </Button>
          </div>
          
          <div className="mt-4 p-4 bg-white rounded-lg border">
            <h4 className="font-medium text-gray-800 mb-2">📍 How to track your delivery:</h4>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Copy your tracking number from the list below</li>
              <li>Go to the <a href="/tracking" className="text-blue-600 hover:underline">Tracking Page</a></li>
              <li>Paste your tracking number and click "Track"</li>
              <li>View real-time location and status updates</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled'].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
            className={statusFilter === status ? 'bg-blue-600' : ''}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTrackingNumbers}
          className="ml-auto"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tracking Numbers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Tracking Numbers</CardTitle>
          <CardDescription>
            {userRole === 'admin' 
              ? 'All delivery tracking numbers in the system'
              : 'Track the status of your material deliveries'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : filteredTrackingNumbers.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700">No Tracking Numbers Yet</h3>
              <p className="text-gray-500 mt-2">
                {userRole === 'admin' 
                  ? 'Tracking numbers will appear here when delivery providers accept delivery requests.'
                  : 'When a delivery provider accepts your delivery request, a tracking number will be generated automatically.'}
              </p>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg max-w-md mx-auto">
                <h4 className="font-medium text-blue-800">How it works:</h4>
                <ol className="text-sm text-blue-700 mt-2 space-y-1 text-left list-decimal list-inside">
                  <li>Request a delivery for your materials</li>
                  <li>A delivery provider accepts your request</li>
                  <li>Tracking number is automatically generated</li>
                  <li>Track your delivery in real-time!</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Delivery Address</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrackingNumbers.map((tn) => (
                    <TableRow key={tn.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(tn.status)}
                          <div>
                            <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {tn.tracking_number}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 ml-2"
                              onClick={() => copyToClipboard(tn.tracking_number)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(tn.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 max-w-[200px]">
                          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate text-sm">{tn.delivery_address}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {tn.provider_name ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                {tn.provider_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{tn.provider_name}</p>
                              {tn.provider_phone && (
                                <p className="text-xs text-gray-500">{tn.provider_phone}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(tn.created_at), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(tn.created_at), 'h:mm a')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/tracking?number=${tn.tracking_number}`, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Track
                          </Button>
                          {tn.provider_phone && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`tel:${tn.provider_phone}`)}
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Deliveries Timeline */}
      {activeDeliveries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-orange-500" />
              Active Deliveries
            </CardTitle>
            <CardDescription>Deliveries currently in progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeDeliveries.map((delivery) => (
                <div 
                  key={delivery.id} 
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {delivery.tracking_number}
                      </code>
                      {getStatusBadge(delivery.status)}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 truncate">
                      {delivery.delivery_address}
                    </p>
                    {delivery.provider_name && (
                      <p className="text-xs text-gray-500 mt-1">
                        Driver: {delivery.provider_name}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={() => window.open(`/tracking?number=${delivery.tracking_number}`, '_blank')}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Live Track
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrackingTab;
