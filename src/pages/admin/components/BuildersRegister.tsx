import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Building2,
  Search,
  RefreshCw,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Award,
  Clock,
  FileText,
  ExternalLink,
  Hammer,
  Shield,
  MoreVertical,
  Pencil,
  Trash2,
  UserMinus,
  Loader2,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { BuilderEditPatch } from '../types';

interface BuilderRecord {
  id: string;
  auth_user_id?: string;
  db_user_role?: string;
  full_name: string;
  email: string;
  phone: string;
  company_name?: string;
  business_registration_number?: string;
  nca_license_number?: string;
  kra_pin?: string;
  county: string;
  town?: string;
  physical_address?: string;
  builder_type: string;
  builder_category: string;
  years_experience?: number;
  specialties?: string[];
  portfolio_url?: string;
  insurance_details?: string;
  project_types?: string[];
  project_timeline?: string;
  budget_range?: string;
  project_description?: string;
  property_type?: string;
  id_document_url?: string;
  business_certificate_url?: string;
  nca_certificate_url?: string;
  profile_photo_url?: string;
  status: string;
  reviewed_by?: string;
  created_at: string;
  updated_at?: string;
}

interface BuildersRegisterProps {
  builders: BuilderRecord[];
  loading: boolean;
  onRefresh: () => void;
  onUpdateStatus: (id: string, status: string, opts?: { rowEmail?: string }) => void;
  onSaveBuilderEdit: (builder: BuilderRecord, patch: BuilderEditPatch) => Promise<void>;
  onDemoteBuilder: (builder: BuilderRecord) => Promise<void>;
  onDeleteBuilder: (builder: BuilderRecord) => Promise<void>;
}

const isSyntheticBuilderRow = (b: BuilderRecord) => b.id.startsWith('role-');

const formatRegisteredDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};

export const BuildersRegister: React.FC<BuildersRegisterProps> = ({
  builders,
  loading,
  onRefresh,
  onUpdateStatus,
  onSaveBuilderEdit,
  onDemoteBuilder,
  onDeleteBuilder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterCounty, setFilterCounty] = useState<string>('all');
  const [selectedBuilder, setSelectedBuilder] = useState<BuilderRecord | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editBuilder, setEditBuilder] = useState<BuilderRecord | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    company_name: '',
    county: '',
    town: '',
    physical_address: '',
    status: 'pending',
  });
  const [confirmDanger, setConfirmDanger] = useState<null | { type: 'demote' | 'delete'; builder: BuilderRecord }>(
    null
  );
  const [actionBusy, setActionBusy] = useState(false);
  const { toast } = useToast();

  // Get unique values for filters
  const { counties, categories } = useMemo(() => {
    const uniqueCounties = [...new Set(builders.map(b => b.county).filter(Boolean))].sort();
    const uniqueCategories = [...new Set(builders.map(b => b.builder_category).filter(Boolean))].sort();
    return { counties: uniqueCounties, categories: uniqueCategories };
  }, [builders]);

  // Filter builders
  const filteredBuilders = useMemo(() => {
    return builders.filter(builder => {
      const matchesSearch = 
        builder.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        builder.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        builder.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        builder.phone?.includes(searchTerm);
      const matchesStatus = filterStatus === 'all' || builder.status === filterStatus;
      const matchesCategory = filterCategory === 'all' || builder.builder_category === filterCategory;
      const matchesCounty = filterCounty === 'all' || builder.county === filterCounty;
      return matchesSearch && matchesStatus && matchesCategory && matchesCounty;
    });
  }, [builders, searchTerm, filterStatus, filterCategory, filterCounty]);

  // Stats
  const stats = useMemo(() => ({
    total: builders.length,
    pending: builders.filter(b => b.status === 'pending').length,
    approved: builders.filter(b => b.status === 'approved').length,
    rejected: builders.filter(b => b.status === 'rejected').length,
    onHold: builders.filter(b => b.status === 'on_hold').length,
    professional: builders.filter(b => b.builder_category === 'professional').length,
    private: builders.filter(b => b.builder_category === 'private').length,
  }), [builders]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600">Pending</Badge>;
      case 'on_hold':
        return <Badge className="bg-orange-600">On Hold</Badge>;
      case 'active':
        return <Badge className="bg-slate-600">Active</Badge>;
      default:
        return <Badge className="bg-gray-600 capitalize">{status}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'professional':
        return <Badge className="bg-blue-600">Professional</Badge>;
      case 'private':
        return <Badge className="bg-purple-600">Private Builder</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  const handleViewDetails = (builder: BuilderRecord) => {
    setSelectedBuilder(builder);
    setShowDetailsModal(true);
  };

  const handleApprove = (builder: BuilderRecord) => {
    onUpdateStatus(builder.id, 'approved', { rowEmail: builder.email });
    toast({
      title: 'Builder Approved',
      description: `${builder.full_name} has been approved.`,
    });
  };

  const handleReject = (builder: BuilderRecord) => {
    onUpdateStatus(builder.id, 'rejected', { rowEmail: builder.email });
    toast({
      title: 'Builder Rejected',
      description: `${builder.full_name} has been rejected.`,
    });
  };

  const handleSetOnHold = (builder: BuilderRecord) => {
    onUpdateStatus(builder.id, 'on_hold', { rowEmail: builder.email });
  };

  const handleMarkActive = (builder: BuilderRecord) => {
    onUpdateStatus(builder.id, 'active', { rowEmail: builder.email });
  };

  const openEditBuilder = (builder: BuilderRecord) => {
    setEditBuilder(builder);
    setEditForm({
      full_name: builder.full_name || '',
      email: builder.email || '',
      phone: builder.phone || '',
      company_name: builder.company_name || '',
      county: builder.county || '',
      town: builder.town || '',
      physical_address: builder.physical_address || '',
      status: ['pending', 'approved', 'rejected', 'on_hold', 'active'].includes(builder.status)
        ? builder.status
        : 'pending',
    });
  };

  const handleSaveEdit = async () => {
    if (!editBuilder) return;
    setActionBusy(true);
    try {
      const patch: BuilderEditPatch = {
        full_name: editForm.full_name,
        email: editForm.email,
        phone: editForm.phone,
        company_name: editForm.company_name,
        county: editForm.county,
        town: editForm.town,
        physical_address: editForm.physical_address,
        ...(isSyntheticBuilderRow(editBuilder) ? {} : { status: editForm.status }),
      };
      await onSaveBuilderEdit(editBuilder, patch);
      setEditBuilder(null);
    } catch (e) {
      console.error(e);
    } finally {
      setActionBusy(false);
    }
  };

  const runDangerConfirm = async () => {
    if (!confirmDanger) return;
    setActionBusy(true);
    try {
      if (confirmDanger.type === 'demote') {
        await onDemoteBuilder(confirmDanger.builder);
      } else {
        await onDeleteBuilder(confirmDanger.builder);
      }
      setConfirmDanger(null);
      setShowDetailsModal(false);
      setSelectedBuilder(null);
    } catch (e) {
      console.error(e);
    } finally {
      setActionBusy(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Full Name', 'Email', 'Phone', 'Company Name', 'County', 'Town',
      'Builder Type', 'Builder Category', 'Years Experience', 'NCA License',
      'Status', 'Created At'
    ];
    const csvData = filteredBuilders.map(b => [
      b.full_name,
      b.email,
      b.phone,
      b.company_name || '',
      b.county,
      b.town || '',
      b.builder_type,
      b.builder_category,
      b.years_experience || '',
      b.nca_license_number || '',
      b.status,
      formatRegisteredDate(b.created_at)
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `builders-register-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: `${filteredBuilders.length} builders exported to CSV`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Builders</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
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
        <Card className="bg-orange-900/20 border-orange-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-300">On Hold</p>
                <p className="text-2xl font-bold text-white">{stats.onHold}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-900/20 border-blue-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-400">Professional</p>
                <p className="text-2xl font-bold text-white">{stats.professional}</p>
              </div>
              <Hammer className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-900/20 border-purple-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-400">Private</p>
                <p className="text-2xl font-bold text-white">{stats.private}</p>
              </div>
              <Building2 className="h-8 w-8 text-purple-500" />
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
                <Building2 className="h-5 w-5 text-blue-500" />
                Registered Builders
              </CardTitle>
              <CardDescription className="text-gray-400">
                Complete register of all builder applications and registrations
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search builders..."
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
                <option value="rejected">Rejected</option>
                <option value="on_hold">On Hold</option>
                <option value="active">Active</option>
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-white"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
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
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-gray-400">Loading builders...</p>
            </div>
          ) : filteredBuilders.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No Builders Found</h3>
              <p className="text-sm text-gray-500">
                No builders match your current filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-gray-400">Builder</TableHead>
                    <TableHead className="text-gray-400">Contact</TableHead>
                    <TableHead className="text-gray-400">Location</TableHead>
                    <TableHead className="text-gray-400">Category</TableHead>
                    <TableHead className="text-gray-400">Experience</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Registered</TableHead>
                    <TableHead className="text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBuilders.map((builder) => (
                    <TableRow key={builder.id} className="hover:bg-slate-800/50 border-slate-700">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-blue-600/20 rounded-lg">
                            <Building2 className="h-4 w-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{builder.full_name}</p>
                            {builder.company_name && (
                              <p className="text-xs text-gray-400">{builder.company_name}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Mail className="h-3 w-3" />
                            <span>{builder.email}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Phone className="h-3 w-3" />
                            <span>{builder.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-300">
                          <MapPin className="h-3 w-3 text-gray-500" />
                          <span>{builder.county}</span>
                          {builder.town && <span className="text-gray-500">({builder.town})</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getCategoryBadge(builder.builder_category)}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {builder.years_experience ? `${builder.years_experience} yrs` : 'N/A'}
                      </TableCell>
                      <TableCell>{getStatusBadge(builder.status)}</TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {formatRegisteredDate(builder.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-blue-400 hover:text-blue-300"
                            title="View details"
                            onClick={() => handleViewDetails(builder)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-300 hover:text-white"
                                disabled={actionBusy}
                                title="Admin actions"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700 text-white">
                              <DropdownMenuItem
                                className="focus:bg-slate-800 cursor-pointer"
                                onClick={() => openEditBuilder(builder)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit record
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-orange-400 focus:text-orange-300 focus:bg-slate-800 cursor-pointer"
                                disabled={
                                  actionBusy ||
                                  String(builder.status || '').toLowerCase().replace(/\s+/g, '_') === 'on_hold'
                                }
                                title={
                                  String(builder.status || '').toLowerCase().replace(/\s+/g, '_') === 'on_hold'
                                    ? 'Already on hold'
                                    : 'Sets builder registration status (linked by user id when the list row is role-only)'
                                }
                                onSelect={() => handleSetOnHold(builder)}
                              >
                                <PauseCircle className="h-4 w-4 mr-2" />
                                On Hold
                              </DropdownMenuItem>
                              {String(builder.status || '').toLowerCase().replace(/\s+/g, '_') === 'on_hold' && (
                                <DropdownMenuItem
                                  className="text-green-400 focus:text-green-300 focus:bg-slate-800 cursor-pointer"
                                  disabled={actionBusy}
                                  title="Clears hold on registration or user profile (same paths as On Hold)"
                                  onSelect={() => handleMarkActive(builder)}
                                >
                                  <PlayCircle className="h-4 w-4 mr-2" />
                                  Mark active (remove hold)
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator className="bg-slate-700" />
                              <DropdownMenuItem
                                className="text-amber-400 focus:text-amber-300 focus:bg-slate-800 cursor-pointer"
                                onClick={() => setConfirmDanger({ type: 'demote', builder })}
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Demote (remove builder role)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-400 focus:text-red-300 focus:bg-slate-800 cursor-pointer"
                                onClick={() => setConfirmDanger({ type: 'delete', builder })}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete registration
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {!isSyntheticBuilderRow(builder) && builder.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-400 hover:text-green-300"
                                title="Approve"
                                onClick={() => handleApprove(builder)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300"
                                title="Reject"
                                onClick={() => handleReject(builder)}
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
            Showing {filteredBuilders.length} of {builders.length} builders
          </div>
        </CardContent>
      </Card>

      {/* Builder Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              Builder Details
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Complete registration information for {selectedBuilder?.full_name}
            </DialogDescription>
          </DialogHeader>
          {selectedBuilder && (
            <div className="space-y-6">
              {/* Personal Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-400">Personal Information</h4>
                  <div className="bg-slate-800 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Full Name:</span>
                      <span className="text-white">{selectedBuilder.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white">{selectedBuilder.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Phone:</span>
                      <span className="text-white">{selectedBuilder.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">County:</span>
                      <span className="text-white">{selectedBuilder.county}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Town:</span>
                      <span className="text-white">{selectedBuilder.town || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-400">Professional Details</h4>
                  <div className="bg-slate-800 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Builder Type:</span>
                      <span className="text-white">{selectedBuilder.builder_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Category:</span>
                      {getCategoryBadge(selectedBuilder.builder_category)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Experience:</span>
                      <span className="text-white">{selectedBuilder.years_experience ? `${selectedBuilder.years_experience} years` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Company:</span>
                      <span className="text-white">{selectedBuilder.company_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">NCA License:</span>
                      <span className="text-white">{selectedBuilder.nca_license_number || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Registration Details */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-400">Registration Details</h4>
                <div className="bg-slate-800 p-4 rounded-lg">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Business Reg #:</span>
                      <span className="text-white">{selectedBuilder.business_registration_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">KRA PIN:</span>
                      <span className="text-white">{selectedBuilder.kra_pin || 'N/A'}</span>
                    </div>
                  </div>
                  {selectedBuilder.specialties && selectedBuilder.specialties.length > 0 && (
                    <div className="mt-3">
                      <span className="text-gray-400">Specialties:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedBuilder.specialties.map((spec, i) => (
                          <Badge key={i} className="bg-blue-600">{spec}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedBuilder.project_types && selectedBuilder.project_types.length > 0 && (
                    <div className="mt-3">
                      <span className="text-gray-400">Project Types:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedBuilder.project_types.map((type, i) => (
                          <Badge key={i} variant="outline">{type}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Project Info (for private clients) */}
              {selectedBuilder.builder_category === 'private' && selectedBuilder.project_description && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-400">Project Information</h4>
                  <div className="bg-slate-800 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Property Type:</span>
                      <span className="text-white">{selectedBuilder.property_type || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Budget Range:</span>
                      <span className="text-white">{selectedBuilder.budget_range || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Timeline:</span>
                      <span className="text-white">{selectedBuilder.project_timeline || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Description:</span>
                      <p className="text-white mt-1">{selectedBuilder.project_description}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-400">Documents</h4>
                <div className="bg-slate-800 p-4 rounded-lg">
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedBuilder.id_document_url && (
                      <a
                        href={selectedBuilder.id_document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                      >
                        <FileText className="h-4 w-4" />
                        ID Document
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {selectedBuilder.business_certificate_url && (
                      <a
                        href={selectedBuilder.business_certificate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                      >
                        <FileText className="h-4 w-4" />
                        Business Certificate
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {selectedBuilder.nca_certificate_url && (
                      <a
                        href={selectedBuilder.nca_certificate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                      >
                        <Award className="h-4 w-4" />
                        NCA Certificate
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {selectedBuilder.profile_photo_url && (
                      <a
                        href={selectedBuilder.profile_photo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                      >
                        <FileText className="h-4 w-4" />
                        Profile Photo
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {selectedBuilder.portfolio_url && (
                      <a
                        href={selectedBuilder.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                      >
                        <FileText className="h-4 w-4" />
                        Portfolio
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
                    <span className="ml-2">{getStatusBadge(selectedBuilder.status)}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    Registered: {formatRegisteredDate(selectedBuilder.created_at)}
                  </div>
                </div>
                {selectedBuilder.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        handleApprove(selectedBuilder);
                        setShowDetailsModal(false);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleReject(selectedBuilder);
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

      <Dialog open={!!editBuilder} onOpenChange={(open) => !open && setEditBuilder(null)}>
        <DialogContent className="max-w-lg bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Edit builder</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editBuilder && isSyntheticBuilderRow(editBuilder)
                ? 'Role-only row: contact updates apply to the user profile. Email is shown for reference only.'
                : 'Updates the builder registration record.'}
            </DialogDescription>
          </DialogHeader>
          {editBuilder && (
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-gray-300">Full name</Label>
                <Input
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Email</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="bg-slate-800 border-slate-600"
                  disabled={isSyntheticBuilderRow(editBuilder)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Phone</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Company name</Label>
                <Input
                  value={editForm.company_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, company_name: e.target.value }))}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">County</Label>
                <Input
                  value={editForm.county}
                  onChange={(e) => setEditForm((f) => ({ ...f, county: e.target.value }))}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Town</Label>
                <Input
                  value={editForm.town}
                  onChange={(e) => setEditForm((f) => ({ ...f, town: e.target.value }))}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Physical address</Label>
                <Input
                  value={editForm.physical_address}
                  onChange={(e) => setEditForm((f) => ({ ...f, physical_address: e.target.value }))}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              {!isSyntheticBuilderRow(editBuilder) && (
                <div className="space-y-1">
                  <Label className="text-gray-300">Registration status</Label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="on_hold">On Hold</option>
                    <option value="active">Active</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditBuilder(null)} disabled={actionBusy}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={actionBusy} className="bg-blue-600 hover:bg-blue-700">
                  {actionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDanger} onOpenChange={(open) => !open && setConfirmDanger(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {confirmDanger?.type === 'delete' ? 'Delete builder registration?' : 'Demote builder?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {confirmDanger?.type === 'delete'
                ? 'Removes the builder application (if any) and builder roles. The auth user is not deleted.'
                : 'Removes the builder role from this user. They keep their account and can register again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              className={
                confirmDanger?.type === 'delete'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }
              onClick={() => runDangerConfirm()}
              disabled={actionBusy}
            >
              {actionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BuildersRegister;




















