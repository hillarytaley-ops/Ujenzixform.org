import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Truck, 
  MapPin, 
  Clock, 
  Package, 
  Phone, 
  Navigation,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Bell,
  Search,
  Filter,
  Plus,
  Eye,
  MessageSquare,
  Star,
  AlertTriangle,
  CheckCircle,
  Menu,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import GPSTracker from './GPSTracker';
import { DeliveryNotificationSystem } from './DeliveryNotificationSystem';
import { DeliveryCostCalculator } from './DeliveryCostCalculator';

interface MobileDelivery {
  id: string;
  tracking_number: string;
  material_type: string;
  status: 'pending' | 'dispatched' | 'in_transit' | 'arriving' | 'delivered';
  provider_name: string;
  provider_type: 'individual' | 'company';
  estimated_arrival: string;
  current_location?: string;
  progress: number;
  priority: 'low' | 'medium' | 'high';
}

interface MobileDeliveryInterfaceProps {
  userId?: string;
  userRole?: string;
}

export const MobileDeliveryInterface: React.FC<MobileDeliveryInterfaceProps> = ({ 
  userId,
  userRole = 'builder' 
}) => {
  const [deliveries, setDeliveries] = useState<MobileDelivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'tracking' | 'calculator' | 'notifications'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      
      // Mock mobile-optimized delivery data
      const mockDeliveries: MobileDelivery[] = [
        {
          id: 'del-001',
          tracking_number: 'UJP-001-2024',
          material_type: 'Cement Bags',
          status: 'in_transit',
          provider_name: 'John Kamau',
          provider_type: 'individual',
          estimated_arrival: new Date(Date.now() + 1800000).toISOString(), // 30 minutes
          current_location: 'Thika Road, 5km away',
          progress: 75,
          priority: 'high'
        },
        {
          id: 'del-002',
          tracking_number: 'UJP-002-2024',
          material_type: 'Steel Bars',
          status: 'dispatched',
          provider_name: 'Swift Logistics',
          provider_type: 'company',
          estimated_arrival: new Date(Date.now() + 7200000).toISOString(), // 2 hours
          current_location: 'Loading at warehouse',
          progress: 25,
          priority: 'medium'
        },
        {
          id: 'del-003',
          tracking_number: 'UJP-003-2024',
          material_type: 'Building Blocks',
          status: 'arriving',
          provider_name: 'Grace Wanjiku',
          provider_type: 'individual',
          estimated_arrival: new Date(Date.now() + 600000).toISOString(), // 10 minutes
          current_location: 'At site entrance',
          progress: 95,
          priority: 'high'
        }
      ];

      setDeliveries(mockDeliveries);
    } catch (error) {
      console.error('Error loading deliveries:', error);
      toast({
        title: 'Error',
        description: 'Failed to load deliveries',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'dispatched': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-yellow-100 text-yellow-800';
      case 'arriving': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-300';
    }
  };

  const getProviderIcon = (type: string) => {
    return type === 'company' ? <Building className="h-4 w-4" /> : <Truck className="h-4 w-4" />;
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = delivery.material_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.tracking_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || delivery.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const MobileHeader = () => (
    <div className="sticky top-0 z-40 bg-background border-b p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Deliveries</h1>
          <p className="text-sm text-muted-foreground">
            {filteredDeliveries.length} active deliveries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowMenu(!showMenu)}>
            {showMenu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMenu && (
        <div className="mt-4 p-4 bg-card border rounded-lg space-y-2">
          <Button 
            variant={activeView === 'list' ? 'default' : 'ghost'} 
            className="w-full justify-start"
            onClick={() => { setActiveView('list'); setShowMenu(false); }}
          >
            <Truck className="h-4 w-4 mr-2" />
            Delivery List
          </Button>
          <Button 
            variant={activeView === 'notifications' ? 'default' : 'ghost'} 
            className="w-full justify-start"
            onClick={() => { setActiveView('notifications'); setShowMenu(false); }}
          >
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </Button>
          <Button 
            variant={activeView === 'calculator' ? 'default' : 'ghost'} 
            className="w-full justify-start"
            onClick={() => { setActiveView('calculator'); setShowMenu(false); }}
          >
            <Calculator className="h-4 w-4 mr-2" />
            Cost Calculator
          </Button>
        </div>
      )}
    </div>
  );

  const MobileDeliveryCard = ({ delivery }: { delivery: MobileDelivery }) => (
    <Card className={`border-l-4 ${getPriorityColor(delivery.priority)} mb-4`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">{delivery.material_type}</h3>
              <p className="text-sm text-muted-foreground">{delivery.tracking_number}</p>
            </div>
            <Badge className={getStatusColor(delivery.status)}>
              {delivery.status}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Progress</span>
              <span>{delivery.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${delivery.progress}%` }}
              />
            </div>
          </div>

          {/* Provider Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getProviderIcon(delivery.provider_type)}
              <span className="text-sm">{delivery.provider_name}</span>
              <Badge variant="outline" className="text-xs">
                {delivery.provider_type === 'company' ? 'Company' : 'Private'}
              </Badge>
            </div>
          </div>

          {/* Location & ETA */}
          {delivery.current_location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{delivery.current_location}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>ETA: {format(new Date(delivery.estimated_arrival), 'HH:mm')}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              className="flex-1"
              onClick={() => {
                setSelectedDelivery(delivery.id);
                setActiveView('tracking');
              }}
            >
              <Navigation className="h-4 w-4 mr-2" />
              Track
            </Button>
            {userRole === 'admin' && (
              <Button variant="outline" size="sm">
                <Phone className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const MobileSearchAndFilter = () => (
    <div className="p-4 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search deliveries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'pending', 'dispatched', 'in_transit', 'arriving', 'delivered'].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            className="whitespace-nowrap"
            onClick={() => setStatusFilter(status)}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
          </Button>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader />

      {activeView === 'list' && (
        <div>
          <MobileSearchAndFilter />
          <div className="p-4 space-y-4">
            {filteredDeliveries.map((delivery) => (
              <MobileDeliveryCard key={delivery.id} delivery={delivery} />
            ))}
            
            {filteredDeliveries.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No Deliveries Found</h3>
                  <p className="text-sm text-muted-foreground">
                    {deliveries.length === 0 
                      ? "No active deliveries at the moment"
                      : "No deliveries match your search criteria"
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeView === 'tracking' && selectedDelivery && (
        <div className="p-4">
          <div className="mb-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setActiveView('list')}
            >
              ← Back to List
            </Button>
          </div>
          <GPSTracker 
            deliveryId={selectedDelivery} 
            userRole={userRole}
            showDriverContact={userRole === 'admin'}
            autoRefresh={true}
          />
        </div>
      )}

      {activeView === 'notifications' && (
        <div className="p-4">
          <DeliveryNotificationSystem 
            userId={userId}
            userRole={userRole}
            embedded={false}
          />
        </div>
      )}

      {activeView === 'calculator' && (
        <div className="p-4">
          <DeliveryCostCalculator embedded={false} />
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-2">
        <div className="grid grid-cols-4 gap-1">
          <Button
            variant={activeView === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-2"
            onClick={() => setActiveView('list')}
          >
            <Truck className="h-4 w-4" />
            <span className="text-xs">Deliveries</span>
          </Button>
          
          <Button
            variant={activeView === 'tracking' ? 'default' : 'ghost'}
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-2"
            onClick={() => {
              if (deliveries.length > 0) {
                setSelectedDelivery(deliveries[0].id);
                setActiveView('tracking');
              }
            }}
          >
            <Navigation className="h-4 w-4" />
            <span className="text-xs">Tracking</span>
          </Button>
          
          <Button
            variant={activeView === 'notifications' ? 'default' : 'ghost'}
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-2"
            onClick={() => setActiveView('notifications')}
          >
            <Bell className="h-4 w-4" />
            <span className="text-xs">Alerts</span>
          </Button>
          
          <Button
            variant={activeView === 'calculator' ? 'default' : 'ghost'}
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-2"
            onClick={() => setActiveView('calculator')}
          >
            <Calculator className="h-4 w-4" />
            <span className="text-xs">Calculator</span>
          </Button>
        </div>
      </div>

      {/* Add bottom padding to prevent content being hidden behind bottom nav */}
      <div className="h-20"></div>
    </div>
  );
};

export default MobileDeliveryInterface;















