import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Truck, 
  User, 
  Building, 
  MapPin, 
  Phone, 
  Mail, 
  Star, 
  Shield, 
  Search,
  Filter,
  Users,
  Package,
  Clock,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DeliveryProvider {
  id: string;
  provider_name: string;
  provider_type: 'individual' | 'company';
  phone: string;
  email?: string;
  address?: string;
  vehicle_types: string[];
  service_areas: string[];
  capacity_kg?: number;
  hourly_rate?: number;
  per_km_rate?: number;
  is_verified: boolean;
  is_active: boolean;
  rating?: number;
  total_deliveries?: number;
  contact_person?: string;
  // Company-specific fields
  company_registration_number?: string;
  fleet_size?: number;
  operating_years?: number;
  insurance_policy_number?: string;
  // Individual-specific fields
  national_id_number?: string;
  work_experience?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

interface DeliveryProviderDirectoryProps {
  userRole?: string;
  showAdminView?: boolean;
}

export const DeliveryProviderDirectory: React.FC<DeliveryProviderDirectoryProps> = ({ 
  userRole = 'guest',
  showAdminView = false 
}) => {
  const [providers, setProviders] = useState<DeliveryProvider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<DeliveryProvider[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    filterProviders();
  }, [providers, searchTerm, selectedType, selectedArea, selectedVehicle]);

  const loadProviders = async () => {
    try {
      setLoading(true);
      
      // In production, this would use the secure function
      // For now, using mock data that respects access controls
      const mockProviders: DeliveryProvider[] = [
        // Private Delivery Providers
        {
          id: 'prv-001',
          provider_name: 'John Kamau',
          provider_type: 'individual',
          phone: showAdminView ? '+254 712 345 678' : 'Protected',
          email: showAdminView ? 'john.kamau@email.com' : 'Protected',
          address: showAdminView ? 'Nairobi, Kenya' : 'Nairobi Area',
          vehicle_types: ['motorcycle', 'van'],
          service_areas: ['nairobi', 'thika'],
          capacity_kg: 50,
          hourly_rate: showAdminView ? 800 : undefined,
          per_km_rate: showAdminView ? 50 : undefined,
          is_verified: true,
          is_active: true,
          rating: 4.8,
          total_deliveries: 156,
          national_id_number: showAdminView ? '12345678' : undefined,
          work_experience: 3,
          emergency_contact_name: showAdminView ? 'Mary Kamau' : undefined,
          emergency_contact_phone: showAdminView ? '+254 722 123 456' : undefined
        },
        {
          id: 'prv-002',
          provider_name: 'Grace Wanjiku',
          provider_type: 'individual',
          phone: showAdminView ? '+254 723 456 789' : 'Protected',
          email: showAdminView ? 'grace.wanjiku@email.com' : 'Protected',
          address: showAdminView ? 'Kisumu, Kenya' : 'Kisumu Area',
          vehicle_types: ['pickup', 'van'],
          service_areas: ['kisumu', 'nakuru'],
          capacity_kg: 200,
          hourly_rate: showAdminView ? 1000 : undefined,
          per_km_rate: showAdminView ? 60 : undefined,
          is_verified: true,
          is_active: true,
          rating: 4.9,
          total_deliveries: 89,
          work_experience: 2,
          emergency_contact_name: showAdminView ? 'Peter Wanjiku' : undefined,
          emergency_contact_phone: showAdminView ? '+254 734 567 890' : undefined
        },
        // Delivery Companies
        {
          id: 'cmp-001',
          provider_name: 'Swift Logistics Ltd',
          provider_type: 'company',
          phone: showAdminView ? '+254 700 123 456' : 'Protected',
          email: showAdminView ? 'info@swiftlogistics.co.ke' : 'Protected',
          address: showAdminView ? 'Industrial Area, Nairobi' : 'Nairobi Area',
          vehicle_types: ['truck', 'trailer', 'van'],
          service_areas: ['nairobi', 'mombasa', 'kisumu', 'nakuru'],
          capacity_kg: 5000,
          hourly_rate: showAdminView ? 2500 : undefined,
          per_km_rate: showAdminView ? 120 : undefined,
          is_verified: true,
          is_active: true,
          rating: 4.7,
          total_deliveries: 1250,
          contact_person: showAdminView ? 'David Mwangi' : 'Contact Available',
          company_registration_number: showAdminView ? 'C.123456' : undefined,
          fleet_size: 15,
          operating_years: 8,
          insurance_policy_number: showAdminView ? 'INS-789456' : undefined
        },
        {
          id: 'cmp-002',
          provider_name: 'Coastal Delivery Services',
          provider_type: 'company',
          phone: showAdminView ? '+254 711 234 567' : 'Protected',
          email: showAdminView ? 'operations@coastal-delivery.com' : 'Protected',
          address: showAdminView ? 'Mombasa, Kenya' : 'Mombasa Area',
          vehicle_types: ['truck', 'pickup', 'motorcycle'],
          service_areas: ['mombasa', 'nairobi'],
          capacity_kg: 3000,
          hourly_rate: showAdminView ? 2000 : undefined,
          per_km_rate: showAdminView ? 100 : undefined,
          is_verified: true,
          is_active: true,
          rating: 4.6,
          total_deliveries: 890,
          contact_person: showAdminView ? 'Sarah Ochieng' : 'Contact Available',
          company_registration_number: showAdminView ? 'C.654321' : undefined,
          fleet_size: 8,
          operating_years: 5,
          insurance_policy_number: showAdminView ? 'INS-456789' : undefined
        }
      ];

      setProviders(mockProviders);
    } catch (error) {
      console.error('Error loading providers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load delivery providers',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterProviders = () => {
    let filtered = providers;

    if (searchTerm) {
      filtered = filtered.filter(provider => 
        provider.provider_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.service_areas.some(area => area.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(provider => provider.provider_type === selectedType);
    }

    if (selectedArea !== 'all') {
      filtered = filtered.filter(provider => 
        provider.service_areas.includes(selectedArea)
      );
    }

    if (selectedVehicle !== 'all') {
      filtered = filtered.filter(provider => 
        provider.vehicle_types.includes(selectedVehicle)
      );
    }

    setFilteredProviders(filtered);
  };

  const getProviderTypeIcon = (type: string) => {
    return type === 'company' ? <Building className="h-4 w-4" /> : <User className="h-4 w-4" />;
  };

  const getProviderTypeBadge = (type: string) => {
    return type === 'company' 
      ? <Badge className="bg-blue-100 text-blue-800">Delivery Company</Badge>
      : <Badge className="bg-green-100 text-green-800">Private Provider</Badge>;
  };

  const ProviderCard = ({ provider }: { provider: DeliveryProvider }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getProviderTypeIcon(provider.provider_type)}
            <div>
              <CardTitle className="text-lg">{provider.provider_name}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                {provider.provider_type === 'company' && provider.contact_person && (
                  <span>Contact: {provider.contact_person}</span>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getProviderTypeBadge(provider.provider_type)}
            {provider.is_verified && (
              <Badge className="bg-green-100 text-green-800">
                <Shield className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{provider.address || 'Location Protected'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{provider.phone}</span>
          </div>
          {provider.rating && (
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>{provider.rating}/5 ({provider.total_deliveries} deliveries)</span>
            </div>
          )}
          {provider.capacity_kg && (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>Up to {provider.capacity_kg}kg</span>
            </div>
          )}
        </div>

        {/* Vehicle Types */}
        <div>
          <h4 className="font-medium text-sm mb-2">Vehicle Types:</h4>
          <div className="flex flex-wrap gap-1">
            {provider.vehicle_types.map((vehicle, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {vehicle}
              </Badge>
            ))}
          </div>
        </div>

        {/* Service Areas */}
        <div>
          <h4 className="font-medium text-sm mb-2">Service Areas:</h4>
          <div className="flex flex-wrap gap-1">
            {provider.service_areas.map((area, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {area}
              </Badge>
            ))}
          </div>
        </div>

        {/* Provider Type Specific Information */}
        {provider.provider_type === 'company' && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-sm text-blue-800 mb-2">Company Details:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
              {provider.fleet_size && (
                <div>Fleet Size: {provider.fleet_size} vehicles</div>
              )}
              {provider.operating_years && (
                <div>Experience: {provider.operating_years} years</div>
              )}
            </div>
          </div>
        )}

        {provider.provider_type === 'individual' && (
          <div className="p-3 bg-green-50 rounded-lg">
            <h4 className="font-medium text-sm text-green-800 mb-2">Provider Details:</h4>
            <div className="text-xs text-green-700">
              {provider.work_experience && (
                <div>Experience: {provider.work_experience} years in delivery</div>
              )}
            </div>
          </div>
        )}

        {/* Pricing Information (Admin Only) */}
        {showAdminView && (provider.hourly_rate || provider.per_km_rate) && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Pricing:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {provider.hourly_rate && (
                <div>Hourly: KES {provider.hourly_rate}</div>
              )}
              {provider.per_km_rate && (
                <div>Per KM: KES {provider.per_km_rate}</div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {showAdminView ? (
            <>
              <Button size="sm" className="flex-1">
                <Phone className="h-4 w-4 mr-2" />
                Contact
              </Button>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" className="w-full">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Contact via Admin
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Delivery Provider Directory</h2>
          <p className="text-muted-foreground">
            {showAdminView 
              ? 'Manage and contact delivery providers' 
              : 'Browse available delivery providers (Contact details protected)'
            }
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {filteredProviders.length} Providers
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search providers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Provider Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="individual">Private Providers</SelectItem>
                <SelectItem value="company">Delivery Companies</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedArea} onValueChange={setSelectedArea}>
              <SelectTrigger>
                <SelectValue placeholder="Service Area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Areas</SelectItem>
                <SelectItem value="nairobi">Nairobi</SelectItem>
                <SelectItem value="mombasa">Mombasa</SelectItem>
                <SelectItem value="kisumu">Kisumu</SelectItem>
                <SelectItem value="nakuru">Nakuru</SelectItem>
                <SelectItem value="thika">Thika</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger>
                <SelectValue placeholder="Vehicle Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                <SelectItem value="motorcycle">Motorcycle</SelectItem>
                <SelectItem value="van">Van</SelectItem>
                <SelectItem value="pickup">Pickup</SelectItem>
                <SelectItem value="truck">Truck</SelectItem>
                <SelectItem value="trailer">Trailer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Provider Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Providers ({filteredProviders.length})
          </TabsTrigger>
          <TabsTrigger value="individual" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Private ({filteredProviders.filter(p => p.provider_type === 'individual').length})
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Companies ({filteredProviders.filter(p => p.provider_type === 'company').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="individual" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders
              .filter(p => p.provider_type === 'individual')
              .map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="company" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders
              .filter(p => p.provider_type === 'company')
              .map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {filteredProviders.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Providers Found</h3>
            <p className="text-muted-foreground">
              No delivery providers match your current filters. Try adjusting your search criteria.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DeliveryProviderDirectory;

















