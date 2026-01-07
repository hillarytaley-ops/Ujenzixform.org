import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Users, Building2, Store, Truck, Search, CheckCircle, XCircle,
  RefreshCw, Download, Filter, AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Registration {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'builder' | 'supplier' | 'delivery';
  status: string;
  created_at: string;
}

interface RegistrationsTabProps {
  registrations: Registration[];
  loading: boolean;
  onApprove: (id: string, type: string) => Promise<void>;
  onReject: (id: string, type: string) => Promise<void>;
  onRefresh: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

// Empty State Component
const EmptyState: React.FC<{ type: string }> = ({ type }) => (
  <div className="text-center py-12">
    <Users className="h-16 w-16 mx-auto mb-4 text-gray-600" />
    <h3 className="text-lg font-medium text-gray-400 mb-2">No {type} Registrations</h3>
    <p className="text-sm text-gray-500">
      New registrations will appear here when users sign up.
    </p>
  </div>
);

// Bulk Actions Component
const BulkActions: React.FC<{
  selectedIds: string[];
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onClearSelection: () => void;
}> = ({ selectedIds, onBulkApprove, onBulkReject, onClearSelection }) => {
  if (selectedIds.length === 0) return null;

  return (
    <div className="flex items-center gap-3 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg mb-4">
      <span className="text-sm text-blue-300">
        {selectedIds.length} selected
      </span>
      <div className="flex gap-2 ml-auto">
        <Button 
          size="sm" 
          variant="outline" 
          className="text-green-400 border-green-600 hover:bg-green-600/20"
          onClick={onBulkApprove}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Approve All
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="text-red-400 border-red-600 hover:bg-red-600/20"
          onClick={onBulkReject}
        >
          <XCircle className="h-4 w-4 mr-1" />
          Reject All
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          className="text-gray-400"
          onClick={onClearSelection}
        >
          Clear
        </Button>
      </div>
    </div>
  );
};

// Registration Row Component
const RegistrationRow: React.FC<{
  registration: Registration;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onApprove: () => void;
  onReject: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
}> = ({ registration, isSelected, onSelect, onApprove, onReject, getStatusBadge }) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'builder': return <Building2 className="h-4 w-4 text-blue-400" />;
      case 'supplier': return <Store className="h-4 w-4 text-green-400" />;
      case 'delivery': return <Truck className="h-4 w-4 text-orange-400" />;
      default: return <Users className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <TableRow className="hover:bg-slate-800/50">
      <TableCell>
        <Checkbox 
          checked={isSelected}
          onCheckedChange={() => onSelect(registration.id)}
          disabled={registration.status !== 'pending'}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {getTypeIcon(registration.type)}
          <span className="text-white font-medium">{registration.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-gray-400">{registration.email}</TableCell>
      <TableCell className="text-gray-400">{registration.phone}</TableCell>
      <TableCell>
        <Badge variant="outline" className="capitalize">
          {registration.type}
        </Badge>
      </TableCell>
      <TableCell>{getStatusBadge(registration.status)}</TableCell>
      <TableCell className="text-gray-400 text-sm">
        {new Date(registration.created_at).toLocaleDateString()}
      </TableCell>
      <TableCell>
        {registration.status === 'pending' && (
          <div className="flex gap-2">
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700"
              onClick={onApprove}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={onReject}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
};

// Main Registrations Tab Component
export const RegistrationsTab: React.FC<RegistrationsTabProps> = ({
  registrations,
  loading,
  onApprove,
  onReject,
  onRefresh,
  getStatusBadge
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { toast } = useToast();

  // Filter registrations
  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch = 
      reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || reg.type === filterType;
    const matchesStatus = filterStatus === 'all' || reg.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const pendingCount = registrations.filter(r => r.status === 'pending').length;

  const handleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const pendingIds = filteredRegistrations
      .filter(r => r.status === 'pending')
      .map(r => r.id);
    setSelectedIds(prev => 
      prev.length === pendingIds.length ? [] : pendingIds
    );
  };

  const handleBulkApprove = async () => {
    for (const id of selectedIds) {
      const reg = registrations.find(r => r.id === id);
      if (reg) {
        await onApprove(id, reg.type);
      }
    }
    setSelectedIds([]);
    toast({
      title: "Bulk Approval Complete",
      description: `${selectedIds.length} registrations approved`,
    });
  };

  const handleBulkReject = async () => {
    for (const id of selectedIds) {
      const reg = registrations.find(r => r.id === id);
      if (reg) {
        await onReject(id, reg.type);
      }
    }
    setSelectedIds([]);
    toast({
      title: "Bulk Rejection Complete",
      description: `${selectedIds.length} registrations rejected`,
    });
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Type', 'Status', 'Date'];
    const csvData = filteredRegistrations.map(reg => [
      reg.name,
      reg.email,
      reg.phone,
      reg.type,
      reg.status,
      new Date(reg.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: `${filteredRegistrations.length} registrations exported`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-yellow-900/20 border-yellow-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-400">Pending</p>
                <p className="text-2xl font-bold text-white">{pendingCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-900/20 border-blue-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-400">Builders</p>
                <p className="text-2xl font-bold text-white">
                  {registrations.filter(r => r.type === 'builder').length}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-900/20 border-green-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-400">Suppliers</p>
                <p className="text-2xl font-bold text-white">
                  {registrations.filter(r => r.type === 'supplier').length}
                </p>
              </div>
              <Store className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-900/20 border-orange-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-400">Delivery</p>
                <p className="text-2xl font-bold text-white">
                  {registrations.filter(r => r.type === 'delivery').length}
                </p>
              </div>
              <Truck className="h-8 w-8 text-orange-500" />
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
                <Users className="h-5 w-5 text-blue-500" />
                User Registrations
              </CardTitle>
              <CardDescription className="text-gray-400">
                Manage and approve user registrations
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-48 bg-slate-800 border-slate-700"
                />
              </div>
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-white"
              >
                <option value="all">All Types</option>
                <option value="builder">Builders</option>
                <option value="supplier">Suppliers</option>
                <option value="delivery">Delivery</option>
              </select>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
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
          <BulkActions
            selectedIds={selectedIds}
            onBulkApprove={handleBulkApprove}
            onBulkReject={handleBulkReject}
            onClearSelection={() => setSelectedIds([])}
          />

          {filteredRegistrations.length === 0 ? (
            <EmptyState type={filterType === 'all' ? '' : filterType} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedIds.length > 0 && 
                          selectedIds.length === filteredRegistrations.filter(r => r.status === 'pending').length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-gray-400">Name</TableHead>
                    <TableHead className="text-gray-400">Email</TableHead>
                    <TableHead className="text-gray-400">Phone</TableHead>
                    <TableHead className="text-gray-400">Type</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Date</TableHead>
                    <TableHead className="text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.map((reg) => (
                    <RegistrationRow
                      key={reg.id}
                      registration={reg}
                      isSelected={selectedIds.includes(reg.id)}
                      onSelect={handleSelect}
                      onApprove={() => onApprove(reg.id, reg.type)}
                      onReject={() => onReject(reg.id, reg.type)}
                      getStatusBadge={getStatusBadge}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing {filteredRegistrations.length} of {registrations.length} registrations
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistrationsTab;




