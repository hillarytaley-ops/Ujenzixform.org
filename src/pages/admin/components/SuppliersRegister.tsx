import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
  Store,
  Search,
  RefreshCw,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  MapPin,
  Package,
  Clock,
  FileText,
  ExternalLink,
  CreditCard,
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
import type { SupplierEditPatch } from '../types';

interface SupplierRecord {
  id: string;
  auth_user_id?: string;
  applicant_user_id?: string;
  user_id?: string;
  profile_id?: string;
  contact_person: string;
  email: string;
  phone: string;
  company_name: string;
  business_registration_number?: string;
  kra_pin?: string;
  business_type?: string;
  years_in_business?: number;
  county: string;
  town?: string;
  physical_address?: string;
  address?: string;
  delivery_areas?: string[];
  material_categories: string[];
  materials_offered?: string[];
  specialties?: string[];
  materials_list?: string;
  price_list?: string;
  minimum_order_value?: number;
  accepts_bulk_orders?: boolean;
  offers_delivery?: boolean;
  delivery_fee_structure?: string;
  opening_hours?: string;
  weekend_availability?: boolean;
  business_certificate_url?: string;
  kra_certificate_url?: string;
  company_logo_url?: string;
  product_catalog_url?: string;
  is_verified?: boolean;
  rating?: number;
  status: string;
  source?: 'registration' | 'active';
  created_at: string;
  updated_at?: string;
  bank_name?: string | null;
  bank_account_holder_name?: string | null;
  bank_account_number?: string | null;
  bank_branch?: string | null;
}

interface SuppliersRegisterProps {
  suppliers: SupplierRecord[];
  loading: boolean;
  onRefresh: () => void;
  onUpdateStatus: (id: string, status: string, opts?: { rowEmail?: string }) => void;
  onSaveSupplierEdit: (supplier: SupplierRecord, patch: SupplierEditPatch) => Promise<void>;
  onDemoteSupplier: (supplier: SupplierRecord) => Promise<void>;
  onDeleteSupplier: (supplier: SupplierRecord) => Promise<void>;
}

const isSyntheticSupplierRow = (s: SupplierRecord) => s.id.startsWith('role-');

const formatRegisteredDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};

export const SuppliersRegister: React.FC<SuppliersRegisterProps> = ({
  suppliers,
  loading,
  onRefresh,
  onUpdateStatus,
  onSaveSupplierEdit,
  onDemoteSupplier,
  onDeleteSupplier,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCounty, setFilterCounty] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRecord | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editSupplier, setEditSupplier] = useState<SupplierRecord | null>(null);
  const [editForm, setEditForm] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    status: 'pending',
  });
  const [confirmDanger, setConfirmDanger] = useState<null | { type: 'demote' | 'delete'; supplier: SupplierRecord }>(
    null
  );
  const [actionBusy, setActionBusy] = useState(false);
  const { toast } = useToast();

  // Get unique counties for filter
  const counties = useMemo(() => {
    const uniqueCounties = [...new Set(suppliers.map(s => s.county).filter(Boolean))];
    return uniqueCounties.sort();
  }, [suppliers]);

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      const matchesSearch = 
        supplier.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.phone?.includes(searchTerm);
      const matchesStatus = filterStatus === 'all' || supplier.status === filterStatus;
      const matchesCounty = filterCounty === 'all' || supplier.county === filterCounty;
      return matchesSearch && matchesStatus && matchesCounty;
    });
  }, [suppliers, searchTerm, filterStatus, filterCounty]);

  // Stats
  const stats = useMemo(() => ({
    total: suppliers.length,
    pending: suppliers.filter(s => s.status === 'pending').length,
    approved: suppliers.filter(s => s.status === 'approved').length,
    rejected: suppliers.filter(s => s.status === 'rejected').length,
    onHold: suppliers.filter(s => s.status === 'on_hold').length,
    verified: suppliers.filter(s => s.is_verified).length,
  }), [suppliers]);

  // Helper to get material categories from either field
  const getMaterialCategories = (supplier: SupplierRecord): string[] => {
    return supplier.material_categories || supplier.materials_offered || [];
  };

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

  const handleViewDetails = (supplier: SupplierRecord) => {
    setSelectedSupplier(supplier);
    setShowDetailsModal(true);
  };

  const handleApprove = (supplier: SupplierRecord) => {
    onUpdateStatus(supplier.id, 'approved', { rowEmail: supplier.email });
    toast({
      title: 'Supplier Approved',
      description: `${supplier.company_name} has been approved.`,
    });
  };

  const handleReject = (supplier: SupplierRecord) => {
    onUpdateStatus(supplier.id, 'rejected', { rowEmail: supplier.email });
    toast({
      title: 'Supplier Rejected',
      description: `${supplier.company_name} has been rejected.`,
    });
  };

  const handleSetOnHold = (supplier: SupplierRecord) => {
    onUpdateStatus(supplier.id, 'on_hold', { rowEmail: supplier.email });
  };

  const handleMarkActive = (supplier: SupplierRecord) => {
    onUpdateStatus(supplier.id, 'active', { rowEmail: supplier.email });
  };

  const openEditSupplier = (supplier: SupplierRecord) => {
    setEditSupplier(supplier);
    setEditForm({
      company_name: supplier.company_name || '',
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address:
        supplier.physical_address ||
        supplier.address ||
        [supplier.town, supplier.county].filter(Boolean).join(', ') ||
        '',
      status: ['pending', 'approved', 'rejected', 'on_hold', 'active'].includes(supplier.status)
        ? supplier.status
        : 'pending',
    });
  };

  const handleSaveEdit = async () => {
    if (!editSupplier) return;
    setActionBusy(true);
    try {
      const patch: SupplierEditPatch = {
        company_name: editForm.company_name,
        contact_person: editForm.contact_person,
        email: editForm.email,
        phone: editForm.phone,
        address: editForm.address,
        ...(isSyntheticSupplierRow(editSupplier) ? {} : { status: editForm.status }),
      };
      await onSaveSupplierEdit(editSupplier, patch);
      setEditSupplier(null);
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
        await onDemoteSupplier(confirmDanger.supplier);
      } else {
        await onDeleteSupplier(confirmDanger.supplier);
      }
      setConfirmDanger(null);
      setShowDetailsModal(false);
      setSelectedSupplier(null);
    } catch (e) {
      console.error(e);
    } finally {
      setActionBusy(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Company Name', 'Contact Person', 'Email', 'Phone', 'County', 'Town',
      'Business Type', 'Material Categories', 'Bank Name', 'Account Holder', 'Account Number', 'Branch',
      'Status', 'Verified', 'Created At'
    ];
    const csvData = filteredSuppliers.map(s => [
      s.company_name,
      s.contact_person,
      s.email,
      s.phone,
      s.county,
      s.town || '',
      s.business_type || '',
      s.material_categories?.join('; ') || '',
      s.bank_name || '',
      s.bank_account_holder_name || '',
      s.bank_account_number || '',
      s.bank_branch || '',
      s.status,
      s.is_verified ? 'Yes' : 'No',
      formatRegisteredDate(s.created_at)
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suppliers-register-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: `${filteredSuppliers.length} suppliers exported to CSV`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Registered</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Store className="h-8 w-8 text-green-500" />
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
                <p className="text-sm text-blue-400">Verified</p>
                <p className="text-2xl font-bold text-white">{stats.verified}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
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
                <Store className="h-5 w-5 text-green-500" />
                Registered Suppliers
              </CardTitle>
              <CardDescription className="text-gray-400">
                Complete register of all supplier applications and registrations
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search suppliers..."
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
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-green-500" />
              <p className="text-gray-400">Loading suppliers...</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <Store className="h-16 w-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No Suppliers Found</h3>
              <p className="text-sm text-gray-500">
                No suppliers match your current filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-gray-400">Company</TableHead>
                    <TableHead className="text-gray-400">Contact</TableHead>
                    <TableHead className="text-gray-400">Location</TableHead>
                    <TableHead className="text-gray-400">Categories</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Registered</TableHead>
                    <TableHead className="text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id} className="hover:bg-slate-800/50 border-slate-700">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-green-600/20 rounded-lg">
                            <Store className="h-4 w-4 text-green-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{supplier.company_name}</p>
                            <p className="text-xs text-gray-400">{supplier.business_type || 'General'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-white text-sm">{supplier.contact_person}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Mail className="h-3 w-3" />
                            <span>{supplier.email}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Phone className="h-3 w-3" />
                            <span>{supplier.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-300">
                          <MapPin className="h-3 w-3 text-gray-500" />
                          <span>{supplier.county}</span>
                          {supplier.town && <span className="text-gray-500">({supplier.town})</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getMaterialCategories(supplier).slice(0, 2).map((cat, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {cat}
                            </Badge>
                          ))}
                          {getMaterialCategories(supplier).length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{getMaterialCategories(supplier).length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {formatRegisteredDate(supplier.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-blue-400 hover:text-blue-300"
                            onClick={() => handleViewDetails(supplier)}
                            title="View details"
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
                                onClick={() => openEditSupplier(supplier)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit record
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-orange-400 focus:text-orange-300 focus:bg-slate-800 cursor-pointer"
                                disabled={
                                  actionBusy ||
                                  String(supplier.status || '').toLowerCase().replace(/\s+/g, '_') === 'on_hold'
                                }
                                title={
                                  String(supplier.status || '').toLowerCase().replace(/\s+/g, '_') === 'on_hold'
                                    ? 'Already on hold'
                                    : 'Sets supplier application status (linked by user id when the list row is role-only)'
                                }
                                onSelect={() => handleSetOnHold(supplier)}
                              >
                                <PauseCircle className="h-4 w-4 mr-2" />
                                On Hold
                              </DropdownMenuItem>
                              {String(supplier.status || '').toLowerCase().replace(/\s+/g, '_') === 'on_hold' && (
                                <DropdownMenuItem
                                  className="text-green-400 focus:text-green-300 focus:bg-slate-800 cursor-pointer"
                                  disabled={actionBusy}
                                  title="Clears hold on application, supplier profile, or user profile (same paths as On Hold)"
                                  onSelect={() => handleMarkActive(supplier)}
                                >
                                  <PlayCircle className="h-4 w-4 mr-2" />
                                  Mark active (remove hold)
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator className="bg-slate-700" />
                              <DropdownMenuItem
                                className="text-amber-400 focus:text-amber-300 focus:bg-slate-800 cursor-pointer"
                                onClick={() => setConfirmDanger({ type: 'demote', supplier })}
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Demote (remove supplier role)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-400 focus:text-red-300 focus:bg-slate-800 cursor-pointer"
                                onClick={() => setConfirmDanger({ type: 'delete', supplier })}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete registration
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {!isSyntheticSupplierRow(supplier) && supplier.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-400 hover:text-green-300"
                                onClick={() => handleApprove(supplier)}
                                title="Approve"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300"
                                onClick={() => handleReject(supplier)}
                                title="Reject"
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
            Showing {filteredSuppliers.length} of {suppliers.length} suppliers
          </div>
        </CardContent>
      </Card>

      {/* Supplier Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Store className="h-5 w-5 text-green-500" />
              Supplier Details
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Complete registration information for {selectedSupplier?.company_name}
            </DialogDescription>
          </DialogHeader>
          {selectedSupplier && (
            <div className="space-y-6">
              {/* Company Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-400">Company Information</h4>
                  <div className="bg-slate-800 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Company Name:</span>
                      <span className="text-white">{selectedSupplier.company_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Business Type:</span>
                      <span className="text-white">{selectedSupplier.business_type || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Years in Business:</span>
                      <span className="text-white">{selectedSupplier.years_in_business || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Business Reg #:</span>
                      <span className="text-white">{selectedSupplier.business_registration_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">KRA PIN:</span>
                      <span className="text-white">{selectedSupplier.kra_pin || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-400">Contact Information</h4>
                  <div className="bg-slate-800 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Contact Person:</span>
                      <span className="text-white">{selectedSupplier.contact_person}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white">{selectedSupplier.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Phone:</span>
                      <span className="text-white">{selectedSupplier.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">County:</span>
                      <span className="text-white">{selectedSupplier.county}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Town:</span>
                      <span className="text-white">{selectedSupplier.town || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Address:</span>
                      <span className="text-white text-right">{selectedSupplier.physical_address || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-emerald-400" />
                    Payout bank account
                  </h4>
                  <div className="bg-slate-800 p-4 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-400 shrink-0">Bank:</span>
                      <span className="text-white text-right">{selectedSupplier.bank_name?.trim() || '—'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-400 shrink-0">Branch:</span>
                      <span className="text-white text-right">{selectedSupplier.bank_branch?.trim() || '—'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-400 shrink-0">Account holder:</span>
                      <span className="text-white text-right">{selectedSupplier.bank_account_holder_name?.trim() || '—'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-400 shrink-0">Account number:</span>
                      <span className="text-white font-mono text-right">{selectedSupplier.bank_account_number?.trim() || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products & Services */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-400">Products & Services</h4>
                <div className="bg-slate-800 p-4 rounded-lg space-y-3">
                  <div>
                    <span className="text-gray-400">Material Categories:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedSupplier.material_categories?.map((cat, i) => (
                        <Badge key={i} className="bg-green-600">{cat}</Badge>
                      ))}
                    </div>
                  </div>
                  {selectedSupplier.delivery_areas && (
                    <div>
                      <span className="text-gray-400">Delivery Areas:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedSupplier.delivery_areas.map((area, i) => (
                          <Badge key={i} variant="outline">{area}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid md:grid-cols-3 gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-400">Min Order:</span>
                      <span className="text-white">
                        {selectedSupplier.minimum_order_value ? `KES ${selectedSupplier.minimum_order_value.toLocaleString()}` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Bulk Orders:</span>
                      <span className="text-white">{selectedSupplier.accepts_bulk_orders ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Offers Delivery:</span>
                      <span className="text-white">{selectedSupplier.offers_delivery ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-400">Documents</h4>
                <div className="bg-slate-800 p-4 rounded-lg">
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedSupplier.business_certificate_url && (
                      <a
                        href={selectedSupplier.business_certificate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                      >
                        <FileText className="h-4 w-4" />
                        Business Certificate
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {selectedSupplier.kra_certificate_url && (
                      <a
                        href={selectedSupplier.kra_certificate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                      >
                        <FileText className="h-4 w-4" />
                        KRA Certificate
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {selectedSupplier.product_catalog_url && (
                      <a
                        href={selectedSupplier.product_catalog_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                      >
                        <FileText className="h-4 w-4" />
                        Product Catalog
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
                    <span className="ml-2">{getStatusBadge(selectedSupplier.status)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Verified:</span>
                    <span className="ml-2">
                      {selectedSupplier.is_verified ? (
                        <Badge className="bg-blue-600">Verified</Badge>
                      ) : (
                        <Badge variant="outline">Not Verified</Badge>
                      )}
                    </span>
                  </div>
                </div>
                {selectedSupplier.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        handleApprove(selectedSupplier);
                        setShowDetailsModal(false);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleReject(selectedSupplier);
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

      <Dialog open={!!editSupplier} onOpenChange={(open) => !open && setEditSupplier(null)}>
        <DialogContent className="max-w-lg bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Edit supplier</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editSupplier && isSyntheticSupplierRow(editSupplier)
                ? 'This row is linked to auth only (no application). Updates apply to the suppliers profile.'
                : 'Updates the supplier application record.'}
            </DialogDescription>
          </DialogHeader>
          {editSupplier && (
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-gray-300">Company name</Label>
                <Input
                  value={editForm.company_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, company_name: e.target.value }))}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Contact person</Label>
                <Input
                  value={editForm.contact_person}
                  onChange={(e) => setEditForm((f) => ({ ...f, contact_person: e.target.value }))}
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
                <Label className="text-gray-300">Address / location</Label>
                <Input
                  value={editForm.address}
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              {!isSyntheticSupplierRow(editSupplier) && (
                <div className="space-y-1">
                  <Label className="text-gray-300">Application status</Label>
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
                <Button variant="outline" onClick={() => setEditSupplier(null)} disabled={actionBusy}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={actionBusy} className="bg-green-600 hover:bg-green-700">
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
              {confirmDanger?.type === 'delete' ? 'Delete supplier registration?' : 'Demote supplier?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {confirmDanger?.type === 'delete'
                ? 'This removes the supplier application (if present), removes the supplier role, and deletes the suppliers profile row when it exists. The auth user account is not deleted.'
                : 'This removes only the supplier role from the user. They keep their login and can register again as a supplier.'}
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

export default SuppliersRegister;




















