import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Truck,
  Search,
  RefreshCw,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  MapPin,
  Car,
  Calendar,
  Clock,
  FileText,
  ExternalLink,
  Shield,
  Star,
  Package,
  Route,
  CreditCard,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DeliveryProviderRecord {
  id: string;
  auth_user_id?: string;
  full_name: string;
  email: string;
  phone: string;
  id_number?: string;
  company_name?: string;
  business_registration_number?: string;
  is_company?: boolean;
  county: string;
  town?: string;
  physical_address?: string;
  service_areas: string[];
  vehicle_type: string;
  vehicle_registration: string;
  vehicle_capacity_kg?: number;
  vehicle_capacity_description?: string;
  vehicle_photo_url?: string;
  driving_license_number: string;
  driving_license_class?: string;
  driving_license_expiry?: string;
  years_driving_experience?: number;
  insurance_provider?: string;
  insurance_policy_number?: string;
  insurance_expiry?: string;
  ntsa_compliance?: boolean;
  good_conduct_certificate_url?: string;
  base_rate_per_km?: number;
  minimum_charge?: number;
  available_days?: string[];
  available_hours_start?: string;
  available_hours_end?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  background_check_consent?: boolean;
  terms_accepted?: boolean;
  is_verified?: boolean;
  is_active?: boolean;
  status: string;
  source?: 'registration' | 'active';
  created_at: string;
  updated_at?: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

interface DeliveryProvidersRegisterProps {
  providers: DeliveryProviderRecord[];
  loading: boolean;
  onRefresh: () => void;
  onUpdateStatus: (id: string, status: string) => void;
}

export const DeliveryProvidersRegister: React.FC<DeliveryProvidersRegisterProps> = ({
  providers,
  loading,
  onRefresh,
  onUpdateStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterVehicleType, setFilterVehicleType] = useState<string>('all');
  const [filterCounty, setFilterCounty] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<DeliveryProviderRecord | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { toast } = useToast();

  // Get unique values for filters
  const { counties, vehicleTypes } = useMemo(() => {
    const uniqueCounties = [...new Set(providers.map(p => p.county).filter(Boolean))].sort();
    const uniqueVehicleTypes = [...new Set(providers.map(p => p.vehicle_type).filter(Boolean))].sort();
    return { counties: uniqueCounties, vehicleTypes: uniqueVehicleTypes };
  }, [providers]);

  // Filter providers
  const filteredProviders = useMemo(() => {
    return providers.filter(provider => {
      const matchesSearch = 
        provider.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.phone?.includes(searchTerm) ||
        provider.vehicle_registration?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || provider.status === filterStatus;
      const matchesVehicle = filterVehicleType === 'all' || provider.vehicle_type === filterVehicleType;
      const matchesCounty = filterCounty === 'all' || provider.county === filterCounty;
      return matchesSearch && matchesStatus && matchesVehicle && matchesCounty;
    });
  }, [providers, searchTerm, filterStatus, filterVehicleType, filterCounty]);

  // Stats
  const stats = useMemo(() => ({
    total: providers.length,
    pending: providers.filter(p => p.status === 'pending').length,
    approved: providers.filter(p => p.status === 'approved').length,
    active: providers.filter(p => p.status === 'active' || p.source === 'active').length,
    rejected: providers.filter(p => p.status === 'rejected').length,
    companies: providers.filter(p => p.is_company).length,
    individuals: providers.filter(p => !p.is_company).length,
  }), [providers]);

  const getStatusBadge = (status: string, source?: string) => {
    if (source === 'active') {
      return <Badge className="bg-emerald-600">Active</Badge>;
    }
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600">Pending</Badge>;
      case 'active':
        return <Badge className="bg-emerald-600">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-orange-600">Suspended</Badge>;
      default:
        return <Badge className="bg-gray-600">{status}</Badge>;
    }
  };

  const getVehicleBadge = (vehicleType: string) => {
    const colors: Record<string, string> = {
      'motorcycle': 'bg-purple-600',
      'pickup': 'bg-blue-600',
      'van': 'bg-indigo-600',
      'truck': 'bg-orange-600',
      'lorry': 'bg-red-600',
    };
    return <Badge className={colors[vehicleType?.toLowerCase()] || 'bg-gray-600'}>{vehicleType}</Badge>;
  };

  const handleViewDetails = (provider: DeliveryProviderRecord) => {
    setSelectedProvider(provider);
    setShowDetailsModal(true);
  };

  const handleApprove = (provider: DeliveryProviderRecord) => {
    onUpdateStatus(provider.id, 'approved');
    toast({
      title: 'Provider Approved',
      description: `${provider.full_name} has been approved.`,
    });
  };

  const handleReject = (provider: DeliveryProviderRecord) => {
    onUpdateStatus(provider.id, 'rejected');
    toast({
      title: 'Provider Rejected',
      description: `${provider.full_name} has been rejected.`,
    });
  };

  const exportToCSV = () => {
    const headers = [
      'Full Name', 'Email', 'Phone', 'Company Name', 'County', 'Town',
      'Vehicle Type', 'Vehicle Registration', 'License Number', 'Service Areas',
      'Base Rate/km', 'Status', 'Created At'
    ];
    const csvData = filteredProviders.map(p => [
      p.full_name,
      p.email,
      p.phone,
      p.company_name || '',
      p.county,
      p.town || '',
      p.vehicle_type,
      p.vehicle_registration,
      p.driving_license_number,
      p.service_areas?.join('; ') || '',
      p.base_rate_per_km || '',
      p.status,
      new Date(p.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delivery-providers-register-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: `${filteredProviders.length} delivery providers exported to CSV`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Providers</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Truck className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-900/20 border-yellow-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-400">Pending</p>
                <p className="text-2xl font-bold text-white">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-900/20 border-green-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-400">Approved</p>
                <p className="text-2xl font-bold text-white">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-900/20 border-emerald-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-400">Active</p>
                <p className="text-2xl font-bold text-white">{stats.active}</p>
              </div>
              <Truck className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-900/20 border-red-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-400">Rejected</p>
                <p className="text-2xl font-bold text-white">{stats.rejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-900/20 border-blue-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-400">Companies</p>
                <p className="text-2xl font-bold text-white">{stats.companies}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-900/20 border-purple-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-400">Individuals</p>
                <p className="text-2xl font-bold text-white">{stats.individuals}</p>
              </div>
              <Car className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Truck className="h-5 w-5 text-orange-500" />
                Registered Delivery Providers
              </CardTitle>
              <CardDescription className="text-gray-400">
                Complete register of all delivery provider applications and registrations
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search providers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-48 bg-slate-800 border-slate-700"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="active">Active</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={filterVehicleType}
                onChange={(e) => setFilterVehicleType(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-white"
              >
                <option value="all">All Vehicles</option>
                {vehicleTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <select
                value={filterCounty}
                onChange={(e) => setFilterCounty(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-white"
              >
                <option value="all">All Counties</option>
                {counties.map(county => (
                  <option key={county} value={county}>{county}</option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
              <p className="text-gray-400">Loading delivery providers...</p>
            </div>
          ) : filteredProviders.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-16 w-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No Delivery Providers Found</h3>
              <p className="text-sm text-gray-500">
                No delivery providers match your current filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-gray-400">Provider</TableHead>
                    <TableHead className="text-gray-400">Contact</TableHead>
                    <TableHead className="text-gray-400">Location</TableHead>
                    <TableHead className="text-gray-400">Vehicle</TableHead>
                    <TableHead className="text-gray-400">Service Areas</TableHead>
                    <TableHead className="text-gray-400">Rates</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Registered</TableHead>
                    <TableHead className="text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProviders.map((provider) => (
                    <TableRow key={provider.id} className="hover:bg-slate-800/50 border-slate-700">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-orange-600/20 rounded-lg">
                            <Truck className="h-4 w-4 text-orange-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{provider.full_name}</p>
                            {provider.company_name && (
                              <p className="text-xs text-gray-400">{provider.company_name}</p>
                            )}
                            {provider.is_company && (
                              <Badge variant="outline" className="text-xs mt-1">Company</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Mail className="h-3 w-3" />
                            <span>{provider.email}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Phone className="h-3 w-3" />
                            <span>{provider.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-300">
                          <MapPin className="h-3 w-3 text-gray-500" />
                          <span>{provider.county}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getVehicleBadge(provider.vehicle_type)}
                          <p className="text-xs text-gray-400">{provider.vehicle_registration}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {provider.service_areas?.slice(0, 2).map((area, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                          {provider.service_areas?.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{provider.service_areas.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300 text-sm">
                        {provider.base_rate_per_km ? (
                          <span>KES {provider.base_rate_per_km}/km</span>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(provider.status, provider.source)}</TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {new Date(provider.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-blue-400 hover:text-blue-300"
                            onClick={() => handleViewDetails(provider)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {provider.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-400 hover:text-green-300"
                                onClick={() => handleApprove(provider)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300"
                                onClick={() => handleReject(provider)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing {filteredProviders.length} of {providers.length} delivery providers
          </div>
        </CardContent>
      </Card>

      {/* Provider Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Truck className="h-5 w-5 text-orange-500" />
              Delivery Provider Details
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Complete registration information for {selectedProvider?.full_name}
            </DialogDescription>
          </DialogHeader>
          {selectedProvider && (
            <div className="space-y-6">
              {/* Personal Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-400">Personal Information</h4>
                  <div className="bg-slate-800 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Full Name:</span>
                      <span className="text-white">{selectedProvider.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">ID Number:</span>
                      <span className="text-white">{selectedProvider.id_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white">{selectedProvider.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Phone:</span>
                      <span className="text-white">{selectedProvider.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">County:</span>
                      <span className="text-white">{selectedProvider.county}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Address:</span>
                      <span className="text-white text-right">{selectedProvider.physical_address || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-400">Company Information</h4>
                  <div className="bg-slate-800 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Is Company:</span>
                      <span className="text-white">{selectedProvider.is_company ? 'Yes' : 'No'}</span>
                    </div>
                    {selectedProvider.is_company && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Company Name:</span>
                          <span className="text-white">{selectedProvider.company_name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Business Reg #:</span>
                          <span className="text-white">{selectedProvider.business_registration_number || 'N/A'}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Emergency Contact:</span>
                      <span className="text-white">{selectedProvider.emergency_contact_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Emergency Phone:</span>
                      <span className="text-white">{selectedProvider.emergency_contact_phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehicle Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-400">Vehicle Information</h4>
                  <div className="bg-slate-800 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Vehicle Type:</span>
                      {getVehicleBadge(selectedProvider.vehicle_type)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Registration:</span>
                      <span className="text-white font-mono">{selectedProvider.vehicle_registration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Capacity:</span>
                      <span className="text-white">
                        {selectedProvider.vehicle_capacity_kg ? `${selectedProvider.vehicle_capacity_kg} kg` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Capacity Description:</span>
                      <span className="text-white text-right">{selectedProvider.vehicle_capacity_description || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-400">License Information</h4>
                  <div className="bg-slate-800 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">License Number:</span>
                      <span className="text-white font-mono">{selectedProvider.driving_license_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">License Class:</span>
                      <span className="text-white">{selectedProvider.driving_license_class || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Expiry:</span>
                      <span className="text-white">
                        {selectedProvider.driving_license_expiry 
                          ? new Date(selectedProvider.driving_license_expiry).toLocaleDateString() 
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Experience:</span>
                      <span className="text-white">
                        {selectedProvider.years_driving_experience 
                          ? `${selectedProvider.years_driving_experience} years` 
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Insurance & Compliance */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-400">Insurance & Compliance</h4>
                <div className="bg-slate-800 p-4 rounded-lg">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Insurance Provider:</span>
                      <span className="text-white">{selectedProvider.insurance_provider || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Policy Number:</span>
                      <span className="text-white">{selectedProvider.insurance_policy_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Insurance Expiry:</span>
                      <span className="text-white">
                        {selectedProvider.insurance_expiry 
                          ? new Date(selectedProvider.insurance_expiry).toLocaleDateString() 
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">NTSA Compliant:</span>
                      {selectedProvider.ntsa_compliance ? (
                        <Badge className="bg-green-600">Yes</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Background Check:</span>
                      {selectedProvider.background_check_consent ? (
                        <Badge className="bg-green-600">Consented</Badge>
                      ) : (
                        <Badge variant="outline">Not Consented</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Service & Rates */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-400">Service Areas & Rates</h4>
                <div className="bg-slate-800 p-4 rounded-lg space-y-3">
                  <div>
                    <span className="text-gray-400">Service Areas:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedProvider.service_areas?.map((area, i) => (
                        <Badge key={i} className="bg-orange-600">{area}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-400">Base Rate:</span>
                      <span className="text-white">
                        {selectedProvider.base_rate_per_km ? `KES ${selectedProvider.base_rate_per_km}/km` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Min Charge:</span>
                      <span className="text-white">
                        {selectedProvider.minimum_charge ? `KES ${selectedProvider.minimum_charge}` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  {selectedProvider.available_days && (
                    <div className="mt-2">
                      <span className="text-gray-400">Available Days:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedProvider.available_days.map((day, i) => (
                          <Badge key={i} variant="outline">{day}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-4 mt-2">
                    <div>
                      <span className="text-gray-400">Hours:</span>
                      <span className="text-white ml-2">
                        {selectedProvider.available_hours_start || 'N/A'} - {selectedProvider.available_hours_end || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-400">Documents</h4>
                <div className="bg-slate-800 p-4 rounded-lg">
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedProvider.vehicle_photo_url && (
                      <a
                        href={selectedProvider.vehicle_photo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                      >
                        <Car className="h-4 w-4" />
                        Vehicle Photo
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {selectedProvider.good_conduct_certificate_url && (
                      <a
                        href={selectedProvider.good_conduct_certificate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                      >
                        <Shield className="h-4 w-4" />
                        Good Conduct Certificate
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center justify-between border-t border-slate-700 pt-4">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <span className="ml-2">{getStatusBadge(selectedProvider.status)}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    Registered: {new Date(selectedProvider.created_at).toLocaleDateString()}
                  </div>
                  {selectedProvider.reviewed_at && (
                    <div className="text-sm text-gray-400">
                      Reviewed: {new Date(selectedProvider.reviewed_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
                {selectedProvider.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        handleApprove(selectedProvider);
                        setShowDetailsModal(false);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleReject(selectedProvider);
                        setShowDetailsModal(false);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryProvidersRegister;




















